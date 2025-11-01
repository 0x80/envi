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
  - icon: |
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M16.5 9.4 7.55 4.24"/>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        <polyline points="3.29 7 12 12 20.71 7"/>
        <line x1="12" x2="12" y1="22" y2="12"/>
      </svg>
    title: Centralized Storage
    details: Capture all .env files from your codebase into a central location that can be version controlled
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
    details: Safely share captured env configurations with colleagues using encrypted blobs
  - icon: |
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="6" x2="6" y1="3" y2="15"/>
        <circle cx="18" cy="6" r="3"/>
        <circle cx="6" cy="18" r="3"/>
        <path d="M18 9a9 9 0 0 1-9 9"/>
      </svg>
    title: Git Worktree Friendly
    details: Easily initialize git worktree instances with proper environment configurations
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
