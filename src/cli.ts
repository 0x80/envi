#!/usr/bin/env node

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
      console.log("Envi - Environment file management tool");
      console.log("\nUsage:");
      console.log("  envi capture    Capture all .env files from repository");
      console.log(
        "\nFor more information, visit: https://github.com/codecompose/envi",
      );
      break;

    default:
      console.error(`Unknown command: ${command}`);
      console.log("Run 'envi' without arguments to see available commands.");
      process.exit(1);
  }
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
