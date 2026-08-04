import { consola } from "consola";
import fg from "fast-glob";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { filterGitIgnoredFiles, isGitRepo, listWorktreePaths } from "~/lib/git";
import { VCS_MARKERS } from "./vcs-markers";
import { getErrorMessage } from "./get-error-message";

/**
 * Directory names to always skip while globbing (performance, not semantics).
 * Dependency and build-output trees never hold an env file worth capturing, and
 * descending into them is what makes a large monorepo crawl.
 */
const IGNORED_DIRECTORY_NAMES = [
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  ".nuxt",
  "out",
  "target",
  "coverage",
  ".turbo",
];

/**
 * Ignore patterns for the directories above.
 *
 * Each name needs BOTH a root-anchored (`node_modules/**`) and a nested
 * (`**\/node_modules/**`) form: fast-glob anchors every pattern at `cwd`, so
 * `node_modules/**` alone only skips the top-level directory. Without the
 * nested variant the glob descends into every per-package `node_modules` of a
 * workspace and every `dist` of a build — the dominant cost in a monorepo.
 */
const DEFAULT_IGNORE_PATTERNS = IGNORED_DIRECTORY_NAMES.flatMap((name) => [
  `${name}/**`,
  `**/${name}/**`,
]);

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
   * Paths that matched the glob but live inside a nested VCS root (submodule,
   * nested clone, jj/hg/svn checkout, or a git worktree git didn't report).
   * These are skipped because nested working trees have their own independent
   * state and must be captured from their own directory. Surfaced separately
   * from `excluded` so the caller can give the user a distinct, accurate
   * reason.
   *
   * Registered git worktrees normally do **not** appear here — they are pruned
   * before the glob, so they never become candidates. What lands here is the
   * working trees git can't enumerate, which is where a "why did my file
   * vanish?" explanation is actually worth showing.
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

/**
 * Turn linked worktree paths into fast-glob ignore patterns so the glob never
 * descends into them.
 *
 * `partitionNestedVcsRoots` already discards candidates inside a worktree, but
 * it runs *after* the glob has walked them. In a repo that keeps its worktrees
 * under the root (`.worktrees/<branch>/`), that means walking a full checkout —
 * dependency trees included — once per worktree, only to throw every match
 * away. Pruning up front is the difference between traversing one working tree
 * and traversing all of them.
 *
 * Paths that resolve to the repo root itself (the main tree) or that live
 * outside it are dropped: the former would ignore everything, and the latter is
 * unreachable from the glob anyway. Patterns are emitted with posix separators
 * because fast-glob requires them regardless of platform.
 *
 * A worktree path is data, not a pattern, so it is escaped before being spliced
 * into one. Skipping that step is not the harmless lost optimization it looks
 * like: a worktree directory named `feat*` yields `\.worktrees/feat*\/**`, which
 * also swallows the sibling `.worktrees/feat-real` and silently drops a real env
 * file from the capture set. `posix.escapePath` is the deliberate variant — the
 * string has already been joined with `/`, so it is posix by construction on
 * every platform, and the win32 escaper would leave a literal backslash in a
 * filename unescaped.
 */
function toWorktreeIgnorePatterns(
  normalizedRoot: string,
  worktreePaths: string[],
): string[] {
  const patterns: string[] = [];

  for (const worktreePath of worktreePaths) {
    const relativePath = relative(normalizedRoot, toRealPath(worktreePath));
    /** Empty means the main tree */
    if (relativePath === "") continue;
    /**
     * Outside the root. Matching `..` exactly or as a whole leading segment
     * rather than by prefix keeps a legitimately-named directory like
     * `..staging` (which `relative()` returns verbatim) from being mistaken for
     * an escape and losing its pruning.
     */
    if (relativePath === ".." || relativePath.startsWith(`..${sep}`)) continue;
    if (isAbsolute(relativePath)) continue;
    const posixPath = relativePath.split(sep).join("/");
    patterns.push(`${fg.posix.escapePath(posixPath)}/**`);
  }

  return patterns;
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
 * are placed in `excluded`. Files inside a nested VCS root (submodule, nested
 * clone, jj/hg/svn checkout) are placed in `skippedNestedVcsRoots` regardless
 * of gitignore status — they belong to an independent working tree. Files
 * inside a *registered* git worktree appear in no bucket at all: those trees
 * are pruned from the glob up front, so their files are never candidates.
 * Outside a git repository — or if `git check-ignore` fails (e.g. git binary
 * missing) — all matched files are returned and `excluded` is empty.
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

  /**
   * Ask git for its registered worktrees so a linked worktree is skipped even
   * when its `.git` pointer is transiently missing (the marker probe's blind
   * spot). Best-effort and only meaningful inside a git repo; empty otherwise,
   * leaving marker-only detection in place.
   */
  const worktreePathsBeforeGlob = inGitRepo
    ? await listWorktreePaths(repoRoot)
    : [];

  const ignorePatterns = [
    ...DEFAULT_IGNORE_PATTERNS,
    ...toWorktreeIgnorePatterns(toRealPath(repoRoot), worktreePathsBeforeGlob),
    ...(inGitRepo ? [] : parseGitignoreDirsFallback(repoRoot)),
  ];

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
   * Re-read the worktree list now that the walk is done. The snapshot above is
   * taken before the glob because it has to be — it feeds the ignore patterns —
   * but a worktree that git registers *while* the walk is in progress would be
   * missing from it, and a worktree caught mid-add/remove is exactly when its
   * `.git` pointer is absent and the marker probe can't see it either. Reusing
   * only the stale snapshot here would reopen that gap. Both lists are unioned:
   * a worktree that appeared during the walk comes from the fresh list, and one
   * being torn down stays skipped via the stale one, which is the intended
   * behavior for a tree mid-teardown. One extra `git worktree list` is
   * negligible beside the traversal that just ran.
   */
  const worktreePathsAfterGlob = inGitRepo
    ? await listWorktreePaths(repoRoot)
    : [];

  /**
   * Partition candidates that live inside a nested VCS root (git worktree,
   * submodule, nested clone, jj/hg/svn checkout). These are surfaced separately
   * so the caller can tell the user why they were skipped, instead of silently
   * disappearing.
   */
  const { kept: candidates, skipped: skippedNestedVcsRoots } =
    partitionNestedVcsRoots(repoRoot, rawCandidates, [
      ...worktreePathsBeforeGlob,
      ...worktreePathsAfterGlob,
    ]);

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
