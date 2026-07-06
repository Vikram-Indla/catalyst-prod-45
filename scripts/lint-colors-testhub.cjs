#!/usr/bin/env node

/**
 * CATALYST — TestHub STRICT color guardrail (P1-S19, E1/E2)
 * CAT-TESTHUB-PROD-20260703-001
 *
 * lint:colors and lint:colors:gate are repo-wide RATCHETS — they only block
 * on *new* debt, tolerating the ~25k pre-existing violations elsewhere.
 * They also deliberately WHITELIST var(--ds-*, #hex) fallbacks (E2's "fallback
 * hole" — contradicts CLAUDE.md's hard-stop color law).
 *
 * This script is a STRICT, zero-baseline gate scoped ONLY to the TestHub
 * surface this feature owns: any bare hex/rgb/hsl, any Tailwind color
 * utility, any dark: twin, or any var(--ds-*, #hex-or-rgba) fallback in
 * src/pages/testhub/** or src/components/testhub/** fails the build.
 * No ratchet, no baseline — TestHub is color-clean as of P1-S17a and stays
 * that way.
 *
 * Also asserts a set of "tombstone" paths deleted during P0/P1 (dead-code
 * sweeps, ghost hooks, disconnected admin pages) never get recreated.
 *
 * Usage:
 *   node scripts/lint-colors-testhub.cjs
 *
 * Exit codes:
 *   0 - clean
 *   1 - violation(s) found (color debt or a tombstone path resurrected)
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SCAN_ROOTS = [
  'src/pages/testhub',
  'src/components/testhub',
  // CAT-TESTHUB-V2 (I6): V2 surfaces living outside the two legacy roots stay
  // under the same zero-baseline gate.
  'src/components/catalyst-detail-views/test-case',
  'src/components/releases/detail/SprintTestHealthSection.tsx',
  'src/components/releases/detail/ReleaseTestReadinessSection.tsx',
  'src/hooks/test-management',
];
const SCAN_EXTENSIONS = ['.ts', '.tsx', '.css'];

// Paths this session confirmed dead and deleted — must never come back.
const TOMBSTONE_PATHS = [
  'src/pages/admin/AdminSidebar.tsx',
  'src/pages/admin/test/TestRunStatusesPage.tsx',
  'src/hooks/useDefectsG25.ts',
  'src/lib/shared-quality/hooks/useDefects.ts',
  'src/hooks/test-cases/useRequirementLinks.ts',
  'src/components/testhub/AddTestCasesToCycleDialog',
];

const BANNED_COLOR_WORDS = '(red|green|blue|yellow|orange|lime|pink|purple|slate|gray|zinc|neutral|stone|amber|emerald|teal|cyan|sky|indigo|violet|fuchsia|rose|white|black)';
const PATTERNS = [
  { name: 'BARE_HEX', re: /#[0-9a-fA-F]{3,8}\b/g },
  { name: 'RAW_RGB_HSL', re: /\b(rgba?|hsla?)\s*\([^)]*\)/gi },
  { name: 'TAILWIND_COLOR_UTILITY', re: new RegExp(`\\b(bg|text|border|from|to|via|ring|fill|stroke)-${BANNED_COLOR_WORDS}-?[0-9]*(\\/[0-9]+)?\\b`, 'g') },
  { name: 'DARK_TWIN', re: /\bdark:/g },
];

// hsl/rgb(var(--...)) wrapping a token is fine; a hex/rgba INSIDE a var()
// fallback is the exact pattern CLAUDE.md bans — no exception here (E2).
const WRAPPED_TOKEN_OK = /\b(hsl|hsla|rgb|rgba)\s*\(\s*var\s*\(/i;

function isExcluded(filePath) {
  return false; // no per-file exclusions in this strict scope
}

function collectFiles(dir, out) {
  if (!fs.existsSync(dir)) return;
  // I6: SCAN_ROOTS may name a single file (surgical inclusion of V2 surfaces
  // that live in directories shared with other modules).
  if (fs.statSync(dir).isFile()) {
    if (SCAN_EXTENSIONS.includes(path.extname(dir)) && !isExcluded(dir)) out.push(dir);
    return;
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(full, out);
    } else if (entry.isFile() && SCAN_EXTENSIONS.includes(path.extname(entry.name)) && !isExcluded(full)) {
      out.push(full);
    }
  }
}

function scanFile(filePath, violations) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (/ads-scanner:ignore-line/.test(line)) return;
    if (idx > 0 && /ads-scanner:ignore-next-line/.test(lines[idx - 1])) return;
    if (/^\s*\/\//.test(line) || /^\s*\*/.test(line)) return;

    for (const { name, re } of PATTERNS) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(line)) !== null) {
        const matchText = m[0];
        if (name === 'RAW_RGB_HSL' && WRAPPED_TOKEN_OK.test(line.slice(Math.max(0, m.index - 10), m.index + 10))) continue;
        // CSS custom-property definitions (--foo: rgba(...)) inside index.css-style
        // blocks are fine; TestHub files don't define tokens, so no exception needed.
        violations.push({ file: filePath, line: idx + 1, kind: name, match: matchText, context: line.trim().slice(0, 120) });
      }
    }
  });
}

function checkTombstones() {
  const resurrected = [];
  for (const p of TOMBSTONE_PATHS) {
    if (fs.existsSync(path.join(REPO_ROOT, p))) resurrected.push(p);
  }
  return resurrected;
}

// ── Main ──
const files = [];
for (const root of SCAN_ROOTS) collectFiles(path.join(REPO_ROOT, root), files);

const violations = [];
files.forEach((f) => scanFile(f, violations));
const resurrected = checkTombstones();

console.log('🔍 TestHub strict color + tombstone gate...\n');

if (violations.length === 0 && resurrected.length === 0) {
  console.log(`✅ lint:colors:testhub — 0 violations across ${files.length} files. TestHub is color-pure.\n`);
  process.exit(0);
}

if (violations.length > 0) {
  console.log(`❌ ${violations.length} color violation(s):\n`);
  violations.forEach((v) => {
    console.log(`   [${v.kind}] ${v.file}:${v.line} — ${v.match}`);
    console.log(`     ${v.context}`);
  });
}
if (resurrected.length > 0) {
  console.log(`\n❌ ${resurrected.length} tombstone path(s) resurrected (confirmed dead, must stay deleted):\n`);
  resurrected.forEach((p) => console.log(`   ${p}`));
}
console.log('\n💡 Fix: use var(--ds-*) tokens only, no fallback hex, no Tailwind color utilities, no dark: twins.');
process.exit(1);
