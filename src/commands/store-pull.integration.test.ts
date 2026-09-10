import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { consola } from "consola";
import { stringify } from "maml.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const testState = vi.hoisted(() => ({ homeDir: "" }));

vi.mock("node:os", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:os")>();
  return { ...original, homedir: () => testState.homeDir };
});

import { restoreCommand } from "./restore";
import { unpackCommand } from "./unpack";

interface StoreRepository {
  enviDir: string;
  projectDir: string;
  rootDir: string;
}

function runGit(cwd: string, ...args: string[]): void {
  execFileSync("git", args, { cwd, stdio: "ignore" });
}

function writeStoreFile(rootDir: string, value: string): void {
  const storePath = join(rootDir, "store", "pull-test.maml");
  mkdirSync(dirname(storePath), { recursive: true });
  writeFileSync(
    storePath,
    stringify({
      __envi_version: 1,
      metadata: {
        updated_from: "/project",
        updated_at: "2026-09-10T00:00:00.000Z",
      },
      files: [{ path: ".env", env: { VALUE: value } }],
    }),
  );
}

function createStoreRepository(): StoreRepository {
  const rootDir = mkdtempSync(join(tmpdir(), "envi-store-pull-"));
  const remoteDir = join(rootDir, "remote.git");
  const seedDir = join(rootDir, "seed");
  const homeDir = join(rootDir, "home");
  const enviDir = join(homeDir, ".envi");
  const projectDir = join(rootDir, "project");

  mkdirSync(remoteDir, { recursive: true });
  runGit(remoteDir, "init", "--bare", "--initial-branch=main");

  mkdirSync(seedDir, { recursive: true });
  runGit(seedDir, "init", "--initial-branch=main");
  runGit(seedDir, "config", "user.email", "test@example.com");
  runGit(seedDir, "config", "user.name", "Test");
  writeFileSync(
    join(seedDir, "config.maml"),
    stringify({
      use_version_control: "github",
      manifest_files: ["package.json"],
      redacted_variables: [],
    }),
  );
  writeStoreFile(seedDir, "old");
  runGit(seedDir, "add", ".");
  runGit(seedDir, "commit", "-m", "Initial store");
  runGit(seedDir, "remote", "add", "origin", remoteDir);
  runGit(seedDir, "push", "-u", "origin", "main");

  mkdirSync(homeDir, { recursive: true });
  runGit(homeDir, "clone", remoteDir, enviDir);

  writeStoreFile(seedDir, "latest");
  runGit(seedDir, "add", ".");
  runGit(seedDir, "commit", "-m", "Update store");
  runGit(seedDir, "push");

  mkdirSync(join(projectDir, ".git"), { recursive: true });
  writeFileSync(
    join(projectDir, "package.json"),
    JSON.stringify({ name: "pull-test" }),
  );

  testState.homeDir = homeDir;
  return { enviDir, projectDir, rootDir };
}

describe("store synchronization before restore commands", () => {
  let originalWorkingDirectory: string;
  let repository: StoreRepository;

  beforeEach(() => {
    originalWorkingDirectory = process.cwd();
    repository = createStoreRepository();
    process.chdir(repository.projectDir);
  });

  afterEach(() => {
    process.chdir(originalWorkingDirectory);
    rmSync(repository.rootDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("restores values from the latest remote store by default", async () => {
    await restoreCommand();

    expect(readFileSync(join(repository.projectDir, ".env"), "utf8")).toBe(
      "VALUE=latest\n",
    );
  });

  it("restores local values when pulling is disabled", async () => {
    await restoreCommand({ pull: false });

    expect(readFileSync(join(repository.projectDir, ".env"), "utf8")).toBe(
      "VALUE=old\n",
    );
  });

  it("pulls the store before unpack parses its blob", async () => {
    vi.spyOn(consola, "error").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process exited");
    });

    await expect(unpackCommand("invalid")).rejects.toThrow("process exited");
    expect(
      readFileSync(join(repository.enviDir, "store", "pull-test.maml"), "utf8"),
    ).toContain("latest");
  });

  it("leaves the local store unchanged when unpack pulling is disabled", async () => {
    vi.spyOn(consola, "error").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process exited");
    });

    await expect(unpackCommand("invalid", { pull: false })).rejects.toThrow(
      "process exited",
    );
    expect(
      readFileSync(join(repository.enviDir, "store", "pull-test.maml"), "utf8"),
    ).toContain("old");
  });
});
