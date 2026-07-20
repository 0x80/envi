import { consola } from "consola";
import { join } from "node:path";
import { getErrorMessage } from "./get-error-message";
import { parseEnvFile, type EnvObject } from "./parse-env-file";

/** One successfully parsed env file, keyed by its repo-relative path. */
export interface ParsedEnvFile {
  path: string;
  env: EnvObject;
}

export interface ReadEnvFilesResult {
  /** Files that parsed successfully, in input order. */
  parsed: ParsedEnvFile[];
  /**
   * Repo-relative paths that were discovered but could not be read. Surfaced
   * separately so the command can report a count without the specifics
   * aborting the run.
   */
  unreadable: string[];
}

/**
 * Parse each discovered env file, tolerating individual files that cannot be
 * read.
 *
 * `findEnvFiles` returns candidates from a directory glob, but a candidate can
 * stop being readable between that glob and this read: a dangling symlink, a
 * permissions change, or — the case this guards against — a git worktree being
 * torn down by a concurrent process mid-scan, so its files are enumerated and
 * then deleted before the parse reaches them. A bare `parseEnvFile` throws
 * `ENOENT` there and takes the whole capture/pack down with it; skipping the
 * offending file and continuing keeps one unreadable path from aborting a run
 * that has dozens of perfectly good ones.
 *
 * The per-file reason is emitted at debug level rather than swallowed, so a
 * genuine permissions problem is still recoverable from a verbose run; the
 * caller reports the count at a more visible level.
 *
 * @param repoRoot - Absolute path to the repository root
 * @param relativePaths - Repo-relative paths to parse
 */
export function readEnvFiles(
  repoRoot: string,
  relativePaths: string[],
): ReadEnvFilesResult {
  const parsed: ParsedEnvFile[] = [];
  const unreadable: string[] = [];

  for (const path of relativePaths) {
    try {
      parsed.push({ path, env: parseEnvFile(join(repoRoot, path)) });
    } catch (error) {
      unreadable.push(path);
      consola.debug(`Could not read ${path}: ${getErrorMessage(error)}`);
    }
  }

  return { parsed, unreadable };
}
