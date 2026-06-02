/**
 * Plain Node.js test runner for Phase 4 ProfileMenu quick-set + leave scheduler.
 * Run: node src/hooks/__tests__/presence-quickset.node.mjs
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

console.log('\nPhase 4 — ProfileMenu quick-set + AvailabilityPanel\n');

// ─── AvailabilityPanel component ─────────────────────────────────────────────
console.log('AvailabilityPanel component:');

test('file exists at src/components/layout/AvailabilityPanel.tsx', () => {
  src('src/components/layout/AvailabilityPanel.tsx');
});

test('imports @atlaskit/datetime-picker (DateTimePicker)', () => {
  const s = src('src/components/layout/AvailabilityPanel.tsx');
  assert(/@atlaskit\/datetime-picker/.test(s), 'No @atlaskit/datetime-picker import');
});

test('imports usePresence for quick-set buttons', () => {
  const s = src('src/components/layout/AvailabilityPanel.tsx');
  assert(/usePresence/.test(s), 'No usePresence import');
});

test('imports supabase client for user_availability insert', () => {
  const s = src('src/components/layout/AvailabilityPanel.tsx');
  assert(/supabase/.test(s), 'No supabase import');
});

test('renders quick-set button for available state', () => {
  const s = src('src/components/layout/AvailabilityPanel.tsx');
  assert(/available/.test(s), 'No available state quick-set');
});

test('renders quick-set button for busy state', () => {
  const s = src('src/components/layout/AvailabilityPanel.tsx');
  assert(/busy/.test(s), 'No busy state quick-set');
});

test('renders quick-set button for away state', () => {
  const s = src('src/components/layout/AvailabilityPanel.tsx');
  assert(/away/.test(s), 'No away state quick-set');
});

test('has leave scheduler form section', () => {
  const s = src('src/components/layout/AvailabilityPanel.tsx');
  assert(/Schedule leave|schedule.*leave|leave.*schedule/i.test(s), 'No leave scheduler section');
});

test('uses DateTimePicker for starts_at (not hand-rolled input)', () => {
  const s = src('src/components/layout/AvailabilityPanel.tsx');
  assert(/DateTimePicker|DatePicker/.test(s), 'No ADS DateTimePicker for date field');
  // Ensure no raw <input type="date" or type="datetime-local"
  assert(!/input.*type=["']date|input.*type=["']datetime-local/.test(s), 'Hand-rolled date input detected — use @atlaskit/datetime-picker');
});

test('has leave kind field (vacation/sick/ooo/public_holiday)', () => {
  const s = src('src/components/layout/AvailabilityPanel.tsx');
  assert(/vacation|sick|ooo|public_holiday/.test(s), 'No leave kind options');
});

test('has optional note field', () => {
  const s = src('src/components/layout/AvailabilityPanel.tsx');
  assert(/note/.test(s), 'No note field in leave form');
});

test('has optional backup user field', () => {
  const s = src('src/components/layout/AvailabilityPanel.tsx');
  assert(/backup/.test(s), 'No backup user field');
});

test('submits to user_availability table', () => {
  const s = src('src/components/layout/AvailabilityPanel.tsx');
  assert(/user_availability/.test(s), 'No user_availability insert/upsert');
});

test('exported as named export AvailabilityPanel', () => {
  const s = src('src/components/layout/AvailabilityPanel.tsx');
  assert(/export.*function.*AvailabilityPanel|export.*AvailabilityPanel/.test(s), 'No named export');
});

// ─── ProfileMenu wiring ───────────────────────────────────────────────────────
console.log('\nProfileMenu quick-set wiring:');

test('ProfileMenu imports AvailabilityPanel', () => {
  const s = src('src/components/layout/ProfileMenu.tsx');
  assert(/AvailabilityPanel/.test(s), 'AvailabilityPanel not imported in ProfileMenu');
});

test('ProfileMenu renders AvailabilityPanel in dropdown', () => {
  const s = src('src/components/layout/ProfileMenu.tsx');
  assert(/<AvailabilityPanel/.test(s), 'AvailabilityPanel not rendered in ProfileMenu');
});

// ─── ADS compliance ───────────────────────────────────────────────────────────
console.log('\nADS compliance:');

test('AvailabilityPanel uses no bare hex (#) colors', () => {
  const s = src('src/components/layout/AvailabilityPanel.tsx');
  // Strip ADS var() fallbacks before checking
  const stripped = s.replace(/var\(--ds-[^,)]+,\s*#[0-9a-fA-F]{3,8}\)/g, 'TOKEN');
  const bareHex = stripped.match(/#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}/);
  assert(!bareHex, `Bare hex found: ${bareHex?.[0]} — use var(--ds-*) tokens`);
});

test('AvailabilityPanel uses no Tailwind color utilities', () => {
  const s = src('src/components/layout/AvailabilityPanel.tsx');
  assert(!/className=["'][^"']*(?:text-|bg-|border-)[a-z]+-[0-9]+/.test(s), 'Tailwind color utility found');
});

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
