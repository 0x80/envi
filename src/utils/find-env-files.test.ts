import fg from "fast-glob";
import { existsSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { filterGitIgnoredFiles, isGitRepo } from "~/lib/git";
import { findEnvFiles } from "./find-env-files.js";

vi.mock("fast-glob");
vi.mock("node:fs");
vi.mock("~/lib/git");

describe("findEnvFiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    /** Default: no gitignore on disk */
    vi.mocked(existsSync).mockReturnValue(false);
  });

  describe("in a git repository", () => {
    beforeEach(() => {
      vi.mocked(isGitRepo).mockReturnValue(true);
    });

    it("returns only files git considers ignored", async () => {
      vi.mocked(fg).mockResolvedValue([
        ".env",
        ".env.shared",
        "apps/web/.env.local",
      ]);
      vi.mocked(filterGitIgnoredFiles).mockResolvedValue([
        ".env",
        "apps/web/.env.local",
      ]);

      const result = await findEnvFiles("/project");

      expect(result.files).toEqual([".env", "apps/web/.env.local"]);
      expect(result.skippedTracked).toEqual([".env.shared"]);
    });

    it("reports no skipped files when every candidate is ignored", async () => {
      vi.mocked(fg).mockResolvedValue([".env", ".env.local"]);
      vi.mocked(filterGitIgnoredFiles).mockResolvedValue([
        ".env",
        ".env.local",
      ]);

      const result = await findEnvFiles("/project");

      expect(result.files).toEqual([".env", ".env.local"]);
      expect(result.skippedTracked).toEqual([]);
    });

    it("excludes force-added files (tracked, even if matching .gitignore)", async () => {
      /**
       * `git add -f .env` makes a file tracked, so `git check-ignore` does NOT
       * report it as ignored — it should land in skippedTracked.
       */
      vi.mocked(fg).mockResolvedValue([".env", "apps/api/.env"]);
      vi.mocked(filterGitIgnoredFiles).mockResolvedValue(["apps/api/.env"]);

      const result = await findEnvFiles("/project");

      expect(result.files).toEqual(["apps/api/.env"]);
      expect(result.skippedTracked).toEqual([".env"]);
    });

    it("passes only the performance ignore patterns to fast-glob", async () => {
      vi.mocked(fg).mockResolvedValue([]);
      vi.mocked(filterGitIgnoredFiles).mockResolvedValue([]);

      await findEnvFiles("/project");

      const options = vi.mocked(fg).mock.calls[0]?.[1];
      expect(options?.ignore).toContain("node_modules/**");
      expect(options?.ignore).toContain(".git/**");
      /** No .gitignore-derived patterns when in a git repo */
      expect(existsSync).not.toHaveBeenCalled();
    });
  });

  describe("outside a git repository", () => {
    beforeEach(() => {
      vi.mocked(isGitRepo).mockReturnValue(false);
    });

    it("returns every matched file without invoking the git filter", async () => {
      vi.mocked(fg).mockResolvedValue([".env", "apps/web/.env.local"]);

      const result = await findEnvFiles("/project");

      expect(result.files).toEqual([".env", "apps/web/.env.local"]);
      expect(result.skippedTracked).toEqual([]);
      expect(filterGitIgnoredFiles).not.toHaveBeenCalled();
    });

    it("still skips directories listed in a top-level .gitignore", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      const { readFileSync } = await import("node:fs");
      vi.mocked(readFileSync).mockReturnValue(
        "node_modules\nbuild_output\n.env.local\n# comment\n" as never,
      );
      vi.mocked(fg).mockResolvedValue([".env"]);

      await findEnvFiles("/project");

      const options = vi.mocked(fg).mock.calls[0]?.[1];
      expect(options?.ignore).toContain("**/build_output/**");
      /** File-level patterns must not be added — we still want to find them */
      expect(options?.ignore).not.toContain("**/.env.local/**");
    });
  });
});
