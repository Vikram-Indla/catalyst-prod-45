// Aqd¹⁰ TanStack Query Hooks
// Executive Priority Management

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  AqdList,
  AqdItem,
  AqdWeek,
  AqdLabel,
  AqdItemNote,
  AqdItemHistory,
  AqdWeekPerformance,
  AqdItemStatus,
  CreateAqdListInput,
  CreateAqdItemInput,
  UpdateAqdItemInput,
  ReorderAqdItemsInput,
  CheckoutWeekInput,
} from '@/types/aqd';
import { getNextStatus } from '@/types/aqd';
import { toast } from 'sonner';

// Query Keys
export const aqdKeys = {
  all: ['aqd'] as const,
  lists: () => [...aqdKeys.all, 'lists'] as const,
  list: (id: string) => [...aqdKeys.all, 'list', id] as const,
  weeks: (listId: string) => [...aqdKeys.all, 'weeks', listId] as const,
  week: (weekId: string) => [...aqdKeys.all, 'week', weekId] as const,
  items: (weekId: string) => [...aqdKeys.all, 'items', weekId] as const,
  item: (itemId: string) => [...aqdKeys.all, 'item', itemId] as const,
  carryover: (weekId: string) => [...aqdKeys.all, 'carryover', weekId] as const,
  performance: (weekId: string) => [...aqdKeys.all, 'performance', weekId] as const,
  notes: (itemId: string) => [...aqdKeys.all, 'notes', itemId] as const,
  history: (itemId: string) => [...aqdKeys.all, 'history', itemId] as const,
  labels: (listId: string) => [...aqdKeys.all, 'labels', listId] as const,
  taskhubLookup: (key: string) => [...aqdKeys.all, 'taskhub', key] as const,
};

// ============ LIST HOOKS ============

export function useAqdLists() {
  return useQuery({
    queryKey: aqdKeys.lists(),
    queryFn: async (): Promise<AqdList[]> => {
      const { data, error } = await supabase
        .from('aqd_lists_summary')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('updated_at', { ascending: false });

      if (error) throw new Error(error.message);
      return (data || []).map(row => ({
        id: row.id,
        name: row.name,
        description: row.description ?? undefined,
        created_by: row.created_by ?? '',
        created_at: row.created_at ?? '',
        updated_at: row.updated_at ?? '',
        is_archived: row.is_archived ?? false,
        is_pinned: row.is_pinned ?? false,
        settings: row.settings as Record<string, unknown> | undefined,
        current_week_id: row.current_week_id ?? undefined,
        current_week_number: row.current_week_number ?? undefined,
        current_week_status: row.current_week_status as AqdList['current_week_status'],
        item_count: row.total_items ?? 0,
        completed_count: row.done_items ?? 0,
      }));
    },
  });
}

export function useAqdList(id: string | undefined) {
  return useQuery({
    queryKey: aqdKeys.list(id || ''),
    queryFn: async (): Promise<AqdList | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('aqd_lists_summary')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw new Error(error.message);
      }
      
      return {
        id: data.id,
        name: data.name,
        description: data.description ?? undefined,
        created_by: data.created_by ?? '',
        created_at: data.created_at ?? '',
        updated_at: data.updated_at ?? '',
        is_archived: data.is_archived ?? false,
        is_pinned: data.is_pinned ?? false,
        settings: data.settings as Record<string, unknown> | undefined,
        current_week_id: data.current_week_id ?? undefined,
        current_week_number: data.current_week_number ?? undefined,
        current_week_status: data.current_week_status as AqdList['current_week_status'],
        item_count: data.total_items ?? 0,
        completed_count: data.done_items ?? 0,
      };
    },
    enabled: !!id,
  });
}

