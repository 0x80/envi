import type { EnvObject } from "./parse-env-file";

/** Placeholder value for redacted environment variables */
export const REDACTED_PLACEHOLDER = "__envi_redacted__";

/**
 * Result of applying redaction to an environment object
 */
export interface RedactionResult {
  /** Environment object with redacted values replaced */
  redacted: EnvObject;
  /** List of variable names that were redacted */
  redactedKeys: string[];
}

/**
 * Apply redaction to an environment object
 *
 * Replaces values of redacted variables with __envi_redacted__ placeholder
 * Preserves comments and structure
 *
 * @param env - Environment object to redact
 * @param redactedVariables - List of variable names to redact
 * @returns Object with redacted env and list of redacted keys
 */
export function applyRedaction(
  env: EnvObject,
  redactedVariables: string[],
): RedactionResult {
  const redacted: EnvObject = {};
  const redactedKeys: string[] = [];

  for (const [key, value] of Object.entries(env)) {
    // Keep comment keys unchanged
    if (key.startsWith("__l_") || key.startsWith("__i_")) {
      redacted[key] = value;
      continue;
    }

    // Check if this key should be redacted
    if (redactedVariables.includes(key)) {
      redacted[key] = REDACTED_PLACEHOLDER;
      redactedKeys.push(key);
    } else {
      redacted[key] = value;
    }
  }

  return { redacted, redactedKeys };
}

/**
 * Merge redacted values from existing env file
 *
 * For keys with __envi_redacted__ placeholder, use the real value from the existing file
 * If no existing value, keep the placeholder
 *
 * @param stored - Environment object from storage (may contain __envi_redacted__)
 * @param existing - Environment object from existing file (has real values)
 * @returns Merged environment object with real values for redacted keys
 */
export function mergeRedactedValues(
  stored: EnvObject,
  existing: EnvObject,
): EnvObject {
  const merged: EnvObject = {};

  for (const [key, value] of Object.entries(stored)) {
    // Keep comment keys unchanged
    if (key.startsWith("__l_") || key.startsWith("__i_")) {
      merged[key] = value;
      continue;
    }

    // If this is a redacted value and we have a real value in existing file, use it
    if (value === REDACTED_PLACEHOLDER && existing[key] !== undefined) {
      merged[key] = existing[key];
    } else {
      merged[key] = value;
    }
  }

  return merged;
}
