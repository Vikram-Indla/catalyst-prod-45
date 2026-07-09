#!/usr/bin/env node

/**
 * CATALYST UI-FIXES — ADS Contrast Gate (theme-aware, ratcheted, CI-runnable)
 * Contract: docs/acceptance/ui-fixes-acceptance-criteria.md §1(#2), §5.3, §8
 *
 * Two layers:
 *
 *  1. STATIC (default, CI-runnable, no browser) — scans src for the class of
 *     bug that makes text invisible in dark mode. It flags:
 *       • a *background/surface/shadow* token used as a foreground `color`,
 *         `stroke`, or `fill`  (the notification-title P0:
 *         `text1: var(--ds-background-neutral)` rendered a 7%-alpha fill as
 *         the title colour — contrast ≈1.1:1).
 *       • a role map key named text / label / title / heading assigned a
 *         background/surface token.
 *       • a low-alpha literal colour (<0.4) used as text `color`.
 *     Ratcheted against design-governance/contrast-baseline.json — pre-existing
 *     debt is tolerated, any NEW occurrence fails the gate.
 *
 *  2. LIVE (`--live`) — defers to scripts/route-visual-a11y-gate.cjs, which
 *     drives the running app at :8080 and computes real per-route WCAG ratios.
 *
 * Usage:
 *   node scripts/ads-contrast-gate.cjs             # static ratchet check
 *   node scripts/ads-contrast-gate.cjs --list      # print every finding
 *   node scripts/ads-contrast-gate.cjs --update     # rebaseline to current
 *   node scripts/ads-contrast-gate.cjs --live [--routes /a,/b]  # live probe
 *
 * Exit codes:
 *   0 - findings <= baseline (or --update / --list)
 *   1 - a NEW high-confidence contrast violation landed
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const SRC = path.join(REPO_ROOT, 'src');
const BASELINE_FILE = path.join(REPO_ROOT, 'design-governance', 'contrast-baseline.json');
const EXT = new Set(['.ts', '.tsx', '.css', '.scss']);
const EXCLUDED_DIRS = new Set(['node_modules', '.git', 'dist', 'build']);

const flags = new Set(process.argv.slice(2).filter((a) => a.startsWith('--')));

// --- LIVE mode: delegate to the route-aware Playwright gate -----------------
if (flags.has('--live')) {
  const gate = path.join(__dirname, 'route-visual-a11y-gate.cjs');
  if (!fs.existsSync(gate)) {
    console.error('ads-contrast-gate --live: scripts/route-visual-a11y-gate.cjs not found');
    process.exit(1);
  }
  const passthru = process.argv.slice(2).filter((a) => a !== '--live');
  const r = spawnSync('node', [gate, '--only=contrast', ...passthru], { stdio: 'inherit' });
  process.exit(r.status == null ? 1 : r.status);
}

// --- STATIC scanners --------------------------------------------------------
// A foreground property assigned a *subtle* background/surface token. The
// saturated `*-bold` background tokens (danger-bold, warning-bold, …) are a
// legitimate ADS accent-foreground pattern, so a trailing `bold` is excluded
// via lookbehind — the dangerous class is subtle/neutral/surface fills used
// as text (the notification-title P0 was `--ds-background-neutral`, a 7%-alpha
// fill). Lazy token match terminates at the first `)`/`,`.
// Tempered body: consume `-segment` groups but never a segment starting with
// `bold` (bold, bolder, bold-hovered …), then require a `)`/`,` terminator so
// a stopped token doesn't match a shorter prefix. Result: subtle/neutral/
// surface fills as text are flagged; saturated bold accents are not.
const BG_TOKEN = '--ds-(?:background|surface|shadow|elevation|blanket)(?:-(?!bold)[a-z]+)*\\s*[),]';
const PATTERNS = [
  {
    id: 'bg-token-as-color',
    desc: 'subtle background/surface token used as foreground color',
    re: new RegExp(`\\b(color|stroke|fill)\\b\\s*[:=]\\s*["'\`]?[^"'\`;\\n]*var\\(\\s*${BG_TOKEN}`, 'g'),
  },
  {
    id: 'text-role-bg-token',
    desc: 'text/label/title/heading role assigned a subtle background/surface token',
    re: new RegExp(`\\b(text\\w*|label\\w*|title\\w*|heading\\w*|foreground\\w*)\\s*:\\s*[^,\\n]*var\\(\\s*${BG_TOKEN}`, 'gi'),
  },
  {
    id: 'low-alpha-text',
    desc: 'text color with <0.4 alpha (likely fails 4.5:1)',
    re: /\bcolor\b\s*[:=]\s*["'`]?\s*rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*0?\.[0-3]\d*\s*\)/g,
  },
];

function walk(dir, files) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) walk(path.join(dir, entry.name), files);
    } else if (EXT.has(path.extname(entry.name))) {
      files.push(path.join(dir, entry.name));
    }
  }
}

function scan() {
  const files = [];
  walk(SRC, files);
  const findings = [];
  for (const abs of files) {
    const rel = path.relative(REPO_ROOT, abs);
    const lines = fs.readFileSync(abs, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (/ads-scanner:ignore/.test(line)) return; // honour existing escape hatch
      for (const p of PATTERNS) {
        p.re.lastIndex = 0;
        if (p.re.test(line)) {
          findings.push({ id: p.id, file: rel, line: i + 1, text: line.trim().slice(0, 120) });
        }
      }
    });
  }
  return findings.sort((a, b) => (a.file + a.line).localeCompare(b.file + b.line));
}

function loadBaseline() {
  if (!fs.existsSync(BASELINE_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function key(f) {
  return `${f.id}::${f.file}::${f.text}`; // line-independent so edits above don't trip it
}

function main() {
  const findings = scan();
  const byId = findings.reduce((a, f) => ((a[f.id] = (a[f.id] || 0) + 1), a), {});

  if (flags.has('--list')) {
    findings.forEach((f) => console.log(`${f.file}:${f.line}  [${f.id}]  ${f.text}`));
    console.log(`\nTotal: ${findings.length}  (${Object.entries(byId).map(([k, v]) => `${k}=${v}`).join(', ')})`);
    return;
  }

  if (flags.has('--update')) {
    fs.mkdirSync(path.dirname(BASELINE_FILE), { recursive: true });
    fs.writeFileSync(
      BASELINE_FILE,
      JSON.stringify({ total: findings.length, byId, keys: findings.map(key) }, null, 2)
    );
    console.log(`ads-contrast-gate: baseline updated -> ${findings.length} tolerated finding(s)`);
    return;
  }

  const baseline = loadBaseline();
  if (!baseline) {
    console.error('ads-contrast-gate: no baseline found. Run `node scripts/ads-contrast-gate.cjs --update` to seed it.');
    console.error(`  (current findings: ${findings.length})`);
    process.exit(1);
  }

  const tolerated = new Set(baseline.keys || []);
  const fresh = findings.filter((f) => !tolerated.has(key(f)));
  if (fresh.length) {
    console.error(`ads-contrast-gate: ${fresh.length} NEW contrast violation(s) (background token as foreground / low-alpha text):\n`);
    fresh.forEach((f) => console.error(`  ${f.file}:${f.line}  [${f.id}]  ${f.text}`));
    console.error('\nFix: use a foreground token (var(--ds-text*), var(--ds-icon*), var(--ds-link*)) — never a background/surface token — for text/icon color.');
    process.exit(1);
  }
  console.log(`ads-contrast-gate: PASS — ${findings.length} finding(s), all within baseline (${baseline.total}). No new violations.`);
}

main();
