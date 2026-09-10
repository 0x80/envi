import { consola } from "consola";
import { getErrorMessage } from "~/utils/get-error-message";
import { readConfig } from "./config";
import { isGitRepo, pullLatest } from "./git";
import { getEnviDir } from "./storage";

export interface StoreSyncOptions {
  pull?: boolean;
}

export type StoreSyncResult = "pulled" | "skipped" | "failed";

/**
 * Pull the GitHub-backed envi store before a command reads or writes it.
 *
 * Pull failures are non-fatal so the local store remains usable offline.
 *
 * @param options - Store synchronization options
 * @returns Whether the store was pulled, skipped, or could not be pulled
 */
export async function syncStoreBeforeRead(
  options: StoreSyncOptions = {},
): Promise<StoreSyncResult> {
  if (options.pull === false) {
    return "skipped";
  }

  const config = readConfig();
  const enviDir = getEnviDir();
  if (config.use_version_control !== "github" || !isGitRepo(enviDir)) {
    return "skipped";
  }

  try {
    await pullLatest(enviDir);
    return "pulled";
  } catch (error) {
    consola.warn(
      `Could not update the local envi store. Continuing with local data, which may be stale: ${getErrorMessage(error)}`,
    );
    return "failed";
  }
}
