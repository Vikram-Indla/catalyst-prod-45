#!/usr/bin/env node
/**
 * CAT-DS-TOKEN-POISON-20260710-001 — R8 CSS codemod (Goal 4 final content slice).
 *
 * Rewrites `hsl(var(--legacy)[/ alpha])` and `rgb(var(--legacy)[/ alpha])`
 * expressions in color-bearing CSS declarations to the mapped --ds-* token
 * from r8-hsl-map.mjs. Idempotent: a decl already using var(--ds-*) or
 * var(--cp-*) with no raw color has nothing to match, so re-running is a
 * no-op. Leaves anything it can't confidently map (reported at the end) for
 * hand review — never invents a mapping.
 *
 * Usage: node scripts/token-sweep/r8-css-fix.mjs <file> [<file> ...] [--write]
 * Without --write, prints a dry-run diff summary only.
 */
import fs from 'fs';
import path from 'path';
import url from 'url';
import postcss from 'postcss';
import { resolveLegacyHsl, cssPropCategory } from './r8-hsl-map.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');

const WRAP_RE = /(hsla?|rgba?)\(\s*var\(\s*(--[\w-]+)\s*\)\s*(\/\s*[^)]+)?\)/g;

function fixValue(value, prop) {
  const category = cssPropCategory(prop);
  let changed = false;
  let unresolved = [];
  const out = value.replace(WRAP_RE, (whole, fn, varName, alphaPart) => {
    const hasAlpha = !!alphaPart;
    const res = resolveLegacyHsl(varName, category, hasAlpha);
    if (!res) { unresolved.push(`${varName} (category=${category ?? 'none'})`); return whole; }
    changed = true;
    return res.replacement;
  });
  return { out, changed, unresolved };
}

function processFile(file, write) {
  const abs = path.isAbsolute(file) ? file : path.join(ROOT, file);
  const src = fs.readFileSync(abs, 'utf8');
  const root = postcss.parse(src, { from: abs });
  let fileChanged = false;
  const unresolvedAll = [];
  root.walkDecls((decl) => {
    if (decl.prop.startsWith('--')) return; // custom-prop declarations untouched
    if (!/hsla?\(\s*var\(|rgba?\(\s*var\(/.test(decl.value)) return;
    const { out, changed, unresolved } = fixValue(decl.value, decl.prop);
    if (changed) { decl.value = out; fileChanged = true; }
    if (unresolved.length) unresolvedAll.push(...unresolved.map((u) => `${decl.source.start.line}:${decl.prop} -> ${u}`));
  });
  if (fileChanged && write) fs.writeFileSync(abs, root.toResult().css);
  return { file, changed: fileChanged, unresolved: unresolvedAll };
}

const args = process.argv.slice(2);
const write = args.includes('--write');
const files = args.filter((a) => a !== '--write');
if (!files.length) { console.error('usage: r8-css-fix.mjs <file...> [--write]'); process.exit(1); }

let anyUnresolved = false;
for (const f of files) {
  const r = processFile(f, write);
  console.log(`${write ? (r.changed ? 'WROTE' : 'skip ') : (r.changed ? 'WOULD-WRITE' : 'no-op')}  ${r.file}`);
  if (r.unresolved.length) {
    anyUnresolved = true;
    console.log(`  unresolved (${r.unresolved.length}):`);
    for (const u of r.unresolved) console.log(`    ${u}`);
  }
}
process.exit(anyUnresolved ? 2 : 0);
