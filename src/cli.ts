#!/usr/bin/env node

import { defineCommand, runMain } from "citty";
import pkg from "../package.json" with { type: "json" };
import { captureCommand } from "~/commands/capture";
import { clearCommand } from "~/commands/clear";
import { createKeyCommand } from "~/commands/create-key";
import { disableCommand as globalGithubDisable } from "~/commands/global/github/disable";
import { enableCommand as globalGithubEnable } from "~/commands/global/github/enable";
import { restoreCommand as globalGithubRestore } from "~/commands/global/github/restore";
import { globalClearCommand } from "~/commands/global/clear";
import { restoreCommand } from "~/commands/restore";
import { packCommand } from "~/commands/pack";
import { unpackCommand } from "~/commands/unpack";
import {
  configRedactAddCommand,
  configRedactRemoveCommand,
  configRedactListCommand,
} from "~/commands/config-redact";
import {
  configManifestFilesAddCommand,
  configManifestFilesRemoveCommand,
  configManifestFilesListCommand,
} from "~/commands/config-manifest-files";

/** Capture command */
const capture = defineCommand({
  meta: {
    name: "capture",
    description: "Capture all .env and .dev.vars files from repository",
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
    description:
      "Decrypt and restore configuration from blob (reads from clipboard if not provided)",
  },
  args: {
    blob: {
      type: "positional",
      description:
        "Encrypted blob to unpack (optional - reads from clipboard if not provided)",
      required: false,
    },
  },
  async run({ args }) {
    await unpackCommand(args.blob as string | undefined);
  },
});

/** Clear command */
const clear = defineCommand({
  meta: {
    name: "clear",
    description: "Delete stored configuration for current repository",
  },
  async run() {
    await clearCommand();
  },
});

/** Create-key command */
const createKey = defineCommand({
  meta: {
    name: "create-key",
    description:
      "Generate an encryption_key in envi.maml for at-rest encryption",
  },
  args: {
    force: {
      type: "boolean",
      description: "Overwrite an existing encryption_key",
      default: false,
    },
  },
  async run({ args }) {
    await createKeyCommand({ force: args.force });
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

/** Global clear command */
const globalClear = defineCommand({
  meta: {
    name: "clear",
    description: "Delete entire envi directory and all stored configurations",
  },
  async run() {
    await globalClearCommand();
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

/** Config redact add command */
const configRedactAdd = defineCommand({
  meta: {
    name: "add",
    description: "Add a variable to the redaction list",
  },
  args: {
    variable: {
      type: "positional",
      description: "Variable name to redact",
      required: true,
    },
  },
  async run({ args }) {
    await configRedactAddCommand(args.variable);
  },
});

/** Config redact remove command */
const configRedactRemove = defineCommand({
  meta: {
    name: "remove",
    description: "Remove a variable from the redaction list",
  },
  args: {
    variable: {
      type: "positional",
      description: "Variable name to stop redacting",
      required: true,
    },
  },
  async run({ args }) {
    await configRedactRemoveCommand(args.variable);
  },
});

/** Config redact list command */
const configRedactList = defineCommand({
  meta: {
    name: "list",
    description: "List all redacted variables",
  },
  async run() {
    await configRedactListCommand();
  },
});

/** Config redact parent command */
const configRedact = defineCommand({
  meta: {
    name: "redact",
    description: "Manage redacted environment variables",
  },
  subCommands: {
    add: configRedactAdd,
    remove: configRedactRemove,
    list: configRedactList,
  },
});

/** Config manifest_files add command */
const configManifestFilesAdd = defineCommand({
  meta: {
    name: "add",
    description: "Add a manifest file to the list",
  },
  args: {
    filename: {
      type: "positional",
      description: "Manifest filename to add",
      required: true,
    },
  },
  async run({ args }) {
    await configManifestFilesAddCommand(args.filename);
  },
});

/** Config manifest_files remove command */
const configManifestFilesRemove = defineCommand({
  meta: {
    name: "remove",
    description: "Remove a manifest file from the list",
  },
  args: {
    filename: {
      type: "positional",
      description: "Manifest filename to remove",
      required: true,
    },
  },
  async run({ args }) {
    await configManifestFilesRemoveCommand(args.filename);
  },
});

/** Config manifest_files list command */
const configManifestFilesList = defineCommand({
  meta: {
    name: "list",
    description: "List all manifest files",
  },
  async run() {
    await configManifestFilesListCommand();
  },
});

/** Config manifest_files parent command */
const configManifestFiles = defineCommand({
  meta: {
    name: "manifest_files",
    description: "Manage manifest files for package name and encryption",
  },
  subCommands: {
    add: configManifestFilesAdd,
    remove: configManifestFilesRemove,
    list: configManifestFilesList,
  },
});

/** Config parent command */
const config = defineCommand({
  meta: {
    name: "config",
    description: "Configuration management commands",
  },
  subCommands: {
    redact: configRedact,
    manifest_files: configManifestFiles,
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
    clear: globalClear,
  },
});

/** Main CLI command */
const main = defineCommand({
  meta: {
    name: "envi",
    version: pkg.version,
    description: "Environment file management tool",
  },
  subCommands: {
    capture,
    restore,
    pack,
    unpack,
    "create-key": createKey,
    clear,
    config,
    global,
  },
});

void runMain(main);
