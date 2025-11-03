# envi pack

Create an encrypted blob from your stored environment configuration that can be shared with team members.

## Usage

```bash
envi pack
```

## Description

The `pack` command finds all `.env` files in your repository, encrypts them, and **automatically copies the encrypted blob to your clipboard**. This blob can be safely shared with team members through communication channels like Slack, email, or messaging platforms.

> **Note:** Pack works completely independently of capture and global storage. It reads environment files directly from your repository and creates an encrypted blob - no capture needed!

### Encryption Methods

**For projects with a supported manifest file**:

- The blob is automatically encrypted using an MD5 hash of your project's manifest file contents
- **Supported manifests:** `package.json` (JavaScript/TypeScript), `Cargo.toml` (Rust), `go.mod` (Go), `pyproject.toml` (Python), `composer.json` (PHP), `pubspec.yaml` (Dart/Flutter), `pom.xml` (Java/Maven), `settings.gradle.kts` (Kotlin), `settings.gradle` (Java/Gradle)
- **Custom manifests:** You can add your own manifest files using `envi config manifest_files add <filename>` - see [Multi-Language Support](/guides/multi-language-support#managing-manifest-files)
- Only team members working in the same codebase (with identical manifest file) can decrypt the blob
- No manual secret management needed - the encryption key is automatically derived from your manifest

**For projects without a supported manifest file**:

- You'll be prompted to enter a custom encryption secret
- The secret must be at least 8 characters for security
- You must share both the blob AND the secret with your team members
- Team members will be prompted for the secret when unpacking

## Examples

### Projects with Manifest Files

Create a blob using your project's manifest file for encryption (works with JavaScript/TypeScript, Rust, Go, Python, PHP, etc.):

```bash
envi pack
```

Output:

```
✔ Finding repository root...
Repository root: /Users/you/projects/myapp
✔ Searching for .env files...
✔ Found 3 file(s) to pack
✔ Reading environment files...
Using package.json for encryption key
⚠ Note: Only team members with the same package.json can decrypt this blob
✔ Encrypting configuration...
✔ Copying blob to clipboard...
✔ Blob copied to clipboard!

Blob is now on your clipboard!
Share it with team members who have the same manifest file
They can restore it using: envi unpack
```

The blob is now in your clipboard and ready to paste into Slack, email, or any messaging platform. Your team members can simply run `envi unpack` without any arguments - it will automatically read the blob from their clipboard!

> **Note:** The output will mention the specific manifest file found (package.json, Cargo.toml, go.mod, etc.). The encryption key is derived from that file's contents.

### Projects without Supported Manifest Files

For projects without a supported manifest file, you'll be prompted for a secret:

```bash
envi pack
```

Interactive flow:

```
✔ Finding repository root...
Repository root: /Users/you/projects/myapp
✔ Searching for .env files...
✔ Found 2 file(s) to pack
✔ Reading environment files...
⚠ No supported manifest file found in repository root
This is expected for some project types.
You'll need to provide a secret for encryption.

? Enter an encryption secret: ********

Using custom secret for encryption
✔ Encrypting configuration...
✔ Copying blob to clipboard...
✔ Blob copied to clipboard!

Blob is now on your clipboard!
Share the blob and the secret with your team members
They will be prompted for the secret when running: envi unpack
```

The blob is automatically copied to your clipboard. Share both the blob (paste from clipboard) and the secret you entered with your team members.

## How It Works

1. **Finds project root** - Locates your project root (looks for version control markers: `.git`, `.jj`, `.hg`, `.svn`, or prompts for confirmation)
2. **Searches for .env files** - Finds all `.env` and `.env.*` files in your repository
3. **Reads environment files** - Parses each file, preserving comments and structure
4. **Detects project type** - Checks for supported manifest files in repository root (package.json, Cargo.toml, go.mod, pyproject.toml, composer.json, pubspec.yaml, pom.xml, settings.gradle.kts, settings.gradle)
5. **Generates encryption key**:
   - If a supported manifest file exists: Creates an MD5 hash of the manifest file contents to use as the encryption key
   - If no supported manifest found: Prompts for a custom secret (minimum 8 characters)
6. **Compresses data** - Uses gzip compression to reduce blob size by ~50%
7. **Encrypts data** - Uses AES-256-GCM encryption with authentication on compressed data
8. **Formats blob** - Wraps encrypted data in `__envi_start__` and `__envi_end__` delimiters
9. **Copies to clipboard** - Automatically copies the blob to your system clipboard for easy sharing

## Clipboard Feature

The blob is **automatically copied to your clipboard**, making it incredibly easy to share:

1. Run `envi pack`
2. Paste (Cmd+V / Ctrl+V) directly into Slack, Teams, email, or any messaging app
3. Your team member copies the blob and runs `envi unpack` (no arguments needed!)
4. The blob is automatically read from their clipboard and decrypted

If clipboard operations fail (e.g., in headless environments), the blob is displayed in the terminal instead.

## Security Considerations

### ⚠️ Critical Security Warning

**IMPORTANT:** Blobs encrypted with manifest files (automatic encryption) are **only secure while your codebase remains private**.

#### The Risk

When using manifest-based encryption (package.json, Cargo.toml, go.mod, etc.):

- Anyone with access to your codebase can decrypt your blobs
- An attacker could iterate through git commit history to find the commit that decrypts the blob
- **Never post blobs in publicly accessible locations**

**Safe sharing channels:**

- ✅ Private direct messages
- ✅ Password managers (1Password, Bitwarden)
- ✅ Encrypted messaging (Signal, etc.)

**Unsafe sharing channels:**

- ❌ Public Slack/Discord channels
- ❌ Public GitHub issues or wikis
- ❌ Public documentation
- ❌ Team wikis accessible to contractors
- ❌ Any location that might become public

**For truly sensitive data:** Use a custom strong secret (minimum 20+ random characters) instead of relying on manifest-based encryption. See the [Sharing Environment Configurations](/guides/sharing-configs#security-considerations) guide for detailed security information.

### Using Manifest-Based Encryption (Automatic)

**Pros:**

- No need to share secrets separately
- Works out of the box for teams
- Blob can only be decrypted in the same codebase
- Automatic key consistency across the team
- Supports many languages (JavaScript/TypeScript, Rust, Go, Python, PHP, Dart, Java, etc.)

**Cons:**

- ⚠️ **Insecure if codebase is compromised** - See warning above
- Blob becomes unreadable if manifest file changes (even a single character difference)
- Cannot be used as historical reference if manifest is updated
- Only works with supported project types
- MD5 hash means any whitespace or formatting change in manifest breaks decryption

### Using Custom Secret Encryption

**Pros:**

- ✅ **Secure even if codebase is compromised** (if secret is strong and kept separate)
- Blob remains readable regardless of codebase changes
- Can be stored as historical reference
- Full control over who can decrypt
- Works for any project type

**Cons:**

- Must share secret separately (through secure channel)
- Secret must be remembered/stored securely
- Requires manual secret management

**Recommendation:** For production credentials or highly sensitive data, always use a custom strong secret (20+ random characters) regardless of project type.

## Related Commands

- [`envi unpack`](./unpack) - Decrypt and restore a blob
- [`envi capture`](./capture) - Capture environment files to storage

## See Also

- [Sharing Environment Configurations](/guides/sharing-configs) - Complete guide to sharing configs
