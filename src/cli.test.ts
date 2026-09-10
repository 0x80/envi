import { runCommand, runMain } from "citty";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { restoreCommand } from "~/commands/restore";
import { unpackCommand } from "~/commands/unpack";

vi.mock("citty", async (importOriginal) => {
  const original = await importOriginal<typeof import("citty")>();
  return { ...original, runMain: vi.fn() };
});
vi.mock("~/commands/restore", () => ({ restoreCommand: vi.fn() }));
vi.mock("~/commands/unpack", () => ({ unpackCommand: vi.fn() }));

describe("CLI store pull options", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    await import("./cli");
  });

  it("passes pull false to restore for --no-pull", async () => {
    const mainCommand = vi.mocked(runMain).mock.calls[0]?.[0];
    expect(mainCommand).toBeDefined();

    await runCommand(mainCommand!, { rawArgs: ["restore", "--no-pull"] });

    expect(restoreCommand).toHaveBeenCalledWith({ pull: false });
  });

  it("passes pull false to unpack for --no-pull", async () => {
    const mainCommand = vi.mocked(runMain).mock.calls[0]?.[0];
    expect(mainCommand).toBeDefined();

    await runCommand(mainCommand!, {
      rawArgs: ["unpack", "--no-pull", "encrypted-blob"],
    });

    expect(unpackCommand).toHaveBeenCalledWith("encrypted-blob", {
      pull: false,
    });
  });
});
