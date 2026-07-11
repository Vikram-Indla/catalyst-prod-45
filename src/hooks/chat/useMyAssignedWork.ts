/**
 * useMyAssignedWork — work items assigned to the current user, for the dock's
 * "Assigned to you" (More tab) detail. Lean read: key/title + type + status,
 * newest activity first. Part of CAT-CHAT-DOCK-SLACK-20260709-001.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const db = supabase as unknown as { from: (t: string) => any };

export interface MyAssignedItem {
  id: string;
  itemKey: string;
  title: string;
  typeName: string;
  statusName: string | null;
  statusCategory: string | null;
}

export function useMyAssignedWork() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const { data, isLoading } = useQuery({
    queryKey: ['chat', 'my-assigned-work', userId],
    enabled: !!userId,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<MyAssignedItem[]> => {
      if (!userId) return [];
      const { data, error } = await db
        .from('ph_work_items')
        .select(
          'id, item_key, title, item_type, status_changed_at, ph_work_types!ph_work_items_type_id_fkey (name), ph_workflow_statuses!ph_work_items_status_id_fkey (name, category)',
        )
        .eq('assignee_id', userId)
        .order('status_changed_at', { ascending: false, nullsFirst: false })
        .limit(50);
      if (error || !data) return [];
      return (data as any[]).map((r) => ({
        id: r.id,
        itemKey: r.item_key,
        title: r.title,
        typeName: r.ph_work_types?.name ?? r.item_type ?? '',
        statusName: r.ph_workflow_statuses?.name ?? null,
        statusCategory: r.ph_workflow_statuses?.category ?? null,
      }));
    },
  });

  return { items: data ?? [], isLoading };
}
