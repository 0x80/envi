import fg from "fast-glob";

/**
 * Find all .env files in a directory
 *
 * Matches:
 *
 * - `.env` (exact match)
 * - `.env.*` (anything starting with .env. like .env.local, .env.production)
 *
 * @param repoRoot - Absolute path to repository root
 * @returns Array of relative paths from repo root
 */
export async function findEnvFiles(repoRoot: string): Promise<string[]> {
  const patterns = [
    ".env", // Exact match for .env
    ".env.*", // Match .env.local, .env.production, etc.
  ];

  const files = await fg(patterns, {
    cwd: repoRoot,
    dot: true, // Include dotfiles
    absolute: false, // Return relative paths
    ignore: ["node_modules/**", ".git/**"], // Ignore common directories
  });

  return files;
}
