# Sharing Environment Configurations

Learn how to safely share environment configurations with your team members using Envi's encrypted blob feature.

## Overview

Envi allows you to securely share environment configurations with team members through encrypted blobs. This is useful when:

- Onboarding new team members
- Sharing configurations across different machines
- Providing environment setup for code review or testing
- Distributing configurations in team documentation

## Quick Start

**Sender (creating the blob):**

```bash
# Pack reads .env files directly from your repository
# No need to capture first!
envi pack
# Blob is automatically copied to clipboard
```

**Receiver (using the blob):**

```bash
# Copy the blob from chat/email and run (reads from clipboard automatically)
envi unpack
# Files are restored directly to your repository
```

> **Note:** Pack and unpack work **completely independently** of capture and restore. Pack reads environment files directly from your repository and creates an encrypted blob. Unpack decrypts the blob and restores files directly to your repository. No global storage needed!

## How It Works

### Encryption & Compression

Envi uses **gzip compression** followed by **AES-256-GCM encryption** with authentication to secure your environment data. Compression reduces blob size by approximately 50%, making blobs easier to share in chat applications and reducing copy-paste errors.

**Automatic encryption** (when a manifest file is detected):

- The encryption key is automatically derived from your project's manifest file
- **Supported manifests:** `package.json` (JavaScript/TypeScript), `Cargo.toml` (Rust), `go.mod` (Go), `pyproject.toml` (Python), `composer.json` (PHP), `pubspec.yaml` (Dart), `pom.xml` (Java), `settings.gradle` (Gradle), and more
- ✅ No need to share secrets separately
- ✅ Only team members with the same codebase can decrypt
- ✅ Automatic key consistency across the team
- ⚠️ Blobs become unreadable if manifest file changes

**Custom secret encryption** (when no manifest detected, or by choice):

- You'll be prompted to enter a custom encryption secret when packing
- ✅ Works for any project type
- ✅ Full control over encryption
- ⚠️ Must securely share the secret with your team

### Blob Format

Blobs are formatted with delimiters for easy identification:

```
__envi_start__
[base64 encoded encrypted data]
__envi_end__
```

This format makes blobs:

- Easy to copy-paste
- Identifiable in messages
- Resilient to formatting changes (whitespace, newlines, indentation are automatically handled)
- Safe to share in chat applications that might reformat text

### Clipboard Integration

Envi automatically handles clipboard operations to make sharing seamless:

**When packing:**

- The blob is automatically copied to your system clipboard
- You can immediately paste it into Slack, email, or any messaging platform
- If clipboard operations fail (e.g., headless environments), the blob is displayed in the terminal

**When unpacking:**

- If you don't provide a blob argument, envi automatically reads from your clipboard
- Simply copy the blob from chat/email and run `envi unpack`
- No need to manually paste the blob as a command argument

## Sharing Methods

### Method 1: Automatic Encryption (Manifest-based)

**Best for:** Regular team collaboration when a manifest file is present (JavaScript/TypeScript, Rust, Go, Python, PHP, etc.)

**How to share:**

```bash
# Sender
envi pack
# Blob is automatically copied to clipboard - paste into chat/email

# Receiver (in same codebase)
# Copy the blob from chat/email, then:
envi unpack
# Automatically reads from clipboard and decrypts using project manifest
```

**Pros:**

- No secret management needed
- Automatic team synchronization
- Simple workflow
- Works out of the box

**Cons:**

- Stops working if manifest file changes
- Not suitable for historical reference
- Only works with supported project types

**Works with:** JavaScript/TypeScript (`package.json`), Rust (`Cargo.toml`), Go (`go.mod`), Python (`pyproject.toml`), PHP (`composer.json`), Dart (`pubspec.yaml`), Java/Kotlin (Gradle/Maven), and more.

### Method 2: Custom Secret (Any Project or Long-term Storage)

**Best for:** Projects without manifest files, long-term storage, or documentation

**How to share:**

```bash
# Sender (will be prompted for secret)
envi pack
? Enter an encryption secret: ********
# Blob is automatically copied to clipboard
# Share both the blob (paste from clipboard) AND the secret

# Receiver (will be prompted for secret)
# Copy the blob from chat/email, then:
envi unpack
# Automatically reads from clipboard
? Enter the decryption secret: ********
```

**Pros:**

