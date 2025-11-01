import { describe, expect, it } from "vitest";
import {
  decrypt,
  encrypt,
  formatBlob,
  generateKeyFromManifest,
  parseBlob,
} from "./encryption";

describe("encryption", () => {
  const testData = "Hello, World!";
  const testSecret = "my-secret-key";

  describe("encrypt and decrypt", () => {
    it("should encrypt and decrypt data correctly", () => {
      const encrypted = encrypt(testData, testSecret);
      const decrypted = decrypt(encrypted, testSecret);

      expect(decrypted).toBe(testData);
    });

    it("should produce different encrypted outputs for same input", () => {
      const encrypted1 = encrypt(testData, testSecret);
      const encrypted2 = encrypt(testData, testSecret);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it("should fail to decrypt with wrong secret", () => {
      const encrypted = encrypt(testData, testSecret);

      expect(() => decrypt(encrypted, "wrong-secret")).toThrow();
    });

    it("should handle complex data structures", () => {
      const complexData = JSON.stringify({
        foo: "bar",
        nested: { value: 123 },
        array: [1, 2, 3],
      });

      const encrypted = encrypt(complexData, testSecret);
      const decrypted = decrypt(encrypted, testSecret);

      expect(decrypted).toBe(complexData);
    });

    it("should handle empty strings", () => {
      const encrypted = encrypt("", testSecret);
      const decrypted = decrypt(encrypted, testSecret);

      expect(decrypted).toBe("");
    });

    it("should handle unicode characters", () => {
      const unicodeData = "Hello 世界 🌍";
      const encrypted = encrypt(unicodeData, testSecret);
      const decrypted = decrypt(encrypted, testSecret);

      expect(decrypted).toBe(unicodeData);
    });
  });

  describe("generateKeyFromManifest", () => {
    it("should use entire package.json content as secret", () => {
      const packageJson = JSON.stringify({ name: "test", version: "1.0.0" });
      const key = generateKeyFromManifest(packageJson);

      expect(key).toBe(packageJson);
    });

    it("should produce same key for same manifest", () => {
      const packageJson = JSON.stringify({ name: "test" });
      const key1 = generateKeyFromManifest(packageJson);
      const key2 = generateKeyFromManifest(packageJson);

      expect(key1).toBe(key2);
    });

    it("should produce different keys for different manifests", () => {
      const packageJson1 = JSON.stringify({ name: "test1" });
      const packageJson2 = JSON.stringify({ name: "test2" });

      const key1 = generateKeyFromManifest(packageJson1);
      const key2 = generateKeyFromManifest(packageJson2);

      expect(key1).not.toBe(key2);
    });
  });

  describe("formatBlob", () => {
    it("should format encrypted data with delimiters", () => {
      const encrypted = "test-encrypted-data";
      const blob = formatBlob(encrypted);

      expect(blob).toBe("__envi_start__\ntest-encrypted-data\n__envi_end__");
    });

    it("should handle empty encrypted data", () => {
      const blob = formatBlob("");

      expect(blob).toBe("__envi_start__\n\n__envi_end__");
    });
  });

  describe("parseBlob", () => {
    it("should extract encrypted data from valid blob", () => {
      const blob = "__envi_start__\nencrypted-data\n__envi_end__";
      const extracted = parseBlob(blob);

      expect(extracted).toBe("encrypted-data");
    });

    it("should handle blob with extra whitespace", () => {
      const blob = "  __envi_start__  \n  encrypted-data  \n  __envi_end__  ";
      const extracted = parseBlob(blob);

      expect(extracted).toBe("encrypted-data");
    });

    it("should handle blob with multiple newlines", () => {
      const blob = "__envi_start__\n\n\nencrypted-data\n\n\n__envi_end__";
      const extracted = parseBlob(blob);

      expect(extracted).toBe("encrypted-data");
    });

    it("should handle blob with tabs and spaces", () => {
      const blob = "\t__envi_start__\t\n\tencrypted-data\t\n\t__envi_end__\t";
      const extracted = parseBlob(blob);

      expect(extracted).toBe("encrypted-data");
    });

    it("should handle blob formatted by chat apps with extra indentation", () => {
      const blob = `    __envi_start__
    encrypted-data
    __envi_end__`;
      const extracted = parseBlob(blob);

      expect(extracted).toBe("encrypted-data");
    });

    it("should handle blob on single line", () => {
      const blob = "__envi_start__encrypted-data__envi_end__";
      const extracted = parseBlob(blob);

      expect(extracted).toBe("encrypted-data");
    });

    it("should handle blob with mixed line endings", () => {
      const blob = "__envi_start__\r\nencrypted-data\r\n__envi_end__";
      const extracted = parseBlob(blob);

      expect(extracted).toBe("encrypted-data");
    });

    it("should return null for invalid blob format - missing start delimiter", () => {
      const blob = "encrypted-data\n__envi_end__";
      const extracted = parseBlob(blob);

      expect(extracted).toBeNull();
    });

    it("should return null for invalid blob format - missing end delimiter", () => {
      const blob = "__envi_start__\nencrypted-data";
      const extracted = parseBlob(blob);

      expect(extracted).toBeNull();
    });

    it("should return null for invalid blob format - markers in wrong order", () => {
      const blob = "__envi_end__\nencrypted-data\n__envi_start__";
      const extracted = parseBlob(blob);

      expect(extracted).toBeNull();
    });

    it("should return null for empty blob content", () => {
      const blob = "__envi_start____envi_end__";
      const extracted = parseBlob(blob);

      expect(extracted).toBeNull();
    });

    it("should return null for completely invalid blob", () => {
      const blob = "this is not a valid blob";
      const extracted = parseBlob(blob);

      expect(extracted).toBeNull();
    });
  });

  describe("end-to-end blob workflow", () => {
    it("should encrypt, format, parse, and decrypt correctly", () => {
      const originalData = JSON.stringify({
        __envi_version: 1,
        files: [{ path: ".env", env: { KEY: "value" } }],
      });

      // Encrypt and format
      const encrypted = encrypt(originalData, testSecret);
      const blob = formatBlob(encrypted);

      // Parse and decrypt
      const extractedEncrypted = parseBlob(blob);
      expect(extractedEncrypted).not.toBeNull();

      const decrypted = decrypt(extractedEncrypted!, testSecret);

      expect(decrypted).toBe(originalData);
    });
  });
});
