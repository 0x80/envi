import { consola } from "consola";
import fg from "fast-glob";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { filterGitIgnoredFiles, isGitRepo, listWorktreePaths } from "~/lib/git";
import { VCS_MARKERS } from "./vcs-markers";
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

/**
 * Built-in capture patterns. Each filename appears as a root-level pattern AND
 * a `**\/` variant so files at any depth match. Users can extend this list via
 * `capture_patterns` in `envi.config.maml`.
 */
const DEFAULT_PATTERNS = [
  ".env",
  ".env.*",
  ".dev.vars",
  ".dev.vars.*",
  "**/.env",
  "**/.env.*",
  "**/.dev.vars",
  "**/.dev.vars.*",
];

/**
 * Expand a user-provided capture pattern.
 *
 * Patterns containing a `/` (including `**\/`) are passed through verbatim —
 * the user is being explicit and we shouldn't second-guess. Patterns without
 * any `/` are duplicated into a root-level entry plus a `**\/<pattern>` entry
 * so a naive `.flaskenv` catches both `./.flaskenv` and `packages/foo/.flaskenv`.
 */
function expandPattern(pattern: string): string[] {
  if (pattern.includes("/")) return [pattern];
  return [pattern, `**/${pattern}`];
}

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
  /**
   * Paths that matched the glob but live inside a nested VCS root (git
   * worktree, submodule, nested clone, jj/hg/svn checkout). These are skipped
   * because nested working trees have their own independent state and must be
   * captured from their own directory. Surfaced separately from `excluded` so
   * the caller can give the user a distinct, accurate reason.
   */
  skippedNestedVcsRoots: string[];
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
 * Resolve a path through symlinks so it can be compared to the realpaths `git
 * worktree list` emits. Falls back to `resolve()` when the path doesn't exist
 * on disk (a worktree git still lists but whose directory was already removed,
 * or the synthetic roots in unit tests) — `resolve()` at least normalizes `.` /
 * `..` and a trailing slash so the comparison stays well-defined.
 */
function toRealPath(path: string): string {
  try {
    return realpathSync(path);
  } catch {
    return resolve(path);
  }
}

/**
 * Partition candidate paths into those that live inside a nested VCS root and
 * those that do not.
 *
 * Two signals classify a candidate as nested, and either is sufficient:
 *
 *  1. **Registered linked worktrees** (`worktreePaths`, from `git worktree
 *     list`, main tree excluded). Authoritative: a candidate under one of these
 *     is skipped even when its `.git` pointer file is momentarily absent, which
 *     is the marker probe's blind spot while git is adding or removing a
 *     worktree.
 *  2. **On-disk VCS markers.** Walks upward from the candidate's parent toward
 *     (but not including) the repo root; if any intermediate directory contains
 *     a marker (`.git`, `.jj`, `.hg`, `.svn`), the candidate is nested. This is
 *     the only signal for the nested working trees `git worktree list` doesn't
 *     know about — submodules, nested clones, and jj/hg/svn checkouts — and the
 *     fallback when git is unavailable.
 *
 * The repo root itself is never classified nested by either signal:
 * `findRepoRoot` may legitimately return a directory without a marker (when the
 * user confirms the "no VCS found" prompt), the main tree is filtered out of
 * `worktreePaths`, and the marker walk terminates before reaching the root.
 *
 * All paths are normalized through `realpathSync` (falling back to `resolve()`
 * when a path can't be resolved), because `git worktree list` reports fully
 * symlink-resolved realpaths. Comparing those against a merely `resolve()`d
 * root would silently fail to match whenever the repo is reached through a
 * symlink — `/tmp` → `/private/tmp` on macOS, or any symlinked checkout — so
 * both sides must be resolved the same way. Normalizing also absorbs a trailing
 * slash on the caller's input, keeping the `dir !== repoRoot` loop guard sound.
 *
 * Per-directory marker check results are memoized so a deeply nested worktree
 * only pays the existsSync cost once per ancestor.
 */
