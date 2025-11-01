import { homedir } from "node:os";
import { join, basename } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { stringify } from "maml.js";
import type { EnvObject } from "./parse-env-file.js";

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
 * Generate filename from repository path
 *
 * @param repoPath - Absolute path to repository root
 * @returns Filename with .maml extension
 */
export function getStorageFilename(repoPath: string): string {
  const repoName = basename(repoPath);
  return `${repoName}.maml`;
}

/**
 * Save env configuration to storage
 *
 * @param repoPath - Absolute path to repository root
 * @param envFiles - Array of env file data
 */
export function saveToStorage(
  repoPath: string,
  envFiles: Array<{ path: string; env: EnvObject }>,
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
  const filename = getStorageFilename(repoPath);
  const filePath = join(storageDir, filename);

  const mamlContent = stringify(data);
  writeFileSync(filePath, mamlContent, "utf-8");
}
