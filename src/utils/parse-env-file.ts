import { readFileSync } from "node:fs";

/** Environment variable object with comments preserved as __c00, __c01, etc. */
export type EnvObject = Record<string, string>;

/**
 * Parse a .env file while preserving comments
 *
 * Comments are stored as __c00, __c01, etc. (zero-padded, incremental)
 * Full-line comments starting with # are preserved in their original order
 *
 * @param filePath - Absolute path to .env file
 * @returns Object with env vars and comment keys
 */
export function parseEnvFile(filePath: string): EnvObject {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const result: EnvObject = {};
  let commentIndex = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    /** Skip empty lines */
    if (trimmed === "") {
      continue;
    }

    /** Handle comments */
    if (trimmed.startsWith("#")) {
      const commentKey = `__c${commentIndex.toString().padStart(2, "0")}`;
      result[commentKey] = trimmed;
      commentIndex++;
      continue;
    }

    /** Parse key=value pairs */
    const equalIndex = line.indexOf("=");
    if (equalIndex > 0) {
      const key = line.substring(0, equalIndex).trim();
      let value = line.substring(equalIndex + 1).trim();

      /** Remove surrounding quotes if present */
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.substring(1, value.length - 1);
      }

      result[key] = value;
    }
  }

  return result;
}
