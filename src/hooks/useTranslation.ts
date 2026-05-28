/**
 * useTranslation — cache-first translation hook.
 *
 * Flow:
 *   1. Compute sha256 of source text.
 *   2. Look up ph_issue_translations for (issueKey, field, targetLang, sourceHash).
 *      → cache HIT: return translated_text immediately, no API call.
 *   3. Cache MISS: call `ai-translate-title` edge function.
 *   4. Upsert result into ph_issue_translations for future cache hits.
 *
 * The source_hash ensures stale entries are never served — if the source
 * text changes the hash changes, so the old row is bypassed and a fresh
 * translation is requested and stored (overwriting the old row via UPSERT).
 *
 * When issueKey is omitted (empty string), the cache is skipped entirely
 * and every call hits the edge function. This is the fallback for surfaces
 * that don't have a canonical issue key (e.g. create forms).
 */
import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fetchFunction } from '@/integrations/supabase/functionsRouter';
import { containsArabic } from '@/lib/detectArabic';

async function sha256hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export interface TranslateOptions {
  /** Jira issue key (e.g. "BAU-5510"). Pass '' to skip caching. */
  issueKey: string;
  /** Which field: 'summary' | 'description' | 'comment:<id>' */
  field: string;
  /** Target language. */
  target: 'ar' | 'en';
}

export interface UseTranslationResult {
  /**
   * Translate `text` to `opts.target`, using the cache if a matching
   * (issueKey, field, targetLang, sourceHash) row exists.
   * Returns the translated string or null on failure.
   */
  translate: (text: string, opts: TranslateOptions) => Promise<string | null>;
  isTranslating: boolean;
}

export function useTranslation(): UseTranslationResult {
  const [isTranslating, setIsTranslating] = useState(false);

  const translate = useCallback(
    async (
      text: string,
      { issueKey, field, target }: TranslateOptions,
    ): Promise<string | null> => {
      const trimmed = text.trim();
      if (!trimmed) return null;

      const hash = await sha256hex(trimmed);

      // ── 1. Cache lookup ───────────────────────────────────────────────────
      if (issueKey) {
        const { data: cached } = await supabase
          .from('ph_issue_translations')
          .select('translated_text')
          .eq('issue_key', issueKey)
          .eq('field', field)
          .eq('target_lang', target)
          .eq('source_hash', hash)
          .maybeSingle();

        if (cached?.translated_text) return cached.translated_text;
      }

      // ── 2. Edge function ──────────────────────────────────────────────────
      setIsTranslating(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token ?? null;

        // Route to the right edge function:
        // - 'summary' → ai-translate-title (title-tuned prompt, 400 tokens)
        // - everything else → ai-translate-field (prose-preserving, 4000 tokens)
        const edgeFn = field === 'summary' ? 'ai-translate-title' : 'ai-translate-field';
        const res = await fetchFunction(edgeFn, {
          method: 'POST',
          accessToken,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: trimmed, target }),
        });

        if (!res.ok) return null;

        const json = (await res.json()) as { translated?: string };
        const translated = json.translated?.trim();
        if (!translated) return null;

        // ── 3. Upsert cache ───────────────────────────────────────────────
        if (issueKey) {
          const sourceLang: 'ar' | 'en' = containsArabic(trimmed) ? 'ar' : 'en';
          supabase
            .from('ph_issue_translations')
            .upsert(
              {
                issue_key: issueKey,
                field,
                source_lang: sourceLang,
                target_lang: target,
                source_hash: hash,
                translated_text: translated,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'issue_key,field,target_lang' },
            )
            .then(() => {
              /* fire-and-forget — cache write never blocks the UI */
            });
        }

        return translated;
      } finally {
        setIsTranslating(false);
      }
    },
    [],
  );

  return { translate, isTranslating };
}
