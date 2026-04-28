/**
 * Detail Tab — Activity (catalyst-ds replacement)
 * Reads from ph_initiative_comments + ph_initiative_audit_log.
 * Comments routed to the dedicated ph_initiative_comments table after
 * the split-table fix in migration
 * 20260428140000_jira_compare_initiative_comments_split.sql.
 * For business_request types, also reads business_request_discussions + audit_logs.
 */
import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ActivityPanel } from '@/components/catalyst-ds';
import type { CdsComment, CdsActivityItem, CdsUser, CdsQuickReply } from '@/components/catalyst-ds';

interface DetailTabActivityProps {
  initiativeId: string;
}

const QUICK_REPLIES: CdsQuickReply[] = [
  { label: 'Status update...', template: 'Status update: ' },
  { label: 'Thanks...', template: 'Thanks for the update. ' },
  { label: 'Agree...', template: 'Agreed. ' },
];

function mapComment(raw: any, profileMap: Map<string, any>): CdsComment {
  const author = profileMap.get(raw.author_id);
  return {
    id: raw.id,
    author: {
      id: raw.author_id || 'unknown',
      name: author?.full_name || author?.email || 'Unknown',
      avatarUrl: author?.avatar_url || null,
      email: author?.email,
    },
    content: raw.body || '',
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    isEdited: raw.updated_at && raw.updated_at !== raw.created_at,
  };
}

function mapAuditEntry(raw: any): CdsActivityItem {
  const action = raw.action;
  let type: CdsActivityItem['type'] = 'update';
  if (action === 'created' || action === 'create') type = 'create';
  else if (action === 'deleted' || action === 'delete') type = 'delete';

  const userName = raw.user?.full_name || 'System';

  let description: string | undefined;
  if (type !== 'update') {
    const entityLabel = (raw.entity_type || '').replace(/_/g, ' ');
    description = `${action} ${entityLabel}${raw.new_value ? ': ' + raw.new_value : ''}`.trim();
  }

  return {
    id: raw.id,
    type,
    actor: {
      id: raw.user_id || 'system',
      name: userName,
    },
    timestamp: raw.created_at,
    description,
    fieldChange: raw.field_name
      ? { field: raw.field_name, oldValue: raw.old_value, newValue: raw.new_value }
      : undefined,
  };
}

export const DetailTabActivity: React.FC<DetailTabActivityProps> = ({ initiativeId }) => {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState<CdsUser | undefined>();

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-for-mentions-approved'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .eq('approval_status', 'APPROVED')
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
  });

  const mentionableUsers: CdsUser[] = profiles.map((p: any) => ({
    id: p.id,
    name: p.full_name || p.email || 'Unknown',
    avatarUrl: p.avatar_url,
    email: p.email,
  }));

  useQuery({
    queryKey: ['current-user-for-initiative-activity'],
    enabled: profiles.length > 0,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const match = profiles.find((p: any) => p.id === user.id);
      if (match) {
        setCurrentUser({
          id: match.id,
          name: match.full_name || match.email || 'You',
          avatarUrl: match.avatar_url,
          email: match.email,
        });
      }
      return user;
    },
  });

  const { data: rawComments = [], isLoading: isLoadingComments } = useQuery({
    queryKey: ['ph-initiative-comments', initiativeId],
    queryFn: async () => {
      const { data, error } = await typedQuery('ph_initiative_comments')
        .select('id, body, author_id, created_at, updated_at')
        .eq('initiative_id', initiativeId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const profileMap = new Map(profiles.map((p: any) => [p.id, p]));

  const { data: rawAudit = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ['idp-activity', initiativeId],
    queryFn: async () => {
      const { data, error } = await typedQuery('ph_initiative_audit_log')
        .select('*, user:profiles!user_id(full_name)')
        .eq('initiative_id', initiativeId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 10_000,
  });

  const addMutation = useMutation({
    mutationFn: async (body: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await typedQuery('ph_initiative_comments').insert({
        initiative_id: initiativeId,
        body,
        author_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ph-initiative-comments', initiativeId] });
      toast.success('Comment added');
    },
    onError: () => toast.error('Failed to add comment'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await typedQuery('ph_initiative_comments').delete().eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ph-initiative-comments', initiativeId] });
      toast.success('Comment deleted');
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: string }) => {
      await typedQuery('ph_initiative_comments').update({ body, updated_at: new Date().toISOString() }).eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ph-initiative-comments', initiativeId] });
    },
  });

  const comments: CdsComment[] = rawComments.map((r: any) => mapComment(r, profileMap));
  const historyItems: CdsActivityItem[] = rawAudit.map(mapAuditEntry);

  const handleAdd = useCallback((content: string) => addMutation.mutateAsync(content), [addMutation]);
  const handleEdit = useCallback((id: string, content: string) => editMutation.mutateAsync({ id, body: content }), [editMutation]);
  const handleDelete = useCallback((id: string) => deleteMutation.mutateAsync(id), [deleteMutation]);

  return (
    <div style={{ padding: '20px 24px' }}>
      <ActivityPanel
        comments={comments}
        historyItems={historyItems}
        currentUser={currentUser}
        mentionableUsers={mentionableUsers}
        onAddComment={handleAdd}
        onEditComment={handleEdit}
        onDeleteComment={handleDelete}
        isSubmitting={addMutation.isPending}
        isLoadingComments={isLoadingComments}
        isLoadingHistory={isLoadingHistory}
        quickReplies={QUICK_REPLIES}
        defaultTab="all"
        defaultSortOrder="newest"
      />
    </div>
  );
};

export default DetailTabActivity;
