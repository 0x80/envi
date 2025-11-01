#!/usr/bin/env node

import { defineCommand, runMain } from "citty";
import { captureCommand } from "~/commands/capture";
import { disableCommand as globalGithubDisable } from "~/commands/global/github/disable";
import { enableCommand as globalGithubEnable } from "~/commands/global/github/enable";
import { restoreCommand as globalGithubRestore } from "~/commands/global/github/restore";
import { restoreCommand } from "~/commands/restore";
import { packCommand } from "~/commands/pack";
import { unpackCommand } from "~/commands/unpack";

/** Capture command */
const capture = defineCommand({
  meta: {
    name: "capture",
    description: "Capture all .env files from repository",
  },
  async run() {
    await captureCommand();
  },
});

/** Restore command */
const restore = defineCommand({
  meta: {
    name: "restore",
    description: "Restore env files from storage to repository",
  },
  async run() {
    await restoreCommand();
  },
});

/** Pack command */
const pack = defineCommand({
  meta: {
    name: "pack",
    description: "Create encrypted blob from stored configuration for sharing",
  },
  async run() {
    await packCommand();
  },
});

/** Unpack command */
const unpack = defineCommand({
  meta: {
    name: "unpack",
    description: "Decrypt and restore configuration from blob (reads from clipboard if not provided)",
  },
  args: {
    blob: {
      type: "positional",
      description: "Encrypted blob to unpack (optional - reads from clipboard if not provided)",
      required: false,
    },
  },
  async run({ args }) {
    await unpackCommand(args.blob as string | undefined);
  },
});

/** Global GitHub enable command */
const githubEnable = defineCommand({
  meta: {
    name: "enable",
    description: "Enable GitHub version control for env store",
  },
  async run() {
    await globalGithubEnable();
  },
});

/** Global GitHub disable command */
const githubDisable = defineCommand({
  meta: {
    name: "disable",
    description: "Disable GitHub version control",
  },
  async run() {
    await globalGithubDisable();
  },
});

/** Global GitHub restore command */
const githubRestore = defineCommand({
  meta: {
    name: "restore",
    description: "Restore envi store from GitHub",
  },
  async run() {
    await globalGithubRestore();
  },
});

/** Global GitHub parent command */
const github = defineCommand({
  meta: {
    name: "github",
    description: "GitHub integration commands",
  },
  subCommands: {
    enable: githubEnable,
    disable: githubDisable,
    restore: githubRestore,
  },
});

/** Global parent command */
const global = defineCommand({
  meta: {
    name: "global",
    description: "Global configuration commands",
  },
  subCommands: {
    github,
  },
});

/** Main CLI command */
const main = defineCommand({
  meta: {
    name: "envi",
    version: "1.0.0",
    description: "Environment file management tool",
  },
  subCommands: {
    capture,
    restore,
    pack,
    unpack,
    global,
  },
});

runMain(main);
