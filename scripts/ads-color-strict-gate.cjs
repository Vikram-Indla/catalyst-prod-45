#!/usr/bin/env node
/**
 * CATALYST ADS — accurate full-tree color RATCHET (down-only)
 * CAT-ADS-HARDGATE-20260710-001
 *
 * Belt-and-suspenders to the changed-files gate: runs the strict detector over
 * ALL of src/ and fails if the TOTAL (or any per-category count) rises above
 * design-governance/color-strict-baseline.json. Baselines only move down.
 * This is what remediation slices ratchet down as debt is burned.
 *
 *   node scripts/ads-color-strict-gate.cjs           # check
 *   node scripts/ads-color-strict-gate.cjs --update  # lower baseline to current
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO = path.resolve(__dirname, '..');
const BASELINE = path.join(REPO, 'design-governance', 'color-strict-baseline.json');

const out = execFileSync('node', [path.join(__dirname, 'ads-color-scan.cjs'), '--json'], { cwd: REPO, encoding: 'utf-8' });
const cur = JSON.parse(out);
const update = process.argv.includes('--update');

if (update || !fs.existsSync(BASELINE)) {
  const next = { total: cur.total, byCategory: cur.byCategory, capturedOn: new Date().toISOString().slice(0, 10),
    note: 'CAT-ADS-HARDGATE-20260710-001 accurate strict color debt. Down-only ratchet.' };
  fs.writeFileSync(BASELINE, JSON.stringify(next, null, 2) + '\n');
  console.log(`🔧 ads-color-strict-gate: baseline set — total ${cur.total}. Commit ${path.relative(REPO, BASELINE)}.`);
  process.exit(0);
}

const base = JSON.parse(fs.readFileSync(BASELINE, 'utf-8'));
let failed = false;
if (cur.total > base.total) {
  console.error(`❌ ads-color-strict-gate: total ${cur.total} > baseline ${base.total} (+${cur.total - base.total}).`);
  failed = true;
}
for (const cat of Object.keys(cur.byCategory)) {
  const b = (base.byCategory && base.byCategory[cat]) || 0;
  if (cur.byCategory[cat] > b) {
    console.error(`❌ ads-color-strict-gate: category '${cat}' ${cur.byCategory[cat]} > baseline ${b}.`);
    failed = true;
  }
}
if (failed) {
  console.error('   New hard-coded colours entered the tree. See `npm run lint:colors:scan -- --list`.');
  process.exit(1);
}
const dropped = base.total - cur.total;
console.log(`✅ ads-color-strict-gate: total ${cur.total} ≤ baseline ${base.total}${dropped > 0 ? ` (${dropped} below — ratchet down: npm run lint:colors:strict:update-baseline)` : ''}.`);
process.exit(0);
