import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readEnvFiles } from "./read-env-files";

/**
 * Exercised against a real temp directory rather than a mocked `fs`, because
 * the whole point of `readEnvFiles` is resilience to real filesystem failure
 * modes — a path that is gone, a dangling symlink — and a mock that returns a
 * canned throw would not prove the behavior against the actual `readFileSync`.
 */
describe("readEnvFiles", () => {
  let repoRoot: string;

  beforeAll(() => {
    repoRoot = mkdtempSync(join(tmpdir(), "envi-read-env-files-"));
    writeFileSync(join(repoRoot, ".env"), "GOOD=1\n");
    writeFileSync(join(repoRoot, ".env.local"), "ALSO_GOOD=2\n");
    /** A symlink whose target never exists — parses to ENOENT on read. */
    symlinkSync(
      join(repoRoot, "does-not-exist"),
      join(repoRoot, ".env.dangling"),
    );
  });

  afterAll(() => {
    rmSync(repoRoot, { recursive: true, force: true });
  });

  it("parses every readable file and reports none unreadable", () => {
    const result = readEnvFiles(repoRoot, [".env", ".env.local"]);

    expect(result.unreadable).toEqual([]);
    expect(result.parsed).toEqual([
      { path: ".env", env: { GOOD: "1" } },
      { path: ".env.local", env: { ALSO_GOOD: "2" } },
    ]);
  });

  it("skips a path that does not exist instead of throwing", () => {
    const result = readEnvFiles(repoRoot, [".env", ".env.missing"]);

    expect(result.parsed.map((file) => file.path)).toEqual([".env"]);
    expect(result.unreadable).toEqual([".env.missing"]);
  });

  it("skips a dangling symlink instead of throwing", () => {
    const result = readEnvFiles(repoRoot, [".env.dangling"]);

    expect(result.parsed).toEqual([]);
    expect(result.unreadable).toEqual([".env.dangling"]);
  });

  it("keeps the readable files when an unreadable one is interleaved", () => {
    const result = readEnvFiles(repoRoot, [
      ".env",
      ".env.missing",
      ".env.local",
    ]);

    expect(result.parsed.map((file) => file.path)).toEqual([
      ".env",
      ".env.local",
    ]);
    expect(result.unreadable).toEqual([".env.missing"]);
  });

  it("returns empty results for an empty input list", () => {
    expect(readEnvFiles(repoRoot, [])).toEqual({ parsed: [], unreadable: [] });
  });
});
