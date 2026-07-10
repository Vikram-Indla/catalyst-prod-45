#!/usr/bin/env node
/**
 * Codemod: strip hex/rgb/hsl/named FALLBACKS from `var(--ds-*, <color>)`.
 * CAT-ADS-HARDGATE-20260710-001 Phase 2 slice 1.
 *
 * ONLY touches `--ds-*` tokens — ADS runtime (AdsThemeProvider → setGlobalTheme)
 * guarantees every --ds-* is defined on :root in both themes, so removing the
 * fallback is a runtime no-op. `--cp-*` and bespoke vars are LEFT for a later
 * verified slice. Nested `var(--ds-x, var(...))` fallbacks are left untouched.
 *
 *   node scripts/strip-ds-fallback-hex.cjs           # dry-run (counts)
 *   node scripts/strip-ds-fallback-hex.cjs --write    # apply
 *   node scripts/strip-ds-fallback-hex.cjs --write path/to/file  # scoped
 */
'use strict';
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const scoped = args.filter((a) => !a.startsWith('--'));
const EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.scss']);
const SKIP = new Set(['node_modules', '.git', 'dist', 'build']);

// A color-literal fallback (NOT another var(), NOT a length/number-only).
const COLOR_FALLBACK =
  /^\s*(#[0-9a-fA-F]{3,8}|rgba?\([^()]*\)|hsla?\([^()]*\)|white|black|red|green|blue|yellow|orange|purple|pink|gray|grey|gold|silver|transparent)\s*$/i;

// Find `var(--ds-<name>, <fallback>)` with balanced parens; strip fallback when
// it's a single color literal. Returns {out, count}.
function transform(src) {
  let out = '';
  let i = 0;
  let count = 0;
  while (i < src.length) {
    const idx = src.indexOf('var(--ds-', i);
    if (idx === -1) { out += src.slice(i); break; }
    out += src.slice(i, idx);
    // parse the var(...) with balanced parens
    let depth = 0, j = idx + 3; // start at '('
    // move j to the '(' after 'var'
    j = idx + 3;
    let end = -1;
    for (let k = j; k < src.length; k++) {
      if (src[k] === '(') depth++;
      else if (src[k] === ')') { depth--; if (depth === 0) { end = k; break; } }
    }
    if (end === -1) { out += src.slice(idx); break; }
    const inner = src.slice(idx + 4, end); // between var( and )
    const comma = inner.indexOf(',');
    if (comma === -1) { out += src.slice(idx, end + 1); i = end + 1; continue; }
    const name = inner.slice(0, comma).trim();
    const fallback = inner.slice(comma + 1);
    if (/^--ds-[a-zA-Z0-9-]+$/.test(name) && COLOR_FALLBACK.test(fallback) && !/var\(/.test(fallback)) {
      out += `var(${name})`;
      count++;
    } else {
      out += src.slice(idx, end + 1);
    }
    i = end + 1;
  }
  return { out, count };
}

function walk(dir, acc) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP.has(e.name)) walk(path.join(dir, e.name), acc); continue; }
    if (EXT.has(path.extname(e.name))) acc.push(path.join(dir, e.name));
  }
  return acc;
}

let files;
if (scoped.length) files = scoped.map((f) => path.resolve(REPO, f));
else files = walk(path.join(REPO, 'src'), []);

let totalCount = 0, touched = 0;
for (const f of files) {
  const src = fs.readFileSync(f, 'utf-8');
  if (!src.includes('var(--ds-')) continue;
  const { out, count } = transform(src);
  if (count > 0) {
    totalCount += count; touched++;
    if (WRITE) fs.writeFileSync(f, out);
  }
}
console.log(`${WRITE ? 'Stripped' : '[dry-run] would strip'} ${totalCount} var(--ds-*,#color) fallback(s) across ${touched} file(s).`);
