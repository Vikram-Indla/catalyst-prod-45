/**
 * Canonical shared hooks for CatalystView* components.
 *
 * Eliminates duplicated useQuery / useMutation boilerplate across
 * Task, BusinessRequest, Subtask, Defect, Epic, and Incident views.
 */
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getStatusCategory } from '@/modules/project-work-hub/components/dialogs/story-detail-modules/helpers';
import type { PhIssue, PhComment, PhActivityLog } from './types';

/* ═══════════════════════════════════════════
   useCatalystIssue — fetch a single ph_issues row
   ═══════════════════════════════════════════ */
export function useCatalystIssue(itemId: string, isOpen: boolean) {
  return useQuery({
    queryKey: ['cv-issue-detail', itemId],
    enabled: !!itemId && isOpen,
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_issues')
        .select('*')
        .eq('id', itemId)
        .is('deleted_at', null)
        .single();
      return data as unknown as PhIssue | null;
    },
  });
}

/* ═══════════════════════════════════════════
   useCatalystComments — fetch comments for an item
   ═══════════════════════════════════════════ */
export function useCatalystComments(itemId: string, isOpen: boolean) {
  return useQuery({
    queryKey: ['cv-comments', itemId],
    enabled: !!itemId && isOpen,
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_comments')
        .select('id, work_item_id, body, author_id, created_at, updated_at')
        .eq('work_item_id', itemId)
        .order('created_at', { ascending: true });
      if (!data?.length) return [] as PhComment[];
      const authorIds = [...new Set(data.map(c => c.author_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .in('id', authorIds);
      const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));
      return data.map(c => ({ ...c, author: profileMap.get(c.author_id) ?? null })) as unknown as PhComment[];
    },
  });
}

/* ═══════════════════════════════════════════
   useCatalystActivity — fetch activity log for an item
   ═══════════════════════════════════════════ */
export function useCatalystActivity(itemId: string, isOpen: boolean) {
  return useQuery({
    queryKey: ['cv-activity', itemId],
    enabled: !!itemId && isOpen,
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_activity_log')
        .select('id, work_item_id, action, field_name, old_value, new_value, user_id, metadata, created_at')
        .eq('work_item_id', itemId)
        .order('created_at', { ascending: false });
      if (!data?.length) return [] as PhActivityLog[];
      const userIds = [...new Set(data.map(e => e.user_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .in('id', userIds);
      const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));
      return data.map(e => ({ ...e, actor: profileMap.get(e.user_id) ?? null })) as unknown as PhActivityLog[];
    },
  });
}

/* ═══════════════════════════════════════════
   useCatalystAvatarProfile — resolve Jira → Catalyst avatar
   ═══════════════════════════════════════════ */
export function useCatalystAvatarProfile(jiraAccountId: string | null | undefined) {
  return useQuery({
    queryKey: ['cv-avatar', jiraAccountId],
    enabled: !!jiraAccountId,
    queryFn: async () => {
      const { data: jiraRow } = await supabase
        .from('jira_identity_map')
        .select('avatar_url, catalyst_user_id')
        .eq('jira_account_id', jiraAccountId!)
        .maybeSingle();
      if (jiraRow?.avatar_url) return { avatar_url: jiraRow.avatar_url };
      if (jiraRow?.catalyst_user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', jiraRow.catalyst_user_id)
          .single();
        if (profile?.avatar_url) return profile;
      }
      return null;
    },
    staleTime: 60000,
  });
}

/* ═══════════════════════════════════════════
   useCatalystIssueMutations — status, field update, delete
   Returns { updateStatus, updateField, deleteIssue }
   ═══════════════════════════════════════════ */
export function useCatalystIssueMutations(itemId: string, onClose: () => void) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['cv-issue-detail', itemId] });

  const updateStatus = useMutation({
    mutationFn: async (newStatus: string) => {
      const cat = getStatusCategory(newStatus);
      await supabase.from('ph_issues').update({ status: newStatus, status_category: cat }).eq('id', itemId);
    },
    onSuccess: invalidate,
  });

  const updateField = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: string; oldValue?: string }) => {
      await supabase.from('ph_issues').update({ [field]: value }).eq('id', itemId);
    },
    onSuccess: invalidate,
  });

  const deleteIssue = useMutation({
    mutationFn: async () => {
      await supabase.from('ph_issues').update({ deleted_at: new Date().toISOString() }).eq('id', itemId);
    },
    onSuccess: () => {
      toast.success('Item deleted');
      onClose();
    },
  });

  return { updateStatus, updateField, deleteIssue };
}
