# config

Manage Envi's global configuration settings.

## Usage

```bash
envi config redact <subcommand>
```

## Subcommands

### config redact add

Add a variable to the redaction list.

```bash
envi config redact add <VARIABLE_NAME>
```

**Example:**
```bash
envi config redact add GITHUB_PAT
envi config redact add GITLAB_TOKEN
envi config redact add SLACK_WEBHOOK_URL
```

When you add a variable to the redaction list:
- It will be replaced with `__envi_redacted__` when capturing or packing
- Real values will be preserved when restoring or unpacking (merged from existing files)
- The variable is added to `~/.envi/config.maml`

### config redact remove

Remove a variable from the redaction list.

```bash
envi config redact remove <VARIABLE_NAME>
```

**Example:**
```bash
envi config redact remove GITHUB_PAT
```

**Output:**
```bash
$ envi config redact remove GITLAB_TOKEN
✔ Removed 'GITLAB_TOKEN' from redaction list

$ envi config redact remove NON_EXISTENT
⚠ Variable 'NON_EXISTENT' is not in the redaction list
```

### config redact list

Display all variables currently in the redaction list.

```bash
envi config redact list
```

**Example output:**
```bash
$ envi config redact list
Redacted variables:
  • GITHUB_PAT
  • GITLAB_TOKEN
  • SLACK_WEBHOOK_URL
```

**When list is empty:**
```bash
$ envi config redact list
No redacted variables configured
```

## What is Redaction?

Redaction prevents accidental sharing of personal or sensitive environment variables. When a variable is redacted:

1. **During capture/pack:** The variable's value is replaced with the placeholder `__envi_redacted__`
2. **During restore/unpack:** The placeholder is replaced with the real value from your existing `.env` file (if it exists)

This allows you to:
- Share environment configurations via blobs without exposing personal tokens
- Store configurations in version control without personal credentials
- Safely collaborate while keeping developer-specific values private

## Default Redacted Variables

By default, Envi redacts:
- `GITHUB_PAT` - GitHub Personal Access Token

### Why GITHUB_PAT is Redacted by Default

`GITHUB_PAT` is a **personal access token** tied to an individual GitHub user account, not your organization. This means:

🧠 **Practical Implications**

✅ You can use a GITHUB_PAT to access org resources if that user has access to them

❌ You cannot create a PAT that belongs to the organization itself — it always belongs to a user (or bot user)

⚠️ Using a real user's PAT for org automation is discouraged — it can break when that user leaves or their password resets

**For team automation:** Use GitHub Apps, deploy keys, or organization-level tokens instead of personal access tokens.

**For local development:** Each developer should have their own GITHUB_PAT, which is why it's redacted by default.

You can remove this default if needed:
```bash
envi config redact remove GITHUB_PAT
```

## How Redaction Works

### When Capturing or Packing

```bash
$ envi capture
◐ Reading environment files...
⚠ Redacted 2 variable(s): GITHUB_PAT, SLACK_WEBHOOK_URL
ℹ These values will be stored as __envi_redacted__
✔ Captured 3 file(s) to storage
```

The stored configuration contains:
```toml
[[files]]
path = ".env"

[files.env]
DATABASE_URL = "postgres://localhost/myapp"
SHARED_API_KEY = "team-key-abc123"
GITHUB_PAT = "__envi_redacted__"
SLACK_WEBHOOK_URL = "__envi_redacted__"
```

### When Restoring or Unpacking

**Scenario 1: You have existing .env files**

```bash
$ envi restore
◐ Finding project root...
✔ Found 3 file(s) to restore
ℹ Preserved redacted variable(s) from existing files in 2 file(s)
✔ Restore complete!
```

Your existing values for `GITHUB_PAT` and `SLACK_WEBHOOK_URL` are preserved.

**Scenario 2: No existing .env files**

```bash
$ envi unpack
◐ Parsing blob...
✔ Found 3 file(s) in blob
✔ Restore complete!
```

