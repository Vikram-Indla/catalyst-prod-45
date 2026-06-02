/**
 * Plain Node.js test runner for Phase 7: Gemini edge fn + useBackupSuggestion.
 * Run: node src/hooks/__tests__/presence-ai.node.mjs
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

console.log('\nPhase 7 — Gemini edge fn + useBackupSuggestion\n');

// ─── Edge function ────────────────────────────────────────────────────────────
console.log('presence-backup-suggest edge function:');

test('function directory exists', () => {
  src('supabase/functions/presence-backup-suggest/index.ts');
});

test('uses Deno serve pattern', () => {
  const s = src('supabase/functions/presence-backup-suggest/index.ts');
  assert(/serve\s*\(/.test(s), 'No Deno serve() call');
});

test('handles OPTIONS preflight with corsHeaders', () => {
  const s = src('supabase/functions/presence-backup-suggest/index.ts');
  assert(/OPTIONS/.test(s) && /corsHeaders/.test(s), 'No CORS preflight handler');
});

test('reads GEMINI_API_KEY from Deno.env', () => {
  const s = src('supabase/functions/presence-backup-suggest/index.ts');
  assert(/GEMINI_API_KEY/.test(s), 'No GEMINI_API_KEY env read');
});

test('returns 500 if GEMINI_API_KEY not configured', () => {
  const s = src('supabase/functions/presence-backup-suggest/index.ts');
  // Must guard for missing key
  assert(/GEMINI_API_KEY.*not configured|!GEMINI_API_KEY/.test(s), 'No missing-key guard');
});

test('accepts assignee_user_id in request body', () => {
  const s = src('supabase/functions/presence-backup-suggest/index.ts');
  assert(/assignee_user_id/.test(s), 'No assignee_user_id input field');
});

test('queries user_availability for the assignee leave record', () => {
  const s = src('supabase/functions/presence-backup-suggest/index.ts');
  assert(/user_availability/.test(s), 'No user_availability query');
});

test('queries v_user_effective_status for backup candidates', () => {
  const s = src('supabase/functions/presence-backup-suggest/index.ts');
  assert(/v_user_effective_status/.test(s), 'No v_user_effective_status query');
});

test('calls Gemini API (generativelanguage.googleapis.com)', () => {
  const s = src('supabase/functions/presence-backup-suggest/index.ts');
  assert(/generativelanguage\.googleapis\.com|gemini/.test(s), 'No Gemini API call');
});

test('returns suggested_backup with name and reason', () => {
  const s = src('supabase/functions/presence-backup-suggest/index.ts');
  assert(/suggested_backup/.test(s), 'No suggested_backup in response');
  assert(/reason/.test(s), 'No reason field in suggested_backup');
});

test('returns coverage_insight text', () => {
  const s = src('supabase/functions/presence-backup-suggest/index.ts');
  assert(/coverage_insight/.test(s), 'No coverage_insight in response');
});

test('uses service-role client for DB queries (not anon)', () => {
  const s = src('supabase/functions/presence-backup-suggest/index.ts');
  assert(/SUPABASE_SERVICE_ROLE_KEY/.test(s), 'No service-role key — use service client for DB queries');
});

test('logs to ai_governance_audit_log', () => {
  const s = src('supabase/functions/presence-backup-suggest/index.ts');
  assert(/ai_governance_audit_log/.test(s), 'No audit log write');
});

// ─── useBackupSuggestion hook ─────────────────────────────────────────────────
console.log('\nuseBackupSuggestion hook:');

test('file exists at src/hooks/useBackupSuggestion.ts', () => {
  src('src/hooks/useBackupSuggestion.ts');
});

test('calls presence-backup-suggest edge function via supabase.functions.invoke', () => {
  const s = src('src/hooks/useBackupSuggestion.ts');
  assert(/functions\.invoke/.test(s) && /presence-backup-suggest/.test(s),
    'No supabase.functions.invoke("presence-backup-suggest")');
});

test('uses useMutation from react-query', () => {
  const s = src('src/hooks/useBackupSuggestion.ts');
  assert(/useMutation/.test(s), 'No useMutation');
});

test('accepts assignee_user_id as mutation variable', () => {
  const s = src('src/hooks/useBackupSuggestion.ts');
  assert(/assignee_user_id/.test(s), 'No assignee_user_id parameter');
});

test('returns suggested_backup and coverage_insight from response', () => {
  const s = src('src/hooks/useBackupSuggestion.ts');
  assert(/suggested_backup/.test(s) && /coverage_insight/.test(s),
    'Hook must surface suggested_backup and coverage_insight');
});

test('exports useBackupSuggestion as named function', () => {
  const s = src('src/hooks/useBackupSuggestion.ts');
  assert(/export.*function.*useBackupSuggestion|export.*useBackupSuggestion/.test(s), 'No named export');
});

// ─── PresencePanel coverage insight wiring ────────────────────────────────────
console.log('\nPresencePanel coverage insight:');

test('PresencePanel imports useBackupSuggestion', () => {
  const s = src('src/components/for-you/atlaskit/PresencePanel.tsx');
  assert(/useBackupSuggestion/.test(s), 'PresencePanel does not use useBackupSuggestion');
});

test('PresencePanel shows coverage_insight card when insight is present', () => {
  const s = src('src/components/for-you/atlaskit/PresencePanel.tsx');
  assert(/coverage_insight|coverageInsight/.test(s), 'No coverage_insight display in PresencePanel');
});

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
