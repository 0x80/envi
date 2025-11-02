import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import * as p from "@clack/prompts";

/** VCS markers that indicate a repository root */
const VCS_MARKERS = [".git", ".jj", ".hg", ".svn"];

/** Check if a directory contains any VCS markers */
function hasVcsMarker(dir: string): boolean {
  return VCS_MARKERS.some((marker) => existsSync(join(dir, marker)));
}

/**
 * Find the repository root by traversing up the directory tree
 *
 * @param startDir - Directory to start searching from (defaults to cwd)
 * @returns Absolute path to repository root, or null if user declined
 */
export async function findRepoRoot(
  startDir: string = process.cwd(),
): Promise<string | null> {
  let currentDir = startDir;
  let previousDir = "";

  /** Traverse up the directory tree */
  while (currentDir !== previousDir) {
    if (hasVcsMarker(currentDir)) {
      return currentDir;
    }

    previousDir = currentDir;
    currentDir = dirname(currentDir);
  }

  /** No VCS root found, prompt user */
  const proceed = await p.confirm({
    message: `No version control system found. Execute in current directory (${startDir})?`,
    initialValue: false,
  });

  if (p.isCancel(proceed)) {
    return null;
  }

  return proceed ? startDir : null;
}
