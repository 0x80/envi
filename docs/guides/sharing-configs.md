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

**For JavaScript/TypeScript projects** (with `package.json`):
- The encryption key is automatically derived from your `package.json` contents
- ✅ No need to share secrets separately
- ✅ Only team members with the same codebase can decrypt
- ✅ Automatic key consistency across the team
- ⚠️ Blobs become unreadable if `package.json` changes

**For other projects** (without `package.json`):
- You'll be prompted to enter a custom encryption secret when packing
- ✅ Works for any project type (Python, Go, Rust, etc.)
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

### Method 1: JavaScript/TypeScript Projects (package.json-based)

**Best for:** Regular team collaboration in JavaScript/TypeScript codebases

**How to share:**
```bash
# Sender
envi pack
# Blob is automatically copied to clipboard - paste into chat/email

# Receiver (in same codebase)
# Copy the blob from chat/email, then:
envi unpack
# Automatically reads from clipboard and decrypts using package.json
```

**Pros:**
- No secret management needed
- Automatic team synchronization
- Simple workflow
- Works out of the box

**Cons:**
- Stops working if `package.json` changes
- Not suitable for historical reference
- Limited to JavaScript/TypeScript ecosystem

### Method 2: Custom Secret (Non-JS/TS or Long-term Storage)

**Best for:** Non-JavaScript/TypeScript projects, long-term storage, or documentation

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

Use **package.json encryption** (automatic for JS/TS) when:
- Sharing with current team members in same codebase
- Quick environment setup
- Active development phase
- Working in JavaScript/TypeScript ecosystem

Use **custom secret** (prompted automatically for non-JS/TS) when:
- Working with non-JavaScript/TypeScript projects
- Documenting setup in README
- Creating onboarding materials
- Long-term storage needs
- Sharing across different projects

### Secret Management

When using custom secrets (non-JS/TS projects or when prompted):

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

#### JavaScript/TypeScript Project

1. **Prepare onboarding blob:**
   ```bash
   # One-time setup by team lead
   envi pack
   # Automatically uses package.json
   ```

2. **Add to documentation:**
   ```markdown
   ## Environment Setup

   Run this command with the blob from #team-secrets:
   ```bash
   envi unpack <blob>
   ```

3. **New member runs:**
   ```bash
   git clone <repository>
   cd <repository>
   npm install  # or pnpm install, yarn install
   # Copy blob from #team-secrets, then:
   envi unpack
   # Automatically reads from clipboard and decrypts using package.json
   ```

#### Non-JavaScript/TypeScript Project

1. **Prepare onboarding blob:**
   ```bash
   # One-time setup by team lead
   envi pack
   ? Enter an encryption secret: onboarding-2024
   ```

2. **Add to documentation:**
   ```markdown
   ## Environment Setup

   Run this command with the blob from #team-secrets:
   ```bash
   envi unpack <blob>
   # When prompted, enter: onboarding-2024
   ```

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

## Troubleshooting

### "Failed to decrypt blob"

**Causes:**
- Different `package.json` (JavaScript/TypeScript projects)
- Wrong custom secret (non-JS/TS projects or custom encrypted blobs)
- Corrupted blob

**Solutions:**

For JavaScript/TypeScript projects:
```bash
# If automatic decryption fails, you'll be prompted:
envi unpack <blob>
Found package.json - attempting decryption
⚠ Failed to decrypt with package.json
? Enter the decryption secret: ________
```

For non-JavaScript/TypeScript projects:
```bash
# Ensure you're entering the correct secret
envi unpack <blob>
? Enter the decryption secret: ________ (ask sender for this)
```

If issues persist:
- Verify you have the same `package.json` as sender (JS/TS projects)
- Ask sender to re-create blob if it may be corrupted
- For JS/TS projects with different package.json, sender can create new blob (will be prompted for custom secret automatically if no package.json)

### "Invalid blob format"

**Cause:** Incomplete copy-paste

**Solution:** Ensure you copied entire blob including:
```
__envi_start__
[full encrypted string]
__envi_end__
```

### "No package.json found"

**Cause:** Not in repository root, or working with non-JavaScript/TypeScript project

**Solutions:**

If you're in a JavaScript/TypeScript project:
```bash
# Navigate to repo root where package.json exists
cd path/to/repo/root
envi unpack <blob>
```

If you're in a non-JavaScript/TypeScript project:
```bash
# This is expected - you'll be prompted for secret
envi unpack <blob>
No package.json found - this is expected for non-JavaScript/TypeScript projects
? Enter the decryption secret: ________
```

## Security Considerations

### What's Protected

- ✅ Environment variable names
- ✅ Environment variable values
- ✅ File paths and structure
- ✅ Comments in env files

### What's Not Protected

- ❌ The fact that you're using Envi
- ❌ That a blob exists
- ❌ Package name (if using default encryption)

### Recommendations

1. **Never commit blobs to version control**
2. **Rotate secrets if exposed**
3. **Use different secrets per project/environment**
4. **Audit who has access to blobs**
5. **Remove old blobs from chat history when secrets change**

## Related Commands

- [`envi pack`](/commands/pack) - Create encrypted blob
- [`envi unpack`](/commands/unpack) - Decrypt and restore blob
- [`envi capture`](/commands/capture) - Capture environment files
- [`envi restore`](/commands/restore) - Restore from storage

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
```markdown
## Development Setup

1. Clone repository
2. Install dependencies: `pnpm install`
3. Setup environment:
   - Get blob from @tech-lead or #engineering channel
   - Copy the blob and run:
   ```bash
   envi unpack
   ```
   The blob will automatically decrypt using package.json
4. Start dev server: `pnpm dev`
```

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
   ```
3. Start dev server
```

## FAQ

**Q: Can I store blobs in git?**
A: No, treat blobs like passwords. Use secure channels only.

**Q: How long is a blob valid?**
A: Forever, as long as you have the correct secret/package.json.

**Q: Can I decrypt my own blobs later?**
A: Yes. For JavaScript/TypeScript projects, as long as you have the same package.json. For other projects, you need to remember/store the secret you used.

**Q: Is the blob the same each time?**
A: No, encryption includes random salt, so each pack creates a unique blob even with same data.

**Q: What if I lose the secret?**
A: For custom secrets (non-JS/TS projects), you cannot decrypt the blob. You'll need to re-capture and create a new blob. For JavaScript/TypeScript projects, the "secret" is your package.json which is version controlled.
