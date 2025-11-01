import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseEnvFile } from "./parse-env-file.js";
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
      __c00: "# First comment",
      KEY1: "value1",
      __c01: "# Second comment",
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

    expect(Object.keys(result)).toEqual(["__c00", "KEY_Z", "__c01", "KEY_A"]);
  });
});
