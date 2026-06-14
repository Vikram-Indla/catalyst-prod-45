/**
 * catyEvents — pure classification + summarisation for the Caty SIGNAL layer
 * (transient events), separate from the STATE layer (mood). Events are derived from
 * the existing `notifications` table, which already carries the acknowledge-to-clear
 * model (read_at / is_dismissed) — the Slack/iOS pattern, no new infra.
 *
 * notification_type values are the real ones probed 2026-06-14 (zero-assumption).
 */

export type CatyEventKind = 'assignment' | 'status' | 'mention' | 'due' | 'incident' | 'other';

export interface CatyEvent {
  id: string;
  kind: CatyEventKind;
  entityKey: string | null;   // e.g. BAU-5012
  entityTitle: string | null;
  actorName: string | null;
  createdAt: string;
  seen: boolean;              // read_at != null
}

/** Map a raw notification_type to a Caty event kind. Unknown → 'other'. */
export function classifyEvent(notificationType: string | null): CatyEventKind {
  switch ((notificationType ?? '').toLowerCase()) {
    case 'assigned':
    case 'assigned_story':
    case 'assigned_work_item':
    case 'reassigned_work_item':
      return 'assignment';
    case 'status_changed':
      return 'status';
    case 'commented':
    case 'commented_on_work_item':
    case 'mentioned_in_comment':
    case 'chat_mention':
      return 'mention';
    case 'due_date_approaching':
      return 'due';
    default:
      return 'other';
  }
}

/** Incident entities escalate any assignment/status event to the 'incident' kind. */
export function refineKind(kind: CatyEventKind, entityIconType: string | null): CatyEventKind {
  if (entityIconType === 'Production Incident' && (kind === 'assignment' || kind === 'status')) {
    return 'incident';
  }
  return kind;
}

/** Count of UNSEEN events by kind — drives the gesture + the hover breakdown. */
export function summarizeUnseen(events: CatyEvent[]): Record<CatyEventKind, number> {
  const out: Record<CatyEventKind, number> = {
    assignment: 0,
    status: 0,
    mention: 0,
    due: 0,
    incident: 0,
    other: 0,
  };
  for (const e of events) if (!e.seen) out[e.kind] += 1;
  return out;
}

export function unseenCount(events: CatyEvent[]): number {
  return events.reduce((n, e) => n + (e.seen ? 0 : 1), 0);
}

/** The one-time gesture a kind triggers (CSS class id). Pure mapping. */
export function gestureFor(kind: CatyEventKind): string {
  switch (kind) {
    case 'assignment':
      return 'cmf-perk';
    case 'status':
      return 'cmf-flick';
    case 'mention':
      return 'cmf-glance';
    case 'due':
      return 'cmf-earsback';
    case 'incident':
      return 'cmf-snap';
    default:
      return '';
  }
}

/** Deterministic one-line summary of the unseen events, fact-only. */
export function buildEventLine(events: CatyEvent[]): string {
  const s = summarizeUnseen(events);
  const parts: string[] = [];
  if (s.incident) parts.push(`${s.incident} incident${s.incident > 1 ? 's' : ''}`);
  if (s.assignment) parts.push(`${s.assignment} new`);
  if (s.mention) parts.push(`${s.mention} mention${s.mention > 1 ? 's' : ''}`);
  if (s.status) parts.push(`${s.status} moved`);
  if (s.due) parts.push(`${s.due} due soon`);
  return parts.length ? parts.join(' · ') : 'nothing new';
}
