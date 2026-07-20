import { describe, expect, it } from "vitest";
import { formatSkippedPreview } from "./format-skipped-preview";

describe("formatSkippedPreview", () => {
  it("joins a short list without a suffix", () => {
    expect(formatSkippedPreview(["a", "b", "c"])).toBe("a, b, c");
  });

  it("shows the first `max` entries and summarizes the remainder", () => {
    const paths = ["a", "b", "c", "d", "e", "f", "g"];
    expect(formatSkippedPreview(paths)).toBe("a, b, c, d, e (...and 2 more)");
  });

  it("adds no suffix when the list is exactly `max` long", () => {
    expect(formatSkippedPreview(["a", "b", "c", "d", "e"])).toBe(
      "a, b, c, d, e",
    );
  });

  it("honors a custom `max`", () => {
    expect(formatSkippedPreview(["a", "b", "c"], 1)).toBe("a (...and 2 more)");
  });

  it("returns an empty string for an empty list", () => {
    expect(formatSkippedPreview([])).toBe("");
  });
});
