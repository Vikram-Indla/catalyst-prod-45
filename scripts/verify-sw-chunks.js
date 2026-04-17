#!/usr/bin/env node

/**
 * Catalyst Atlaskit SW precache drift guard.
 *
 * Purpose
 * -------
 * `public/sw.js` runs a cache-first strategy on a fixed allowlist of
 * Vite-hashed vendor chunks (Atlaskit / ProseMirror / Tiptap). That
 * allowlist is a static array of URL prefixes, e.g.
 *     '/assets/vendor-atlaskit-editor'
 *
 * The actual chunk names come from `vite.config.ts`, specifically the
 * `manualChunks()` function, which returns names like
 *     return 'vendor-atlaskit-editor';
 *
 * If someone renames a vendor chunk (e.g. `vendor-atlaskit-ui` →
 * `vendor-atlaskit-primitives`) and forgets to update the SW allowlist,
 * the failure is silent — users stop getting SW caching for that chunk
 * and perf quietly regresses. This script makes that mistake LOUD.
 *
 * What it checks
 * --------------
 *   1. Every chunk name emitted by `manualChunks()` for Atlaskit,
 *      ProseMirror, or Tiptap has a matching prefix in the SW allowlist.
 *   2. Every SW allowlist prefix corresponds to a chunk name that
 *      `manualChunks()` actually returns (no dead entries).
 *   3. (Optional) If `dist/assets/*.js` exists from a previous build,
 *      every SW prefix has at least one real chunk file on disk.
 *
 * Scope
 * -----
 * Only chunks that start with `vendor-atlaskit-`, `vendor-prosemirror`,
 * or `vendor-tiptap` are in scope. Other vendor chunks (`vendor-react`,
 * `vendor-ui`, etc.) are intentionally ignored — they are handled by
 * the browser's HTTP cache, not the Service Worker.
 *
 * Usage
 * -----
 *   node scripts/verify-sw-chunks.js
 *
 * Exit codes
 * ----------
 *   0 — allowlist and chunk names are in sync
 *   1 — drift detected (details printed to stderr)
 *   2 — script couldn't read its inputs (missing files, parse failure)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const SW_PATH = path.join(REPO_ROOT, 'public', 'sw.js');
const VITE_CONFIG_PATH = path.join(REPO_ROOT, 'vite.config.ts');
const DIST_ASSETS_DIR = path.join(REPO_ROOT, 'dist', 'assets');

// Chunks we require the SW to cover. Any chunk name returned by
// manualChunks() whose prefix matches one of these families MUST appear
// in the SW allowlist. Keep this list aligned with the Layer 4 design
// documented in vite.config.ts and public/sw.js.
const SW_COVERED_FAMILIES = [
  'vendor-atlaskit-',
  'vendor-prosemirror',
  'vendor-tiptap',
];

function fatal(msg, code = 2) {
  console.error(`✗ [verify-sw-chunks] ${msg}`);
  process.exit(code);
}

function readFile(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch (err) {
    fatal(`Cannot read ${path.relative(REPO_ROOT, p)}: ${err.message}`);
  }
}

/**
 * Parse the SW allowlist. Looks for the
 *   const CACHEABLE_CHUNK_PREFIXES = [ ... ];
 * declaration and extracts every single-quoted string inside.
 */
function extractSwAllowlist(swSource) {
  const match = swSource.match(
    /const\s+CACHEABLE_CHUNK_PREFIXES\s*=\s*\[([\s\S]*?)\]\s*;/,
  );
  if (!match) {
    fatal(
      'Could not find `const CACHEABLE_CHUNK_PREFIXES = [...]` in public/sw.js. ' +
        'Has the SW been refactored? Update this script accordingly.',
    );
  }
  const body = match[1];
  const entries = [...body.matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]);
  if (entries.length === 0) {
    fatal('CACHEABLE_CHUNK_PREFIXES is empty in public/sw.js.');
  }
  // Normalise to bare chunk-name prefixes (strip leading `/assets/`).
  return entries.map((entry) => {
    if (!entry.startsWith('/assets/')) {
      fatal(
        `SW allowlist entry "${entry}" does not start with "/assets/". ` +
          'This script expects Vite default assetsDir.',
      );
    }
    return entry.slice('/assets/'.length);
  });
}

/**
 * Parse the vite.config.ts `manualChunks()` function and collect every
 * literal string value returned. We only care about the in-scope family
 * prefixes; anything else is filtered out.
 */
