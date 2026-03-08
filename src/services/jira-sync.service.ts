/**
 * jira-sync.service — API calls to Supabase for Jira sync operations
 * Stage B: Supabase client queries, no Edge Functions yet
 */
import { supabase } from '@/integrations/supabase/client';

// Types inlined to avoid module resolution issues before types regenerate
type SyncStatus = 'synced' | 'stale' | 'conflict' | 'syncing' | 'pending';

interface SyncConflict {
  field: string;
  catalystValue: string;
  jiraValue: string;
  detectedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

interface JiraSyncLog {
  id: string;
  projectId: string;
  triggeredBy: string;
  startedAt: string;
  completedAt?: string;
  status: 'running' | 'completed' | 'failed';
  itemsSynced: number;
  conflictsFound: number;
  errorMessage?: string;
}

export const jiraSyncService = {
  /** Trigger a sync run for a project */
  async triggerSync(projectId: string): Promise<JiraSyncLog> {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await (supabase as any)
      .from('jira_sync_logs')
      .insert({
        project_id: projectId,
        triggered_by: user?.id,
        status: 'running',
        items_synced: 0,
        conflicts_found: 0,
        created_by: user?.id,
        // Required by existing schema
        connection_id: projectId,
        sync_type: 'manual',
        entity_type: 'issue',
      })
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      projectId: data.project_id,
      triggeredBy: data.triggered_by ?? '',
      startedAt: data.started_at,
      completedAt: data.completed_at ?? undefined,
      status: data.status as JiraSyncLog['status'],
      itemsSynced: data.items_synced ?? 0,
      conflictsFound: data.conflicts_found ?? 0,
      errorMessage: data.error_message ?? undefined,
    };
  },

  /** Get current sync status for a project via the aggregation view */
  async getSyncSummary(projectId: string) {
    const { data, error } = await (supabase as any)
      .from('project_sync_summary')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle();
    if (error) throw error;
    return data as unknown as {
      project_id: string;
      project_key: string;
      catalyst_count: number;
      jira_count: number;
      conflict_count: number;
      stale_count: number;
      last_synced_at: string | null;
    } | null;
  },

  /** Get unresolved conflicts for a project */
  async getConflicts(projectId: string): Promise<SyncConflict[]> {
    // Get project key first
    const { data: project } = await supabase
      .from('ph_projects')
      .select('key')
      .eq('id', projectId)
      .single();
    if (!project) return [];

    const { data, error } = await supabase
      .from('jira_sync_conflicts' as any)
      .select(`
        id,
        ph_issue_id,
        field_name,
        catalyst_value,
        jira_value,
        detected_at,
        resolved_at,
        resolved_by,
        resolution
      `)
      .is('resolved_at', null);
    if (error) throw error;
    return (data || []).map((c: any) => ({
      field: c.field_name,
      catalystValue: c.catalyst_value ?? '',
      jiraValue: c.jira_value ?? '',
      detectedAt: c.detected_at,
      resolvedAt: c.resolved_at ?? undefined,
      resolvedBy: c.resolved_by ?? undefined,
    }));
  },

  /** Resolve a single conflict */
  async resolveConflict(conflictId: string, resolution: 'keep_catalyst' | 'keep_jira'): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('jira_sync_conflicts' as any)
      .update({
        resolution,
        resolved_at: new Date().toISOString(),
        resolved_by: user?.id,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conflictId);
    if (error) throw error;
  },

  /** Queue a write-back edit */
  async queueWriteBack(phIssueId: string, fieldName: string, newValue: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('jira_write_back_queue' as any)
      .insert({
        ph_issue_id: phIssueId,
        field_name: fieldName,
        new_value: newValue,
        created_by: user?.id,
      });
    if (error) throw error;

    // Mark the issue as having a pending write-back
    await supabase
      .from('ph_issues')
      .update({ pending_write_back_at: new Date().toISOString() } as any)
      .eq('id', phIssueId);
  },

  /** Approve a queued write-back */
  async approveWriteBack(queueId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('jira_write_back_queue' as any)
      .update({
        push_status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: user?.id,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', queueId);
    if (error) throw error;
  },

  /** Get sync logs for a project */
  async getSyncLogs(projectId: string): Promise<JiraSyncLog[]> {
    const { data, error } = await supabase
      .from('jira_sync_logs')
      .select('*')
      .eq('project_id', projectId)
      .order('started_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    return (data || []).map((l: any) => ({
      id: l.id,
      projectId: l.project_id,
      triggeredBy: l.triggered_by ?? '',
      startedAt: l.started_at,
      completedAt: l.completed_at ?? undefined,
      status: l.status as JiraSyncLog['status'],
      itemsSynced: l.items_synced ?? 0,
      conflictsFound: l.conflicts_found ?? 0,
      errorMessage: l.error_message ?? undefined,
    }));
  },

  /** Get write-back queue for a project */
  async getWriteBackQueue(projectId: string) {
    const { data: project } = await supabase
      .from('ph_projects')
      .select('key')
      .eq('id', projectId)
      .single();
    if (!project) return [];

    const { data, error } = await supabase
      .from('jira_write_back_queue' as any)
      .select('*')
      .eq('push_status', 'queued');
    if (error) throw error;
    return data || [];
  },
};
