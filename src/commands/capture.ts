import { consola } from "consola";
import enquirer from "enquirer";
import { join } from "node:path";
import {
  commitAndPush,
  getEnviDir,
  getPackageName,
  getStorageDir,
  getStorageFilename,
  readConfig,
  saveToStorage,
} from "~/lib";
import {
  findEnvFiles,
  findRepoRoot,
  getErrorMessage,
  parseEnvFile,
} from "~/utils";

const { prompt } = enquirer;

/**
 * Execute the capture command
 *
 * Finds all .env files in the repository, parses them, and saves to storage
 */
export async function captureCommand(): Promise<void> {
  try {
    /** Find repository root */
    consola.start("Finding repository root...");
    const repoRoot = await findRepoRoot();

    if (!repoRoot) {
      consola.info("Operation cancelled.");
      process.exit(0);
    }

    consola.info(`Repository root: ${repoRoot}`);

    /** Check for package.json and warn if missing */
    const packageName = getPackageName(repoRoot);
    if (!packageName) {
      consola.warn(
        "No package.json found or no 'name' field in manifest. Using folder name instead.",
      );
      consola.info(
        "This may cause naming conflicts with similarly named folders.",
      );
      consola.info(
        "Consider adding a 'name' field to package.json for unique identification.",
      );

      const { proceed } = await prompt<{ proceed: boolean }>({
        type: "confirm",
        name: "proceed",
        message: "Continue with folder name?",
        initial: true,
      });

      if (!proceed) {
        consola.info("Operation cancelled.");
        process.exit(0);
      }
    }

    /** Find all env files */
    consola.start("Searching for .env files...");
    const envFilePaths = await findEnvFiles(repoRoot);

    if (envFilePaths.length === 0) {
      consola.warn("No .env files found.");
      return;
    }

    consola.success(`Found ${envFilePaths.length} file(s):`);
    envFilePaths.forEach((path) => consola.info(`  - ${path}`));

    /** Parse each env file */
    consola.start("Parsing files...");
    const envFiles = envFilePaths.map((relativePath) => {
      const absolutePath = join(repoRoot, relativePath);
      const env = parseEnvFile(absolutePath);
      return {
        path: relativePath,
        env,
      };
    });

    /** Save to storage */
    consola.start("Saving to storage...");
    const hasChanges = saveToStorage(repoRoot, envFiles, packageName);

    const storageDir = getStorageDir();
    const filename = getStorageFilename(repoRoot, packageName);
    const storagePath = join(storageDir, filename);

    if (!hasChanges) {
      consola.info(
        "No changes detected - environment files are identical to stored version.",
      );
      consola.info(`Stored at: ${storagePath}`);
      return;
    }

    if (packageName) {
      consola.success(
        `Captured environment files for '${packageName}' to: ${storagePath}`,
      );
    } else {
      consola.success(`Captured environment files to: ${storagePath}`);
    }

    /** Commit and push if version control is enabled */
    const config = readConfig();
    if (config.use_version_control === "github") {
      consola.start("Committing to version control...");
      const commitMessage = packageName
        ? `Update ${packageName} env files`
        : `Update ${filename} env files`;

      try {
        const enviDir = getEnviDir();
        await commitAndPush(enviDir, commitMessage);
        consola.success("Committed and pushed to GitHub");
      } catch (error) {
        consola.warn(`Failed to commit/push: ${getErrorMessage(error)}`);
        consola.info("Your files were still saved locally.");
      }
    }
  } catch (error) {
    consola.error(getErrorMessage(error));
    process.exit(1);
  }
}
