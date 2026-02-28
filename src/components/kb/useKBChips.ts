import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Lang = 'en' | 'ar';

export function useKBChips(lang: Lang) {
  const [chips, setChips] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadChips() {
      try {
        const { data: categories } = await supabase
          .from('kb_training_questions')
          .select('category')
          .limit(500);

        if (!categories || cancelled) return;

        // Count by category, pick top 4
        const counts: Record<string, number> = {};
        for (const c of categories) {
          counts[c.category] = (counts[c.category] || 0) + 1;
        }
        const topCategories = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .map(([cat]) => cat);

        // Get one sample question per category
        const result: string[] = [];
        for (const cat of topCategories) {
          const { data: sample } = await supabase
            .from('kb_training_questions')
            .select('question')
            .eq('category', cat)
            .limit(1)
            .single();

          if (sample && !cancelled) {
            const q = sample.question.length > 35
              ? sample.question.substring(0, 32) + '...'
              : sample.question;
            result.push(q);
          }
        }

        if (!cancelled && result.length > 0) setChips(result);
      } catch {
        // Fail silently — no chips shown
      }
    }

    loadChips();
    return () => { cancelled = true; };
  }, [lang]);

  return chips;
}
