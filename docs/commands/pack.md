# envi pack

Create an encrypted blob from your stored environment configuration that can be shared with colleagues.

## Usage

```bash
envi pack
```

## Description

The `pack` command creates an encrypted blob containing your stored environment configuration and **automatically copies it to your clipboard**. This blob can be safely shared with colleagues through communication channels like Slack, email, or messaging platforms.

> **Note:** Pack works independently of the capture feature. You can pack and share environment files that are already in your global storage (`~/.envi/store/`), even if they weren't captured in the current session.

### Encryption Methods

**For JavaScript/TypeScript projects** (with `package.json`):
- The blob is automatically encrypted using your `package.json` contents as the encryption key
- Only colleagues working in the same codebase (with the same `package.json`) can decrypt the blob
- No manual secret management needed

**For other projects** (without `package.json`):
- You'll be prompted to enter a custom encryption secret
- The secret must be at least 8 characters for security
- You must share both the blob AND the secret with your colleagues
- Colleagues will be prompted for the secret when unpacking

## Examples

### JavaScript/TypeScript Project

Create a blob using package.json for encryption:

```bash
envi pack
```

Output:
```
✔ Finding repository root...
Repository root: /Users/you/projects/myapp
✔ Reading stored configuration...
Using package.json for encryption key
⚠ Note: Only colleagues with the same package.json can decrypt this blob
✔ Encrypting configuration...
✔ Copying blob to clipboard...
✔ Blob copied to clipboard!

Blob is now on your clipboard!
Share it with colleagues who have the same package.json
They can restore it using: envi unpack
```

The blob is now in your clipboard and ready to paste into Slack, email, or any messaging platform. Your colleagues can simply run `envi unpack` without any arguments - it will automatically read the blob from their clipboard!

### Non-JavaScript/TypeScript Project

For projects without package.json, you'll be prompted for a secret:

```bash
envi pack
```

Interactive flow:
```
✔ Finding repository root...
Repository root: /Users/you/projects/myapp
✔ Reading stored configuration...
⚠ No package.json found in repository root
This is expected for non-JavaScript/TypeScript projects.
You'll need to provide a secret for encryption.

? Enter an encryption secret: ********

Using custom secret for encryption
✔ Encrypting configuration...
✔ Copying blob to clipboard...
✔ Blob copied to clipboard!

Blob is now on your clipboard!
Share the blob and the secret with your colleagues
They will be prompted for the secret when running: envi unpack
```

The blob is automatically copied to your clipboard. Share both the blob (paste from clipboard) and the secret you entered with your colleagues.

## How It Works

1. **Reads stored configuration** - Loads your environment configuration from `~/.envi/store/`
2. **Detects project type** - Checks for `package.json` in repository root
3. **Generates encryption key**:
   - If `package.json` exists: Uses its contents to generate the key
   - If no `package.json`: Prompts for a custom secret (minimum 8 characters)
4. **Encrypts data** - Uses AES-256-GCM encryption with authentication
5. **Formats blob** - Wraps encrypted data in `__envi_start__` and `__envi_end__` delimiters
6. **Copies to clipboard** - Automatically copies the blob to your system clipboard for easy sharing

## Clipboard Feature

The blob is **automatically copied to your clipboard**, making it incredibly easy to share:

1. Run `envi pack`
2. Paste (Cmd+V / Ctrl+V) directly into Slack, Teams, email, or any messaging app
3. Your colleague copies the blob and runs `envi unpack` (no arguments needed!)
4. The blob is automatically read from their clipboard and decrypted

If clipboard operations fail (e.g., in headless environments), the blob is displayed in the terminal instead.

## Security Considerations

### Using package.json (JavaScript/TypeScript projects)

**Pros:**
- No need to share secrets separately
- Works out of the box for teams
- Blob can only be decrypted in the same codebase
- Automatic key consistency across the team

**Cons:**
- Blob becomes unreadable if `package.json` changes
- Cannot be used as historical reference if dependencies change
- Limited to JavaScript/TypeScript ecosystem

### Using Custom Secret (Other projects)

**Pros:**
- Blob remains readable regardless of codebase changes
- Can be stored as historical reference
- Full control over who can decrypt
- Works for any project type

**Cons:**
- Must share secret separately (through secure channel)
- Secret must be remembered/stored securely
- Requires manual secret management

## Related Commands

- [`envi unpack`](./unpack) - Decrypt and restore a blob
- [`envi capture`](./capture) - Capture environment files to storage

## See Also

- [Sharing Environment Configurations](/guides/sharing-configs) - Complete guide to sharing configs
