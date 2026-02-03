import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { T10Item } from '../types';

interface DbT10Item {
  id: string;
  week_id: string;
  rank: number;
  title: string;
  taskhub_key: string | null;
  assignee_id: string | null;
  due_date: string | null;
  description: string | null;
  status: string;
  carryover_count: number;
  is_buffer: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface DbT10ItemWithProfile extends DbT10Item {
  assignee?: { id: string; full_name: string | null } | null;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function mapDbToT10Item(db: DbT10ItemWithProfile): T10Item {
  const assigneeName = db.assignee?.full_name || undefined;
  return {
    id: db.id,
    week_id: db.week_id,
    rank: db.rank,
    title: db.title,
    taskhub_key: db.taskhub_key || undefined,
    assignee_id: db.assignee_id || undefined,
    assignee_name: assigneeName,
    assignee_initials: getInitials(assigneeName),
    due_date: db.due_date || undefined,
    label: undefined, // Labels are now in a separate junction table
    description: db.description || undefined,
    status: db.status as 'todo' | 'done',
    carryover_count: db.carryover_count,
    created_at: db.created_at,
    updated_at: db.updated_at,
  };
}

export function useT10Items(weekId: string | undefined) {
  return useQuery({
    queryKey: ['t10-items', weekId],
    queryFn: async () => {
      if (!weekId) return [];
      const { data, error } = await supabase
        .from('t10_items')
        .select('*')
        .eq('week_id', weekId)
        .order('rank', { ascending: true })
        .limit(100);

      if (error) throw new Error(error.message);
      return (data || []).map((row) => {
        const dbRow: DbT10ItemWithProfile = {
          id: row.id,
          week_id: row.week_id,
          rank: row.rank,
          title: row.title,
          taskhub_key: row.taskhub_key,
          assignee_id: row.assignee_id,
          due_date: row.due_date,
          description: row.description,
          status: row.status,
          carryover_count: row.carryover_count,
          is_buffer: row.is_buffer,
          created_by: row.created_by,
          created_at: row.created_at,
          updated_at: row.updated_at,
          assignee: null, // Will fetch separately if needed
        };
        return mapDbToT10Item(dbRow);
      });
    },
    enabled: !!weekId,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useCreateT10Item() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: {
      weekId: string;
      title: string;
      rank: number;
      taskhubKey?: string;
      assigneeId?: string;
      dueDate?: string;
      label?: string;
      description?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('t10_items')
        .insert({
          week_id: item.weekId,
          title: item.title,
          rank: item.rank,
          taskhub_key: item.taskhubKey || null,
          assignee_id: item.assigneeId || null,
          due_date: item.dueDate || null,
          description: item.description || null,
          status: 'todo',
          carryover_count: 0,
          is_buffer: item.rank > 10,
          created_by: user.user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      
      const dbRow: DbT10ItemWithProfile = {
        ...data,
        assignee: null,
      };
      return mapDbToT10Item(dbRow);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['t10-items', variables.weekId] });
    },
  });
}

export function useUpdateT10Item() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      itemId, 
      updates 
    }: { 
      itemId: string; 
      updates: Partial<{
        title: string;
        rank: number;
        taskhubKey: string;
        assigneeId: string;
        dueDate: string;
        label: string;
        description: string;
        status: 'todo' | 'done';
      }>;
    }) => {
      const dbUpdates: Record<string, unknown> = {};

      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.rank !== undefined) {
        dbUpdates.rank = updates.rank;
        dbUpdates.is_buffer = updates.rank > 10;
      }
      if (updates.taskhubKey !== undefined) dbUpdates.taskhub_key = updates.taskhubKey || null;
      if (updates.assigneeId !== undefined) dbUpdates.assignee_id = updates.assigneeId || null;
      if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate || null;
      if (updates.description !== undefined) dbUpdates.description = updates.description || null;
      if (updates.status !== undefined) dbUpdates.status = updates.status;

      const { data, error } = await supabase
        .from('t10_items')
        .update(dbUpdates)
        .eq('id', itemId)
        .select()
        .single();

      if (error) throw error;
      
      const dbRow: DbT10ItemWithProfile = {
        ...data,
        assignee: null,
      };
      return mapDbToT10Item(dbRow);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['t10-items', data.week_id] });
    },
  });
}

export function useDeleteT10Item() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, weekId }: { itemId: string; weekId: string }) => {
      const { error } = await supabase
        .from('t10_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      return weekId;
    },
    onSuccess: (weekId) => {
      queryClient.invalidateQueries({ queryKey: ['t10-items', weekId] });
    },
  });
}

export function useBulkUpdateT10Items() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      updates 
    }: { 
      updates: Array<{ id: string; rank?: number; status?: 'todo' | 'done' }>;
    }) => {
      const promises = updates.map(async (update) => {
        const dbUpdates: Record<string, unknown> = {};
        if (update.rank !== undefined) {
          dbUpdates.rank = update.rank;
          dbUpdates.is_buffer = update.rank > 10;
        }
        if (update.status !== undefined) dbUpdates.status = update.status;

        const { error } = await supabase
          .from('t10_items')
          .update(dbUpdates)
          .eq('id', update.id);

        if (error) throw error;
      });

      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['t10-items'] });
    },
  });
}

export function useCarryoverT10Items() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      sourceItems,
      targetWeekId,
    }: { 
      sourceItems: T10Item[];
      targetWeekId: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();

      const newItems = sourceItems.map((item, idx) => ({
        week_id: targetWeekId,
        title: item.title,
        rank: idx + 1,
        taskhub_key: item.taskhub_key || null,
        assignee_id: item.assignee_id || null,
        due_date: item.due_date || null,
        description: item.description || null,
        status: 'todo',
        carryover_count: item.carryover_count + 1,
        is_buffer: (idx + 1) > 10,
        created_by: user.user?.id || null,
      }));

      const { data, error } = await supabase
        .from('t10_items')
        .insert(newItems)
        .select();

      if (error) throw error;
      return (data || []).map((row) => {
        const dbRow: DbT10ItemWithProfile = {
          ...row,
          assignee: null,
        };
        return mapDbToT10Item(dbRow);
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['t10-items', variables.targetWeekId] });
    },
  });
}