function extractViteChunkNames(viteSource) {
  // Find the start of the function body: `manualChunks(...) {`
  const startMatch = viteSource.match(/manualChunks\s*\([^)]*\)\s*\{/);
  if (!startMatch) {
    fatal(
      'Could not find `manualChunks(...) {` in vite.config.ts. ' +
        'Has the build config been restructured? Update this script.',
    );
  }
  const bodyStart = startMatch.index + startMatch[0].length;

  // Balanced-brace scan to find the matching closing brace. Handles:
  //   - string literals (", ', `) so braces or quotes inside a string
  //     don't confuse the counter
  //   - escape sequences inside strings
  //   - line comments // ... \n   (important: these can contain stray
  //                                 backticks or braces — vite.config.ts
  //                                 has backticks in its ASCII-art
  //                                 documentation comments)
  //   - block comments /* ... */
  // Enough for a config file; not a full JS parser.
  let depth = 1;
  let i = bodyStart;
  let inStr = null; // null | '"' | "'" | '`'
  let escaped = false;
  let inLineComment = false;
  let inBlockComment = false;
  while (i < viteSource.length && depth > 0) {
    const ch = viteSource[i];
    const next = viteSource[i + 1];
    if (inLineComment) {
      if (ch === '\n') inLineComment = false;
    } else if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i += 1; // consume '/'
      }
    } else if (escaped) {
      escaped = false;
    } else if (inStr) {
      if (ch === '\\') escaped = true;
      else if (ch === inStr) inStr = null;
    } else if (ch === '/' && next === '/') {
      inLineComment = true;
      i += 1; // consume second '/'
    } else if (ch === '/' && next === '*') {
      inBlockComment = true;
      i += 1; // consume '*'
    } else if (ch === '"' || ch === "'" || ch === '`') {
      inStr = ch;
    } else if (ch === '{') {
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
    }
    i += 1;
  }
  if (depth !== 0) {
    fatal('Unbalanced braces inside manualChunks() — cannot parse body.');
  }
  const body = viteSource.slice(bodyStart, i - 1);

  const names = [...body.matchAll(/return\s+['"]([^'"]+)['"]/g)].map(
    (m) => m[1],
  );
  if (names.length === 0) {
    fatal('manualChunks() in vite.config.ts returns no chunk names.');
  }
  return names;
}

function inScope(name) {
  return SW_COVERED_FAMILIES.some((family) => name.startsWith(family));
}

function diffSets(required, actual, labelRequired, labelActual) {
  const requiredSet = new Set(required);
  const actualSet = new Set(actual);
  const missing = [...requiredSet].filter((x) => !actualSet.has(x));
  const extra = [...actualSet].filter((x) => !requiredSet.has(x));
  return { missing, extra, labelRequired, labelActual };
}

function verifyAgainstDistIfPresent(allowlist) {
  if (!fs.existsSync(DIST_ASSETS_DIR)) return null;
  const files = fs.readdirSync(DIST_ASSETS_DIR).filter((f) => f.endsWith('.js'));
  const unmatched = allowlist.filter(
    (prefix) => !files.some((f) => f.startsWith(prefix)),
  );
  return { files, unmatched };
}

function main() {
  const swSource = readFile(SW_PATH);
  const viteSource = readFile(VITE_CONFIG_PATH);

  const swAllowlist = extractSwAllowlist(swSource);
  const viteChunkNames = extractViteChunkNames(viteSource);

  // Only compare in-scope families.
  const viteInScope = viteChunkNames.filter(inScope);
  const allowlistInScope = swAllowlist.filter(inScope);

  const { missing: missingFromSw, extra: extraInSw } = diffSets(
    viteInScope,
    allowlistInScope,
  );

  const errors = [];

  if (missingFromSw.length > 0) {
    errors.push(
      `vite.config.ts emits chunks that the Service Worker does NOT precache:\n` +
        missingFromSw.map((n) => `    • ${n}`).join('\n') +
        `\n  Fix: add '/assets/${missingFromSw[0]}' (etc.) to ` +
        `CACHEABLE_CHUNK_PREFIXES in public/sw.js.`,
    );
  }

  if (extraInSw.length > 0) {
    errors.push(
      `public/sw.js precaches chunk prefixes that vite.config.ts does NOT emit:\n` +
        extraInSw.map((n) => `    • ${n}`).join('\n') +
        `\n  Fix: remove the dead entries from CACHEABLE_CHUNK_PREFIXES ` +
        `(or add a matching manualChunks() return in vite.config.ts).`,
    );
  }

  // Optional build-output cross-check.
  const distResult = verifyAgainstDistIfPresent(allowlistInScope);
  if (distResult) {
    if (distResult.unmatched.length > 0) {
      errors.push(
        `Build output in dist/assets/ has no files matching these SW prefixes:\n` +
          distResult.unmatched.map((n) => `    • ${n}`).join('\n') +
          `\n  This means the chunk is never produced — either the code path ` +
          `is dead, or the prefix is wrong.`,
      );
    }
  }

  if (errors.length > 0) {
    console.error('✗ [verify-sw-chunks] Drift detected between vite.config.ts and public/sw.js');
    for (const err of errors) {
      console.error('\n  ' + err);
    }
    console.error('');
    process.exit(1);
  }

  console.log(
    `✓ [verify-sw-chunks] ${allowlistInScope.length} SW prefix(es) in sync with vite.config.ts` +
      (distResult ? ` (dist/ cross-checked: ${distResult.files.length} asset files)` : ''),
  );
  process.exit(0);
}

main();
