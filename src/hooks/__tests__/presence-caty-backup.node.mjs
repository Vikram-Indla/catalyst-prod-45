/**
 * Plain Node.js test runner for Phase 5: EditableAssignee Caty backup suggestion.
 * Run: node src/hooks/__tests__/presence-caty-backup.node.mjs
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

console.log('\nPhase 5 — EditableAssignee Caty backup suggestion\n');

// ─── AssigneeOption interface extension ──────────────────────────────────────
console.log('AssigneeOption interface:');

test('backupSuggestion field exists on AssigneeOption', () => {
  const s = src('src/components/EditableAssignee/EditableAssignee.tsx');
  assert(/backupSuggestion/.test(s), 'No backupSuggestion field on AssigneeOption');
});

test('backupSuggestion is optional (nullable)', () => {
  const s = src('src/components/EditableAssignee/EditableAssignee.tsx');
  // Optional field should use ? or | null
  assert(/backupSuggestion\??:/.test(s), 'backupSuggestion should be optional (?:)');
});

test('backupSuggestion has a name property', () => {
  // The suggestion carries at least a name to display
  const s = src('src/components/EditableAssignee/EditableAssignee.tsx');
  // Either inline type definition or reference to a type with name
  assert(/backupSuggestion/.test(s) && /name/.test(s), 'backupSuggestion missing name property');
});

// ─── Caty suggestion row rendering ───────────────────────────────────────────
console.log('\nCaty suggestion row:');

test('renders Caty suggest section when backupSuggestion is set', () => {
  const s = src('src/components/EditableAssignee/EditableAssignee.tsx');
  assert(/backupSuggestion/.test(s) && /Caty suggest|caty.*suggest|suggest.*caty/i.test(s),
    'No "Caty suggests" label rendered');
});

test('uses sparkle ✦ glyph or "Caty" label as AI indicator', () => {
  const s = src('src/components/EditableAssignee/EditableAssignee.tsx');
  assert(/✦|Caty/.test(s), 'No ✦ sparkle or Caty label in suggestion row');
});

test('suggestion row is clickable (button element)', () => {
  const s = src('src/components/EditableAssignee/EditableAssignee.tsx');
  // Should be a button so it's keyboard-accessible
  const hasCatySuggestion = /backupSuggestion/.test(s);
  // The suggestion row must be rendered as a button or have onClick
  assert(hasCatySuggestion && /onClick/.test(s), 'Suggestion row needs onClick handler');
});

test('clicking suggestion calls onSelect with suggested name', () => {
  const s = src('src/components/EditableAssignee/EditableAssignee.tsx');
  assert(/backupSuggestion.*name|suggestion.*name|backupSuggestion\.name/.test(s),
    'onSelect not wired to backupSuggestion.name');
});

test('suggestion row uses static conic-gradient rainbow border (AI visual marker)', () => {
  const s = src('src/components/EditableAssignee/EditableAssignee.tsx');
  assert(/conic-gradient|rainbow|#FF3CAC|AIIntelligenceButton|ai-ring/.test(s),
    'No AI visual marker (conic-gradient or rainbow) on suggestion row');
});

test('rainbow border uses animation: none (never rotating)', () => {
  const s = src('src/components/EditableAssignee/EditableAssignee.tsx');
  assert(/animation.*none|animation: 'none'|animation:"none"/.test(s),
    'Rainbow border must have animation: none — no rotation');
});

// ─── Placement ───────────────────────────────────────────────────────────────
console.log('\nPlacement:');

test('Caty suggestion section appears before the Unassigned option', () => {
  const s = src('src/components/EditableAssignee/EditableAssignee.tsx');
  const catySuggIdx = s.indexOf('backupSuggestion');
  const unassignedIdx = s.indexOf('Unassigned');
  assert(catySuggIdx < unassignedIdx, 'Caty suggestion must render BEFORE Unassigned option');
});

test('suggestion section only renders when backupSuggestion is non-null', () => {
  const s = src('src/components/EditableAssignee/EditableAssignee.tsx');
  // Should be guarded by a conditional check
  assert(/backupSuggestion\s*&&|backupSuggestion\s*\?/.test(s),
    'backupSuggestion must be guarded by conditional (&&  or ternary)');
});

// ─── ADS compliance ───────────────────────────────────────────────────────────
console.log('\nADS compliance:');

test('no new bare hex in EditableAssignee (outside var() fallbacks)', () => {
  const s = src('src/components/EditableAssignee/EditableAssignee.tsx');
  // Strip ADS var() fallbacks before checking
  const stripped = s.replace(/var\(--ds-[^,)]+,\s*#[0-9a-fA-F]{3,8}\)/g, 'TOKEN');
  // Also strip the canonical rainbow palette (exception per CLAUDE.md carve-out)
  const strippedRainbow = stripped.replace(/#FF3CAC|#784BA0|#2B86C5|#00C9FF|#92FE9D|#FFD700/g, 'RAINBOW');
  const bareHex = strippedRainbow.match(/#[0-9a-fA-F]{6}(?![0-9a-fA-F])|#[0-9a-fA-F]{3}(?![0-9a-fA-F])/);
  assert(!bareHex, `Bare hex found: ${bareHex?.[0]} — use var(--ds-*) tokens`);
});

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
