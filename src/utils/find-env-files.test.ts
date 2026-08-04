import { consola } from "consola";
import fg from "fast-glob";
import { existsSync, realpathSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { filterGitIgnoredFiles, isGitRepo, listWorktreePaths } from "~/lib/git";
import { findEnvFiles } from "./find-env-files.js";

/**
 * Only the glob call itself is mocked. `posix.escapePath` is a pure string
 * helper that the ignore-pattern construction depends on, so it stays real —
 * automocking it to `undefined` would make every worktree pattern silently
 * bogus and the escaping assertions meaningless.
 */
vi.mock("fast-glob", async (importOriginal) => {
  /**
   * `fast-glob` uses `export =`, so the module namespace wraps the callable in
   * `default` — typing it as the callable itself would not describe what
   * `importOriginal` actually hands back here.
   */
  const actual = await importOriginal<{
    default: typeof import("fast-glob");
  }>();
  const glob = vi.fn();
  Object.assign(glob, { posix: actual.default.posix });
  return { default: glob };
});
vi.mock("node:fs");
vi.mock("~/lib/git");

describe("findEnvFiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    /** Default: no gitignore on disk */
    vi.mocked(existsSync).mockReturnValue(false);
    /**
     * The synthetic `/project` paths don't exist on disk, so realpath resolves
     * to the input unchanged — the same normalization the real code applies to
     * paths that have no symlinks to resolve.
     */
    vi.mocked(realpathSync).mockImplementation(
      ((path: string) => path) as typeof realpathSync,
    );
  });

  describe("in a git repository", () => {
    beforeEach(() => {
      vi.mocked(isGitRepo).mockReturnValue(true);
      /** Default: git reports no linked worktrees; individual tests override */
      vi.mocked(listWorktreePaths).mockResolvedValue([]);
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

    it("anchors every ignored directory at both the root and any depth", async () => {
      /**
       * fast-glob anchors patterns at `cwd`, so a bare `node_modules/**` only
       * skips the top-level directory. Without the `**\/` variant the glob
       * walks every per-package `node_modules` and every nested `dist` of a
       * workspace — the difference between a sub-second scan and a minute.
       */
      vi.mocked(fg).mockResolvedValue([]);
      vi.mocked(filterGitIgnoredFiles).mockResolvedValue([]);

      await findEnvFiles("/project");

      const ignore = vi.mocked(fg).mock.calls[0]?.[1]?.ignore as string[];
      for (const name of ["node_modules", "dist", "build", ".turbo", ".git"]) {
        expect(ignore).toContain(`${name}/**`);
        expect(ignore).toContain(`**/${name}/**`);
      }
    });

    it("prunes registered worktrees from the glob instead of walking them", async () => {
      /**
       * Worktrees kept under the repo root are full checkouts. Letting the glob
       * walk them and discarding the matches afterwards costs one full
       * traversal per worktree for zero captured files.
       */
      vi.mocked(listWorktreePaths).mockResolvedValue([
        "/project",
        "/project/.worktrees/feature-a",
        "/project/.worktrees/feature-b",
      ]);
      vi.mocked(fg).mockResolvedValue([]);
      vi.mocked(filterGitIgnoredFiles).mockResolvedValue([]);

      await findEnvFiles("/project");

      const ignore = vi.mocked(fg).mock.calls[0]?.[1]?.ignore as string[];
      expect(ignore).toContain(".worktrees/feature-a/**");
      expect(ignore).toContain(".worktrees/feature-b/**");
      /** The main tree must never become an ignore pattern */
      expect(ignore).not.toContain("/**");
    });

    it("ignores worktrees registered outside the repo root", async () => {
      vi.mocked(listWorktreePaths).mockResolvedValue([
        "/project",
        "/elsewhere/feature-a",
      ]);
      vi.mocked(fg).mockResolvedValue([]);
      vi.mocked(filterGitIgnoredFiles).mockResolvedValue([]);

      await findEnvFiles("/project");

      const ignore = vi.mocked(fg).mock.calls[0]?.[1]?.ignore as string[];
      expect(ignore.some((pattern) => pattern.includes(".."))).toBe(false);
      expect(ignore.some((pattern) => pattern.startsWith("/"))).toBe(false);
    });

    it("still prunes an in-repo worktree whose name merely starts with ..", async () => {
      /**
       * `relative()` returns `..staging` verbatim for a directory of that name,
       * which a prefix test would misread as an escape out of the repo and
       * silently stop pruning.
       */
      vi.mocked(listWorktreePaths).mockResolvedValue([
        "/project",
        "/project/..staging",
      ]);
      vi.mocked(fg).mockResolvedValue([]);
      vi.mocked(filterGitIgnoredFiles).mockResolvedValue([]);

      await findEnvFiles("/project");

      const ignore = vi.mocked(fg).mock.calls[0]?.[1]?.ignore as string[];
      expect(ignore).toContain("..staging/**");
    });

    it("escapes glob metacharacters in a worktree path", async () => {
      /**
       * A worktree path is data, not a pattern. Unescaped, `feat*` yields
       * `.worktrees/feat*\/**`, which also matches the unrelated sibling
       * `.worktrees/feat-real` and drops its env file from the results — a
       * silent capture loss, not a missed optimization.
       */
      vi.mocked(listWorktreePaths).mockResolvedValue([
        "/project",
        "/project/.worktrees/feat*",
      ]);
      vi.mocked(fg).mockResolvedValue([]);
      vi.mocked(filterGitIgnoredFiles).mockResolvedValue([]);

      await findEnvFiles("/project");

      const ignore = vi.mocked(fg).mock.calls[0]?.[1]?.ignore as string[];
      expect(ignore).toContain(".worktrees/feat\\*/**");
      expect(ignore).not.toContain(".worktrees/feat*/**");
    });

    it("re-reads the worktree list after the glob so one registered mid-walk is still skipped", async () => {
      /**
       * The pre-glob snapshot feeds the ignore patterns, so it is necessarily
       * taken before the walk. A worktree git registers *during* the walk is
       * absent from it — and that is precisely when its `.git` pointer is
       * missing, so the marker probe cannot cover it either. Only a fresh read
       * after the glob keeps it out of `files`.
       */
      vi.mocked(listWorktreePaths)
        .mockResolvedValueOnce(["/project"])
        .mockResolvedValueOnce(["/project", "/project/.worktrees/late"]);
      vi.mocked(fg).mockResolvedValue([".env", ".worktrees/late/.env"]);
      vi.mocked(filterGitIgnoredFiles).mockResolvedValue([".env"]);

      const result = await findEnvFiles("/project");

      /**
       * The candidate list handed to the gitignore filter is the real evidence:
       * the late worktree's file must already be gone by then, not merely
       * absent from the final `files` (which the filter's own return decides).
       */
      const candidates = vi.mocked(filterGitIgnoredFiles).mock.calls[0]?.[1];
      expect(candidates).toEqual([".env"]);
      expect(result.files).toEqual([".env"]);
      expect(result.skippedNestedVcsRoots).toContain(".worktrees/late/.env");
      expect(vi.mocked(listWorktreePaths).mock.calls.length).toBe(2);
    });

    it("auto-expands a bare additionalPattern into root and **/ variants", async () => {
      vi.mocked(fg).mockResolvedValue([]);
      vi.mocked(filterGitIgnoredFiles).mockResolvedValue([]);

      await findEnvFiles("/project", { additionalPatterns: [".envrc"] });

      const patterns = vi.mocked(fg).mock.calls[0]?.[0];
      expect(patterns).toContain(".envrc");
      expect(patterns).toContain("**/.envrc");
      /** Built-in defaults still present */
      expect(patterns).toContain(".env");
      expect(patterns).toContain("**/.env");
    });

    it("passes additionalPatterns containing / through verbatim", async () => {
      vi.mocked(fg).mockResolvedValue([]);
      vi.mocked(filterGitIgnoredFiles).mockResolvedValue([]);

      await findEnvFiles("/project", {
        additionalPatterns: ["config/*.local"],
      });

      const patterns = vi.mocked(fg).mock.calls[0]?.[0];
      expect(patterns).toContain("config/*.local");
      expect(patterns).not.toContain("**/config/*.local");
    });

    it("deduplicates additionalPatterns that overlap with defaults", async () => {
      vi.mocked(fg).mockResolvedValue([]);
      vi.mocked(filterGitIgnoredFiles).mockResolvedValue([]);

      await findEnvFiles("/project", { additionalPatterns: [".env"] });

      const patterns = vi.mocked(fg).mock.calls[0]?.[0] as string[];
      const envCount = patterns.filter((p) => p === ".env").length;
      expect(envCount).toBe(1);
    });

    it("disables symlink following so pnpm links don't produce phantom paths", async () => {
      /**
       * Without this option fast-glob descends into pnpm's
       * `node_modules/.pnpm/...@repo/*` symlinks, surfacing duplicate paths
       * and triggering `git check-ignore: ... is beyond a symbolic link`.
       */
      vi.mocked(fg).mockResolvedValue([]);
      vi.mocked(filterGitIgnoredFiles).mockResolvedValue([]);

      await findEnvFiles("/project");

      const options = vi.mocked(fg).mock.calls[0]?.[1];
      expect(options?.followSymbolicLinks).toBe(false);
    });

    it("partitions candidates inside a nested VCS root into skippedNestedVcsRoots", async () => {
      /**
       * `.worktrees/feature/.env` is inside a directory that contains a `.git`
       * marker — it must not flow to `files` or `excluded` and must surface in
       * `skippedNestedVcsRoots` so the CLI can tell the user why.
       */
      vi.mocked(fg).mockResolvedValue([
        ".env",
        ".worktrees/feature/.env",
        ".worktrees/feature/services/api/.dev.vars",
      ]);
      vi.mocked(existsSync).mockImplementation((path) => {
        const p = String(path);
        return p === "/project/.worktrees/feature/.git";
      });
      vi.mocked(filterGitIgnoredFiles).mockResolvedValue([".env"]);

      const result = await findEnvFiles("/project");

      expect(result.files).toEqual([".env"]);
      expect(result.excluded).toEqual([]);
      expect(result.skippedNestedVcsRoots.sort()).toEqual([
        ".worktrees/feature/.env",
        ".worktrees/feature/services/api/.dev.vars",
      ]);
      /** The nested paths must not be passed to git check-ignore either */
      const passedToCheckIgnore = vi.mocked(filterGitIgnoredFiles).mock
        .calls[0]?.[1];
      expect(passedToCheckIgnore).toEqual([".env"]);
    });

    it("skips a registered worktree even when its .git marker is absent", async () => {
      /**
       * The regression case: a linked worktree whose `.git` pointer is
       * momentarily gone (mid add/remove). No marker exists on disk, so the
       * `existsSync` probe reports nothing nested — but `git worktree list`
       * still names the worktree, and that alone must skip its files.
       */
      vi.mocked(fg).mockResolvedValue([
        ".env",
        ".worktrees/feature/.env",
        ".worktrees/feature/services/api/.dev.vars",
      ]);
      /** No `.git` (or any) marker anywhere on disk */
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(listWorktreePaths).mockResolvedValue([
        "/project",
        "/project/.worktrees/feature",
      ]);
      vi.mocked(filterGitIgnoredFiles).mockResolvedValue([".env"]);

      const result = await findEnvFiles("/project");

      expect(result.files).toEqual([".env"]);
      expect(result.skippedNestedVcsRoots.sort()).toEqual([
        ".worktrees/feature/.env",
        ".worktrees/feature/services/api/.dev.vars",
      ]);
      /** The main tree entry in the worktree list must not skip its own files */
      const passedToCheckIgnore = vi.mocked(filterGitIgnoredFiles).mock
        .calls[0]?.[1];
      expect(passedToCheckIgnore).toEqual([".env"]);
    });

    it("does not skip a sibling whose path merely prefixes a worktree path", async () => {
      /**
       * `startsWith` on a raw path would match `.worktrees/feature-extra` for a
       * worktree at `.worktrees/feature`; the trailing-separator prefix guards
       * against that.
       */
      vi.mocked(fg).mockResolvedValue([".worktrees/feature-extra/.env"]);
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(listWorktreePaths).mockResolvedValue([
        "/project",
        "/project/.worktrees/feature",
      ]);
      vi.mocked(filterGitIgnoredFiles).mockResolvedValue([
        ".worktrees/feature-extra/.env",
      ]);

      const result = await findEnvFiles("/project");

      expect(result.files).toEqual([".worktrees/feature-extra/.env"]);
      expect(result.skippedNestedVcsRoots).toEqual([]);
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

    it("returns .dev.vars matches without invoking the git filter", async () => {
      vi.mocked(fg).mockResolvedValue([
        ".dev.vars",
        ".dev.vars.staging",
        "apps/worker/.dev.vars",
      ]);

      const result = await findEnvFiles("/project");

      expect(result.files).toEqual([
        ".dev.vars",
        ".dev.vars.staging",
        "apps/worker/.dev.vars",
      ]);
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
