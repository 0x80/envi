/** Barrel file for lib */
export {
  getConfigPath,
  readConfig,
  updateConfig,
  writeConfig,
} from "./config.js";
export type { EnviConfig } from "./config.js";
export {
  addRemote,
  commitAndPush,
  createInitialCommit,
  initialCommitAndPush,
  initGitRepo,
  isGitRepo,
} from "./git.js";
export {
  cloneRepo,
  createPrivateRepo,
  getGhUsername,
  isGhAuthenticated,
  isGhInstalled,
  repoExists,
} from "./github-cli.js";
export {
  getEnviDir,
  getPackageName,
  getStorageDir,
  getStorageFilename,
  saveToStorage,
} from "./storage.js";
export type { EnviStore } from "./storage.js";
