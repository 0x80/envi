# envi unpack

Decrypt and restore environment configuration from an encrypted blob shared by a colleague.

## Usage

```bash
# Reads from clipboard automatically
envi unpack

# Or provide blob as argument
envi unpack <blob>
```

## Arguments

### `<blob>` (optional)

The encrypted blob to unpack. **If not provided, the blob is automatically read from your clipboard.**

The parser is resilient to formatting issues - whitespace, newlines, and indentation are automatically handled. This means the blob will work even if it's been:
- Reformatted by chat applications (Slack, Teams, Discord)
- Copy-pasted with extra spacing
- Modified with different line endings (Windows/Unix)

You can pass the blob as:
- No argument (reads from clipboard): `envi unpack`
- A single argument: `envi unpack "$(cat blob.txt)"`
- Multi-line with any formatting

## Description

The `unpack` command decrypts an encrypted blob (from clipboard or argument) and:
1. **First** prompts to restore the environment files directly to your repository
2. **Then** optionally prompts to save to your global storage (`~/.envi/store/`)

> **Note:** Unpack works completely independently of capture and storage. It decrypts the blob and restores files directly to your repository - no need to use global storage at all! Saving to storage is optional and only useful if you want to use `envi restore` later.

### Clipboard Feature

**When no blob argument is provided**, `unpack` automatically reads from your clipboard:
1. Copy a blob shared by a colleague (from Slack, email, etc.)
2. Run `envi unpack` (no arguments!)
3. The blob is automatically read from clipboard and decrypted

This makes sharing incredibly seamless - your colleague runs `envi pack`, you copy the blob they paste, and run `envi unpack`.

### Decryption Methods

**For JavaScript/TypeScript projects** (with `package.json`):
- Automatically attempts decryption using your `package.json` contents
- If decryption fails (blob was encrypted with a different `package.json` or custom secret), prompts for a custom secret
- No manual secret entry needed if `package.json` matches

**For other projects** (without `package.json`):
- Prompts you to enter the decryption secret
- The secret must match the one used when creating the blob

## Examples

### JavaScript/TypeScript Project (from clipboard)

The easiest way - just copy the blob from your colleague and run:

```bash
envi unpack
```

Interactive flow:
```
✔ Reading blob from clipboard...
✔ Blob loaded from clipboard
✔ Parsing blob...
Blob format validated
✔ Finding repository root...
Repository root: /Users/you/projects/myapp
Found package.json - attempting decryption
✔ Decrypting configuration...
✔ Decryption successful using package.json
✔ Validating configuration...
Found 3 file(s) in blob

? Restore environment files to this repository? › (Y/n)

✔ Restore complete!
Restored 3 file(s):
  ✓ .env
  ✓ .env.local
  ✓ apps/api/.env

? Save these environment files to global storage? › (y/N)

✔ Unpack complete!
```

### JavaScript/TypeScript Project (with blob argument)

You can also provide the blob as an argument:

```bash
envi unpack "__envi_start__
A7s9+kF3...
__envi_end__"
```

The flow is the same, but skips reading from clipboard.

### Non-JavaScript/TypeScript Project (from clipboard)

For projects without package.json, copy the blob and run:

```bash
envi unpack
```

Interactive flow:
```
✔ Reading blob from clipboard...
✔ Blob loaded from clipboard
✔ Parsing blob...
Blob format validated
✔ Finding repository root...
Repository root: /Users/you/projects/myapp
No package.json found - this is expected for non-JavaScript/TypeScript projects

? Enter the decryption secret: ********

✔ Decrypting configuration...
✔ Decryption successful
✔ Validating configuration...
Found 3 file(s) in blob

? Restore environment files to this repository? › (Y/n)

✔ Restore complete!
Restored 3 file(s):
  ✓ .env
  ✓ .env.test
  ✓ config/.env.local

? Save these environment files to global storage? › (y/N)

✔ Unpack complete!
```

### Declining Prompts

You can decline any of the interactive prompts:

- Decline restoring: The files won't be written to your repository (you can still save to storage if you want)
- Decline saving to storage: The files are restored to your repository but not saved to `~/.envi/store/` (most common - storage is optional!)

## How It Works

1. **Reads blob** - From clipboard if no argument provided, or from the argument
2. **Validates blob format** - Strips whitespace and checks for `__envi_start__` and `__envi_end__` delimiters
3. **Finds project root** - Locates your project root (looks for `.git`, or prompts for confirmation)
4. **Attempts decryption**:
   - If `package.json` exists: Tries decryption using its contents
   - If decryption fails or no `package.json`: Prompts for custom secret
5. **Decrypts data** - Uses AES-256-GCM decryption
6. **Validates configuration** - Ensures decrypted data is valid envi format
7. **Prompts to restore** - Asks if you want to write environment files to repository (with overwrite confirmation for existing files)
8. **Optionally saves to storage** - Asks if you also want to save to `~/.envi/store/` (defaults to No)

## Error Handling

### Invalid Blob Format

If the blob format is invalid:
```bash
✗ Invalid blob format
Expected format:
__envi_start__
[encrypted data]
__envi_end__
```

**Solution:** Ensure you copied the entire blob including both `__envi_start__` and `__envi_end__` markers with the encrypted data between them.

Note: The parser automatically handles whitespace, newlines, and formatting issues from chat applications, so the exact formatting doesn't matter. As long as both markers and the encrypted data are present, it should work.

### Decryption Failed

If automatic decryption fails, you'll be prompted for a secret:
```bash
Found package.json - attempting decryption
⚠ Failed to decrypt with package.json
This blob may have been encrypted with a custom secret

? Enter the decryption secret: ________
```

If the provided secret is also incorrect:
```bash
✗ Failed to decrypt blob with provided secret
This could mean:
  - The secret is incorrect
  - The blob is corrupted
  - The blob was encrypted with a different package.json
```

**Solutions:**
- Ask the sender which secret they used
- Verify you have the correct blob (not corrupted during copy-paste)
- For package.json-encrypted blobs, ensure you have the same `package.json` as the sender

### No package.json Found

```bash
No package.json found - this is expected for non-JavaScript/TypeScript projects

? Enter the decryption secret: ________
```

**Solution:** Enter the secret that was used when creating the blob. The sender should have shared this with you.

## Related Commands

- [`envi pack`](./pack) - Create an encrypted blob for sharing
- [`envi restore`](./restore) - Restore files from storage
- [`envi capture`](./capture) - Capture files to storage

## See Also

- [Sharing Environment Configurations](/guides/sharing-configs) - Complete guide to sharing configs
