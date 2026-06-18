/**
 * useMyScheduledCount — total pending scheduled-send count for the
 * current user. Backs the rail badge on the Drafts & sent entry.
 *
 * Pending = scheduled_for IS NOT NULL AND delivered_at IS NULL.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const db = supabase as unknown as { from: (t: string) => any };

export function useMyScheduledCount(): number {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { data } = useQuery<number>({
    queryKey: ['chat-v2', 'my-scheduled-count', userId],
    queryFn: async () => {
      if (!userId) return 0;
      const { count, error } = await db
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('author_id', userId)
        .not('scheduled_for', 'is', null)
        .is('delivered_at', null);
      if (error) {
        console.warn('[chat-v2] my-scheduled-count failed', error);
        return 0;
      }
      return typeof count === 'number' ? count : 0;
    },
    enabled: !!userId,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  return data ?? 0;
}
