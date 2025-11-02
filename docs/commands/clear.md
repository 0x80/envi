# clear

Delete stored configuration for the current project.

## Usage

```bash
envi clear
```

## What It Does

1. **Finds project root** - Locates the project directory (looks for `.git`, or prompts you to confirm the current directory)
2. **Locates storage file** - Finds the stored configuration for this project
3. **Prompts for confirmation** - Requires explicit confirmation (default: No)
4. **Deletes configuration** - Removes the stored MAML file from `~/.envi/store/`
5. **Shows recovery option** - Mentions GitHub restore if you have version control enabled

## Safety Features

- Requires explicit user confirmation
- Defaults to "No" to prevent accidental deletion
- Warns if no stored configuration exists
- Shows exact storage path being deleted
- Reminds about GitHub restore option

## Example

```bash
$ envi clear
◐ Finding project root...
ℹ Project root: /Users/you/projects/myapp
ℹ Package name: myapp
ℹ Found stored configuration at: /Users/you/.envi/store/myapp.maml

? Delete stored configuration for this repository? No

ℹ Operation cancelled.
```

**Confirming deletion:**

```bash
$ envi clear
◐ Finding project root...
ℹ Project root: /Users/you/projects/myapp
ℹ Package name: @org/package
ℹ Found stored configuration at: /Users/you/.envi/store/@org/package.maml

? Delete stored configuration for this repository? Yes

✔ Deleted stored configuration for this repository
ℹ Note: If you have GitHub integration enabled, you can restore this data using 'envi global github restore'
```

## When to Use

**Clean up unused projects:**

```bash
# Remove env config for an old project
cd ~/old-project
envi clear
```

**Reset and recapture:**

```bash
# Clear old config and capture fresh
envi clear
envi capture
```

**Testing:**

```bash
# Clean slate for testing restore functionality
envi clear
envi restore
```

## What Gets Deleted

Only the stored configuration file for the current project is deleted:

- **Scoped package** (`@org/package`): Deletes `~/.envi/store/@org/package.maml`
- **Unscoped package** (`myapp`): Deletes `~/.envi/store/myapp.maml`
- **No package.json**: Deletes `~/.envi/store/folder-name.maml`

The actual `.env` files in your project are **not affected**.

## Recovery

If you have GitHub integration enabled, you can restore deleted configurations:

```bash
# Restore all configurations from GitHub
envi global github restore
```

This will restore the entire `~/.envi` directory, including the configuration you just deleted.

## No Stored Configuration

If no configuration exists for the current project:

```bash
$ envi clear
◐ Finding project root...
ℹ Project root: /Users/you/projects/myapp
ℹ Using folder name: myapp
⚠ No stored configuration found for this repository.
ℹ Would have looked at: /Users/you/.envi/store/myapp.maml
```

## Related Commands

- [capture](/commands/capture) - Capture env files to storage
- [restore](/commands/restore) - Restore env files from storage
- [global](/commands/global) - Global configuration commands
- [global github restore](/commands/global#global-github-restore) - Restore from GitHub
