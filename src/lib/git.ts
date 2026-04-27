import { existsSync } from "node:fs";
import { join } from "node:path";
import { execa } from "execa";

/**
 * Check if a directory is a git repository
 *
 * @param dir - Directory to check
 * @returns True if directory contains .git
 */
export function isGitRepo(dir: string): boolean {
  return existsSync(join(dir, ".git"));
}

/**
 * Filter a list of paths to only those git considers ignored
 *
 * Uses `git check-ignore` so all gitignore semantics are honored: nested
 * `.gitignore` files, repo-local `.git/info/exclude`, the user's global ignore
 * file, and negation rules. Tracked files (including those added with `git add
 * -f`) are NOT reported as ignored, which is what we want.
 *
 * @param repoRoot - Absolute path to the git repository root
 * @param paths - Paths relative to `repoRoot` to check
 * @returns Subset of `paths` that git considers ignored, in the same order
 */
export async function filterGitIgnoredFiles(
  repoRoot: string,
  paths: string[],
): Promise<string[]> {
  if (paths.length === 0) {
    return [];
  }

  const result = await execa("git", ["check-ignore", "--stdin", "-z"], {
    cwd: repoRoot,
    input: paths.join("\0"),
    reject: false,
  });

  /**
   * Exit code 1 means "no paths matched" — not an error. Anything else non-zero
   * is a real failure (e.g. not a git repo, git missing).
   */
  if (result.exitCode === 1) {
    return [];
  }
  if (result.exitCode !== 0) {
    throw new Error(
      `git check-ignore failed (exit ${result.exitCode}): ${result.stderr}`,
    );
  }

  const ignored = new Set(
    result.stdout.split("\0").filter((path) => path.length > 0),
  );

  return paths.filter((path) => ignored.has(path));
}

/**
 * Initialize a git repository
 *
 * @param dir - Directory to initialize
 */
export async function initGitRepo(dir: string): Promise<void> {
  await execa("git", ["init"], { cwd: dir });
}

/**
 * Add remote origin to git repository
 *
 * @param dir - Repository directory
 * @param remoteUrl - Remote URL to add
 */
export async function addRemote(dir: string, remoteUrl: string): Promise<void> {
  try {
    /** Check if remote already exists */
    await execa("git", ["remote", "get-url", "origin"], { cwd: dir });
    /** If it exists, update it */
    await execa("git", ["remote", "set-url", "origin", remoteUrl], {
      cwd: dir,
    });
  } catch {
    /** If it doesn't exist, add it */
    await execa("git", ["remote", "add", "origin", remoteUrl], { cwd: dir });
  }
}

/**
 * Commit all changes and push to remote
 *
 * @param dir - Repository directory
 * @param message - Commit message
 */
export async function commitAndPush(
  dir: string,
  message: string,
): Promise<void> {
  /** Stage all changes */
  await execa("git", ["add", "-A"], { cwd: dir });

  /** Check if there are changes to commit */
  try {
    const { stdout } = await execa("git", ["status", "--porcelain"], {
      cwd: dir,
    });
    if (!stdout.trim()) {
      /** No changes to commit */
      return;
    }
  } catch {
    /** If status check fails, continue anyway */
  }

  /** Commit */
  await execa("git", ["commit", "-m", message], { cwd: dir });

  /** Push to remote */
  await execa("git", ["push", "-u", "origin", "main"], { cwd: dir });
}

/**
 * Create initial commit without pushing
 *
 * @param dir - Repository directory
 */
export async function createInitialCommit(dir: string): Promise<void> {
  await execa("git", ["add", "-A"], { cwd: dir });
  await execa("git", ["commit", "-m", "Initial commit: envi store"], {
    cwd: dir,
  });
  await execa("git", ["branch", "-M", "main"], { cwd: dir });
}

/**
 * Create initial commit and push
 *
 * @param dir - Repository directory
 */
export async function initialCommitAndPush(dir: string): Promise<void> {
  await createInitialCommit(dir);
  await execa("git", ["push", "-u", "origin", "main"], { cwd: dir });
}
