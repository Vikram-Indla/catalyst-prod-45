/**
 * CatyFlow personal dictionary (CAT-VOICE-FLOW-20260704-001).
 *
 * Two jobs:
 *  1. feed — active terms bias the realtime ASR vocabulary and the
 *     cleanup prompt (both layers, like Wispr).
 *  2. learn — after a dictation commits, a type-over correction of a
 *     single word (respelling, proper-noun-shaped) becomes a candidate;
 *     two independent occurrences activate it. Wholesale rewrites are
 *     never learned.
 */
import { supabase } from '@/integrations/supabase/client';

const db = supabase as unknown as { from: (t: string) => any };

const MAX_TERMS_FED = 80;
const CACHE_TTL_MS = 5 * 60_000;

let cache: { userId: string; terms: string[]; at: number } | null = null;
let workspaceCache: { terms: string[]; at: number } | null = null;
let projectKeysCache: { keys: string[]; at: number } | null = null;

/** Known project keys (CAT, BAU, …) — drives deterministic ticket-key
 *  normalization (CAT-DICTATION-INTELLIGENCE-20260708-001 S1). */
export async function getProjectKeys(): Promise<string[]> {
  if (projectKeysCache && Date.now() - projectKeysCache.at < CACHE_TTL_MS) {
    return projectKeysCache.keys;
  }
  let keys: string[] = [];
  try {
    const { data } = await db.from('projects').select('key').limit(200);
    keys = ((data ?? []) as Array<{ key?: string | null }>)
      .map((p) => p.key?.trim())
      .filter((k): k is string => !!k);
  } catch {
    /* best-effort */
  }
  projectKeysCache = { keys, at: Date.now() };
  return keys;
}

/** Workspace proper nouns the ASR keeps mishearing: teammate names and
 *  project keys/names (CAT-VOICE-UX-PREMIUM-20260708-001 S6b AD-7). These
 *  bias both the Gemini Live vocabulary and the cleanup prompt, same as
 *  personal terms. Ranked AFTER personal terms so truncation drops the
 *  generic tail first. */
async function getWorkspaceTerms(): Promise<string[]> {
  if (workspaceCache && Date.now() - workspaceCache.at < CACHE_TTL_MS) {
    return workspaceCache.terms;
  }
  const terms: string[] = [];
  try {
    const [{ data: people }, { data: projects }] = await Promise.all([
      db.from('resource_inventory').select('name').limit(100),
      db.from('projects').select('key, name').limit(100),
    ]);
    for (const r of (people ?? []) as Array<{ name?: string | null }>) {
      if (r.name?.trim()) terms.push(r.name.trim());
    }
    for (const p of (projects ?? []) as Array<{ key?: string | null; name?: string | null }>) {
      if (p.key?.trim()) terms.push(p.key.trim());
      if (p.name?.trim()) terms.push(p.name.trim());
    }
  } catch {
    /* workspace vocabulary is best-effort — dictation never blocks on it */
  }
  workspaceCache = { terms, at: Date.now() };
  return terms;
}

export async function getActiveTerms(): Promise<string[]> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) return [];
  if (cache && cache.userId === userId && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.terms;
  }
  const { data } = await db
    .from('dictation_dictionary')
    .select('term')
    .eq('user_id', userId)
    .eq('active', true)
    .order('occurrences', { ascending: false })
    .limit(MAX_TERMS_FED);
  const personal = ((data ?? []) as Array<{ term: string }>).map((r) => r.term);
  const workspace = await getWorkspaceTerms();
  // Personal first (learned corrections are highest-signal), de-duped, capped.
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const t of [...personal, ...workspace]) {
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    terms.push(t);
    if (terms.length >= MAX_TERMS_FED) break;
  }
  cache = { userId, terms, at: Date.now() };
  return terms;
}

export function invalidateTermCache(): void {
  cache = null;
}

// ---------------------------------------------------------------------------
// Learning
// ---------------------------------------------------------------------------

const WORD_RE = /[\p{L}\p{N}'’-]+/gu;
const COMMON_WORDS = new Set([
  'the', 'and', 'for', 'that', 'this', 'with', 'from', 'have', 'will',
  'been', 'were', 'they', 'their', 'there', 'about', 'which', 'would',
]);

function words(text: string): string[] {
  return text.match(WORD_RE) ?? [];
}

function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[a.length][b.length];
}

