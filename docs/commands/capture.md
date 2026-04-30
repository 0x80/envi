# capture

Capture all `.env` and `.dev.vars` files from a repository and store them in the global envi store.

## Usage

```bash
envi capture
```

## Description

The `capture` command traverses your repository to find all environment files (`.env`, `.env.local`, `.env.production`, Cloudflare Workers' `.dev.vars` and per-environment variants, etc.) and stores them in `~/.envi/store/`.

## What It Does

1. **Finds project root** - Looks for version control markers (`.git`, `.jj`, `.hg`, `.svn`), or prompts you to confirm the current directory
2. **Discovers env files** - Recursively searches for `.env`, `.env.*`, `.dev.vars`, and `.dev.vars.*` files
3. **Respects .gitignore** - Only uses directories from .gitignore if present, not file patterns
4. **Parses files** - Extracts key-value pairs and preserves comments
5. **Stores configuration** - Saves to `~/.envi/store/{package-name}.maml`
6. **Creates git commit** (if GitHub integration is enabled)

## File Matching

Envi finds files that match:

- `.env` (exact match)
- `.env.*` (anything with a dot separator, like `.env.local`, `.env.production`)
- `.dev.vars` (Cloudflare Workers local secrets)
- `.dev.vars.*` (per-environment variants — the suffix matches whatever environment names you've defined in `wrangler.jsonc`)

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

## Change Detection

When you run `capture` multiple times:

- **No changes**: Shows info message, no file write, no commit
- **Changes detected**: Updates file and creates commit (if GitHub enabled)

Files are sorted by path before comparison to ensure consistent results.

If [encryption-at-rest](#encryption-at-rest-optional) is enabled, the comparison happens in plaintext space — fresh ciphertexts on every capture do not trigger spurious rewrites. Switching from a plaintext store to an encrypted one (or vice versa) always rewrites, so running `envi create-key` followed by `envi capture` reliably converts the existing store.

## Encryption at Rest (Optional)

By default, captured env values are written to `~/.envi/store/` in plaintext.

If you generate a key with [`envi create-key`](/commands/create-key), `envi.maml` is written to your repository root with an `encryption_key`. From then on, `envi capture` encrypts each file's `env` block before writing:

```bash
$ envi capture
...
ℹ Encrypting env values with key from envi.maml
◐ Saving to storage...
✔ Captured environment files for '@myorg/myapp'
```

The on-disk MAML then has `encrypted_env` (a base64 ciphertext) instead of `env` for each file. This protects the values in `~/.envi/store/` and in the GitHub backup if you've enabled it. Anyone with read access to the source repo (and therefore `envi.maml`) can decrypt; anyone without it cannot.

See [`envi create-key`](/commands/create-key) for the full encryption workflow and security considerations.

## Examples

### Basic Capture

```bash
$ envi capture
◐ Finding repository root...
ℹ Repository root: /Users/you/projects/myapp
ℹ Package name: @myorg/myapp
◐ Searching for env files...
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
- [create-key](/commands/create-key) - Enable at-rest encryption for captured values
- [global github enable](/commands/global#enable) - Enable GitHub integration
