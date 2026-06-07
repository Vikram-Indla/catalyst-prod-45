/**
 * useInteractionRecorder — records bidirectional user interactions
 * and creates mention notifications when a comment is saved.
 *
 * Called from CatalystActivitySection.addMutation.onSuccess.
 * Non-blocking — failures are logged but never surface to the user
 * (interaction recording is non-critical; the comment is already saved).
 *
 * Adapts sample Parts 2 + 7 + 8 to Catalyst's Supabase architecture.
 */
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// ─── ADF Mention Extractor ──────────────────────────────────────────────────
// The comment body is stored as either:
//   (a) ADF JSON string: { type: 'doc', content: [...] }
//   (b) Plain text / markdown (legacy)
// We walk the ADF tree looking for { type: 'mention', attrs: { id } } nodes.

function extractMentionIdsFromBody(body: string): string[] {
  const ids = new Set<string>();

  // Try ADF JSON parse
  try {
    const doc = JSON.parse(body);
    if (doc && typeof doc === 'object') {
      walkAdfNode(doc, ids);
    }
  } catch {
    // Not JSON — try regex fallback for @[Name](uuid) and @[uuid] formats
    const patterns = [
      /@\[([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]/gi,
      /@\[[^\]]+\]\(([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)/gi,
    ];
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(body)) !== null) {
        ids.add(match[1]);
      }
    }
  }

  return Array.from(ids);
}

function walkAdfNode(node: any, ids: Set<string>): void {
  if (!node || typeof node !== 'object') return;

  if (node.type === 'mention' && node.attrs?.id) {
    ids.add(node.attrs.id);
  }

  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      walkAdfNode(child, ids);
    }
  }
}

// ─── Interaction Recording ──────────────────────────────────────────────────

interface RecordInteractionParams {
  actorId: string;
  targetId: string;
  type: 'mention' | 'comment_alongside' | 'assign' | 'watch_together';
  workItemId?: string;
  projectKey?: string;
}

async function recordInteraction(params: RecordInteractionParams): Promise<void> {
  if (params.actorId === params.targetId) return; // skip self-interactions

  // Insert bidirectional — actor→target AND target→actor
  const rows = [
    {
      actor_id: params.actorId,
      target_id: params.targetId,
      interaction_type: params.type,
      work_item_id: params.workItemId || null,
      project_key: params.projectKey || null,
    },
    {
      actor_id: params.targetId,
      target_id: params.actorId,
      interaction_type: params.type,
      work_item_id: params.workItemId || null,
      project_key: params.projectKey || null,
    },
  ];

  const { error } = await supabase.from('mention_interactions').insert(rows);
  if (error) {
    console.warn('[InteractionRecorder] insert failed:', error.message);
  }
}

// ─── Mention Notification Creation ──────────────────────────────────────────
// Inserts into the existing `notifications` table (not `mention_notifications`)
// so DirectPanel picks them up automatically via useNotificationsQuery.
// The `mentioned_in_comment` type is already mapped by DirectPanel → 'mentioned' verb.

async function createMentionNotifications(params: {
  actorId: string;
  mentionedIds: string[];
  workItemId: string;
  commentId?: string;
  commentPreview?: string;
}): Promise<void> {
  // Fetch work item metadata for the notification row
  const { data: issue } = await supabase
    .from('ph_issues')
    .select('issue_key, summary, issue_type, status, status_category, project_key')
    .eq('id', params.workItemId)
    .maybeSingle();

  if (!issue) {
    console.warn('[InteractionRecorder] work item not found for notification:', params.workItemId);
    return;
  }

  const statusType = issue.status_category === 'done'
    ? 'green'
    : issue.status_category === 'indeterminate'
      ? 'blue'
      : 'gray';

  const iconType = (issue.issue_type ?? 'task').toLowerCase();

  const rows = params.mentionedIds
    .filter((id) => id !== params.actorId) // never notify self
    .map((recipientId) => ({
      recipient_user_id: recipientId,
      actor_user_id: params.actorId,
      notification_type: 'mentioned_in_comment',
      entity_type: 'work_item',
      entity_id: params.workItemId,
      entity_title: issue.summary ?? '',
      entity_key: issue.issue_key ?? '',
      entity_icon_type: iconType,
      hub_source: issue.project_key ?? '',
      status: issue.status ?? '',
      status_type: statusType,
      tab: 'direct',
      metadata: {
        comment_preview: params.commentPreview ?? '',
        comment_id: params.commentId ?? null,
      },
      entity_deleted: false,
      is_dismissed: false,
    }));

  if (rows.length === 0) return;

  const { error } = await supabase.from('notifications').insert(rows);
  if (error) {
    console.warn('[InteractionRecorder] notification insert failed:', error.message);
  }
}

