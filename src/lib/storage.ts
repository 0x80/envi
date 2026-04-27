import { homedir } from "node:os";
import { join, basename, dirname } from "node:path";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { parse, stringify } from "maml.js";
import type { EnvObject } from "~/utils/parse-env-file";
import { decrypt, encrypt } from "~/utils/encryption";
import { PACKAGE_EXTRACTORS } from "./package-name-extractors";
import { getManifestFiles } from "./config";

/**
 * One file entry in a stored MAML.
 *
 * Either plaintext (`env`) or encrypted (`encrypted_env`, base64 ciphertext of
 * `JSON.stringify(env)`). The shape is per-entry so a single store can mix
 * encrypted and plaintext entries during a transition.
 */
export type EnviStoreFile =
  | { path: string; env: EnvObject }
  | { path: string; encrypted_env: string };

/** MAML file structure for storing env configurations */
export interface EnviStore {
  __envi_version: number;
  metadata: {
    updated_from: string;
    updated_at: string;
  };
  files: EnviStoreFile[];
}

/** Type guard: is this entry the encrypted variant? */
export function isEncryptedEntry(
  entry: EnviStoreFile,
): entry is { path: string; encrypted_env: string } {
  return "encrypted_env" in entry;
}

/**
 * Get the envi root directory path
 *
 * @returns Absolute path to ~/.envi/
 */
export function getEnviDir(): string {
  return join(homedir(), ".envi");
}

/**
 * Get the envi storage directory path
 *
 * @returns Absolute path to ~/.envi/store/
 */
export function getStorageDir(): string {
  return join(getEnviDir(), "store");
}

/** Ensure the storage directory exists */
export function ensureStorageDir(): void {
  const storageDir = getStorageDir();
  mkdirSync(storageDir, { recursive: true });
}

/**
 * Read package name from manifest files in repository
 *
 * Checks package manifest files in priority order (additional files from config
 * first, then defaults). Supports: package.json, Cargo.toml, go.mod,
 * pyproject.toml, composer.json, pubspec.yaml, settings.gradle.kts,
 * settings.gradle, pom.xml
 *
 * @param repoPath - Absolute path to repository root
 * @returns Package name if found, null otherwise
 */
export function getPackageName(repoPath: string): string | null {
  const filesToCheck = getManifestFiles();

  for (const filename of filesToCheck) {
    const extractor = PACKAGE_EXTRACTORS.find((e) => e.filename === filename);

    if (!extractor) {
      continue; // Skip unknown manifest files
    }

    const packageName = extractor.extract(repoPath);

    if (packageName) {
      return packageName;
    }
  }

  return null;
}

/**
 * Generate storage filename from package name or repository path
 *
 * For scoped packages like @org/name, creates @org/name.maml For unscoped
 * packages, creates name.maml For repos without package.json, falls back to
 * folder name
 *
 * @param repoPath - Absolute path to repository root
 * @param packageName - Optional package name (will be read if not provided)
 * @returns Relative path with .maml extension (may include directory)
 */
export function getStorageFilename(
  repoPath: string,
  packageName?: string | null,
): string {
  const name = packageName ?? getPackageName(repoPath);

  if (name) {
    /** Handle scoped packages like @org/name - keep the @ */
    return `${name}.maml`;
  }

  /** Fall back to folder name */
  const repoName = basename(repoPath);
  return `${repoName}.maml`;
}

/**
 * Compare incoming plaintext file entries against an existing on-disk store.
 *
 * Each encryption produces fresh IVs/salt so ciphertexts always differ — to
 * preserve the "no commit on no-op capture" behaviour we always compare in
 * plaintext space. Encrypted entries in the existing store are decrypted with
 * the provided key for comparison.
 *
 * @returns True if the existing file's `files` are equivalent to the new ones
 */
function isContentIdentical(
  filePath: string,
  newFiles: Array<{ path: string; env: EnvObject }>,
  encryptionKey: string | null,
): boolean {
  if (!existsSync(filePath)) {
    return false;
  }

  try {
    const existingContent = readFileSync(filePath, "utf-8");
    const existingData = parse(existingContent) as EnviStore;

    /**
     * Force a rewrite when the on-disk format doesn't match the format we'd
     * write now. Without this, running `envi create-key` followed by `envi
     * capture` would silently leave the store as plaintext when values happen
     * to be unchanged, which would be a serious foot-gun.
     */
    const willWriteEncrypted = encryptionKey !== null;
    const existingHasEncrypted = existingData.files.some(isEncryptedEntry);
    const existingHasPlaintext = existingData.files.some(
      (entry) => !isEncryptedEntry(entry),
    );
    if (willWriteEncrypted && existingHasPlaintext) return false;
    if (!willWriteEncrypted && existingHasEncrypted) return false;

    const decryptedExisting: Array<{ path: string; env: EnvObject }> = [];
    for (const entry of existingData.files) {
      if (isEncryptedEntry(entry)) {
        if (!encryptionKey) return false;
        const json = decrypt(entry.encrypted_env, encryptionKey);
        decryptedExisting.push({
          path: entry.path,
          env: JSON.parse(json) as EnvObject,
        });
      } else {
        decryptedExisting.push(entry);
      }
    }

    return JSON.stringify(decryptedExisting) === JSON.stringify(newFiles);
  } catch {
    return false;
  }
}

export interface SaveToStorageOptions {
  /**
   * If provided, encrypt each file's `env` block before writing. The same key
   * is used to decrypt any existing encrypted entries for the no-op
   * comparison.
   */
  encryptionKey?: string | null;
}

/**
 * Save env configuration to storage
 *
 * @param repoPath - Absolute path to repository root
 * @param envFiles - Array of plaintext env file data
 * @param packageName - Optional package name (will be read if not provided)
 * @param options - Optional encryption settings
 * @returns True if file was updated, false if no changes
 */
export function saveToStorage(
  repoPath: string,
  envFiles: Array<{ path: string; env: EnvObject }>,
  packageName?: string | null,
  options: SaveToStorageOptions = {},
): boolean {
  ensureStorageDir();

  const encryptionKey = options.encryptionKey ?? null;

  /** Sort files by path for consistent comparison */
  const sortedFiles = [...envFiles].sort((a, b) =>
    a.path.localeCompare(b.path),
  );

  const storageDir = getStorageDir();
  const filename = getStorageFilename(repoPath, packageName);
  const filePath = join(storageDir, filename);

  /**
   * Check if content is identical to existing file (compares in plaintext
   * space)
   */
  if (isContentIdentical(filePath, sortedFiles, encryptionKey)) {
    return false;
  }

  const filesToWrite: EnviStoreFile[] = encryptionKey
    ? sortedFiles.map((file) => ({
        path: file.path,
        encrypted_env: encrypt(JSON.stringify(file.env), encryptionKey),
      }))
    : sortedFiles;

  const data: EnviStore = {
    __envi_version: 1,
    metadata: {
      updated_from: repoPath,
      updated_at: new Date().toISOString(),
    },
    files: filesToWrite,
  };

  /** Ensure subdirectory exists for scoped packages */
  const fileDir = dirname(filePath);
  if (fileDir !== storageDir) {
    mkdirSync(fileDir, { recursive: true });
  }

  const mamlContent = stringify(data);
  writeFileSync(filePath, mamlContent, "utf-8");
  return true;
}
