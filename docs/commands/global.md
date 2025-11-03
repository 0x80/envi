# global

Global configuration commands for Envi.

## Subcommands

### clear

Delete entire envi directory and all stored configurations.

### github

GitHub integration commands for version controlling your environment store.

## global clear

Delete the entire envi directory and all stored configurations.

### Usage

```bash
envi global clear
```

### What It Does

1. **Locates envi directory** - Checks if `~/.envi/` exists
2. **Lists stored packages** - Shows all stored configurations (including scoped packages)
3. **Shows deletion preview** - Displays directory path and package count
4. **Prompts for confirmation** - Requires explicit confirmation (default: No)
5. **Deletes everything** - Removes entire `~/.envi` directory recursively
6. **Shows recovery option** - Mentions GitHub restore if you have version control enabled

### Safety Features

- Requires explicit user confirmation
- Defaults to "No" to prevent accidental deletion
- Lists all packages that will be deleted
- Shows exact directory path being deleted
- Reminds about GitHub restore option

### Example

```bash
$ envi global clear
ℹ The following directory will be deleted: /Users/you/.envi

ℹ Stored configurations (5):
  - @org/frontend
  - @org/backend
  - myapp
  - test-project
  - demo-app

? Delete the entire envi directory and all stored configurations? No

ℹ Operation cancelled.
```

**Confirming deletion:**

```bash
$ envi global clear
ℹ The following directory will be deleted: /Users/you/.envi

ℹ Stored configurations (5):
  - @org/frontend
  - @org/backend
  - myapp
  - test-project
  - demo-app

? Delete the entire envi directory and all stored configurations? Yes

✔ Deleted entire envi directory
ℹ Note: If you have GitHub integration enabled, you can restore all data using 'envi global github restore'
```

### When to Use

**Complete reset:**

```bash
# Remove all global Envi data and config from your system
envi global clear
```

### What Gets Deleted

The entire `~/.envi` directory is removed, including:

- `~/.envi/store/` - All stored configurations
- `~/.envi/config.maml` - Global configuration
- `~/.envi/.git/` - Git repository (if GitHub integration was enabled)
- `~/.envi/README.md` - Documentation

All stored environment configurations for **all projects** will be deleted.

### Recovery

If you have GitHub integration enabled, you can restore everything:

```bash
# Restore all configurations from GitHub
envi global github restore
```

This will restore:

- All stored configurations
- Global configuration
- GitHub integration settings

## global github enable

Enable GitHub version control for your envi store.

### Usage

```bash
envi global github enable
```

### What It Does

1. **Initializes git** - Creates git repository in `~/.envi/` (if needed)
2. **Creates README** - Adds documentation to the envi directory
3. **Checks GitHub CLI** - Verifies `gh` is installed and authenticated
4. **Creates private repo** - Creates `envi-store` repository on your GitHub account
5. **Pushes to GitHub** - Commits and pushes initial content
6. **Enables auto-commit** - Future captures will auto-commit and push

### Requirements

- GitHub CLI (`gh`) must be installed
- Must be authenticated with `gh auth login`

### Example

```bash
$ envi global github enable
◐ Checking envi directory...
✔ Git repository initialized
◐ Checking GitHub CLI...
✔ GitHub CLI is installed
◐ Checking GitHub authentication...
✔ Authenticated as: username
◐ Creating initial commit...
✔ Initial commit created
◐ Creating private GitHub repository...
✔ Repository created and pushed: https://github.com/username/envi-store
◐ Updating configuration...
✔ GitHub version control enabled

✔ GitHub integration enabled! Future captures will be automatically committed and pushed.
```

## global github disable

Disable GitHub version control.

### Usage

```bash
envi global github disable
```

### What It Does

1. Checks if GitHub integration is currently enabled
2. Updates config to disable auto-commit/push
3. Leaves existing GitHub repository unchanged

### Example

```bash
$ envi global github disable
◐ Disabling GitHub version control...
✔ GitHub version control disabled

Future captures will no longer be committed or pushed to GitHub.
Your existing GitHub repository will remain unchanged - you can delete it manually if needed.
```

## global github restore

Restore your entire envi store from GitHub.

### Usage

```bash
envi global github restore
```

### What It Does

1. **Checks for repository** - Verifies `username/envi-store` exists on GitHub
2. **Warns about overwrite** - If local `~/.envi/` has content
3. **Prompts for confirmation** - Default: No
4. **Clones repository** - Downloads entire envi store from GitHub
5. **Enables integration** - Sets config to auto-commit future captures

### Safety Features

- Checks if local envi directory has content
- Warns about overwriting local files
- Requires explicit confirmation (default: No)
- Shows which repository will be cloned

### Example

```bash
$ envi global github restore
◐ Checking GitHub CLI...
✔ GitHub CLI is installed
◐ Checking GitHub authentication...
✔ Authenticated as: username
◐ Checking for envi-store repository...
✔ Repository found

⚠ Your local ~/.envi directory contains existing files and configuration.
⚠ Restoring from GitHub will overwrite all local files with the repository contents.

? Overwrite local envi directory with GitHub repository? No

ℹ Operation cancelled.
```

### Use Cases

**New Machine:**

```bash
# On new computer, restore all your env configs
envi global github restore
```

## Configuration

Global configuration is stored in `~/.envi/config.maml`:

```maml
{
  use_version_control: "github"
}
```

Values:

- `false` - No version control (default)
- `"github"` - GitHub integration enabled

## Related Commands

- [capture](/commands/capture) - Auto-commits when GitHub enabled
- [restore](/commands/restore) - Restore env files to repository
