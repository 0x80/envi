# GitHub Integration

Set up automatic version control for your environment configurations.

## Overview

GitHub integration allows you to:

- **Automatically commit** env file changes after each capture
- **Version control** your environment configurations
- **Sync across machines** using GitHub as the central source for your personal use

## Prerequisites

### 1. Install GitHub CLI

::: code-group

```bash [macOS]
brew install gh
```

```bash [Linux (Debian/Ubuntu)]
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh
```

```bash [Windows]
winget install GitHub.cli
```

:::

### 2. Authenticate with GitHub

```bash
gh auth login
```

Follow the prompts to authenticate with your GitHub account.

## Setup

### Enable GitHub Integration

```bash
envi global github enable
```

This will:

1. Initialize git in `~/.envi/` (if not already initialized)
2. Create a README explaining the repository
3. Verify GitHub CLI is installed and authenticated
4. Create a **private** repository called `envi-store` on your GitHub account
5. Push initial content to GitHub
6. Enable automatic commits for future captures

### Example Output

```bash
$ envi global github enable
◐ Checking envi directory...
✔ Git repository initialized
◐ Checking GitHub CLI...
✔ GitHub CLI is installed
◐ Checking GitHub authentication...
✔ Authenticated as: your-username
◐ Creating initial commit...
✔ Initial commit created
◐ Creating private GitHub repository...
✔ Repository created and pushed: https://github.com/your-username/envi-store
◐ Updating configuration...
✔ GitHub version control enabled

✔ GitHub integration enabled! Future captures will be automatically committed and pushed.
```

## Usage

### Automatic Commits

Once enabled, every `capture` automatically creates a commit:

```bash
$ envi capture
...
✔ Captured environment files for '@myorg/myapp'
◐ Committing to version control...
✔ Committed and pushed to GitHub
```

Commit messages are descriptive:

- `Update @myorg/myapp env files`
- `Update backend env files`

### View Your Repository

Visit your GitHub repository:

```
https://github.com/your-username/envi-store
```

You'll see:

- `README.md` - Explains the repository structure
- `config.maml` - Your envi configuration
- `store/` - All your captured env files
  - `@org/package.maml`
  - `project.maml`

## Sharing with Team Members

The `envi-store` repository is for personal use only. To share environment configurations with team members, use [encrypted blobs](/guides/sharing-configs) instead of adding collaborators to your GitHub repository.

See the [Sharing Environment Configurations](/guides/sharing-configs) guide for secure sharing options.

## Disable Integration

To stop automatic commits:

```bash
envi global github disable
```

Future captures will only save locally. Your GitHub repository remains unchanged.

## Restore from GitHub

To restore the entire envi store from GitHub (e.g., on a new machine):

```bash
envi global github restore
```

This will:

- Check if `envi-store` repository exists
- Warn if local `~/.envi/` has content
- Clone the repository (replacing local content)
- Enable GitHub integration automatically

## Security

::: warning IMPORTANT
The `envi-store` repository is created as **PRIVATE** by default.

Never make this repository public as it contains environment variable configurations.
:::

### Best Practices

**Personal use only** - The `envi-store` repository is meant for your personal use only. It stores all your environment configurations across different projects in one place for your convenience.

**Keep the repository private** - Never change the repository visibility to public as it contains your environment configurations.

**For sharing with team members** - Don't add collaborators to your `envi-store` repository. Instead, use [encrypted blobs](/guides/sharing-configs) to securely share environment configurations with team members temporarily.

## Troubleshooting

### GitHub CLI Not Found

```bash
 ERROR  GitHub CLI (gh) is not installed.

To install GitHub CLI:
  macOS:   brew install gh
  Linux:   See https://github.com/cli/cli#installation
  Windows: See https://github.com/cli/cli#installation
```

**Solution:** Install GitHub CLI and try again.

### Not Authenticated

```bash
 ERROR  Not authenticated with GitHub CLI.

To authenticate, run:
  gh auth login
```

**Solution:** Run `gh auth login` and follow the prompts.

### Repository Already Exists

If you've previously created `envi-store`, the command will fail. Options:

1. **Delete old repository** on GitHub, then run enable again
2. **Use existing repository** - manually add it as remote in `~/.envi/`

### Push Failures

If commits fail to push:

```bash
 WARN  Failed to commit/push: ...
ℹ Your files were still saved locally.
```

**Common causes:**

- No internet connection
- Repository was deleted on GitHub
- Authentication expired

**Solution:** Files are still saved locally. Fix the issue and run `capture` again.

## Related Commands

- [capture](/commands/capture) - Auto-commits when GitHub enabled
- [restore](/commands/restore) - Restore env files to repository