export function useCreateAqdList() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateAqdListInput): Promise<AqdList> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get current week dates (Sun-Thu model)
      const now = new Date();
      const day = now.getDay();
      const startDate = new Date(now);
      startDate.setDate(now.getDate() - ((day + 1) % 7)); // Last Sunday
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 4); // Thursday

      // Get week number
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const weekNumber = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);

      // Create list
      const { data: list, error: listError } = await supabase
        .from('aqd_lists')
        .insert({
          name: input.name,
          description: input.description,
          created_by: user.id,
        })
        .select()
        .single();

      if (listError) throw new Error(listError.message);

      // Create initial week
      const { error: weekError } = await supabase
        .from('aqd_weeks')
        .insert({
          list_id: list.id,
          week_number: weekNumber,
          year: now.getFullYear(),
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          status: 'active',
        });

      if (weekError) throw new Error(weekError.message);

      return list as unknown as AqdList;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aqdKeys.lists() });
      toast.success('List created');
    },
    onError: (error) => {
      toast.error('Failed to create list: ' + error.message);
    },
  });
}

export function useUpdateAqdList() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; description?: string }) => {
      const { error } = await supabase
        .from('aqd_lists')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw new Error(error.message);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: aqdKeys.lists() });
      queryClient.invalidateQueries({ queryKey: aqdKeys.list(id) });
    },
  });
}

export function useDeleteAqdList() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('aqd_lists')
        .update({ is_archived: true, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aqdKeys.lists() });
      toast.success('List archived');
    },
  });
}

export function useToggleAqdListPin() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, is_pinned }: { id: string; is_pinned: boolean }) => {
      const { error } = await supabase
        .from('aqd_lists')
        .update({ is_pinned, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aqdKeys.lists() });
    },
  });
}

// ============ WEEK HOOKS ============

export function useAqdWeeks(listId: string | undefined) {
  return useQuery({
    queryKey: aqdKeys.weeks(listId || ''),
    queryFn: async (): Promise<AqdWeek[]> => {
      if (!listId) return [];
      const { data, error } = await supabase
        .from('aqd_weeks')
        .select('*')
        .eq('list_id', listId)
        .order('year', { ascending: false })
        .order('week_number', { ascending: false });

      if (error) throw new Error(error.message);
      return (data || []) as unknown as AqdWeek[];
    },
    enabled: !!listId,
  });
}

