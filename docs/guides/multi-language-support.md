# Multi-Language Support

Envi is language-agnostic and works with projects written in any programming language when installed globally. The tool automatically detects package names from various manifest files to organize your environment configurations.

## Supported Languages

Envi automatically detects package names from the following languages and frameworks:

| Language/Framework | Manifest File | Example Package Name |
|-------------------|--------------|---------------------|
| JavaScript/TypeScript | `package.json` | `@org/app` or `myapp` |
| Rust | `Cargo.toml` | `rust-app` |
| Go | `go.mod` | `go-project` |
| Python | `pyproject.toml` | `python-package` |
| PHP | `composer.json` | `vendor/package` |
| Dart/Flutter | `pubspec.yaml` | `flutter_app` |
| Kotlin/Android | `settings.gradle.kts` | `kotlin-app` |
| Java (Gradle) | `settings.gradle` | `java-app` |
| Java (Maven) | `pom.xml` | `maven-app` |

## How It Works

### Detection Order

When you run `envi capture`, Envi checks for manifest files in your project root in the following order:

1. `package.json` (JavaScript/TypeScript)
2. `Cargo.toml` (Rust)
3. `go.mod` (Go)
4. `pyproject.toml` (Python)
5. `composer.json` (PHP)
6. `pubspec.yaml` (Dart/Flutter)
7. `settings.gradle.kts` (Kotlin)
8. `settings.gradle` (Java/Gradle)
9. `pom.xml` (Java/Maven)

The **first file found** is used to extract the package name. If no manifest file is found, Envi uses the folder name as a fallback.

### Storage Organization

Configurations are stored in `~/.envi/store/` with filenames based on the detected package name:

- **Scoped packages**: `~/.envi/store/@org/package.maml`
- **Unscoped packages**: `~/.envi/store/package-name.maml`
- **No manifest file**: `~/.envi/store/folder-name.maml`

## Language-Specific Examples

### JavaScript/TypeScript

**File:** `package.json`

```json
{
  "name": "@myorg/frontend",
  "version": "1.0.0"
}
```

**Detected name:** `@myorg/frontend`
**Storage path:** `~/.envi/store/@myorg/frontend.maml`

---

### Rust

**File:** `Cargo.toml`

```toml
[package]
name = "my-rust-app"
version = "0.1.0"
edition = "2021"
```

**Detected name:** `my-rust-app`
**Storage path:** `~/.envi/store/my-rust-app.maml`

---

### Go

**File:** `go.mod`

```
module github.com/username/awesome-project

go 1.21
```

**Detected name:** `awesome-project` (last segment of module path)
**Storage path:** `~/.envi/store/awesome-project.maml`

---

### Python

**File:** `pyproject.toml`

```toml
[project]
name = "data-processor"
version = "1.0.0"
```

**Detected name:** `data-processor`
**Storage path:** `~/.envi/store/data-processor.maml`

---

### PHP

**File:** `composer.json`

```json
{
  "name": "vendor/php-library",
  "description": "A PHP library"
}
```

**Detected name:** `vendor/php-library`
**Storage path:** `~/.envi/store/vendor/php-library.maml`

---

### Dart/Flutter

**File:** `pubspec.yaml`

```yaml
name: my_flutter_app
description: A Flutter application
version: 1.0.0
```

**Detected name:** `my_flutter_app`
**Storage path:** `~/.envi/store/my_flutter_app.maml`

---

### Kotlin/Android

**File:** `settings.gradle.kts`

```kotlin
rootProject.name = "android-app"
```

**Detected name:** `android-app`
**Storage path:** `~/.envi/store/android-app.maml`

---

### Java (Gradle)

**File:** `settings.gradle`

```groovy
rootProject.name = 'spring-boot-api'
```

**Detected name:** `spring-boot-api`
**Storage path:** `~/.envi/store/spring-boot-api.maml`

---

### Java (Maven)

**File:** `pom.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <groupId>com.example</groupId>
  <artifactId>spring-service</artifactId>
  <version>1.0.0</version>
</project>
```

**Detected name:** `spring-service` (uses `artifactId`)
**Storage path:** `~/.envi/store/spring-service.maml`

## Configuration

