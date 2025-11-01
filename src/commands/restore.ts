import { consola } from "consola";
import * as p from "@clack/prompts";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { parse } from "maml.js";
import { getPackageName, getStorageDir, getStorageFilename } from "~/lib";
import type { EnviStore } from "~/lib";
import { findRepoRoot, getErrorMessage, parseEnvFile } from "~/utils";

/**
 * Write env file from parsed object
 *
 * Converts MAML env object back to .env file format, preserving comments
 *
 * @param filePath - Absolute path to write to
 * @param env - Env object with comments
 */
function writeEnvFile(filePath: string, env: Record<string, string>): void {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(env)) {
    /** Handle full-line comments */
    if (key.startsWith("__c")) {
      lines.push(value);
      continue;
    }

    /** Handle inline comments */
    if (key.startsWith("__i")) {
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
      if (prevKey && prevKey.startsWith("__i")) {
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
 * Execute the restore command
 *
 * Restores env files from storage into the repository
 */
export async function restoreCommand(): Promise<void> {
  try {
    /** Find repository root */
    consola.start("Finding repository root...");
    const repoRoot = await findRepoRoot();

    if (!repoRoot) {
      consola.info("Operation cancelled.");
      process.exit(0);
    }

    consola.info(`Repository root: ${repoRoot}`);

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
    consola.start(`Looking for stored configuration at: ${storagePath}`);
    if (!existsSync(storagePath)) {
      consola.error("No stored configuration found for this repository.");
      consola.info("\nRun 'envi capture' first to capture env files.");
      process.exit(1);
    }

    /** Load stored configuration */
    consola.success("Found stored configuration");
    const fileContent = readFileSync(storagePath, "utf-8");
    const data = parse(fileContent) as EnviStore;

    if (!data.files || data.files.length === 0) {
      consola.warn("No files found in stored configuration.");
      return;
    }

    consola.success(`Found ${data.files.length} file(s) to restore`);

    /** Track results */
    const restored: string[] = [];
    const skipped: string[] = [];
    const unchanged: string[] = [];
    let overwriteAll = false;

    /** Process each file */
    for (const fileEntry of data.files) {
      const targetPath = join(repoRoot, fileEntry.path);
      const fileExists = existsSync(targetPath);

      if (fileExists) {
        /**
         * Compare by parsing both files and checking if their env objects are
         * identical This handles differences in formatting (quotes, whitespace,
         * etc.)
         */
        try {
          const existingEnv = parseEnvFile(targetPath);
          const storedEnv = fileEntry.env;

          if (JSON.stringify(existingEnv) === JSON.stringify(storedEnv)) {
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
        writeEnvFile(targetPath, fileEntry.env);
        restored.push(fileEntry.path);
      } else {
        /** File doesn't exist, create it */
        writeEnvFile(targetPath, fileEntry.env);
        restored.push(fileEntry.path);
      }
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
  } catch (error) {
    consola.error(getErrorMessage(error));
    process.exit(1);
  }
}
