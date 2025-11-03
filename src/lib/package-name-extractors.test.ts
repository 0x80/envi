import { describe, it, expect } from "vitest";
import { join } from "node:path";
import {
  PACKAGE_EXTRACTORS,
  DEFAULT_MANIFEST_FILES,
} from "./package-name-extractors";

const FIXTURES_DIR = join(
  __dirname,
  "..",
  "__fixtures__",
  "package-extractors",
);

describe("Package name extractors", () => {
  describe("package.json (JavaScript/TypeScript)", () => {
    const extractor = PACKAGE_EXTRACTORS.find(
      (e) => e.filename === "package.json",
    );

    it("should extract name from valid package.json", () => {
      const fixtureDir = join(FIXTURES_DIR, "javascript");
      const result = extractor?.extract(fixtureDir);
      expect(result).toBe("@test/javascript-app");
    });

    it("should return null for missing package.json", () => {
      const result = extractor?.extract("/nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("composer.json (PHP)", () => {
    const extractor = PACKAGE_EXTRACTORS.find(
      (e) => e.filename === "composer.json",
    );

    it("should extract name from valid composer.json", () => {
      const fixtureDir = join(FIXTURES_DIR, "php");
      const result = extractor?.extract(fixtureDir);
      expect(result).toBe("vendor/php-package");
    });

    it("should return null for missing composer.json", () => {
      const result = extractor?.extract("/nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("go.mod (Go)", () => {
    const extractor = PACKAGE_EXTRACTORS.find((e) => e.filename === "go.mod");

    it("should extract last segment from module path", () => {
      const fixtureDir = join(FIXTURES_DIR, "go");
      const result = extractor?.extract(fixtureDir);
      expect(result).toBe("go-project");
    });

    it("should return null for missing go.mod", () => {
      const result = extractor?.extract("/nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("Cargo.toml (Rust)", () => {
    const extractor = PACKAGE_EXTRACTORS.find(
      (e) => e.filename === "Cargo.toml",
    );

    it("should extract name from valid Cargo.toml", () => {
      const fixtureDir = join(FIXTURES_DIR, "rust");
      const result = extractor?.extract(fixtureDir);
      expect(result).toBe("rust-app");
    });

    it("should return null for missing Cargo.toml", () => {
      const result = extractor?.extract("/nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("pyproject.toml (Python)", () => {
    const extractor = PACKAGE_EXTRACTORS.find(
      (e) => e.filename === "pyproject.toml",
    );

    it("should extract name from valid pyproject.toml", () => {
      const fixtureDir = join(FIXTURES_DIR, "python");
      const result = extractor?.extract(fixtureDir);
      expect(result).toBe("python-package");
    });

    it("should return null for missing pyproject.toml", () => {
      const result = extractor?.extract("/nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("pubspec.yaml (Dart/Flutter)", () => {
    const extractor = PACKAGE_EXTRACTORS.find(
      (e) => e.filename === "pubspec.yaml",
    );

    it("should extract name from valid pubspec.yaml", () => {
      const fixtureDir = join(FIXTURES_DIR, "dart");
      const result = extractor?.extract(fixtureDir);
      expect(result).toBe("flutter_app");
    });

    it("should return null for missing pubspec.yaml", () => {
      const result = extractor?.extract("/nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("settings.gradle.kts (Kotlin)", () => {
    const extractor = PACKAGE_EXTRACTORS.find(
      (e) => e.filename === "settings.gradle.kts",
    );

    it("should extract name from valid settings.gradle.kts", () => {
      const fixtureDir = join(FIXTURES_DIR, "kotlin");
      const result = extractor?.extract(fixtureDir);
      expect(result).toBe("kotlin-app");
    });

    it("should return null for missing settings.gradle.kts", () => {
      const result = extractor?.extract("/nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("settings.gradle (Java/Gradle)", () => {
    const extractor = PACKAGE_EXTRACTORS.find(
      (e) => e.filename === "settings.gradle",
    );

    it("should extract name from valid settings.gradle", () => {
      const fixtureDir = join(FIXTURES_DIR, "java-gradle");
      const result = extractor?.extract(fixtureDir);
      expect(result).toBe("java-gradle-app");
    });

    it("should return null for missing settings.gradle", () => {
      const result = extractor?.extract("/nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("pom.xml (Java/Maven)", () => {
    const extractor = PACKAGE_EXTRACTORS.find((e) => e.filename === "pom.xml");

    it("should extract artifactId from valid pom.xml", () => {
      const fixtureDir = join(FIXTURES_DIR, "java-maven");
      const result = extractor?.extract(fixtureDir);
      expect(result).toBe("maven-app");
    });

    it("should return null for missing pom.xml", () => {
      const result = extractor?.extract("/nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("DEFAULT_MANIFEST_FILES", () => {
    it("should include all supported manifest files", () => {
      expect(DEFAULT_MANIFEST_FILES).toContain("package.json");
      expect(DEFAULT_MANIFEST_FILES).toContain("Cargo.toml");
      expect(DEFAULT_MANIFEST_FILES).toContain("go.mod");
      expect(DEFAULT_MANIFEST_FILES).toContain("pyproject.toml");
      expect(DEFAULT_MANIFEST_FILES).toContain("composer.json");
      expect(DEFAULT_MANIFEST_FILES).toContain("pubspec.yaml");
      expect(DEFAULT_MANIFEST_FILES).toContain("settings.gradle.kts");
      expect(DEFAULT_MANIFEST_FILES).toContain("settings.gradle");
      expect(DEFAULT_MANIFEST_FILES).toContain("pom.xml");
    });

    it("should have package.json as first priority", () => {
      expect(DEFAULT_MANIFEST_FILES[0]).toBe("package.json");
    });
  });

  describe("PACKAGE_EXTRACTORS registry", () => {
    it("should have extractors for all default manifest files", () => {
      for (const manifestFile of DEFAULT_MANIFEST_FILES) {
        const extractor = PACKAGE_EXTRACTORS.find(
          (e) => e.filename === manifestFile,
        );
        expect(extractor).toBeDefined();
        expect(extractor?.extract).toBeInstanceOf(Function);
      }
    });
  });
});
