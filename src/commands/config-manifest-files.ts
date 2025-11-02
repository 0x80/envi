import { consola } from "consola";
import {
  addToManifestFiles,
  getManifestFiles,
  removeFromManifestFiles,
} from "~/lib";

/**
 * Add a manifest file to the configuration
 */
export async function configManifestFilesAddCommand(
  filename: string,
): Promise<void> {
  const manifestFiles = getManifestFiles();

  if (manifestFiles.includes(filename)) {
    consola.info(`Manifest file '${filename}' is already in the list`);
    return;
  }

  addToManifestFiles(filename);
  consola.success(`Added '${filename}' to manifest files list`);
}

/**
 * Remove a manifest file from the configuration
 */
export async function configManifestFilesRemoveCommand(
  filename: string,
): Promise<void> {
  const removed = removeFromManifestFiles(filename);

  if (!removed) {
    consola.warn(`Manifest file '${filename}' is not in the list`);
    return;
  }

  consola.success(`Removed '${filename}' from manifest files list`);
}

/**
 * List all manifest files in the configuration
 */
export async function configManifestFilesListCommand(): Promise<void> {
  const manifestFiles = getManifestFiles();

  if (manifestFiles.length === 0) {
    consola.info("No manifest files configured");
    return;
  }

  consola.info("Manifest files (in priority order):");
  manifestFiles.forEach((filename) => {
    consola.info(`  • ${filename}`);
  });
}