- Works for any project type (Python, Go, Rust, etc.)
- Works regardless of codebase changes
- Can be stored in documentation
- Survives dependency updates

**Cons:**

- Must manage and share secret separately
- Secret must be communicated securely

## Best Practices

### Choosing an Encryption Method

Use **automatic encryption** (when manifest file is present) when:

- Sharing with current team members in same codebase
- Quick environment setup
- Active development phase
- Working with supported project types (JS/TS, Rust, Go, Python, PHP, etc.)

Use **custom secret** (prompted when no manifest, or for extra security) when:

- Working with projects without manifest files
- Documenting setup in README
- Creating onboarding materials
- Long-term storage needs
- Sharing across different projects
- Maximum security for production credentials

### Secret Management

When using custom secrets (projects without manifest files or by choice):

1. **Choose meaningful secrets:**

   ```bash
   # When prompted, use descriptive secrets
   ? Enter an encryption secret: mycompany-api-setup-2024

   # Avoid weak or generic secrets
   ? Enter an encryption secret: abc123
   ```

2. **Share secrets securely:**
   - Use password managers
   - Encrypted communication
   - Team documentation tools
   - NOT in public channels

3. **Rotate secrets periodically:**
   ```bash
   # When creating new blob, use updated secret
   envi pack
   ? Enter an encryption secret: mycompany-api-setup-2025
   ```

### Blob Sharing

**Safe channels:**

- Private Slack/Teams channels
- Direct messages
- Company wiki (with access control)
- Password-protected documents

**Avoid:**

- Public repositories
- Public Slack channels
- Unencrypted emails
- Social media

## Common Workflows

### Onboarding New Team Member

#### Projects with Manifest Files (JS/TS, Rust, Go, Python, etc.)

1. **Prepare onboarding blob:**

   ```bash
   # One-time setup by team lead
   envi pack
   # Automatically uses project manifest for encryption
   ```

2. **Add to documentation:**

   ````markdown
   ## Environment Setup

   Run this command with the blob from #team-secrets:

   ```bash
   envi unpack <blob>
   ```
   ````

3. **New member runs:**
   ```bash
   git clone <repository>
   cd <repository>
   # Install dependencies (npm/pnpm, cargo, go mod, pip, etc.)
   # Copy blob from #team-secrets, then:
   envi unpack
   # Automatically reads from clipboard and decrypts using project manifest
   ```

#### Projects without Manifest Files

1. **Prepare onboarding blob:**

   ```bash
   # One-time setup by team lead
   envi pack
   ? Enter an encryption secret: onboarding-2024
   ```

2. **Add to documentation:**

   ````markdown
   ## Environment Setup

   Run this command with the blob from #team-secrets:

   ```bash
   envi unpack <blob>
   # When prompted, enter: onboarding-2024
   ```
   ````

3. **New member runs:**
   ```bash
   git clone <repository>
   cd <repository>
   # Copy blob from #team-secrets, then:
   envi unpack
   ? Enter the decryption secret: onboarding-2024
   ```

### Quick Team Sync

When everyone needs updated environment variables:

```bash
# Team member with updated config
envi pack
# Blob is now on clipboard - paste into team Slack channel

# Team members copy blob and run
envi unpack
# Automatically reads from clipboard and restores files
```

### Code Review Setup

Share environment needed for testing a branch:

```bash
# PR author adds blob to PR description (from envi pack)
# Reviewer copies blob and runs:
git checkout feature-branch
envi unpack  # Reads blob from clipboard
npm run dev  # Now has correct environment
```

## Variable Redaction

Envi provides a **variable redaction** feature to prevent accidental sharing of personal or sensitive tokens. This is especially important when sharing blobs with team members.

### What is Redaction?

Redaction allows you to mark specific environment variables as "redacted". When you capture or pack environment files, these variables:

- Are **replaced with a placeholder** (`__envi_redacted__`) in storage and blobs
- **Preserve their real values** in your local files during restore/unpack operations
- **Cannot be shared** via encrypted blobs or global storage

This protects personal tokens like:

- Personal access tokens (GitHub, GitLab, etc.)
- API keys tied to individual accounts
- Developer-specific credentials
- Local development secrets

### Default Redacted Variables

By default, Envi redacts:

- `GITHUB_PAT` - GitHub Personal Access Token

::: tip Why GITHUB_PAT is Redacted by Default
`GITHUB_PAT` is a **personal access token** that belongs to an individual GitHub user, not your organization.

