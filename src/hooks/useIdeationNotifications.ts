/**
 * Ideation · Notification dispatch — CAT-IDEATION-REBUILD-20260709-001 Phase 6 S1.
 *
 * notification_trigger_config has 11 IdeationHub events seeded (S3), but
 * nothing in the app actually creates a notifications row when any of them
 * happen — that config table is admin-catalog only, never consulted by any
 * dispatch code (checked). Real dispatch pattern found in
 * useInteractionRecorder.ts's createMentionNotifications — direct insert
 * into `notifications` (RLS disabled on this table), matching the LIVE
 * schema, not the superseded one workItemRepo.ts's softDelete still
 * (incorrectly) targets.
 */
import { supabase } from '@/integrations/supabase/client';
import type { IdeaStatusKey } from '@/modules/ideation/types';

interface IdeationNotifyTarget {
  ideaId: string;
  ideaKey: string;
  ideaTitle: string;
  actorId: string;
}

// notifications.status_type has a real CHECK constraint (confirmed live —
// caught by an actual insert failure, not read from a migration file):
// ANY ['gray','blue','green','active','done','default']. No red/yellow
// exist, so declined/parked map to 'default' rather than a fabricated value.
const STATUS_TYPE: Partial<Record<IdeaStatusKey, string>> = {
  approved: 'green',
  declined: 'default',
  parked: 'default',
  merged: 'gray',
  converted: 'blue',
};

/** submitter + idn_watchers, minus the acting user — zero-assumption: no
 *  fabricated recipients when there genuinely are none. */
async function resolveRecipients(ideaId: string, submitterId: string, actorId: string): Promise<string[]> {
  const { data: watchers } = await supabase.from('idn_watchers').select('user_id').eq('idea_id', ideaId);
  const ids = new Set<string>([submitterId, ...(watchers ?? []).map((w) => w.user_id as string)]);
  ids.delete(actorId);
  return [...ids];
}

async function insertNotifications(
  recipientIds: string[],
  target: IdeationNotifyTarget,
  notificationType: string,
  status: IdeaStatusKey,
  metadata: Record<string, unknown>
): Promise<void> {
  if (recipientIds.length === 0) return;
  const rows = recipientIds.map((recipientId) => ({
    recipient_user_id: recipientId,
    actor_user_id: target.actorId,
    notification_type: notificationType,
    entity_type: 'idea',
    entity_id: target.ideaId,
    entity_title: target.ideaTitle,
    entity_key: target.ideaKey,
    entity_icon_type: 'lightbulb',
    hub_source: 'IdeationHub',
    status,
    status_type: STATUS_TYPE[status] ?? 'gray',
    tab: 'direct',
    metadata,
    entity_deleted: false,
    is_dismissed: false,
  }));
  const { error } = await supabase.from('notifications').insert(rows);
  if (error) console.warn('[ideation] notification insert failed:', error.message);
}

export async function notifyIdeaComment(params: {
  ideaId: string;
  ideaKey: string;
  ideaTitle: string;
  submitterId: string;
  status: IdeaStatusKey;
  actorId: string;
  commentPreview: string;
}): Promise<void> {
  const recipients = await resolveRecipients(params.ideaId, params.submitterId, params.actorId);
  await insertNotifications(recipients, params, 'idea_comment_added', params.status, {
    comment_preview: params.commentPreview,
  });
}

export async function notifyIdeaDecision(params: {
  ideaId: string;
  ideaKey: string;
  ideaTitle: string;
  submitterId: string;
  status: IdeaStatusKey;
  actorId: string;
  decisionReason?: string | null;
}): Promise<void> {
  const recipients = await resolveRecipients(params.ideaId, params.submitterId, params.actorId);
  await insertNotifications(recipients, params, 'idea_decision', params.status, {
    decision: params.status,
    reason: params.decisionReason ?? null,
  });
}
