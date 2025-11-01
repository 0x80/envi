import fg from "fast-glob";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** Default directories to always ignore */
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
 * Parse .gitignore file and return directory ignore patterns
 *
 * Only returns directory patterns, not file patterns, since we want to find env
 * files even if they're in .gitignore
 *
 * @param repoRoot - Absolute path to repository root
 * @returns Array of directory ignore patterns from .gitignore
 */
function parseGitignore(repoRoot: string): string[] {
  const gitignorePath = join(repoRoot, ".gitignore");

  if (!existsSync(gitignorePath)) {
    return [];
  }

  try {
    const gitignoreContent = readFileSync(gitignorePath, "utf-8");
    const lines = gitignoreContent.split("\n");
    const patterns: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      /** Skip empty lines and comments */
      if (trimmed === "" || trimmed.startsWith("#")) {
        continue;
      }

      /**
       * Skip file patterns (containing dots like .env or .env.*) We only want
       * directory patterns to avoid searching in ignored directories
       */
      if (trimmed.includes(".")) {
        continue;
      }

      /** Convert gitignore patterns to glob patterns */
      let pattern = trimmed;

      /** If pattern doesn't start with /, it applies to all directories */
      if (!pattern.startsWith("/")) {
        pattern = `**/${pattern}`;
      } else {
        pattern = pattern.substring(1); // Remove leading /
      }

      /** Ensure directory patterns have /** */
      if (!pattern.endsWith("/**")) {
        pattern = `${pattern}/**`;
      }

      patterns.push(pattern);
    }

    return patterns;
  } catch {
    /** If reading .gitignore fails, return empty array */
    return [];
  }
}

/**
 * Find all .env files in a directory
 *
 * Matches:
 *
 * - `.env` (exact match)
 * - `.env.*` (anything starting with .env. like .env.local, .env.production)
 *
 * Respects .gitignore if present, otherwise uses default ignore list
 *
 * @param repoRoot - Absolute path to repository root
 * @returns Array of relative paths from repo root
 */
export async function findEnvFiles(repoRoot: string): Promise<string[]> {
  const patterns = [
    ".env", // Exact match for .env in root
    ".env.*", // Match .env.* in root
    "**/.env", // Exact match for .env in subdirectories
    "**/.env.*", // Match .env.* in subdirectories
  ];

  /** Get gitignore patterns */
  const gitignorePatterns = parseGitignore(repoRoot);

  /** Combine default ignore patterns with gitignore patterns */
  const ignorePatterns = [...DEFAULT_IGNORE_PATTERNS, ...gitignorePatterns];

  const files = await fg(patterns, {
    cwd: repoRoot,
    dot: true, // Include dotfiles
    absolute: false, // Return relative paths
    ignore: ignorePatterns,
  });

  return files;
}
