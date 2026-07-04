/**
 * CatalystActivitySection — catalyst-ds Activity panel.
 * Reads from unified Catalyst tables only. Jira-synced comments/history are
 * mirrored into ph_comments/ph_activity_log by wh-jira-sync and wh-jira-bulk-sync,
 * so a single query per source covers both Catalyst-native and Jira rows.
 */
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { catalystToast } from '@/lib/catalystToast';
import { ActivityPanel } from '@/components/catalyst-ds';
import type { CdsComment, CdsActivityItem, CdsUser, CdsQuickReply, JiraUserMap, CdsCommentReaction } from '@/components/catalyst-ds';
import { resolveAvatarUrl } from '@/lib/avatars';
import { CommentsSummaryCard } from '@/components/catalyst-detail-views/improve/CommentsSummaryCard';
import { useCommentsSummaryStream } from '@/components/catalyst-detail-views/improve/useCommentsSummaryStream';
import { useCatySummarize } from '@/components/catalyst-detail-views/improve/catySummarizeStore';
import { useAiSummaryFeedback } from '@/components/catalyst-detail-views/improve/useAiSummaryFeedback';
import { useInteractionRecorder } from '@/hooks/useInteractionRecorder';
import { useGlobalSearchStore } from '@/store/globalSearchStore';
import type { ActivityTabKey } from '@/components/catalyst-ds/activity/ActivityPanel';

interface CatalystActivitySectionProps {
  itemId: string;
  isOpen: boolean;
}

const QUICK_REPLIES: CdsQuickReply[] = [
  { label: 'Suggest a reply...', template: '' },
  { label: 'Can I get more info...?', template: 'Can I get more info on ' },
  { label: 'Status update...', template: 'Status update: ' },
];

function mapComment(raw: any): CdsComment {
  const isJira = raw.source === 'jira';
  const profile = raw.author;
  const rawType = raw.comment_type;
  const commentType: CdsComment['commentType'] =
    rawType === 'flag_added' || rawType === 'flag_removed' ? rawType : 'normal';
  return {
    id: raw.id,
    author: {
      id: raw.author_id || raw.jira_author_account_id || 'unknown',
      name: profile?.full_name
        || profile?.email
        || raw.jira_author_display_name
        || (isJira ? 'Jira User' : 'Unknown'),
      avatarUrl: resolveAvatarUrl(profile?.full_name ?? raw.jira_author_display_name) ?? profile?.avatar_url ?? raw.jira_author_avatar_url ?? null,
      email: profile?.email,
    },
    content: raw.body || '',
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    isEdited: !isJira && raw.updated_at && raw.updated_at !== raw.created_at,
    commentType,
    parentId: raw.parent_comment_id ?? null,
  };
}

function mapActivity(raw: any, projectKey?: string): CdsActivityItem {
  const isJira = raw.source === 'jira';
  const profile = raw.actor;
  const action = raw.action;
  let type: CdsActivityItem['type'] = 'update';
  if (action === 'created' || action === 'create') type = 'create';
  else if (action === 'deleted' || action === 'delete') type = 'delete';

  /* Phase 7b: surface a "during standup" pill when the activity row was
     emitted during a standup. metadata.standup_id is the standup pk.
     Standups consolidated into Kanban board (2026-06-15); removed dedicated
     standup detail page. Standup context is still rendered as a pill but
     is no longer clickable. */
  const standupId = raw.metadata?.standup_id as string | undefined;
  const standupContext = standupId ? { standupId, href: undefined } : undefined;

  return {
    id: raw.id,
    type,
    actor: {
      id: raw.user_id || raw.jira_author_account_id || 'system',
      name: profile?.full_name
        || raw.jira_author_display_name
        || (isJira ? 'Jira' : 'System'),
      avatarUrl: resolveAvatarUrl(profile?.full_name ?? raw.jira_author_display_name) ?? profile?.avatar_url ?? raw.jira_author_avatar_url ?? null,
    },
    timestamp: raw.created_at,
    description: type === 'create' ? 'created this item' : undefined,
    fieldChange: raw.field_name
      ? { field: raw.field_name, oldValue: raw.old_value, newValue: raw.new_value }
      : undefined,
    standupContext,
  };
}

