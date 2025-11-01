import { stringify } from "maml.js";
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
    it("should create storage directory and save file with package name", () => {
      vi.mocked(homedir).mockReturnValue("/home/user");
      vi.mocked(stringify).mockReturnValue("maml content");

      const repoPath = "/home/user/projects/myproject";
      const envFiles = [
        {
          path: ".env",
          env: { KEY1: "value1" },
        },
      ];

      saveToStorage(repoPath, envFiles, "my-package");

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

    it("should create subdirectory for scoped packages", () => {
      vi.mocked(homedir).mockReturnValue("/home/user");
      vi.mocked(stringify).mockReturnValue("maml content");

      const repoPath = "/home/user/projects/myproject";
      const envFiles = [{ path: ".env", env: { KEY1: "value1" } }];

      saveToStorage(repoPath, envFiles, "@myorg/my-package");

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
