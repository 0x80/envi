import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseEnvFile } from "./parse-env-file";
import { readFileSync } from "node:fs";

vi.mock("node:fs");

describe("parseEnvFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should parse simple key=value pairs", () => {
    const content = `KEY1=value1
KEY2=value2`;

    vi.mocked(readFileSync).mockReturnValue(content);

    const result = parseEnvFile("/test/.env");

    expect(result).toEqual({
      KEY1: "value1",
      KEY2: "value2",
    });
  });

  it("should preserve comments with __c keys", () => {
    const content = `# First comment
KEY1=value1
# Second comment
KEY2=value2`;

    vi.mocked(readFileSync).mockReturnValue(content);

    const result = parseEnvFile("/test/.env");

    expect(result).toEqual({
      __c_00: "# First comment",
      KEY1: "value1",
      __c_01: "# Second comment",
      KEY2: "value2",
    });
  });

  it("should handle quoted values", () => {
    const content = `KEY1="quoted value"
KEY2='single quoted'
KEY3=unquoted`;

    vi.mocked(readFileSync).mockReturnValue(content);

    const result = parseEnvFile("/test/.env");

    expect(result).toEqual({
      KEY1: "quoted value",
      KEY2: "single quoted",
      KEY3: "unquoted",
    });
  });

  it("should skip empty lines", () => {
    const content = `KEY1=value1

KEY2=value2`;

    vi.mocked(readFileSync).mockReturnValue(content);

    const result = parseEnvFile("/test/.env");

    expect(result).toEqual({
      KEY1: "value1",
      KEY2: "value2",
    });
  });

  it("should maintain insertion order", () => {
    const content = `# Comment 1
KEY_Z=valueZ
# Comment 2
KEY_A=valueA`;

    vi.mocked(readFileSync).mockReturnValue(content);

    const result = parseEnvFile("/test/.env");

    expect(Object.keys(result)).toEqual(["__c_00", "KEY_Z", "__c_01", "KEY_A"]);
  });

  it("should preserve inline comments", () => {
    const content = `KEY1=value1 # This is an inline comment
KEY2=value2`;

    vi.mocked(readFileSync).mockReturnValue(content);

    const result = parseEnvFile("/test/.env");

    expect(result).toEqual({
      __i_00: "# This is an inline comment",
      KEY1: "value1",
      KEY2: "value2",
    });
  });

  it("should handle inline comments with quoted values", () => {
    const content = `KEY1="value with spaces" # Comment
KEY2='single quoted' # Another comment
KEY3=unquoted # Third comment`;

    vi.mocked(readFileSync).mockReturnValue(content);

    const result = parseEnvFile("/test/.env");

    expect(result).toEqual({
      __i_00: "# Comment",
      KEY1: "value with spaces",
      __i_01: "# Another comment",
      KEY2: "single quoted",
      __i_02: "# Third comment",
      KEY3: "unquoted",
    });
  });

  it("should not treat # inside quotes as inline comment", () => {
    const content = `PASSWORD="abc#def"
URL="https://example.com#anchor"`;

    vi.mocked(readFileSync).mockReturnValue(content);

    const result = parseEnvFile("/test/.env");

    expect(result).toEqual({
      PASSWORD: "abc#def",
      URL: "https://example.com#anchor",
    });
  });

  it("should handle mix of full-line and inline comments", () => {
    const content = `# Full-line comment
KEY1=value1 # Inline comment
# Another full-line comment
KEY2=value2`;

    vi.mocked(readFileSync).mockReturnValue(content);

    const result = parseEnvFile("/test/.env");

    expect(result).toEqual({
      __c_00: "# Full-line comment",
      __i_00: "# Inline comment",
      KEY1: "value1",
      __c_01: "# Another full-line comment",
      KEY2: "value2",
    });

    /** Verify order: comment, inline, key, comment, key */
    expect(Object.keys(result)).toEqual([
      "__c_00",
      "__i_00",
      "KEY1",
      "__c_01",
      "KEY2",
    ]);
  });
});
