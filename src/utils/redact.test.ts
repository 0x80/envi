import { describe, expect, it } from "vitest";
import {
  applyRedaction,
  mergeRedactedValues,
  REDACTED_PLACEHOLDER,
} from "./redact";
import type { EnvObject } from "./parse-env-file";

describe("redact", () => {
  describe("REDACTED_PLACEHOLDER", () => {
    it("should have correct value", () => {
      expect(REDACTED_PLACEHOLDER).toBe("__envi_redacted__");
    });
  });

  describe("applyRedaction", () => {
    it("should redact specified variables", () => {
      const env: EnvObject = {
        API_KEY: "secret123",
        DATABASE_URL: "postgres://localhost",
        GITHUB_PAT: "ghp_token",
      };

      const result = applyRedaction(env, ["API_KEY", "GITHUB_PAT"]);

      expect(result.redacted).toEqual({
        API_KEY: "__envi_redacted__",
        DATABASE_URL: "postgres://localhost",
        GITHUB_PAT: "__envi_redacted__",
      });

      expect(result.redactedKeys).toEqual(["API_KEY", "GITHUB_PAT"]);
    });

    it("should preserve non-redacted variables", () => {
      const env: EnvObject = {
        PUBLIC_URL: "https://example.com",
        PORT: "3000",
        NODE_ENV: "production",
      };

      const result = applyRedaction(env, ["GITHUB_PAT"]);

      expect(result.redacted).toEqual({
        PUBLIC_URL: "https://example.com",
        PORT: "3000",
        NODE_ENV: "production",
      });

      expect(result.redactedKeys).toEqual([]);
    });

    it("should preserve full-line comments", () => {
      const env: EnvObject = {
        __l_00: "# Database configuration",
        DATABASE_URL: "postgres://localhost",
        __l_01: "",
        __l_02: "# API keys",
        API_KEY: "secret123",
      };

      const result = applyRedaction(env, ["API_KEY"]);

      expect(result.redacted).toEqual({
        __l_00: "# Database configuration",
        DATABASE_URL: "postgres://localhost",
        __l_01: "",
        __l_02: "# API keys",
        API_KEY: "__envi_redacted__",
      });

      expect(result.redactedKeys).toEqual(["API_KEY"]);
    });

    it("should preserve inline comments", () => {
      const env: EnvObject = {
        __i_00: "# production database",
        DATABASE_URL: "postgres://localhost",
        __i_01: "# secret token",
        API_KEY: "secret123",
      };

      const result = applyRedaction(env, ["API_KEY"]);

      expect(result.redacted).toEqual({
        __i_00: "# production database",
        DATABASE_URL: "postgres://localhost",
        __i_01: "# secret token",
        API_KEY: "__envi_redacted__",
      });

      expect(result.redactedKeys).toEqual(["API_KEY"]);
    });

    it("should handle empty env object", () => {
      const env: EnvObject = {};

      const result = applyRedaction(env, ["API_KEY"]);

      expect(result.redacted).toEqual({});
      expect(result.redactedKeys).toEqual([]);
    });

    it("should handle empty redaction list", () => {
      const env: EnvObject = {
        API_KEY: "secret123",
        DATABASE_URL: "postgres://localhost",
      };

      const result = applyRedaction(env, []);

      expect(result.redacted).toEqual({
        API_KEY: "secret123",
        DATABASE_URL: "postgres://localhost",
      });

      expect(result.redactedKeys).toEqual([]);
    });

    it("should handle all variables being redacted", () => {
      const env: EnvObject = {
        API_KEY: "secret123",
        GITHUB_PAT: "ghp_token",
        AWS_SECRET: "aws_secret",
      };

      const result = applyRedaction(env, [
        "API_KEY",
        "GITHUB_PAT",
        "AWS_SECRET",
      ]);

      expect(result.redacted).toEqual({
        API_KEY: "__envi_redacted__",
        GITHUB_PAT: "__envi_redacted__",
        AWS_SECRET: "__envi_redacted__",
      });

      expect(result.redactedKeys).toEqual([
        "API_KEY",
        "GITHUB_PAT",
        "AWS_SECRET",
      ]);
    });

    it("should handle mixed content with comments and redacted variables", () => {
      const env: EnvObject = {
        __l_00: "# Configuration",
        PUBLIC_URL: "https://example.com",
        __l_01: "",
        __i_00: "# secret token",
        API_KEY: "secret123",
        __l_02: "# Database",
        DATABASE_URL: "postgres://localhost",
      };

      const result = applyRedaction(env, ["API_KEY"]);

      expect(result.redacted).toEqual({
        __l_00: "# Configuration",
        PUBLIC_URL: "https://example.com",
        __l_01: "",
        __i_00: "# secret token",
        API_KEY: "__envi_redacted__",
        __l_02: "# Database",
        DATABASE_URL: "postgres://localhost",
      });

      expect(result.redactedKeys).toEqual(["API_KEY"]);
    });
  });

  describe("mergeRedactedValues", () => {
    it("should merge redacted values from existing file", () => {
      const stored: EnvObject = {
        API_KEY: "__envi_redacted__",
        DATABASE_URL: "postgres://localhost",
      };

      const existing: EnvObject = {
        API_KEY: "actual_secret_value",
        DATABASE_URL: "postgres://old_url",
      };

      const result = mergeRedactedValues(stored, existing);

      expect(result).toEqual({
        API_KEY: "actual_secret_value",
        DATABASE_URL: "postgres://localhost",
      });
    });

    it("should keep non-redacted values from stored", () => {
      const stored: EnvObject = {
        PUBLIC_URL: "https://example.com",
        PORT: "3000",
      };

      const existing: EnvObject = {
        PUBLIC_URL: "https://old-example.com",
        PORT: "8080",
      };

      const result = mergeRedactedValues(stored, existing);

      expect(result).toEqual({
        PUBLIC_URL: "https://example.com",
        PORT: "3000",
      });
    });

    it("should preserve full-line comments from stored", () => {
      const stored: EnvObject = {
        __l_00: "# New comment",
        API_KEY: "__envi_redacted__",
      };

      const existing: EnvObject = {
        __l_00: "# Old comment",
        API_KEY: "actual_secret",
      };

      const result = mergeRedactedValues(stored, existing);

      expect(result).toEqual({
        __l_00: "# New comment",
        API_KEY: "actual_secret",
      });
    });

    it("should preserve inline comments from stored", () => {
      const stored: EnvObject = {
        __i_00: "# secret token",
        API_KEY: "__envi_redacted__",
      };

      const existing: EnvObject = {
        __i_00: "# old comment",
        API_KEY: "actual_secret",
      };

      const result = mergeRedactedValues(stored, existing);

      expect(result).toEqual({
        __i_00: "# secret token",
        API_KEY: "actual_secret",
      });
    });

    it("should keep redacted placeholder when existing does not have the key", () => {
      const stored: EnvObject = {
        API_KEY: "__envi_redacted__",
        DATABASE_URL: "postgres://localhost",
      };

      const existing: EnvObject = {
        DATABASE_URL: "postgres://old_url",
      };

      const result = mergeRedactedValues(stored, existing);

      expect(result).toEqual({
        API_KEY: "__envi_redacted__",
        DATABASE_URL: "postgres://localhost",
      });
    });

    it("should handle when no values are redacted", () => {
      const stored: EnvObject = {
        PUBLIC_URL: "https://example.com",
        PORT: "3000",
      };

      const existing: EnvObject = {
        PUBLIC_URL: "https://old-example.com",
        PORT: "8080",
      };

      const result = mergeRedactedValues(stored, existing);

      expect(result).toEqual({
        PUBLIC_URL: "https://example.com",
        PORT: "3000",
      });
    });

    it("should handle empty stored object", () => {
      const stored: EnvObject = {};
      const existing: EnvObject = {
        API_KEY: "secret123",
      };

      const result = mergeRedactedValues(stored, existing);

      expect(result).toEqual({});
    });

    it("should handle empty existing object", () => {
      const stored: EnvObject = {
        API_KEY: "__envi_redacted__",
        DATABASE_URL: "postgres://localhost",
      };

      const existing: EnvObject = {};

      const result = mergeRedactedValues(stored, existing);

      expect(result).toEqual({
        API_KEY: "__envi_redacted__",
        DATABASE_URL: "postgres://localhost",
      });
    });

    it("should handle multiple redacted values", () => {
      const stored: EnvObject = {
        API_KEY: "__envi_redacted__",
        GITHUB_PAT: "__envi_redacted__",
        DATABASE_URL: "postgres://localhost",
        AWS_SECRET: "__envi_redacted__",
      };

      const existing: EnvObject = {
        API_KEY: "actual_api_key",
        GITHUB_PAT: "ghp_actual_token",
        DATABASE_URL: "postgres://old_url",
        AWS_SECRET: "actual_aws_secret",
      };

      const result = mergeRedactedValues(stored, existing);

      expect(result).toEqual({
        API_KEY: "actual_api_key",
        GITHUB_PAT: "ghp_actual_token",
        DATABASE_URL: "postgres://localhost",
        AWS_SECRET: "actual_aws_secret",
      });
    });

    it("should handle complex scenario with comments and mixed redaction", () => {
      const stored: EnvObject = {
        __l_00: "# Configuration",
        PUBLIC_URL: "https://example.com",
        __l_01: "",
        __i_00: "# secret token",
        API_KEY: "__envi_redacted__",
        __l_02: "# Database",
        DATABASE_URL: "postgres://localhost",
        __i_01: "# personal token",
        GITHUB_PAT: "__envi_redacted__",
      };

      const existing: EnvObject = {
        __l_00: "# Old configuration",
        PUBLIC_URL: "https://old-example.com",
        __l_01: "",
        __i_00: "# old comment",
        API_KEY: "actual_api_key",
        __l_02: "# Old database",
        DATABASE_URL: "postgres://old_url",
        __i_01: "# old personal token",
        GITHUB_PAT: "ghp_actual_token",
      };

      const result = mergeRedactedValues(stored, existing);

      expect(result).toEqual({
        __l_00: "# Configuration",
        PUBLIC_URL: "https://example.com",
        __l_01: "",
        __i_00: "# secret token",
        API_KEY: "actual_api_key",
        __l_02: "# Database",
        DATABASE_URL: "postgres://localhost",
        __i_01: "# personal token",
        GITHUB_PAT: "ghp_actual_token",
      });
    });
  });
});
