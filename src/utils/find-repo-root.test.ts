import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { findRepoRoot } from "./find-repo-root";

vi.mock("node:fs");
vi.mock("enquirer");

describe("findRepoRoot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should find .git directory in current directory", async () => {
    const testDir = "/project";
    vi.mocked(existsSync).mockImplementation((path) => {
      return path === join(testDir, ".git");
    });

    const result = await findRepoRoot(testDir);
    expect(result).toBe(testDir);
  });

  it("should find .git directory in parent directory", async () => {
    const testDir = "/project/src";
    const parentDir = "/project";

    vi.mocked(existsSync).mockImplementation((path) => {
      return path === join(parentDir, ".git");
    });

    const result = await findRepoRoot(testDir);
    expect(result).toBe(parentDir);
  });

  it("should find .hg directory", async () => {
    const testDir = "/project";
    vi.mocked(existsSync).mockImplementation((path) => {
      return path === join(testDir, ".hg");
    });

    const result = await findRepoRoot(testDir);
    expect(result).toBe(testDir);
  });

  it("should find .svn directory", async () => {
    const testDir = "/project";
    vi.mocked(existsSync).mockImplementation((path) => {
      return path === join(testDir, ".svn");
    });

    const result = await findRepoRoot(testDir);
    expect(result).toBe(testDir);
  });

  it("should find .jj directory in current directory", async () => {
    const testDir = "/project";
    vi.mocked(existsSync).mockImplementation((path) => {
      return path === join(testDir, ".jj");
    });

    const result = await findRepoRoot(testDir);
    expect(result).toBe(testDir);
  });

  it("should find .jj directory in parent directory", async () => {
    const testDir = "/project/src";
    const parentDir = "/project";

    vi.mocked(existsSync).mockImplementation((path) => {
      return path === join(parentDir, ".jj");
    });

    const result = await findRepoRoot(testDir);
    expect(result).toBe(parentDir);
  });
});
