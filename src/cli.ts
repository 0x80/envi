#!/usr/bin/env node

import { consola } from "consola";
import { captureCommand } from "~/commands/capture";
import { disableCommand as globalGithubDisable } from "~/commands/global/github/disable";
import { enableCommand as globalGithubEnable } from "~/commands/global/github/enable";
import { restoreCommand as globalGithubRestore } from "~/commands/global/github/restore";

/** Parse command line arguments */
const args = process.argv.slice(2);
const command = args[0];
const subcommand = args[1];
const action = args[2];

/** Route to appropriate command */
async function main(): Promise<void> {
  /** Handle 'global' commands */
  if (command === "global") {
    /** Handle 'global github' commands */
    if (subcommand === "github") {
      switch (action) {
        case "enable":
          await globalGithubEnable();
          break;

        case "disable":
          await globalGithubDisable();
          break;

        case "restore":
          await globalGithubRestore();
          break;

        default:
          consola.error(`Unknown github command: ${action}`);
          consola.info("Available github commands:");
          consola.info(
            "  envi global github enable     Enable GitHub version control",
          );
          consola.info(
            "  envi global github disable    Disable GitHub version control",
          );
          consola.info(
            "  envi global github restore    Restore envi store from GitHub",
          );
          process.exit(1);
      }
      return;
    }

    /** Unknown global subcommand */
    consola.error(`Unknown global command: ${subcommand}`);
    consola.info("Available global commands:");
    consola.info(
      "  envi global github [action]    GitHub integration commands",
    );
    process.exit(1);
  }

  /** Handle regular commands */
  switch (command) {
    case "capture":
      await captureCommand();
      break;

    case undefined:
      /** No command specified, show help */
      consola.log("Envi - Environment file management tool");
      consola.log("\nUsage:");
      consola.log(
        "  envi capture                  Capture all .env files from repository",
      );
      consola.log(
        "  envi global github enable     Enable GitHub version control for env store",
      );
      consola.log(
        "  envi global github disable    Disable GitHub version control",
      );
      consola.log(
        "  envi global github restore    Restore envi store from GitHub",
      );
      consola.log(
        "\nFor more information, visit: https://github.com/codecompose/envi",
      );
      break;

    default:
      consola.error(`Unknown command: ${command}`);
      consola.info("Run 'envi' without arguments to see available commands.");
      process.exit(1);
  }
}

main().catch((error) => {
  consola.error("Error:", error);
  process.exit(1);
});