🧠 **Practical Implications**

✅ You can use a GITHUB_PAT to access org resources if that user has access to them

❌ You cannot create a PAT that belongs to the organization itself — it always belongs to a user (or bot user)

⚠️ Using a real user's PAT for org automation is discouraged — it can break when that user leaves or their password resets

**For team automation:** Use GitHub Apps, deploy keys, or organization-level tokens instead.

**For local development:** Each developer needs their own GITHUB_PAT, which is why it's redacted by default to prevent accidental sharing.
:::

### Managing Redacted Variables

Add a variable to the redaction list:

```bash
envi config redact add SLACK_WEBHOOK_URL
```

Remove a variable from the redaction list:

```bash
envi config redact remove GITHUB_PAT
```

List all redacted variables:

```bash
envi config redact list
```

### How Redaction Works

**When capturing or packing:**

```bash
envi capture
# or
envi pack

# Output shows what was redacted:
⚠ Redacted 2 variable(s): GITHUB_PAT, SLACK_WEBHOOK_URL
These values will be stored as __envi_redacted__
```

**When restoring or unpacking:**

```bash
envi restore
# or
envi unpack

# If redacted variables are found and you have existing files:
ℹ Preserved redacted variable(s) from existing files in 2 file(s)
```

### Example Workflow

#### Setting Up Redaction for Your Team

```bash
# Each developer adds their personal tokens to redaction list
envi config redact add GITHUB_PAT
envi config redact add PERSONAL_API_KEY

# Create blob to share with team
envi pack

# The blob will NOT contain GITHUB_PAT or PERSONAL_API_KEY values
# They are stored as __envi_redacted__ instead
```

#### Receiving a Blob with Redacted Variables

```bash
# Receive blob from teammate
envi unpack

# If you already have a .env file with real values:
# → Redacted variables preserve your existing values
# → Non-redacted variables are updated from blob

# If you don't have a .env file:
# → Redacted variables will be set to __envi_redacted__
# → You need to manually add the real values
```

### Use Cases

#### Personal Tokens

Each developer has their own personal access token:

```bash
# In your .env
GITHUB_PAT=ghp_YourPersonalToken123
SHARED_API_KEY=shared-team-key-456

# Add personal token to redaction
envi config redact add GITHUB_PAT

# When you pack and share:
# → GITHUB_PAT is redacted (not shared)
# → SHARED_API_KEY is included in blob
```

#### Developer-Specific Configuration

Different developers need different values:

```bash
# Developer A's .env
LOCAL_DB_PORT=5432
DEVELOPER_NAME=alice
API_DEBUG_MODE=true

# Developer A adds personal config to redaction
envi config redact add DEVELOPER_NAME
envi config redact add LOCAL_DB_PORT

# When sharing blob:
# → API_DEBUG_MODE is shared with team
# → DEVELOPER_NAME and LOCAL_DB_PORT remain personal
```

#### Hybrid Sharing

Mix team-shared and personal variables:

```bash
# .env file
# Team-shared variables
DATABASE_URL=postgres://localhost/myapp
API_ENDPOINT=https://api.example.com

# Personal variables (redacted)
GITHUB_PAT=ghp_personal123
SLACK_WEBHOOK_URL=https://hooks.slack.com/yourwebhook

# Configure redaction
envi config redact add GITHUB_PAT
envi config redact add SLACK_WEBHOOK_URL

# Share with team
envi pack
# → DATABASE_URL and API_ENDPOINT are shared
# → GITHUB_PAT and SLACK_WEBHOOK_URL are redacted
```

### Best Practices

**DO redact:**

- ✅ Personal access tokens (GitHub, GitLab, Bitbucket) - These are tied to individual user accounts
- ✅ Developer-specific API keys
- ✅ Individual Slack/Discord webhooks
- ✅ Local development credentials
- ✅ Machine-specific configuration

**DON'T redact:**

- ❌ Team-shared API keys - Meant to be shared across the team
- ❌ Shared service credentials - Used by all developers
- ❌ Organization-level tokens - GitHub Apps, deploy keys, etc.
- ❌ Common development URLs
- ❌ Team database credentials
- ❌ Public configuration values

**Tips:**

