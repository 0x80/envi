import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { parse, stringify } from "maml.js";
import { DEFAULT_MANIFEST_FILES } from "./package-name-extractors";

/** Global configuration structure */
export interface EnviConfig {
  use_version_control: "github" | false;
  /** List of package manifest files to check for package name detection (in priority order) */
  package_manifest_files: string[];
}

/** Default configuration */
const DEFAULT_CONFIG: EnviConfig = {
  use_version_control: false,
  package_manifest_files: DEFAULT_MANIFEST_FILES,
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
 * Update global configuration with partial values
 *
 * @param updates - Partial configuration to merge with existing
 */
export function updateConfig(updates: Partial<EnviConfig>): void {
  const currentConfig = readConfig();
  const newConfig = { ...currentConfig, ...updates };
  writeConfig(newConfig);
}