The `.env` file will contain:
```bash
DATABASE_URL=postgres://localhost/myapp
SHARED_API_KEY=team-key-abc123
GITHUB_PAT=__envi_redacted__
SLACK_WEBHOOK_URL=__envi_redacted__
```

You'll need to manually add the real values for redacted variables.

## Use Cases

### Personal Access Tokens

Protect personal GitHub, GitLab, or other service tokens:

```bash
# Each developer adds their personal tokens
envi config redact add GITHUB_PAT
envi config redact add GITLAB_TOKEN
envi config redact add BITBUCKET_TOKEN

# Now you can safely share blobs without exposing these values
envi pack
```

### Developer-Specific API Keys

When each developer has their own API key:

```bash
# .env
SHARED_API_ENDPOINT=https://api.example.com
DEVELOPER_API_KEY=dev_abc123_personal

# Mark as redacted
envi config redact add DEVELOPER_API_KEY

# Share configuration
envi pack
# → SHARED_API_ENDPOINT is shared
# → DEVELOPER_API_KEY is redacted
```

### Local Development Credentials

Protect machine-specific or local credentials:

```bash
envi config redact add LOCAL_DB_PASSWORD
envi config redact add SSH_KEY_PATH
envi config redact add PERSONAL_EMAIL
```

### Team Onboarding

Set up redaction before capturing for team sharing:

```bash
# Senior developer prepares environment
envi config redact add GITHUB_PAT
envi config redact add PERSONAL_API_KEY
envi capture

# Share storage or create blob
envi pack

# New team members receive blob without personal credentials
# They add their own values after unpacking
```

## Configuration Storage

Redaction settings are stored in your global Envi configuration at `~/.envi/config.maml`:

```toml
use_version_control = false
additional_manifest_files = []
redacted_variables = ["GITHUB_PAT", "GITLAB_TOKEN", "SLACK_WEBHOOK_URL"]
```

This configuration is:
- **Global to your machine** - Applies to all projects
- **Personal** - Not shared with other developers
- **Persistent** - Survives across all capture/pack operations

## Best Practices

### What to Redact

**DO redact:**
- ✅ Personal access tokens (GitHub, GitLab, Bitbucket) - These are tied to individual user accounts
- ✅ Developer-specific API keys
- ✅ Individual Slack/Discord webhooks
- ✅ Local development credentials
- ✅ Machine-specific secrets
- ✅ Email addresses and personal identifiers

**DON'T redact:**
- ❌ Team-shared API keys - Meant to be shared across the team
- ❌ Shared service credentials - Used by all developers
- ❌ Organization-level tokens - GitHub Apps, deploy keys, etc.
- ❌ Common development URLs
- ❌ Team database credentials
- ❌ Public configuration values
- ❌ Port numbers and common settings

### Workflow Tips

1. **Set up early** - Configure redaction before your first capture/pack
2. **Document standards** - Agree with your team which variables should be redacted
3. **Review warnings** - Check the redaction warning output to verify correct variables
4. **Keep existing files** - Don't delete `.env` files before unpacking (preserves redacted values)

### Team Coordination

While redaction configuration is personal, teams should agree on naming conventions:

```bash
# Team standard: prefix personal tokens with PERSONAL_
PERSONAL_GITHUB_PAT=ghp_...
PERSONAL_API_KEY=sk_...

# Each developer adds to redaction
envi config redact add PERSONAL_GITHUB_PAT
envi config redact add PERSONAL_API_KEY
```

## Examples

### Example 1: Setting Up Personal Environment

```bash
# Add your personal tokens to redaction
envi config redact add GITHUB_PAT
envi config redact add SLACK_WEBHOOK_URL

# Verify redaction list
envi config redact list
# Output:
# Redacted variables:
#   • GITHUB_PAT
#   • SLACK_WEBHOOK_URL

# Capture and pack safely
envi capture
# ⚠ Redacted 2 variable(s): GITHUB_PAT, SLACK_WEBHOOK_URL
# ℹ These values will be stored as __envi_redacted__

envi pack
# Share the blob - personal tokens are protected
```

