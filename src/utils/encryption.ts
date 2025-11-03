import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scryptSync,
} from "node:crypto";
import { gunzipSync, gzipSync } from "node:zlib";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/** Generate a 32-byte key from a password/secret using scrypt */
function deriveKey(secret: string, salt: Buffer): Buffer {
  return scryptSync(secret, salt, KEY_LENGTH);
}

/**
 * Encrypt data with AES-256-GCM Returns base64 encoded string containing
 *
 * - Salt + iv + authTag + encrypted data
 */
export function encrypt(data: string, secret: string): string {
  // Compress data first (text compresses very well)
  const compressed = gzipSync(data);

  // Generate random salt and IV
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);

  // Derive key from secret
  const key = deriveKey(secret, salt);

  // Create cipher and encrypt compressed data
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(compressed), cipher.final()]);

  // Get authentication tag
  const authTag = cipher.getAuthTag();

  // Combine all parts: salt + iv + authTag + encrypted
  const combined = Buffer.concat([salt, iv, authTag, encrypted]);

  return combined.toString("base64");
}

/**
 * Decrypt data encrypted with encrypt() Expects base64 encoded string
 * containing: salt + iv + authTag + encrypted data. Automatically decompresses
 * the data after decryption
 */
export function decrypt(encryptedData: string, secret: string): string {
  // Decode from base64
  const combined = Buffer.from(encryptedData, "base64");

  // Extract parts
  const salt = combined.subarray(0, SALT_LENGTH);
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = combined.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH,
  );
  const encrypted = combined.subarray(
    SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH,
  );

  // Derive key from secret
  const key = deriveKey(secret, salt);

  // Create decipher and decrypt
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  // Decompress the data
  const decompressed = gunzipSync(decrypted);

  return decompressed.toString("utf8");
}

/**
 * Generate a key from manifest file contents using MD5 hash
 *
 * Supports all manifest types: package.json, Cargo.toml, go.mod,
 * pyproject.toml, composer.json, pubspec.yaml, settings.gradle.kts,
 * settings.gradle, pom.xml
 *
 * This allows colleagues with identical manifest files to decrypt blobs
 * automatically
 *
 * @param manifestContent - Raw content of any manifest file
 * @returns MD5 hash of the content (32-character hex string)
 */
export function generateKeyFromManifest(manifestContent: string): string {
  // Hash the manifest content with MD5
  // This ensures consistent key length regardless of manifest file size
  // Colleagues with identical manifests get the same hash
  return createHash("md5").update(manifestContent).digest("hex");
}

/** Format encrypted data as an envi blob */
export function formatBlob(encryptedData: string): string {
  return `__envi_start__\n${encryptedData}\n__envi_end__`;
}

/**
 * Extract encrypted data from an envi blob Returns null if blob format is
 * invalid
 *
 * Removes all whitespace and newlines before parsing to handle formatting
 * issues from copy-paste or chat applications
 */
export function parseBlob(blob: string): string | null {
  // Remove all whitespace and newlines
  const normalized = blob.replace(/\s/g, "");

  // Look for start and end markers
  const startMarker = "__envi_start__";
  const endMarker = "__envi_end__";

  const startIndex = normalized.indexOf(startMarker);
  const endIndex = normalized.indexOf(endMarker);

  // Validate markers exist and are in correct order
  if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) {
    return null;
  }

  // Extract encrypted data between markers
  const encryptedData = normalized.substring(
    startIndex + startMarker.length,
    endIndex,
  );

  // Return null if no data between markers
  if (encryptedData.length === 0) {
    return null;
  }

  return encryptedData;
}
