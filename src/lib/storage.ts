import { homedir } from "node:os";
import { join, basename, dirname } from "node:path";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { stringify } from "maml.js";
import type { EnvObject } from "../utils/parse-env-file.js";

/** MAML file structure for storing env configurations */
export interface EnviStore {
  __envi_version: number;
  metadata: {
    updated_from: string;
    updated_at: string;
  };
  files: Array<{
    path: string;
    env: EnvObject;
  }>;
}

/**
 * Get the envi storage directory path
 *
 * @returns Absolute path to ~/.envi/store/
 */
export function getStorageDir(): string {
  return join(homedir(), ".envi", "store");
}

/** Ensure the storage directory exists */
export function ensureStorageDir(): void {
  const storageDir = getStorageDir();
  mkdirSync(storageDir, { recursive: true });
}

/**
 * Read package name from package.json in repository
 *
 * @param repoPath - Absolute path to repository root
 * @returns Package name if found, null otherwise
 */
export function getPackageName(repoPath: string): string | null {
  const manifestPath = join(repoPath, "package.json");

  if (!existsSync(manifestPath)) {
    return null;
  }

  try {
    const content = readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(content);
    return manifest.name || null;
  } catch {
    return null;
  }
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
 * Save env configuration to storage
 *
 * @param repoPath - Absolute path to repository root
 * @param envFiles - Array of env file data
 * @param packageName - Optional package name (will be read if not provided)
 */
export function saveToStorage(
  repoPath: string,
  envFiles: Array<{ path: string; env: EnvObject }>,
  packageName?: string | null,
): void {
  ensureStorageDir();

  const data: EnviStore = {
    __envi_version: 1,
    metadata: {
      updated_from: repoPath,
      updated_at: new Date().toISOString(),
    },
    files: envFiles,
  };

  const storageDir = getStorageDir();
  const filename = getStorageFilename(repoPath, packageName);
  const filePath = join(storageDir, filename);

  /** Ensure subdirectory exists for scoped packages */
  const fileDir = dirname(filePath);
  if (fileDir !== storageDir) {
    mkdirSync(fileDir, { recursive: true });
  }

  const mamlContent = stringify(data);
  writeFileSync(filePath, mamlContent, "utf-8");
}
