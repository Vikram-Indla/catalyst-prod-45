import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "es2022",
  // Emit `dist/tokens.css` after every JS build — including the
  // `tsup --watch` runs used by `pnpm dev`. Without this, the CSS file
  // only appears on a full `pnpm build`, and `dev` mode silently
  // 404s `@catylast/tokens/tokens.css` for the storybook preview.
  onSuccess: "tsx scripts/build-css.ts",
});
