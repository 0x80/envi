import { consola } from "consola";
import * as p from "@clack/prompts";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
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

    /** Create MAML structure */
    const data = {
      __envi_version: 1,
      metadata: {
        updated_from: repoRoot,
        updated_at: new Date().toISOString(),
      },
      files: envFiles,
    };

    const mamlData = stringify(data);

    /** Generate or prompt for encryption key */
    let secret: string;
    let usingManifest = false;

    // Try to use package.json for encryption (JavaScript/TypeScript projects)
    const packageJsonPath = join(repoRoot, "package.json");
    if (existsSync(packageJsonPath)) {
      const packageJsonContent = readFileSync(packageJsonPath, "utf-8");
      secret = generateKeyFromManifest(packageJsonContent);
      usingManifest = true;
      consola.info("Using package.json for encryption key");
      consola.warn(
        "Note: Only colleagues with the same package.json can decrypt this blob"
      );
    } else {
      // No package.json - prompt for custom secret
      consola.warn("No package.json found in repository root");
      consola.info(
        "This is expected for non-JavaScript/TypeScript projects."
      );
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
      consola.info("Share it with colleagues who have the same package.json");
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
