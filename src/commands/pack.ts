import { consola } from "consola";
import * as p from "@clack/prompts";
import { readFileSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import clipboard from "clipboardy";
import { stringify } from "maml.js";
import {
  findRepoRoot,
  getErrorMessage,
  findEnvFiles,
  parseEnvFile,
} from "~/utils";
import {
  encrypt,
  formatBlob,
  generateKeyFromManifest,
} from "~/utils/encryption";
import { getManifestFiles, getRedactedVariables } from "~/lib/config";
import { applyRedaction } from "~/utils/redact";

/**
 * Execute the pack command
 *
 * Finds all .env files in repository, encrypts them, and creates a shareable blob
 */
export async function packCommand(): Promise<void> {
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
      consola.error("No .env files found in repository.");
      consola.info("Add some .env files first before packing.");
      process.exit(1);
    }

    consola.success(`Found ${envFilePaths.length} file(s) to pack`);

    /** Parse each env file */
    consola.start("Reading environment files...");
    const envFiles = envFilePaths.map((relativePath) => {
      const absolutePath = join(repoRoot, relativePath);
      const env = parseEnvFile(absolutePath);
      return {
        path: relativePath,
        env,
      };
    });

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
        `⚠ Redacted ${allRedactedKeys.size} variable(s) from blob: ${Array.from(allRedactedKeys).join(", ")}`,
      );
      consola.info("These values will be stored as __envi_redacted__");
    }

    /** Create MAML structure */
    const data = {
      __envi_version: 1,
      metadata: {
        updated_from: repoRoot,
        updated_at: new Date().toISOString(),
      },
      files: redactedEnvFiles,
    };

    const mamlData = stringify(data);

    /** Generate or prompt for encryption key */
    let secret: string;
    let usingManifest = false;
    let manifestFileName: string | null = null;

    // Try to find any manifest file for encryption
    const manifestFiles = getManifestFiles();

    for (const filename of manifestFiles) {
      const manifestPath = join(repoRoot, filename);
      if (existsSync(manifestPath)) {
        const manifestContent = readFileSync(manifestPath, "utf-8");
        secret = generateKeyFromManifest(manifestContent);
        usingManifest = true;
        manifestFileName = filename;
        consola.info(`Using ${filename} for encryption key`);
        consola.warn(
          `Note: Only colleagues with the same ${filename} can decrypt this blob`
        );
        break;
      }
    }

    if (!usingManifest) {
      // No manifest found - prompt for custom secret
      consola.warn("No manifest file found in repository root");
      consola.info("Checked for: " + manifestFiles.slice(0, 5).join(", ") + ", ...");
      consola.info("You'll need to provide a secret for encryption.");

      const secretInput = await p.password({
        message: "Enter an encryption secret:",
        validate: (value) => {
          if (!value || value.length === 0) {
            return "Secret cannot be empty";
          }
          if (value.length < 8) {
            return "Secret should be at least 8 characters for security";
          }
          return undefined;
        },
      });

      if (p.isCancel(secretInput)) {
        consola.info("Operation cancelled.");
        process.exit(0);
      }

      secret = secretInput as string;
      consola.info("Using custom secret for encryption");
    }

    /** Encrypt data */
    consola.start("Encrypting configuration...");
    const encrypted = encrypt(mamlData, secret);

    /** Format as blob */
    const blob = formatBlob(encrypted);

    /** Copy to clipboard */
    consola.start("Copying blob to clipboard...");
    try {
      await clipboard.write(blob);
      consola.success("Blob copied to clipboard!");
    } catch (clipboardError) {
      consola.warn("Failed to copy to clipboard - displaying blob instead");
      consola.box(blob);
    }

    /** Output instructions */
    if (usingManifest) {
      consola.info("\nBlob is now on your clipboard!");
      consola.info(`Share it with colleagues who have the same ${manifestFileName}`);
      consola.info("They can restore it using: envi unpack");
    } else {
      consola.info("\nBlob is now on your clipboard!");
      consola.info("Share the blob and the secret with your colleagues");
      consola.info("They will be prompted for the secret when running: envi unpack");
    }
  } catch (error) {
    consola.error(getErrorMessage(error));
    process.exit(1);
  }
}
