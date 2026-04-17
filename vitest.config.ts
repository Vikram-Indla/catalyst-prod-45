import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Test-only stubs for @atlaskit/* packages. These aliases are scoped to
// vitest (this file is NOT vite.config.ts) so production builds still
// resolve the real packages. Tests that want to exercise atlaskit behaviour
// should mock at a higher layer (e.g. AtlaskitEditor wrapper).
const atlaskitStubs = {
  "@atlaskit/editor-core": path.resolve(__dirname, "./src/test/__stubs__/atlaskit-editor-core.ts"),
  "@atlaskit/adf-utils/traverse": path.resolve(__dirname, "./src/test/__stubs__/atlaskit-adf-utils-traverse.ts"),
  "@atlaskit/adf-utils/types": path.resolve(__dirname, "./src/test/__stubs__/atlaskit-adf-utils-types.ts"),
};

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      ...atlaskitStubs,
    },
  },
});
