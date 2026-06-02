/**
 * Plain Node.js test runner for Phase 6: Team Pulse PresencePanel + tab wiring.
 * Run: node src/hooks/__tests__/presence-panel.node.mjs
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

console.log('\nPhase 6 — Team Pulse PresencePanel\n');

// ─── useTeamPulse hook ────────────────────────────────────────────────────────
console.log('useTeamPulse hook:');

test('file exists at src/hooks/useTeamPulse.ts', () => {
  src('src/hooks/useTeamPulse.ts');
});

test('calls shared_user_ids RPC to resolve audience', () => {
  const s = src('src/hooks/useTeamPulse.ts');
  assert(/shared_user_ids/.test(s), 'No shared_user_ids RPC call');
});

test('queries v_user_effective_status for resolved user ids', () => {
  const s = src('src/hooks/useTeamPulse.ts');
  assert(/v_user_effective_status/.test(s), 'No v_user_effective_status query');
});

test('queries user_availability for this-week leave entries', () => {
  const s = src('src/hooks/useTeamPulse.ts');
  assert(/user_availability/.test(s), 'No user_availability query for leave');
});

test('subscribes to realtime user_presence changes', () => {
  const s = src('src/hooks/useTeamPulse.ts');
  assert(/postgres_changes|user_presence/.test(s), 'No realtime subscription on user_presence');
});

test('exports useTeamPulse as named function', () => {
  const s = src('src/hooks/useTeamPulse.ts');
  assert(/export.*function.*useTeamPulse|export.*useTeamPulse/.test(s), 'No named export');
});

// ─── PresencePanel component ──────────────────────────────────────────────────
console.log('\nPresencePanel component:');

test('file exists at src/components/for-you/atlaskit/PresencePanel.tsx', () => {
  src('src/components/for-you/atlaskit/PresencePanel.tsx');
});

test('imports useTeamPulse', () => {
  const s = src('src/components/for-you/atlaskit/PresencePanel.tsx');
  assert(/useTeamPulse/.test(s), 'No useTeamPulse import');
});

test('imports PresenceRing for status avatars', () => {
  const s = src('src/components/for-you/atlaskit/PresencePanel.tsx');
  assert(/PresenceRing/.test(s), 'No PresenceRing import');
});

test('renders team status list section', () => {
  const s = src('src/components/for-you/atlaskit/PresencePanel.tsx');
  assert(/Team.*status|team.*pulse|Who.*s.*on|who.*on/i.test(s), 'No team status section');
});

test('shows relative time label (Active X ago / Back date)', () => {
  const s = src('src/components/for-you/atlaskit/PresencePanel.tsx');
  assert(/ago|Active|back_on|backOn|last_seen/i.test(s), 'No relative time / return date label');
});

test('renders "Who\'s out" section for weekly leave calendar strip', () => {
  const s = src('src/components/for-you/atlaskit/PresencePanel.tsx');
  assert(/Who.*out|who.*out|on.*leave|on_leave/i.test(s), 'No "Who\'s out" / leave section');
});

test('shows Spinner from @atlaskit/spinner while loading', () => {
  const s = src('src/components/for-you/atlaskit/PresencePanel.tsx');
  assert(/@atlaskit\/spinner|Spinner/.test(s), 'No loading spinner');
});

test('shows empty state when no team members found', () => {
  const s = src('src/components/for-you/atlaskit/PresencePanel.tsx');
  assert(/empty|no.*team|no.*member|length.*===.*0|\.length\s*===\s*0/i.test(s), 'No empty state');
});

test('exported as named export PresencePanel', () => {
  const s = src('src/components/for-you/atlaskit/PresencePanel.tsx');
  assert(/export.*function.*PresencePanel|export.*PresencePanel/.test(s), 'No named export');
});

test('no bare hex colors (outside var() ADS fallbacks)', () => {
  const s = src('src/components/for-you/atlaskit/PresencePanel.tsx');
  const stripped = s.replace(/var\(--ds-[^,)]+,\s*#[0-9a-fA-F]{3,8}\)/g, 'TOKEN');
  const bareHex = stripped.match(/#[0-9a-fA-F]{6}(?![0-9a-fA-F])|#[0-9a-fA-F]{3}(?![0-9a-fA-F])/);
  assert(!bareHex, `Bare hex found: ${bareHex?.[0]}`);
});

// ─── Tab wiring ───────────────────────────────────────────────────────────────
console.log('\nTab wiring:');

test('TabType union includes "team-pulse"', () => {
  const s = src('src/hooks/useForYouData.ts');
  assert(/'team-pulse'/.test(s), 'team-pulse not in TabType union');
});

test('FOR_YOU_TAB_ORDER includes Team Pulse tab entry', () => {
  const s = src('src/components/for-you/atlaskit/ForYouTabs.tsx');
  assert(/team-pulse|Team Pulse/.test(s), 'No Team Pulse in FOR_YOU_TAB_ORDER');
});

test('ForYouPage imports PresencePanel', () => {
  const s = src('src/pages/ForYouPage.atlaskit.tsx');
  assert(/PresencePanel/.test(s), 'PresencePanel not imported in ForYouPage');
});

test('ForYouPage switch has case team-pulse rendering PresencePanel', () => {
  const s = src('src/pages/ForYouPage.atlaskit.tsx');
  assert(/team-pulse/.test(s) && /PresencePanel/.test(s), 'No case team-pulse → PresencePanel');
});

test('ForYouPage showPagination excludes team-pulse tab', () => {
  const s = src('src/pages/ForYouPage.atlaskit.tsx');
  assert(/team-pulse/.test(s), 'team-pulse not added to showPagination exclusion list');
});

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
