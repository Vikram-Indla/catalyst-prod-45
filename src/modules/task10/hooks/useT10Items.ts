// ═══════════════════════════════════════════════════════════════════════════════
// HOOK: useT10Items
// Purpose: CRUD operations for Task¹⁰ items including drag-drop reordering
// ═══════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  T10Item,
  T10ItemFull,
  T10ItemCreateInput,
  T10ItemUpdateInput,
  T10ItemReorderInput,
  T10ItemLabelsInput,
  T10Label,
} from '../types';
import { t10WeekKeys } from './useT10Weeks';
import { t10ListKeys } from './useT10Lists';

// Query keys
export const t10ItemKeys = {
  all: ['t10-items'] as const,
  byWeek: (weekId: string) => [...t10ItemKeys.all, 'week', weekId] as const,
  item: (itemId: string) => [...t10ItemKeys.all, 'item', itemId] as const,
  buffer: (weekId: string) => [...t10ItemKeys.all, 'buffer', weekId] as const,
};

// Helper to get initials from name
function getInitials(name: string | null | undefined): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// Helper to parse labels from JSON
function parseLabels(labels: unknown): T10Label[] {
  if (!labels) return [];
  if (Array.isArray(labels)) return labels as T10Label[];
  if (typeof labels === 'string') {
    try {
      return JSON.parse(labels) as T10Label[];
    } catch {
      return [];
    }
  }
  return [];
}

// t10_items_full view returns flat columns (not nested relations)
interface DbT10ItemFullView {
  id: string;
  week_id: string;
  rank: number;
  title: string;
  taskhub_key: string | null;
  assignee_id: string | null;
  assignee_name: string | null;  // Flat from view
  assignee_avatar: string | null;  // Flat from view
  due_date: string | null;
  description: string | null;
  status: string;
  carryover_count: number;
  is_buffer: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  labels: unknown;
}

function mapDbToT10Item(db: DbT10ItemFullView): T10Item {
  return {
    id: db.id,
    week_id: db.week_id,
    rank: db.rank,
    title: db.title,
    taskhub_key: db.taskhub_key || undefined,
    assignee_id: db.assignee_id || undefined,
    assignee_name: db.assignee_name || undefined,
    assignee_initials: getInitials(db.assignee_name),
    due_date: db.due_date || undefined,
    label: undefined, // Labels are now in a separate junction table
    description: db.description || undefined,
    status: db.status as 'todo' | 'done',
    carryover_count: db.carryover_count,
    is_buffer: db.is_buffer,
    created_by: db.created_by,
    created_at: db.created_at,
    updated_at: db.updated_at,
  };
}

function mapDbToT10ItemFull(db: DbT10ItemFullView): T10ItemFull {
  const base = mapDbToT10Item(db);
  return {
    ...base,
    assignee_avatar: db.assignee_avatar || null,
    labels: parseLabels(db.labels),
  };
}

/**
 * Fetch Top 10 items for a week (ranked 1-10, excludes buffer)
 * NOTE: Uses the t10_items_full view so assignee + labels are available.
 */
