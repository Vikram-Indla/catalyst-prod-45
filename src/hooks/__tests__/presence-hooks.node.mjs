/**
 * Plain Node.js test runner for Phase 2 presence hooks.
 * Run: node src/hooks/__tests__/presence-hooks.node.mjs
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

console.log('\nPhase 2 — presence hooks\n');

// ─── usePresenceHeartbeat ────────────────────────────────────────────────────
console.log('usePresenceHeartbeat:');

test('file exists at src/hooks/usePresenceHeartbeat.ts', () => {
  src('src/hooks/usePresenceHeartbeat.ts');
});

test('imports supabase client', () => {
  assert(src('src/hooks/usePresenceHeartbeat.ts').includes("from '@/integrations/supabase/client'"));
});

test('heartbeat interval is 45 000 ms', () => {
  assert(/45.?000|45_000/.test(src('src/hooks/usePresenceHeartbeat.ts')));
});

test('idle threshold is 10 minutes (600 000 ms or 10 * 60 * 1000)', () => {
  const s = src('src/hooks/usePresenceHeartbeat.ts');
  assert(/600.?000|600_000|10 \* 60|10\*60/.test(s), 'No 10-minute idle threshold');
});

test('sets state to away when idle', () => {
  assert(/away/.test(src('src/hooks/usePresenceHeartbeat.ts')));
});

test('listens for visibilitychange to handle tab hidden', () => {
  assert(/visibilitychange/.test(src('src/hooks/usePresenceHeartbeat.ts')));
});

test('upserts to user_presence table', () => {
  assert(/user_presence/.test(src('src/hooks/usePresenceHeartbeat.ts')));
});

test('exports usePresenceHeartbeat function', () => {
  assert(/export.*function.*usePresenceHeartbeat|export.*usePresenceHeartbeat/.test(src('src/hooks/usePresenceHeartbeat.ts')));
});

// ─── useUserStatus ───────────────────────────────────────────────────────────
console.log('\nuseUserStatus:');

test('file exists at src/hooks/useUserStatus.ts', () => {
  src('src/hooks/useUserStatus.ts');
});

test('imports react-query useQuery', () => {
  assert(/from '@tanstack\/react-query'/.test(src('src/hooks/useUserStatus.ts')));
});

test('queries user_presence or v_user_effective_status', () => {
  const s = src('src/hooks/useUserStatus.ts');
  assert(/user_presence|v_user_effective_status/.test(s));
});

test('subscribes to postgres_changes on user_presence', () => {
  const s = src('src/hooks/useUserStatus.ts');
  assert(/postgres_changes/.test(s));
  assert(/user_presence/.test(s));
});

test('invalidates query on realtime event', () => {
  assert(/invalidateQueries/.test(src('src/hooks/useUserStatus.ts')));
});

test('accepts an array of userIds', () => {
  const s = src('src/hooks/useUserStatus.ts');
  assert(/userIds|user_ids/.test(s), 'No userIds parameter');
});

test('exports useUserStatus function', () => {
  assert(/export.*function.*useUserStatus|export.*useUserStatus/.test(src('src/hooks/useUserStatus.ts')));
});

// ─── usePresence mutation ────────────────────────────────────────────────────
console.log('\nusePresence (mutation):');

test('file exists at src/hooks/usePresence.ts', () => {
  src('src/hooks/usePresence.ts');
});

test('uses useMutation from react-query', () => {
  assert(/useMutation/.test(src('src/hooks/usePresence.ts')));
});

test('upserts to user_presence table', () => {
  assert(/user_presence/.test(src('src/hooks/usePresence.ts')));
});

test('accepts presence_state values (available/away/busy)', () => {
  const s = src('src/hooks/usePresence.ts');
  assert(/available|away|busy/.test(s));
});

test('respects manual override constraint (cannot force available when idle)', () => {
  const s = src('src/hooks/usePresence.ts');
  assert(/manual_until|manualUntil/.test(s), 'No manual_until field — override constraint not implemented');
});

test('exports usePresence function', () => {
  assert(/export.*function.*usePresence|export.*usePresence/.test(src('src/hooks/usePresence.ts')));
});

// ─── PresenceState types ─────────────────────────────────────────────────────
console.log('\nPresence types:');

test('types file exists at src/lib/presence.ts', () => {
  src('src/lib/presence.ts');
});

test('exports PresenceState type/enum with all 5 states', () => {
  const s = src('src/lib/presence.ts');
  assert(/available/.test(s) && /away/.test(s) && /busy/.test(s) && /offline/.test(s) && /on_leave/.test(s));
});

test('exports ring color constants using ADS tokens', () => {
  const s = src('src/lib/presence.ts');
  assert(/var\(--ds-/.test(s) || /1868DB|6B6E76|E2B203|C9372C/.test(s), 'No ring color constants');
});

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