### Viewing Current Configuration

Check which manifest files Envi is configured to detect:

```bash
# View your config file
cat ~/.envi/config.maml
```

Built-in default manifest files (checked in this order):

1. `package.json` - JavaScript/TypeScript
2. `Cargo.toml` - Rust
3. `go.mod` - Go
4. `pyproject.toml` - Python
5. `composer.json` - PHP
6. `pubspec.yaml` - Dart/Flutter
7. `settings.gradle.kts` - Kotlin/Android
8. `settings.gradle` - Java/Gradle
9. `pom.xml` - Java/Maven

These defaults are always checked and cannot be removed.

### Adding Custom Manifest Files

If your project uses a non-standard manifest file, you can add it to be checked **before** the defaults:

**Edit** `~/.envi/config.maml`:

```maml
{
  use_version_control: false
  additional_manifest_files: [
    "my-custom-manifest.json"  # Checked first
    "app.yaml"                 # Checked second
  ]
  # Default files are checked after additional files
}
```

**Note:** Envi will skip unknown manifest files that don't have built-in extractors. You would need to implement a custom extractor for `my-custom-manifest.json` to work.

### Priority Order

The final detection order is:
1. **Additional files** from `~/.envi/config.maml` (if configured)
2. **Default files** (built-in list above)

This allows you to prioritize custom manifest files while always falling back to the standard detection.

## Encryption Support

**All supported manifest files can be used for automatic blob encryption**, not just package.json!

### How It Works

When you run `envi pack` or `envi unpack`, Envi:

1. Checks for any supported manifest file in your repository root (in priority order)
2. Generates an MD5 hash of the manifest file contents
3. Uses that hash as the encryption/decryption key
4. No manual secret needed if you have a supported manifest file

### Supported Languages for Auto-Encryption

| Language | Manifest File | Status |
|----------|--------------|--------|
| JavaScript/TypeScript | `package.json` | ✅ Fully supported |
| Rust | `Cargo.toml` | ✅ Fully supported |
| Go | `go.mod` | ✅ Fully supported |
| Python | `pyproject.toml` | ✅ Fully supported |
| PHP | `composer.json` | ✅ Fully supported |
| Dart/Flutter | `pubspec.yaml` | ✅ Fully supported |
| Kotlin | `settings.gradle.kts` | ✅ Fully supported |
| Java (Gradle) | `settings.gradle` | ✅ Fully supported |
| Java (Maven) | `pom.xml` | ✅ Fully supported |

### Example Workflows

**Rust Project:**

```bash
# Team member A creates encrypted blob (has Cargo.toml)
envi pack
# Output: Using Cargo.toml for encryption key
# Blob copied to clipboard

# Team member B decrypts blob (has same Cargo.toml)
envi unpack
# Output: Found Cargo.toml - attempting decryption
# ✔ Decryption successful using Cargo.toml
```

**Go Project:**

```bash
# Team member creates blob (has go.mod)
envi pack
# Output: Using go.mod for encryption key

# Colleague decrypts (has same go.mod)
envi unpack
# Output: Found go.mod - attempting decryption
# ✔ Decryption successful using go.mod
```

**Python Project:**

```bash
# Create blob with pyproject.toml
envi pack
# Output: Using pyproject.toml for encryption key

# Decrypt with same pyproject.toml
envi unpack
# Output: Found pyproject.toml - attempting decryption
# ✔ Decryption successful using pyproject.toml
```

### Important Notes

