/**
 * Vite config for the token-resolution fixture (CAT-DS-TOKEN-POISON-20260710-001).
 *
 * Root = this directory; reuses the repo's node_modules and postcss/tailwind
 * config so src/index.css compiles identically to the real app. Never shares
 * the app's vite.config.ts or dev-server cache (own cacheDir avoids clobbering
 * node_modules/.vite used by the running app dev server).
 *
 * Run: npx vite --config scripts/token-fixtures/vite.config.ts
 */
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const fixtureRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(fixtureRoot, '../..');

// node_modules may be a symlink (worktree) — allow the real location too.
let realNodeModules = path.join(repoRoot, 'node_modules');
try {
  realNodeModules = fs.realpathSync(realNodeModules);
} catch {
  /* keep default */
}

export default defineConfig({
  root: fixtureRoot,
  // Own cache — never contend with the app dev server's node_modules/.vite.
  cacheDir: path.join(fixtureRoot, '.vite-cache'),
  css: {
    // Resolve the repo's postcss.config.js (tailwind + autoprefixer) even
    // though our root is scripts/token-fixtures.
    postcss: repoRoot,
  },
  server: {
    port: 4179,
    strictPort: true,
    host: '127.0.0.1',
    fs: {
      // main.ts imports ../../src/*.css — outside the fixture root.
      allow: [repoRoot, realNodeModules],
    },
  },
  logLevel: 'warn',
});
