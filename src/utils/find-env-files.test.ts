import fg from "fast-glob";
import { existsSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { findEnvFiles } from "./find-env-files.js";

vi.mock("fast-glob");
vi.mock("node:fs");
vi.mock("ignore");

describe("findEnvFiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should find .env file in root and subdirectories", async () => {
    const repoRoot = "/project";
    vi.mocked(existsSync).mockReturnValue(false); // No .gitignore
    vi.mocked(fg).mockResolvedValue([".env"]);

    const result = await findEnvFiles(repoRoot);

    expect(result).toEqual([".env"]);
    expect(fg).toHaveBeenCalledWith(
      [".env", ".env.*", "**/.env", "**/.env.*"],
      expect.objectContaining({
        cwd: repoRoot,
        dot: true,
        absolute: false,
        ignore: expect.arrayContaining([
          "node_modules/**",
          ".git/**",
          "dist/**",
          "build/**",
        ]),
      }),
    );
  });

  it("should find .env.* files recursively", async () => {
    const repoRoot = "/project";
    vi.mocked(existsSync).mockReturnValue(false);
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

  it("should find nested env files in subdirectories", async () => {
    const repoRoot = "/project";
    vi.mocked(existsSync).mockReturnValue(false);
    vi.mocked(fg).mockResolvedValue([
      ".env",
      "apps/web/.env.local",
      "packages/api/.env",
      "services/fns/.env.stafftraveler",
    ]);

    const result = await findEnvFiles(repoRoot);

    expect(result).toEqual([
      ".env",
      "apps/web/.env.local",
      "packages/api/.env",
      "services/fns/.env.stafftraveler",
    ]);
  });

  it("should include default ignore patterns when no gitignore", async () => {
    const repoRoot = "/project";

    vi.mocked(existsSync).mockReturnValue(false); // No .gitignore
    vi.mocked(fg).mockResolvedValue([".env"]);

    await findEnvFiles(repoRoot);

    const call = vi.mocked(fg).mock.calls[0];
    const options = call?.[1];

    /** Should include all default patterns */
    expect(options?.ignore).toContain("node_modules/**");
    expect(options?.ignore).toContain(".git/**");
    expect(options?.ignore).toContain("dist/**");
    expect(options?.ignore).toContain("build/**");
    expect(options?.ignore).toContain(".next/**");
    expect(options?.ignore).toContain(".turbo/**");
  });

  it("should handle missing .gitignore gracefully", async () => {
    const repoRoot = "/project";
    vi.mocked(existsSync).mockReturnValue(false);
    vi.mocked(fg).mockResolvedValue([".env"]);

    await findEnvFiles(repoRoot);

    expect(fg).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({
        ignore: expect.arrayContaining([
          "node_modules/**",
          ".git/**",
          "dist/**",
          "build/**",
        ]),
      }),
    );
  });
});
