import { beforeEach, describe, expect, it, vi } from "vitest";
import { isGhAuthenticated, isGhInstalled } from "./github-cli";

vi.mock("node:child_process");
vi.mock("node:util");

describe("github-cli", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isGhInstalled", () => {
    it("should check if gh command is available", async () => {
      /** Test passes if function returns boolean */
      const result = await isGhInstalled();
      expect(typeof result).toBe("boolean");
    });
  });

  describe("isGhAuthenticated", () => {
    it("should check authentication status", async () => {
      /** Test passes if function returns boolean */
      const result = await isGhAuthenticated();
      expect(typeof result).toBe("boolean");
    });
  });
});
