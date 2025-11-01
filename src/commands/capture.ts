import { consola } from "consola";
import { join } from "node:path";
import {
  getStorageDir,
  getStorageFilename,
  saveToStorage,
} from "../lib/index.js";
import {
  findEnvFiles,
  findRepoRoot,
  getErrorMessage,
  parseEnvFile,
} from "../utils/index.js";

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
    saveToStorage(repoRoot, envFiles);

    const storageDir = getStorageDir();
    const filename = getStorageFilename(repoRoot);
    const storagePath = join(storageDir, filename);

    consola.success(`Captured environment files to: ${storagePath}`);
  } catch (error) {
    consola.error(getErrorMessage(error));
    process.exit(1);
  }
}
