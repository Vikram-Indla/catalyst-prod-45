import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { 
  ChangeCard, 
  ChangeCardLink, 
  ChangeCardWithLinks,
  CreateChangeCardInput,
  UpdateChangeCardInput,
  ChangeCardStatus,
  ExceptionReasonCode,
  ChangeAuditEventType
} from '../types';

// Query keys
export const changeCardKeys = {
  all: ['change-cards'] as const,
  lists: () => [...changeCardKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...changeCardKeys.lists(), filters] as const,
  details: () => [...changeCardKeys.all, 'detail'] as const,
  detail: (id: string) => [...changeCardKeys.details(), id] as const,
  byDate: (date: string) => [...changeCardKeys.all, 'date', date] as const,
  byMonth: (year: number, month: number) => [...changeCardKeys.all, 'month', year, month] as const,
};

// Fetch all change cards
export function useChangeCards(filters?: {
  status?: ChangeCardStatus;
  release_version_id?: string;
  approved?: boolean;
  compliance_state?: string;
  change_manager_user_id?: string;
  from_date?: string;
  to_date?: string;
}) {
  return useQuery({
    queryKey: changeCardKeys.list(filters || {}),
    queryFn: async () => {
      let query = supabase
        .from('change_cards')
        .select('*')
        .order('planned_prod_date', { ascending: true });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.release_version_id) {
        query = query.eq('release_version_id', filters.release_version_id);
      }
      if (filters?.approved !== undefined) {
        query = query.eq('approved', filters.approved);
      }
      if (filters?.compliance_state) {
        query = query.eq('compliance_state', filters.compliance_state as 'compliant' | 'exception_recorded');
      }
      if (filters?.change_manager_user_id) {
        query = query.eq('change_manager_user_id', filters.change_manager_user_id);
      }
      if (filters?.from_date) {
        query = query.gte('planned_prod_date', filters.from_date);
      }
      if (filters?.to_date) {
        query = query.lte('planned_prod_date', filters.to_date);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ChangeCard[];
    },
  });
}

// Fetch change cards by date
export function useChangeCardsByDate(date: string) {
  return useQuery({
    queryKey: changeCardKeys.byDate(date),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('change_cards')
        .select('*')
        .eq('planned_prod_date', date)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ChangeCard[];
    },
    enabled: !!date,
  });
}

// Fetch change cards for a month
export function useChangeCardsByMonth(year: number, month: number) {
  const startDate = new Date(year, month, 1).toISOString().split('T')[0];
  const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

  return useQuery({
    queryKey: changeCardKeys.byMonth(year, month),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('change_cards')
        .select('*')
        .gte('planned_prod_date', startDate)
        .lte('planned_prod_date', endDate)
        .order('planned_prod_date', { ascending: true });

      if (error) throw error;
      return data as ChangeCard[];
    },
  });
}

// Fetch single change card with links
export function useChangeCard(id: string) {
  return useQuery({
    queryKey: changeCardKeys.detail(id),
    queryFn: async () => {
      const { data: card, error: cardError } = await supabase
        .from('change_cards')
        .select('*')
        .eq('id', id)
        .single();

      if (cardError) throw cardError;

      const { data: links, error: linksError } = await supabase
        .from('change_card_links')
        .select('*')
        .eq('change_card_id', id);

      if (linksError) throw linksError;

      const pendingCount = links?.filter(l => l.committee_status === 'pending').length || 0;

      return {
        ...card,
        links: links || [],
        committee_pending_count: pendingCount,
      } as ChangeCardWithLinks;
    },
    enabled: !!id,
  });
}

// Create change card
export function useCreateChangeCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateChangeCardInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('change_cards')
        .insert({
          ...input,
          created_by_user_id: user.id,
          updated_by_user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Create audit event
      await supabase.from('change_card_audit_events').insert({
        change_card_id: data.id,
        event_type: 'created' as ChangeAuditEventType,
        actor_user_id: user.id,
        metadata_json: { committee_pending_count: 0 },
      });

      return data as ChangeCard;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: changeCardKeys.all });
    },
  });
}

