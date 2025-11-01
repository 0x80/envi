import fg from "fast-glob";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { findEnvFiles } from "./find-env-files.js";

vi.mock("fast-glob");

describe("findEnvFiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should find .env file", async () => {
    const repoRoot = "/project";
    vi.mocked(fg).mockResolvedValue([".env"]);

    const result = await findEnvFiles(repoRoot);

    expect(result).toEqual([".env"]);
    expect(fg).toHaveBeenCalledWith(
      [".env", ".env.*"],
      expect.objectContaining({
        cwd: repoRoot,
        dot: true,
        absolute: false,
      }),
    );
  });

  it("should find .env.* files", async () => {
    const repoRoot = "/project";
    vi.mocked(fg).mockResolvedValue([
      ".env.local",
      ".env.production",
      ".env.development",
    ]);

    const result = await findEnvFiles(repoRoot);

    expect(result).toEqual([
      ".env.local",
      ".env.production",
      ".env.development",
    ]);
  });

  it("should find nested env files", async () => {
    const repoRoot = "/project";
    vi.mocked(fg).mockResolvedValue([
      ".env",
      "apps/web/.env.local",
      "packages/api/.env",
    ]);

    const result = await findEnvFiles(repoRoot);

    expect(result).toEqual([
      ".env",
      "apps/web/.env.local",
      "packages/api/.env",
    ]);
  });
});