/** Proper-noun / jargon shape: capitalized, camelCase, or has digits/dashes. */
function looksLikeTerm(w: string): boolean {
  if (w.length < 3 || COMMON_WORDS.has(w.toLowerCase())) return false;
  return /^[A-Z؀-ۿ]/.test(w) || /[a-z][A-Z]/.test(w) || /[\d-]/.test(w);
}

export interface LearnResult {
  learned: string[];
}

/**
 * Diff what CatyFlow inserted against what the user left in the field.
 * Word-aligned positional compare; a replaced pair within 40% edit
 * distance whose replacement is term-shaped becomes a candidate.
 */
export async function learnFromCorrection(committed: string, current: string): Promise<LearnResult> {
  const a = words(committed);
  const b = words(current);
  if (!a.length || !b.length) return { learned: [] };
  // Wholesale rewrite guard: >30% of words changed → not corrections.
  const changedRatio = Math.abs(a.length - b.length) / Math.max(a.length, 1);
  if (changedRatio > 0.3) return { learned: [] };

  const candidates: Array<{ term: string; misheard: string }> = [];
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const orig = a[i];
    const repl = b[i];
    if (orig === repl) continue;
    if (orig.toLowerCase() === repl.toLowerCase()) continue;
    const dist = editDistance(orig.toLowerCase(), repl.toLowerCase());
    if (dist === 0 || dist > Math.ceil(repl.length * 0.4)) continue;
    if (!looksLikeTerm(repl)) continue;
    candidates.push({ term: repl, misheard: orig });
  }
  if (!candidates.length) return { learned: [] };

  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) return { learned: [] };

  const learned: string[] = [];
  for (const c of candidates.slice(0, 5)) {
    const { data: existing } = await db
      .from('dictation_dictionary')
      .select('id, occurrences, misheard_as')
      .eq('user_id', userId)
      .eq('term', c.term)
      .maybeSingle();
    if (existing) {
      const occurrences = (existing.occurrences ?? 1) + 1;
      const misheard: string[] = Array.from(new Set([...(existing.misheard_as ?? []), c.misheard]));
      await db
        .from('dictation_dictionary')
        .update({ occurrences, misheard_as: misheard, active: occurrences >= 2, last_used_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (occurrences >= 2) learned.push(c.term);
    } else {
      await db.from('dictation_dictionary').insert({
        user_id: userId,
        term: c.term,
        misheard_as: [c.misheard],
        source: 'learned',
        occurrences: 1,
        active: false,
      });
    }
  }
  if (learned.length) invalidateTermCache();
  return { learned };
}

/** Normalized edit distance (0 = identical, 1 = fully rewritten), capped
 *  input length so pathological fields can't stall the UI thread. */
function editRatio(a: string, b: string): number {
  const x = a.slice(0, 2000);
  const y = b.slice(0, 2000);
  const max = Math.max(x.length, y.length);
  if (max === 0) return 0;
  return Math.min(1, editDistance(x, y) / max);
}

/**
 * Arm a one-shot learner on the field CatyFlow just committed into:
 * snapshots the field's value now, then on blur (or after 45s) diffs
 * against what the user left — learning respelled terms AND logging the
 * edit ratio to the session row (S3 quality flywheel: accuracy becomes a
 * measurable per-user, per-language trend instead of an anecdote).
 */
export function armCorrectionLearner(target: Element, sessionId?: string | null): void {
  const el = target as HTMLInputElement | HTMLTextAreaElement | HTMLElement;
  const readValue = () =>
    'value' in el && typeof el.value === 'string' ? el.value : (el.textContent ?? '');
  const committedText = readValue();
  if (!committedText.trim()) return;

  let done = false;
  const fire = () => {
    if (done) return;
    done = true;
    el.removeEventListener('blur', fire, true);
    const current = readValue();
    if (!current) return;
    if (sessionId) {
      const ratio = Math.round(editRatio(committedText, current) * 1000) / 1000;
      void db
        .from('voice_dictation_sessions')
        .update({ edit_ratio: ratio })
        .eq('id', sessionId)
        .then(() => {}, () => {});
    }
    if (current !== committedText) {
      void learnFromCorrection(committedText, current).catch(() => {});
    }
  };
  el.addEventListener('blur', fire, { capture: true, once: true });
  setTimeout(fire, 45_000);
}
