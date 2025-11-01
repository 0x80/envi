import { describe, expect, it } from "vitest";
import {
  captureCommand,
  findEnvFiles,
  findRepoRoot,
  getStorageDir,
  getStorageFilename,
  parseEnvFile,
  saveToStorage,
} from "./index";

describe("envi exports", () => {
  it("should export captureCommand", () => {
    expect(captureCommand).toBeDefined();
    expect(typeof captureCommand).toBe("function");
  });

  it("should export utility functions", () => {
    expect(findRepoRoot).toBeDefined();
    expect(findEnvFiles).toBeDefined();
    expect(parseEnvFile).toBeDefined();
    expect(getStorageDir).toBeDefined();
    expect(getStorageFilename).toBeDefined();
    expect(saveToStorage).toBeDefined();
  });
});
