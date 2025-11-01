import { join } from "node:path";
import { findRepoRoot } from "../utils/find-repo-root.js";
import { findEnvFiles } from "../utils/find-env-files.js";
import { parseEnvFile } from "../utils/parse-env-file.js";
import {
  saveToStorage,
  getStorageDir,
  getStorageFilename,
} from "../utils/storage.js";
import { getErrorMessage } from "../utils/getErrorMessage.js";

/**
 * Execute the capture command
 *
 * Finds all .env files in the repository, parses them, and saves to storage
 */
export async function captureCommand(): Promise<void> {
  try {
    /** Find repository root */
    console.log("Finding repository root...");
    const repoRoot = await findRepoRoot();

    if (!repoRoot) {
      console.log("Operation cancelled.");
      process.exit(0);
    }

    console.log(`Repository root: ${repoRoot}`);

    /** Find all env files */
    console.log("\nSearching for .env files...");
    const envFilePaths = await findEnvFiles(repoRoot);

    if (envFilePaths.length === 0) {
      console.log("No .env files found.");
      return;
    }

    console.log(`Found ${envFilePaths.length} file(s):`);
    envFilePaths.forEach((path) => console.log(`  - ${path}`));

    /** Parse each env file */
    console.log("\nParsing files...");
    const envFiles = envFilePaths.map((relativePath) => {
      const absolutePath = join(repoRoot, relativePath);
      const env = parseEnvFile(absolutePath);
      return {
        path: relativePath,
        env,
      };
    });

    /** Save to storage */
    console.log("\nSaving to storage...");
    saveToStorage(repoRoot, envFiles);

    const storageDir = getStorageDir();
    const filename = getStorageFilename(repoRoot);
    const storagePath = join(storageDir, filename);

    console.log(`\n✓ Captured environment files to: ${storagePath}`);
  } catch (error) {
    console.error(`Error: ${getErrorMessage(error)}`);
    process.exit(1);
  }
}
