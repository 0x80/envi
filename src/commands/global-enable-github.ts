import { consola } from "consola";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  createInitialCommit,
  createPrivateRepo,
  getEnviDir,
  getGhUsername,
  initGitRepo,
  isGhAuthenticated,
  isGhInstalled,
  isGitRepo,
  updateConfig,
} from "../lib/index.js";
import { getErrorMessage } from "../utils/index.js";

/**
 * Execute the global enable github command
 *
 * Sets up GitHub version control for the envi store
 */
export async function globalEnableGithubCommand(): Promise<void> {
  try {
    const enviDir = getEnviDir();

    consola.start("Checking envi directory...");

    /** Initialize git repo if needed */
    if (!isGitRepo(enviDir)) {
      consola.info("Initializing git repository...");
      await initGitRepo(enviDir);
      consola.success("Git repository initialized");
    } else {
      consola.success("Already a git repository");
    }

    /** Create README if it doesn't exist */
    const readmePath = join(enviDir, "README.md");
    const readmeContent = `# Envi Store

This repository contains captured environment file configurations managed by [envi](https://github.com/codecompose/envi).

## Structure

- Files are stored in the \`store/\` directory
- Each file is named after the package (e.g., \`@org/package.maml\`)
- Scoped packages create subdirectories (e.g., \`store/@org/package.maml\`)
- Files are in [MAML](https://maml.dev) format for easy reading and version control

## Security

⚠️ **IMPORTANT**: This repository should be PRIVATE as it contains environment variable configurations.

Never share this repository publicly or with unauthorized users.
`;

    writeFileSync(readmePath, readmeContent, "utf-8");

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

    /** Create initial commit before creating GitHub repo */
    consola.start("Creating initial commit...");
    await createInitialCommit(enviDir);
    consola.success("Initial commit created");

    /** Create GitHub repository - this will add remote and push */
    consola.start("Creating private GitHub repository...");
    const repoUrl = await createPrivateRepo("envi-store", enviDir);
    consola.success(`Repository created and pushed: ${repoUrl}`);

    /** Update config */
    consola.start("Updating configuration...");
    updateConfig({ use_version_control: "github" });
    consola.success("GitHub version control enabled");

    consola.success(
      "\n✓ GitHub integration enabled! Future captures will be automatically committed and pushed.",
    );
  } catch (error) {
    consola.error(getErrorMessage(error));
    process.exit(1);
  }
}
