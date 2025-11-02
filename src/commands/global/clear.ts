import { consola } from "consola";
import * as p from "@clack/prompts";
import { existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { getEnviDir, getStorageDir } from "~/lib";
import { getErrorMessage } from "~/utils";

/**
 * Execute the global clear command
 *
 * Removes the entire ~/.envi directory including all stored configurations
 */
export async function globalClearCommand(): Promise<void> {
  try {
    const enviDir = getEnviDir();
    const storageDir = getStorageDir();

    /** Check if envi directory exists */
    if (!existsSync(enviDir)) {
      consola.info("No envi directory found.");
      consola.info(`Would have looked at: ${enviDir}`);
      return;
    }

    /** List all stored packages */
    const storedPackages: string[] = [];

    if (existsSync(storageDir)) {
      const readDir = (dir: string, prefix = ""): void => {
        const entries = readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.isDirectory()) {
            /** Scoped package directory (e.g., @org/) */
            readDir(join(dir, entry.name), entry.name + "/");
          } else if (entry.name.endsWith(".maml")) {
            /** Package file */
            const packageName = prefix + entry.name.replace(".maml", "");
            storedPackages.push(packageName);
          }
        }
      };

      readDir(storageDir);
    }

    /** Show what will be deleted */
    consola.info(`The following directory will be deleted: ${enviDir}`);
    consola.info("");

    if (storedPackages.length > 0) {
      consola.info(`Stored configurations (${storedPackages.length}):`);
      storedPackages.forEach((pkg) => consola.info(`  - ${pkg}`));
      consola.info("");
    } else {
      consola.info("No stored configurations found.");
      consola.info("");
    }

    /** Confirm deletion */
    const shouldDelete = await p.confirm({
      message: `Delete the entire envi directory and all stored configurations?`,
      initialValue: false,
    });

    if (p.isCancel(shouldDelete) || !shouldDelete) {
      consola.info("Operation cancelled.");
      return;
    }

    /** Delete the entire directory */
    rmSync(enviDir, { recursive: true, force: true });

    consola.success("Deleted entire envi directory");
    consola.info(
      `Note: If you have GitHub integration enabled, you can restore all data using 'envi global github restore'`
    );
  } catch (error) {
    consola.error(getErrorMessage(error));
    process.exit(1);
  }
}
