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
  const terms = ((data ?? []) as Array<{ term: string }>).map((r) => r.term);
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

/**
 * Arm a one-shot learner on the field CatyFlow just committed into:
 * snapshots the field's value now, then on blur (or after 45s) diffs
 * against what the user left and learns respelled terms.
 */
export function armCorrectionLearner(target: Element): void {
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
    if (current && current !== committedText) {
      void learnFromCorrection(committedText, current).catch(() => {});
    }
  };
  el.addEventListener('blur', fire, { capture: true, once: true });
  setTimeout(fire, 45_000);
}
