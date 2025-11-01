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
      link: https://github.com/codecompose/envi

features:
  - icon: 📦
    title: Centralized Storage
    details: Capture all .env files from your codebase into a central location that can be version controlled
  - icon: 🔄
    title: Easy Restoration
    details: Restore environment files on new systems, repo checkouts, or git worktree instances with a single command
  - icon: 🔒
    title: Secure Sharing
    details: Safely share captured env configurations with colleagues using encrypted blobs
  - icon: 🌳
    title: Git Worktree Friendly
    details: Easily initialize git worktree instances with proper environment configurations
  - icon: 🐙
    title: GitHub Integration
    details: Optional GitHub integration to version control your environment configurations
  - icon: 📝
    title: Comment Preservation
    details: Preserves both full-line and inline comments from your .env files
---

## Quick Start

Install Envi globally:

```bash
pnpm add -g @codecompose/envi
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

## Why Envi?

Managing environment files across multiple projects, git worktrees, and team members is challenging. Envi solves this by:

- **Capturing** all your `.env` files into a centralized, version-controlled store
- **Organizing** files by package name (supports scoped packages like `@org/package`)
- **Preserving** comments and formatting from your original files
- **Integrating** with GitHub for automatic version control
- **Storing** in human-readable [MAML](https://maml.dev) format

## What's Next?

- [Getting Started](/getting-started) - Installation and basic usage
- [Commands](/commands/capture) - Detailed command documentation
- [GitHub Integration](/guides/github-integration) - Set up automatic version control
