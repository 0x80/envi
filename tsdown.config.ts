import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/cli.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  shims: true,
  platform: "node",
  target: "node18",
  minify: false,
  sourcemap: true,
});
