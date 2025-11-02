import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { parse, stringify } from "maml.js";
import { DEFAULT_MANIFEST_FILES } from "./package-name-extractors";

/** Global configuration structure */
export interface EnviConfig {
  use_version_control: "github" | false;
  /** Additional manifest files to check on top of the defaults (in priority order) */
  additional_manifest_files: string[];
  /** Environment variables to redact (replace with __envi_redacted__) when capturing or packing */
  redacted_variables: string[];
}

/** Default configuration */
const DEFAULT_CONFIG: EnviConfig = {
  use_version_control: false,
  additional_manifest_files: [],
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
 * Get the complete list of package manifest files to check
 *
 * Combines the default manifest files with any additional files from the config.
 * Additional files are checked first (in case user wants to override priority).
 *
 * @returns Array of manifest filenames in priority order
 */
export function getManifestFiles(): string[] {
  const config = readConfig();
  return [...config.additional_manifest_files, ...DEFAULT_MANIFEST_FILES];
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
    config.redacted_variables.push(variable);
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

  config.redacted_variables.splice(index, 1);
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
