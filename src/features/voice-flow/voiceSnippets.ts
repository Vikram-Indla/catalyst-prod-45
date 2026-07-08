/**
 * voiceSnippets — user voice-triggered text expansions
 * (CAT-DICTATION-INTELLIGENCE-20260708-001 S2/S4, Wispr "shortcuts" parity).
 *
 * Saying "insert <trigger>" during dictation swaps in the expansion
 * (structureText applies them). Stored in user_preferences scope
 * 'voice_snippets' as { snippets: [{trigger, expansion}] }. Module-cached
 * like dictionary.ts — callers run outside React.
 */
import { supabase } from '@/integrations/supabase/client';
import type { Snippet } from './structureText';

const SCOPE = 'voice_snippets';
const CACHE_TTL_MS = 5 * 60_000;

let cache: { userId: string; snippets: Snippet[]; at: number } | null = null;

export async function getVoiceSnippets(): Promise<Snippet[]> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) return [];
  if (cache && cache.userId === userId && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.snippets;
  }
  let snippets: Snippet[] = [];
  try {
    const { data } = await supabase
      .from('user_preferences' as never)
      .select('value')
      .eq('user_id' as never, userId as never)
      .eq('scope' as never, SCOPE as never)
      .maybeSingle();
    const raw = (data as { value?: { snippets?: unknown } } | null)?.value?.snippets;
    if (Array.isArray(raw)) {
      snippets = raw.filter(
        (s): s is Snippet =>
          !!s && typeof (s as Snippet).trigger === 'string' && typeof (s as Snippet).expansion === 'string',
      );
    }
  } catch { /* best-effort */ }
  cache = { userId, snippets, at: Date.now() };
  return snippets;
}

export async function saveVoiceSnippets(snippets: Snippet[]): Promise<boolean> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) return false;
  const { error } = await supabase
    .from('user_preferences' as never)
    .upsert(
      { user_id: userId, scope: SCOPE, value: { snippets } } as never,
      { onConflict: 'user_id,scope' },
    );
  if (!error) cache = { userId, snippets, at: Date.now() };
  return !error;
}

export function invalidateSnippetCache(): void {
  cache = null;
}
