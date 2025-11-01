# Getting Started

Get up and running with Envi in minutes.

## Installation

Install Envi globally using your preferred package manager:

::: code-group

```bash [pnpm]
pnpm add -g @codecompose/envi
```

```bash [npm]
npm install -g @codecompose/envi
```

```bash [yarn]
yarn global add @codecompose/envi
```

:::

## Requirements

- Node.js 20 or higher
- Git (for repository detection)
- GitHub CLI (optional, for GitHub integration)

## Basic Workflow

### 1. Capture Environment Files

Navigate to your project and capture all `.env` files:

```bash
cd /path/to/your/project
envi capture
```

This will:

- Find your repository root (looks for `.git`)
- Discover all `.env` and `.env.*` files
- Store them in `~/.envi/store/` organized by package name

### 2. Restore Environment Files

On a new machine or fresh checkout:

```bash
cd /path/to/your/project
envi restore
```

This will:

- Look up your stored configuration
- Restore all `.env` files to their original locations
- Preserve all comments (full-line and inline)

## Storage Location

Envi stores your environment configurations in:

```
~/.envi/
├── store/           # Environment file storage
│   ├── @org/
│   │   └── package.maml
│   └── unscoped.maml
└── config.maml      # Global configuration
```

## File Format

Files are stored in [MAML](https://maml.dev) format, which is:

- Human-readable and easy to edit
- Preserves key order (important for comments)
- Simple syntax (similar to YAML)
- Version control friendly

Example stored file:

```maml
{
  __envi_version: 1
  metadata: {
    updated_from: "/Users/you/projects/myapp"
    updated_at: "2025-11-01T12:00:00.000Z"
  }
  files: [
    {
      path: ".env.local"
      env: {
        __c00: "# Database configuration"
        __i00: "# Production database"
        DATABASE_URL: "postgres://localhost:5432/db"
        API_KEY: "secret123"
      }
    }
  ]
}
```

## Next Steps

- Learn about all available [commands](/commands/capture)
- Set up [GitHub integration](/guides/github-integration) for automatic version control
- Explore [monorepo usage](/guides/monorepo)
