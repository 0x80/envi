import { readFileSync } from "node:fs";

/** Environment variable object with comments preserved as __l_00, __l_01, etc. */
export type EnvObject = Record<string, string>;

/**
 * Parse a .env file while preserving comments and empty lines
 *
 * Lines are stored as __l_00, __l_01, etc. (zero-padded, incremental)
 * Full-line comments starting with # and empty lines are preserved in their original order
 * Inline comments are stored as __i_00, __i_01, etc. right before the value
 *
 * @param filePath - Absolute path to .env file
 * @returns Object with env vars and comment keys
 */
export function parseEnvFile(filePath: string): EnvObject {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const result: EnvObject = {};
  let lineIndex = 0;
  let inlineCommentIndex = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    /** Skip empty lines */
    if (trimmed === "") {
      continue;
    }

    /** Handle full-line comments */
    if (trimmed.startsWith("#")) {
      const lineKey = `__l_${lineIndex.toString().padStart(2, "0")}`;
      result[lineKey] = trimmed;
      lineIndex++;
      continue;
    }

    /** Parse key=value pairs */
    const equalIndex = line.indexOf("=");
    if (equalIndex > 0) {
      const key = line.substring(0, equalIndex).trim();
      const valueWithComment = line.substring(equalIndex + 1);

      /** Check for inline comment */
      let value = valueWithComment.trim();
      let inlineComment: string | null = null;

      /** Find # that's not inside quotes */
      let inQuotes = false;
      let quoteChar: string | null = null;
      let commentStartIndex = -1;

      for (let i = 0; i < value.length; i++) {
        const char = value[i];

        /** Track quote state */
        if ((char === '"' || char === "'") && !inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (char === quoteChar && inQuotes) {
          inQuotes = false;
          quoteChar = null;
        }

        /** Find # outside of quotes */
        if (char === "#" && !inQuotes) {
          commentStartIndex = i;
          break;
        }
      }

      /** Extract inline comment if found */
      if (commentStartIndex >= 0) {
        inlineComment = value.substring(commentStartIndex).trim();
        value = value.substring(0, commentStartIndex).trim();
      }

      /** Remove surrounding quotes if present */
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.substring(1, value.length - 1);
      }

      /** Add inline comment key before the value */
      if (inlineComment) {
        const inlineKey = `__i_${inlineCommentIndex.toString().padStart(2, "0")}`;
        result[inlineKey] = inlineComment;
        inlineCommentIndex++;
      }

      result[key] = value;
    }
  }

  return result;
}
