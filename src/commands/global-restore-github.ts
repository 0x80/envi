import { consola } from "consola";
import enquirer from "enquirer";
import { existsSync, readdirSync, rmSync } from "node:fs";
import {
  cloneRepo,
  getEnviDir,
  getGhUsername,
  isGhAuthenticated,
  isGhInstalled,
  repoExists,
  updateConfig,
} from "../lib/index.js";
import { getErrorMessage } from "../utils/index.js";

const { prompt } = enquirer;

/**
 * Check if envi directory has content
 *
 * @param enviDir - Path to envi directory
 * @returns True if directory exists and has files
 */
function hasContent(enviDir: string): boolean {
  if (!existsSync(enviDir)) {
    return false;
  }

  try {
    const files = readdirSync(enviDir);
    /** Ignore .DS_Store and .git */
    const contentFiles = files.filter((f) => f !== ".DS_Store" && f !== ".git");
    return contentFiles.length > 0;
  } catch {
    return false;
  }
}

/**
 * Execute the global restore github command
 *
 * Restores the envi store from GitHub
 */
export async function globalRestoreGithubCommand(): Promise<void> {
  try {
    const enviDir = getEnviDir();

    /** Check for gh CLI */
    consola.start("Checking GitHub CLI...");
    const ghInstalled = await isGhInstalled();

    if (!ghInstalled) {
      consola.error("GitHub CLI (gh) is not installed.");
      consola.info("\nTo install GitHub CLI:");
      consola.info("  macOS:   brew install gh");
      consola.info("  Linux:   See https://github.com/cli/cli#installation");
      consola.info("  Windows: See https://github.com/cli/cli#installation");
      process.exit(1);
    }

    consola.success("GitHub CLI is installed");

    /** Check authentication */
    consola.start("Checking GitHub authentication...");
    const authenticated = await isGhAuthenticated();

    if (!authenticated) {
      consola.error("Not authenticated with GitHub CLI.");
      consola.info("\nTo authenticate, run:");
      consola.info("  gh auth login");
      process.exit(1);
    }

    const username = await getGhUsername();
    consola.success(`Authenticated as: ${username}`);

    /** Check if envi-store repository exists */
    consola.start("Checking for envi-store repository...");
    const exists = await repoExists("envi-store");

    if (!exists) {
      consola.error(`Repository '${username}/envi-store' does not exist.`);
      consola.info("\nTo create it, run:");
      consola.info("  envi global enable github");
      process.exit(1);
    }

    consola.success("Repository found");

    /** Check if local envi directory has content */
    if (hasContent(enviDir)) {
      consola.warn(
        "Your local ~/.envi directory contains existing files and configuration.",
      );
      consola.warn(
        "Restoring from GitHub will overwrite all local files with the repository contents.",
      );

      const { proceed } = await prompt<{ proceed: boolean }>({
        type: "confirm",
        name: "proceed",
        message: "Overwrite local envi directory with GitHub repository?",
        initial: false,
      });

      if (!proceed) {
        consola.info("Operation cancelled.");
        process.exit(0);
      }

      /** Remove existing directory */
      consola.start("Removing existing envi directory...");
      rmSync(enviDir, { recursive: true, force: true });
      consola.success("Existing directory removed");
    }

    /** Clone repository */
    consola.start("Cloning envi-store from GitHub...");
    await cloneRepo("envi-store", enviDir);
    consola.success("Repository cloned");

    /** Update config to enable version control */
    consola.start("Updating configuration...");
    updateConfig({ use_version_control: "github" });
    consola.success("GitHub version control enabled");

    consola.success(
      "\n✓ Successfully restored envi store from GitHub! Future captures will be automatically committed and pushed.",
    );
  } catch (error) {
    consola.error(getErrorMessage(error));
    process.exit(1);
  }
}
