import { existsSync } from "node:fs";
import { execa } from "execa";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { filterGitIgnoredFiles, isGitRepo } from "./git";

vi.mock("node:fs");
vi.mock("execa");

describe("git", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isGitRepo", () => {
    it("should return true if .git exists", () => {
      vi.mocked(existsSync).mockReturnValue(true);

      const result = isGitRepo("/project");

      expect(result).toBe(true);
    });

    it("should return false if .git does not exist", () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const result = isGitRepo("/project");

      expect(result).toBe(false);
    });
  });

  describe("filterGitIgnoredFiles", () => {
    it("returns empty array without invoking git when given no paths", async () => {
      const result = await filterGitIgnoredFiles("/project", []);

      expect(result).toEqual([]);
      expect(execa).not.toHaveBeenCalled();
    });

    it("returns the subset git reports as ignored", async () => {
      vi.mocked(execa).mockResolvedValue({
        exitCode: 0,
        stdout: [".env", "apps/web/.env.local"].join("\0"),
        stderr: "",
      } as never);

      const result = await filterGitIgnoredFiles("/project", [
        ".env",
        ".env.shared",
        "apps/web/.env.local",
      ]);

      expect(result).toEqual([".env", "apps/web/.env.local"]);
      expect(execa).toHaveBeenCalledWith(
        "git",
        ["check-ignore", "--stdin", "-z"],
        expect.objectContaining({
          cwd: "/project",
          input: [".env", ".env.shared", "apps/web/.env.local"].join("\0"),
          reject: false,
        }),
      );
    });

    it("returns an empty array when git exits 1 (no paths matched)", async () => {
      vi.mocked(execa).mockResolvedValue({
        exitCode: 1,
        stdout: "",
        stderr: "",
      } as never);

      const result = await filterGitIgnoredFiles("/project", [".env.shared"]);

      expect(result).toEqual([]);
    });

    it("throws when git exits with a real error code", async () => {
      vi.mocked(execa).mockResolvedValue({
        exitCode: 128,
        stdout: "",
        stderr: "fatal: not a git repository",
      } as never);

      await expect(filterGitIgnoredFiles("/project", [".env"])).rejects.toThrow(
        /not a git repository/,
      );
    });
  });
});
