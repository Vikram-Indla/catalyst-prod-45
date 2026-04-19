/**
 * IncidentHub — TanStack Query hooks
 * Sources ALL data from ph_issues where issue_type = 'Production Incident'
 * and jira_created_at >= 2026-01-01
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProductionIncident {
  id: string;
  issue_key: string;
  summary: string;
  description_text: string | null;
  status: string;
  status_category: string;
  priority: string;
  issue_type: string;
  project_key: string;
  project_name: string;
  assignee_display_name: string | null;
  assignee_account_id: string | null;
  reporter_display_name: string | null;
  reporter_account_id: string | null;
  labels: any;
  components: any;
  resolution: string | null;
  jira_created_at: string;
  jira_updated_at: string;
  due_date: string | null;
  type_icon_url: string | null;
  parent_key: string | null;
  parent_summary: string | null;
  story_points: number | null;
  fix_versions: any;
  comments: any;
  changelog: any;
}

// Map Jira priority to severity
function mapSeverity(priority: string | null): string {
  if (!priority) return 'SEV-4';
  const p = priority.toLowerCase();
  if (p === 'highest' || p === 'critical') return 'SEV-1';
  if (p === 'high') return 'SEV-2';
  if (p === 'medium') return 'SEV-3';
  return 'SEV-4';
}

// Map Jira priority to P-level
function mapPriority(priority: string | null): string {
  if (!priority) return 'P4';
  const p = priority.toLowerCase();
  if (p === 'highest' || p === 'critical') return 'P1';
  if (p === 'high') return 'P2';
  if (p === 'medium') return 'P3';
  return 'P4';
}

// Map Jira status to normalized status
function mapStatus(status: string | null, statusCategory: string | null): string {
  if (!status) return 'open';
  const s = status.toLowerCase();
  if (s === 'closed' || s === 'done') return 'resolved';
  if (s.includes('progress') || s.includes('review') || s.includes('qa') || s.includes('ready for') || s.includes('beta')) return 'in_progress';
  if (s === 'todo' || s === 'to do' || s === 'open') return 'open';
  if (statusCategory?.toLowerCase() === 'done') return 'resolved';
  if (statusCategory?.toLowerCase() === 'in progress') return 'in_progress';
  return 'open';
}

// ── List View (from ph_issues) ──
export function useIncidentListView() {
  return useQuery({
    queryKey: ['incident-hub-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_issues')
        .select('*')
        .eq('issue_type', 'Production Incident')
        .gte('jira_created_at', '2026-01-01T00:00:00Z')
        .is('deleted_at', null)
        .is('archived_at', null)
        .order('jira_created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(row => ({
        id: row.id,
        incident_key: row.issue_key,
        title: row.summary,
        description: row.description_text,
        severity: mapSeverity(row.priority),
        priority: mapPriority(row.priority),
        status: mapStatus(row.status, row.status_category),
        jira_status: row.status,
        project_name: row.project_name || row.project_key,
        assignee_name: row.assignee_display_name,
        reporter_name: row.reporter_display_name,
        created_at: row.jira_created_at,
        updated_at: row.jira_updated_at,
        resolution: row.resolution,
        labels: row.labels,
        due_date: row.due_date,
        type_icon_url: row.type_icon_url,
        parent_key: row.parent_key,
        parent_summary: row.parent_summary,
        comments_json: row.comments,
        changelog_json: row.changelog,
        // SLA-related (derived from due_date)
        resolution_breached: row.due_date ? new Date(row.due_date).getTime() < Date.now() : false,
        response_breached: false,
        resolution_due_at: row.due_date,
      }));
    },
  });
}

// ── Single Incident ──
export function useProductionIncident(id: string) {
  return useQuery({
    queryKey: ['incident-hub-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_issues')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      
      // Parse comments from JSONB
      let comments: any[] = [];
      if (data.comments && Array.isArray(data.comments)) {
        comments = data.comments.map((c: any) => ({
          id: c.id || c.jira_id || Math.random().toString(),
          author_name: c.author?.displayName || c.author_display_name || 'Unknown',
          content: c.body || c.text || '',
          created_at: c.created || c.created_at,
        }));
      }

      // Parse changelog from JSONB
      let history: any[] = [];
      if (data.changelog && Array.isArray(data.changelog)) {
        history = data.changelog.map((h: any) => ({
          id: h.id || Math.random().toString(),
          field_name: h.field || h.field_name || 'status',
          old_value: h.fromString || h.old_value,
          new_value: h.toString || h.new_value,
          changed_at: h.created || h.changed_at,
          changed_by: h.author?.displayName || 'System',
        }));
      }

      return {
        id: data.id,
        incident_key: data.issue_key,
        jira_key: data.issue_key,
        title: data.summary,
        description: data.description_text,
        severity: mapSeverity(data.priority),
        priority: mapPriority(data.priority),
        status: mapStatus(data.status, data.status_category),
        jira_status: data.status,
        project_name: data.project_name || data.project_key,
        assignee_name: data.assignee_display_name,
        reporter_name: data.reporter_display_name,
        created_at: data.jira_created_at,
        updated_at: data.jira_updated_at,
        resolution: data.resolution,
        labels: data.labels,
        due_date: data.due_date,
        type_icon_url: data.type_icon_url,
        comments,
        history,
        // Derived
        sla: data.due_date ? {
          resolution_due_at: data.due_date,
          resolution_breached: new Date(data.due_date).getTime() < Date.now(),
        } : null,
      };
    },
    enabled: !!id,
  });
}

// ── Committee Queue (keep for UI, returns empty if no committee data) ──
export function useCommitteeQueueView() {
  return useQuery({
    queryKey: ['incident-hub-committee-queue'],
    queryFn: async () => {
      // Committee data is not in ph_issues, return empty
      return [];
    },
  });
}

// ── Stats aggregation ──
export function useIncidentStats() {
  const { data: incidents } = useIncidentListView();
  
  if (!incidents) return { total: 0, sev1: 0, sev2: 0, active: 0, committeePending: 0, resolvedWeek: 0 };
  
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  return {
    total: incidents.length,
    sev1: incidents.filter(i => i.severity === 'SEV-1').length,
    sev2: incidents.filter(i => i.severity === 'SEV-2').length,
    active: incidents.filter(i => !['resolved'].includes(i.status)).length,
    committeePending: 0,
    resolvedWeek: incidents.filter(i => i.status === 'resolved' && i.updated_at && new Date(i.updated_at) >= weekAgo).length,
  };
}

// ── Update incident status (no-op for Jira-sourced data) ──
export function useUpdateIncidentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, changedBy }: { id: string; status: string; changedBy: string }) => {
      // Jira-sourced items are read-only in IncidentHub
      throw new Error('Cannot update Jira-sourced incidents directly. Use Jira to update status.');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incident-hub-list'] });
    },
  });
}
