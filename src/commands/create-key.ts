import { consola } from "consola";
import {
  KEY_FILE_NAME,
  generateKey,
  hasKeyFile,
  readEncryptionKey,
  writeEncryptionKey,
} from "~/lib";
import { findRepoRoot, getErrorMessage } from "~/utils";

export interface CreateKeyOptions {
  /** Overwrite an existing encryption_key in envi.config.maml */
  force?: boolean;
}

/**
 * Generate a per-repo encryption key and write it to envi.config.maml (or to
 * the legacy envi.maml if that's the file already on disk).
 *
 * Used to enable encryption-at-rest for `envi capture` / `envi restore`, and
 * preferred over manifest-derived keys by `envi pack` / `envi unpack`.
 */
export async function createKeyCommand(
  options: CreateKeyOptions = {},
): Promise<void> {
  const force = options.force ?? false;
  try {
    consola.start("Finding repository root...");
    const repoRoot = await findRepoRoot();
    if (!repoRoot) {
      consola.info("Operation cancelled.");
      process.exit(0);
    }
    consola.info(`Repository root: ${repoRoot}`);

    if (hasKeyFile(repoRoot) && readEncryptionKey(repoRoot) && !force) {
      consola.error(
        `${KEY_FILE_NAME} already contains an encryption_key. Re-run with --force to replace it.`,
      );
      consola.warn(
        "Replacing the key will make any previously captured stores unreadable until re-captured.",
      );
      process.exit(1);
    }

    const key = generateKey();
    writeEncryptionKey(repoRoot, key, { force });

    consola.success(`Wrote encryption_key to ${KEY_FILE_NAME}`);
    consola.info("");
    consola.info("Next steps:");
    consola.info(`  1. Commit ${KEY_FILE_NAME} so collaborators can decrypt.`);
    consola.info(
      `     Do NOT add ${KEY_FILE_NAME} to .gitignore — it must be tracked.`,
    );
    consola.info(
      "  2. Make sure this repository is private. Anyone with read access",
    );
    consola.info("     can decrypt env values captured with this key.");
    consola.info("  3. Run `envi capture` to write encrypted env values.");
  } catch (error) {
    consola.error(getErrorMessage(error));
    process.exit(1);
  }
}
