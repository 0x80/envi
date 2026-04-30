import { consola } from "consola";
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
      expect(result.excluded).toEqual([".env.shared"]);
    });

    it("reports no excluded files when every candidate is ignored", async () => {
      vi.mocked(fg).mockResolvedValue([".env", ".env.local"]);
      vi.mocked(filterGitIgnoredFiles).mockResolvedValue([
        ".env",
        ".env.local",
      ]);

      const result = await findEnvFiles("/project");

      expect(result.files).toEqual([".env", ".env.local"]);
      expect(result.excluded).toEqual([]);
    });

    it("excludes force-added files (tracked, even if matching .gitignore)", async () => {
      /**
       * `git add -f .env` makes a file tracked, so `git check-ignore` does NOT
       * report it as ignored — it should land in `excluded`.
       */
      vi.mocked(fg).mockResolvedValue([".env", "apps/api/.env"]);
      vi.mocked(filterGitIgnoredFiles).mockResolvedValue(["apps/api/.env"]);

      const result = await findEnvFiles("/project");

      expect(result.files).toEqual(["apps/api/.env"]);
      expect(result.excluded).toEqual([".env"]);
    });

    it("captures Cloudflare .dev.vars files alongside .env files", async () => {
      /**
       * `.dev.vars` and `.dev.vars.<env>` use the same key=value format as
       * `.env` and hold the same kind of local secrets, so they should flow
       * through capture identically.
       */
      vi.mocked(fg).mockResolvedValue([
        ".env",
        ".dev.vars",
        ".dev.vars.staging",
        "apps/worker/.dev.vars",
      ]);
      vi.mocked(filterGitIgnoredFiles).mockResolvedValue([
        ".env",
        ".dev.vars",
        ".dev.vars.staging",
        "apps/worker/.dev.vars",
      ]);

      const result = await findEnvFiles("/project");

      expect(result.files).toEqual([
        ".env",
        ".dev.vars",
        ".dev.vars.staging",
        "apps/worker/.dev.vars",
      ]);
      expect(result.excluded).toEqual([]);

      const patterns = vi.mocked(fg).mock.calls[0]?.[0];
      expect(patterns).toContain(".dev.vars");
      expect(patterns).toContain(".dev.vars.*");
      expect(patterns).toContain("**/.dev.vars");
      expect(patterns).toContain("**/.dev.vars.*");
    });

    it("excludes untracked files that are not covered by a gitignore rule", async () => {
      /**
       * A new `.env` in a fresh dir without a matching ignore rule is neither
       * tracked nor ignored — git check-ignore returns nothing for it. It must
       * NOT be captured (the user might be about to commit it) but should land
       * in `excluded` so they know why it was skipped.
       */
      vi.mocked(fg).mockResolvedValue([".env", "new-dir/.env"]);
      vi.mocked(filterGitIgnoredFiles).mockResolvedValue([".env"]);

      const result = await findEnvFiles("/project");

      expect(result.files).toEqual([".env"]);
      expect(result.excluded).toEqual(["new-dir/.env"]);
    });

    it("falls back to capturing all candidates when git check-ignore fails", async () => {
      vi.mocked(fg).mockResolvedValue([".env", "apps/web/.env.local"]);
      vi.mocked(filterGitIgnoredFiles).mockRejectedValue(
        new Error("spawn git ENOENT"),
      );
      const warn = vi.spyOn(consola, "warn").mockImplementation(() => {});

      const result = await findEnvFiles("/project");

      expect(result.files).toEqual([".env", "apps/web/.env.local"]);
      expect(result.excluded).toEqual([]);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("spawn git ENOENT"),
      );
      warn.mockRestore();
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
      expect(result.excluded).toEqual([]);
      expect(filterGitIgnoredFiles).not.toHaveBeenCalled();
    });

    it("treats plain entries in a top-level .gitignore as directory patterns", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      const { readFileSync } = await import("node:fs");
      vi.mocked(readFileSync).mockReturnValue(
        [
          "node_modules",
          "build_output",
          ".cache",
          "apps.dist/",
          "*.log",
          "!important",
          "# comment",
          "",
        ].join("\n") as never,
      );
      vi.mocked(fg).mockResolvedValue([".env"]);

      await findEnvFiles("/project");

      const options = vi.mocked(fg).mock.calls[0]?.[1];
      /** Plain entries (with or without a trailing slash) become dir patterns */
      expect(options?.ignore).toContain("**/build_output/**");
      expect(options?.ignore).toContain("**/.cache/**");
      expect(options?.ignore).toContain("**/apps.dist/**");
      /** Glob patterns and negations are skipped — full ignore engine needed */
      expect(options?.ignore).not.toContain("**/*.log/**");
      expect(options?.ignore).not.toContain("**/!important/**");
    });
  });
});