export function useAqdCurrentWeek(listId: string | undefined) {
  return useQuery({
    queryKey: [...aqdKeys.weeks(listId || ''), 'current'],
    queryFn: async (): Promise<AqdWeek | null> => {
      if (!listId) return null;
      
      // First try to get active week
      const { data, error } = await supabase
        .from('aqd_weeks')
        .select('*')
        .eq('list_id', listId)
        .in('status', ['active', 'checkout_pending'])
        .order('year', { ascending: false })
        .order('week_number', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw new Error(error.message);
      return data as unknown as AqdWeek | null;
    },
    enabled: !!listId,
  });
}

// ============ ITEM HOOKS ============

export function useAqdItems(weekId: string | undefined) {
  return useQuery({
    queryKey: aqdKeys.items(weekId || ''),
    queryFn: async (): Promise<AqdItem[]> => {
      if (!weekId) return [];
      
      const { data, error } = await supabase
        .from('aqd_items_full')
        .select('*')
        .eq('week_id', weekId)
        .order('rank', { ascending: true });

      if (error) throw new Error(error.message);
      
      // Get labels for items
      const itemIds = (data || []).map(row => row.id);
      let labelsMap: Record<string, AqdLabel[]> = {};
      
      if (itemIds.length > 0) {
        const { data: labelData } = await supabase
          .from('aqd_item_labels')
          .select('item_id, aqd_labels(*)')
          .in('item_id', itemIds);
        
        if (labelData) {
          for (const row of labelData) {
            if (!labelsMap[row.item_id]) labelsMap[row.item_id] = [];
            if (row.aqd_labels) {
              labelsMap[row.item_id].push(row.aqd_labels as unknown as AqdLabel);
            }
          }
        }
      }
      
      return (data || []).map(row => ({
        id: row.id,
        list_id: row.list_id,
        week_id: row.week_id,
        rank: row.rank,
        title: row.title,
        description: row.description ?? undefined,
        status: (row.status || 'not_started') as AqdItemStatus,
        assignee_id: row.assignee_id ?? undefined,
        assignee_name: row.assignee_name ?? undefined,
        assignee_avatar: row.assignee_avatar ?? undefined,
        due_date: row.due_date ?? undefined,
        taskhub_key: row.taskhub_key ?? undefined,
        is_carryover: row.is_carryover ?? false,
        carryover_from_week_id: row.carryover_from_week_id ?? undefined,
        carryover_confirmed: row.carryover_confirmed ?? false,
        checkout_decision: row.checkout_decision as AqdItem['checkout_decision'],
        labels: labelsMap[row.id] || [],
        created_by: row.created_by ?? '',
        created_at: row.created_at ?? '',
        updated_at: row.updated_at ?? '',
      }));
    },
    enabled: !!weekId,
  });
}

export function useAqdItem(itemId: string | undefined) {
  return useQuery({
    queryKey: aqdKeys.item(itemId || ''),
    queryFn: async (): Promise<AqdItem | null> => {
      if (!itemId) return null;
      
      const { data, error } = await supabase
        .from('aqd_items_full')
        .select('*')
        .eq('id', itemId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw new Error(error.message);
      }
      
      // Get labels
      const { data: labelData } = await supabase
        .from('aqd_item_labels')
        .select('aqd_labels(*)')
        .eq('item_id', itemId);
      
      const labels = (labelData || [])
        .filter(row => row.aqd_labels)
        .map(row => row.aqd_labels as unknown as AqdLabel);
      
      return {
        id: data.id,
        list_id: data.list_id,
        week_id: data.week_id,
        rank: data.rank,
        title: data.title,
        description: data.description ?? undefined,
        status: (data.status || 'not_started') as AqdItemStatus,
        assignee_id: data.assignee_id ?? undefined,
        assignee_name: data.assignee_name ?? undefined,
        assignee_avatar: data.assignee_avatar ?? undefined,
        due_date: data.due_date ?? undefined,
        taskhub_key: data.taskhub_key ?? undefined,
        is_carryover: data.is_carryover ?? false,
        carryover_from_week_id: data.carryover_from_week_id ?? undefined,
        carryover_confirmed: data.carryover_confirmed ?? false,
        checkout_decision: data.checkout_decision as AqdItem['checkout_decision'],
        labels,
        created_by: data.created_by ?? '',
        created_at: data.created_at ?? '',
        updated_at: data.updated_at ?? '',
      };
    },
    enabled: !!itemId,
  });
}

export function useCreateAqdItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateAqdItemInput): Promise<AqdItem> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get max rank for this week
      const { data: existingItems } = await supabase
        .from('aqd_items')
        .select('rank')
        .eq('week_id', input.week_id)
        .order('rank', { ascending: false })
        .limit(1);

      const nextRank = (existingItems?.[0]?.rank ?? 0) + 1;

      const { data, error } = await supabase
        .from('aqd_items')
        .insert({
          list_id: input.list_id,
          week_id: input.week_id,
          title: input.title,
          taskhub_key: input.taskhub_key,
          rank: nextRank,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as unknown as AqdItem;
    },
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: aqdKeys.items(input.week_id) });
      queryClient.invalidateQueries({ queryKey: aqdKeys.lists() });
      toast.success('Priority added');
    },
    onError: (error) => {
      toast.error('Failed to add priority: ' + error.message);
    },
  });
}

export function useUpdateAqdItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: UpdateAqdItemInput) => {
      const { id, ...updates } = input;
      const { error } = await supabase
        .from('aqd_items')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aqdKeys.all });
      toast.success('Priority updated');
    },
  });
}

export function useDeleteAqdItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('aqd_items')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aqdKeys.all });
      toast.success('Priority deleted');
    },
  });
}

export function useReorderAqdItems() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: ReorderAqdItemsInput) => {
      // Update all ranks in a transaction-like manner
      const updates = input.items.map(item => 
        supabase
          .from('aqd_items')
          .update({ rank: item.rank, updated_at: new Date().toISOString() })
          .eq('id', item.id)
      );

      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) throw new Error(errors[0].error!.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aqdKeys.all });
    },
  });
}

export function useCycleAqdItemStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: AqdItemStatus }) => {
      const newStatus = getNextStatus(currentStatus);
      
      const { error } = await supabase
        .from('aqd_items')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw new Error(error.message);
      return newStatus;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aqdKeys.all });
    },
  });
}

// ============ CARRYOVER HOOKS ============

