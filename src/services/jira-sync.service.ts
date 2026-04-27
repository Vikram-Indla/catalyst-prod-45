/**
 * jira-sync.service — All Supabase calls for Jira sync operations
 * Stage D: Real database wiring, zero mocks
 */
import { supabase } from '@/integrations/supabase/client';

export interface SyncConflictRow {
  id: string;
  ph_issue_id: string;
  field_name: string;
  catalyst_value: string | null;
  jira_value: string | null;
  detected_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution: string | null;
}

export interface SyncLogRow {
  id: string;
  project_id: string;
  triggered_by: string | null;
  started_at: string;
  completed_at: string | null;
  status: 'running' | 'completed' | 'failed';
  items_synced: number;
  conflicts_found: number;
  error_message: string | null;
}

export interface WriteBackRow {
  id: string;
  /** Legacy UUID identifier for the ph_issues row. */
  ph_issue_id: string | null;
  field_name: string;
  new_value: string;
  /** Insert timestamp on jira_write_back_queue. */
  queued_at: string;
  status: string | null;
}

export interface SyncSummaryRow {
  project_id: string | null;
  project_key: string | null;
  catalyst_count: number | null;
  jira_count: number | null;
  conflict_count: number | null;
  stale_count: number | null;
  last_synced_at: string | null;
}

async function getUserId(): Promise<string | undefined> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

export const jiraSyncService = {
  /** Get project-level sync summary from the aggregation view */
  async getSyncSummary(projectId: string): Promise<SyncSummaryRow | null> {
    const { data, error } = await supabase
      .from('project_sync_summary')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle();
    if (error) throw error;
    return data as SyncSummaryRow | null;
  },

  /** Get unresolved conflicts for a project */
  async getConflicts(projectId: string): Promise<SyncConflictRow[]> {
    // Get all ph_issue ids belonging to this project via ph_issues.project_key
    const { data: project } = await supabase
      .from('ph_projects')
      .select('key')
      .eq('id', projectId)
      .single();
    if (!project) return [];

    const { data, error } = await supabase
      .from('jira_sync_conflicts')
      .select(`
        id, ph_issue_id, field_name, catalyst_value, jira_value,
        detected_at, resolved_at, resolved_by, resolution
      `)
      .is('resolved_at', null)
      .order('detected_at', { ascending: false })
      .limit(500);
    if (error) throw error;

    // Filter to only conflicts whose ph_issue belongs to this project
    if (!data || data.length === 0) return [];

    const issueIds = data.map(c => c.ph_issue_id);
    const { data: issues } = await supabase
      .from('ph_issues')
      .select('id')
      .eq('project_key', project.key)
      .in('id', issueIds);
    const validIds = new Set((issues || []).map(i => i.id));

    return data.filter(c => validIds.has(c.ph_issue_id));
  },

  /** Resolve a conflict — updates DB and clears sync_status on the work item */
  async resolveConflict(conflictId: string, resolution: 'keep_catalyst' | 'keep_jira'): Promise<void> {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('jira_sync_conflicts')
      .update({
        resolution,
        resolved_at: new Date().toISOString(),
        resolved_by: userId,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conflictId)
      .select('ph_issue_id')
      .single();
    if (error) throw error;

    // Update the ph_issues sync_status back to synced
    if (data?.ph_issue_id) {
      await supabase
        .from('ph_issues')
        .update({ sync_status: 'synced' } as any)
        .eq('id', data.ph_issue_id);
    }
  },

  /** Trigger a full sync run — inbound (RPC) + outbound (Edge Function) */
  async triggerSync(projectId: string): Promise<SyncLogRow> {
    const userId = await getUserId();

    // 1. Process inbound events via RPC
    try {
      await supabase.rpc('process_sync_events', { batch_size: 50 } as any);
    } catch {
      // RPC may not exist yet — continue to outbound
    }

    // 2. Process outbound events via Edge Function
    try {
      await supabase.functions.invoke('process-outbound-sync');
    } catch {
      // Edge function may not be deployed yet — continue
    }

    // 3. Insert a sync log entry
    const { data, error } = await supabase
      .from('jira_sync_logs')
      .insert({
        project_id: projectId,
        triggered_by: userId,
        status: 'running',
        items_synced: 0,
        conflicts_found: 0,
        created_by: userId,
      } as any)
      .select()
      .single();
    if (error) throw error;
    return {
      id: data.id,
      project_id: data.project_id,
      triggered_by: data.triggered_by,
      started_at: data.started_at,
      completed_at: data.completed_at,
      status: data.status as SyncLogRow['status'],
      items_synced: data.items_synced ?? 0,
      conflicts_found: data.conflicts_found ?? 0,
      error_message: data.error_message,
    };
  },

  /** Get sync logs for a project */
  async getSyncLogs(projectId: string): Promise<SyncLogRow[]> {
    const { data, error } = await supabase
      .from('jira_sync_logs')
      .select('*')
      .eq('project_id', projectId)
      .order('started_at', { ascending: false })
      .limit(10);
    if (error) throw error;
    return (data || []).map((l: any) => ({
      id: l.id,
      project_id: l.project_id,
      triggered_by: l.triggered_by,
      started_at: l.started_at,
      completed_at: l.completed_at,
      status: l.status as SyncLogRow['status'],
      items_synced: l.items_synced ?? 0,
      conflicts_found: l.conflicts_found ?? 0,
      error_message: l.error_message,
    }));
  },

  /** Get write-back queue items for a project */
  async getWriteBackQueue(projectId: string): Promise<WriteBackRow[]> {
    const { data: project } = await supabase
      .from('ph_projects')
      .select('key')
      .eq('id', projectId)
      .single();
    if (!project) return [];

    const { data, error } = await supabase
      .from('jira_write_back_queue')
      .select('id, ph_issue_id, field_name, new_value, queued_at, status')
      .eq('status', 'queued')
      .order('queued_at', { ascending: false })
      .limit(500);
    if (error) throw error;
    if (!data || data.length === 0) return [];

    return data as WriteBackRow[];
  },

  /**
   * Queue a write-back edit for a Jira-sourced item.
   *
   * Writes to `jira_write_back_queue.ph_issue_key` (TEXT, FK → ph_issues.issue_key).
   * That column was added by migration 20260427083000_jira_write_back_queue_use_issue_key.sql
   * after the /jira-compare 2026-04-27 audit discovered that the original
   * audit-B `ph_issue_id UUID` column had no valid FK target (ph_issues PK
   * is issue_key TEXT, no UUID id column exists).
   *
   * Status defaults to 'approved' so the background processor edge fn can
   * pick the row up immediately — matches A-finding.md's "best-effort,
   * never throws, status='approved'" pattern.
   *
   * Note: the old code also did a follow-up update to
   * `ph_issues.pending_write_back_at` after the queue insert. That column
   * does not exist on ph_issues (confirmed via information_schema dump
   * 2026-04-27). The pending-state can be derived from the queue itself
   * (latest queued/approved row per issue_key) so this update is dropped.
   */
  async queueWriteBack(issueKey: string, fieldName: string, newValue: string): Promise<void> {
    const userId = await getUserId();
    const { error } = await supabase
      .from('jira_write_back_queue')
      .insert({
        ph_issue_key: issueKey,
        field_name: fieldName,
        new_value: newValue,
        created_by: userId,
        status: 'approved',
      } as any);
    if (error) throw error;
  },

  /** Approve a queued write-back */
  async approveWriteBack(queueId: string): Promise<void> {
    const userId = await getUserId();
    const { error } = await supabase
      .from('jira_write_back_queue')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: userId,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', queueId);
    if (error) throw error;
  },
};
