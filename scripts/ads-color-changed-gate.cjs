#!/usr/bin/env node
/**
 * CATALYST ADS — changed-files ZERO-TOLERANCE color gate
 * CAT-ADS-HARDGATE-20260710-001
 *
 * Block-new / grandfather-old model (Vikram, 2026-07-10). The 11,980-strong
 * pre-existing debt is NOT re-scanned. The gate is LINE-LEVEL: only colours on
 * lines this commit/PR ADDED or MODIFIED fail. You can edit a debt-heavy file
 * without cleaning its pre-existing colours, but you cannot ADD a new one.
 * Any hard-coded colour (hex, rgb, hsl, named, tailwind util, OR
 * var(--ds-*,#hex) fallback) on an added line fails. No baseline, no ratchet.
 *
 * File list source:
 *   --staged           git diff --cached (pre-commit; default)
 *   --since <ref>      git diff <ref>...HEAD (CI; e.g. origin/main)
 *   <files...>         explicit paths
 *
 * Exit 1 on any violation in a changed file; 0 when clean.
 *
 * Escape hatch (governed): annotate the exact line with
 *   `// ads-scanner:ignore-line -- <reason> [CAT-XXXX]`  or the -next-line form.
 * The detector honours these; reviewers gate the reason.
 */
'use strict';
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { scanContent, SCAN_EXTENSIONS } = require('./ads-color-detect.cjs');

const REPO = path.resolve(__dirname, '..');
const argv = process.argv.slice(2);

const sinceIdx = argv.indexOf('--since');
const sinceRef = sinceIdx !== -1 ? argv[sinceIdx + 1] : null;
const explicit = argv.filter((a) => !a.startsWith('--') && a !== sinceRef);

function diffCmd(nameOnly) {
  const flags = nameOnly ? '--name-only' : '-U0';
  if (argv.includes('--since')) {
    const base = sinceRef || 'origin/main';
    return `git diff ${flags} --diff-filter=ACMR ${base}...HEAD`;
  }
  return `git diff --cached ${flags} --diff-filter=ACMR`;
}

// Map of relPath -> Set<added line numbers>. When explicit paths are given
// (no diff context, e.g. a manual probe) addedLines is null → whole-file scan.
function addedLineMap() {
  if (explicit.length) return null;
  let out = '';
  try {
    out = execSync(diffCmd(false), { cwd: REPO, encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 });
  } catch (e) {
    console.error('ads-color-changed-gate: git diff failed:', e.message);
    process.exit(1);
  }
  const map = {};
  let cur = null;
  let newLine = 0;
  for (const line of out.split('\n')) {
    const mFile = line.match(/^\+\+\+ b\/(.+)$/);
    if (mFile) { cur = mFile[1]; map[cur] = map[cur] || new Set(); continue; }
    const mHunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
    if (mHunk) { newLine = parseInt(mHunk[1], 10); continue; }
    if (cur == null) continue;
    if (line.startsWith('+') && !line.startsWith('+++')) { map[cur].add(newLine); newLine++; }
    else if (line.startsWith('-') && !line.startsWith('---')) { /* removed: no new-line advance */ }
    else if (line.startsWith(' ')) { newLine++; }
  }
  return map;
}

function fileList() {
  if (explicit.length) return explicit;
  let out = '';
  try { out = execSync(diffCmd(true), { cwd: REPO, encoding: 'utf-8' }); }
  catch (e) { console.error('ads-color-changed-gate: git diff failed:', e.message); process.exit(1); }
  return out.split('\n').map((s) => s.trim()).filter(Boolean);
}

// Base (pre-change) content of a file, for net-new detection. Returns '' if
// the file is new. --staged compares to HEAD; --since compares to the ref.
function baseContent(rel) {
  if (explicit.length) return null; // whole-file mode, no base comparison
  const ref = argv.includes('--since') ? (sinceRef || 'origin/main') : 'HEAD';
  try {
    return execSync(`git show ${ref}:"${rel}"`, { cwd: REPO, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
  } catch { return ''; } // not in base → brand-new file
}

const key = (v) => `${v.category}::${v.match.toLowerCase().replace(/\s+/g, '')}`;

const added = addedLineMap();
const files = fileList()
  .filter((f) => SCAN_EXTENSIONS.includes(path.extname(f)))
  .filter((f) => f.startsWith('src/'))
  .filter((f) => !/\.(test|spec|stories)\.(ts|tsx|js|jsx)$/.test(f));

let total = 0;
const report = [];
for (const rel of files) {
  const abs = path.join(REPO, rel);
  if (!fs.existsSync(abs)) continue; // deleted/renamed-away
  const curAll = scanContent(rel, fs.readFileSync(abs, 'utf-8'));

  const base = baseContent(rel);
  let vs;
  if (base == null) {
    // whole-file mode (explicit paths) — flag everything.
    vs = curAll;
  } else {
    // Net-new + line-level. A colour fails only if it sits on a line this
    // change ADDED *and* its (category,value) count rose vs the base file.
    // Unchanged-line occurrences consume base "free slots" first, so pure
    // removal / relocation (remediation) never fails; only genuine additions,
    // duplications, or value changes do.
    const baseCounts = {};
    for (const bv of scanContent(rel, base)) baseCounts[key(bv)] = (baseCounts[key(bv)] || 0) + 1;
    const onAdded = (v) => added && added[rel] && added[rel].has(v.line);
    const otherCounts = {};
    for (const v of curAll) if (!onAdded(v)) otherCounts[key(v)] = (otherCounts[key(v)] || 0) + 1;
    const remaining = {};
    for (const k of Object.keys(baseCounts)) remaining[k] = Math.max(0, baseCounts[k] - (otherCounts[k] || 0));
    vs = curAll.filter((v) => {
      if (!onAdded(v)) return false;
      const k = key(v);
      if (remaining[k] > 0) { remaining[k]--; return false; } // grandfathered
      return true; // net-new on an added line
    });
  }

  if (vs.length) { total += vs.length; report.push({ rel, vs }); }
}

if (total === 0) {
  console.log(`✅ ads-color-changed-gate: ${files.length} changed file(s) clean — no hard-coded colours.`);
  process.exit(0);
}

console.error(`\n❌ ads-color-changed-gate: ${total} hard-coded colour(s) on lines you ADDED in ${report.length} file(s).`);
console.error('   Block-new policy: lines you add/modify must use ADS tokens (pre-existing debt is grandfathered):');
console.error("   var(--ds-*) (no hex fallback)  or  token('color.*')  — see CLAUDE.md ADS token table.\n");
for (const { rel, vs } of report) {
  console.error(`  ${rel}`);
  for (const v of vs.slice(0, 40)) {
    console.error(`     L${v.line}:${v.col}  [${v.category}]  ${v.match}   ${v.context}`);
  }
  if (vs.length > 40) console.error(`     … +${vs.length - 40} more`);
}
console.error('\n   Intentional, no-ADS-equivalent exception? Annotate the line:');
console.error('   // ads-scanner:ignore-line -- <reason> [CAT-XXXX]\n');
process.exit(1);
