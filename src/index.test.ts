import { describe, expect, it } from "vitest";
import {
  captureCommand,
  createKeyCommand,
  findEnvFiles,
  findKeyFile,
  findRepoRoot,
  generateKey,
  getStorageDir,
  getStorageFilename,
  hasKeyFile,
  KEY_FILE_NAME,
  LEGACY_KEY_FILE_NAME,
  parseEnvFile,
  readCapturePatterns,
  readEncryptionKey,
  saveToStorage,
  writeEncryptionKey,
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

  it("should export key-file helpers (envi.config.maml encryption)", () => {
    expect(KEY_FILE_NAME).toBe("envi.config.maml");
    expect(LEGACY_KEY_FILE_NAME).toBe("envi.maml");
    expect(typeof generateKey).toBe("function");
    expect(typeof hasKeyFile).toBe("function");
    expect(typeof findKeyFile).toBe("function");
    expect(typeof readEncryptionKey).toBe("function");
    expect(typeof readCapturePatterns).toBe("function");
    expect(typeof writeEncryptionKey).toBe("function");
    expect(typeof createKeyCommand).toBe("function");
  });
});
