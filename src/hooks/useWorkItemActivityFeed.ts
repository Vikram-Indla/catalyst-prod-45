import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';

interface ActivityLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_id: string | null;
  before_json: any;
  after_json: any;
  created_at: string;
}

interface FormattedActivity {
  id: string;
  action: string;
  description: string;
  timestamp: string;
  relativeTime: string;
  actorId: string | null;
  changes: { field: string; from: any; to: any }[];
}

function formatAction(action: string): string {
  switch (action) {
    case 'INSERT': return 'created';
    case 'UPDATE': return 'updated';
    case 'DELETE': return 'deleted';
    default: return action.toLowerCase();
  }
}

function detectChanges(before: any, after: any): { field: string; from: any; to: any }[] {
  if (!before || !after) return [];
  
  const changes: { field: string; from: any; to: any }[] = [];
  const ignoredFields = ['id', 'created_at', 'updated_at'];
  
  Object.keys(after).forEach(key => {
    if (ignoredFields.includes(key)) return;
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changes.push({
        field: key.replace(/_/g, ' '),
        from: before[key],
        to: after[key]
      });
    }
  });
  
  return changes;
}

export function useWorkItemActivityFeed(entityType: string, entityId: string) {
  const queryClient = useQueryClient();

  // Fetch activity logs
  const { data: activities, isLoading } = useQuery({
    queryKey: ['activity-feed', entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      
      return (data as ActivityLog[]).map(log => ({
        id: log.id,
        action: formatAction(log.action),
        description: `${formatAction(log.action)} this ${entityType.replace(/_/g, ' ').replace(/s$/, '')}`,
        timestamp: log.created_at,
        relativeTime: formatDistanceToNow(new Date(log.created_at), { addSuffix: true }),
        actorId: log.actor_id,
        changes: detectChanges(log.before_json, log.after_json)
      })) as FormattedActivity[];
    },
    enabled: !!entityId,
  });

  // Subscribe to realtime changes
  useEffect(() => {
    if (!entityId) return;

    const channel = supabase
      .channel(`activity-${entityType}-${entityId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs',
          filter: `entity_id=eq.${entityId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['activity-feed', entityType, entityId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [entityType, entityId, queryClient]);

  return {
    activities: activities || [],
    isLoading,
  };
}