### Example 2: Removing Unnecessary Redaction

```bash
# Check current list
envi config redact list
# Output:
# Redacted variables:
#   • GITHUB_PAT
#   • OLD_TOKEN
#   • DATABASE_URL  ← this shouldn't be redacted

# Remove incorrect redaction
envi config redact remove DATABASE_URL
# ✔ Removed 'DATABASE_URL' from redaction list

# Verify
envi config redact list
# Output:
# Redacted variables:
#   • GITHUB_PAT
#   • OLD_TOKEN
```

### Example 3: Team Environment Setup

```bash
# Developer A prepares shared environment
envi config redact add GITHUB_PAT
envi config redact add PERSONAL_API_KEY
envi pack
# Share blob in team chat

# Developer B receives blob
git clone project
cd project
# Copy blob, then:
envi unpack

# Check .env file
cat .env
# DATABASE_URL=postgres://localhost/myapp
# SHARED_API_KEY=shared_key_123
# GITHUB_PAT=__envi_redacted__
# PERSONAL_API_KEY=__envi_redacted__

# Developer B adds their own values
# Edit .env to replace __envi_redacted__ with real tokens
```

### Example 4: Migrating from Old Configuration

```bash
# View current redaction (might have accumulated over time)
envi config redact list
# Output:
# Redacted variables:
#   • GITHUB_PAT
#   • OLD_API_KEY
#   • DEPRECATED_TOKEN
#   • LEGACY_SECRET

# Clean up old variables
envi config redact remove OLD_API_KEY
envi config redact remove DEPRECATED_TOKEN
envi config redact remove LEGACY_SECRET

# Add new variables
envi config redact add NEW_PERSONAL_TOKEN

# Verify final state
envi config redact list
# Output:
# Redacted variables:
#   • GITHUB_PAT
#   • NEW_PERSONAL_TOKEN
```

## Troubleshooting

### "Variable already in redaction list"

When trying to add a variable that's already redacted:

```bash
$ envi config redact add GITHUB_PAT
ℹ Variable 'GITHUB_PAT' is already in the redaction list
```

This is harmless - the variable is already protected.

### "Variable not in redaction list"

When trying to remove a variable that isn't redacted:

```bash
$ envi config redact remove SOME_VARIABLE
⚠ Variable 'SOME_VARIABLE' is not in the redaction list
```

The variable was never added or was already removed.

### Redacted Values in Restored Files

If you see `__envi_redacted__` in your `.env` files after restore/unpack:

**Cause:** You didn't have an existing `.env` file with real values, or the file was deleted before restore.

**Solution:**
```bash
# Manually replace placeholders with real values
# Edit .env:
GITHUB_PAT=__envi_redacted__  ← Replace this
# Change to:
GITHUB_PAT=ghp_your_real_token

# Or restore from backup if available
```

**Prevention:**
- Keep your `.env` files when unpacking
- Don't delete `.env` files before restoring
- The merge will preserve your real values

### Lost Redacted Values

If you lost your personal tokens after restore:

**Recovery:**
1. Check if you have a backup of your `.env` files
2. Check your password manager for stored tokens
3. Regenerate tokens from service providers (GitHub, etc.)
4. Update `.env` files with new tokens
5. Capture again to update storage

## Related Commands

- [capture](/commands/capture) - Capture env files to storage (applies redaction)
- [restore](/commands/restore) - Restore env files from storage (merges redacted values)
- [pack](/commands/pack) - Create encrypted blob (applies redaction)
- [unpack](/commands/unpack) - Decrypt and restore blob (merges redacted values)

## See Also

- [Sharing Configurations Guide](/guides/sharing-configs#variable-redaction) - Detailed guide on using redaction when sharing
- [Getting Started](/getting-started) - Basic Envi usage
