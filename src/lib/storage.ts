import { homedir } from "node:os";
import { join, basename, dirname } from "node:path";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { parse, stringify } from "maml.js";
import type { EnvObject } from "~/utils/parse-env-file";
import { PACKAGE_EXTRACTORS } from "./package-name-extractors";
import { getManifestFiles } from "./config";

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
 * Check if the new files data is identical to existing file
 *
 * Only compares the files array, ignoring metadata like timestamps
 *
 * @param filePath - Path to check
 * @param newFiles - New files array to compare
 * @returns True if file exists and files content is identical
 */
function isContentIdentical(
  filePath: string,
  newFiles: Array<{ path: string; env: EnvObject }>,
): boolean {
  if (!existsSync(filePath)) {
    return false;
  }

  try {
    const existingContent = readFileSync(filePath, "utf-8");
    const existingData = parse(existingContent) as EnviStore;

    /** Compare only the files property, ignore metadata */
    return JSON.stringify(existingData.files) === JSON.stringify(newFiles);
  } catch {
    return false;
  }
}

/**
 * Save env configuration to storage
 *
 * @param repoPath - Absolute path to repository root
 * @param envFiles - Array of env file data
 * @param packageName - Optional package name (will be read if not provided)
 * @returns True if file was updated, false if no changes
 */
export function saveToStorage(
  repoPath: string,
  envFiles: Array<{ path: string; env: EnvObject }>,
  packageName?: string | null,
): boolean {
  ensureStorageDir();

  /** Sort files by path for consistent comparison */
  const sortedFiles = [...envFiles].sort((a, b) =>
    a.path.localeCompare(b.path),
  );

  const storageDir = getStorageDir();
  const filename = getStorageFilename(repoPath, packageName);
  const filePath = join(storageDir, filename);

  /** Check if content is identical to existing file */
  if (isContentIdentical(filePath, sortedFiles)) {
    return false;
  }

  const data: EnviStore = {
    __envi_version: 1,
    metadata: {
      updated_from: repoPath,
      updated_at: new Date().toISOString(),
    },
    files: sortedFiles,
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
