# Envi

Environment file management tool - Capture, store, and restore `.env` files across your projects.

[![NPM Version](https://img.shields.io/npm/v/@codecompose/envi)](https://www.npmjs.com/package/@codecompose/envi)
[![License](https://img.shields.io/npm/l/@codecompose/envi)](LICENSE)
[![Documentation](https://img.shields.io/badge/docs-envi.codecompose.dev-blue)](https://envi.codecompose.dev)

## Features

- **Centralized Storage** - Capture all `.env` files into a central, version-controlled location
- **Easy Restoration** - Restore env files on new systems or git worktrees
- **Secure Sharing** - Share configurations safely with team members using encrypted, compressed blobs
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
- **[GitHub Integration](https://envi.codecompose.dev/guides/github-integration)** - Set up automatic version control
- **[Monorepo Support](https://envi.codecompose.dev/guides/monorepo)** - Working with monorepos
- **[API Reference](https://envi.codecompose.dev/api-reference)** - Programmatic usage

## Commands

- `envi capture` - Capture all .env files from repository
- `envi restore` - Restore env files from storage
- `envi pack` - Create encrypted blob for sharing with team members
- `envi unpack <blob>` - Decrypt and restore configuration from blob
- `envi global github enable` - Enable GitHub version control
- `envi global github disable` - Disable GitHub version control
- `envi global github restore` - Restore envi store from GitHub

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
