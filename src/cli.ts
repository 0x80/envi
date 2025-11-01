#!/usr/bin/env node

import { consola } from "consola";
import { captureCommand } from "./commands/capture.js";

/** Parse command line arguments */
const args = process.argv.slice(2);
const command = args[0];

/** Route to appropriate command */
async function main(): Promise<void> {
  switch (command) {
    case "capture":
      await captureCommand();
      break;

    case undefined:
      /** No command specified, show help */
      consola.log("Envi - Environment file management tool");
      consola.log("\nUsage:");
      consola.log("  envi capture    Capture all .env files from repository");
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