- **Identical files required**: The manifest file must be byte-for-byte identical for decryption to work
- **Any change breaks decryption**: Even whitespace or formatting changes will cause decryption to fail
- **MD5 hash**: The entire file contents are hashed with MD5 to create a consistent encryption key
- **Fallback to custom secret**: If no manifest found or decryption fails, you'll be prompted for a custom secret
- **Custom manifest files**: You can add your own manifest files using `additional_manifest_files` in `~/.envi/config.maml` (see [Adding Custom Manifest Files](#adding-custom-manifest-files) above). These will be checked first, before the built-in defaults, and can be used for encryption too.

### Security Implications

The same security considerations apply to all manifest-based encryption:

⚠️ **WARNING**: Blobs encrypted with manifest files are only secure while your codebase remains private. Anyone with access to your repository can decrypt your blobs.

**For production secrets**: Use a custom secret instead of manifest-based encryption. See [Pack](/commands/pack#security-considerations) for details.

## Programmatic Usage

### Using the API

```typescript
import {
  getPackageName,
  DEFAULT_MANIFEST_FILES,
  PACKAGE_EXTRACTORS,
} from "@codecompose/envi";

// Get package name from a repository
const packageName = getPackageName("/path/to/rust/project");
console.log(packageName); // "my-rust-app"

// Check default manifest files
console.log(DEFAULT_MANIFEST_FILES);
// ["package.json", "Cargo.toml", "go.mod", ...]

// Access extractors directly
for (const extractor of PACKAGE_EXTRACTORS) {
  const name = extractor.extract("/path/to/project");
  if (name) {
    console.log(`Found ${name} from ${extractor.filename}`);
    break;
  }
}
```

### Custom Extractor

```typescript
import type { PackageExtractor } from "@codecompose/envi";

const customExtractor: PackageExtractor = {
  filename: "my-manifest.json",
  extract: (repoPath) => {
    // Your custom extraction logic
    return "custom-package-name";
  },
};
```

## Troubleshooting

### Package Name Not Detected

**Problem:** Envi uses folder name instead of package name from manifest file.

**Solution:**

1. Verify manifest file exists in project root:
   ```bash
   ls -la package.json Cargo.toml go.mod
   ```

2. Check if file is valid:
   ```bash
   # For JSON files
   cat package.json | jq .

   # For TOML files
   cat Cargo.toml
   ```

3. Verify the package name field exists:
   - `package.json`: `name` field
   - `Cargo.toml`: `[package]` section with `name`
   - `go.mod`: First line starting with `module`
   - `pyproject.toml`: `[project]` section with `name`

### Wrong Language Detected

**Problem:** Envi detects the wrong manifest file because your project has multiple manifest files.

**Solution:** The default detection order prioritizes package.json first, then Cargo.toml, go.mod, etc. If you need different behavior, you have a few options:

1. **Accept the default** - The first detected manifest file will be used
2. **Rename manifest files** - Temporarily remove or rename unwanted manifest files during capture
3. **Use folder name** - If no manifest file is found, Envi uses the folder name as the storage key

**Note:** The default manifest file order cannot be changed, but you can add custom manifest files that will be checked first using `additional_manifest_files`.

### Monorepo with Multiple Languages

**Problem:** Monorepo root has manifest files for multiple languages.

**Solution:**

1. **Option A:** Use the most important language first in config
2. **Option B:** Remove manifest files from root, keep them in subdirectories
3. **Option C:** Accept folder name as storage key (simplest)

**Example:** TypeScript monorepo with Rust packages:

```
monorepo/
├── package.json           # Root package.json for workspace
├── packages/
│   ├── frontend/
│   │   ├── .env
│   │   └── package.json
│   └── backend/
│       ├── .env
│       └── Cargo.toml
```

Running `envi capture` from root will use the root `package.json` name for storage. Individual packages can be captured separately by running `envi capture` from their directories.

## Best Practices

### Global Installation

For multi-language support, **install Envi globally**:

```bash
pnpm add -g @codecompose/envi
```

This allows you to use `envi` in projects written in any language, not just JavaScript/TypeScript projects.

### Configuration Recommendations

1. **Use defaults** - The built-in manifest files cover all supported languages
2. **Add custom files** - Only add `additional_manifest_files` if you have non-standard manifest files
3. **Prioritize custom files** - Additional files are checked before defaults, so you can prioritize specific patterns
4. **Use GitHub integration** - Sync your custom configuration across machines

### Storage Organization

- Scoped packages (e.g., `@org/name`) automatically create subdirectories
- Package names with `/` (e.g., PHP's `vendor/package`) create subdirectories
- Simple names create files directly in `~/.envi/store/`

## Related

- [Getting Started](/getting-started) - Installation and basic usage
- [Commands](/commands/capture) - Detailed command documentation
- [File Format](/file-format) - How Envi stores configurations
- [API Reference](/api/reference) - Programmatic usage
