/**
 * useCardDesigns — bulk-fetch ph_designs rows for every issue currently
 * rendered on the board so <Card> can show the design (Figma) brush icon
 * without firing one query per card.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CardDesignRow {
  id: string;
  work_item_id: string;
  url: string;
  updated_at: string;
}

export function useCardDesigns(issueIds: string[]) {
  const idsKey = issueIds.slice().sort().join(',');
  return useQuery({
    queryKey: ['kb-card-designs', idsKey],
    enabled: issueIds.length > 0,
    staleTime: 30_000,
    queryFn: async (): Promise<Map<string, CardDesignRow[]>> => {
      const { data, error } = await (supabase as any)
        .from('ph_designs')
        .select('id, work_item_id, url, updated_at')
        .in('work_item_id', issueIds)
        .order('updated_at', { ascending: false });
      if (error) return new Map();
      const map = new Map<string, CardDesignRow[]>();
      for (const r of (data ?? []) as CardDesignRow[]) {
        const bucket = map.get(r.work_item_id) ?? [];
        bucket.push(r);
        map.set(r.work_item_id, bucket);
      }
      return map;
    },
  });
}

/** Extract a display name from a Figma URL.
 *   https://www.figma.com/file/<key>/My-Awesome-File?node-id=…   → "My Awesome File"
 *   https://www.figma.com/design/<key>/Another-File               → "Another File"
 *   any figma.com URL without an extractable name                 → "Figma Design"
 *   a non-figma URL                                              → its hostname */
export function figmaFileName(url: string): string {
  try {
    const u = new URL(url);
    const isFigma = /(^|\.)figma\.com$/i.test(u.hostname);
    const parts = u.pathname.split('/').filter(Boolean);
    // /file/<key>/<name> or /design/<key>/<name> or /proto/<key>/<name>
    if (parts.length >= 3) {
      const raw = decodeURIComponent(parts[2]).replace(/[-_]+/g, ' ').trim();
      if (raw) return raw;
    }
    return isFigma ? 'Figma Design' : u.hostname;
  } catch {
    return 'Figma Design';
  }
}
