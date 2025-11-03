# Git Worktrees with AI Tools

Git worktrees enable multiple working directories from a single repository, which is becoming essential for modern AI-powered development workflows. When using tools like Cursor's parallel agents, worktrees allow multiple AI models to work simultaneously without interfering with each other.

## The Environment File Problem

When you create a git worktree, **Git does not copy files that are in `.gitignore`** to the new worktree. This includes all your `.env` files, which are critical for running your application.

### What Happens Without Envi

Consider this typical scenario:

```bash
# Main worktree has your env files
main-branch/
├── .env
├── apps/
│   ├── web/.env.local
│   └── api/.env

# Creating a worktree for parallel agent
git worktree add ../feature-branch feature-branch

# The new worktree is missing all env files!
feature-branch/
├── apps/
│   ├── web/         # Missing .env.local
│   └── api/         # Missing .env
```

**Traditional solution:** Manually copy each file in setup scripts:

```json
{
  "setup-worktree": [
    "npm ci",
    "cp $ROOT_WORKTREE_PATH/.env .env",
    "cp $ROOT_WORKTREE_PATH/apps/web/.env.local apps/web/.env.local",
    "cp $ROOT_WORKTREE_PATH/apps/api/.env apps/api/.env"
  ]
}
```

**Problems with this approach:**

- Error-prone (easy to forget files)
- Hard to maintain (need to update setup script when adding new env files)
- Doesn't work if main worktree also doesn't have env files
- Fails in monorepos with many env files
- Breaks when collaborators add new env files

### The Envi Solution

With Envi, you capture your env files once, and restore them to any worktree instantly:

```json
{
  "setup-worktree": ["npm ci", "envi restore"]
}
```

**Benefits:**

- ✅ One command restores all env files
- ✅ Works in monorepos automatically
- ✅ Independent of main worktree state
- ✅ Centralized storage (works across machines)
- ✅ Version controlled via GitHub (optional)
- ✅ No maintenance when adding new env files

## Cursor Parallel Agents Setup

