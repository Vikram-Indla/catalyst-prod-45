/**
 * CatalystActivitySection — catalyst-ds replacement.
 * Merges BOTH Catalyst-native data (ph_comments + ph_activity_log)
 * AND Jira-synced data (jira_sync_comments + jira_sync_changelog).
 * Looks up issue_key from ph_issues to join Jira tables.
 */
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ActivityPanel } from '@/components/catalyst-ds';
import type { CdsComment, CdsActivityItem, CdsUser, CdsQuickReply } from '@/components/catalyst-ds';

interface CatalystActivitySectionProps {
  itemId: string;
  isOpen: boolean;
}

const QUICK_REPLIES: CdsQuickReply[] = [
  { label: 'Status update...', template: 'Status update: ' },
  { label: 'Thanks...', template: 'Thanks for the update. ' },
  { label: 'Agree...', template: 'Agreed. ' },
];

function mapCatalystComment(raw: any): CdsComment {
  return {
    id: raw.id,
    author: {
      id: raw.author_id || 'unknown',
      name: raw.author?.full_name || raw.author?.email || 'Unknown',
      avatarUrl: raw.author?.avatar_url || null,
      email: raw.author?.email,
    },
    content: raw.body || '',
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    isEdited: raw.updated_at && raw.updated_at !== raw.created_at,
  };
}

function mapJiraComment(raw: any): CdsComment {
  return {
    id: `jira-${raw.id}`,
    author: {
      id: raw.author_account_id || 'jira',
      name: raw.author_display_name || 'Jira User',
      avatarUrl: raw.author_avatar_url || null,
    },
    content: raw.body || '',
    createdAt: raw.jira_created_at || raw.created_at,
  };
}

function mapCatalystActivity(raw: any): CdsActivityItem {
  const action = raw.action;
  let type: CdsActivityItem['type'] = 'update';
  if (action === 'created' || action === 'create') type = 'create';
  else if (action === 'deleted' || action === 'delete') type = 'delete';

  return {
    id: raw.id,
    type,
    actor: {
      id: raw.user_id || 'system',
      name: raw.actor?.full_name || 'System',
      avatarUrl: raw.actor?.avatar_url || null,
    },
    timestamp: raw.created_at,
    description: type === 'create' ? 'created this item' : undefined,
    fieldChange: raw.field_name
      ? { field: raw.field_name, oldValue: raw.old_value, newValue: raw.new_value }
      : undefined,
  };
}

function mapJiraChangelog(raw: any): CdsActivityItem {
  return {
    id: `jira-cl-${raw.id}`,
    type: 'update',
    actor: {
      id: raw.author_account_id || 'jira',
      name: raw.author_display_name || 'Jira',
      avatarUrl: raw.author_avatar_url || null,
    },
    timestamp: raw.jira_created_at || raw.created_at,
    fieldChange: {
      field: raw.field_name || 'unknown',
      oldValue: raw.from_string || raw.from_value || null,
      newValue: raw.to_string || raw.to_value || null,
    },
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

  // Look up issue_key for Jira table joins
  const { data: issueKey } = useQuery({
    queryKey: ['issue-key-lookup', itemId],
    enabled: !!itemId && isOpen,
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_issues')
        .select('issue_key')
        .eq('id', itemId)
        .single();
      return data?.issue_key || null;
    },
  });

  // Catalyst-native comments (ph_comments)
  const { data: catalystComments = [], isLoading: loadingCatalystComments } = useQuery({
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
      const { data: authorProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .in('id', authorIds);
      const profileMap = new Map((authorProfiles ?? []).map(p => [p.id, p]));
      return data.map(c => ({ ...c, author: profileMap.get(c.author_id) ?? null }));
    },
  });

  // Jira-synced comments (jira_sync_comments)
  const { data: jiraComments = [], isLoading: loadingJiraComments } = useQuery({
    queryKey: ['jira-sync-comments', issueKey],
    enabled: !!issueKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jira_sync_comments')
        .select('id, issue_key, jira_comment_id, author_display_name, author_account_id, author_avatar_url, body, jira_created_at, created_at')
        .eq('issue_key', issueKey!)
        .order('jira_created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // Catalyst-native activity (ph_activity_log)
  const { data: catalystActivity = [], isLoading: loadingCatalystActivity } = useQuery({
    queryKey: ['cv-activity', itemId],
    enabled: !!itemId && isOpen,
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_activity_log')
        .select('id, work_item_id, action, field_name, old_value, new_value, user_id, metadata, created_at')
        .eq('work_item_id', itemId)
        .order('created_at', { ascending: false });
      if (!data?.length) return [];
      const userIds = [...new Set(data.map(e => e.user_id).filter(Boolean))];
      const { data: actorProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .in('id', userIds);
      const profileMap = new Map((actorProfiles ?? []).map(p => [p.id, p]));
      return data.map(e => ({ ...e, actor: profileMap.get(e.user_id) ?? null }));
    },
  });

  // Jira-synced changelog (jira_sync_changelog)
  const { data: jiraChangelog = [], isLoading: loadingJiraChangelog } = useQuery({
    queryKey: ['jira-sync-changelog', issueKey],
    enabled: !!issueKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jira_sync_changelog')
        .select('id, issue_key, author_display_name, author_account_id, author_avatar_url, field_name, from_value, to_value, from_string, to_string, jira_created_at, created_at')
        .eq('issue_key', issueKey!)
        .order('jira_created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Merge comments: Catalyst + Jira
  const allComments: CdsComment[] = [
    ...catalystComments.map(mapCatalystComment),
    ...jiraComments.map(mapJiraComment),
  ];

  // Merge history: Catalyst + Jira
  const allHistory: CdsActivityItem[] = [
    ...catalystActivity.map(mapCatalystActivity),
    ...jiraChangelog.map(mapJiraChangelog),
  ];

  const isLoadingComments = loadingCatalystComments || loadingJiraComments;
  const isLoadingHistory = loadingCatalystActivity || loadingJiraChangelog;

  // Mutations write to Catalyst-native tables only
  const addMutation = useMutation({
    mutationFn: async (body: string) => {
      await supabase.from('ph_comments').insert({
        work_item_id: itemId,
        body,
        author_id: user!.id,
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
        comments={allComments}
        historyItems={allHistory}
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
}
