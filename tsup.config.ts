import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/endpoint.ts", "src/session.ts"],
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  outDir: "dist",
});
