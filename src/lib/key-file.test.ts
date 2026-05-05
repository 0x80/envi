import { consola } from "consola";
import { parse } from "maml.js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  KEY_FILE_NAME,
  LEGACY_KEY_FILE_NAME,
  __resetLegacyHintCache,
  findKeyFile,
  generateKey,
  getKeyFilePath,
  hasKeyFile,
  readCapturePatterns,
  readEncryptionKey,
  writeEncryptionKey,
} from "./key-file";

vi.mock("node:fs");

describe("key-file", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetLegacyHintCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("KEY_FILE_NAME", () => {
    it("is envi.config.maml (no leading dot — meant to be visible/committed)", () => {
      expect(KEY_FILE_NAME).toBe("envi.config.maml");
      expect(KEY_FILE_NAME.startsWith(".")).toBe(false);
    });

    it("keeps envi.maml as the legacy filename for backwards compat", () => {
      expect(LEGACY_KEY_FILE_NAME).toBe("envi.maml");
    });
  });

  describe("getKeyFilePath", () => {
    it("returns the canonical path (where new files are written)", () => {
      expect(getKeyFilePath("/repo")).toBe("/repo/envi.config.maml");
    });
  });

  describe("hasKeyFile", () => {
    it("is true when only the canonical file exists", () => {
      vi.mocked(existsSync).mockImplementation(
        (path) => String(path) === "/repo/envi.config.maml",
      );
      expect(hasKeyFile("/repo")).toBe(true);
    });

    it("is true when only the legacy file exists", () => {
      vi.mocked(existsSync).mockImplementation(
        (path) => String(path) === "/repo/envi.maml",
      );
      expect(hasKeyFile("/repo")).toBe(true);
    });

    it("is false when neither file exists", () => {
      vi.mocked(existsSync).mockReturnValue(false);
      expect(hasKeyFile("/repo")).toBe(false);
    });
  });

  describe("findKeyFile", () => {
    it("returns canonical filename when canonical exists", () => {
      vi.mocked(existsSync).mockImplementation(
        (path) => String(path) === "/repo/envi.config.maml",
      );
      expect(findKeyFile("/repo")).toBe("envi.config.maml");
    });

    it("returns legacy filename when only legacy exists", () => {
      vi.mocked(existsSync).mockImplementation(
        (path) => String(path) === "/repo/envi.maml",
      );
      expect(findKeyFile("/repo")).toBe("envi.maml");
    });

    it("prefers canonical when both exist", () => {
      vi.mocked(existsSync).mockReturnValue(true);
      expect(findKeyFile("/repo")).toBe("envi.config.maml");
    });

    it("returns null when neither exists", () => {
      vi.mocked(existsSync).mockReturnValue(false);
      expect(findKeyFile("/repo")).toBeNull();
    });
  });

  describe("readEncryptionKey", () => {
    it("returns null when no config file is present", () => {
      vi.mocked(existsSync).mockReturnValue(false);
      expect(readEncryptionKey("/repo")).toBeNull();
    });

    it("returns the encryption_key field from envi.config.maml", () => {
      vi.mocked(existsSync).mockImplementation(
        (path) => String(path) === "/repo/envi.config.maml",
      );
      vi.mocked(readFileSync).mockReturnValue(
        '{\n  encryption_key: "thekey"\n}',
      );
      expect(readEncryptionKey("/repo")).toBe("thekey");
    });

    it("falls back to the legacy envi.maml when canonical is missing", () => {
      vi.mocked(existsSync).mockImplementation(
        (path) => String(path) === "/repo/envi.maml",
      );
      vi.mocked(readFileSync).mockReturnValue(
        '{\n  encryption_key: "legacykey"\n}',
      );
      expect(readEncryptionKey("/repo")).toBe("legacykey");
    });

    it("prefers canonical over legacy when both exist", () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockImplementation((path) => {
        if (String(path) === "/repo/envi.config.maml") {
          return '{\n  encryption_key: "canonical"\n}';
        }
        return '{\n  encryption_key: "legacy"\n}';
      });
      expect(readEncryptionKey("/repo")).toBe("canonical");
    });

    it("emits the legacy-rename hint once per repo per session", () => {
      const info = vi.spyOn(consola, "info").mockImplementation(() => {});
      vi.mocked(existsSync).mockImplementation(
        (path) => String(path) === "/repo/envi.maml",
      );
      vi.mocked(readFileSync).mockReturnValue(
        '{\n  encryption_key: "legacy"\n}',
      );

      readEncryptionKey("/repo");
      readEncryptionKey("/repo");
      readCapturePatterns("/repo");

      expect(info).toHaveBeenCalledTimes(1);
      expect(info).toHaveBeenCalledWith(
        expect.stringContaining("legacy envi.maml"),
      );
      info.mockRestore();
    });

    it("returns null when encryption_key is missing from the config", () => {
      vi.mocked(existsSync).mockImplementation(
        (path) => String(path) === "/repo/envi.config.maml",
      );
      vi.mocked(readFileSync).mockReturnValue('{\n  other: "x"\n}');
      expect(readEncryptionKey("/repo")).toBeNull();
    });

    it("returns null when the file is malformed", () => {
      vi.mocked(existsSync).mockImplementation(
        (path) => String(path) === "/repo/envi.config.maml",
      );
      vi.mocked(readFileSync).mockReturnValue("garbage that won't parse");
      expect(readEncryptionKey("/repo")).toBeNull();
    });

    it("returns null when encryption_key is empty", () => {
      vi.mocked(existsSync).mockImplementation(
        (path) => String(path) === "/repo/envi.config.maml",
      );
      vi.mocked(readFileSync).mockReturnValue('{\n  encryption_key: ""\n}');
      expect(readEncryptionKey("/repo")).toBeNull();
    });
  });

  describe("readCapturePatterns", () => {
    it("returns [] when no config file is present", () => {
      vi.mocked(existsSync).mockReturnValue(false);
      expect(readCapturePatterns("/repo")).toEqual([]);
    });

    it("returns the capture_patterns array when valid", () => {
      vi.mocked(existsSync).mockImplementation(
        (path) => String(path) === "/repo/envi.config.maml",
      );
      vi.mocked(readFileSync).mockReturnValue(
        '{\n  capture_patterns: [".envrc", "config/*.local"]\n}',
      );
      expect(readCapturePatterns("/repo")).toEqual([
        ".envrc",
        "config/*.local",
      ]);
    });

    it("returns [] when the field is missing", () => {
      vi.mocked(existsSync).mockImplementation(
        (path) => String(path) === "/repo/envi.config.maml",
      );
      vi.mocked(readFileSync).mockReturnValue('{\n  encryption_key: "k"\n}');
      expect(readCapturePatterns("/repo")).toEqual([]);
    });

    it("returns [] when the field is not an array", () => {
      vi.mocked(existsSync).mockImplementation(
        (path) => String(path) === "/repo/envi.config.maml",
      );
      vi.mocked(readFileSync).mockReturnValue(
        '{\n  capture_patterns: "not an array"\n}',
      );
      expect(readCapturePatterns("/repo")).toEqual([]);
    });

    it("filters out non-string and empty entries", () => {
      vi.mocked(existsSync).mockImplementation(
        (path) => String(path) === "/repo/envi.config.maml",
      );
      vi.mocked(readFileSync).mockReturnValue(
        '{\n  capture_patterns: [".envrc", "", "wrangler.dev.toml"]\n}',
      );
      expect(readCapturePatterns("/repo")).toEqual([
        ".envrc",
        "wrangler.dev.toml",
      ]);
    });

    it("reads from the legacy envi.maml when canonical is missing", () => {
      vi.mocked(existsSync).mockImplementation(
        (path) => String(path) === "/repo/envi.maml",
      );
      vi.mocked(readFileSync).mockReturnValue(
        '{\n  capture_patterns: [".envrc"]\n}',
      );
      expect(readCapturePatterns("/repo")).toEqual([".envrc"]);
    });
  });

  describe("writeEncryptionKey", () => {
    it("creates a new envi.config.maml with a header comment when missing", () => {
      vi.mocked(existsSync).mockReturnValue(false);
      const written = writeEncryptionKey("/repo", "newkey");
      expect(written).toBe("envi.config.maml");

      expect(writeFileSync).toHaveBeenCalledOnce();
      const [path, content] = vi.mocked(writeFileSync).mock.calls[0]!;
      expect(path).toBe("/repo/envi.config.maml");
      expect(typeof content).toBe("string");
      expect(content as string).toContain('encryption_key: "newkey"');
      expect(content as string).toContain("# Generated by `envi create-key`");
      expect(content as string).toContain(
        "envi.codecompose.dev/commands/create-key",
      );
      expect(content as string).toContain("should be private");

      // Round-trip parse to ensure the generated MAML is valid
      const parsed = parse(content as string) as Record<string, string>;
      expect(parsed.encryption_key).toBe("newkey");
    });

    it("edits the legacy envi.maml in place when only legacy exists", () => {
      vi.mocked(existsSync).mockImplementation(
        (path) => String(path) === "/repo/envi.maml",
      );
      vi.mocked(readFileSync).mockReturnValue('{\n  some: "x"\n}\n');

      const written = writeEncryptionKey("/repo", "newkey");
      expect(written).toBe("envi.maml");

      expect(writeFileSync).toHaveBeenCalledOnce();
      const [path, content] = vi.mocked(writeFileSync).mock.calls[0]!;
      expect(path).toBe("/repo/envi.maml");
      expect(content as string).toContain('encryption_key: "newkey"');
      expect(content as string).toContain('some: "x"');
    });

    it("refuses to overwrite an existing encryption_key without force", () => {
      vi.mocked(existsSync).mockImplementation(
        (path) => String(path) === "/repo/envi.config.maml",
      );
      vi.mocked(readFileSync).mockReturnValue(
        '{\n  encryption_key: "oldkey"\n}',
      );

      expect(() => writeEncryptionKey("/repo", "newkey")).toThrow(
        /already set/,
      );
      expect(writeFileSync).not.toHaveBeenCalled();
    });

    it("overwrites the existing key when force is true (preserves comments)", () => {
      vi.mocked(existsSync).mockImplementation(
        (path) => String(path) === "/repo/envi.config.maml",
      );
      vi.mocked(readFileSync).mockReturnValue(
        '{\n  # user comment\n  encryption_key: "oldkey"\n  other: "preserved"\n}\n',
      );

      const written = writeEncryptionKey("/repo", "newkey", { force: true });
      expect(written).toBe("envi.config.maml");

      const [, content] = vi.mocked(writeFileSync).mock.calls[0]!;
      expect(content as string).toContain('encryption_key: "newkey"');
      expect(content as string).not.toContain("oldkey");
      expect(content as string).toContain("# user comment");
      expect(content as string).toContain('other: "preserved"');
    });

    it("inserts the key into an existing config that has no encryption_key", () => {
      vi.mocked(existsSync).mockImplementation(
        (path) => String(path) === "/repo/envi.config.maml",
      );
      vi.mocked(readFileSync).mockReturnValue(
        '{\n  some_other_field: "x"\n}\n',
      );

      const written = writeEncryptionKey("/repo", "newkey");
      expect(written).toBe("envi.config.maml");

      const [, content] = vi.mocked(writeFileSync).mock.calls[0]!;
      expect(content as string).toContain('encryption_key: "newkey"');
      expect(content as string).toContain('some_other_field: "x"');

      // Parses cleanly with both fields
      const parsed = parse(content as string) as Record<string, string>;
      expect(parsed.encryption_key).toBe("newkey");
      expect(parsed.some_other_field).toBe("x");
    });

    it("throws when an existing file has no closing brace", () => {
      vi.mocked(existsSync).mockImplementation(
        (path) => String(path) === "/repo/envi.config.maml",
      );
      vi.mocked(readFileSync).mockReturnValue("not a valid maml object");

      expect(() => writeEncryptionKey("/repo", "newkey")).toThrow(/malformed/);
    });
  });

  describe("generateKey", () => {
    it("returns a non-empty base64url string", () => {
      const key = generateKey();
      expect(key.length).toBeGreaterThan(0);
      expect(key).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it("produces unique values on repeated calls", () => {
      expect(generateKey()).not.toBe(generateKey());
    });
  });
});
