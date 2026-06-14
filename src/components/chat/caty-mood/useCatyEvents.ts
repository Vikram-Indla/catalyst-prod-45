/**
 * useCatyEvents — the SIGNAL layer. Reads the current user's recent notifications and
 * maps them to Caty events. Unseen (read_at null) drives the gesture + count; opening
 * the notification clears it elsewhere (read_at set), so Caty goes quiet — the
 * acknowledge-to-clear model, reusing existing infra (no new table).
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  classifyEvent,
  refineKind,
  summarizeUnseen,
  unseenCount,
  type CatyEvent,
} from './catyEvents';

const WINDOW_DAYS = 7;

function sevenDaysAgoISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - WINDOW_DAYS);
  return d.toISOString();
}

export function useCatyEvents() {
  const { user } = useAuth();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['caty-events', user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    refetchInterval: 60_000,
    queryFn: async (): Promise<CatyEvent[]> => {
      const { data, error } = await supabase
        .from('notifications')
        .select(
          'id, notification_type, entity_key, entity_title, entity_icon_type, read_at, created_at, metadata',
        )
        .eq('recipient_user_id', user!.id)
        .eq('is_dismissed', false)
        .gte('created_at', sevenDaysAgoISO())
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;

      return (data ?? []).map((r) => {
        const meta = (r.metadata ?? {}) as Record<string, unknown>;
        const base = classifyEvent(r.notification_type);
        return {
          id: r.id as string,
          kind: refineKind(base, (r.entity_icon_type as string | null) ?? null),
          entityKey: (r.entity_key as string | null) ?? null,
          entityTitle: (r.entity_title as string | null) ?? null,
          actorName: (meta.actor_name as string | null) ?? null,
          createdAt: r.created_at as string,
          seen: r.read_at != null,
        };
      });
    },
  });

  return {
    events,
    unseenCount: unseenCount(events),
    byKind: summarizeUnseen(events),
    isLoading,
  };
}