export function CatalystActivitySection({ itemId, isOpen }: CatalystActivitySectionProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { onCommentSaved } = useInteractionRecorder();
  const [currentUser, setCurrentUser] = useState<CdsUser | undefined>();

  // Apr 28 2026 (cycle 8 fix — silent comments-system bug):
  //   `ph_comments.work_item_id` AND `ph_activity_log.work_item_id`
  //   are both `uuid` columns (verified via Postgres 22P02 error
  //   probe on 2026-04-28). The component is passed `itemId` which
  //   the F-iter9 era set to `issue_key` (a text "BAU-5711"). Every
  //   `eq('work_item_id', itemId)` query and every insert silently
  //   threw a type-mismatch error → all comments / activity log
  //   reads returned empty, all comment writes failed quietly.
  //   Fix: resolve the UUID for the row's PK once via ph_issues
  //   lookup, then thread the resolved UUID through every
  //   downstream query + mutation. Cached for the open lifetime.
  //   When `itemId` already looks like a UUID (catalyst-native
  //   rows might pass it directly), the lookup short-circuits.
  const isLikelyUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
  // 2026-05-21: extended the lookup to also return `issue_key` so the
  // CommentsSummaryCard / useCommentsSummaryStream can match against the
  // store's `payload.issueKey` without adding a new prop to every caller.
  const { data: resolvedRef } = useQuery({
    queryKey: ['cv-resolve-work-item-ref', itemId],
    enabled: !!itemId && isOpen,
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<{
      id: string;
      issue_key: string | null;
      issue_type: string | null;
      summary: string | null;
    } | null> => {
      if (!itemId) return null;
      const column = isLikelyUuid(itemId) ? 'id' : 'issue_key';
      const { data } = await supabase
        .from('ph_issues')
        .select('id, issue_key, issue_type, summary')
        .eq(column, itemId)
        .maybeSingle();
      if (!data) return null;
      const row = data as {
        id: string;
        issue_key?: string | null;
        issue_type?: string | null;
        summary?: string | null;
      };
      return {
        id: row.id,
        issue_key: row.issue_key ?? null,
        issue_type: row.issue_type ?? null,
        summary: row.summary ?? null,
      };
    },
  });
  const resolvedWorkItemId = resolvedRef?.id ?? null;
  const resolvedIssueKey = resolvedRef?.issue_key ?? null;
  const improveContext = resolvedIssueKey
    ? {
        issueKey: resolvedIssueKey,
        issueType: resolvedRef?.issue_type ?? null,
        issueSummary: resolvedRef?.summary ?? null,
      }
    : undefined;

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

  const mentionableUsers: CdsUser[] = profiles
    .filter((p: any) => p.full_name || p.email)
    .map((p: any) => ({
      id: p.id,
      name: p.full_name || p.email,
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

  // Seed currentUser from the raw auth.uid() as soon as it's available so
  // author-owned affordances (edit / delete pencil) render on first paint
  // instead of waiting for the profile-lookup query below to complete.
  useEffect(() => {
    if (!user?.id) return;
    setCurrentUser((prev) => (prev?.id === user.id ? prev : { id: user.id, name: 'You' }));
  }, [user?.id]);

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
  // Realtime subscription (below) handles live updates — polling removed
  // to eliminate dual-fetch heap pressure (was 4s poll + realtime).
  const { data: comments = [], isLoading: isLoadingComments } = useQuery({
    queryKey: ['cv-comments', resolvedWorkItemId],
    enabled: !!resolvedWorkItemId && isOpen,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      // Use SELECT * so the query stays robust whether or not the
      // 20260604_add_parent_comment_id_to_ph_comments migration has
      // been applied yet. mapComment reads raw.parent_comment_id with
      // a null coalesce — missing column → null → treated as top
      // level. Once the migration lands, threading lights up
      // automatically for new replies.
      const { data, error } = await supabase
        .from('ph_comments')
        .select('*')
        .eq('work_item_id', resolvedWorkItemId!)
        .order('created_at', { ascending: true });
      if (error) {
        console.error('[CatalystActivitySection] ph_comments select failed', error);
        return [];
      }
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

  // Reactions: ph_comment_reactions, scoped to the loaded comment ids.
  // Refetches when the comments list changes (new comment / delete) so
  // newly-added rows show up immediately.
  const commentIds = useMemo(
    () => comments.map((c) => c.id),
    [comments],
  );
  const { data: reactionRows = [] } = useQuery({
    queryKey: ['cv-comment-reactions', resolvedWorkItemId, commentIds],
    enabled: !!resolvedWorkItemId && isOpen && commentIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_comment_reactions')
        .select('id, comment_id, user_id, emoji, created_at')
        .in('comment_id', commentIds)
        .order('created_at', { ascending: true });
      return data ?? [];
    },
  });

  // Aggregate raw reaction rows into per-comment groups with count +
  // hasMine. Iteration preserves first-applied order — the chip you
  // added first stays leftmost in the toolbar.
  const reactionsByCommentId = useMemo(() => {
    const map = new Map<string, CdsCommentReaction[]>();
    const me = user?.id ?? null;
    for (const row of reactionRows) {
      const list = map.get(row.comment_id) ?? [];
      const existing = list.find((r) => r.emoji === row.emoji);
      if (existing) {
        existing.count += 1;
        if (row.user_id === me) existing.hasMine = true;
      } else {
        list.push({
          emoji: row.emoji,
          count: 1,
          hasMine: row.user_id === me,
        });
        map.set(row.comment_id, list);
      }
    }
    return map;
  }, [reactionRows, user?.id]);

  // Live updates — subscribe to Supabase Realtime on ph_activity_log
  // and ph_comments filtered by this work item. Inserts/updates/
  // deletes invalidate the React Query caches so the All / History /
  // Comments tabs reflect changes instantly (no refresh needed).
  useEffect(() => {
    if (!resolvedWorkItemId || !isOpen) return;
    // Unique suffix per subscription — supabase.channel() returns the
    // EXISTING channel if one with the same topic already exists (e.g.
    // React StrictMode double-mount, or two panels open for the same
    // item). Calling .on() on an already-subscribed channel throws
    // "cannot add postgres_changes callbacks after subscribe()".
    // Uniquifying the topic guarantees a fresh channel every effect run.
    const uniq =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? (crypto as any).randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(`cv-activity-realtime:${resolvedWorkItemId}:${uniq}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ph_activity_log',
          filter: `work_item_id=eq.${resolvedWorkItemId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['cv-activity', resolvedWorkItemId] });
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ph_comments',
          filter: `work_item_id=eq.${resolvedWorkItemId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['cv-comments', resolvedWorkItemId] });
          queryClient.invalidateQueries({ queryKey: ['cv-comment-reactions', resolvedWorkItemId] });
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ph_comment_reactions',
        },
        () => {
          // No work_item_id column on reactions — invalidate all
          // reaction queries scoped to this work item.
          queryClient.invalidateQueries({ queryKey: ['cv-comment-reactions', resolvedWorkItemId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [resolvedWorkItemId, isOpen, queryClient]);

  // History: ph_activity_log (Catalyst-native + Jira-mirrored).
  // Realtime subscription handles live updates — polling removed.
  // Limit 200 most recent entries to bound heap allocation on long-lived issues.
  const { data: historyItems = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ['cv-activity', resolvedWorkItemId],
    enabled: !!resolvedWorkItemId && isOpen,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_activity_log')
        .select('id, work_item_id, action, field_name, old_value, new_value, user_id, metadata, created_at')
        .eq('work_item_id', resolvedWorkItemId!)
        // Exclude comment-field changelog entries — Jira's API changelog records
        // comment additions as field_name='comment' rows in ph_activity_log.
        // These are already rendered in the Comments feed (from ph_comments);
        // including them here creates a visual duplicate in the All tab.
        .neq('field_name', 'comment')
        .order('created_at', { ascending: false })
        .limit(200);
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

  const mappedComments: CdsComment[] = comments.map((c) => {
    const base = mapComment(c);
    const reactions = reactionsByCommentId.get(c.id);
    return reactions ? { ...base, reactions } : base;
  });
  const projectKeyForRouting = resolvedRef?.issue_key?.split('-')[0] ?? undefined;
  const mappedHistory: CdsActivityItem[] = historyItems.map(h => mapActivity(h, projectKeyForRouting));

  // Mutations — Catalyst-native comments only (source='catalyst')
  const addMutation = useMutation({
    mutationFn: async ({ body, parentId }: { body: string; parentId?: string | null }) => {
      if (!resolvedWorkItemId) throw new Error('Work item not resolved yet — try again in a moment.');
      // Apr 28 2026 (cycle 8 fix): dropped `source: 'catalyst'` from
      // the insert payload — `ph_comments` has no `source` column
      // (verified columns: id / work_item_id / author_id / body /
      // parent_comment_id / created_at / updated_at).
      await supabase.from('ph_comments').insert({
        work_item_id: resolvedWorkItemId,
        body,
        author_id: user!.id,
        parent_comment_id: parentId ?? null,
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cv-comments', resolvedWorkItemId] });
      catalystToast.success(variables.parentId ? 'Reply added' : 'Comment added');

      // Record interactions + create mention notifications (non-blocking)
      if (resolvedWorkItemId) {
        onCommentSaved({
          body: variables.body,
          workItemId: resolvedWorkItemId,
          projectKey: resolvedRef?.issue_key?.split('-')[0] ?? undefined,
        });
      }
    },
    onError: () => catalystToast.error('Failed to add comment'),
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: string }) => {
      await supabase.from('ph_comments').update({ body, updated_at: new Date().toISOString() }).eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cv-comments', resolvedWorkItemId] });
      catalystToast.success('Comment updated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Look up the body so we can clean up any uploaded images.
      const { data: row } = await supabase
        .from('ph_comments')
        .select('body')
        .eq('id', id)
        .maybeSingle();
      const body = (row as { body?: string } | null)?.body ?? '';
      const paths: string[] = [];
      const re = /!\[[^\]]*\]\(([^)]+)\)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(body)) !== null) {
        const url = m[1];
        const marker = '/storage/v1/object/public/attachments/';
        const idx = url.indexOf(marker);
        if (idx !== -1) paths.push(url.slice(idx + marker.length));
      }
      if (paths.length > 0) {
        await supabase.storage.from('attachments').remove(paths);
      }
      await supabase.from('ph_comments').delete().eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cv-comments', resolvedWorkItemId] });
      catalystToast.success('Comment deleted');
    },
  });

  // Toggle a reaction on a comment. Single mutation that either
  // inserts a row (this user did not have this emoji yet) or deletes
  // a row (already had it → remove). Wrapped in optimistic mutations
  // via the React-Query refetch on success so the chip count updates
  // immediately on the toolbar.
  const toggleReactionMutation = useMutation({
    mutationFn: async ({
      commentId,
      emoji,
      hasMine,
    }: {
      commentId: string;
      emoji: string;
      hasMine: boolean;
    }) => {
      if (!user?.id) return;
      if (hasMine) {
        await supabase
          .from('ph_comment_reactions')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id)
          .eq('emoji', emoji);
      } else {
        await supabase.from('ph_comment_reactions').insert({
          comment_id: commentId,
          user_id: user.id,
          emoji,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['cv-comment-reactions', resolvedWorkItemId],
      });
    },
    onError: () => catalystToast.error('Failed to update reaction'),
  });

  const handleAdd = useCallback(
    (content: string) => addMutation.mutateAsync({ body: content }),
    [addMutation],
  );
  const handleAddReply = useCallback(
    (parentId: string, content: string) =>
      addMutation.mutateAsync({ body: content, parentId }),
    [addMutation],
  );
  const handleEdit = useCallback((id: string, content: string) => editMutation.mutateAsync({ id, body: content }), [editMutation]);
  const handleDelete = useCallback((id: string) => deleteMutation.mutateAsync(id), [deleteMutation]);
  const handleToggleReaction = useCallback(
    (commentId: string, emoji: string, hasMine: boolean) =>
      toggleReactionMutation.mutateAsync({ commentId, emoji, hasMine }),
    [toggleReactionMutation],
  );

  // ── Comments summary (Improve dropdown → Summarize comments) ─────
  useCommentsSummaryStream({ mountedForIssueKey: resolvedIssueKey });
  const summaryPayload = useCatySummarize((s) => s.payload);
  const summaryStatus = useCatySummarize((s) => s.status);
  const summaryText = useCatySummarize((s) => s.streamingText);
  const summaryError = useCatySummarize((s) => s.errorMessage);
  const summaryAuto = useCatySummarize((s) => s.autoEnabled);
  const setSummaryAuto = useCatySummarize((s) => s.setAuto);
  const dismissSummary = useCatySummarize((s) => s.dismiss);
  const showSummaryCard =
    !!summaryPayload &&
    !!resolvedIssueKey &&
    summaryPayload.issueKey === resolvedIssueKey &&
    summaryStatus !== 'idle';

  // Feedback persistence (ai_summary_feedback). Only meaningful once
  // we have a resolved issue_key; the hook guards on that internally.
  const { vote: selectedVote, recordVote } = useAiSummaryFeedback({
    issueKey: resolvedIssueKey,
  });
  const handleFeedback = useCallback(
    (next: 'up' | 'down') => {
      recordVote(next, summaryText);
    },
    [recordVote, summaryText],
  );

  // Scroll the section into view when the summary card first appears
  // (i.e. the user just clicked "Summarize comments" in the right rail).
  // requestAnimationFrame so the card has mounted before we scroll.
  const sectionRef = useRef<HTMLDivElement>(null);
  const prevShowSummaryCard = useRef(false);
  useEffect(() => {
    if (showSummaryCard && !prevShowSummaryCard.current) {
      requestAnimationFrame(() => {
        sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
    prevShowSummaryCard.current = showSummaryCard;
  }, [showSummaryCard]);

  // Focus-section signal — set by callers (e.g. For You's "View thread"
  // link) right before openDetail. The store is read SYNCHRONOUSLY at
  // first render so ActivityPanel's `useState(defaultTab)` initializer
  // sees the right value (it doesn't react to defaultTab changes after
  // mount). The clear happens in a mount effect alongside the scroll so
  // the signal only fires once per open.
  const clearFocusSection = useGlobalSearchStore((s) => s.clearFocusSection);
  // Vikram 2026-07-02: default landing tab is "Comments" across every
  // detail surface (modal, right-side panel, full page). The prior
  // default "all" showed history noise first. Auto-scroll into view
  // is gated to the For You "View thread" flow — a bare open should
  // NOT jump the viewport to the activity section.
  const [activityDefaultTab] = useState<ActivityTabKey>('comments');
  const [shouldScrollToActivity] = useState<boolean>(() => {
    return useGlobalSearchStore.getState().focusSection === 'comments';
  });
  useEffect(() => {
    if (!shouldScrollToActivity) return;
    requestAnimationFrame(() => {
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      clearFocusSection();
    });
  }, [shouldScrollToActivity, clearFocusSection]);

  return (
    <div
      ref={sectionRef}
      style={{ borderTop: '1px solid var(--ds-border-subtle)', paddingTop: 16, marginTop: 8 }}
    >
      {showSummaryCard && (
        <CommentsSummaryCard
          status={summaryStatus}
          text={summaryText}
          errorMessage={summaryError}
          issueKey={resolvedIssueKey!}
          onDismiss={dismissSummary}
          autoEnabled={summaryAuto}
          onToggleAuto={setSummaryAuto}
          onFeedback={handleFeedback}
          selectedVote={selectedVote}
        />
      )}
      <ActivityPanel
        comments={mappedComments}
        historyItems={mappedHistory}
        currentUser={currentUser}
        mentionableUsers={mentionableUsers}
        onAddComment={handleAdd}
        onAddReply={handleAddReply}
        onEditComment={handleEdit}
        onDeleteComment={handleDelete}
        onToggleReaction={handleToggleReaction}
        isSubmitting={addMutation.isPending}
        isLoadingComments={isLoadingComments}
        isLoadingHistory={isLoadingHistory}
        quickReplies={QUICK_REPLIES}
        defaultTab={activityDefaultTab}
        defaultSortOrder="newest"
        hiddenTabs={['worklog']}
        jiraUserMap={jiraUserMap}
        workItemId={resolvedWorkItemId ?? undefined}
        improveContext={improveContext}
        issueKey={resolvedIssueKey ?? undefined}
      />
    </div>
  );
}
