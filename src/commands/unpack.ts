import { consola } from "consola";
import * as p from "@clack/prompts";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "maml.js";
import clipboard from "clipboardy";
import {
  ensureStorageDir,
  getPackageName,
  getStorageDir,
  getStorageFilename,
  type EnviStore,
} from "~/lib";
import {
  findRepoRoot,
  getErrorMessage,
} from "~/utils";
import {
  decrypt,
  generateKeyFromManifest,
  parseBlob,
} from "~/utils/encryption";
import { restoreCommand } from "./restore";

/**
 * Execute the unpack command
 *
 * Decrypts a blob and restores environment configuration
 * Optionally saves to global storage
 */
export async function unpackCommand(blob?: string): Promise<void> {
  try {
    /** Get blob from clipboard if not provided */
    let blobContent = blob;
    if (!blobContent) {
      consola.start("Reading blob from clipboard...");
      try {
        blobContent = await clipboard.read();
        consola.success("Blob loaded from clipboard");
      } catch (clipboardError) {
        consola.error("Failed to read from clipboard");
        consola.info("Please provide the blob as an argument: envi unpack <blob>");
        process.exit(1);
      }
    }

    /** Parse blob format */
    consola.start("Parsing blob...");
    const encryptedData = parseBlob(blobContent);

    if (!encryptedData) {
      consola.error("Invalid blob format");
      consola.info("Expected format:");
      consola.info("__envi_start__");
      consola.info("[encrypted data]");
      consola.info("__envi_end__");
      process.exit(1);
    }

    consola.success("Blob format validated");

    /** Find repository root */
    consola.start("Finding repository root...");
    const repoRoot = await findRepoRoot();

    if (!repoRoot) {
      consola.info("Operation cancelled.");
      process.exit(0);
    }

    consola.info(`Repository root: ${repoRoot}`);

    /** Try to decrypt with package.json first, then prompt for secret if needed */
    let decrypted: string | null = null;
    let secret: string;

    // Try to use package.json for decryption (JavaScript/TypeScript projects)
    const packageJsonPath = join(repoRoot, "package.json");
    if (existsSync(packageJsonPath)) {
      consola.info("Found package.json - attempting decryption");
      try {
        const packageJsonContent = readFileSync(packageJsonPath, "utf-8");
        secret = generateKeyFromManifest(packageJsonContent);

        consola.start("Decrypting configuration...");
        decrypted = decrypt(encryptedData, secret);
        consola.success("Decryption successful using package.json");
      } catch (error) {
        // Decryption failed with package.json - might be using custom secret
        consola.warn("Failed to decrypt with package.json");
        consola.info("This blob may have been encrypted with a custom secret");
      }
    }

    // If decryption failed or no package.json, prompt for custom secret
    if (!decrypted) {
      if (!existsSync(packageJsonPath)) {
        consola.info(
          "No package.json found - this is expected for non-JavaScript/TypeScript projects"
        );
      }

      const secretInput = await p.password({
        message: "Enter the decryption secret:",
        validate: (value) => {
          if (!value || value.length === 0) {
            return "Secret cannot be empty";
          }
          return undefined;
        },
      });

      if (p.isCancel(secretInput)) {
        consola.info("Operation cancelled.");
        process.exit(0);
      }

      secret = secretInput as string;

      consola.start("Decrypting configuration...");
      try {
        decrypted = decrypt(encryptedData, secret);
        consola.success("Decryption successful");
      } catch (error) {
        consola.error("Failed to decrypt blob with provided secret");
        consola.info("This could mean:");
        consola.info("  - The secret is incorrect");
        consola.info("  - The blob is corrupted");
        consola.info("  - The blob was encrypted with a different package.json");
        process.exit(1);
      }
    }

    /** Validate MAML structure */
    consola.start("Validating configuration...");
    let data: EnviStore;
    try {
      data = parse(decrypted) as EnviStore;

      if (data.__envi_version !== 1) {
        throw new Error("Invalid envi version");
      }

      if (!data.files || !Array.isArray(data.files)) {
        throw new Error("Invalid files structure");
      }

      consola.success(`Found ${data.files.length} file(s) in blob`);
    } catch {
      consola.error("Invalid configuration data");
      consola.info("The decrypted data is not a valid envi configuration");
      process.exit(1);
    }

    /** Save to storage */
    const shouldSave = await p.confirm({
      message: "Save this configuration to global storage?",
      initialValue: true,
    });

    if (p.isCancel(shouldSave)) {
      consola.info("Operation cancelled.");
      process.exit(0);
    }

    if (shouldSave) {
      consola.start("Saving to storage...");
      const packageName = getPackageName(repoRoot);
      const storageDir = getStorageDir();
      const filename = getStorageFilename(repoRoot, packageName);
      const storagePath = join(storageDir, filename);

      ensureStorageDir();

      writeFileSync(storagePath, decrypted, "utf-8");

      consola.success(`Saved configuration to: ${storagePath}`);
    }

    /** Restore files */
    const shouldRestore = await p.confirm({
      message: "Restore environment files to this repository now?",
      initialValue: true,
    });

    if (p.isCancel(shouldRestore)) {
      consola.info("Configuration saved but not restored.");
      consola.info("Run 'envi restore' later to restore files.");
      return;
    }

    if (shouldRestore) {
      consola.info("\n");
      await restoreCommand();
    }

    consola.success("\n✓ Unpack complete!");
  } catch (error) {
    consola.error(getErrorMessage(error));
    process.exit(1);
  }
}