[Cursor](https://cursor.com) is an AI-powered code editor that can run multiple AI models in parallel using worktrees. Here's how to configure it with Envi.

### Prerequisites

1. Install Envi globally:

   ```bash
   pnpm add -g @codecompose/envi
   ```

2. Capture your env files (from main worktree):
   ```bash
   cd /path/to/your/project
   envi capture
   ```

### Configuration

Create `.cursor/worktrees.json` in your project root:

**Minimal Setup:**

```json
{
  "setup-worktree": ["envi restore"]
}
```

**With Dependencies:**

```json
{
  "setup-worktree": ["pnpm install", "envi restore"]
}
```

**Full Example (Node.js + Database):**

```json
{
  "setup-worktree": ["pnpm install", "envi restore", "pnpm db:migrate"]
}
```

### How It Works

1. **You enable Cursor parallel agents** and give a prompt
2. **Cursor creates worktrees** - one per parallel agent/model
3. **Setup scripts run** in each worktree
4. **Envi restores env files** from `~/.envi/store/`
5. **AI agents work independently** with proper environment configuration
6. **You review results** and choose the best implementation

### Platform-Specific Configurations

**macOS/Linux:**

```json
{
  "setup-worktree-unix": [
    "#!/bin/bash",
    "pnpm install",
    "envi restore",
    "echo 'Worktree initialized with environment files'"
  ]
}
```

**Windows:**

```json
{
  "setup-worktree-windows": ["pnpm install", "envi restore"]
}
```

**Cross-platform:**

```json
{
  "setup-worktree": ["pnpm install", "envi restore"]
}
```

## Language-Specific Examples

### JavaScript/TypeScript (Node.js)

```json
{
  "setup-worktree": [
    "pnpm install --frozen-lockfile",
    "envi restore",
    "pnpm build"
  ]
}
```

### Python

```json
{
  "setup-worktree-unix": [
    "python -m venv venv",
    "source venv/bin/activate && pip install -r requirements.txt",
    "envi restore"
  ],
  "setup-worktree-windows": [
    "python -m venv venv",
    "venv\\\\Scripts\\\\activate && pip install -r requirements.txt",
    "envi restore"
  ]
}
```

### Rust

```json
{
  "setup-worktree": ["cargo fetch", "envi restore"]
}
```

### Go

```json
{
  "setup-worktree": ["go mod download", "envi restore"]
}
```

### Monorepo (Turborepo/Nx)

```json
{
  "setup-worktree": ["pnpm install", "envi restore", "pnpm turbo build"]
}
```

## Advanced Workflows

### Option 1: Conditional Restore (Only if Needed)

If you want to only restore when env files are missing:

```json
{
  "setup-worktree-unix": [
    "pnpm install",
    "[ ! -f .env ] && envi restore || echo 'Env files already present'"
  ]
}
```

### Option 2: Script-Based Setup

Create `scripts/setup-worktree.sh`:

```bash
#!/bin/bash
set -e

echo "Installing dependencies..."
pnpm install

echo "Restoring environment files..."
envi restore

echo "Running database migrations..."
pnpm db:migrate

echo "Building application..."
pnpm build

echo "✓ Worktree ready!"
```

Then in `.cursor/worktrees.json`:

```json
{
  "setup-worktree": "./scripts/setup-worktree.sh"
}
```

### Option 3: Different Env Per Worktree

If you need different environment variables per worktree:

**Capture with different names:**

```bash
# In main worktree
envi capture

# Create and configure test worktree
git worktree add ../test-worktree
cd ../test-worktree

# Modify env vars for testing
# Then save with different project name or override manually
```

## GitHub Integration for Team

Enable GitHub sync so all team members can restore env files:

```bash
# One-time setup per developer
envi global github enable
```

**Team workflow:**

1. **Lead developer** captures and pushes env files:

   ```bash
   envi capture  # Auto-commits to GitHub
   ```

2. **Team members** restore from GitHub:

   ```bash
   envi global github restore  # One-time setup
   ```

3. **Worktrees auto-restore** using the setup script:
   ```json
   {
     "setup-worktree": ["pnpm install", "envi restore"]
   }
   ```

## Comparison: Manual vs Envi

### Manual Copying Approach

```json
{
  "setup-worktree": [
    "pnpm install",
    "cp $ROOT_WORKTREE_PATH/.env .env",
    "cp $ROOT_WORKTREE_PATH/.env.local .env.local",
    "cp $ROOT_WORKTREE_PATH/apps/web/.env apps/web/.env",
    "cp $ROOT_WORKTREE_PATH/apps/api/.env apps/api/.env",
    "cp $ROOT_WORKTREE_PATH/packages/db/.env packages/db/.env"
  ]
}
```

**Issues:**

- ❌ Breaks if `$ROOT_WORKTREE_PATH` doesn't have env files
- ❌ Needs updating when new env files are added
- ❌ Doesn't work across machines
- ❌ Error-prone with many files
- ❌ No version history

### Envi Approach

```json
{
  "setup-worktree": ["pnpm install", "envi restore"]
}
```

**Advantages:**

- ✅ Works even if main worktree is clean
- ✅ Automatically handles new env files
- ✅ Works across all machines (with GitHub sync)
- ✅ One command for all files
- ✅ Version controlled (optional)
- ✅ Language agnostic

## Troubleshooting

### Worktree Has No Env Files After Setup

**Check Envi storage:**

```bash
# Verify you've captured env files
ls ~/.envi/store/

# If empty, capture from main worktree
cd /path/to/main/worktree
envi capture
```

**Check setup script:**

```bash
# View Cursor's setup configuration
cat .cursor/worktrees.json

# Manually test setup commands
cd /path/to/worktree
envi restore
```

### Setup Script Fails

**Test commands individually:**

```bash
# In the worktree directory
pnpm install  # Test dependency installation
envi restore  # Test env restoration
```

**Check Envi is installed globally:**

```bash
which envi
# Should output: /path/to/global/node_modules/.bin/envi

# If not found, install globally
pnpm add -g @codecompose/envi
```

### Different Package Managers

**Using npm:**

```json
{
  "setup-worktree": ["npm ci", "envi restore"]
}
```

**Using yarn:**

```json
{
  "setup-worktree": ["yarn install --frozen-lockfile", "envi restore"]
}
```

**Using bun (faster):**

```json
{
  "setup-worktree": ["bun install", "envi restore"]
}
```

## Best Practices

### 1. Install Envi Globally

```bash
pnpm add -g @codecompose/envi
```

This ensures `envi` is available in all worktrees without needing to be in `package.json`.

### 2. Capture Before Creating Worktrees

```bash
# In your main worktree
envi capture
```

Ensures all env files are stored before you create parallel worktrees.

### 3. Keep Setup Scripts Simple

```json
{
  "setup-worktree": ["pnpm install", "envi restore"]
}
```

The simpler the setup, the faster worktrees initialize and the fewer things can break.

### 4. Enable GitHub Sync for Teams

```bash
envi global github enable
```

Automatic version control makes it easy for team members to stay in sync.

### 5. Document in README

Add to your project's README:

```markdown
## Development Setup

### With Cursor Parallel Agents

1. Install Envi globally:
   \`\`\`bash
   pnpm add -g @codecompose/envi
   \`\`\`

2. Restore environment files:
   \`\`\`bash
   envi restore
   \`\`\`

3. Install dependencies:
   \`\`\`bash
   pnpm install
   \`\`\`

Cursor will automatically set up worktrees with environment files.
```

## Other AI Tools

While this guide focuses on Cursor, Envi works with any workflow that uses git worktrees:

- **GitHub Copilot Workspace** - Multiple concurrent suggestions
- **JetBrains AI** - Parallel code generation
- **Claude Code** - Worktree-based isolation
- **Manual worktrees** - For testing different approaches

The setup is the same: install Envi globally, capture your env files, and restore them in each worktree.

## Related

- [Getting Started](/getting-started) - Installation and basic usage
- [Commands](/commands/capture) - Detailed command documentation
- [GitHub Integration](/guides/github-integration) - Set up automatic version control
- [Multi-Language Support](/guides/multi-language-support) - Using Envi with different languages
- [Cursor Documentation](https://cursor.com/docs/configuration/worktrees) - Official Cursor worktrees guide
