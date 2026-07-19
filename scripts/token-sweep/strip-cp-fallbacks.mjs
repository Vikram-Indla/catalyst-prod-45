#!/usr/bin/env node
/**
 * Strip fallbacks from var(--cp-*, ...) expressions repo-wide.
 *
 * Every --cp-* name still in use is guaranteed to resolve (the token graph's R3
 * rule proves zero undefined references repo-wide — either the single-owner
 * bridge in catalyst-semantic-aliases.css or a remaining legacy single-owner
 * definition declares it). A fallback on a --cp-* var is therefore always dead
 * code, and when that fallback is a hex/rgb/hsl literal it's exactly the
 * "phantom fallback hiding poison" pattern this effort targets — collapse the
 * whole var() (including nested fallback layers) down to `var(--cp-x)`.
 *
 * Usage: node scripts/token-sweep/strip-cp-fallbacks.mjs [--dry]
 */
import fs from 'fs';
import path from 'path';
import url from 'url';
import { walk } from '../token-graph/lib.mjs';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..', '..');
const DRY = process.argv.includes('--dry');

function findMatchingParen(str, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < str.length; i++) {
    if (str[i] === '(') depth++;
    else if (str[i] === ')') { depth--; if (depth === 0) return i; }
  }
  return -1;
}

/** Replace every var(--cp-X, ...) span in `text` (nested fallbacks collapsed) with var(--cp-X). */
function stripCpFallbacks(text) {
  let out = '';
  let i = 0;
  let changed = false;
  while (i < text.length) {
    const m = /var\(\s*(--cp-[A-Za-z0-9_-]+)\s*,/.exec(text.slice(i));
    if (!m) { out += text.slice(i); break; }
    const matchStart = i + m.index;
    const openParen = matchStart + m[0].indexOf('(');
    const closeParen = findMatchingParen(text, openParen);
    if (closeParen === -1) { out += text.slice(i); break; }
    out += text.slice(i, matchStart);
    out += `var(${m[1]})`;
    changed = true;
    i = closeParen + 1;
  }
  return { text: out, changed };
}

const files = walk(path.join(ROOT, 'src'), ['.css', '.ts', '.tsx', '.jsx']);
let filesChanged = 0;
let sitesChanged = 0;

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  if (!src.includes('--cp-')) continue;
  const before = src;
  let result = stripCpFallbacks(before);
  // Repeat until stable (handles var(--cp-a, var(--cp-b, ...)) chains where the
  // outer var's own fallback starts with another --cp- var needing its own strip).
  let guard = 0;
  while (result.changed && guard < 5) {
    const next = stripCpFallbacks(result.text);
    if (next.text === result.text) break;
    result = next;
    guard++;
  }
  if (result.text !== before) {
    const countBefore = (before.match(/var\(\s*--cp-[A-Za-z0-9_-]+\s*,/g) || []).length;
    const countAfter = (result.text.match(/var\(\s*--cp-[A-Za-z0-9_-]+\s*,/g) || []).length;
    sitesChanged += countBefore - countAfter;
    filesChanged++;
    if (!DRY) fs.writeFileSync(file, result.text);
    console.log((DRY ? '[dry] ' : '') + path.relative(ROOT, file), `(${countBefore - countAfter} site(s))`);
  }
}

console.log(`\n${filesChanged} files, ${sitesChanged} var(--cp-*, ...) fallback sites stripped.`);
