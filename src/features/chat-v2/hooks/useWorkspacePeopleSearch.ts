/**
 * useWorkspacePeopleSearch — type-ahead people search backed by the
 * profiles table. Matches against full_name (case-insensitive) and
 * returns at most TOP_N profiles. Used by WorkspaceSearchModal to render
 * the "people" section above the message preview.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const db = supabase as unknown as { from: (t: string) => any };

export interface PeopleHit {
  id: string;
  name: string;
  avatarUrl: string | null;
  /** Secondary descriptor — currently the full_name again, kept for parity
   *  with Slack's "Display name · Full name" two-token row. Easy to wire to
   *  a real display_name column later. */
  subName: string | null;
}

const TOP_N = 5;

export function useWorkspacePeopleSearch(query: string): {
  hits: PeopleHit[];
  isLoading: boolean;
} {
  const trimmed = query.trim();
  const { data, isLoading } = useQuery({
    queryKey: ['chat-v2', 'people-search', trimmed],
    enabled: trimmed.length > 0,
    queryFn: async (): Promise<PeopleHit[]> => {
      const pattern = `%${trimmed.replace(/[%_]/g, m => `\\${m}`)}%`;
      const { data: rows, error } = await db
        .from('profiles')
        .select('id, full_name, avatar_url')
        .ilike('full_name', pattern)
        .order('full_name', { ascending: true })
        .limit(TOP_N);
      if (error || !rows) return [];
      const profiles = rows as Array<{ id: string; full_name: string | null; avatar_url: string | null }>;
      return profiles
        .filter(p => !!p.full_name)
        .map<PeopleHit>(p => ({
          id: p.id,
          name: p.full_name ?? 'Someone',
          avatarUrl: p.avatar_url,
          subName: p.full_name,
        }));
    },
    staleTime: 30_000,
  });

  return { hits: data ?? [], isLoading };
}
