# capture

Capture files outside of version control (such as `.env` and `.dev.vars`) from a repository and store them in the global envi store.

## Usage

```bash
envi capture
```

## Description

The `capture` command traverses your repository to find files that hold local secrets and configuration outside of version control — `.env`, `.env.local`, `.env.production`, Cloudflare Workers' `.dev.vars` and per-environment variants, plus any extra patterns you declare via [`capture_patterns`](#custom-capture-patterns) — and stores them in `~/.envi/store/`.

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
- `.dev.vars.*` (per-environment variants — the suffix matches whatever environment names you've defined in your Wrangler configuration, e.g. `wrangler.toml` or `wrangler.jsonc`)

Files are discovered recursively in all subdirectories, except:

- `node_modules/`
- `.git/`
- Other directories ignored in your `.gitignore`

### Custom Capture Patterns

Many tools and frameworks store local secrets in their own files (`.envrc` for direnv, framework-specific dotfiles, etc.). Rather than asking Envi to ship a baked-in list for every one of them, you can extend the matcher per repo by adding `capture_patterns` to `envi.config.maml`:

```maml
{
  capture_patterns: [
    ".envrc",
    ".flaskenv"
  ]
}
```

Behavior:

- **Additive.** Built-in patterns (`.env`, `.dev.vars`, etc.) are always matched.
- **Auto-expansion for bare filenames.** A pattern without a `/` (like `.envrc`) is matched both at the repo root and in any subdirectory — the same way `.env` already works.
- **Globs are passed through verbatim.** A pattern containing `/` (like `config/*.local`) is handed to fast-glob as-is, so you can be as specific as you need.
- **Same parser, same shape.** Matched files must be in `KEY=value` format — that's how Envi parses, stores, and restores them. Free-form config files won't round-trip cleanly.

If you don't have an `envi.config.maml` yet, run [`envi create-key`](/commands/create-key) to create one (it'll add an `encryption_key` too — you can drop that line if you don't want at-rest encryption), or create the file by hand with just the `capture_patterns` field.

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

If you generate a key with [`envi create-key`](/commands/create-key), `envi.config.maml` is written to your repository root with an `encryption_key`. From then on, `envi capture` encrypts each file's `env` block before writing:

```bash
$ envi capture
...
ℹ Encrypting env values with key from envi.config.maml
◐ Saving to storage...
✔ Captured environment files for '@myorg/myapp'
```

The on-disk MAML then has `encrypted_env` (a base64 ciphertext) instead of `env` for each file. Anyone with read access to the source repo (and therefore `envi.config.maml`) can decrypt; anyone without it cannot.

This mostly only matters when you also use the [GitHub integration](/guides/github-integration) — encryption-at-rest means a leak of the `envi-store` backup alone won't expose env values without also leaking the source repo. On a single laptop, an attacker with disk access has both. See [`envi create-key`](/commands/create-key) for the full workflow and trade-offs.

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