1. **Add redaction before first capture/pack** - Set up your redaction list early to avoid accidentally sharing personal tokens
2. **Document team standards** - Agree which variables should be redacted across the team
3. **Review before sharing** - Check the redaction warning when packing to ensure correct variables are redacted
4. **Keep existing files** - When unpacking, keep your existing `.env` files so redacted variables preserve their real values

### Configuration Location

Redaction configuration is stored globally at `~/.envi/config.maml`:

```toml
use_version_control = false
manifest_files = [
  "package.json"
  "Cargo.toml"
  "go.mod"
  # ... full list of supported manifest files
]
redacted_variables = ["GITHUB_PAT", "SLACK_WEBHOOK_URL"]
```

This configuration is **personal to your machine** and won't be shared with others.

## Troubleshooting

### "Failed to decrypt blob"

**Causes:**

- Different manifest file (projects using automatic encryption)
- Wrong custom secret (custom encrypted blobs)
- Corrupted blob

**Solutions:**

For projects with automatic encryption:

```bash
# If automatic decryption fails, you'll be prompted:
envi unpack <blob>
Found package.json - attempting decryption
⚠ Failed to decrypt with manifest file
? Enter the decryption secret: ________
```

For projects with custom secrets:

```bash
# Ensure you're entering the correct secret
envi unpack <blob>
? Enter the decryption secret: ________ (ask sender for this)
```

If issues persist:

- Verify you have the same manifest file as sender (for automatic encryption)
- Ask sender to re-create blob if it may be corrupted
- For projects with different manifests, sender can create new blob with custom secret

### "Invalid blob format"

**Cause:** Incomplete copy-paste

**Solution:** Ensure you copied entire blob including:

```
__envi_start__
[full encrypted string]
__envi_end__
```

### "No manifest file found"

**Cause:** Not in repository root, or working with a project type without a supported manifest

**Solutions:**

If your project has a supported manifest file:

```bash
# Navigate to repo root where manifest exists
cd path/to/repo/root
envi unpack <blob>
```

If your project doesn't have a manifest file:

```bash
# This is expected - you'll be prompted for secret
envi unpack <blob>
No manifest file found - this is expected for some project types
? Enter the decryption secret: ________
```

## Security Considerations

### ⚠️ Critical Security Warning

**IMPORTANT:** Encrypted blobs are **only secure while your codebase remains private**.

#### The Vulnerability

