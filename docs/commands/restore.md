# restore

Restore environment files from the global store back into your repository.

## Usage

```bash
envi restore
```

## Description

The `restore` command reads your stored environment configuration and recreates all `.env` files in your repository with their original content and comments.

## What It Does

1. **Finds repository root** - Locates your project root
2. **Reads package name** - Gets name from `package.json` or uses folder name
3. **Loads stored config** - Reads from `~/.envi/store/{package-name}.maml`
4. **Restores files** - Recreates each `.env` file with preserved comments

## File Handling

### New Files

Files that don't exist are created automatically:

```bash
✔ Restored 3 file(s):
  ✓ .env.local
  ✓ apps/web/.env.production
  ✓ packages/api/.env
```

### Unchanged Files

Files with identical content are skipped:

```bash
ℹ Skipped 2 unchanged file(s):
  - .env.test
  - services/api/.env.dev
```

### Modified Files

When a file exists with different content, you'll be prompted:

```bash
⚠ File exists with different content: .env.local

? What would you like to do?
  ❯ No - skip this file
    Yes - overwrite this file
    Yes to all - overwrite all remaining files
```

Options:

- **No** (default) - Skip this file, keep existing version
- **Yes** - Overwrite this file with stored version
- **Yes to all** - Overwrite all remaining files without asking

## Smart Comparison

Envi uses semantic comparison, not string comparison:

- **Ignores formatting**: Quotes, whitespace differences
- **Ignores blank lines**: Doesn't matter if you added/removed empty lines
- **Compares content**: Only checks actual keys, values, and comments

This means files with different formatting but same content are considered identical.

## Comment Restoration

All comments are restored exactly as captured:

### Full-line Comments

```bash
# Database configuration
DATABASE_URL=postgres://localhost:5432/db
```

### Inline Comments

```bash
API_KEY=secret123 # Production API key
PORT=3000
```

## Examples

### Successful Restore

```bash
$ envi restore
◐ Finding repository root...
ℹ Repository root: /Users/you/projects/myapp
ℹ Package name: @myorg/myapp
◐ Looking for stored configuration...
✔ Found stored configuration
✔ Found 5 file(s) to restore

✔ Restore complete!
✔ Restored 3 file(s):
  ✓ .env.local
  ✓ apps/web/.env.production
  ✓ packages/api/.env

ℹ Skipped 2 unchanged file(s):
  - .env.test
  - services/api/.env.dev
```

### No Stored Configuration

```bash
$ envi restore
 ERROR  No stored configuration found for this repository.

ℹ Run 'envi capture' first to capture env files.
```

### Interactive Overwrite

```bash
$ envi restore
...
⚠ File exists with different content: .env.local
? What would you like to do? Yes - overwrite this file

✔ Restored 1 file(s):
  ✓ .env.local

ℹ Skipped 1 file(s) (user declined):
  - .env.production
```

## Use Cases

### New Machine Setup

```bash
# Clone your project
git clone git@github.com:org/project.git
cd project

# Restore env files
envi restore
```

### Git Worktree

```bash
# Create new worktree
git worktree add ../project-feature feature-branch
cd ../project-feature

# Restore env files
envi restore
```

### After Pulling Changes

If env file locations changed:

```bash
git pull
envi restore  # Update files to match stored config
```

## Related Commands

- [capture](/commands/capture) - Capture env files to storage
- [global github restore](/commands/global#restore) - Restore entire envi store from GitHub
