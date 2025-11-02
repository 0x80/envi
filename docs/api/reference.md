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
);
// Returns: true if file was updated, false if no changes
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
  manifest_files: ["my-custom.json"]
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
    "my-custom.json",  // Custom manifest file
    "app.yaml"         // Another custom manifest
  ]
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
  e => e.filename === "Cargo.toml"
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
  }
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
import type { EnviStore } from "@codecompose/envi";

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
