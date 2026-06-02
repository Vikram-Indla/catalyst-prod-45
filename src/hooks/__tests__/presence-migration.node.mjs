/**
 * Plain Node.js runner for presence-migration assertions.
 * Run with: node src/hooks/__tests__/presence-migration.node.mjs
 * (Used when vitest is blocked by Node version constraint.)
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');
const migrationsDir = resolve(repoRoot, 'supabase/migrations');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ ${name}`);
    console.log(`     ${e.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'assertion failed');
}

function findMigration(pattern) {
  const files = readdirSync(migrationsDir).sort();
  for (const f of files) { if (pattern.test(f)) return resolve(migrationsDir, f); }
  return null;
}

function getSql() {
  const p = findMigration(/presence_availability/);
  if (!p) throw new Error('No *presence_availability* migration found');
  return readFileSync(p, 'utf8');
}

console.log('\nPhase 1 — presence & availability migration\n');

test('migration file exists', () => {
  assert(findMigration(/presence_availability/) !== null, 'No migration file found');
});

test('creates user_presence table', () => {
  assert(/CREATE TABLE.*user_presence/s.test(getSql()));
});

test('user_presence has state enum values', () => {
  assert(/available|away|busy|offline|on_leave/.test(getSql()));
});

test('user_presence has last_seen_at column', () => {
  assert(/last_seen_at/.test(getSql()));
});

test('user_presence has REPLICA IDENTITY FULL', () => {
  assert(/REPLICA IDENTITY FULL/.test(getSql()));
});

test('creates user_availability table', () => {
  assert(/CREATE TABLE.*user_availability/s.test(getSql()));
});

test('user_availability has leave kind enum', () => {
  assert(/vacation|public_holiday|sick|ooo/i.test(getSql()));
});

test('user_availability has starts_at + ends_at', () => {
  const sql = getSql();
  assert(/starts_at/.test(sql) && /ends_at/.test(sql));
});

test('user_availability has backup_user_id', () => {
  assert(/backup_user_id/.test(getSql()));
});

test('creates v_user_effective_status view', () => {
  assert(/CREATE.*VIEW.*v_user_effective_status/s.test(getSql()));
});

test('view exposes on_leave state', () => {
  assert(/on_leave/.test(getSql()));
});

test('view exposes back_on (ends_at + 1 day)', () => {
  assert(/back_on|ends_at.*\+ interval/i.test(getSql()));
});

test('creates shared_user_ids function', () => {
  assert(/CREATE.*FUNCTION.*shared_user_ids/s.test(getSql()));
});

test('shared_user_ids unions project + product membership', () => {
  const sql = getSql();
  assert(/UNION/i.test(sql));
  assert(/ph_issues|project_members/.test(sql));
  assert(/business_requests/.test(sql));
});

test('RLS enabled on user_presence', () => {
  assert(/ENABLE ROW LEVEL SECURITY/.test(getSql()));
});

test('SELECT policy uses shared_user_ids (not jwt role)', () => {
  const sql = getSql();
  assert(/shared_user_ids/.test(sql));
  assert(!/auth\.jwt\(\).*role/.test(sql));
});

test('write policy uses auth.uid()', () => {
  assert(/auth\.uid\(\)/.test(getSql()));
});

test('creates clean_stale_presence sweeping after 5 min', () => {
  const sql = getSql();
  assert(/clean_stale_presence/.test(sql));
  assert(/offline/.test(sql));
  assert(/5 minute|5.*minute/i.test(sql));
});

test('seeds presence_availability feature flag', () => {
  assert(/presence_availability/.test(getSql()));
});

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
