import { execa } from "execa";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
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
