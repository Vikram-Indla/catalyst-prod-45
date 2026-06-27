#!/usr/bin/env node

/**
 * CATALYST ADS COMPLIANCE — Design-Governance Audit Ratchet Gate
 * Feature: CAT-ADS-COMPLIANCE-20260627-001 (Slice 2)
 *
 * Runs the design-governance audit (design-governance/rules/audit.js src),
 * parses its per-category totals, and compares each to the committed baseline
 * in design-governance/audit-baseline.json.
 *
 *   - ANY category > its baseline  -> FAIL (exit 1). A new violation landed.
 *   - all categories <= baseline   -> PASS (exit 0). Prints which categories
 *                                     dropped so they can be ratcheted down.
 *
 * Per-category, fail-on-increase: pure regression guard. The audit's `tokens`
 * category is noisy (var()/token() fallbacks over-reported) but that noise is
 * inert here — only a real INCREASE in a category trips the gate.
 *
 * The underlying audit always exits 1 in STRICT mode, so we IGNORE its exit
 * code and rely solely on the parsed counts.
 *
 * Usage:
 *   node scripts/ads-audit-gate.cjs            # check against baseline
 *   node scripts/ads-audit-gate.cjs --update   # ratchet baselines to current
 *
 * Exit codes:
 *   0 - every category at or below baseline (and, with --update, rewritten)
 *   1 - a category exceeds baseline (regression) OR audit output unparseable
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const AUDIT = path.join(REPO_ROOT, 'design-governance', 'rules', 'audit.js');
const BASELINE_FILE = path.join(REPO_ROOT, 'design-governance', 'audit-baseline.json');
const CATEGORIES = ['tokens', 'typography', 'spacing', 'fontImports'];

function parseCounts(out) {
  const counts = {};
  for (const cat of CATEGORIES) {
    // Final breakdown lines look like:  "  ❌ tokens: 28913 violations"
    //                                   "  ✅ fontImports: 0 violations"
    const m = out.match(new RegExp(`${cat}:\\s*(\\d+)\\s*violations`));
    if (!m) return null;
    counts[cat] = parseInt(m[1], 10);
  }
  return counts;
}

function runAudit() {
  // The audit emits ~8MB across thousands of file reads; an occasional run
  // returns incomplete output. Retry once on a parse miss before failing —
  // and fail-safe (block) if even the retry can't be parsed.
  let lastOut = '';
  for (let attempt = 1; attempt <= 2; attempt++) {
    const res = spawnSync('node', [AUDIT, 'src'], {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
      maxBuffer: 256 * 1024 * 1024, // audit prints every violation
    });
    lastOut = `${res.stdout || ''}${res.stderr || ''}`;
    const counts = parseCounts(lastOut);
    if (counts) return counts;
    if (attempt === 1) {
      console.error('⚠️  ads-audit-gate: audit output incomplete, retrying once…');
    }
  }
  console.error('❌ ads-audit-gate: could not parse audit category totals after retry. Tail:\n');
  console.error(lastOut.slice(-2000));
  process.exit(1);
}

function readBaseline() {
  const raw = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf-8'));
  for (const cat of CATEGORIES) {
    if (typeof raw[cat] !== 'number') {
      console.error(`❌ ads-audit-gate: audit-baseline.json missing numeric "${cat}".`);
      process.exit(1);
    }
  }
  return raw;
}

const update = process.argv.includes('--update');
const counts = runAudit();
const baseline = readBaseline();

if (update) {
  const next = { ...baseline };
  for (const cat of CATEGORIES) next[cat] = counts[cat];
  next.capturedOn = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(BASELINE_FILE, JSON.stringify(next, null, 2) + '\n');
  console.log(
    '🔧 ads-audit-gate: baselines updated → ' +
    CATEGORIES.map((c) => `${c} ${baseline[c]}→${counts[c]}`).join(', ') +
    '. Commit design-governance/audit-baseline.json.'
  );
  process.exit(0);
}

const regressions = CATEGORIES.filter((c) => counts[c] > baseline[c]);
const drops = CATEGORIES.filter((c) => counts[c] < baseline[c]);

if (regressions.length) {
  console.error('\n❌ ads-audit-gate: design-governance violations INCREASED:');
  for (const c of regressions) {
    console.error(`   ${c}: ${counts[c]} (baseline ${baseline[c]}, +${counts[c] - baseline[c]})`);
  }
  console.error(
    '\n   Use ADS tokens/components — no Tailwind color utils, no hardcoded font-size/px, no off-grid spacing.\n' +
    '   See offenders: `npm run audit:ads`. Intentional? Annotate with // ads-scanner:ignore-next-line.\n'
  );
  process.exit(1);
}

console.log(
  '✅ ads-audit-gate: no category above baseline — ' +
  CATEGORIES.map((c) => `${c} ${counts[c]}/${baseline[c]}`).join(', ') + '.'
);
if (drops.length) {
  console.log(
    `   ${drops.length} categor${drops.length === 1 ? 'y' : 'ies'} dropped (${drops.join(', ')}). ` +
    'Ratchet down: `node scripts/ads-audit-gate.cjs --update` then commit audit-baseline.json.'
  );
}
process.exit(0);
