/**
 * useBrTranslate — calls the `ai-improve-story` Supabase edge function
 * with `improve_type: 'translate_text'` to translate a string in either
 * direction. Returns `{ translate, translating }` where `translating` is
 * the active direction (or null) so the caller can show a per-button
 * spinner.
 *
 * Lifted from CreateBusinessRequestModal in cycle 2 so the View modal can
 * reuse the same translation hook.
 */
import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type TranslationDirection = 'en_to_ar' | 'ar_to_en';

export function useBrTranslate() {
  const [translating, setTranslating] = useState<TranslationDirection | null>(null);

  const translate = useCallback(
    async (text: string, direction: TranslationDirection): Promise<string | null> => {
      if (!text.trim()) return null;
      setTranslating(direction);
      try {
        const { data, error } = await supabase.functions.invoke('ai-improve-story', {
          body: { improve_type: 'translate_text', text: text.trim(), direction },
        });
        if (error || !data?.translation) return null;
        return (data.translation as string).trim();
      } catch (e) {
        console.error('Translation failed:', e);
        return null;
      } finally {
        setTranslating(null);
      }
    },
    [],
  );

  return { translate, translating };
}

export default useBrTranslate;