export function useT10Items(weekId: string | undefined | null) {
  return useQuery({
    queryKey: t10ItemKeys.byWeek(weekId || ''),
    queryFn: async (): Promise<T10ItemFull[]> => {
      if (!weekId) return [];

      const { data, error } = await supabase
        .from('t10_items_full')
        .select('*')
        .eq('week_id', weekId)
        .eq('is_buffer', false)
        .order('rank', { ascending: true })
        .limit(10);

      if (error) {
        console.error('Error fetching T10 items:', error);
        throw new Error(error.message);
      }

      // Log for Stage D verification
      console.log('[T10] Items fetched for week:', weekId, '| Count:', data?.length);

      return (data || []).map((row) => mapDbToT10ItemFull(row as unknown as DbT10ItemFullView));
    },
    enabled: !!weekId,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetch buffer items (ranked 11+)
 */
export function useT10BufferItems(weekId: string | null) {
  return useQuery({
    queryKey: t10ItemKeys.buffer(weekId || ''),
    queryFn: async (): Promise<T10ItemFull[]> => {
      if (!weekId) return [];

      const { data, error } = await supabase
        .from('t10_items_full')
        .select('*')
        .eq('week_id', weekId)
        .eq('is_buffer', true)
        .order('rank', { ascending: true });

      if (error) {
        console.error('Error fetching buffer items:', error);
        throw new Error(error.message);
      }

      console.log('[T10] Buffer items fetched:', data?.length);

      return (data || []).map(item => mapDbToT10ItemFull(item as unknown as DbT10ItemFullView));
    },
    enabled: !!weekId,
  });
}

/**
 * Fetch single item by ID
 */
export function useT10Item(itemId: string | null) {
  return useQuery({
    queryKey: t10ItemKeys.item(itemId || ''),
    queryFn: async (): Promise<T10ItemFull | null> => {
      if (!itemId) return null;

      const { data, error } = await supabase
        .from('t10_items_full')
        .select('*')
        .eq('id', itemId)
        .single();

      if (error) {
        console.error('Error fetching T10 item:', error);
        throw new Error(error.message);
      }

      console.log('[T10] Item fetched:', data?.title);

      return mapDbToT10ItemFull(data as unknown as DbT10ItemFullView);
    },
    enabled: !!itemId,
  });
}

/**
 * Create new item
 */
export function useT10CreateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: T10ItemCreateInput): Promise<T10ItemFull> => {
      const { data: { user } } = await supabase.auth.getUser();

      const isBuffer = input.is_buffer ?? input.rank > 10;

      const { data, error } = await supabase
        .from('t10_items')
        .insert({
          week_id: input.week_id,
          rank: input.rank,
          title: input.title,
          description: input.description || null,
          taskhub_key: input.taskhub_key || null,
          assignee_id: input.assignee_id || null,
          due_date: input.due_date || null,
          is_buffer: isBuffer,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating T10 item:', error);
        throw new Error(error.message);
      }

      console.log('[T10] Item created:', data.title);

      // Fetch full item with labels
      const { data: fullItem } = await supabase
        .from('t10_items_full')
        .select('*')
        .eq('id', data.id)
        .single();

      return mapDbToT10ItemFull(fullItem as unknown as DbT10ItemFullView);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: t10ItemKeys.byWeek(data.week_id) });
      queryClient.invalidateQueries({ queryKey: t10WeekKeys.all });
      queryClient.invalidateQueries({ queryKey: t10ListKeys.all });
    },
  });
}

// Alias for backward compatibility
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
      
      return mapDbToT10Item({
        ...data,
        assignee_name: null,
        assignee_avatar: null,
        labels: [],
      } as DbT10ItemFullView);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['t10-items', variables.weekId] });
    },
  });
}

/**
 * Update item
 */
export function useT10UpdateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: T10ItemUpdateInput): Promise<T10ItemFull> => {
      const { id, ...updates } = input;

      // Keep is_buffer consistent with rank whenever rank changes.
      if (updates.rank !== undefined && updates.is_buffer === undefined) {
        updates.is_buffer = updates.rank > 10;
      }

      const { data, error } = await supabase
        .from('t10_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating T10 item:', error);
        throw new Error(error.message);
      }

      console.log('[T10] Item updated:', data.title);

      // Fetch full item
      const { data: fullItem } = await supabase
        .from('t10_items_full')
        .select('*')
        .eq('id', data.id)
        .single();

      return mapDbToT10ItemFull(fullItem as unknown as DbT10ItemFullView);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: t10ItemKeys.byWeek(data.week_id) });
      queryClient.setQueryData(t10ItemKeys.item(data.id), data);
      queryClient.invalidateQueries({ queryKey: t10WeekKeys.all });
      queryClient.invalidateQueries({ queryKey: t10ListKeys.all });
    },
  });
}

// Alias for backward compatibility
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
      
      return mapDbToT10Item({
        ...data,
        assignee_name: null,
        assignee_avatar: null,
        labels: [],
      } as DbT10ItemFullView);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['t10-items', data.week_id] });
    },
  });
}

/**
 * Toggle item status (todo <-> done)
 */
export function useT10ToggleItemStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: T10ItemFull): Promise<T10ItemFull> => {
      const newStatus = item.status === 'done' ? 'todo' : 'done';

      const { data, error } = await supabase
        .from('t10_items')
        .update({ status: newStatus })
        .eq('id', item.id)
        .select()
        .single();

      if (error) {
        console.error('Error toggling item status:', error);
        throw new Error(error.message);
      }

      console.log('[T10] Item status toggled:', item.title, '->', newStatus);

      const { data: fullItem } = await supabase
        .from('t10_items_full')
        .select('*')
        .eq('id', data.id)
        .single();

      return mapDbToT10ItemFull(fullItem as unknown as DbT10ItemFullView);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: t10ItemKeys.byWeek(data.week_id) });
      queryClient.invalidateQueries({ queryKey: t10WeekKeys.all });
      queryClient.invalidateQueries({ queryKey: t10ListKeys.all });
    },
  });
}

/**
 * Reorder items (drag-drop)
 * Uses optimistic updates for smooth UX
 */
