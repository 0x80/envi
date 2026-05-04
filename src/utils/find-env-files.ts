import { consola } from "consola";
import fg from "fast-glob";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { filterGitIgnoredFiles, isGitRepo } from "~/lib/git";
import { VCS_MARKERS } from "./find-repo-root";
import { getErrorMessage } from "./get-error-message";

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
   * Paths that matched the glob but are not gitignored — either tracked or
   * simply not covered by any ignore rule. They are excluded from `files`
   * because committing them to the Envi store would shadow the
   * version-controlled copy or capture a file the user is about to add.
   */
  excluded: string[];
}

/**
 * Parse a root `.gitignore` for directory ignore patterns
 *
 * Used as a best-effort fallback when the project is not a git repo (or `git
 * check-ignore` fails) so the glob does not descend into directories the user
 * has marked as ignored — `.cache/`, `.turbo/`, custom build outputs, etc.
 * Negation and glob patterns are skipped because they need a full ignore engine
 * to honor correctly.
 *
 * Plain entries are treated as directory patterns. That is safe even if a
 * user's `.gitignore` line refers to a file, because the resulting `**\/foo/**`
 * pattern only matches paths nested inside a `foo` dir, not a file named
 * `foo`.
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
      /** Skip negations — would need a real ignore engine to honor */
      if (trimmed.startsWith("!")) continue;
      /** Skip glob patterns — different transform and risk of false positives */
      if (/[*?[\]]/.test(trimmed)) continue;

      let pattern = trimmed;
      if (pattern.endsWith("/")) {
        pattern = pattern.slice(0, -1);
      }
      if (pattern.startsWith("/")) {
        pattern = pattern.substring(1);
      } else {
        pattern = `**/${pattern}`;
      }
      patterns.push(`${pattern}/**`);
    }

    return patterns;
  } catch {
    return [];
  }
}

/**
 * Filter out candidate paths that live inside a nested VCS root.
 *
 * For each candidate, walks upward from its parent directory toward (but not
 * including) the repo root. If any intermediate directory contains a VCS marker
 * (`.git`, `.jj`, `.hg`, `.svn`), the candidate is rejected. The repo root
 * itself always has a marker; that's the whole point of being the root, so it
 * is never considered.
 *
 * Per-directory check results are memoized so a deeply nested worktree only
 * pays the existsSync cost once per ancestor.
 */
function filterNestedVcsRoots(
  repoRoot: string,
  candidates: string[],
): string[] {
  const cache = new Map<string, boolean>();

  function isNestedVcsRoot(dir: string): boolean {
    const cached = cache.get(dir);
    if (cached !== undefined) return cached;
    const result = VCS_MARKERS.some((marker) => existsSync(join(dir, marker)));
    cache.set(dir, result);
    return result;
  }

  return candidates.filter((relPath) => {
    let dir = dirname(join(repoRoot, relPath));
    while (dir !== repoRoot && dir !== dirname(dir)) {
      if (isNestedVcsRoot(dir)) return false;
      dir = dirname(dir);
    }
    return true;
  });
}

/**
 * Find env files Envi should capture: `.env`, `.env.*`, and Cloudflare
 * Workers' `.dev.vars` / `.dev.vars.*` (which use the same key=value format).
 *
 * In a git repository, only files that git considers ignored are returned.
 * Files that are tracked or otherwise not covered by an ignore rule are placed
 * in `excluded` so the caller can surface them. Outside a git repository — or
 * if `git check-ignore` fails (e.g. git binary missing) — all matched files are
 * returned and `excluded` is empty.
 *
 * @param repoRoot - Absolute path to repository root
 */
export async function findEnvFiles(
  repoRoot: string,
): Promise<FindEnvFilesResult> {
  const patterns = [
    ".env",
    ".env.*",
    ".dev.vars",
    ".dev.vars.*",
    "**/.env",
    "**/.env.*",
    "**/.dev.vars",
    "**/.dev.vars.*",
  ];

  const inGitRepo = isGitRepo(repoRoot);
  const ignorePatterns = inGitRepo
    ? DEFAULT_IGNORE_PATTERNS
    : [...DEFAULT_IGNORE_PATTERNS, ...parseGitignoreDirsFallback(repoRoot)];

  const rawCandidates = await fg(patterns, {
    cwd: repoRoot,
    dot: true,
    absolute: false,
    ignore: ignorePatterns,
    /**
     * Don't follow symlinks. pnpm's workspace links would otherwise produce
     * phantom paths under `node_modules/.pnpm/...` and break `git check-ignore`
     * with "beyond a symbolic link".
     */
    followSymbolicLinks: false,
  });

  /**
   * Drop any candidate that lives inside a nested VCS root (git worktree,
   * submodule, nested clone, jj/hg/svn checkout). These are independent working
   * trees with their own state and must be captured from their own directory.
   */
  const candidates = filterNestedVcsRoots(repoRoot, rawCandidates);

  if (!inGitRepo) {
    return { files: candidates, excluded: [] };
  }

  let ignored: string[];
  try {
    ignored = await filterGitIgnoredFiles(repoRoot, candidates);
  } catch (error) {
    consola.warn(
      `Could not check gitignore status (${getErrorMessage(error)}). Capturing all matched env files.`,
    );
    return { files: candidates, excluded: [] };
  }

  const ignoredSet = new Set(ignored);
  const excluded = candidates.filter((path) => !ignoredSet.has(path));

  return { files: ignored, excluded };
}
