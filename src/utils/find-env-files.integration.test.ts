import { execa } from "execa";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { findEnvFiles } from "./find-env-files";

/**
 * Exercises `findEnvFiles` against a real git repo with nested `.gitignore`s.
 * This is what verifies the contract between our code and `git check-ignore` —
 * the unit tests above only check our own logic and could miss a regression in
 * argv framing, NUL handling, or exit-code interpretation.
 */
describe("findEnvFiles (integration)", () => {
  let repoRoot: string;

  beforeAll(async () => {
    repoRoot = mkdtempSync(join(tmpdir(), "envi-find-env-files-"));

    await execa("git", ["init", "-q"], { cwd: repoRoot });
    await execa("git", ["config", "user.email", "test@example.com"], {
      cwd: repoRoot,
    });
    await execa("git", ["config", "user.name", "Test"], { cwd: repoRoot });

    /** Root: ignore `.env`, `.dev.vars`, and `.dev.vars.*`; allow `.env.shared` */
    writeFileSync(
      join(repoRoot, ".gitignore"),
      ".env\n.dev.vars\n.dev.vars.*\n",
    );
    writeFileSync(join(repoRoot, ".env"), "ROOT_SECRET=1\n");
    writeFileSync(join(repoRoot, ".env.shared"), "ROOT_SHARED=1\n");
    writeFileSync(join(repoRoot, ".dev.vars"), "CF_SECRET=1\n");
    writeFileSync(join(repoRoot, ".dev.vars.staging"), "CF_STAGING=1\n");

    /** Apps/web: nested .gitignore adds `.env.local` */
    mkdirSync(join(repoRoot, "apps/web"), { recursive: true });
    writeFileSync(join(repoRoot, "apps/web/.gitignore"), ".env.local\n");
    writeFileSync(join(repoRoot, "apps/web/.env.local"), "WEB_SECRET=1\n");
    writeFileSync(join(repoRoot, "apps/web/.env"), "WEB_PUBLIC=1\n");

    /** Packages/api: no nested .gitignore — `.env` here matches root rule */
    mkdirSync(join(repoRoot, "packages/api"), { recursive: true });
    writeFileSync(join(repoRoot, "packages/api/.env"), "API_SECRET=1\n");
    writeFileSync(
      join(repoRoot, "packages/api/.env.example"),
      "API_EXAMPLE=1\n",
    );

    /** Track everything that isn't gitignored */
    await execa(
      "git",
      ["add", ".gitignore", ".env.shared", "apps/web", "packages/api"],
      { cwd: repoRoot },
    );
    await execa("git", ["commit", "-q", "-m", "init"], { cwd: repoRoot });
  });

  afterAll(() => {
    rmSync(repoRoot, { recursive: true, force: true });
  });

  it("captures gitignored files and excludes everything else", async () => {
    const result = await findEnvFiles(repoRoot);

    expect(result.files.sort()).toEqual([
      ".dev.vars",
      ".dev.vars.staging",
      ".env",
      "apps/web/.env",
      "apps/web/.env.local",
      "packages/api/.env",
    ]);
    expect(result.excluded.sort()).toEqual([
      ".env.shared",
      "packages/api/.env.example",
    ]);
  });

  it("excludes dependency and build directories at any depth", async () => {
    /**
     * The unit tests assert the shape of the ignore patterns; this asserts the
     * behavior they are supposed to produce. fast-glob anchors patterns at
     * `cwd`, so a root-only `node_modules/**` leaves every per-package
     * `node_modules` and every `apps/*\/dist` of a workspace being walked —
     * which is the regression that made a real monorepo take over a minute.
     */
    const buried = [
      "node_modules/pkg",
      "apps/web/node_modules/pkg",
      "apps/web/dist/server",
      "packages/api/build",
      "packages/api/.turbo",
      "apps/web/coverage",
    ];

    try {
      for (const dir of buried) {
        mkdirSync(join(repoRoot, dir), { recursive: true });
        writeFileSync(join(repoRoot, dir, ".env"), "BURIED=1\n");
      }

      const result = await findEnvFiles(repoRoot);
      const all = [
        ...result.files,
        ...result.excluded,
        ...result.skippedNestedVcsRoots,
      ];

      for (const dir of buried) {
        expect(all).not.toContain(`${dir}/.env`);
      }

      /** Sanity: ordinary files are still captured while these are pruned */
      expect(result.files).toContain(".env");
      expect(result.files).toContain("apps/web/.env.local");
    } finally {
      for (const dir of [
        "node_modules",
        "apps/web/node_modules",
        "apps/web/dist",
        "packages/api/build",
        "packages/api/.turbo",
        "apps/web/coverage",
      ]) {
        rmSync(join(repoRoot, dir), { recursive: true, force: true });
      }
    }
  });

  it("does not let a worktree path's glob metacharacters swallow a sibling", async () => {
    /**
     * A registered worktree named `feat*` must be pruned as a literal path. If
     * its path is spliced into a pattern unescaped, `.worktrees/feat*\/**` also
     * matches `.worktrees/feat-real`, whose `.env` then vanishes from every
     * result bucket — a silently dropped secret rather than a slower scan.
     */
    const worktreePath = join(repoRoot, ".worktrees/feat*");
    const siblingDir = join(repoRoot, ".worktrees/feat-real");

    await execa(
      "git",
      ["worktree", "add", "-q", "-b", "star-branch", worktreePath],
      { cwd: repoRoot },
    );
    writeFileSync(join(worktreePath, ".env"), "STAR_WT=1\n");
    mkdirSync(siblingDir, { recursive: true });
    writeFileSync(join(siblingDir, ".env"), "SIBLING=1\n");

    try {
      const result = await findEnvFiles(repoRoot);
      const all = [
        ...result.files,
        ...result.excluded,
        ...result.skippedNestedVcsRoots,
      ];

      /** The real worktree is pruned ... */
      expect(all).not.toContain(".worktrees/feat*/.env");
      /** ... and the innocent sibling survives */
      expect(result.files).toContain(".worktrees/feat-real/.env");
    } finally {
      await execa("git", ["worktree", "remove", "--force", worktreePath], {
        cwd: repoRoot,
        reject: false,
      });
      await execa("git", ["worktree", "prune"], {
        cwd: repoRoot,
        reject: false,
      });
      await execa("git", ["branch", "-D", "star-branch"], {
        cwd: repoRoot,
        reject: false,
      });
      rmSync(join(repoRoot, ".worktrees"), { recursive: true, force: true });
    }
  });

  it("does not descend into nested VCS roots (worktrees, submodules, nested clones)", async () => {
    /**
     * Build three flavors of nested VCS root and confirm none of their env
     * files surface:
     *   - `.worktrees/feature` — git worktree (`.git` is a FILE pointing back
     *     to the main repo's `.git/worktrees/...`)
     *   - `vendor/nested-clone` — a real nested git repo (`.git` is a DIR)
     *   - `tools/jj-thing` — a `.jj/` directory (no real jj checkout needed,
     *     just the marker)
     */
    const worktreeDir = join(repoRoot, ".worktrees/feature");
    mkdirSync(join(worktreeDir, "services/api"), { recursive: true });
    writeFileSync(join(worktreeDir, ".git"), "gitdir: /elsewhere\n");
    writeFileSync(join(worktreeDir, ".env"), "WORKTREE_SECRET=1\n");
    writeFileSync(join(worktreeDir, "services/api/.dev.vars"), "WT_API=1\n");

    const nestedCloneDir = join(repoRoot, "vendor/nested-clone");
    mkdirSync(join(nestedCloneDir, ".git"), { recursive: true });
    writeFileSync(join(nestedCloneDir, ".env"), "NESTED_SECRET=1\n");

    const jjDir = join(repoRoot, "tools/jj-thing");
    mkdirSync(join(jjDir, ".jj"), { recursive: true });
    writeFileSync(join(jjDir, ".env"), "JJ_SECRET=1\n");

    try {
      const result = await findEnvFiles(repoRoot);
      const all = [...result.files, ...result.excluded];

      /** Nested-VCS files must not leak into files or excluded */
      expect(all).not.toContain(".worktrees/feature/.env");
      expect(all).not.toContain(".worktrees/feature/services/api/.dev.vars");
      expect(all).not.toContain("vendor/nested-clone/.env");
      expect(all).not.toContain("tools/jj-thing/.env");

      /** They must, however, surface in skippedNestedVcsRoots */
      expect(result.skippedNestedVcsRoots.sort()).toEqual([
        ".worktrees/feature/.env",
        ".worktrees/feature/services/api/.dev.vars",
        "tools/jj-thing/.env",
        "vendor/nested-clone/.env",
      ]);

      /** Sanity: legitimate root-level files still get captured */
      expect(result.files).toContain(".env");
    } finally {
      rmSync(join(repoRoot, ".worktrees"), { recursive: true, force: true });
      rmSync(join(repoRoot, "vendor"), { recursive: true, force: true });
      rmSync(join(repoRoot, "tools"), { recursive: true, force: true });
    }
  });

  it("skips a real registered worktree even when its .git pointer is missing", async () => {
    /**
     * The regression this guards against, exercised against the real git
     * binary rather than a mocked `git worktree list`. Create a genuine linked
     * worktree, then delete its `.git` pointer file to reproduce the transient
     * window during `git worktree add`/`remove` where the marker is gone. The
     * worktree is still registered in the main repo's `.git/worktrees/`, so
     * `git worktree list` still reports it and its env file must still be
     * skipped — the marker probe alone would miss it here.
     *
     * A registered worktree is pruned from the glob up front rather than
     * walked and discarded, so its files never enter any result bucket —
     * including `skippedNestedVcsRoots`. Nested working trees git does *not*
     * know about (submodules, nested clones, jj/hg checkouts) are still
     * reported there; the test above covers that path.
     */
    const worktreePath = join(repoRoot, ".worktrees/live");
    await execa(
      "git",
      ["worktree", "add", "-q", "-b", "live-branch", worktreePath],
      { cwd: repoRoot },
    );
    writeFileSync(join(worktreePath, ".env"), "LIVE_WT=1\n");
    rmSync(join(worktreePath, ".git"), { force: true });

    try {
      const result = await findEnvFiles(repoRoot);
      const all = [
        ...result.files,
        ...result.excluded,
        ...result.skippedNestedVcsRoots,
      ];

      expect(all).not.toContain(".worktrees/live/.env");
      /** Sanity: the main tree's own files are unaffected by the pruning */
      expect(result.files).toContain(".env");
    } finally {
      await execa("git", ["worktree", "remove", "--force", worktreePath], {
        cwd: repoRoot,
        reject: false,
      });
      await execa("git", ["worktree", "prune"], {
        cwd: repoRoot,
        reject: false,
      });
      rmSync(join(repoRoot, ".worktrees"), { recursive: true, force: true });
      await execa("git", ["branch", "-D", "live-branch"], {
        cwd: repoRoot,
        reject: false,
      });
    }
  });

  it("does not follow symlinks into linked workspace packages", async () => {
    /**
     * pnpm creates symlinks under `node_modules/.pnpm/...` that point back into
     * the workspace. fast-glob defaults to following them, which produces
     * phantom paths AND triggers `git check-ignore` errors ("beyond a symbolic
     * link"). With `followSymbolicLinks: false`, the symlinked target's env
     * files must not appear under the link path.
     *
     * `node_modules/**` is in the default ignore list, so emulate the same
     * pattern with a non-ignored linker dir.
     */
    const realPkgDir = join(repoRoot, "packages/linked-pkg");
    mkdirSync(realPkgDir, { recursive: true });
    writeFileSync(join(realPkgDir, ".dev.vars"), "LINKED=1\n");

    const linkerDir = join(repoRoot, "linker");
    mkdirSync(linkerDir, { recursive: true });
    /**
     * Use `junction` so the test runs on Windows without admin/Developer
     * Mode. On non-Windows the type argument is ignored and Node creates a
     * regular directory symlink — which is what we need fast-glob to skip.
     */
    symlinkSync(realPkgDir, join(linkerDir, "linked-pkg"), "junction");

    try {
      const result = await findEnvFiles(repoRoot);
      const all = [...result.files, ...result.excluded];

      /** The real path is captured */
      expect(all).toContain("packages/linked-pkg/.dev.vars");
      /** The symlinked path is NOT captured */
      expect(all).not.toContain("linker/linked-pkg/.dev.vars");
    } finally {
      rmSync(linkerDir, { recursive: true, force: true });
      rmSync(realPkgDir, { recursive: true, force: true });
    }
  });

  it("captures user-provided additional patterns at root and nested depths", async () => {
    /**
     * When the per-repo config declares `capture_patterns: [".flaskenv"]`,
     * findEnvFiles should pick up `.flaskenv` at any depth. The `.flaskenv`
     * line in `.gitignore` (no leading slash) applies at every depth, so
     * both the root and nested file are git-ignored and therefore captured.
     *
     * Fixture content uses plain `KEY=value` because this test exercises
     * file discovery only — we deliberately avoid shell-style content (e.g.
     * direnv's `export FOO=bar`) since Envi's parser doesn't strip `export`.
     */
    writeFileSync(
      join(repoRoot, ".gitignore"),
      ".env\n.dev.vars\n.dev.vars.*\n.flaskenv\n",
    );
    writeFileSync(join(repoRoot, ".flaskenv"), "ROOT_FLASK=1\n");

    const nestedDir = join(repoRoot, "packages/api");
    writeFileSync(join(nestedDir, ".flaskenv"), "API_FLASK=1\n");

    try {
      const result = await findEnvFiles(repoRoot, {
        additionalPatterns: [".flaskenv"],
      });

      expect(result.files).toContain(".flaskenv");
      expect(result.files).toContain("packages/api/.flaskenv");
    } finally {
      writeFileSync(
        join(repoRoot, ".gitignore"),
        ".env\n.dev.vars\n.dev.vars.*\n",
      );
      rmSync(join(repoRoot, ".flaskenv"), { force: true });
      rmSync(join(nestedDir, ".flaskenv"), { force: true });
    }
  });

  it("excludes a file that has been force-added", async () => {
    /**
     * Force-add the root `.env` despite the ignore rule. It is now tracked, so
     * `git check-ignore` no longer reports it as ignored and `findEnvFiles`
     * must not capture it.
     */
    await execa("git", ["add", "-f", ".env"], { cwd: repoRoot });
    await execa("git", ["commit", "-q", "-m", "force-add .env"], {
      cwd: repoRoot,
    });

    try {
      const result = await findEnvFiles(repoRoot);

      expect(result.files).not.toContain(".env");
      expect(result.excluded).toContain(".env");
    } finally {
      /** Restore prior state for any later test in this block */
      await execa("git", ["rm", "--cached", ".env"], { cwd: repoRoot });
      await execa("git", ["commit", "-q", "-m", "untrack .env"], {
        cwd: repoRoot,
      });
    }
  });
});
