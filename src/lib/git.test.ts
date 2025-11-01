import { existsSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { isGitRepo } from "./git";

vi.mock("node:fs");
vi.mock("node:child_process");
vi.mock("node:util");

describe("git", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isGitRepo", () => {
    it("should return true if .git exists", () => {
      vi.mocked(existsSync).mockReturnValue(true);

      const result = isGitRepo("/project");

      expect(result).toBe(true);
    });

    it("should return false if .git does not exist", () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const result = isGitRepo("/project");

      expect(result).toBe(false);
    });
  });
});
