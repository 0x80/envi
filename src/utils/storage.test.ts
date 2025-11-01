import { stringify } from "maml.js";
import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getStorageDir, getStorageFilename, saveToStorage } from "./storage.js";

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

  describe("getStorageFilename", () => {
    it("should generate filename from repo path", () => {
      const result = getStorageFilename("/home/user/projects/myproject");

      expect(result).toBe("myproject.maml");
    });

    it("should handle different repo names", () => {
      const result = getStorageFilename("/var/www/my-app");

      expect(result).toBe("my-app.maml");
    });
  });

  describe("saveToStorage", () => {
    it("should create storage directory and save file", () => {
      vi.mocked(homedir).mockReturnValue("/home/user");
      vi.mocked(stringify).mockReturnValue("maml content");

      const repoPath = "/home/user/projects/myproject";
      const envFiles = [
        {
          path: ".env",
          env: { KEY1: "value1" },
        },
      ];

      saveToStorage(repoPath, envFiles);

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
        join("/home/user", ".envi", "store", "myproject.maml"),
        "maml content",
        "utf-8",
      );
    });
  });
});
