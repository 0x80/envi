import { describe, it, expect } from "vitest";
import { main } from "./index.js";

describe("envi", () => {
  it("should export main function", () => {
    expect(main).toBeDefined();
    expect(typeof main).toBe("function");
  });
});
