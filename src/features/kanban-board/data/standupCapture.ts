/**
 * standupCapture — on End standup, capture the DRIVER's own card movements +
 * comments between Start and End, gate on a 5-minute minimum, and store a lean
 * standup_sessions row. The AI summary is generated lazily on first view, so
 * this only persists facts (changes + comments), not prose.
 *
 * "Only my summary": filtered to the driver (ph_activity_log.user_id /
 * ph_comments.author_id = driver.id). Other people's moves are ignored.
 */
import { supabase } from '@/integrations/supabase/client';

export const STANDUP_MIN_VALID_SEC = 300; // 5 minutes

interface Driver { id: string; name: string | null; avatarUrl: string | null; }
interface CaptureArgs {
  projectKey: string;
  driver: Driver;
  startedAt: Date;
  endedAt: Date;
  timerSetSec: number;
}

export interface StandupChange { key: string; type: string; action: string; field: string | null; from: string | null; to: string | null; ts: string; }
export interface StandupComment { key: string; type: string; snippet: string; ts: string; }

/** Returns the new session id, or null on failure / skip. */
export async function captureStandupSession({ projectKey, driver, startedAt, endedAt, timerSetSec }: CaptureArgs): Promise<string | null> {
  const durationSec = Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000));
  const isValid = durationSec >= STANDUP_MIN_VALID_SEC;

  let changes: StandupChange[] = [];
  let comments: StandupComment[] = [];

  if (isValid) {
    const sIso = startedAt.toISOString();
    const eIso = endedAt.toISOString();

    const [{ data: acts }, { data: cmts }] = await Promise.all([
      supabase.from('ph_activity_log')
        .select('work_item_id, action, field_name, old_value, new_value, created_at')
        .eq('user_id', driver.id).gte('created_at', sIso).lte('created_at', eIso)
        .order('created_at', { ascending: true }),
      supabase.from('ph_comments')
        .select('work_item_id, body, created_at')
        .eq('author_id', driver.id).gte('created_at', sIso).lte('created_at', eIso)
        .order('created_at', { ascending: true }),
    ]);

    const ids = Array.from(new Set(
      [...(acts ?? []).map((a: any) => a.work_item_id), ...(cmts ?? []).map((c: any) => c.work_item_id)].filter(Boolean),
    ));

    // Resolve work_item_id (ph_issues.id) → key + type, scoped to this project.
    const issueMap = new Map<string, { key: string; type: string }>();
    if (ids.length) {
      const { data: issues } = await supabase
        .from('ph_issues').select('id, issue_key, issue_type, project_key').in('id', ids);
      for (const i of (issues ?? []) as any[]) {
        if (i.project_key === projectKey) issueMap.set(i.id, { key: i.issue_key, type: i.issue_type });
      }
    }

    changes = (acts ?? [])
      .filter((a: any) => issueMap.has(a.work_item_id))
      .map((a: any) => {
        const m = issueMap.get(a.work_item_id)!;
        return { key: m.key, type: m.type, action: a.action, field: a.field_name, from: a.old_value, to: a.new_value, ts: a.created_at };
      });

    comments = (cmts ?? [])
      .filter((c: any) => issueMap.has(c.work_item_id))
      .map((c: any) => {
        const m = issueMap.get(c.work_item_id)!;
        return { key: m.key, type: m.type, snippet: String(c.body ?? '').slice(0, 160), ts: c.created_at };
      });
  }

  // standup_sessions is not in the generated types yet — cast.
  const { data, error } = await (supabase as any)
    .from('standup_sessions')
    .insert({
      project_key: projectKey,
      driver_id: driver.id,
      driver_name: driver.name,
      driver_avatar_url: driver.avatarUrl,
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      duration_sec: durationSec,
      timer_set_sec: timerSetSec,
      is_valid: isValid,
      changes_json: changes,
      comments_json: comments,
    })
    .select('id')
    .single();

  if (error) { console.warn('[standup] capture failed:', error.message); return null; }
  return data?.id ?? null;
}
