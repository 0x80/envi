import { consola } from "consola";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getEnviDir } from "./storage";
import { isGitRepo, pullLatest } from "./git";
import { readConfig } from "./config";
import { syncStoreBeforeRead } from "./store-sync";

vi.mock("./config");
vi.mock("./git");
vi.mock("./storage");

describe("syncStoreBeforeRead", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getEnviDir).mockReturnValue("/envi");
    vi.mocked(readConfig).mockReturnValue({
      use_version_control: "github",
      manifest_files: [],
      redacted_variables: [],
    });
    vi.mocked(isGitRepo).mockReturnValue(true);
    vi.mocked(pullLatest).mockResolvedValue(undefined);
  });

  it("reports that it pulled a GitHub-backed store", async () => {
    await expect(syncStoreBeforeRead()).resolves.toBe("pulled");
  });

  it("skips synchronization when pulling is disabled", async () => {
    await expect(syncStoreBeforeRead({ pull: false })).resolves.toBe("skipped");
    expect(pullLatest).not.toHaveBeenCalled();
  });

  it("skips synchronization when GitHub version control is disabled", async () => {
    vi.mocked(readConfig).mockReturnValue({
      use_version_control: false,
      manifest_files: [],
      redacted_variables: [],
    });

    await expect(syncStoreBeforeRead()).resolves.toBe("skipped");
    expect(pullLatest).not.toHaveBeenCalled();
  });

  it("skips synchronization when the envi directory is not a git repository", async () => {
    vi.mocked(isGitRepo).mockReturnValue(false);

    await expect(syncStoreBeforeRead()).resolves.toBe("skipped");
    expect(pullLatest).not.toHaveBeenCalled();
  });

  it("warns and continues with the local store when pulling fails", async () => {
    vi.mocked(pullLatest).mockRejectedValue(new Error("network unavailable"));
    const warning = vi.spyOn(consola, "warn").mockImplementation(() => {});

    await expect(syncStoreBeforeRead()).resolves.toBe("failed");
    expect(warning).toHaveBeenCalledWith(
      expect.stringMatching(/local envi store.*stale.*network unavailable/i),
    );
  });
});
