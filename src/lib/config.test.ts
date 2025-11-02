import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addToManifestFiles,
  addToRedactionList,
  getConfigPath,
  getManifestFiles,
  getRedactedVariables,
  readConfig,
  removeFromManifestFiles,
  removeFromRedactionList,
  updateConfig,
  writeConfig,
} from "./config";
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
        manifest_files: DEFAULT_MANIFEST_FILES,
        redacted_variables: ["GITHUB_PAT"],
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
        manifest_files: DEFAULT_MANIFEST_FILES,
        redacted_variables: ["GITHUB_PAT"],
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
        manifest_files: DEFAULT_MANIFEST_FILES,
        redacted_variables: ["GITHUB_PAT"],
      });
    });
  });

  describe("writeConfig", () => {
    it("should write config to file", () => {
      vi.mocked(homedir).mockReturnValue("/home/user");
      vi.mocked(stringify).mockReturnValue("maml content");

      writeConfig({
        use_version_control: "github",
        manifest_files: DEFAULT_MANIFEST_FILES,
        redacted_variables: ["GITHUB_PAT"],
      });

      expect(mkdirSync).toHaveBeenCalledWith(join("/home/user", ".envi"), {
        recursive: true,
      });

      expect(stringify).toHaveBeenCalledWith({
        use_version_control: "github",
        manifest_files: DEFAULT_MANIFEST_FILES,
        redacted_variables: ["GITHUB_PAT"],
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
        manifest_files: DEFAULT_MANIFEST_FILES,
        redacted_variables: ["GITHUB_PAT"],
      });
    });
  });

  describe("getManifestFiles", () => {
    it("should return only defaults when no additional files configured", () => {
      vi.mocked(homedir).mockReturnValue("/home/user");
      vi.mocked(existsSync).mockReturnValue(false);

      const result = getManifestFiles();

      expect(result).toEqual(DEFAULT_MANIFEST_FILES);
    });

    it("should return custom manifest files from config", () => {
      vi.mocked(homedir).mockReturnValue("/home/user");
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue("maml content");
      vi.mocked(parse).mockReturnValue({
        manifest_files: ["custom.json", "app.yaml"],
      });

      const result = getManifestFiles();

      expect(result).toEqual(["custom.json", "app.yaml"]);
    });
  });

  describe("getRedactedVariables", () => {
    it("should return default redacted variables when no config exists", () => {
      vi.mocked(homedir).mockReturnValue("/home/user");
      vi.mocked(existsSync).mockReturnValue(false);

      const result = getRedactedVariables();

      expect(result).toEqual(["GITHUB_PAT"]);
    });

    it("should return custom redacted variables from config", () => {
      vi.mocked(homedir).mockReturnValue("/home/user");
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue("maml content");
      vi.mocked(parse).mockReturnValue({
        redacted_variables: ["API_KEY", "SECRET_TOKEN"],
      });

      const result = getRedactedVariables();

      expect(result).toEqual(["API_KEY", "SECRET_TOKEN"]);
    });
  });

  describe("addToRedactionList", () => {
    it("should add variable to redaction list", () => {
      vi.mocked(homedir).mockReturnValue("/home/user");
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue("maml content");
      vi.mocked(parse).mockReturnValue({
        use_version_control: false,
        manifest_files: DEFAULT_MANIFEST_FILES,
        redacted_variables: ["GITHUB_PAT"],
      });
      vi.mocked(stringify).mockReturnValue("updated");

      addToRedactionList("API_KEY");

      expect(stringify).toHaveBeenCalledWith({
        use_version_control: false,
        manifest_files: DEFAULT_MANIFEST_FILES,
        redacted_variables: ["GITHUB_PAT", "API_KEY"],
      });
    });

    it("should not add duplicate variable", () => {
      vi.mocked(homedir).mockReturnValue("/home/user");
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue("maml content");
      vi.mocked(parse).mockReturnValue({
        use_version_control: false,
        manifest_files: DEFAULT_MANIFEST_FILES,
        redacted_variables: ["GITHUB_PAT"],
      });

      addToRedactionList("GITHUB_PAT");

      expect(stringify).not.toHaveBeenCalled();
    });
  });

  describe("removeFromRedactionList", () => {
    it("should remove variable from redaction list", () => {
      vi.mocked(homedir).mockReturnValue("/home/user");
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue("maml content");
      vi.mocked(parse).mockReturnValue({
        use_version_control: false,
        manifest_files: DEFAULT_MANIFEST_FILES,
        redacted_variables: ["GITHUB_PAT", "API_KEY"],
      });
      vi.mocked(stringify).mockReturnValue("updated");

      const result = removeFromRedactionList("API_KEY");

      expect(result).toBe(true);
      expect(stringify).toHaveBeenCalledWith({
        use_version_control: false,
        manifest_files: DEFAULT_MANIFEST_FILES,
        redacted_variables: ["GITHUB_PAT"],
      });
    });

    it("should return false if variable not in list", () => {
      vi.mocked(homedir).mockReturnValue("/home/user");
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue("maml content");
      vi.mocked(parse).mockReturnValue({
        use_version_control: false,
        manifest_files: DEFAULT_MANIFEST_FILES,
        redacted_variables: ["GITHUB_PAT"],
      });

      const result = removeFromRedactionList("API_KEY");

      expect(result).toBe(false);
      expect(stringify).not.toHaveBeenCalled();
    });
  });

  describe("addToManifestFiles", () => {
    it("should add manifest file to list", () => {
      vi.mocked(homedir).mockReturnValue("/home/user");
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue("maml content");
      vi.mocked(parse).mockReturnValue({
        use_version_control: false,
        manifest_files: DEFAULT_MANIFEST_FILES,
        redacted_variables: ["GITHUB_PAT"],
      });
      vi.mocked(stringify).mockReturnValue("updated");

      addToManifestFiles("custom.json");

      expect(stringify).toHaveBeenCalledWith({
        use_version_control: false,
        manifest_files: [...DEFAULT_MANIFEST_FILES, "custom.json"],
        redacted_variables: ["GITHUB_PAT"],
      });
    });

    it("should not add duplicate manifest file", () => {
      vi.mocked(homedir).mockReturnValue("/home/user");
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue("maml content");
      vi.mocked(parse).mockReturnValue({
        use_version_control: false,
        manifest_files: DEFAULT_MANIFEST_FILES,
        redacted_variables: ["GITHUB_PAT"],
      });

      addToManifestFiles("package.json");

      expect(stringify).not.toHaveBeenCalled();
    });
  });

  describe("removeFromManifestFiles", () => {
    it("should remove manifest file from list", () => {
      vi.mocked(homedir).mockReturnValue("/home/user");
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue("maml content");
      vi.mocked(parse).mockReturnValue({
        use_version_control: false,
        manifest_files: [...DEFAULT_MANIFEST_FILES, "custom.json"],
        redacted_variables: ["GITHUB_PAT"],
      });
      vi.mocked(stringify).mockReturnValue("updated");

      const result = removeFromManifestFiles("custom.json");

      expect(result).toBe(true);
      expect(stringify).toHaveBeenCalledWith({
        use_version_control: false,
        manifest_files: DEFAULT_MANIFEST_FILES,
        redacted_variables: ["GITHUB_PAT"],
      });
    });

    it("should return false if manifest file not in list", () => {
      vi.mocked(homedir).mockReturnValue("/home/user");
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue("maml content");
      vi.mocked(parse).mockReturnValue({
        use_version_control: false,
        manifest_files: DEFAULT_MANIFEST_FILES,
        redacted_variables: ["GITHUB_PAT"],
      });

      const result = removeFromManifestFiles("nonexistent.json");

      expect(result).toBe(false);
      expect(stringify).not.toHaveBeenCalled();
    });
  });
});
