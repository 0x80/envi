# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Envi is an environment file management tool that captures, stores, and restores `.env` files across projects. It provides centralized storage for environment configurations with optional GitHub version control.

Key features:

- Captures all `.env` and `.env.*` files from repositories
- Stores configurations in MAML format at `~/.envi/store/`
- Preserves both full-line and inline comments
- Optional GitHub integration for version control
- Supports monorepos and scoped packages
- Optional per-repo at-rest encryption via `envi.maml` with an `encryption_key`

## Development Commands

### Build and Development

```bash
pnpm build              # Build with tsdown
pnpm dev                # Watch mode with tsdown
pnpm prepare            # Auto-runs build (pre-commit hook)
```

### Testing

```bash
pnpm test               # Run tests with Vitest
pnpm test:ui            # Run tests with UI
pnpm test:coverage      # Run tests with coverage
vitest path/to/test.ts  # Run single test file
```

### Code Quality

```bash
pnpm lint               # Lint with oxlint
pnpm lint:fix           # Auto-fix linting issues
pnpm format             # Format with Prettier
pnpm check-format       # Check if code is formatted
pnpm check-types        # TypeScript type checking
```

### Documentation

```bash
pnpm docs:dev           # Start VitePress dev server
pnpm docs:build         # Build documentation
pnpm docs:preview       # Preview built docs
```

## Architecture

### Core Data Flow

**Capture Flow:**

1. `findRepoRoot()` - Locates repository root (checks for VCS markers: `.git`, `.jj`, `.hg`, `.svn`, prompts if not found)
2. `findEnvFiles()` - Searches for `.env` and `.env.*` files using fast-glob, respecting `.gitignore` directory patterns
3. `parseEnvFile()` - Parses each file, preserving comments as special keys (`__l_00`, `__l_01` for full-line comments; `__i_00`, `__i_01` for inline comments)
4. `readEncryptionKey()` from `src/lib/key-file.ts` - Reads `envi.maml` in the repo root and returns its `encryption_key` field, if any
5. `saveToStorage()` - Saves to `~/.envi/store/[package-name].maml` or `~/.envi/store/[folder-name].maml`. With an `encryptionKey`, each file's `env` block is encrypted and stored as `encrypted_env`; the no-op comparison decrypts the existing store and compares plaintext-to-plaintext. Always rewrites when the on-disk format doesn't match the requested format.
6. If GitHub integration enabled: `commitAndPush()` commits changes to version control

**Restore Flow:**

1. `findRepoRoot()` - Locates repository root
2. Loads stored MAML from `~/.envi/store/` based on package name or folder name
3. If any entry uses `encrypted_env`, reads the `encryption_key` from `envi.maml`; errors clearly if missing. Decrypts each entry to plaintext before the per-file loop.
4. For each file: compares with existing file (if present), prompts for overwrite if different
5. `writeEnvFile()` - Reconstructs `.env` files from parsed object, restoring comments in original positions

### Key Modules

**Storage (`src/lib/storage.ts`)**

- Manages `~/.envi/store/` directory and MAML file operations
- Storage filename logic: scoped packages create subdirectories (`@org/name.maml`), unscoped use `name.maml`, fallback to folder name
- `EnviStoreFile` is a discriminated union: `{ path, env }` (plaintext) or `{ path, encrypted_env }` (base64 ciphertext of `JSON.stringify(env)`)
- `isContentIdentical()` compares in plaintext space, decrypting existing encrypted entries with the provided key. Forces a rewrite when the requested format differs from on-disk so `create-key` followed by `capture` reliably switches the store
- MAML structure: `{ __envi_version, metadata: { updated_from, updated_at }, files: EnviStoreFile[] }`

**Key File (`src/lib/key-file.ts`)**

- Per-repo `envi.maml` config file at the repository root (no leading dot — meant to be committed)
- `KEY_FILE_NAME = "envi.maml"`, `readEncryptionKey()`, `writeEncryptionKey()`, `generateKey()`, `hasKeyFile()`
- `writeEncryptionKey` text-edits the file when it already exists, so user comments and other top-level fields are preserved across the insert/update
- `encryption_key` is opaque (32 random bytes, base64url-encoded) and used directly as the secret for `encrypt()` / `decrypt()` in `src/utils/encryption.ts`

**Config (`src/lib/config.ts`)**

- Global config stored at `~/.envi/config.maml` (machine-wide)
- Currently supports `use_version_control: "github" | false`, `manifest_files`, `redacted_variables`
- Merges with defaults when reading, creates directory if missing

**Git/GitHub (`src/lib/git.ts`, `src/lib/github-cli.ts`)**

- GitHub integration uses `gh` CLI (checks with `isGhInstalled()`, `isGhAuthenticated()`)
- Creates private repo `envi-store` for authenticated user
- All git operations use `execa` for process execution
- `commitAndPush()` checks for actual changes before committing

**Env Parsing (`src/utils/parse-env-file.ts`)**

- Comments preserved as `__c00`, `__c01`, etc. (zero-padded incremental keys)
- Inline comments stored as `__i00`, `__i01`, etc., positioned before their associated key-value
- Handles quoted values (both single and double quotes)
- Tracks quote state to properly identify `#` in comments vs values

**File Discovery (`src/utils/find-env-files.ts`)**

- Uses `fast-glob` with patterns: `.env`, `.env.*`, `**/.env`, `**/.env.*`
- Combines default ignore patterns (node_modules, dist, build, etc.) with `.gitignore` directory patterns
- Only respects directory patterns from `.gitignore`, not file patterns (so `.env` files are found even if gitignored)

**CLI (`src/cli.ts`)**

- Built with `citty` framework
- Command hierarchy: main > {capture, restore, global > github > {enable, disable, restore}}
- Uses `@clack/prompts` for interactive CLI prompts
- Uses `consola` for structured logging

### Path Resolution

The project uses TypeScript path aliases:

- `~` maps to `./src` (configured in vitest.config.ts and tsdown)
- All imports use `~/` prefix for internal modules

### Testing

Tests use Vitest with:

- Global test environment enabled
- Node environment
- Path alias `~` for imports
- V8 coverage provider

## Code Style

- Use kebab-case for all files and folders
- Prefer full variable names over abbreviations (see user's global CLAUDE.md preferences)
- Use PNPM as package manager
- Follow existing comment style (JSDoc for functions)
- Preserve MAML key ordering (critical for comment preservation)

## Important Implementation Notes

1. **Comment Preservation**: The entire system relies on MAML preserving key order. Comments must maintain their position relative to environment variables through the capture → store → restore cycle.

2. **Storage Filename Logic**: Package name from `package.json` takes precedence; falls back to folder name. Scoped packages create subdirectories in storage.

3. **Content Comparison**: When capturing or restoring, compare parsed env objects (not raw strings) to ignore formatting differences while detecting actual changes.

4. **Repository Root Detection**: Always starts from CWD, traverses up to find VCS markers (`.git`, `.jj`, `.hg`, `.svn`), prompts user if not found to prevent accidental execution in wrong directory.

5. **GitHub Integration**: Requires `gh` CLI installed and authenticated. Creates/uses private `envi-store` repository. Only commits if actual file changes detected.

6. **Error Handling**: Uses `getErrorMessage()` utility to safely extract error messages from unknown error types.

7. **At-Rest Encryption**: Opt-in via `envi.maml` in the source repo (generated by `envi create-key`). `pack`/`unpack` prefer this key over manifest-derived keys. The on-disk format per file is determined per-entry (`env` vs `encrypted_env`), so a single store can mix during transitions; `saveToStorage` always rewrites when the on-disk shape doesn't match the requested format.
