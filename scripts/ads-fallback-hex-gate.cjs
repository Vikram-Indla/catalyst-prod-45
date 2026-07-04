#!/usr/bin/env node

/**
 * CATALYST ADS COMPLIANCE — Fallback-Hex Ratchet Gate
 * CAT-AUDIT-0100 (CAT-AUDIT-FULLSWEEP-20260703-001)
 *
 * Runs scripts/no-fallback-hex.cjs (banned var(--ds-*, #hex) / token('x','#hex')
 * fallback occurrences — invisible to the existing lint:colors gate, which
 * deliberately whitelists them) and ratchets against the baseline recorded
 * in design-governance/color-baseline.json under "fallbackHexColors".
 *
 *   - count  >  baseline  -> FAIL (exit 1). A new fallback-hex was introduced.
 *   - count  <= baseline  -> PASS (exit 0).
 *
 * Down-only ratchet — never blocks on pre-existing debt, only on new
 * violations. Does not touch "hardcodedColors" or the existing scanner.
 *
 * Usage:
 *   node scripts/ads-fallback-hex-gate.cjs            # check against baseline
 *   node scripts/ads-fallback-hex-gate.cjs --update   # lower baseline to current count
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SCANNER = path.join(REPO_ROOT, 'scripts', 'no-fallback-hex.cjs');
const BASELINE_FILE = path.join(REPO_ROOT, 'design-governance', 'color-baseline.json');

function runScanner() {
  const res = spawnSync('node', [SCANNER], { cwd: REPO_ROOT, encoding: 'utf-8' });
  const out = `${res.stdout || ''}${res.stderr || ''}`;
  if (/No fallback-hex found/.test(out)) return 0;
  const m = out.match(/Found\s+(\d+)\s+fallback-hex/);
  if (!m) {
    console.error('❌ ads-fallback-hex-gate: could not parse scanner output. Raw:\n');
    console.error(out.slice(0, 2000));
    process.exit(1);
  }
  return parseInt(m[1], 10);
}

function readBaseline() {
  const raw = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf-8'));
  if (typeof raw.fallbackHexColors !== 'number') {
    console.error('❌ ads-fallback-hex-gate: color-baseline.json missing numeric "fallbackHexColors".');
    process.exit(1);
  }
  return raw;
}

const update = process.argv.includes('--update');
const count = runScanner();
const baseline = readBaseline();
const limit = baseline.fallbackHexColors;

if (update) {
  const next = { ...baseline, fallbackHexColors: count };
  fs.writeFileSync(BASELINE_FILE, JSON.stringify(next, null, 2) + '\n');
  console.log(`🔧 ads-fallback-hex-gate: baseline updated ${limit} → ${count}. Commit design-governance/color-baseline.json.`);
  process.exit(0);
}

if (count > limit) {
  console.error(
    `\n❌ ads-fallback-hex-gate: fallback-hex count INCREASED: ${count} (baseline ${limit}, +${count - limit}).\n` +
    `   New var(--ds-*, #hex) / token('x','#hex') fallbacks were introduced — banned by CLAUDE.md, "no exceptions".\n` +
    `   Strip to token-only: var(--ds-x, #hex) → var(--ds-x).\n` +
    `   Run \`node scripts/no-fallback-hex.cjs\` to see the offenders.\n`
  );
  process.exit(1);
}

if (count < limit) {
  console.log(
    `✅ ads-fallback-hex-gate: ${count} ≤ baseline ${limit} — and ${limit - count} below it! ` +
    `Ratchet down: \`node scripts/ads-fallback-hex-gate.cjs --update\` then commit color-baseline.json.`
  );
} else {
  console.log(`✅ ads-fallback-hex-gate: ${count} = baseline ${limit}. No new fallback-hex.`);
}
process.exit(0);