function partitionNestedVcsRoots(
  repoRoot: string,
  candidates: string[],
  worktreePaths: string[] = [],
): { kept: string[]; skipped: string[] } {
  const normalizedRoot = toRealPath(repoRoot);
  const cache = new Map<string, boolean>();

  /**
   * Linked worktrees as absolute, trailing-separator prefixes (the main tree
   * dropped), so `absPath.startsWith(prefix)` matches a candidate inside the
   * worktree without also matching a sibling whose name merely shares a prefix.
   */
  const linkedWorktreePrefixes = worktreePaths
    .map((path) => toRealPath(path))
    .filter((path) => path !== normalizedRoot)
    .map((path) => path + sep);

  function isNestedVcsRoot(dir: string): boolean {
    const cached = cache.get(dir);
    if (cached !== undefined) return cached;
    const result = VCS_MARKERS.some((marker) => existsSync(join(dir, marker)));
    cache.set(dir, result);
    return result;
  }

  const kept: string[] = [];
  const skipped: string[] = [];

  for (const relPath of candidates) {
    const absPath = join(normalizedRoot, relPath);

    let nested = linkedWorktreePrefixes.some((prefix) =>
      absPath.startsWith(prefix),
    );

    if (!nested) {
      let dir = dirname(absPath);
      while (dir !== normalizedRoot && dir !== dirname(dir)) {
        if (isNestedVcsRoot(dir)) {
          nested = true;
          break;
        }
        dir = dirname(dir);
      }
    }

    if (nested) {
      skipped.push(relPath);
    } else {
      kept.push(relPath);
    }
  }

  return { kept, skipped };
}

export interface FindEnvFilesOptions {
  /**
   * Extra capture patterns from `envi.config.maml#capture_patterns`. Bare
   * filenames are auto-expanded to also match nested directories; patterns
   * containing `/` are used verbatim. Merged with the built-in defaults.
   */
  additionalPatterns?: string[];
}

/**
 * Find env files Envi should capture: `.env`, `.env.*`, Cloudflare Workers'
 * `.dev.vars` / `.dev.vars.*` (which use the same key=value format), plus any
 * extra patterns the user has declared in `envi.config.maml`.
 *
 * In a git repository, only files that git considers ignored are returned in
 * `files`. Files that are tracked or otherwise not covered by an ignore rule
 * are placed in `excluded`. Files inside a nested VCS root (worktree,
 * submodule, nested clone) are placed in `skippedNestedVcsRoots` regardless of
 * gitignore status — they belong to an independent working tree. Outside a git
 * repository — or if `git check-ignore` fails (e.g. git binary missing) — all
 * matched files are returned and `excluded` is empty.
 *
 * @param repoRoot - Absolute path to repository root
 * @param options - Optional extra capture patterns
 */
export async function findEnvFiles(
  repoRoot: string,
  options: FindEnvFilesOptions = {},
): Promise<FindEnvFilesResult> {
  const additional = (options.additionalPatterns ?? []).flatMap(expandPattern);
  const patterns = Array.from(new Set([...DEFAULT_PATTERNS, ...additional]));

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
   * Ask git for its registered worktrees so a linked worktree is skipped even
   * when its `.git` pointer is transiently missing (the marker probe's blind
   * spot). Best-effort and only meaningful inside a git repo; empty otherwise,
   * leaving marker-only detection in place.
   */
  const worktreePaths = inGitRepo ? await listWorktreePaths(repoRoot) : [];

  /**
   * Partition candidates that live inside a nested VCS root (git worktree,
   * submodule, nested clone, jj/hg/svn checkout). These are surfaced separately
   * so the caller can tell the user why they were skipped, instead of silently
   * disappearing.
   */
  const { kept: candidates, skipped: skippedNestedVcsRoots } =
    partitionNestedVcsRoots(repoRoot, rawCandidates, worktreePaths);

  if (!inGitRepo) {
    return { files: candidates, excluded: [], skippedNestedVcsRoots };
  }

  let ignored: string[];
  try {
    ignored = await filterGitIgnoredFiles(repoRoot, candidates);
  } catch (error) {
    consola.warn(
      `Could not check gitignore status (${getErrorMessage(error)}). Capturing all matched env files.`,
    );
    return { files: candidates, excluded: [], skippedNestedVcsRoots };
  }

  const ignoredSet = new Set(ignored);
  const excluded = candidates.filter((path) => !ignoredSet.has(path));

  return { files: ignored, excluded, skippedNestedVcsRoots };
}
