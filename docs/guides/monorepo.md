# Using with Monorepos

Envi is designed to work seamlessly with monorepos, capturing env files from all packages and services.

## How It Works

When you run `envi capture` in a monorepo:

1. **Single configuration** - All env files are stored in one MAML file
2. **Relative paths** - File locations are preserved (e.g., `packages/web/.env.local`)
3. **Package-based naming** - Uses root package.json name or folder name

## Example Monorepo Structure

```
my-monorepo/
├── package.json              # name: "@myorg/monorepo"
├── .env
├── apps/
│   ├── web/
│   │   ├── .env.local
│   │   └── .env.production
│   └── api/
│       └── .env.development
├── packages/
│   └── core/
│       └── .env.test
└── services/
    ├── auth/
    │   └── .env
    └── notifications/
        └── .env.production
```

## Capturing

From the monorepo root:

```bash
$ cd my-monorepo
$ envi capture
◐ Finding repository root...
ℹ Repository root: /Users/you/my-monorepo
ℹ Package name: @myorg/monorepo
◐ Searching for .env files...
✔ Found 7 file(s):
  - .env
  - apps/web/.env.local
  - apps/web/.env.production
  - apps/api/.env.development
  - packages/core/.env.test
  - services/auth/.env
  - services/notifications/.env.production
```

Stored as: `~/.envi/store/@myorg/monorepo.maml`

## Running from Subdirectory

Envi automatically finds the repository root:

```bash
$ cd apps/web
$ envi capture
◐ Finding repository root...
ℹ Repository root: /Users/you/my-monorepo  # Found root!
...
```

It traverses up looking for version control markers (`.git`, `.jj`, `.hg`, `.svn`), so you can run it from anywhere in the monorepo.

## Stored Format

```maml
{
  __envi_version: 1
  metadata: {
    updated_from: "/Users/you/my-monorepo"
    updated_at: "2025-11-01T12:00:00.000Z"
  }
  files: [
    {
      path: ".env"
      env: { ROOT_VAR: "value" }
    }
    {
      path: "apps/web/.env.local"
      env: { WEB_API: "http://localhost:3000" }
    }
    {
      path: "services/auth/.env"
      env: { AUTH_SECRET: "secret" }
    }
  ]
}
```

## Restoring

Restore recreates all files at their original locations:

```bash
$ envi restore
...
✔ Restored 7 file(s):
  ✓ .env
  ✓ apps/web/.env.local
  ✓ apps/web/.env.production
  ✓ apps/api/.env.development
  ✓ packages/core/.env.test
  ✓ services/auth/.env
  ✓ services/notifications/.env.production
```

## Best Practices

### 1. Use Scoped Package Name

In your root `package.json`:

```json
{
  "name": "@myorg/monorepo",
  "private": true
}
```

This ensures:

- Unique storage path: `~/.envi/store/@myorg/monorepo.maml`
- No conflicts with other projects
- Organized by organization

### 2. Respect .gitignore

Envi reads your `.gitignore` to skip directories:

```gitignore
node_modules
dist
.turbo
.next
```

But it **still finds** `.env` files even if they're in .gitignore (which is what you want).

### 3. Run from Root

While Envi can find the root from subdirectories, it's clearer to run from the root:

```bash
# Clear and explicit
cd /path/to/monorepo
envi capture

# Also works, but less obvious
cd /path/to/monorepo/packages/web
envi capture  # Still captures entire monorepo
```

## Turborepo Example

```
my-turborepo/
├── package.json              # "@myorg/turborepo"
├── turbo.json
├── .env
├── apps/
│   ├── docs/
│   │   └── .env.local
│   └── web/
│       ├── .env.local
│       └── .env.production
└── packages/
    ├── ui/
    │   └── .env.test
    └── config/
        └── .env
```

Capture all 6 env files:

```bash
$ envi capture
✔ Found 6 file(s):
  - .env
  - apps/docs/.env.local
  - apps/web/.env.local
  - apps/web/.env.production
  - packages/ui/.env.test
  - packages/config/.env
```

## pnpm Workspace Example

```
pnpm-workspace/
├── package.json              # "@company/workspace"
├── pnpm-workspace.yaml
├── .env
└── packages/
    ├── frontend/
    │   └── .env.local
    ├── backend/
    │   ├── .env.development
    │   └── .env.production
    └── shared/
        └── .env
```

All env files captured and organized by path.

## Git Worktree with Monorepos

Perfect for working on multiple features simultaneously:

```bash
# Main workspace
cd my-monorepo
envi capture

# Create worktree for feature
git worktree add ../monorepo-feature feature-branch
cd ../monorepo-feature
envi restore  # All env files restored!

# Another worktree
git worktree add ../monorepo-bugfix bugfix-branch
cd ../monorepo-bugfix
envi restore  # Same configs, different worktree
```

## Limitations

### Single Configuration per Monorepo

Each monorepo has one stored configuration file. You cannot:

- Capture only specific packages
- Have different configurations for different branches

All env files are captured together and restored together.

### Package.json Name Required

For proper identification, add a name to your root package.json:

```json
{
  "name": "@myorg/monorepo", // Required for uniqueness
  "private": true
}
```

Without it, Envi uses the folder name, which may conflict if you have multiple monorepos with the same folder name.

## Related

- [capture](/commands/capture) - Capture all env files
- [restore](/commands/restore) - Restore all env files
- [GitHub Integration](/guides/github-integration) - Version control your configs
