import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getConfigPath, readConfig, updateConfig, writeConfig } from "./config";
import { parse, stringify } from "maml.js";
import { DEFAULT_MANIFEST_FILES } from "./package-name-extractors";

vi.mock("node:os");
vi.mock("node:fs");
vi.mock("maml.js");

describe("config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getConfigPath", () => {
    it("should return path to config.maml", () => {
      vi.mocked(homedir).mockReturnValue("/home/user");

      const result = getConfigPath();

      expect(result).toBe(join("/home/user", ".envi", "config.maml"));
    });
  });

  describe("readConfig", () => {
    it("should return default config when file does not exist", () => {
      vi.mocked(homedir).mockReturnValue("/home/user");
      vi.mocked(existsSync).mockReturnValue(false);

      const result = readConfig();

      expect(result).toEqual({
        use_version_control: false,
        package_manifest_files: DEFAULT_MANIFEST_FILES,
      });
    });

    it("should parse existing config file", () => {
      vi.mocked(homedir).mockReturnValue("/home/user");
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue("maml content");
      vi.mocked(parse).mockReturnValue({ use_version_control: "github" });

      const result = readConfig();

      expect(result).toEqual({
        use_version_control: "github" as const,
        package_manifest_files: DEFAULT_MANIFEST_FILES,
      });
    });

    it("should return default config on parse error", () => {
      vi.mocked(homedir).mockReturnValue("/home/user");
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue("invalid");
      vi.mocked(parse).mockImplementation(() => {
        throw new Error("Parse error");
      });

      const result = readConfig();

      expect(result).toEqual({
        use_version_control: false,
        package_manifest_files: DEFAULT_MANIFEST_FILES,
      });
    });
  });

  describe("writeConfig", () => {
    it("should write config to file", () => {
      vi.mocked(homedir).mockReturnValue("/home/user");
      vi.mocked(stringify).mockReturnValue("maml content");

      writeConfig({
        use_version_control: "github",
        package_manifest_files: DEFAULT_MANIFEST_FILES,
      });

      expect(mkdirSync).toHaveBeenCalledWith(join("/home/user", ".envi"), {
        recursive: true,
      });

      expect(stringify).toHaveBeenCalledWith({
        use_version_control: "github",
        package_manifest_files: DEFAULT_MANIFEST_FILES,
      });

      expect(writeFileSync).toHaveBeenCalledWith(
        join("/home/user", ".envi", "config.maml"),
        "maml content",
        "utf-8",
      );
    });
  });

  describe("updateConfig", () => {
    it("should merge with existing config", () => {
      vi.mocked(homedir).mockReturnValue("/home/user");
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue("existing");
      vi.mocked(parse).mockReturnValue({ use_version_control: false });
      vi.mocked(stringify).mockReturnValue("updated");

      updateConfig({ use_version_control: "github" });

      expect(stringify).toHaveBeenCalledWith({
        use_version_control: "github" as const,
        package_manifest_files: DEFAULT_MANIFEST_FILES,
      });
    });
  });
});
