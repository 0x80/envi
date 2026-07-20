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
 * List the absolute paths of every working tree git knows about for this repo —
 * the main working tree plus every linked worktree created with `git worktree
 * add`.
 *
 * Used as an authoritative complement to the on-disk `.git`-marker probe in
 * `findEnvFiles`. That probe classifies a directory as a nested working tree by
 * the presence of a `.git` entry, but a linked worktree momentarily lacks its
 * `.git` pointer file while git is adding or removing it — and the marker probe
 * alone would then fail to skip it, capturing another working tree's env files.
 * `git worktree list` reports the worktree regardless of that transient
 * on-disk state.
 *
 * Best-effort: returns `[]` when git is unavailable, the directory is not a
 * repository, or the installed git predates `worktree list --porcelain -z`, so
 * the caller cleanly falls back to marker-only detection. It does not report a
 * fully orphaned directory whose worktree registration has already been pruned
 * (git no longer considers that a worktree) — that residual case is covered by
 * capture/pack tolerating an unreadable file rather than by detection here.
 *
 * @param repoRoot - Absolute path to the git repository root
 * @returns Absolute worktree paths, including the main working tree
 */
export async function listWorktreePaths(repoRoot: string): Promise<string[]> {
  try {
    const result = await execa(
      "git",
      ["worktree", "list", "--porcelain", "-z"],
      { cwd: repoRoot, reject: false },
    );

    if (result.exitCode !== 0) {
      return [];
    }

    /**
     * `--porcelain -z` emits NUL-separated `label value` records, one stanza
     * per worktree. Only the `worktree <path>` record carries the path; the
     * `HEAD` / `branch` / `bare` records and the empty stanza separators are
     * ignored.
     */
    const prefix = "worktree ";
    return result.stdout
      .split("\0")
      .filter((record) => record.startsWith(prefix))
      .map((record) => record.slice(prefix.length));
  } catch {
    return [];
  }
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
 * Integrate changes the remote has that we don't, so a push isn't rejected
 * when another machine has pushed to the same store since we last synced.
 *
 * Fetches `origin/main` and rebases our local commits on top of it. A failed
 * fetch means the remote branch doesn't exist yet (a fresh repo's first push),
 * in which case there is nothing to integrate and the push will create it. A
 * failed rebase usually means the remote changed the same store file we did;
 * we abort to leave the working tree clean and surface the rebase output so the
 * user can resolve it, rather than leaving a half-finished rebase behind.
 *
 * The local commit already exists at this point, so the recovery is to push it
 * after rebasing manually — not to capture again (an unchanged working tree
 * would short-circuit the next capture before it ever reaches a push).
 *
 * @param dir - Repository directory
 */
async function integrateRemoteChanges(dir: string): Promise<void> {
  const fetchResult = await execa("git", ["fetch", "origin", "main"], {
    cwd: dir,
    reject: false,
  });

  /** No remote `main` yet (or unreachable) — nothing to integrate; let push handle it */
  if (fetchResult.exitCode !== 0) {
    return;
  }

  const rebaseResult = await execa("git", ["rebase", "FETCH_HEAD"], {
    cwd: dir,
    reject: false,
  });

  if (rebaseResult.exitCode !== 0) {
    /** Restore the working tree before surfacing the failure */
    await execa("git", ["rebase", "--abort"], { cwd: dir, reject: false });
    const details = rebaseResult.stderr?.trim();
    throw new Error(
      `Could not rebase the local envi-store onto the latest origin/main` +
        (details ? `: ${details}` : "") +
        `. Resolve it manually in ${dir} (git pull --rebase, fix any conflicts, then git push).`,
    );
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

  /**
   * Integrate remote changes before pushing so a remote that is ahead (e.g.
   * pushed from another machine) doesn't reject our push with "fetch first".
   */
  await integrateRemoteChanges(dir);

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
