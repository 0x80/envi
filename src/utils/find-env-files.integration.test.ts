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
