import { consola } from "consola";
import { readConfig, updateConfig } from "~/lib";
import { getErrorMessage } from "~/utils";

/**
 * Execute the global github disable command
 *
 * Disables GitHub version control for the envi store
 */
export async function disableCommand(): Promise<void> {
  try {
    const config = readConfig();

    if (config.use_version_control !== "github") {
      consola.info("GitHub version control is not currently enabled.");
      return;
    }

    consola.start("Disabling GitHub version control...");
    updateConfig({ use_version_control: false });
    consola.success("GitHub version control disabled");

    consola.info(
      "\nFuture captures will no longer be committed or pushed to GitHub.",
    );
    consola.info(
      "Your existing GitHub repository will remain unchanged - you can delete it manually if needed.",
    );
  } catch (error) {
    consola.error(getErrorMessage(error));
    process.exit(1);
  }
}
