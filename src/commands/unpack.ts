import { consola } from "consola";
import * as p from "@clack/prompts";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
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
  parseEnvFile,
} from "~/utils";
import {
  decrypt,
  generateKeyFromManifest,
  parseBlob,
} from "~/utils/encryption";
import { getManifestFiles } from "~/lib/config";
import { mergeRedactedValues, REDACTED_PLACEHOLDER } from "~/utils/redact";

/**
 * Write env file from parsed object
 *
 * Converts MAML env object back to .env file format, preserving comments
 */
function writeEnvFile(filePath: string, env: Record<string, string>): void {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(env)) {
    /** Handle full-line comments and empty lines */
    if (key.startsWith("__l_")) {
      lines.push(value);
      continue;
    }

    /** Handle inline comments */
    if (key.startsWith("__i_")) {
      /** Store for next key-value pair */
      const nextKey = Object.keys(env)[Object.keys(env).indexOf(key) + 1];
      if (nextKey && !nextKey.startsWith("__")) {
        /** Will be added inline with next value */
        continue;
      }
      /** Orphaned inline comment, add as full line */
      lines.push(value);
      continue;
    }

    /** Regular key-value pair */
    let line = `${key}=${value}`;

    /** Check if there's an inline comment for this key */
    const keyIndex = Object.keys(env).indexOf(key);
    if (keyIndex > 0) {
      const prevKey = Object.keys(env)[keyIndex - 1];
      if (prevKey && prevKey.startsWith("__i_")) {
        const inlineComment = env[prevKey];
        if (inlineComment) {
          line = `${line} ${inlineComment}`;
        }
      }
    }

    lines.push(line);
  }

  /** Ensure directory exists */
  const dir = dirname(filePath);
  mkdirSync(dir, { recursive: true });

  writeFileSync(filePath, lines.join("\n") + "\n", "utf-8");
}

/**
 * Execute the unpack command
 *
 * Decrypts a blob and restores environment files directly to repository
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
      } catch {
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

    /** Try to decrypt with manifest files first, then prompt for secret if needed */
    let decrypted: string | null = null;
    let secret: string;
    let foundManifest: string | null = null;

    // Try to use any manifest file for decryption
    const manifestFiles = getManifestFiles();

    for (const filename of manifestFiles) {
      const manifestPath = join(repoRoot, filename);
      if (existsSync(manifestPath)) {
        consola.info(`Found ${filename} - attempting decryption`);
        try {
          const manifestContent = readFileSync(manifestPath, "utf-8");
          secret = generateKeyFromManifest(manifestContent);

          consola.start("Decrypting configuration...");
          decrypted = decrypt(encryptedData, secret);
          consola.success(`Decryption successful using ${filename}`);
          foundManifest = filename;
          break;
        } catch {
          // Decryption failed with this manifest - try next one
          consola.warn(`Failed to decrypt with ${filename}`);
        }
      }
    }

    // If decryption failed with all manifests, prompt for custom secret
    if (!decrypted) {
      if (!foundManifest) {
        consola.info("No manifest files found in repository");
        consola.info("Checked for: " + manifestFiles.slice(0, 5).join(", ") + ", ...");
      } else {
        consola.info("This blob may have been encrypted with a custom secret");
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
      } catch {
        consola.error("Failed to decrypt blob with provided secret");
        consola.info("This could mean:");
        consola.info("  - The secret is incorrect");
        consola.info("  - The blob is corrupted");
        consola.info("  - The blob was encrypted with a different manifest file");
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

    /** Restore files to repository */
    const shouldRestore = await p.confirm({
      message: "Restore environment files to this repository?",
      initialValue: true,
    });

    if (p.isCancel(shouldRestore)) {
      consola.info("Operation cancelled.");
      process.exit(0);
    }

    if (shouldRestore) {
      /** Track results */
      const restored: string[] = [];
      const skipped: string[] = [];
      const unchanged: string[] = [];
      const mergedRedacted: string[] = [];
      let overwriteAll = false;

      /** Process each file */
      for (const fileEntry of data.files) {
        const targetPath = join(repoRoot, fileEntry.path);
        const fileExists = existsSync(targetPath);

        /** Check if this file has redacted values */
        const hasRedactedValues = Object.values(fileEntry.env).some(
          (value) => value === REDACTED_PLACEHOLDER,
        );

        let envToWrite = fileEntry.env;

        /** If file has redacted values and target exists, merge with existing values */
        if (hasRedactedValues && fileExists) {
          try {
            const existingEnv = parseEnvFile(targetPath);
            envToWrite = mergeRedactedValues(fileEntry.env, existingEnv);
            mergedRedacted.push(fileEntry.path);
          } catch {
            /** If parsing fails, use stored values as-is */
            envToWrite = fileEntry.env;
          }
        }

        if (fileExists) {
          /**
           * Compare by parsing both files and checking if their env objects are
           * identical This handles differences in formatting (quotes, whitespace,
           * etc.)
           */
          try {
            const existingEnv = parseEnvFile(targetPath);

            if (JSON.stringify(existingEnv) === JSON.stringify(envToWrite)) {
              unchanged.push(fileEntry.path);
              continue;
            }
          } catch {
            /** If parsing fails, treat as different and proceed to prompt */
          }

          /** File exists with different content - prompt user */
          if (!overwriteAll) {
            consola.warn(`File exists with different content: ${fileEntry.path}`);

            const action = await p.select({
              message: "What would you like to do?",
              options: [
                { value: "no", label: "No - skip this file" },
                { value: "yes", label: "Yes - overwrite this file" },
                {
                  value: "all",
                  label: "Yes to all - overwrite all remaining files",
                },
              ],
              initialValue: "no",
            });

            if (p.isCancel(action) || action === "no") {
              skipped.push(fileEntry.path);
              continue;
            }

            if (action === "all") {
              overwriteAll = true;
            }
          }

          /** Overwrite the file */
          writeEnvFile(targetPath, envToWrite);
          restored.push(fileEntry.path);
        } else {
          /** File doesn't exist, create it */
          writeEnvFile(targetPath, envToWrite);
          restored.push(fileEntry.path);
        }
      }

      /** Show redacted variable merge info */
      if (mergedRedacted.length > 0) {
        consola.info(
          `\nℹ Preserved redacted variable(s) from existing files in ${mergedRedacted.length} file(s)`,
        );
      }

      /** Show summary */
      consola.success("\n✓ Restore complete!");

      if (restored.length > 0) {
        consola.success(`Restored ${restored.length} file(s):`);
        restored.forEach((path) => consola.info(`  ✓ ${path}`));
      }

      if (unchanged.length > 0) {
        consola.info(`\nSkipped ${unchanged.length} unchanged file(s):`);
        unchanged.forEach((path) => consola.info(`  - ${path}`));
      }

      if (skipped.length > 0) {
        consola.warn(`\nSkipped ${skipped.length} file(s) (user declined):`);
        skipped.forEach((path) => consola.info(`  - ${path}`));
      }
    }

    /** Ask to save to global storage */
    const shouldSave = await p.confirm({
      message: "Save these environment files to global storage?",
      initialValue: false,
    });

    if (p.isCancel(shouldSave)) {
      consola.success("\n✓ Unpack complete!");
      return;
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

    consola.success("\n✓ Unpack complete!");
  } catch (error) {
    consola.error(getErrorMessage(error));
    process.exit(1);
  }
}