When using **automatic encryption** (based on your project's manifest file):

- The encryption key is derived from your project manifest (e.g., `package.json` for JavaScript/TypeScript, `Cargo.toml` for Rust, `go.mod` for Go, etc.)
- If someone gains access to your codebase, they can decrypt any blob you've shared
- An attacker could iterate through git commit history to find the commit that decrypts the blob

**Example attack scenario:**

```bash
# Attacker gets access to your repository
git clone your-private-repo
cd your-private-repo

# They have the blob you posted somewhere
# They can try every commit to decrypt it
for commit in $(git log --all --format=%H); do
  git checkout $commit
  echo "Trying commit $commit..."
  envi unpack <your-blob> 2>/dev/null && echo "DECRYPTED!" && break
done
```

#### Safe Sharing Practices

**DO NOT post blobs in:**

- ❌ Public Slack/Discord channels
- ❌ Public GitHub issues
- ❌ Public documentation
- ❌ Team wikis accessible by contractors
- ❌ Shared drives with broad access
- ❌ Any location that might become public later

**SAFE channels (when codebase is private):**

- ✅ Private Slack/Teams DMs
- ✅ 1Password/Bitwarden shared vaults
- ✅ Encrypted messaging (Signal, etc.)
- ✅ Face-to-face communication
- ✅ Internal password managers

**ALWAYS SAFE (recommended for sensitive data):**
Use a **custom strong secret** instead of package.json-based encryption:

```bash
# When packing, use a strong custom secret
envi pack
? Enter an encryption secret: [generate a strong random password]

# This secret is NOT in your git history
# Attacker cannot derive it from codebase
# Share the secret through a separate secure channel
```

### What's Protected

- ✅ Environment variable names
- ✅ Environment variable values
- ✅ File paths and structure
- ✅ Comments in env files

### What's NOT Protected

- ❌ The fact that you're using Envi
- ❌ That a blob exists
- ❌ Project identifier (if using automatic encryption based on manifest)
- ❌ The contents if someone gets your codebase (when using manifest-based encryption)

### Security Recommendations

#### For Automatic Encryption (Manifest-based)

1. **Treat blobs as temporarily secure** - They're safe as long as codebase stays private
2. **Never post in public channels** - Even if your repo is currently private
3. **Assume codebase might leak** - Ex-employees, contractor access, future open-sourcing
4. **Rotate secrets regularly** - Create new blobs periodically
5. **Use custom secrets for sensitive data** - Production credentials, API keys, etc.

**Applies to:** JavaScript/TypeScript, Rust, Go, Python, PHP, Dart, Java/Kotlin, and all projects using manifest-based encryption.

#### For Custom Secret Encryption (Any Project)

1. **Use strong secrets** - Minimum 20+ random characters
2. **Never share secret in same channel as blob** - Use separate secure communication
3. **Store secrets in password manager** - Don't rely on memory
4. **Rotate secrets periodically** - Especially when team members leave
5. **Use different secrets per environment** - dev vs staging vs production

#### General Best Practices

1. **Never commit blobs to version control** - Even private repos
2. **Audit who has access** - Know who can decrypt your blobs
3. **Remove old blobs** - Delete from chat history when secrets change
4. **Monitor codebase access** - Track who has access to private repos
5. **Have an incident plan** - Know what to do if credentials are exposed

## Related Commands

- [`envi pack`](/commands/pack) - Create encrypted blob
- [`envi unpack`](/commands/unpack) - Decrypt and restore blob
- [`envi capture`](/commands/capture) - Capture environment files
- [`envi restore`](/commands/restore) - Restore from storage
- [`envi config redact`](/commands/config) - Manage redacted variables

## Example Scenarios

### Scenario 1: Emergency Environment Fix

A critical env variable is missing for the team:

```bash
# Developer A fixes locally
# Edit .env with correct value

# Share fix immediately
envi pack
# Blob is on clipboard - paste into team chat

# Team members copy blob and apply fix
envi unpack
# Files are restored directly
```

### Scenario 2: Multi-Project Setup

Setting up multiple related projects:

JavaScript/TypeScript projects:

```bash
# Create blob for each project (automatic encryption)
cd project-a && envi pack  # Paste blob-a into docs
cd ../project-b && envi pack  # Paste blob-b into docs

# New developer sets up both (automatic decryption)
cd project-a && npm install
# Copy blob-a from docs
envi unpack

cd ../project-b && npm install
# Copy blob-b from docs
envi unpack
```

Mixed or non-JS/TS projects:

```bash
# Create blob for each project with same secret
cd project-a && envi pack
? Enter an encryption secret: multi-2024
# Paste blob-a into docs

cd ../project-b && envi pack
? Enter an encryption secret: multi-2024
# Paste blob-b into docs

# New developer sets up both with same secret
cd project-a
# Copy blob-a from docs
envi unpack
? Enter the decryption secret: multi-2024

cd ../project-b
# Copy blob-b from docs
envi unpack
? Enter the decryption secret: multi-2024
```

### Scenario 3: Documented Onboarding

README with embedded instructions:

For JavaScript/TypeScript projects:

````markdown
## Development Setup

1. Clone repository
2. Install dependencies: `pnpm install`
3. Setup environment:
   - Get blob from @tech-lead or #engineering channel
   - Copy the blob and run:
   ```bash
   envi unpack
   ```
````

The blob will automatically decrypt using package.json 4. Start dev server: `pnpm dev`

````

For non-JavaScript/TypeScript projects:
```markdown
## Development Setup

1. Clone repository
2. Setup environment:
   - Get blob and secret from @tech-lead or #engineering channel
   - Copy the blob and run:
   ```bash
   envi unpack
   # Enter secret when prompted
````

3. Start dev server

```

## FAQ

**Q: Can I store blobs in git?**
A: No, treat blobs like passwords. Use secure channels only.

**Q: How long is a blob valid?**
A: Forever, as long as you have the correct secret/package.json.

**Q: Can I decrypt my own blobs later?**
A: Yes. For manifest-based encryption, as long as you have the same manifest file. For custom secret encryption, you need to remember/store the secret you used.

**Q: Is the blob the same each time?**
A: No, encryption includes random salt, so each pack creates a unique blob even with same data.

**Q: What if I lose the secret?**
A: For custom secret encryption, you cannot decrypt the blob without the secret. You'll need to re-capture and create a new blob. For manifest-based encryption, the "secret" is your manifest file (package.json, Cargo.toml, etc.) which is version controlled.
```
