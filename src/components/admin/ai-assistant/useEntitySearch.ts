import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface EntitySuggestion {
  type: 'person' | 'role' | 'department';
  label: string;
  subtitle: string;
  insert: string;
}

// Debounced entity search across profiles, roles, and departments.
// Triggers when the last word in `text` is ≥ 2 chars.
// No approval_status filter — admin tool must see all non-deleted users including owners/admins.
export function useEntitySearch(text: string): EntitySuggestion[] {
  const [suggestions, setSuggestions] = useState<EntitySuggestion[]>([]);

  useEffect(() => {
    const words = text.trim().split(/\s+/);
    const fragment = words[words.length - 1];
    if (!fragment || fragment.length < 2) { setSuggestions([]); return; }

    let cancelled = false;
    const timer = setTimeout(async () => {
      const q = fragment.toLowerCase();
      const [{ data: people }, { data: roles }, { data: depts }] = await Promise.all([
        supabase
          .from('profiles')
          .select('full_name, email')
          .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
          .limit(5),
        supabase
          .from('product_roles')
          .select('name, code')
          .ilike('name', `%${q}%`)
          .eq('is_active', true)
          .limit(3),
        supabase
          .from('departments')
          .select('name')
          .ilike('name', `%${q}%`)
          .limit(2),
      ]);
      if (cancelled) return;
      setSuggestions([
        ...(people ?? []).map((p: { full_name: string | null; email: string | null }) => ({
          type: 'person' as const,
          label: p.full_name ?? p.email ?? '',
          subtitle: p.email ?? '',
          insert: p.full_name ?? p.email ?? '',
        })),
        ...(roles ?? []).map((r: { name: string; code: string }) => ({
          type: 'role' as const,
          label: r.name,
          subtitle: r.code ?? '',
          insert: r.name,
        })),
        ...(depts ?? []).map((d: { name: string }) => ({
          type: 'department' as const,
          label: d.name,
          subtitle: 'department',
          insert: d.name,
        })),
      ]);
    }, 250);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [text]);

  return suggestions;
}