// Update change card
export function useUpdateChangeCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateChangeCardInput }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: oldCard } = await supabase
        .from('change_cards')
        .select('*')
        .eq('id', id)
        .single();

      const { data, error } = await supabase
        .from('change_cards')
        .update({
          ...input,
          updated_by_user_id: user.id,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Create audit event for status change
      if (input.status && oldCard && input.status !== oldCard.status) {
        await supabase.from('change_card_audit_events').insert({
          change_card_id: id,
          event_type: 'status_changed' as ChangeAuditEventType,
          from_value: oldCard.status,
          to_value: input.status,
          actor_user_id: user.id,
        });
      } else {
        await supabase.from('change_card_audit_events').insert({
          change_card_id: id,
          event_type: 'updated' as ChangeAuditEventType,
          actor_user_id: user.id,
        });
      }

      return data as ChangeCard;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: changeCardKeys.all });
      queryClient.invalidateQueries({ queryKey: changeCardKeys.detail(id) });
    },
  });
}

// Toggle approval (CHANGE_MANAGER only - enforced in UI)
export function useToggleApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('change_cards')
        .update({
          approved,
          approved_by_user_id: approved ? user.id : null,
          approved_at: approved ? new Date().toISOString() : null,
          updated_by_user_id: user.id,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await supabase.from('change_card_audit_events').insert({
        change_card_id: id,
        event_type: 'approval_toggled' as ChangeAuditEventType,
        from_value: (!approved).toString(),
        to_value: approved.toString(),
        actor_user_id: user.id,
      });

      return data as ChangeCard;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: changeCardKeys.all });
      queryClient.invalidateQueries({ queryKey: changeCardKeys.detail(id) });
    },
  });
}

// Record exception
export function useRecordException() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      reason_code, 
      notes 
    }: { 
      id: string; 
      reason_code: ExceptionReasonCode; 
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('change_cards')
        .update({
          compliance_state: 'exception_recorded',
          exception_reason_code: reason_code,
          exception_notes: notes,
          exception_recorded_by_user_id: user.id,
          exception_recorded_at: new Date().toISOString(),
          updated_by_user_id: user.id,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await supabase.from('change_card_audit_events').insert({
        change_card_id: id,
        event_type: 'exception_recorded' as ChangeAuditEventType,
        reason_code,
        notes,
        actor_user_id: user.id,
      });

      return data as ChangeCard;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: changeCardKeys.all });
      queryClient.invalidateQueries({ queryKey: changeCardKeys.detail(id) });
    },
  });
}

// Link ticket to change
export function useLinkTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (link: Omit<ChangeCardLink, 'id' | 'created_at' | 'created_by_user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('change_card_links')
        .insert({
          ...link,
          created_by_user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from('change_card_audit_events').insert({
        change_card_id: link.change_card_id,
        event_type: 'ticket_linked' as ChangeAuditEventType,
        to_value: `${link.work_item_type}:${link.work_item_id}`,
        actor_user_id: user.id,
      });

      return data as ChangeCardLink;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: changeCardKeys.detail(data.change_card_id) });
    },
  });
}

// Unlink ticket from change
export function useUnlinkTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ linkId, changeCardId }: { linkId: string; changeCardId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: link } = await supabase
        .from('change_card_links')
        .select('*')
        .eq('id', linkId)
        .single();

      const { error } = await supabase
        .from('change_card_links')
        .delete()
        .eq('id', linkId);

      if (error) throw error;

      if (link) {
        await supabase.from('change_card_audit_events').insert({
          change_card_id: changeCardId,
          event_type: 'ticket_unlinked' as ChangeAuditEventType,
          from_value: `${link.work_item_type}:${link.work_item_id}`,
          actor_user_id: user.id,
        });
      }
    },
    onSuccess: (_, { changeCardId }) => {
      queryClient.invalidateQueries({ queryKey: changeCardKeys.detail(changeCardId) });
    },
  });
}

// Fetch audit events for a change card
export function useChangeCardAuditEvents(changeCardId: string) {
  return useQuery({
    queryKey: ['change-card-audit', changeCardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('change_card_audit_events')
        .select('*')
        .eq('change_card_id', changeCardId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!changeCardId,
  });
}
