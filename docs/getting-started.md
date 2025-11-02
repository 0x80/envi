# Getting Started

Get up and running with Envi in minutes.

## Installation

Envi can be installed either globally or as a development dependency in your project.

### Global Installation (Recommended)

Install globally to use `envi` across all your projects:

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

### Project Development Dependency

Alternatively, install as a dev dependency within a specific project:

::: code-group

```bash [pnpm]
pnpm add -D @codecompose/envi
```

```bash [npm]
npm install --save-dev @codecompose/envi
```

```bash [yarn]
yarn add -D @codecompose/envi
```

:::

When installed as a dev dependency, run commands using:

```bash
# Using npx
npx envi capture

# Using pnpm
pnpm envi capture

# Using yarn
yarn envi capture

# Or add to package.json scripts
{
  "scripts": {
    "env:capture": "envi capture",
    "env:restore": "envi restore"
  }
}
```

## Requirements

- Node.js 20 or higher
- GitHub CLI (optional, for GitHub integration)

## Basic Workflow

### 1. Capture Environment Files

Navigate to your project and capture all `.env` files:

```bash
cd /path/to/your/project
envi capture
```

This will:

- Find your project root (looks for version control markers: `.git`, `.jj`, `.hg`, `.svn`, or prompts you to confirm the current directory)
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

## Protecting Personal Tokens

Envi includes a **variable redaction** feature to prevent accidentally sharing personal tokens with your team.

### Quick Start

By default, `GITHUB_PAT` (GitHub Personal Access Token) is automatically redacted because it's tied to your individual GitHub account, not your organization. Each developer should have their own `GITHUB_PAT` for local development.

Add more variables as needed:

```bash
# Add variables to redaction list
envi config redact add SLACK_WEBHOOK_URL
envi config redact add GITLAB_TOKEN

# View redacted variables
envi config redact list
```

When you capture or pack environment files, redacted variables will:
- Be replaced with `__envi_redacted__` in storage and blobs
- Preserve their real values when you restore or unpack

**Example:**

```bash
$ envi capture
⚠ Redacted 2 variable(s): GITHUB_PAT, SLACK_WEBHOOK_URL
ℹ These values will be stored as __envi_redacted__
✔ Captured 3 file(s) to storage
```

Learn more in the [Sharing Configurations](/guides/sharing-configs#variable-redaction) guide.

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

Files are stored in human-readable [MAML](https://maml.dev) format. See the [File Format](/file-format) documentation for technical details.

## Next Steps

- Learn about all available [commands](/commands/capture)
- Understand [variable redaction](/commands/config) and how to protect personal tokens
- Learn about [sharing configurations](/guides/sharing-configs) with your team
- Understand the [file format](/file-format) and how comments are preserved
- Set up [GitHub integration](/guides/github-integration) for automatic version control
- Explore [monorepo usage](/guides/monorepo)
