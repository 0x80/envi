import { execa } from "execa";

/**
 * Check if GitHub CLI (gh) is installed
 *
 * @returns True if gh is available
 */
export async function isGhInstalled(): Promise<boolean> {
  try {
    await execa("gh", ["--version"]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if user is authenticated with GitHub CLI
 *
 * @returns True if authenticated
 */
export async function isGhAuthenticated(): Promise<boolean> {
  try {
    await execa("gh", ["auth", "status"]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get authenticated GitHub username
 *
 * @returns GitHub username
 */
export async function getGhUsername(): Promise<string> {
  const { stdout } = await execa("gh", ["api", "user", "--jq", ".login"]);
  return stdout.trim();
}

/**
 * Check if a GitHub repository exists for the authenticated user
 *
 * @param name - Repository name
 * @returns True if repository exists
 */
export async function repoExists(name: string): Promise<boolean> {
  try {
    const username = await getGhUsername();
    await execa("gh", ["repo", "view", `${username}/${name}`]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create a private GitHub repository
 *
 * @param name - Repository name
 * @param cwd - Working directory where the repo should be created
 * @returns Repository URL
 */
export async function createPrivateRepo(
  name: string,
  cwd: string,
): Promise<string> {
  await execa(
    "gh",
    [
      "repo",
      "create",
      name,
      "--private",
      "--source=.",
      "--remote=origin",
      "--push",
    ],
    { cwd },
  );

  /** Extract URL from output */
  const username = await getGhUsername();
  return `https://github.com/${username}/${name}`;
}

/**
 * Clone a GitHub repository
 *
 * @param name - Repository name (without username)
 * @param targetDir - Directory to clone into
 */
export async function cloneRepo(
  name: string,
  targetDir: string,
): Promise<void> {
  const username = await getGhUsername();
  await execa("gh", ["repo", "clone", `${username}/${name}`, targetDir]);
}
