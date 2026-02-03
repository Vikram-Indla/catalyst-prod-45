import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { T10Activity } from '../types';

interface DbT10Activity {
  id: string;
  item_id: string;
  activity_type: string;
  performed_by: string | null;
  performed_at: string;
  metadata: Record<string, unknown> | null;
  actor?: { id: string; full_name: string | null } | null;
}

function mapDbToT10Activity(db: DbT10Activity): T10Activity {
  const actorName = db.actor?.full_name || 'System';
  const metadata = db.metadata as Record<string, string> || {};
  const description = metadata.description || getDefaultDescription(db.activity_type, metadata);
  
  return {
    id: db.id,
    item_id: db.item_id,
    type: db.activity_type as T10Activity['type'],
    description,
    actor_name: actorName,
    created_at: db.performed_at,
  };
}

function getDefaultDescription(type: string, metadata: Record<string, unknown>): string {
  switch (type) {
    case 'created': return 'Created this priority';
    case 'completed': return 'Marked as completed';
    case 'ranked': 
      const oldRank = metadata.oldRank;
      const newRank = metadata.newRank;
      return oldRank && newRank ? `Moved from rank #${oldRank} to #${newRank}` : 'Changed rank';
    case 'assigned': return metadata.assigneeName ? `Assigned to ${metadata.assigneeName}` : 'Updated assignee';
    case 'carried': return `Carried over to next week`;
    case 'updated': return metadata.field ? `Updated ${metadata.field}` : 'Updated item';
    default: return 'Updated item';
  }
}

export function useT10Activity(itemId: string | undefined) {
  return useQuery({
    queryKey: ['t10-activity', itemId],
    queryFn: async () => {
      if (!itemId) return [];
      const { data, error } = await supabase
        .from('t10_activity')
        .select(`
          *,
          actor:profiles!t10_activity_performed_by_fkey(id, full_name)
        `)
        .eq('item_id', itemId)
        .order('performed_at', { ascending: false });

      if (error) throw new Error(error.message);
      return (data || []).map((row) => mapDbToT10Activity(row as unknown as DbT10Activity));
    },
    enabled: !!itemId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useLogT10Activity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      type,
      description,
      metadata,
    }: {
      itemId: string;
      type: T10Activity['type'];
      description: string;
      metadata?: Record<string, unknown>;
    }) => {
      const { data: user } = await supabase.auth.getUser();

      const activityMetadata = {
        ...metadata,
        description,
      };

      const { data, error } = await supabase
        .from('t10_activity')
        .insert({
          item_id: itemId,
          activity_type: type,
          performed_by: user.user?.id || null,
          metadata: activityMetadata,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['t10-activity', variables.itemId] });
    },
  });
}

// Helper to log activity when item changes
export function useT10ActivityLogger() {
  const logActivity = useLogT10Activity();

  return {
    logCreated: (itemId: string, title: string) => 
      logActivity.mutateAsync({
        itemId,
        type: 'created',
        description: `Created "${title}"`,
      }),
    logCompleted: (itemId: string, title: string) =>
      logActivity.mutateAsync({
        itemId,
        type: 'completed',
        description: `Marked "${title}" as completed`,
      }),
    logRanked: (itemId: string, oldRank: number, newRank: number) =>
      logActivity.mutateAsync({
        itemId,
        type: 'ranked',
        description: `Moved from rank #${oldRank} to #${newRank}`,
        metadata: { oldRank, newRank },
      }),
    logAssigned: (itemId: string, assigneeName: string) =>
      logActivity.mutateAsync({
        itemId,
        type: 'assigned',
        description: assigneeName ? `Assigned to ${assigneeName}` : 'Unassigned',
        metadata: { assigneeName },
      }),
    logCarried: (itemId: string, count: number) =>
      logActivity.mutateAsync({
        itemId,
        type: 'carried',
        description: `Carried over to next week (×${count})`,
        metadata: { carryoverCount: count },
      }),
    logUpdated: (itemId: string, field: string) =>
      logActivity.mutateAsync({
        itemId,
        type: 'updated',
        description: `Updated ${field}`,
        metadata: { field },
      }),
  };
}