export function useT10ReorderItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: T10ItemReorderInput): Promise<void> => {
      const { week_id, item_id, new_rank } = input;

      // Get current items
      const { data: items, error: fetchError } = await supabase
        .from('t10_items')
        .select('id, rank')
        .eq('week_id', week_id)
        .eq('is_buffer', false)
        .order('rank', { ascending: true });

      if (fetchError) throw new Error(fetchError.message);

      const currentItem = items?.find(i => i.id === item_id);
      if (!currentItem) throw new Error('Item not found');

      const old_rank = currentItem.rank;
      if (old_rank === new_rank) return;

      // Calculate new ranks for affected items
      const updates: { id: string; rank: number }[] = [];

      items?.forEach(item => {
        if (item.id === item_id) {
          updates.push({ id: item.id, rank: new_rank });
        } else if (old_rank < new_rank) {
          // Moving down: shift items between old and new up
          if (item.rank > old_rank && item.rank <= new_rank) {
            updates.push({ id: item.id, rank: item.rank - 1 });
          }
        } else {
          // Moving up: shift items between new and old down
          if (item.rank >= new_rank && item.rank < old_rank) {
            updates.push({ id: item.id, rank: item.rank + 1 });
          }
        }
      });

      // Apply updates
      for (const update of updates) {
        const { error } = await supabase
          .from('t10_items')
          .update({ rank: update.rank })
          .eq('id', update.id);

        if (error) throw new Error(error.message);
      }

      console.log('[T10] Items reordered:', item_id, 'from', old_rank, 'to', new_rank);
    },
    onMutate: async (input) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: t10ItemKeys.byWeek(input.week_id) });

      // Snapshot previous value
      const previousItems = queryClient.getQueryData<T10ItemFull[]>(
        t10ItemKeys.byWeek(input.week_id)
      );

      // Optimistically update
      if (previousItems) {
        const newItems = [...previousItems];
        const itemIndex = newItems.findIndex(i => i.id === input.item_id);
        if (itemIndex !== -1) {
          const [item] = newItems.splice(itemIndex, 1);
          newItems.splice(input.new_rank - 1, 0, item);
          // Update ranks
          newItems.forEach((item, index) => {
            item.rank = index + 1;
          });
          queryClient.setQueryData(t10ItemKeys.byWeek(input.week_id), newItems);
        }
      }

      return { previousItems };
    },
    onError: (err, input, context) => {
      // Rollback on error
      if (context?.previousItems) {
        queryClient.setQueryData(
          t10ItemKeys.byWeek(input.week_id),
          context.previousItems
        );
      }
    },
    onSettled: (_, __, input) => {
      queryClient.invalidateQueries({ queryKey: t10ItemKeys.byWeek(input.week_id) });
    },
  });
}

/**
 * Delete item
 */
export function useT10DeleteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: T10ItemFull): Promise<void> => {
      console.log('[T10] Attempting to delete item:', item.id, item.title);
      
      const { error } = await supabase
        .from('t10_items')
        .delete()
        .eq('id', item.id);

      if (error) {
        console.error('[T10] Error deleting T10 item:', error);
        throw new Error(error.message);
      }

      console.log('[T10] Item deleted successfully:', item.title);
    },
    onSuccess: (_, item) => {
      console.log('[T10] Invalidating queries after delete for week:', item.week_id);
      queryClient.invalidateQueries({ queryKey: t10ItemKeys.byWeek(item.week_id) });
      queryClient.invalidateQueries({ queryKey: t10ItemKeys.buffer(item.week_id) });
      queryClient.invalidateQueries({ queryKey: t10WeekKeys.all });
      queryClient.invalidateQueries({ queryKey: t10ListKeys.all });
    },
    onError: (error, item) => {
      console.error('[T10] Delete mutation error for item:', item.title, error);
    },
  });
}

// Alias for backward compatibility
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

/**
 * Bulk update items
 */
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

/**
 * Carryover items to new week
 */
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
      return (data || []).map((row) => mapDbToT10Item({
        ...row,
        assignee_name: null,
        assignee_avatar: null,
        labels: [],
      } as DbT10ItemFullView));
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['t10-items', variables.targetWeekId] });
    },
  });
}

/**
 * Update item labels
 */
export function useT10UpdateItemLabels() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: T10ItemLabelsInput): Promise<void> => {
      const { item_id, label_ids } = input;

      // Delete existing labels
      await supabase
        .from('t10_item_labels')
        .delete()
        .eq('item_id', item_id);

      // Insert new labels
      if (label_ids.length > 0) {
        const { error } = await supabase
          .from('t10_item_labels')
          .insert(
            label_ids.map(label_id => ({
              item_id,
              label_id,
            }))
          );

        if (error) {
          console.error('Error updating item labels:', error);
          throw new Error(error.message);
        }
      }

      console.log('[T10] Item labels updated:', item_id, label_ids.length, 'labels');
    },
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: t10ItemKeys.item(input.item_id) });
      queryClient.invalidateQueries({ queryKey: t10ItemKeys.all });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SWAP BUFFER ITEM WITH #10
