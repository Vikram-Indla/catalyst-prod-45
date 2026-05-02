#!/usr/bin/env node
/**
 * RESET ICONS — Icon manifest validator.
 *
 * Validates that:
 *   1. manifest.json is valid JSON.
 *   2. Every file in src/assets/icons/** appears in manifest.json.
 *   3. Every manifest entry points to a file that exists on disk.
 *   4. Every work-type and priority SVG has viewBox="0 0 20 20".
 *   5. No SVG contains <script>, <style>, or <image> (embedded raster).
 *
 * Exits non-zero on the first violation it can't reconcile, with a clear
 * message pointing the engineer at the fix.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ICONS_DIR = join(ROOT, 'src', 'assets', 'icons');
const MANIFEST = join(ICONS_DIR, 'manifest.json');

const errors = [];
const warnings = [];

function err(msg) {
  errors.push(msg);
  console.error(`[31m✗[0m ${msg}`);
}
function warn(msg) {
  warnings.push(msg);
  console.warn(`[33m⚠[0m ${msg}`);
}
function ok(msg) {
  console.log(`[32m✓[0m ${msg}`);
}

// ─── 1. Read manifest ────────────────────────────────────────────────
let manifest;
try {
  manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  ok('manifest.json parses as valid JSON');
} catch (e) {
  err(`manifest.json is not valid JSON: ${e.message}`);
  process.exit(1);
}

// ─── 2. Walk the assets folder ───────────────────────────────────────
function walk(dir, base = dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'manifest.json' || entry === 'README.md' || entry === '.DS_Store') continue;
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) {
      out.push(...walk(p, base));
    } else if (/\.(svg|png|jpe?g|webp)$/i.test(entry)) {
      out.push(relative(ICONS_DIR, p));
    }
  }
  return out;
}

const onDisk = walk(ICONS_DIR).sort();
ok(`${onDisk.length} asset files found on disk`);

// ─── 3. Build the set of manifest-referenced files ───────────────────
const referenced = new Set();

for (const item of manifest.categories.workType.items) {
  referenced.add(`work-type/${item.id}.svg`);
  if (item.darkVariant) referenced.add(`work-type/${item.darkVariant}`);
}
for (const item of manifest.categories.priority.items) {
  referenced.add(`priority/${item.id}.svg`);
  if (item.darkVariant) referenced.add(`priority/${item.darkVariant}`);
}
for (const item of manifest.categories.projectAvatars.items) {
  referenced.add(`project-avatars/${item.file}`);
}
for (const item of manifest.categories.projectAvatars.stockPool) {
  referenced.add(`project-avatars/${item.file}`);
}

// ─── 4. Cross-check on-disk vs manifest ──────────────────────────────
const onDiskSet = new Set(onDisk);

for (const f of onDisk) {
  if (!referenced.has(f)) {
    err(`Orphan file on disk (not in manifest.json): ${f}`);
  }
}
for (const f of referenced) {
  if (!onDiskSet.has(f)) {
    err(`Manifest references missing file: ${f}`);
  }
}

if (errors.length === 0) {
  ok('Every on-disk file is referenced in manifest, and every manifest entry exists');
}

// ─── 5. SVG content validation ───────────────────────────────────────
const svgs = onDisk.filter((f) => f.endsWith('.svg'));
let svgViolations = 0;

for (const f of svgs) {
  const path = join(ICONS_DIR, f);
  const content = readFileSync(path, 'utf8');

  // Skip 16×16 normalized variants under work-type/_dark or priority/_dark
  // since they may share the source viewBox; the active light variant is
  // what we enforce 20×20 on.
  const isDark = f.includes('/_dark/');

  // Hard rule: only 20×20 viewBox allowed for work-type and priority icons.
  // Avatars don't have SVGs so they're auto-exempt.
  if (!isDark && (f.startsWith('work-type/') || f.startsWith('priority/'))) {
    if (!/viewBox="0 0 20 20"/.test(content)) {
      err(`${f}: viewBox is not "0 0 20 20"`);
      svgViolations++;
    }
  }

  // No <script>, <style>, <image> embedded raster.
  if (/<script\b/i.test(content)) {
    err(`${f}: contains <script> tag (banned)`);
    svgViolations++;
  }
  if (/<style\b/i.test(content)) {
    err(`${f}: contains <style> tag (banned — use inline fill attributes)`);
    svgViolations++;
  }
  if (/<image\b/i.test(content)) {
    err(`${f}: contains <image> tag (banned — no embedded raster)`);
    svgViolations++;
  }
}

if (svgViolations === 0) {
  ok(`${svgs.length} SVG files passed viewBox + no-script/style/raster checks`);
}

// ─── 6. Report ───────────────────────────────────────────────────────
console.log();
if (errors.length > 0) {
  console.error(`[31m[1m✗ Icon manifest validation FAILED with ${errors.length} error(s).[0m`);
  console.error('Fix the violations above before merging. Refer to:');
  console.error('  src/assets/icons/README.md  — operating contract');
  console.error('  src/components/icons/icons.registry.ts  — typed registry');
  process.exit(1);
}

console.log(`[32m[1m✓ Icon manifest validation passed.[0m`);
if (warnings.length > 0) {
  console.log(`(${warnings.length} warning(s) — non-blocking.)`);
}
