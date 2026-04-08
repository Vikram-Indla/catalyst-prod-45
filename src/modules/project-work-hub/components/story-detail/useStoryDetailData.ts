/**
 * useStoryDetailData — All TanStack Query hooks for Story Detail View
 * Reads from ph_issues, jira_sync_comments, jira_sync_changelog
 * Writes back to ph_issues + jira_write_back_queue
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ─── READ: Story detail ──────────────────────────────────────
export function useStoryDetail(storyId: string | null) {
  return useQuery({
    queryKey: ['story-detail-page', storyId],
    queryFn: async () => {
      if (!storyId) return null;
      const { data, error } = await supabase
        .from('ph_issues')
        .select('id, issue_key, summary, description_text, status, status_category, priority, assignee_display_name, reporter_display_name, due_date, labels, parent_key, parent_summary, fix_versions, jira_created_at, jira_updated_at, issue_type, project_id')
        .eq('id', storyId)
        .single();
      if (error) throw error;

      // Resolve parent if exists
      let parentEpic: { id: string; epic_key: string | null; name: string } | null = null;
      if (data.parent_key) {
        const { data: epic } = await supabase
          .from('ph_issues')
          .select('id, issue_key, summary')
          .eq('issue_key', data.parent_key)
          .single();
        if (epic) parentEpic = { id: epic.id, epic_key: epic.issue_key, name: epic.summary };
      }
      return { ...data, parentEpic };
    },
    enabled: !!storyId,
  });
}

// ─── READ: Comments ──────────────────────────────────────────
export function useStoryComments(issueKey: string | null) {
  return useQuery({
    queryKey: ['story-detail-comments', issueKey],
    queryFn: async () => {
      if (!issueKey) return [];
      const { data } = await supabase
        .from('jira_sync_comments')
        .select('id, author_display_name, body, jira_created_at')
        .eq('issue_key', issueKey)
        .order('jira_created_at', { ascending: false });
      return data || [];
    },
    enabled: !!issueKey,
  });
}

// ─── READ: Changelog / History ───────────────────────────────
export function useStoryHistory(issueKey: string | null) {
  return useQuery({
    queryKey: ['story-detail-history', issueKey],
    queryFn: async () => {
      if (!issueKey) return [];
      const { data } = await supabase
        .from('jira_sync_changelog')
        .select('id, author_display_name, field_name, from_string, to_string, jira_created_at')
        .eq('issue_key', issueKey)
        .order('jira_created_at', { ascending: false });
      return data || [];
    },
    enabled: !!issueKey,
  });
}

// ─── READ: Sibling stories for prev/next nav ────────────────
export function useStorySiblings(projectId: string) {
  return useQuery({
    queryKey: ['story-detail-siblings', projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_issues')
        .select('id, issue_key, summary')
        .eq('project_id', projectId)
        .in('issue_type', ['Story', 'story'])
        .order('jira_created_at', { ascending: false })
        .limit(200);
      return data || [];
    },
    enabled: !!projectId,
  });
}

// ─── READ: Parent candidates (epics/features) ───────────────
export function useParentCandidates(projectId: string) {
  return useQuery({
    queryKey: ['story-detail-parents', projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_issues')
        .select('id, issue_key, summary, issue_type')
        .eq('project_id', projectId)
        .in('issue_type', ['Epic', 'epic', 'Feature', 'feature'])
        .order('summary');
      return data || [];
    },
    enabled: !!projectId,
  });
}

// ─── READ: Team members for assignee/reporter pickers ───────
export function useTeamMembers() {
  return useQuery({
    queryKey: ['story-detail-team'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, display_name, email, avatar_url')
        .order('display_name');
      return data || [];
    },
  });
}

// ─── WRITE: Update a field on ph_issues ─────────────────────
export function useUpdateStoryField(storyId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ field, value }: { field: string; value: any }) => {
      if (!storyId) return;
      const updates: Record<string, any> = { [field]: value };

      // Auto-derive status_category on status change
      if (field === 'status') {
        const done = ['Done', 'In Production', 'Closed', 'Released', 'Production Ready', 'Beta Ready'];
        const inProgress = ['In Progress', 'In Development', 'In QA', 'In UAT', 'In BETA', 'BETA READY', 'In Review', 'On Hold', 'In Entity Integration', 'End to End Testing'];
        if (done.includes(value)) updates.status_category = 'Done';
        else if (inProgress.includes(value)) updates.status_category = 'In Progress';
        else updates.status_category = 'To Do';
      }

      const { error } = await supabase.from('ph_issues').update(updates).eq('id', storyId);
      if (error) throw error;

      // Enqueue Jira write-back if connection active
      try {
        const { data: issueRow } = await supabase
          .from('ph_issues')
          .select('issue_key')
          .eq('id', storyId)
          .single();

        if (issueRow?.issue_key) {
          const { data: connection } = await supabase
            .from('jira_connections')
            .select('is_active')
            .limit(1)
            .maybeSingle();

          if (connection?.is_active) {
            await supabase.from('jira_write_back_queue').insert({
              issue_key: issueRow.issue_key,
              operation: 'update',
              field_name: field,
              new_value: String(value ?? ''),
              status: 'pending',
              created_at: new Date().toISOString(),
            });
          }
        }
      } catch {
        // Non-critical — don't block the update
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['story-detail-page', storyId] });
      queryClient.invalidateQueries({ queryKey: ['story-detail-history'] });
      queryClient.invalidateQueries({ queryKey: ['backlog-stories'] });
    },
    onError: () => toast.error('Failed to update field'),
  });
}

// ─── WRITE: Add comment ─────────────────────────────────────
export function useAddStoryComment(issueKey: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ body, authorName }: { body: string; authorName: string }) => {
      if (!issueKey) throw new Error('No issue key');
      const { error } = await supabase.from('jira_sync_comments').insert({
        issue_key: issueKey,
        body,
        author_display_name: authorName,
        jira_created_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['story-detail-comments', issueKey] });
      toast.success('Comment added');
    },
    onError: () => toast.error('Failed to add comment'),
  });
}

// ─── WRITE: Delete comment ──────────────────────────────────
export function useDeleteStoryComment(issueKey: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase.from('jira_sync_comments').delete().eq('id', commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['story-detail-comments', issueKey] });
      toast.success('Comment deleted');
    },
    onError: () => toast.error('Failed to delete comment'),
  });
}
