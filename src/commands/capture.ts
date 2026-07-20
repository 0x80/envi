import { consola } from "consola";
import * as p from "@clack/prompts";
import { join } from "node:path";
import {
  commitAndPush,
  findKeyFile,
  getEnviDir,
  getPackageName,
  getRedactedVariables,
  getStorageDir,
  getStorageFilename,
  KEY_FILE_NAME,
  readCapturePatterns,
  readConfig,
  readEncryptionKey,
  saveToStorage,
} from "~/lib";
import {
  findEnvFiles,
  findRepoRoot,
  formatSkippedPreview,
  getErrorMessage,
  readEnvFiles,
} from "~/utils";
import { applyRedaction } from "~/utils/redact";

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

      const proceed = await p.confirm({
        message: "Continue with folder name?",
        initialValue: true,
      });

      if (p.isCancel(proceed) || !proceed) {
        consola.info("Operation cancelled.");
        process.exit(0);
      }
    }

    /** Find all env files */
    consola.start("Searching for env files...");
    const additionalPatterns = readCapturePatterns(repoRoot);
    if (additionalPatterns.length > 0) {
      const keyFilename = findKeyFile(repoRoot) ?? KEY_FILE_NAME;
      consola.info(
        `Using extra capture_patterns from ${keyFilename}: ${additionalPatterns.join(", ")}`,
      );
    }
    const {
      files: envFilePaths,
      excluded,
      skippedNestedVcsRoots,
    } = await findEnvFiles(repoRoot, { additionalPatterns });

    if (excluded.length > 0) {
      consola.info(
        `Skipped ${excluded.length} env file(s) not ignored by git: ${formatSkippedPreview(excluded)}`,
      );
    }

    if (skippedNestedVcsRoots.length > 0) {
      consola.info(
        `Skipped ${skippedNestedVcsRoots.length} env file(s) inside nested repos/worktrees: ${formatSkippedPreview(skippedNestedVcsRoots)}`,
      );
    }

    if (envFilePaths.length === 0) {
      consola.warn("No env files found.");
      return;
    }

    consola.success(`Found ${envFilePaths.length} file(s):`);
    envFilePaths.forEach((path) => consola.info(`  - ${path}`));

    /** Parse each env file, skipping any that became unreadable since discovery */
    consola.start("Parsing files...");
    const { parsed: envFiles, unreadable } = readEnvFiles(
      repoRoot,
      envFilePaths,
    );

    if (unreadable.length > 0) {
      consola.warn(
        `Skipped ${unreadable.length} unreadable env file(s): ${formatSkippedPreview(unreadable)}`,
      );
    }

    if (envFiles.length === 0) {
      consola.warn("No readable env files found.");
      return;
    }

    /** Apply redaction to env files */
    const redactedVariables = getRedactedVariables();
    const allRedactedKeys = new Set<string>();

    const redactedEnvFiles = envFiles.map((file) => {
      const { redacted, redactedKeys } = applyRedaction(
        file.env,
        redactedVariables,
      );
      redactedKeys.forEach((key) => allRedactedKeys.add(key));
      return {
        path: file.path,
        env: redacted,
      };
    });

    if (allRedactedKeys.size > 0) {
      consola.warn(
        `⚠ Redacted ${allRedactedKeys.size} variable(s): ${Array.from(allRedactedKeys).join(", ")}`,
      );
      consola.info("These values will be stored as __envi_redacted__");
    }

    /** Encrypt at rest when the per-repo config supplies an encryption_key */
    const encryptionKey = readEncryptionKey(repoRoot);
    if (encryptionKey) {
      const keyFilename = findKeyFile(repoRoot) ?? KEY_FILE_NAME;
      consola.info(`Encrypting env values with key from ${keyFilename}`);
    }

    consola.start("Saving to storage...");
    const hasChanges = saveToStorage(repoRoot, redactedEnvFiles, packageName, {
      encryptionKey,
    });

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
