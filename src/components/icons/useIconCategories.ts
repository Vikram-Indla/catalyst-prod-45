/**
 * useIconCategories — RESET ICONS dynamic category fetch.
 *
 * Reads `catalyst_icon_categories` so the /admin/icons page can render
 * one tab per dynamic category beyond the bundled trio. Each row has:
 *   { name, label, description?, sort_order }
 *
 * Returns an empty list on first run before the migration ships, so the
 * page degrades gracefully when the table doesn't exist yet.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface IconCategoryRow {
  id: string;
  name: string;
  label: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

async function fetchCategories(): Promise<IconCategoryRow[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from as any)('catalyst_icon_categories')
    .select('id, name, label, description, sort_order, created_at, updated_at')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error || !Array.isArray(data)) return [];
  return data as IconCategoryRow[];
}

export function useIconCategories() {
  return useQuery({
    queryKey: ['icon-categories'],
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: false,
    placeholderData: [],
  });
}
