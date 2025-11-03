---
layout: home

hero:
  name: Envi
  text: Environment File Management
  tagline: Capture, store, and restore .env files across your projects with ease
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/0x80/envi

features:
  - icon: |
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
        <path d="M2 12h20"/>
      </svg>
    title: Language Agnostic
    details: Works with any programming language when installed globally - Rust, Go, Python, PHP, Java, Ruby, Dart, and more. Not just JS/TS
  - icon: |
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M16.5 9.4 7.55 4.24"/>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        <polyline points="3.29 7 12 12 20.71 7"/>
        <line x1="12" x2="12" y1="22" y2="12"/>
      </svg>
    title: Centralized Storage
    details: Capture all .env files from all your codebases into a central location that can be version controlled
  - icon: |
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
        <path d="M3 3v5h5"/>
        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
        <path d="M16 16h5v5"/>
      </svg>
    title: Easy Restoration
    details: Restore environment files on new systems, repo checkouts, or git worktree instances with a single command
  - icon: |
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    title: Secure Sharing
    details: Safely share configurations using encrypted blobs. Variable redaction protects personal tokens from being shared
  - icon: |
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="6" x2="6" y1="3" y2="15"/>
        <circle cx="18" cy="6" r="3"/>
        <circle cx="6" cy="18" r="3"/>
        <path d="M18 9a9 9 0 0 1-9 9"/>
      </svg>
    title: AI Tools & Worktrees
    details: Works well with Cursor parallel agents and git worktrees - automatically restore env files to isolated working directories
  - icon: |
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
        <path d="M9 18c-4.51 2-5-2-7-2"/>
      </svg>
    title: GitHub Integration
    details: Optional GitHub integration to version control your environment configurations
  - icon: |
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
        <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
        <path d="M10 9H8"/>
        <path d="M16 13H8"/>
        <path d="M16 17H8"/>
      </svg>
    title: Content Preservation
    details: Preserves both comments (full-line and inline) and key order from your .env files
---

## Quick Start

Install Envi globally or as a dev dependency:

```bash
# Global installation (recommended)
pnpm add -g @codecompose/envi

# Or as dev dependency
pnpm add -D @codecompose/envi
```

Capture environment files from your project:

```bash
cd /path/to/your/project
envi capture
```

Restore them later:

```bash
envi restore
```

## Notable Features

- **Centralized Storage** - Capture all `.env` files into a centralized, version-controlled store organized by project name (extracted from `package.json`, `Cargo.toml`, `go.mod`, and other manifest files)
- **Encrypted Blob Sharing** - Share environment configs with team members via encrypted, compressed blobs - works independently of global storage
- **Monorepo Support** - Automatically discovers and captures all `.env` files across your entire monorepo structure, preserving relative paths
- **GitHub Integration** - Optional automatic version control for your environment configurations
- **Git Worktree Initialization** - For JS/TS projects, simply add `envi restore` to your setup script to automatically restore env files to each isolated worktree
- **Content Preservation** - Preserves both comments (full-line and inline) and key order from your original files
- **Variable Redaction** - Protect personal tokens and developer-specific credentials from being shared. Configure variables like `GITHUB_PAT` to be automatically redacted when capturing or packing
- **100% Test Coverage** - Core business logic (encryption, compression, parsing, storage) is fully tested for reliability
- **Language Agnostic** - Install globally to manage `.env` files for projects in any language - Rust, Go, Python, PHP, Java, Ruby, Dart, and more. Not limited to JS/TS
- **Human-Readable Format** - Stores configurations in [MAML](https://maml.dev) format, which guarantees key order preservation

## Learn More

- [Getting Started](/getting-started) - Installation and basic usage
- [Git Worktrees with AI Tools](/guides/git-worktrees) - Configure Cursor parallel agents and worktrees
- [Commands](/commands/capture) - Detailed command documentation
- [File Format](/file-format) - How Envi stores and preserves your configurations
- [GitHub Integration](/guides/github-integration) - Set up automatic version control
