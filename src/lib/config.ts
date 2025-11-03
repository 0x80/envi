import { parse, stringify } from "maml.js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { DEFAULT_MANIFEST_FILES } from "./package-name-extractors";

/** Global configuration structure */
export interface EnviConfig {
  use_version_control: "github" | false;
  /** Manifest files to check for package name and encryption (in priority order) */
  manifest_files: string[];
  /**
   * Environment variables to redact (replace with `__envi_redacted__`) when
   * capturing or packing
   */
  redacted_variables: string[];
}

/** Default configuration */
const DEFAULT_CONFIG: EnviConfig = {
  use_version_control: false,
  manifest_files: [...DEFAULT_MANIFEST_FILES],
  redacted_variables: ["GITHUB_PAT"],
};

/**
 * Get the config file path
 *
 * @returns Absolute path to ~/.envi/config.maml
 */
export function getConfigPath(): string {
  return join(homedir(), ".envi", "config.maml");
}

/** Ensure the .envi directory exists */
function ensureEnviDir(): void {
  const enviDir = join(homedir(), ".envi");
  mkdirSync(enviDir, { recursive: true });
}

/**
 * Read global configuration
 *
 * @returns Configuration object
 */
export function readConfig(): EnviConfig {
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    const parsed = parse(content) as EnviConfig;
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Get the list of manifest files to check for package name and encryption
 *
 * @returns Array of manifest filenames in priority order
 */
export function getManifestFiles(): string[] {
  const config = readConfig();
  return config.manifest_files;
}

/**
 * Add a manifest file to the list
 *
 * @param filename - Manifest filename to add
 */
export function addToManifestFiles(filename: string): void {
  const config = readConfig();
  if (!config.manifest_files.includes(filename)) {
    config.manifest_files = [...config.manifest_files, filename];
    writeConfig(config);
  }
}

/**
 * Remove a manifest file from the list
 *
 * @param filename - Manifest filename to remove
 * @returns True if file was removed, false if it wasn't in the list
 */
export function removeFromManifestFiles(filename: string): boolean {
  const config = readConfig();
  const index = config.manifest_files.indexOf(filename);

  if (index === -1) {
    return false;
  }

  config.manifest_files = config.manifest_files.filter((f) => f !== filename);
  writeConfig(config);
  return true;
}

/**
 * Write global configuration
 *
 * @param config - Configuration object to write
 */
export function writeConfig(config: EnviConfig): void {
  ensureEnviDir();
  const configPath = getConfigPath();
  const mamlContent = stringify(config);
  writeFileSync(configPath, mamlContent, "utf-8");
}

/**
 * Get the list of redacted environment variables
 *
 * @returns Array of variable names to redact
 */
export function getRedactedVariables(): string[] {
  const config = readConfig();
  return config.redacted_variables;
}

/**
 * Add a variable to the redaction list
 *
 * @param variable - Variable name to redact
 */
export function addToRedactionList(variable: string): void {
  const config = readConfig();
  if (!config.redacted_variables.includes(variable)) {
    config.redacted_variables = [...config.redacted_variables, variable];
    writeConfig(config);
  }
}

/**
 * Remove a variable from the redaction list
 *
 * @param variable - Variable name to stop redacting
 * @returns True if variable was removed, false if it wasn't in the list
 */
export function removeFromRedactionList(variable: string): boolean {
  const config = readConfig();
  const index = config.redacted_variables.indexOf(variable);

  if (index === -1) {
    return false;
  }

  config.redacted_variables = config.redacted_variables.filter(
    (v) => v !== variable,
  );
  writeConfig(config);
  return true;
}

/**
 * Update global configuration with partial values
 *
 * @param updates - Partial configuration to merge with existing
 */
export function updateConfig(updates: Partial<EnviConfig>): void {
  const currentConfig = readConfig();
  const newConfig = { ...currentConfig, ...updates };
  writeConfig(newConfig);
}
