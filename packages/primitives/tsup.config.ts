import { vanillaExtractPlugin } from "@vanilla-extract/esbuild-plugin";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "es2022",
  external: [
    "react",
    "react-dom",
    "@catylast/tokens",
    "@catylast/icons",
    "cmdk",
    /^@radix-ui\//,
  ],
  banner: { js: '"use client";' },
  esbuildPlugins: [vanillaExtractPlugin()],
});
