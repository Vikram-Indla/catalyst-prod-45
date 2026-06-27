#!/usr/bin/env node

/**
 * CATALYST ADS COMPLIANCE — Hard-Coded Color Ratchet Gate
 * Feature: CAT-ADS-COMPLIANCE-20260627-001
 *
 * Runs the hard-coded-color scanner (scripts/no-hardcoded-colors.cjs), parses
 * the violation count, and compares it to the committed baseline in
 * design-governance/color-baseline.json.
 *
 *   - count  >  baseline  -> FAIL (exit 1). A new violation was introduced.
 *   - count  <= baseline  -> PASS (exit 0). When below baseline, prints a hint
 *                            to ratchet the baseline down.
 *
 * This is a RATCHET: it never blocks on the pre-existing debt, only on NEW
 * violations, and the baseline only ever moves down.
 *
 * Usage:
 *   node scripts/ads-color-gate.cjs            # check against baseline
 *   node scripts/ads-color-gate.cjs --update   # lower baseline to current count
 *
 * Exit codes:
 *   0 - count is at or below baseline (and, with --update, baseline rewritten)
 *   1 - count exceeds baseline (regression) OR scanner output unparseable
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SCANNER = path.join(REPO_ROOT, 'scripts', 'no-hardcoded-colors.cjs');
const BASELINE_FILE = path.join(REPO_ROOT, 'design-governance', 'color-baseline.json');

function runScanner() {
  const res = spawnSync('node', [SCANNER], { cwd: REPO_ROOT, encoding: 'utf-8' });
  const out = `${res.stdout || ''}${res.stderr || ''}`;
  // Scanner prints "✅ No hard-coded colors found!" (count 0) or
  // "❌ Found N hard-coded color violation(s):"
  if (/No hard-coded colors found/.test(out)) {
    return 0;
  }
  const m = out.match(/Found\s+(\d+)\s+hard-coded color/);
  if (!m) {
    console.error('❌ ads-color-gate: could not parse scanner output. Raw:\n');
    console.error(out.slice(0, 2000));
    process.exit(1);
  }
  return parseInt(m[1], 10);
}

function readBaseline() {
  const raw = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf-8'));
  if (typeof raw.hardcodedColors !== 'number') {
    console.error('❌ ads-color-gate: color-baseline.json missing numeric "hardcodedColors".');
    process.exit(1);
  }
  return raw;
}

const update = process.argv.includes('--update');
const count = runScanner();
const baseline = readBaseline();
const limit = baseline.hardcodedColors;

if (update) {
  const next = { ...baseline, hardcodedColors: count, capturedOn: new Date().toISOString().slice(0, 10) };
  fs.writeFileSync(BASELINE_FILE, JSON.stringify(next, null, 2) + '\n');
  console.log(`🔧 ads-color-gate: baseline updated ${limit} → ${count}. Commit design-governance/color-baseline.json.`);
  process.exit(0);
}

if (count > limit) {
  console.error(
    `\n❌ ads-color-gate: hard-coded color count INCREASED: ${count} (baseline ${limit}, +${count - limit}).\n` +
    `   New bare colors were introduced. Use ADS tokens: var(--ds-*) or token('color.*', '#fallback').\n` +
    `   Run \`node scripts/no-hardcoded-colors.cjs\` to see the offenders.\n` +
    `   Intentional, Jira-parity-only exception? Wrap it and document, or annotate with // ads-scanner:ignore-next-line.\n`
  );
  process.exit(1);
}

if (count < limit) {
  console.log(
    `✅ ads-color-gate: ${count} ≤ baseline ${limit} — and ${limit - count} below it! ` +
    `Ratchet down: \`node scripts/ads-color-gate.cjs --update\` then commit color-baseline.json.`
  );
} else {
  console.log(`✅ ads-color-gate: ${count} = baseline ${limit}. No new hard-coded colors.`);
}
process.exit(0);
