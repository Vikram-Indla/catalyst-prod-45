/**
 * useMentionSuggestions — returns the canonical list of users to surface
 * in the comment-mention pill. 6-tier weighted scoring:
 *
 *   1. Issue assignee + reporter            (ph_issues  → profiles by jira_account_id)
 *   2. Issue watchers                       (ph_issue_watchers.user_id → profiles)
 *   3. Recent comment authors on the issue  (ph_comments.author_id → profiles, 30 most recent)
 *   4. Project members                      (ph_project_members.user_id → profiles)
 *   4.5 Collaborators                       (collaboration_scores — nightly pre-computed)
 *   5. Fallback: globally recent commenters (when (1-4.5) yield < 5 results)
 *
 * Returns deduped profile rows in priority order — issue participants
 * appear before project members which appear before collaborators
 * which appear before global-recent.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface MentionUser {
  id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
}

async function fetchProfilesByIds(ids: string[]): Promise<MentionUser[]> {
  if (ids.length === 0) return [];
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .in('id', ids);
  return (data || []) as MentionUser[];
}

async function fetchProfilesByJiraAccountIds(
  accountIds: string[],
): Promise<MentionUser[]> {
  if (accountIds.length === 0) return [];
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .in('jira_account_id', accountIds);
  return (data || []) as MentionUser[];
}

export function useMentionSuggestions(workItemId: string | undefined) {
  const { user } = useAuth();
  const currentUserId = user?.id;
  return useQuery({
    queryKey: ['mention-suggestions', workItemId, currentUserId],
    enabled: !!workItemId && workItemId !== 'new-comment',
    staleTime: 60_000,
    queryFn: async (): Promise<MentionUser[]> => {
      if (!workItemId) return [];
      const seen = new Set<string>();
      const ordered: MentionUser[] = [];
      const push = (u: MentionUser | undefined | null) => {
        if (!u || !u.id || !u.full_name || seen.has(u.id)) return;
        seen.add(u.id);
        ordered.push(u);
      };

      // ── 1. Issue assignee + reporter (Jira account ids → profiles) ──
      const { data: issue } = await supabase
        .from('ph_issues')
        .select('assignee_account_id, reporter_account_id, project_key')
        .eq('id', workItemId)
        .maybeSingle();

      const jiraAccountIds = [
        issue?.assignee_account_id,
        issue?.reporter_account_id,
      ].filter((v): v is string => typeof v === 'string' && v.length > 0);
      const fromAccountIds = await fetchProfilesByJiraAccountIds(jiraAccountIds);
      fromAccountIds.forEach(push);

      // ── 2. Watchers ──
      const { data: watcherRows } = await supabase
        .from('ph_issue_watchers')
        .select('user_id')
        .eq('work_item_id', workItemId)
        .limit(30);
      const watcherIds = (watcherRows || [])
        .map((r: { user_id: string | null }) => r.user_id)
        .filter((v): v is string => typeof v === 'string');
      (await fetchProfilesByIds(watcherIds)).forEach(push);

      // ── 3. Recent comment authors on this issue ──
      const { data: commenterRows } = await supabase
        .from('ph_comments')
        .select('author_id')
        .eq('work_item_id', workItemId)
        .order('created_at', { ascending: false })
        .limit(30);
      const commenterIds = (commenterRows || [])
        .map((r: { author_id: string | null }) => r.author_id)
        .filter((v): v is string => typeof v === 'string');
      (await fetchProfilesByIds(commenterIds)).forEach(push);

      // ── 4. Project members ──
      if (issue?.project_key) {
        const { data: project } = await supabase
          .from('ph_jira_projects')
          .select('id')
          .eq('key', issue.project_key)
          .maybeSingle();
        if (project?.id) {
          const { data: memberRows } = await supabase
            .from('ph_project_members')
            .select('user_id')
            .eq('project_id', project.id)
            .limit(50);
          const memberIds = (memberRows || [])
            .map((r: { user_id: string | null }) => r.user_id)
            .filter((v): v is string => typeof v === 'string');
          (await fetchProfilesByIds(memberIds)).forEach(push);
        }
      }

      // ── 4.5 Collaborators (from nightly-computed collaboration_scores) ──
      if (currentUserId) {
        const { data: collabRows } = await supabase
          .from('collaboration_scores')
          .select('collaborator_id')
          .eq('user_id', currentUserId)
          .order('score', { ascending: false })
          .limit(20);
        const collabIds = (collabRows || [])
          .map((r: { collaborator_id: string }) => r.collaborator_id)
          .filter((v): v is string => typeof v === 'string');
        (await fetchProfilesByIds(collabIds)).forEach(push);
      }

      // ── 5. Fallback — globally recent commenters ──
      if (ordered.length < 5) {
        const { data: recent } = await supabase
          .from('ph_comments')
          .select('author_id')
          .order('created_at', { ascending: false })
          .limit(40);
        const recentIds = (recent || [])
          .map((r: { author_id: string | null }) => r.author_id)
          .filter((v): v is string => typeof v === 'string');
        (await fetchProfilesByIds(recentIds)).forEach(push);
      }

      return ordered;
    },
  });
}
