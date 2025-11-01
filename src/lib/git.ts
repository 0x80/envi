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
