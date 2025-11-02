import { consola } from "consola";
import * as p from "@clack/prompts";
import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { getPackageName, getStorageDir, getStorageFilename } from "~/lib";
import { findRepoRoot, getErrorMessage } from "~/utils";

/**
 * Execute the clear command
 *
 * Removes the stored configuration for the current repository
 */
export async function clearCommand(): Promise<void> {
  try {
    /** Find repository root */
    consola.start("Finding project root...");
    const repoRoot = await findRepoRoot();

    if (!repoRoot) {
      consola.info("Operation cancelled.");
      process.exit(0);
    }

    consola.info(`Project root: ${repoRoot}`);

    /** Get package name */
    const packageName = getPackageName(repoRoot);

    if (packageName) {
      consola.info(`Package name: ${packageName}`);
    } else {
      consola.info(`Using folder name: ${repoRoot.split("/").pop()}`);
    }

    const storageDir = getStorageDir();
    const filename = getStorageFilename(repoRoot, packageName);
    const storagePath = join(storageDir, filename);

    /** Check if stored config exists */
    if (!existsSync(storagePath)) {
      consola.warn("No stored configuration found for this repository.");
      consola.info(`Would have looked at: ${storagePath}`);
      return;
    }

    consola.info(`Found stored configuration at: ${storagePath}`);

    /** Confirm deletion */
    const shouldDelete = await p.confirm({
      message: `Delete stored configuration for this repository?`,
      initialValue: false,
    });

    if (p.isCancel(shouldDelete) || !shouldDelete) {
      consola.info("Operation cancelled.");
      return;
    }

    /** Delete the file */
    unlinkSync(storagePath);

    consola.success(`Deleted stored configuration for this repository`);
    consola.info(
      `Note: If you have GitHub integration enabled, you can restore this data using 'envi global github restore'`
    );
  } catch (error) {
    consola.error(getErrorMessage(error));
    process.exit(1);
  }
}
