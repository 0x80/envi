import fg from "fast-glob";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { filterGitIgnoredFiles, isGitRepo } from "~/lib/git";

/**
 * Default directories to always skip while globbing (performance, not
 * semantics)
 */
const DEFAULT_IGNORE_PATTERNS = [
  "node_modules/**",
  ".git/**",
  "dist/**",
  "build/**",
  ".next/**",
  ".nuxt/**",
  "out/**",
  "target/**",
  "coverage/**",
  ".turbo/**",
];

export interface FindEnvFilesResult {
  /** Paths (relative to repo root) Envi should capture */
  files: string[];
  /**
   * Paths that matched the glob but are tracked by git (or otherwise not
   * ignored). They are excluded from `files` because committing them to the
   * Envi store would shadow the version-controlled copy.
   */
  skippedTracked: string[];
}

/**
 * Parse a root `.gitignore` for top-level directory patterns only
 *
 * Used as a best-effort fallback when the project is not a git repo, so the
 * glob does not descend into directories the user has marked as ignored (e.g.
 * custom build outputs). File-level patterns are skipped because we still want
 * to discover `.env` files that match them.
 */
function parseGitignoreDirsFallback(repoRoot: string): string[] {
  const gitignorePath = join(repoRoot, ".gitignore");
  if (!existsSync(gitignorePath)) {
    return [];
  }

  try {
    const lines = readFileSync(gitignorePath, "utf-8").split("\n");
    const patterns: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === "" || trimmed.startsWith("#")) continue;
      if (trimmed.includes(".")) continue;

      let pattern = trimmed;
      if (pattern.startsWith("/")) {
        pattern = pattern.substring(1);
      } else {
        pattern = `**/${pattern}`;
      }
      if (!pattern.endsWith("/**")) {
        pattern = `${pattern}/**`;
      }
      patterns.push(pattern);
    }

    return patterns;
  } catch {
    return [];
  }
}

/**
 * Find `.env` and `.env.*` files Envi should capture.
 *
 * In a git repository, only files that git considers ignored are returned.
 * Tracked files (including those added with `git add -f`) are placed in
 * `skippedTracked` so the caller can surface them. Outside a git repository,
 * all matched files are returned.
 *
 * @param repoRoot - Absolute path to repository root
 */
export async function findEnvFiles(
  repoRoot: string,
): Promise<FindEnvFilesResult> {
  const patterns = [".env", ".env.*", "**/.env", "**/.env.*"];

  const inGitRepo = isGitRepo(repoRoot);
  const ignorePatterns = inGitRepo
    ? DEFAULT_IGNORE_PATTERNS
    : [...DEFAULT_IGNORE_PATTERNS, ...parseGitignoreDirsFallback(repoRoot)];

  const candidates = await fg(patterns, {
    cwd: repoRoot,
    dot: true,
    absolute: false,
    ignore: ignorePatterns,
  });

  if (!inGitRepo) {
    return { files: candidates, skippedTracked: [] };
  }

  const ignored = await filterGitIgnoredFiles(repoRoot, candidates);
  const ignoredSet = new Set(ignored);
  const skippedTracked = candidates.filter((path) => !ignoredSet.has(path));

  return { files: ignored, skippedTracked };
}
