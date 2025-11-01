# capture

Capture all `.env` files from a repository and store them in the global envi store.

## Usage

```bash
envi capture
```

## Description

The `capture` command traverses your repository to find all environment files (`.env`, `.env.local`, `.env.production`, etc.) and stores them in `~/.envi/store/`.

## What It Does

1. **Finds repository root** - Looks for `.git` directory
2. **Discovers env files** - Recursively searches for `.env` and `.env.*` files
3. **Respects .gitignore** - Only uses directories from .gitignore, not file patterns
4. **Parses files** - Extracts key-value pairs and preserves comments
5. **Stores configuration** - Saves to `~/.envi/store/{package-name}.maml`
6. **Creates git commit** (if GitHub integration is enabled)

## File Matching

Envi finds files that match:

- `.env` (exact match)
- `.env.*` (anything with a dot separator, like `.env.local`, `.env.production`)

Files are discovered recursively in all subdirectories, except:

- `node_modules/`
- `.git/`
- Other directories ignored in your `.gitignore`

## Storage Organization

### With package.json

If your repository has a `package.json` with a `name` field:

```json
{
  "name": "@myorg/myapp"
}
```

Files are stored at: `~/.envi/store/@myorg/myapp.maml`

Scoped packages create subdirectories for better organization.

### Without package.json

If no `package.json` or no `name` field exists, Envi:

1. Warns you about potential naming conflicts
2. Prompts for confirmation (default: Yes)
3. Uses the folder name: `~/.envi/store/foldername.maml`

## Comment Preservation

Envi preserves all comments from your `.env` files:

### Full-line Comments

```bash
# This is a database configuration
DATABASE_URL=postgres://localhost:5432/db
```

Stored as:

```maml
__c00: "# This is a database configuration"
DATABASE_URL: "postgres://localhost:5432/db"
```

### Inline Comments

```bash
API_KEY=secret123 # Production API key
```

Stored as:

```maml
__i00: "# Production API key"
API_KEY: "secret123"
```

## Change Detection

When you run `capture` multiple times:

- **No changes**: Shows info message, no file write, no commit
- **Changes detected**: Updates file and creates commit (if GitHub enabled)

Files are sorted by path before comparison to ensure consistent results.

## Examples

### Basic Capture

```bash
$ envi capture
◐ Finding repository root...
ℹ Repository root: /Users/you/projects/myapp
ℹ Package name: @myorg/myapp
◐ Searching for .env files...
✔ Found 3 file(s):
  - .env.local
  - apps/web/.env.production
  - packages/api/.env
◐ Parsing files...
◐ Saving to storage...
✔ Captured environment files for '@myorg/myapp'
```

### No Changes Detected

```bash
$ envi capture
...
ℹ No changes detected - environment files are identical to stored version.
ℹ Stored at: ~/.envi/store/@myorg/myapp.maml
```

### With GitHub Integration

```bash
$ envi capture
...
✔ Captured environment files for '@myorg/myapp'
◐ Committing to version control...
✔ Committed and pushed to GitHub
```

## Related Commands

- [restore](/commands/restore) - Restore env files from storage
- [global github enable](/commands/global#enable) - Enable GitHub integration