export function useAqdCarryoverItems(weekId: string | undefined) {
  return useQuery({
    queryKey: aqdKeys.carryover(weekId || ''),
    queryFn: async (): Promise<AqdItem[]> => {
      if (!weekId) return [];
      
      const { data, error } = await supabase
        .from('aqd_carryover_items')
        .select('*')
        .eq('week_id', weekId);

      if (error) throw new Error(error.message);
      return (data || []) as unknown as AqdItem[];
    },
    enabled: !!weekId,
  });
}

export function useConfirmCarryover() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('aqd_items')
        .update({ 
          carryover_confirmed: true, 
          is_carryover: false,
          updated_at: new Date().toISOString() 
        })
        .eq('id', itemId);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aqdKeys.all });
      toast.success('Carryover confirmed');
    },
  });
}

export function useConfirmAllCarryover() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (weekId: string) => {
      const { error } = await supabase
        .from('aqd_items')
        .update({ 
          carryover_confirmed: true, 
          is_carryover: false,
          updated_at: new Date().toISOString() 
        })
        .eq('week_id', weekId)
        .eq('is_carryover', true);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aqdKeys.all });
      toast.success('All carryovers confirmed');
    },
  });
}

export function useDismissCarryover() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('aqd_items')
        .delete()
        .eq('id', itemId);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aqdKeys.all });
      toast.success('Carryover dismissed');
    },
  });
}

// ============ CHECKOUT HOOKS ============

export function useCheckoutWeek() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CheckoutWeekInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get week info
      const { data: week, error: weekError } = await supabase
        .from('aqd_weeks')
        .select('*')
        .eq('id', input.week_id)
        .single();

      if (weekError) throw new Error(weekError.message);

      // Update item decisions
      for (const decision of input.decisions) {
        const { error } = await supabase
          .from('aqd_items')
          .update({ checkout_decision: decision.decision })
          .eq('id', decision.item_id);
        if (error) throw new Error(error.message);
      }

      // Calculate performance summary
      const resolvedCount = input.decisions.filter(d => d.decision === 'resolved').length;
      const carriedCount = input.decisions.filter(d => d.decision === 'carry').length;
      const unresolvedCount = input.decisions.filter(d => d.decision === 'leave').length;

      // Archive current week
      const { error: archiveError } = await supabase
        .from('aqd_weeks')
        .update({
          status: 'archived',
          checkout_completed_at: new Date().toISOString(),
          checkout_completed_by: user.id,
          performance_summary: {
            resolved_count: resolvedCount,
            carried_count: carriedCount,
            unresolved_count: unresolvedCount,
          },
        })
        .eq('id', input.week_id);

      if (archiveError) throw new Error(archiveError.message);

      // Create new week
      const nextWeekNumber = (week.week_number % 52) + 1;
      const nextYear = week.week_number === 52 ? week.year + 1 : week.year;
      
      const startDate = new Date(week.end_date);
      startDate.setDate(startDate.getDate() + 3); // Next Sunday
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 4); // Thursday

      const { data: newWeek, error: newWeekError } = await supabase
        .from('aqd_weeks')
        .insert({
          list_id: week.list_id,
          week_number: nextWeekNumber,
          year: nextYear,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          status: 'active',
        })
        .select()
        .single();

      if (newWeekError) throw new Error(newWeekError.message);

      // Create carryover items
      const carryItems = input.decisions.filter(d => d.decision === 'carry');
      if (carryItems.length > 0) {
        const { data: originalItems } = await supabase
          .from('aqd_items')
          .select('*')
          .in('id', carryItems.map(c => c.item_id));

        if (originalItems) {
          const carryoverInserts = originalItems.map((item, idx) => ({
            list_id: week.list_id,
            week_id: newWeek.id,
            title: item.title,
            description: item.description,
            assignee_id: item.assignee_id,
            due_date: item.due_date,
            taskhub_key: item.taskhub_key,
            rank: idx + 1,
            is_carryover: true,
            carryover_from_week_id: input.week_id,
            carryover_confirmed: false,
            created_by: user.id,
          }));

          const { error: carryError } = await supabase
            .from('aqd_items')
            .insert(carryoverInserts);

          if (carryError) throw new Error(carryError.message);
        }
      }

      return newWeek;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aqdKeys.all });
      toast.success('Checkout complete');
    },
    onError: (error) => {
      toast.error('Checkout failed: ' + error.message);
    },
  });
}

