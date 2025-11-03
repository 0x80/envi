import { consola } from "consola";
import * as p from "@clack/prompts";
import {
  getRedactedVariables,
  addToRedactionList,
  removeFromRedactionList,
} from "~/lib/config";
import { getErrorMessage } from "~/utils";

/** Add a variable to the redaction list */
export async function configRedactAddCommand(variable: string): Promise<void> {
  try {
    if (!variable) {
      consola.error("Variable name is required");
      consola.info("Usage: envi config redact add <VARIABLE>");
      process.exit(1);
    }

    const currentList = getRedactedVariables();

    if (currentList.includes(variable)) {
      consola.warn(`${variable} is already in the redaction list`);
      return;
    }

    const confirm = await p.confirm({
      message: `Add ${variable} to redaction list?`,
      initialValue: true,
    });

    if (p.isCancel(confirm) || !confirm) {
      consola.info("Operation cancelled");
      return;
    }

    addToRedactionList(variable);
    consola.success(`Added ${variable} to redaction list`);
    consola.info(
      `This variable will be replaced with __envi_redacted__ in capture and pack operations`,
    );
  } catch (error) {
    consola.error(getErrorMessage(error));
    process.exit(1);
  }
}

/** Remove a variable from the redaction list */
export async function configRedactRemoveCommand(
  variable: string,
): Promise<void> {
  try {
    if (!variable) {
      consola.error("Variable name is required");
      consola.info("Usage: envi config redact remove <VARIABLE>");
      process.exit(1);
    }

    const currentList = getRedactedVariables();

    if (!currentList.includes(variable)) {
      consola.warn(`${variable} is not in the redaction list`);
      return;
    }

    const confirm = await p.confirm({
      message: `Remove ${variable} from redaction list?`,
      initialValue: true,
    });

    if (p.isCancel(confirm) || !confirm) {
      consola.info("Operation cancelled");
      return;
    }

    const removed = removeFromRedactionList(variable);

    if (removed) {
      consola.success(`Removed ${variable} from redaction list`);
      consola.info(
        `This variable will no longer be redacted in capture and pack operations`,
      );
    } else {
      consola.error(`Failed to remove ${variable} from redaction list`);
      process.exit(1);
    }
  } catch (error) {
    consola.error(getErrorMessage(error));
    process.exit(1);
  }
}

/** List all redacted variables */
export async function configRedactListCommand(): Promise<void> {
  try {
    const redactedVariables = getRedactedVariables();

    if (redactedVariables.length === 0) {
      consola.info("No variables are currently redacted");
      consola.info("Use 'envi config redact add <VARIABLE>' to add one");
      return;
    }

    consola.box(
      `Redacted Variables (${redactedVariables.length}):\n\n` +
        redactedVariables.map((v) => `  • ${v}`).join("\n") +
        "\n\nThese variables will be replaced with __envi_redacted__ when capturing or packing.",
    );
  } catch (error) {
    consola.error(getErrorMessage(error));
    process.exit(1);
  }
}
