#!/usr/bin/env node

import { consola } from "consola";
import { captureCommand } from "./commands/capture.js";
import { globalDisableGithubCommand } from "./commands/global-disable-github.js";
import { globalEnableGithubCommand } from "./commands/global-enable-github.js";

/** Parse command line arguments */
const args = process.argv.slice(2);
const command = args[0];
const subcommand = args[1];

/** Route to appropriate command */
async function main(): Promise<void> {
  /** Handle 'global' commands */
  if (command === "global") {
    switch (subcommand) {
      case "enable":
        /** Check third argument for enable type */
        if (args[2] === "github") {
          await globalEnableGithubCommand();
        } else {
          consola.error("Unknown enable option. Available: github");
          process.exit(1);
        }
        break;

      case "disable":
        /** Check third argument for disable type */
        if (args[2] === "github") {
          await globalDisableGithubCommand();
        } else {
          consola.error("Unknown disable option. Available: github");
          process.exit(1);
        }
        break;

      default:
        consola.error(`Unknown global command: ${subcommand}`);
        consola.info("Available global commands:");
        consola.info(
          "  envi global enable github     Enable GitHub version control",
        );
        consola.info(
          "  envi global disable github    Disable GitHub version control",
        );
        process.exit(1);
    }
    return;
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
        "  envi global enable github     Enable GitHub version control for env store",
      );
      consola.log(
        "  envi global disable github    Disable GitHub version control",
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
