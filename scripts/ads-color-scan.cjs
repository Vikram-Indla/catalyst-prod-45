#!/usr/bin/env node
/**
 * CATALYST ADS — full-tree hard-coded-color scan (CAT-ADS-HARDGATE-20260710-001)
 * Walks src/ with the strict detector and prints a per-category count.
 *
 *   node scripts/ads-color-scan.cjs            # summary counts
 *   node scripts/ads-color-scan.cjs --list     # every violation (file:line)
 *   node scripts/ads-color-scan.cjs --json     # machine-readable totals
 *
 * Exit 0 always (measurement tool; gates live in ads-color-*-gate.cjs).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { scanContent, SCAN_EXTENSIONS } = require('./ads-color-detect.cjs');

const REPO = path.resolve(__dirname, '..');
const ROOT = path.join(REPO, 'src');
const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'dist', 'build']);

function walk(dir, acc) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!EXCLUDE_DIRS.has(e.name)) walk(path.join(dir, e.name), acc); continue; }
    const ext = path.extname(e.name);
    if (!SCAN_EXTENSIONS.includes(ext)) continue;
    if (/\.(test|spec|stories)\.(ts|tsx|js|jsx)$/.test(e.name)) continue;
    if (/\.snap$/.test(e.name)) continue;
    acc.push(path.join(dir, e.name));
  }
  return acc;
}

const files = walk(ROOT, []);
const byCat = {};
const all = [];
for (const f of files) {
  const rel = path.relative(REPO, f).replace(/\\/g, '/');
  const vs = scanContent(rel, fs.readFileSync(f, 'utf-8'));
  for (const v of vs) {
    byCat[v.category] = (byCat[v.category] || 0) + 1;
    all.push({ file: rel, ...v });
  }
}
const total = all.length;

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ total, byCategory: byCat }, null, 2));
  process.exit(0);
}
if (process.argv.includes('--list')) {
  for (const v of all) console.log(`${v.file}:${v.line}:${v.col}  [${v.category}]  ${v.match}`);
}
console.log(`\nADS color scan — ${files.length} files scanned`);
console.log('─'.repeat(40));
for (const c of Object.keys(byCat).sort((a, b) => byCat[b] - byCat[a])) {
  console.log(`  ${c.padEnd(14)} ${byCat[c]}`);
}
console.log('─'.repeat(40));
console.log(`  ${'TOTAL'.padEnd(14)} ${total}\n`);
process.exit(0);