// ─── Get Entity Participants (for comment_alongside interactions) ────────────

async function getEntityParticipants(workItemId: string): Promise<string[]> {
  const ids = new Set<string>();

  // Issue assignee + reporter (via jira_account_id → profiles)
  const { data: issue } = await supabase
    .from('ph_issues')
    .select('assignee_account_id, reporter_account_id')
    .eq('id', workItemId)
    .maybeSingle();

  if (issue) {
    const accountIds = [issue.assignee_account_id, issue.reporter_account_id].filter(
      (v): v is string => typeof v === 'string' && v.length > 0,
    );
    if (accountIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .in('jira_account_id', accountIds);
      profiles?.forEach((p) => ids.add(p.id));
    }
  }

  // Comment authors
  const { data: commenters } = await supabase
    .from('ph_comments')
    .select('author_id')
    .eq('work_item_id', workItemId)
    .order('created_at', { ascending: false })
    .limit(30);
  commenters?.forEach((c) => {
    if (c.author_id) ids.add(c.author_id);
  });

  // Watchers
  const { data: watchers } = await supabase
    .from('ph_issue_watchers')
    .select('user_id')
    .eq('work_item_id', workItemId)
    .limit(30);
  watchers?.forEach((w) => {
    if (w.user_id) ids.add(w.user_id);
  });

  return Array.from(ids);
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useInteractionRecorder() {
  const { user } = useAuth();

  /**
   * Call after a comment is successfully saved.
   * Non-blocking — runs in background, never throws to caller.
   */
  const onCommentSaved = useCallback(
    async (params: {
      body: string;
      workItemId: string;
      projectKey?: string;
      commentId?: string;
    }) => {
      if (!user?.id) return;

      try {
        const actorId = user.id;
        const mentionedIds = extractMentionIdsFromBody(params.body);

        // 1. Record mention interactions (bidirectional)
        for (const mentionedId of mentionedIds) {
          await recordInteraction({
            actorId,
            targetId: mentionedId,
            type: 'mention',
            workItemId: params.workItemId,
            projectKey: params.projectKey,
          });
        }

        // 2. Record comment_alongside for other participants
        const participants = await getEntityParticipants(params.workItemId);
        for (const participantId of participants) {
          if (participantId === actorId) continue;
          if (mentionedIds.includes(participantId)) continue; // already recorded as mention
          await recordInteraction({
            actorId,
            targetId: participantId,
            type: 'comment_alongside',
            workItemId: params.workItemId,
            projectKey: params.projectKey,
          });
        }

        // 3. Create mention notifications
        if (mentionedIds.length > 0) {
          // Extract a plain-text preview (first 200 chars) for the notification card
          let commentPreview = '';
          try {
            const doc = JSON.parse(params.body);
            const texts: string[] = [];
            const extractText = (node: any) => {
              if (node.type === 'text' && node.text) texts.push(node.text);
              if (Array.isArray(node.content)) node.content.forEach(extractText);
            };
            extractText(doc);
            commentPreview = texts.join(' ').slice(0, 200);
          } catch {
            commentPreview = params.body.slice(0, 200);
          }

          await createMentionNotifications({
            actorId,
            mentionedIds,
            workItemId: params.workItemId,
            commentId: params.commentId,
            commentPreview,
          });
        }
      } catch (err) {
        // Non-critical — log and swallow
        console.warn('[InteractionRecorder] onCommentSaved error:', err);
      }
    },
    [user?.id],
  );

  /**
   * Call when a user assigns an issue to someone.
   */
  const onAssign = useCallback(
    async (params: {
      assigneeId: string;
      workItemId: string;
      projectKey?: string;
    }) => {
      if (!user?.id) return;
      try {
        await recordInteraction({
          actorId: user.id,
          targetId: params.assigneeId,
          type: 'assign',
          workItemId: params.workItemId,
          projectKey: params.projectKey,
        });
      } catch (err) {
        console.warn('[InteractionRecorder] onAssign error:', err);
      }
    },
    [user?.id],
  );

  return { onCommentSaved, onAssign };
}

export { extractMentionIdsFromBody };
