# API Reference

Use Envi programmatically in your Node.js applications.

## Installation

```bash
pnpm add @codecompose/envi
```

## Commands

### captureCommand()

Capture all environment files from a repository.

```typescript
import { captureCommand } from "@codecompose/envi";

await captureCommand();
```

### restoreCommand()

Restore environment files from storage.

```typescript
import { restoreCommand } from "@codecompose/envi";

await restoreCommand();
```

### clearCommand()

Delete stored configuration for the current project.

```typescript
import { clearCommand } from "@codecompose/envi";

await clearCommand();
```

### createKeyCommand()

Generate `envi.config.maml` with a fresh `encryption_key` in the current repo.

```typescript
import { createKeyCommand } from "@codecompose/envi";

await createKeyCommand({ force: false });
```

### globalClearCommand()

Delete entire envi directory and all stored configurations.

```typescript
import { globalClearCommand } from "@codecompose/envi";

await globalClearCommand();
```

### GitHub Commands

```typescript
import {
  globalGithubEnableCommand,
  globalGithubDisableCommand,
  globalGithubRestoreCommand,
} from "@codecompose/envi";

// Enable GitHub integration
await globalGithubEnableCommand();

// Disable GitHub integration
await globalGithubDisableCommand();

// Restore from GitHub
await globalGithubRestoreCommand();
```

## Utilities

### findRepoRoot()

Find the repository root by traversing up from current directory.

```typescript
import { findRepoRoot } from "@codecompose/envi";

const repoRoot = await findRepoRoot();
// Returns: "/path/to/repo" or null if user cancelled
```

### findEnvFiles()

Find all `.env` files in a directory.

```typescript
import { findEnvFiles } from "@codecompose/envi";

const files = await findEnvFiles("/path/to/repo");
// Returns: [".env", "apps/web/.env.local", ...]
```

### parseEnvFile()

Parse a `.env` file with comment preservation.

```typescript
import { parseEnvFile } from "@codecompose/envi";

const env = parseEnvFile("/path/to/.env");
// Returns: {
//   __l_00: "# Comment",
//   __i_00: "# Inline comment",
//   KEY: "value"
// }
```

## Storage

### getStorageDir()

Get the storage directory path.

```typescript
import { getStorageDir } from "@codecompose/envi";

const dir = getStorageDir();
// Returns: "/Users/you/.envi/store"
```

### getEnviDir()

Get the envi root directory path.

```typescript
import { getEnviDir } from "@codecompose/envi";

const dir = getEnviDir();
// Returns: "/Users/you/.envi"
```

### getPackageName()

Read package name from repository.

```typescript
import { getPackageName } from "@codecompose/envi";

const name = getPackageName("/path/to/repo");
// Returns: "@org/package" or null
```

### saveToStorage()

Save environment configuration to storage.

```typescript
import { saveToStorage } from "@codecompose/envi";

const hasChanges = saveToStorage(
  "/path/to/repo",
  [
    {
      path: ".env",
      env: { KEY: "value" },
    },
  ],
  "@org/package", // Optional package name
  { encryptionKey: null }, // Optional encryption settings
);
// Returns: true if file was updated, false if no changes
```

The optional fourth argument is `SaveToStorageOptions`. When `encryptionKey` is set, each file's `env` block is encrypted with `encrypt(JSON.stringify(env), encryptionKey)` before being written, and the no-op comparison reads/decrypts the existing store with the same key.

## Per-repo Config (envi.config.maml)

Helpers for the per-repo `envi.config.maml` file. The legacy filename `envi.maml` is still read so already-committed files keep working — reads prefer the canonical name and fall back to legacy; writes target whichever file is on disk (and create the canonical name when neither exists).

### KEY_FILE_NAME

```typescript
import { KEY_FILE_NAME } from "@codecompose/envi";

console.log(KEY_FILE_NAME); // "envi.config.maml"
```

### LEGACY_KEY_FILE_NAME

```typescript
import { LEGACY_KEY_FILE_NAME } from "@codecompose/envi";

console.log(LEGACY_KEY_FILE_NAME); // "envi.maml"
```

### generateKey()

Generate a new 32-byte random key as a base64url string.

```typescript
import { generateKey } from "@codecompose/envi";

const key = generateKey();
// Returns: ~43-character base64url string
```

### readEncryptionKey()

Read the `encryption_key` from `envi.config.maml` (preferred) or the legacy `envi.maml` (fallback). Emits a one-time info hint when the legacy file is read.