// Swaps a buffer item with the item ranked at #10 in the Top 10
// ═══════════════════════════════════════════════════════════════════════════════

export interface T10SwapWithTen {
  week_id: string;
  buffer_item_id: string;
}

export function useT10SwapWithTen() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ week_id, buffer_item_id }: T10SwapWithTen): Promise<void> => {
      // Get item at rank 10 (Top 10 item)
      const { data: rank10Item, error: fetchError } = await supabase
        .from('t10_items')
        .select('id, rank')
        .eq('week_id', week_id)
        .eq('rank', 10)
        .eq('is_buffer', false)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw new Error(fetchError.message);
      }

      if (!rank10Item) {
        throw new Error('No item at rank #10 to swap with');
      }

      // Get buffer item
      const { data: bufferItem, error: bufferError } = await supabase
        .from('t10_items')
        .select('id, rank')
        .eq('id', buffer_item_id)
        .single();

      if (bufferError) throw new Error(bufferError.message);
      if (!bufferItem) throw new Error('Buffer item not found');

      const bufferRank = bufferItem.rank;

      // Swap: buffer item gets rank 10, #10 item gets buffer's rank
      const { error: updateBuffer } = await supabase
        .from('t10_items')
        .update({ rank: 10, is_buffer: false })
        .eq('id', buffer_item_id);

      if (updateBuffer) throw new Error(updateBuffer.message);

      const { error: updateTen } = await supabase
        .from('t10_items')
        .update({ rank: bufferRank, is_buffer: true })
        .eq('id', rank10Item.id);

      if (updateTen) throw new Error(updateTen.message);

      console.log('[T10] Swapped buffer item with #10:', buffer_item_id, '<->', rank10Item.id);
    },
    onSuccess: (_, { week_id }) => {
      queryClient.invalidateQueries({ queryKey: t10ItemKeys.byWeek(week_id) });
      queryClient.invalidateQueries({ queryKey: t10ItemKeys.buffer(week_id) });
      queryClient.invalidateQueries({ queryKey: t10WeekKeys.all });
      queryClient.invalidateQueries({ queryKey: t10ListKeys.all });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMOTE BUFFER ITEM TO TOP 10
// Promotes a buffer item to the next available slot in the Top 10
// ═══════════════════════════════════════════════════════════════════════════════

export interface T10PromoteToTop10 {
  week_id: string;
  buffer_item_id: string;
}

export function useT10PromoteToTop10() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ week_id, buffer_item_id }: T10PromoteToTop10): Promise<void> => {
      // Get all Top 10 items to find next available rank
      const { data: top10Items, error: fetchError } = await supabase
        .from('t10_items')
        .select('id, rank')
        .eq('week_id', week_id)
        .eq('is_buffer', false)
        .order('rank', { ascending: true });

      if (fetchError) throw new Error(fetchError.message);

      const top10Count = top10Items?.length || 0;
      
      if (top10Count >= 10) {
        throw new Error('Top 10 is full. Use swap instead.');
      }

      // Next available rank is count + 1
      const nextRank = top10Count + 1;

      // Promote buffer item
      const { error: promoteError } = await supabase
        .from('t10_items')
        .update({ rank: nextRank, is_buffer: false })
        .eq('id', buffer_item_id);

      if (promoteError) throw new Error(promoteError.message);

      // Re-rank remaining buffer items (shift down by 1)
      const { data: remainingBuffer, error: bufferFetchError } = await supabase
        .from('t10_items')
        .select('id, rank')
        .eq('week_id', week_id)
        .eq('is_buffer', true)
        .order('rank', { ascending: true });

      if (bufferFetchError) throw new Error(bufferFetchError.message);

      // Re-assign ranks starting from 11
      if (remainingBuffer && remainingBuffer.length > 0) {
        for (let i = 0; i < remainingBuffer.length; i++) {
          const { error } = await supabase
            .from('t10_items')
            .update({ rank: 11 + i })
            .eq('id', remainingBuffer[i].id);
          
          if (error) throw new Error(error.message);
        }
      }

      console.log('[T10] Promoted buffer item to Top 10 at rank:', nextRank);
    },
    onSuccess: (_, { week_id }) => {
      queryClient.invalidateQueries({ queryKey: t10ItemKeys.byWeek(week_id) });
      queryClient.invalidateQueries({ queryKey: t10ItemKeys.buffer(week_id) });
      queryClient.invalidateQueries({ queryKey: t10WeekKeys.all });
      queryClient.invalidateQueries({ queryKey: t10ListKeys.all });
    },
  });
}
