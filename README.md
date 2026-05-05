# Envi

Capture, store, and restore files that live outside of version control — `.env`, Cloudflare Workers `.dev.vars`, and any other filename you declare per repo — across your projects.

[![NPM Version](https://img.shields.io/npm/v/@codecompose/envi)](https://www.npmjs.com/package/@codecompose/envi)
[![License](https://img.shields.io/npm/l/@codecompose/envi)](LICENSE)
[![Documentation](https://img.shields.io/badge/docs-envi.codecompose.dev-blue)](https://envi.codecompose.dev)

## Features

- **Centralized Storage** - Capture `.env`, Cloudflare Workers `.dev.vars`, and any extra filenames you list under `capture_patterns` in `envi.config.maml` — all into a central, version-controlled location
- **Extensible per repo** - Declare your own filename patterns (`.envrc`, framework-specific dotfiles, anything in `KEY=value` format) without waiting on a release
- **Easy Restoration** - Restore captured files on new systems or git worktrees when working with parallel AI agents
- **Secure Sharing** - Share configurations safely with team members using encrypted, compressed blobs
- **At-Rest Encryption** - Optional per-repo encryption key (`envi.config.maml`) encrypts captured values in storage and the GitHub backup
- **GitHub Integration** - Optional automatic version control
- **Comment Preservation** - Keeps full-line and inline comments
- **Monorepo Support** - Works seamlessly with monorepos
- **100% Test Coverage** - Core logic (encryption, parsing, storage) fully tested

## Quick Start

```bash
# Install globally
pnpm add -g @codecompose/envi

# Capture env files
cd /path/to/your/project
envi capture

# Restore env files
envi restore
```

**[→ Full Installation Guide](https://envi.codecompose.dev/getting-started)**

## Documentation

Visit **[envi.codecompose.dev](https://envi.codecompose.dev)** for complete documentation including:

- **[Getting Started](https://envi.codecompose.dev/getting-started)** - Installation and basic usage
- **[Commands](https://envi.codecompose.dev/commands/capture)** - Detailed command documentation
- **[Git Worktrees with AI Tools](https://envi.codecompose.dev/guides/git-worktrees)** - Configure parallel agents
- **[Multi-Language Support](https://envi.codecompose.dev/guides/multi-language-support)** - Using with Rust, Go, Python, and more
- **[GitHub Integration](https://envi.codecompose.dev/guides/github-integration)** - Set up automatic version control
- **[Monorepo Support](https://envi.codecompose.dev/guides/monorepo)** - Working with monorepos

## Commands

- `envi capture` - Capture files outside of version control (`.env`, `.dev.vars`, plus any `capture_patterns` you declare) from a repository
- `envi restore` - Restore captured files from storage
- `envi pack` - Create encrypted blob for sharing with team members
- `envi unpack <blob>` - Decrypt and restore configuration from blob
- `envi create-key` - Generate `envi.config.maml` to enable at-rest encryption
- `envi clear` - Delete stored configuration for current project
- `envi global github enable` - Enable GitHub version control
- `envi global github disable` - Disable GitHub version control
- `envi global github restore` - Restore envi store from GitHub
- `envi global clear` - Delete entire envi directory and all stored configurations

Run any command with `--help` for more information or see the **[Commands documentation](https://envi.codecompose.dev/commands/capture)**.

## Development

### Setup

```bash
pnpm install
```

### Build

```bash
pnpm build
```

### Development Mode

```bash
pnpm dev
```

### Testing

```bash
pnpm test              # Run tests
pnpm test:ui           # Run tests with UI
pnpm test:coverage     # Run tests with coverage
```

**Test Coverage:** Core business logic (encryption, compression, parsing, storage) has 100% test coverage.

### Linting & Formatting

```bash
pnpm lint              # Run linter
pnpm lint:fix          # Run linter and fix issues
pnpm format            # Format code with Prettier
pnpm check-format      # Check if code is formatted
pnpm check-types       # Run TypeScript type checking
```

### Documentation

```bash
pnpm docs:dev          # Start documentation dev server
pnpm docs:build        # Build documentation site
pnpm docs:preview      # Preview built documentation
```

## License

MIT