// ============ NOTES HOOKS ============

export function useAqdItemNotes(itemId: string | undefined) {
  return useQuery({
    queryKey: aqdKeys.notes(itemId || ''),
    queryFn: async (): Promise<AqdItemNote[]> => {
      if (!itemId) return [];
      
      const { data, error } = await supabase
        .from('aqd_item_notes')
        .select('*, profiles:created_by(full_name)')
        .eq('item_id', itemId)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return (data || []).map(row => ({
        id: row.id,
        item_id: row.item_id,
        content: row.content,
        created_by: row.created_by ?? '',
        created_by_name: (row.profiles as any)?.full_name ?? undefined,
        created_at: row.created_at ?? '',
      }));
    },
    enabled: !!itemId,
  });
}

export function useAddAqdItemNote() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ itemId, content }: { itemId: string; content: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('aqd_item_notes')
        .insert({
          item_id: itemId,
          content,
          created_by: user.id,
        });

      if (error) throw new Error(error.message);
    },
    onSuccess: (_, { itemId }) => {
      queryClient.invalidateQueries({ queryKey: aqdKeys.notes(itemId) });
    },
  });
}

// ============ HISTORY HOOKS ============

export function useAqdItemHistory(itemId: string | undefined) {
  return useQuery({
    queryKey: aqdKeys.history(itemId || ''),
    queryFn: async (): Promise<AqdItemHistory[]> => {
      if (!itemId) return [];
      
      const { data, error } = await supabase
        .from('aqd_item_history')
        .select('*, profiles:changed_by(full_name)')
        .eq('item_id', itemId)
        .order('changed_at', { ascending: false });

      if (error) throw new Error(error.message);
      return (data || []).map(row => ({
        id: row.id,
        item_id: row.item_id,
        field_name: row.field_name,
        old_value: row.old_value,
        new_value: row.new_value,
        changed_by: row.changed_by ?? '',
        changed_by_name: (row.profiles as any)?.full_name ?? undefined,
        changed_at: row.changed_at ?? '',
      }));
    },
    enabled: !!itemId,
  });
}

// ============ LABELS HOOKS ============

export function useAqdLabels(listId: string | undefined) {
  return useQuery({
    queryKey: aqdKeys.labels(listId || ''),
    queryFn: async (): Promise<AqdLabel[]> => {
      if (!listId) return [];
      
      const { data, error } = await supabase
        .from('aqd_labels')
        .select('*')
        .eq('list_id', listId)
        .order('name');

      if (error) throw new Error(error.message);
      return (data || []) as unknown as AqdLabel[];
    },
    enabled: !!listId,
  });
}

export function useCreateAqdLabel() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ listId, name, color }: { listId: string; name: string; color: string }) => {
      const { data, error } = await supabase
        .from('aqd_labels')
        .insert({ list_id: listId, name, color })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_, { listId }) => {
      queryClient.invalidateQueries({ queryKey: aqdKeys.labels(listId) });
    },
  });
}

export function useAddAqdItemLabel() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ itemId, labelId }: { itemId: string; labelId: string }) => {
      const { error } = await supabase
        .from('aqd_item_labels')
        .insert({ item_id: itemId, label_id: labelId });

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aqdKeys.all });
    },
  });
}

export function useRemoveAqdItemLabel() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ itemId, labelId }: { itemId: string; labelId: string }) => {
      const { error } = await supabase
        .from('aqd_item_labels')
        .delete()
        .eq('item_id', itemId)
        .eq('label_id', labelId);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aqdKeys.all });
    },
  });
}

// ============ PERFORMANCE HOOKS ============

export function useAqdPerformance(weekId: string | undefined) {
  return useQuery({
    queryKey: aqdKeys.performance(weekId || ''),
    queryFn: async (): Promise<AqdWeekPerformance | null> => {
      if (!weekId) return null;
      
      const { data, error } = await supabase
        .from('aqd_week_performance')
        .select('*')
        .eq('id', weekId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw new Error(error.message);
      }
      
      return data as unknown as AqdWeekPerformance;
    },
    enabled: !!weekId,
  });
}
