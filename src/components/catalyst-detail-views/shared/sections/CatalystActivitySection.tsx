/**
 * CatalystActivitySection — catalyst-ds Activity panel.
 * Reads from unified Catalyst tables only. Jira-synced comments/history are
 * mirrored into ph_comments/ph_activity_log by wh-jira-sync and wh-jira-bulk-sync,
 * so a single query per source covers both Catalyst-native and Jira rows.
 */
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ActivityPanel } from '@/components/catalyst-ds';
import type { CdsComment, CdsActivityItem, CdsUser, CdsQuickReply, JiraUserMap } from '@/components/catalyst-ds';

interface CatalystActivitySectionProps {
  itemId: string;
  isOpen: boolean;
}

const QUICK_REPLIES: CdsQuickReply[] = [
  { label: 'Status update...', template: 'Status update: ' },
  { label: 'Thanks...', template: 'Thanks for the update. ' },
  { label: 'Agree...', template: 'Agreed. ' },
];

function mapComment(raw: any): CdsComment {
  const isJira = raw.source === 'jira';
  const profile = raw.author;
  return {
    id: raw.id,
    author: {
      id: raw.author_id || raw.jira_author_account_id || 'unknown',
      name: profile?.full_name
        || profile?.email
        || raw.jira_author_display_name
        || (isJira ? 'Jira User' : 'Unknown'),
      avatarUrl: profile?.avatar_url || raw.jira_author_avatar_url || null,
      email: profile?.email,
    },
    content: raw.body || '',
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    isEdited: !isJira && raw.updated_at && raw.updated_at !== raw.created_at,
  };
}

function mapActivity(raw: any): CdsActivityItem {
  const isJira = raw.source === 'jira';
  const profile = raw.actor;
  const action = raw.action;
  let type: CdsActivityItem['type'] = 'update';
  if (action === 'created' || action === 'create') type = 'create';
  else if (action === 'deleted' || action === 'delete') type = 'delete';

  return {
    id: raw.id,
    type,
    actor: {
      id: raw.user_id || raw.jira_author_account_id || 'system',
      name: profile?.full_name
        || raw.jira_author_display_name
        || (isJira ? 'Jira' : 'System'),
      avatarUrl: profile?.avatar_url || raw.jira_author_avatar_url || null,
    },
    timestamp: raw.created_at,
    description: type === 'create' ? 'created this item' : undefined,
    fieldChange: raw.field_name
      ? { field: raw.field_name, oldValue: raw.old_value, newValue: raw.new_value }
      : undefined,
  };
}

export function CatalystActivitySection({ itemId, isOpen }: CatalystActivitySectionProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
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

  // Jira accountId -> display name map, used to render [~accountid:xxx] mentions
  // in historical descriptions / summaries as @Name.
  const { data: jiraUserMap = {} as JiraUserMap } = useQuery({
    queryKey: ['jira-user-map'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_user_mapping')
        .select('jira_account_id, jira_display_name, catalyst_profile_id');
      const map: JiraUserMap = {};
      for (const row of data || []) {
        if (row.jira_account_id && row.jira_display_name) {
          map[row.jira_account_id] = row.jira_display_name;
        }
      }
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });

  useQuery({
    queryKey: ['current-user-profile', user?.id],
    enabled: !!user?.id && profiles.length > 0,
    queryFn: async () => {
      const match = profiles.find((p: any) => p.id === user!.id);
      if (match) {
        setCurrentUser({
          id: match.id,
          name: match.full_name || match.email || 'You',
          avatarUrl: match.avatar_url,
          email: match.email,
        });
      }
      return match;
    },
  });

  // Comments: ph_comments (Catalyst-native + Jira-mirrored)
  const { data: comments = [], isLoading: isLoadingComments } = useQuery({
    queryKey: ['cv-comments', itemId],
    enabled: !!itemId && isOpen,
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_comments')
        .select('id, work_item_id, body, author_id, created_at, updated_at')
        .eq('work_item_id', itemId)
        .order('created_at', { ascending: true });
      if (!data?.length) return [];
      const authorIds = [...new Set(data.map(c => c.author_id).filter(Boolean))];
      if (authorIds.length === 0) return data.map(c => ({ ...c, author: null }));
      const { data: authorProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .in('id', authorIds);
      const profileMap = new Map((authorProfiles ?? []).map(p => [p.id, p]));
      return data.map(c => ({ ...c, author: c.author_id ? profileMap.get(c.author_id) ?? null : null }));
    },
  });

  // History: ph_activity_log (Catalyst-native + Jira-mirrored)
  const { data: historyItems = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ['cv-activity', itemId],
    enabled: !!itemId && isOpen,
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_activity_log')
        .select('id, work_item_id, action, field_name, old_value, new_value, user_id, metadata, created_at, source, jira_author_account_id, jira_author_display_name, jira_author_avatar_url')
        .eq('work_item_id', itemId)
        .order('created_at', { ascending: false });
      if (!data?.length) return [];
      const userIds = [...new Set(data.map(e => e.user_id).filter(Boolean))];
      if (userIds.length === 0) return data.map(e => ({ ...e, actor: null }));
      const { data: actorProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .in('id', userIds);
      const profileMap = new Map((actorProfiles ?? []).map(p => [p.id, p]));
      return data.map(e => ({ ...e, actor: e.user_id ? profileMap.get(e.user_id) ?? null : null }));
    },
  });

  const mappedComments: CdsComment[] = comments.map(mapComment);
  const mappedHistory: CdsActivityItem[] = historyItems.map(mapActivity);

  // Mutations — Catalyst-native comments only (source='catalyst')
  const addMutation = useMutation({
    mutationFn: async (body: string) => {
      await supabase.from('ph_comments').insert({
        work_item_id: itemId,
        body,
        author_id: user!.id,
        source: 'catalyst',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cv-comments', itemId] });
      toast.success('Comment added');
    },
    onError: () => toast.error('Failed to add comment'),
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: string }) => {
      await supabase.from('ph_comments').update({ body, updated_at: new Date().toISOString() }).eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cv-comments', itemId] });
      toast.success('Comment updated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('ph_comments').delete().eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cv-comments', itemId] });
      toast.success('Comment deleted');
    },
  });

  const handleAdd = useCallback((content: string) => addMutation.mutateAsync(content), [addMutation]);
  const handleEdit = useCallback((id: string, content: string) => editMutation.mutateAsync({ id, body: content }), [editMutation]);
  const handleDelete = useCallback((id: string) => deleteMutation.mutateAsync(id), [deleteMutation]);

  return (
    <div style={{ borderTop: '1px solid #EBECF0', paddingTop: 20, marginTop: 8 }}>
      <ActivityPanel
        comments={mappedComments}
        historyItems={mappedHistory}
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
        jiraUserMap={jiraUserMap}
      />
    </div>
  );
}
