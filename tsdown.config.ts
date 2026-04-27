import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/cli.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  shims: true,
  platform: "node",
  target: "node20",
  minify: false,
  sourcemap: true,
  // Keep `.js`/`.d.ts` extensions to match the published `package.json` paths.
  // tsdown 0.21+ defaults `fixedExtension` to true on `platform: "node"`, which
  // would emit `.mjs`/`.d.mts`.
  fixedExtension: false,
});
