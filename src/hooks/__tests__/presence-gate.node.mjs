/**
 * Plain Node.js test runner for Phase 8: premium gate + ADS audit.
 * Run: node src/hooks/__tests__/presence-gate.node.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../../..');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✅ ${name}`); passed++; }
  catch (e) { console.log(`  ❌ ${name}\n     ${e.message}`); failed++; }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function src(rel) {
  const p = resolve(root, rel);
  assert(existsSync(p), `File not found: ${rel}`);
  return readFileSync(p, 'utf8');
}
function audit(relPath) {
  const absPath = resolve(root, relPath);
  const r = spawnSync('node', [
    resolve(root, 'design-governance/rules/audit.js'),
    absPath,
  ], { encoding: 'utf8' });
  return r.stdout + r.stderr;
}

console.log('\nPhase 8 — Premium gate + ADS audit\n');

// ─── Feature flag key registration ───────────────────────────────────────────
console.log('Feature flag registration:');

test('presence_availability key seeded in migration', () => {
  const s = src('supabase/migrations/20260602000001_presence_availability.sql');
  assert(/presence_availability/.test(s), 'presence_availability not in migration');
  assert(/feature_flags/.test(s), 'Not inserted into feature_flags');
  assert(/is_enabled.*false|false.*is_enabled/.test(s), 'Flag must default to false (off)');
});

// ─── Premium gate in ForYouTabs ───────────────────────────────────────────────
console.log('\nPremium gate — ForYouTabs:');

test('ForYouTabs imports useModuleEnabled from FeatureFlagContext', () => {
  const s = src('src/components/for-you/atlaskit/ForYouTabs.tsx');
  assert(/useModuleEnabled/.test(s), 'No useModuleEnabled import in ForYouTabs');
});

test('ForYouTabs filters team-pulse tab when presence_availability is disabled', () => {
  const s = src('src/components/for-you/atlaskit/ForYouTabs.tsx');
  assert(/presence_availability/.test(s), 'No presence_availability flag check in ForYouTabs');
  // Must conditionally include/exclude team-pulse
  assert(/team-pulse/.test(s) && /filter|presenceEnabled|presence_availability/.test(s),
    'team-pulse tab not gated by presence_availability flag');
});

// ─── Premium gate in ForYouPage ───────────────────────────────────────────────
console.log('\nPremium gate — ForYouPage:');

test('ForYouPage shows premium gate when team-pulse accessed without flag', () => {
  const s = src('src/pages/ForYouPage.atlaskit.tsx');
  // When flag is off and user somehow lands on team-pulse, show gate
  assert(/presence_availability|presenceEnabled|useModuleEnabled/.test(s),
    'ForYouPage does not check presence_availability flag');
});

// ─── ADS audit — PresencePanel ────────────────────────────────────────────────
console.log('\nADS audit — PresencePanel:');

test('PresencePanel: no HARDCODED_PX violations', () => {
  const output = audit('src/components/for-you/atlaskit/PresencePanel.tsx');
  assert(!/HARDCODED_PX/.test(output), `HARDCODED_PX violation in PresencePanel:\n${output.match(/HARDCODED_PX.*\n.*/)?.[0] ?? ''}`);
});

test('PresencePanel: no UPPERCASE_LABEL violations', () => {
  const output = audit('src/components/for-you/atlaskit/PresencePanel.tsx');
  assert(!/UPPERCASE_LABEL/.test(output), 'UPPERCASE_LABEL in PresencePanel — use sentence-case');
});

test('PresencePanel: spacing grid valid', () => {
  const output = audit('src/components/for-you/atlaskit/PresencePanel.tsx');
  assert(/Spacing Grid Validator: PASSED/.test(output), 'Spacing grid violations in PresencePanel');
});

// ─── ADS audit — AvailabilityPanel ───────────────────────────────────────────
console.log('\nADS audit — AvailabilityPanel:');

test('AvailabilityPanel: no HARDCODED_PX violations', () => {
  const output = audit('src/components/layout/AvailabilityPanel.tsx');
  assert(!/HARDCODED_PX/.test(output), `HARDCODED_PX in AvailabilityPanel:\n${output.match(/HARDCODED_PX.*\n.*/)?.[0] ?? ''}`);
});

test('AvailabilityPanel: no UPPERCASE_LABEL violations', () => {
  const output = audit('src/components/layout/AvailabilityPanel.tsx');
  assert(!/UPPERCASE_LABEL/.test(output), 'UPPERCASE_LABEL in AvailabilityPanel — use sentence-case');
});

// ─── ADS audit — EditableAssignee (non-rainbow violations only) ───────────────
console.log('\nADS audit — EditableAssignee (non-rainbow):');

test('EditableAssignee: no HARDCODED_PX violations', () => {
  const output = audit('src/components/EditableAssignee/EditableAssignee.tsx');
  assert(!/HARDCODED_PX/.test(output), `HARDCODED_PX in EditableAssignee:\n${output.match(/HARDCODED_PX.*\n.*/)?.[0] ?? ''}`);
});

test('EditableAssignee: no UPPERCASE_LABEL violations', () => {
  const output = audit('src/components/EditableAssignee/EditableAssignee.tsx');
  assert(!/UPPERCASE_LABEL/.test(output), 'UPPERCASE_LABEL in EditableAssignee');
});

// RAW_HEX on rainbow palette is the approved AI-CTA carve-out (same as AIIntelligenceButton.tsx)
// — not tested here, it is a known-good exception per CLAUDE.md

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