```typescript
import { readEncryptionKey } from "@codecompose/envi";

const key = readEncryptionKey("/path/to/repo");
// Returns: string or null
```

### readCapturePatterns()

Read additional capture patterns from the per-repo config. Reads from whichever filename is on disk (canonical preferred). Returns `[]` when the file or `capture_patterns` field is missing.

```typescript
import { readCapturePatterns } from "@codecompose/envi";

const patterns = readCapturePatterns("/path/to/repo");
// Returns: string[]
```

### writeEncryptionKey()

Write or update the per-repo config with a key. If only the legacy `envi.maml` is on disk, it is edited in place — migration to the canonical name is left to the user so they can commit the rename. Creates a new `envi.config.maml` with a header comment when neither file exists. Refuses to overwrite an existing `encryption_key` unless `{ force: true }` is passed. Returns the basename of the file that was written (`envi.config.maml` or `envi.maml`).

```typescript
import { writeEncryptionKey } from "@codecompose/envi";

const filename = writeEncryptionKey("/path/to/repo", key, { force: false });
// Throws Error when force is false and a key is already set.
```

### hasKeyFile()

Check whether either `envi.config.maml` or the legacy `envi.maml` exists in a repository (does not check whether `encryption_key` is set inside).

```typescript
import { hasKeyFile } from "@codecompose/envi";

const exists = hasKeyFile("/path/to/repo");
// Returns: boolean
```

### findKeyFile()

Return the basename of the per-repo config file present on disk — `envi.config.maml` if the canonical file exists, `envi.maml` if only the legacy file does, or `null` when neither exists. Use this to surface the actual filename in user-facing messages instead of always naming the canonical constant.

```typescript
import { findKeyFile } from "@codecompose/envi";

const filename = findKeyFile("/path/to/repo");
// Returns: "envi.config.maml" | "envi.maml" | null
```

## Configuration

### readConfig()

Read global configuration.

```typescript
import { readConfig } from "@codecompose/envi";

const config = readConfig();
// Returns: {
//   use_version_control: "github" | false,
//   manifest_files: string[]
// }
```

### writeConfig()

Write global configuration.

```typescript
import { writeConfig } from "@codecompose/envi";

writeConfig({
  use_version_control: "github",
  manifest_files: ["my-custom.json"],
});
```

### updateConfig()

Update global configuration (merges with existing).

```typescript
import { updateConfig } from "@codecompose/envi";

// Update version control setting
updateConfig({ use_version_control: false });

// Add additional manifest files to check (on top of defaults)
updateConfig({
  manifest_files: [
    "my-custom.json", // Custom manifest file
    "app.yaml", // Another custom manifest
  ],
});
```

## Multi-Language Support

### getPackageName()

Extract package name from manifest files (supports multiple languages).

```typescript
import { getPackageName } from "@codecompose/envi";

const name = getPackageName("/path/to/repo");
// Returns package name from:
// - package.json (JavaScript/TypeScript)
// - Cargo.toml (Rust)
// - go.mod (Go)
// - pyproject.toml (Python)
// - composer.json (PHP)
// - pubspec.yaml (Dart/Flutter)
// - settings.gradle.kts (Kotlin)
// - settings.gradle (Java/Gradle)
// - pom.xml (Java/Maven)
```

### DEFAULT_MANIFEST_FILES

List of default manifest files checked for package name detection.

```typescript
import { DEFAULT_MANIFEST_FILES } from "@codecompose/envi";

console.log(DEFAULT_MANIFEST_FILES);
// [
//   "package.json",
//   "Cargo.toml",
//   "go.mod",
//   "pyproject.toml",
//   "composer.json",
//   "pubspec.yaml",
//   "settings.gradle.kts",
//   "settings.gradle",
//   "pom.xml"
// ]
```

### PACKAGE_EXTRACTORS

Registry of all available package extractors.

```typescript
import { PACKAGE_EXTRACTORS } from "@codecompose/envi";

// Find specific extractor
const rustExtractor = PACKAGE_EXTRACTORS.find(
  (e) => e.filename === "Cargo.toml",
);

if (rustExtractor) {
  const packageName = rustExtractor.extract("/path/to/rust/project");
  console.log(packageName); // "my-rust-app"
}

// Try all extractors
for (const extractor of PACKAGE_EXTRACTORS) {
  const name = extractor.extract("/path/to/project");
  if (name) {
    console.log(`Found ${name} from ${extractor.filename}`);
    break;
  }
}
```

