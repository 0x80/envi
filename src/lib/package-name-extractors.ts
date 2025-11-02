import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import toml from "@iarna/toml";
import { XMLParser } from "fast-xml-parser";
import yaml from "js-yaml";

/**
 * Package extractor function that attempts to extract a package name from a manifest file
 */
export interface PackageExtractor {
  /** The filename to look for in the repository root */
  filename: string;
  /** Extract package name from the file, returns null if extraction fails */
  extract: (repositoryPath: string) => string | null;
}

/**
 * Extract package name from package.json (JavaScript/TypeScript)
 */
function extractFromPackageJson(repositoryPath: string): string | null {
  const filePath = join(repositoryPath, "package.json");

  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    const manifest = JSON.parse(content);
    return manifest.name || null;
  } catch {
    return null;
  }
}

/**
 * Extract package name from composer.json (PHP)
 */
function extractFromComposerJson(repositoryPath: string): string | null {
  const filePath = join(repositoryPath, "composer.json");

  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    const manifest = JSON.parse(content);
    return manifest.name || null;
  } catch {
    return null;
  }
}

/**
 * Extract package name from go.mod (Go)
 * Extracts the last segment of the module path
 * Example: "github.com/user/repo" -> "repo"
 */
function extractFromGoMod(repositoryPath: string): string | null {
  const filePath = join(repositoryPath, "go.mod");

  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    const match = content.match(/^module\s+(.+)$/m);

    if (!match) {
      return null;
    }

    const modulePath = match[1].trim();
    // Extract last segment: "github.com/user/repo" -> "repo"
    const segments = modulePath.split("/");
    return segments[segments.length - 1] || null;
  } catch {
    return null;
  }
}

/**
 * Extract package name from Cargo.toml (Rust)
 */
function extractFromCargoToml(repositoryPath: string): string | null {
  const filePath = join(repositoryPath, "Cargo.toml");

  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    const parsed = toml.parse(content) as {
      package?: { name?: string };
    };

    return parsed.package?.name || null;
  } catch {
    return null;
  }
}

/**
 * Extract package name from pyproject.toml (Python)
 */
function extractFromPyprojectToml(repositoryPath: string): string | null {
  const filePath = join(repositoryPath, "pyproject.toml");

  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    const parsed = toml.parse(content) as {
      project?: { name?: string };
    };

    return parsed.project?.name || null;
  } catch {
    return null;
  }
}

/**
 * Extract package name from pubspec.yaml (Dart/Flutter)
 */
function extractFromPubspecYaml(repositoryPath: string): string | null {
  const filePath = join(repositoryPath, "pubspec.yaml");

  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    const parsed = yaml.load(content) as { name?: string };

    return parsed.name || null;
  } catch {
    return null;
  }
}

/**
 * Extract package name from settings.gradle.kts (Kotlin/Gradle)
 * Looks for: rootProject.name = "my-app"
 */
function extractFromSettingsGradleKts(repositoryPath: string): string | null {
  const filePath = join(repositoryPath, "settings.gradle.kts");

  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    const match = content.match(/rootProject\.name\s*=\s*["']([^"']+)["']/);

    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Extract package name from settings.gradle (Java/Gradle)
 * Looks for: rootProject.name = 'my-app'
 */
function extractFromSettingsGradle(repositoryPath: string): string | null {
  const filePath = join(repositoryPath, "settings.gradle");

  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    const match = content.match(/rootProject\.name\s*=\s*["']([^"']+)["']/);

    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Extract package name from pom.xml (Java/Maven)
 * Uses artifactId as the package name
 */
function extractFromPomXml(repositoryPath: string): string | null {
  const filePath = join(repositoryPath, "pom.xml");

  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    const parser = new XMLParser();
    const parsed = parser.parse(content) as {
      project?: {
        artifactId?: string;
      };
    };

    return parsed.project?.artifactId || null;
  } catch {
    return null;
  }
}

/**
 * Default list of package manifest files to check (in priority order)
 */
export const DEFAULT_MANIFEST_FILES = [
  "package.json", // JavaScript/TypeScript
  "Cargo.toml", // Rust
  "go.mod", // Go
  "pyproject.toml", // Python
  "composer.json", // PHP
  "pubspec.yaml", // Dart/Flutter
  "settings.gradle.kts", // Kotlin/Android
  "settings.gradle", // Java/Gradle
  "pom.xml", // Java/Maven
];

/**
 * Registry of all available package extractors
 */
export const PACKAGE_EXTRACTORS: PackageExtractor[] = [
  { filename: "package.json", extract: extractFromPackageJson },
  { filename: "composer.json", extract: extractFromComposerJson },
  { filename: "go.mod", extract: extractFromGoMod },
  { filename: "Cargo.toml", extract: extractFromCargoToml },
  { filename: "pyproject.toml", extract: extractFromPyprojectToml },
  { filename: "pubspec.yaml", extract: extractFromPubspecYaml },
  {
    filename: "settings.gradle.kts",
    extract: extractFromSettingsGradleKts,
  },
  { filename: "settings.gradle", extract: extractFromSettingsGradle },
  { filename: "pom.xml", extract: extractFromPomXml },
];
