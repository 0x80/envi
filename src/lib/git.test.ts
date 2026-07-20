import { existsSync } from "node:fs";
import { execa } from "execa";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  commitAndPush,
  filterGitIgnoredFiles,
  isGitRepo,
  listWorktreePaths,
} from "./git";

vi.mock("node:fs");
vi.mock("execa");

/**
 * Build a mock `execa` that resolves based on the git subcommand, so tests can
 * drive each step (status, fetch, rebase, push) independently regardless of
 * call order. Any subcommand without an override resolves to a clean success.
 *
 * @param overrides - Map of git subcommand (first arg) to its mocked result
 */
function mockGit(
  overrides: Record<string, { exitCode?: number; stdout?: string }> = {},
): void {
  vi.mocked(execa).mockImplementation((_cmd, args) => {
    const subcommand = Array.isArray(args) ? String(args[0]) : "";
    const override = overrides[subcommand] ?? {};
    return Promise.resolve({
      exitCode: override.exitCode ?? 0,
      stdout: override.stdout ?? "",
      stderr: "",
    }) as never;
  });
}

/**
 * Collect the git subcommands execa was called with, in order.
 *
 * @returns The first argument of each `git` invocation (e.g. "fetch", "push")
 */
function calledGitSubcommands(): string[] {
  return vi.mocked(execa).mock.calls.map((call) => {
    const args = call[1];
    return Array.isArray(args) ? String(args[0]) : "";
  });
}

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

  describe("commitAndPush", () => {
    it("returns early without committing when there are no changes", async () => {
      mockGit({ status: { stdout: "" } });

      await commitAndPush("/envi", "Update env files");

      const subcommands = calledGitSubcommands();
      expect(subcommands).toContain("add");
      expect(subcommands).toContain("status");
      expect(subcommands).not.toContain("commit");
      expect(subcommands).not.toContain("push");
    });

    it("fetches and rebases onto the remote before pushing", async () => {
      mockGit({ status: { stdout: " M store/app.maml" } });

      await commitAndPush("/envi", "Update env files");

      const subcommands = calledGitSubcommands();
      expect(subcommands).toEqual([
        "add",
        "status",
        "commit",
        "fetch",
        "rebase",
        "push",
      ]);
      expect(execa).toHaveBeenCalledWith(
        "git",
        ["fetch", "origin", "main"],
        expect.objectContaining({ cwd: "/envi", reject: false }),
      );
      expect(execa).toHaveBeenCalledWith(
        "git",
        ["rebase", "FETCH_HEAD"],
        expect.objectContaining({ cwd: "/envi", reject: false }),
      );
    });

    it("skips the rebase and still pushes when the remote branch does not exist yet", async () => {
      mockGit({
        status: { stdout: " M store/app.maml" },
        fetch: { exitCode: 128 },
      });

      await commitAndPush("/envi", "Update env files");

      const subcommands = calledGitSubcommands();
      expect(subcommands).toContain("fetch");
      expect(subcommands).not.toContain("rebase");
      expect(subcommands).toContain("push");
    });

    it("aborts the rebase and throws an actionable error when the rebase fails", async () => {
      mockGit({
        status: { stdout: " M store/app.maml" },
        rebase: { exitCode: 1 },
      });

      await expect(commitAndPush("/envi", "Update env files")).rejects.toThrow(
        /could not rebase[\s\S]*git pull --rebase[\s\S]*git push/i,
      );

      expect(execa).toHaveBeenCalledWith(
        "git",
        ["rebase", "--abort"],
        expect.objectContaining({ cwd: "/envi", reject: false }),
      );
      expect(calledGitSubcommands()).not.toContain("push");
    });

    it("includes the rebase stderr in the error for diagnostics", async () => {
      vi.mocked(execa).mockImplementation((_cmd, args) => {
        const argv = Array.isArray(args) ? args.map(String) : [];
        if (argv[0] === "status") {
          return Promise.resolve({
            exitCode: 0,
            stdout: " M store/app.maml",
            stderr: "",
          }) as never;
        }
        if (argv[0] === "rebase" && argv[1] === "FETCH_HEAD") {
          return Promise.resolve({
            exitCode: 1,
            stdout: "",
            stderr: "CONFLICT (content): Merge conflict in store/app.maml",
          }) as never;
        }
        return Promise.resolve({
          exitCode: 0,
          stdout: "",
          stderr: "",
        }) as never;
      });

      await expect(commitAndPush("/envi", "Update env files")).rejects.toThrow(
        /Merge conflict in store\/app\.maml/,
      );
    });
  });

  describe("listWorktreePaths", () => {
    it("parses the worktree paths from porcelain -z output", async () => {
      /**
       * `--porcelain -z` output: NUL-separated `label value` records, one
       * stanza per worktree (main tree first), stanzas ending in an empty
       * record. Only the `worktree <path>` records carry a path.
       */
      const stdout = [
        "worktree /project",
        "HEAD abc123",
        "branch refs/heads/main",
        "",
        "worktree /project/.worktrees/feature",
        "HEAD def456",
        "branch refs/heads/feature",
        "",
      ].join("\0");
      mockGit({ worktree: { stdout } });

      const result = await listWorktreePaths("/project");

      expect(result).toEqual(["/project", "/project/.worktrees/feature"]);
    });

    it("returns an empty array when git exits non-zero", async () => {
      mockGit({ worktree: { exitCode: 128 } });

      expect(await listWorktreePaths("/project")).toEqual([]);
    });

    it("returns an empty array when git is unavailable", async () => {
      vi.mocked(execa).mockRejectedValue(new Error("spawn git ENOENT"));

      expect(await listWorktreePaths("/project")).toEqual([]);
    });
  });
});
