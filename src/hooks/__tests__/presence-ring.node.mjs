/**
 * Plain Node.js test runner for Phase 3 PresenceRing + surface wiring.
 * Run: node src/hooks/__tests__/presence-ring.node.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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

console.log('\nPhase 3 — PresenceRing component & surface wiring\n');

// ─── PresenceRing component ───────────────────────────────────────────────────
console.log('PresenceRing component:');

test('file exists at src/components/shared/PresenceRing.tsx', () => {
  src('src/components/shared/PresenceRing.tsx');
});

test('imports CatalystAvatar', () => {
  assert(/CatalystAvatar/.test(src('src/components/shared/PresenceRing.tsx')));
});

test('imports PRESENCE_RING and PRESENCE_DASHED from @/lib/presence', () => {
  const s = src('src/components/shared/PresenceRing.tsx');
  assert(/PRESENCE_RING/.test(s));
  assert(/PRESENCE_DASHED/.test(s));
});

test('accepts state prop of PresenceState type', () => {
  assert(/state.*PresenceState|PresenceState.*state/.test(src('src/components/shared/PresenceRing.tsx')));
});

test('renders solid ring via box-shadow for available/busy/offline/on_leave', () => {
  assert(/box-shadow|boxShadow/.test(src('src/components/shared/PresenceRing.tsx')));
});

test('renders dashed ring element for away state', () => {
  const s = src('src/components/shared/PresenceRing.tsx');
  assert(/dashed/.test(s), 'No dashed ring for away state');
});

test('uses ADS surface token for the white gap between avatar and ring', () => {
  const s = src('src/components/shared/PresenceRing.tsx');
  assert(/ds-surface|ds-elevation/.test(s), 'No ADS surface token for ring gap');
});

test('renders nothing extra when state is null/undefined (no ring)', () => {
  const s = src('src/components/shared/PresenceRing.tsx');
  assert(/!state|state == null|state === null|state === undefined/.test(s), 'No null guard');
});

test('exports PresenceRing as named export', () => {
  assert(/export.*function.*PresenceRing|export.*PresenceRing/.test(src('src/components/shared/PresenceRing.tsx')));
});

// ─── ProfileMenu wiring ───────────────────────────────────────────────────────
console.log('\nProfileMenu wiring:');

test('ProfileMenu imports PresenceRing', () => {
  assert(/PresenceRing/.test(src('src/components/layout/ProfileMenu.tsx')));
});

test('ProfileMenu imports useOwnPresence', () => {
  assert(/useOwnPresence/.test(src('src/components/layout/ProfileMenu.tsx')));
});

test('ProfileMenu renders PresenceRing with own state', () => {
  const s = src('src/components/layout/ProfileMenu.tsx');
  assert(/<PresenceRing/.test(s) || /PresenceRing\s*\(/.test(s), 'PresenceRing not rendered');
});

// ─── EditableAssignee wiring ──────────────────────────────────────────────────
console.log('\nEditableAssignee wiring:');

test('AssigneeOption interface includes userId field', () => {
  assert(/userId/.test(src('src/components/EditableAssignee/EditableAssignee.tsx')));
});

test('AssigneeOption interface includes presenceState field', () => {
  assert(/presenceState/.test(src('src/components/EditableAssignee/EditableAssignee.tsx')));
});

test('EditableAssignee imports PresenceRing', () => {
  assert(/PresenceRing/.test(src('src/components/EditableAssignee/EditableAssignee.tsx')));
});

test('EditableAssignee renders avatar in option rows (CatalystAvatar or PresenceRing)', () => {
  const s = src('src/components/EditableAssignee/EditableAssignee.tsx');
  assert(/CatalystAvatar|PresenceRing/.test(s), 'No avatar rendered in option rows');
});

test('EditableAssignee renders back_on date badge when presenceState is on_leave', () => {
  const s = src('src/components/EditableAssignee/EditableAssignee.tsx');
  assert(/on_leave|back_on|backOn/.test(s), 'No on_leave / back_on badge');
});

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