### PackageExtractor Type

Interface for custom package extractors.

```typescript
import type { PackageExtractor } from "@codecompose/envi";

const customExtractor: PackageExtractor = {
  filename: "my-manifest.json",
  extract: (repoPath: string): string | null => {
    // Custom extraction logic
    return "custom-package-name";
  },
};
```

## Git Operations

### isGitRepo()

Check if directory is a git repository.

```typescript
import { isGitRepo } from "@codecompose/envi";

const isRepo = isGitRepo("/path/to/dir");
// Returns: boolean
```

### initGitRepo()

Initialize a git repository.

```typescript
import { initGitRepo } from "@codecompose/envi";

await initGitRepo("/path/to/dir");
```

### commitAndPush()

Commit all changes and push to remote.

```typescript
import { commitAndPush } from "@codecompose/envi";

await commitAndPush("/path/to/repo", "Update env files");
```

## GitHub CLI

### isGhInstalled()

Check if GitHub CLI is installed.

```typescript
import { isGhInstalled } from "@codecompose/envi";

const installed = await isGhInstalled();
// Returns: boolean
```

### isGhAuthenticated()

Check if authenticated with GitHub CLI.

```typescript
import { isGhAuthenticated } from "@codecompose/envi";

const authed = await isGhAuthenticated();
// Returns: boolean
```

### getGhUsername()

Get authenticated GitHub username.

```typescript
import { getGhUsername } from "@codecompose/envi";

const username = await getGhUsername();
// Returns: "your-username"
```

### repoExists()

Check if a GitHub repository exists.

```typescript
import { repoExists } from "@codecompose/envi";

const exists = await repoExists("envi-store");
// Returns: boolean
```

## Types

### EnviStore

Structure of stored MAML files.

```typescript
import type { EnviStore, EnviStoreFile } from "@codecompose/envi";

const store: EnviStore = {
  __envi_version: 1,
  metadata: {
    updated_from: "/path/to/repo",
    updated_at: "2025-11-01T12:00:00.000Z",
  },
  files: [
    {
      path: ".env",
      env: { KEY: "value" },
    },
  ],
};
```

`EnviStore.files` is an array of `EnviStoreFile`, a discriminated union:

```typescript
type EnviStoreFile =
  | { path: string; env: EnvObject } // plaintext
  | { path: string; encrypted_env: string }; // ciphertext (base64)
```

The `encrypted_env` variant is produced when `saveToStorage` is called with `{ encryptionKey }`. The base64 string is `encrypt(JSON.stringify(env), key)` from `~/utils/encryption`.

### EnvObject

Parsed environment file object.

```typescript
import type { EnvObject } from "@codecompose/envi";

const env: EnvObject = {
  __l_00: "# Comment",
  __i_00: "# Inline comment",
  KEY: "value",
};
```

### EnviConfig

Global configuration structure.

```typescript
import type { EnviConfig } from "@codecompose/envi";

const config: EnviConfig = {
  use_version_control: "github" | false,
  manifest_files: string[],
};

// Example with custom values (adds to defaults)
const customConfig: EnviConfig = {
  use_version_control: false,
  manifest_files: [
    "my-custom.json",  // Checked before defaults
    "app.yaml",
  ],
};
```

### PackageExtractor

Package extractor interface.

```typescript
import type { PackageExtractor } from "@codecompose/envi";

interface PackageExtractor {
  /** The filename to look for in repository root */
  filename: string;
  /** Extract package name from file, returns null if extraction fails */
  extract: (repositoryPath: string) => string | null;
}
```

## Example: Custom Backup Script

```typescript
import {
  findRepoRoot,
  findEnvFiles,
  parseEnvFile,
  saveToStorage,
} from "@codecompose/envi";
import { join } from "node:path";

async function backupEnvFiles(repoPath: string) {
  // Find repository root
  const root = await findRepoRoot(repoPath);
  if (!root) {
    throw new Error("Not a repository");
  }

  // Find all env files
  const filePaths = await findEnvFiles(root);

  // Parse each file
  const envFiles = filePaths.map((relativePath) => {
    const absolutePath = join(root, relativePath);
    const env = parseEnvFile(absolutePath);
    return { path: relativePath, env };
  });

  // Save to storage
  const hasChanges = saveToStorage(root, envFiles);

  return { hasChanges, fileCount: envFiles.length };
}

// Usage
const result = await backupEnvFiles(process.cwd());
console.log(`Backed up ${result.fileCount} files`);
```
