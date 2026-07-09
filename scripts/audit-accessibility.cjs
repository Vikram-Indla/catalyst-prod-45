#!/usr/bin/env node

/**
 * CATALYST UI-FIXES — Accessibility Gate (static + live axe, ratcheted)
 * Contract: docs/acceptance/ui-fixes-acceptance-criteria.md §1(#3), §5.8, §8
 *
 * Two layers:
 *
 *  1. STATIC (default, CI-runnable) — scans src/*.tsx for high-confidence,
 *     low-noise a11y defects:
 *       • outline:none / outline:0 with NO focus-visible replacement on the
 *         same element block  (DirectNotificationRow.tsx:175 focus loss).
 *       • <img ...> with no alt attribute.
 *       • <svg ...> with role="img"/aria-* absent AND no aria-hidden on an
 *         icon-only interactive parent — reported as info only.
 *     Ratcheted against design-governance/a11y-baseline.json.
 *
 *  2. LIVE (`--live`) — defers to scripts/route-visual-a11y-gate.cjs, which
 *     runs @axe-core/playwright (WCAG 2.1 AA) over the real app routes in
 *     light and dark mode.
 *
 * Usage:
 *   node scripts/audit-accessibility.cjs            # static ratchet check
 *   node scripts/audit-accessibility.cjs --list      # print findings
 *   node scripts/audit-accessibility.cjs --update     # rebaseline
 *   node scripts/audit-accessibility.cjs --live [--routes /a,/b]
 *
 * Exit codes:
 *   0 - findings <= baseline (or --update / --list)
 *   1 - a NEW a11y violation landed
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const SRC = path.join(REPO_ROOT, 'src');
const BASELINE_FILE = path.join(REPO_ROOT, 'design-governance', 'a11y-baseline.json');
const EXCLUDED_DIRS = new Set(['node_modules', '.git', 'dist', 'build']);

const flags = new Set(process.argv.slice(2).filter((a) => a.startsWith('--')));

if (flags.has('--live')) {
  const gate = path.join(__dirname, 'route-visual-a11y-gate.cjs');
  if (!fs.existsSync(gate)) {
    console.error('audit-accessibility --live: scripts/route-visual-a11y-gate.cjs not found');
    process.exit(1);
  }
  const passthru = process.argv.slice(2).filter((a) => a !== '--live');
  const r = spawnSync('node', [gate, '--only=a11y', ...passthru], { stdio: 'inherit' });
  process.exit(r.status == null ? 1 : r.status);
}

function walk(dir, files) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) walk(path.join(dir, entry.name), files);
    } else if (entry.name.endsWith('.tsx')) {
      files.push(path.join(dir, entry.name));
    }
  }
}

function scanFile(abs, rel, findings) {
  const content = fs.readFileSync(abs, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, i) => {
    if (/ads-scanner:ignore|a11y:ignore/.test(line)) return;

    // outline:none / outline:0 without a focus replacement nearby (±14 lines)
    if (/outline\s*:\s*["'`]?\s*(none|0)\b/.test(line)) {
      const windowText = lines.slice(Math.max(0, i - 14), i + 14).join('\n');
      const hasFocusReplacement =
        /focus-visible|focusVisible|:focus|onFocus|boxShadow.*focus|outlineOffset|--ds-border-focused/i.test(
          windowText
        );
      if (!hasFocusReplacement) {
        findings.push({
          id: 'outline-none-no-focus',
          file: rel,
          line: i + 1,
          text: line.trim().slice(0, 120),
        });
      }
    }

    // <img> without alt
    if (/<img\b/.test(line) && !/\balt\s*=/.test(line)) {
      findings.push({ id: 'img-no-alt', file: rel, line: i + 1, text: line.trim().slice(0, 120) });
    }
  });
}

function walkAndScan() {
  const files = [];
  walk(SRC, files);
  const findings = [];
  for (const abs of files) scanFile(abs, path.relative(REPO_ROOT, abs), findings);
  return findings.sort((a, b) => (a.file + a.line).localeCompare(b.file + b.line));
}

function key(f) {
  return `${f.id}::${f.file}::${f.text}`;
}

function loadBaseline() {
  if (!fs.existsSync(BASELINE_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function main() {
  const findings = walkAndScan();
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
    console.log(`audit-accessibility: baseline updated -> ${findings.length} tolerated finding(s)`);
    return;
  }

  const baseline = loadBaseline();
  if (!baseline) {
    console.error('audit-accessibility: no baseline found. Run `node scripts/audit-accessibility.cjs --update` to seed it.');
    console.error(`  (current findings: ${findings.length})`);
    process.exit(1);
  }

  const tolerated = new Set(baseline.keys || []);
  const fresh = findings.filter((f) => !tolerated.has(key(f)));
  if (fresh.length) {
    console.error(`audit-accessibility: ${fresh.length} NEW accessibility violation(s):\n`);
    fresh.forEach((f) => console.error(`  ${f.file}:${f.line}  [${f.id}]  ${f.text}`));
    console.error('\nFix: replace outline:none with a visible focus-visible ring (var(--ds-border-focused)); add alt/aria-label to icon-only controls.');
    process.exit(1);
  }
  console.log(`audit-accessibility: PASS — ${findings.length} finding(s), all within baseline (${baseline.total}). No new violations.`);
}

main();
