import { parse, stringify } from "maml.js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getPackageName,
  getStorageDir,
  getStorageFilename,
  saveToStorage,
} from "./storage";

vi.mock("node:os");
vi.mock("node:fs");
vi.mock("maml.js");

describe("storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getStorageDir", () => {
    it("should return ~/.envi/store path", () => {
      vi.mocked(homedir).mockReturnValue("/home/user");

      const result = getStorageDir();

      expect(result).toBe(join("/home/user", ".envi", "store"));
    });
  });

  describe("getPackageName", () => {
    it("should read package name from package.json", () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue('{"name": "my-package"}');

      const result = getPackageName("/home/user/projects/myproject");

      expect(result).toBe("my-package");
    });

    it("should handle scoped packages", () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue('{"name": "@org/my-package"}');

      const result = getPackageName("/home/user/projects/myproject");

      expect(result).toBe("@org/my-package");
    });

    it("should return null if package.json does not exist", () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const result = getPackageName("/home/user/projects/myproject");

      expect(result).toBeNull();
    });

    it("should return null if name field is missing", () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue('{"version": "1.0.0"}');

      const result = getPackageName("/home/user/projects/myproject");

      expect(result).toBeNull();
    });
  });

  describe("getStorageFilename", () => {
    it("should generate filename from package name", () => {
      const result = getStorageFilename(
        "/home/user/projects/myproject",
        "my-package",
      );

      expect(result).toBe("my-package.maml");
    });

    it("should handle scoped packages with @ prefix", () => {
      const result = getStorageFilename(
        "/home/user/projects/myproject",
        "@myorg/my-package",
      );

      expect(result).toBe("@myorg/my-package.maml");
    });

    it("should fall back to folder name when no package name", () => {
      const result = getStorageFilename("/home/user/projects/myproject", null);

      expect(result).toBe("myproject.maml");
    });

    it("should read package name if not provided", () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue('{"name": "auto-read"}');

      const result = getStorageFilename("/home/user/projects/myproject");

      expect(result).toBe("auto-read.maml");
    });
  });

  describe("saveToStorage", () => {
    it("should create storage directory and save new file", () => {
      vi.mocked(homedir).mockReturnValue("/home/user");
      vi.mocked(existsSync).mockReturnValue(false); // File doesn't exist
      vi.mocked(stringify).mockReturnValue("maml content");

      const repoPath = "/home/user/projects/myproject";
      const envFiles = [
        {
          path: ".env",
          env: { KEY1: "value1" },
        },
      ];

      const result = saveToStorage(repoPath, envFiles, "my-package");

      expect(result).toBe(true);
      expect(mkdirSync).toHaveBeenCalledWith(
        join("/home/user", ".envi", "store"),
        { recursive: true },
      );

      expect(stringify).toHaveBeenCalledWith(
        expect.objectContaining({
          __envi_version: 1,
          metadata: expect.objectContaining({
            updated_from: repoPath,
          }),
          files: envFiles,
        }),
      );

      expect(writeFileSync).toHaveBeenCalledWith(
        join("/home/user", ".envi", "store", "my-package.maml"),
        "maml content",
        "utf-8",
      );
    });

    it("should return false when content is identical", () => {
      vi.mocked(homedir).mockReturnValue("/home/user");
      vi.mocked(stringify).mockReturnValue("maml content");

      const envFiles = [{ path: ".env", env: { KEY1: "value1" } }];

      /** Mock existing file with same files but different timestamp */
      const existingData = {
        __envi_version: 1,
        metadata: {
          updated_from: "/home/user/projects/myproject",
          updated_at: "2023-01-01T00:00:00.000Z", // Old timestamp
        },
        files: [{ path: ".env", env: { KEY1: "value1" } }],
      };

      vi.mocked(existsSync).mockImplementation((path) => {
        /** Only the file path exists */
        return path === join("/home/user", ".envi", "store", "my-package.maml");
      });
      vi.mocked(readFileSync).mockReturnValue("existing maml");
      vi.mocked(parse).mockReturnValue(existingData);

      const repoPath = "/home/user/projects/myproject";

      const result = saveToStorage(repoPath, envFiles, "my-package");

      expect(result).toBe(false);
      expect(writeFileSync).not.toHaveBeenCalled();
    });

    it("should return true when files have changed", () => {
      vi.mocked(homedir).mockReturnValue("/home/user");
      vi.mocked(stringify).mockReturnValue("maml content");

      const envFiles = [{ path: ".env", env: { KEY1: "value2" } }]; // Different value

      /** Mock existing file with different content */
      const existingData = {
        __envi_version: 1,
        metadata: {
          updated_from: "/home/user/projects/myproject",
          updated_at: "2023-01-01T00:00:00.000Z",
        },
        files: [{ path: ".env", env: { KEY1: "value1" } }], // Old value
      };

      vi.mocked(existsSync).mockImplementation((path) => {
        /** Only the file path exists */
        return path === join("/home/user", ".envi", "store", "my-package.maml");
      });
      vi.mocked(readFileSync).mockReturnValue("existing maml");
      vi.mocked(parse).mockReturnValue(existingData);

      const repoPath = "/home/user/projects/myproject";

      const result = saveToStorage(repoPath, envFiles, "my-package");

      expect(result).toBe(true);
      expect(writeFileSync).toHaveBeenCalled();
    });

    it("should sort files by path before comparing", () => {
      vi.mocked(homedir).mockReturnValue("/home/user");
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(stringify).mockReturnValue("maml content");

      const repoPath = "/home/user/projects/myproject";
      /** Files in unsorted order */
      const envFiles: Array<{ path: string; env: Record<string, string> }> = [
        { path: "zzz/.env", env: { KEY1: "value1" } },
        { path: "aaa/.env", env: { KEY2: "value2" } },
        { path: "mmm/.env", env: { KEY3: "value3" } },
      ];

      saveToStorage(repoPath, envFiles, "my-package");

      /** Verify stringify was called with sorted files */
      expect(stringify).toHaveBeenCalledWith(
        expect.objectContaining({
          files: [
            { path: "aaa/.env", env: { KEY2: "value2" } },
            { path: "mmm/.env", env: { KEY3: "value3" } },
            { path: "zzz/.env", env: { KEY1: "value1" } },
          ],
        }),
      );
    });

    it("should create subdirectory for scoped packages", () => {
      vi.mocked(homedir).mockReturnValue("/home/user");
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(stringify).mockReturnValue("maml content");

      const repoPath = "/home/user/projects/myproject";
      const envFiles = [{ path: ".env", env: { KEY1: "value1" } }];

      const result = saveToStorage(repoPath, envFiles, "@myorg/my-package");

      expect(result).toBe(true);

      /** Should create both the main store dir and the org subdirectory */
      expect(mkdirSync).toHaveBeenCalledWith(
        join("/home/user", ".envi", "store"),
        { recursive: true },
      );

      expect(mkdirSync).toHaveBeenCalledWith(
        join("/home/user", ".envi", "store", "@myorg"),
        { recursive: true },
      );

      expect(writeFileSync).toHaveBeenCalledWith(
        join("/home/user", ".envi", "store", "@myorg", "my-package.maml"),
        "maml content",
        "utf-8",
      );
    });
  });
});
