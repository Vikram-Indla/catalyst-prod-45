/**
 * Dashboard V4 — TanStack Query hooks for widget data
 * All queries use REAL Supabase data — zero mocks.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// "Active" releases = not archived/released/shipped
const INACTIVE_STATUSES = ['archived', 'released', 'shipped'] as const;

async function getProjectKey(projectId: string): Promise<string | null> {
  const { data, error } = await supabase.from('projects').select('key').eq('id', projectId).single();
  if (error && error.code !== 'PGRST116') throw error;
  return data?.key ?? null;
}

async function getActiveReleaseNames(projectId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('releases')
    .select('name')
    .eq('project_id', projectId)
    .not('status', 'in', `(${INACTIVE_STATUSES.join(',')})`);
  if (error) throw error;
  return (data ?? []).map(r => r.name).filter(Boolean) as string[];
}

// ─── Active Releases ───
export function useActiveReleases(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['ph-dashboard-active-releases', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('releases')
        .select('id, name, status, start_date, target_date')
        .eq('project_id', projectId!)
        .not('status', 'in', `(${INACTIVE_STATUSES.join(',')})`);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

// ─── Status Counts (To Do / In Progress / Done) ───
export function useDashboardStatusCounts(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['ph-dashboard-status-counts', projectId],
    queryFn: async () => {
      const pKey = await getProjectKey(projectId!);
      if (!pKey) return { todo: 0, inProgress: 0, done: 0, total: 0 };

      const { data: issues, error } = await supabase
        .from('ph_issues')
        .select('status_category')
        .eq('project_key', pKey)
        .is('deleted_at', null);
      if (error) throw error;

      const counts = { todo: 0, inProgress: 0, done: 0, total: 0 };
      for (const issue of issues ?? []) {
        counts.total++;
        const cat = (issue.status_category || '').toLowerCase();
        if (cat === 'done') counts.done++;
        else if (cat === 'in progress' || cat === 'in_progress') counts.inProgress++;
        else counts.todo++;
      }
      return counts;
    },
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

// ─── Overdue Items ───
export function useDashboardOverdueItems(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['ph-dashboard-overdue', projectId],
    queryFn: async () => {
      const pKey = await getProjectKey(projectId!);
      if (!pKey) return [];

      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('ph_issues')
        .select('id, issue_key, summary, status, status_category, due_date, assignee_display_name, issue_type')
        .eq('project_key', pKey)
        .is('deleted_at', null)
        .neq('status_category', 'Done')
        .lt('due_date', today)
        .not('due_date', 'is', null)
        .order('due_date', { ascending: true })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

// ─── On Hold Items ───
export function useDashboardOnHoldItems(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['ph-dashboard-on-hold', projectId],
    queryFn: async () => {
      const pKey = await getProjectKey(projectId!);
      if (!pKey) return [];

      const { data, error } = await supabase
        .from('ph_issues')
        .select('id, issue_key, summary, status, assignee_display_name, issue_type')
        .eq('project_key', pKey)
        .is('deleted_at', null)
        .ilike('status', '%hold%')
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

// ─── Team Workload — active releases only ───
export function useDashboardTeamWorkload(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['ph-dashboard-team-workload', projectId],
    queryFn: async () => {
      const pKey = await getProjectKey(projectId!);
      if (!pKey) return [];

      const { data: issues, error } = await supabase
        .from('ph_issues')
        .select('assignee_display_name, issue_type, status_category')
        .eq('project_key', pKey)
        .is('deleted_at', null)
        .neq('status_category', 'Done');
      if (error) throw error;

      const map = new Map<string, { assignee: string; total: number; stories: number; bugs: number }>();
      for (const issue of issues ?? []) {
        const name = issue.assignee_display_name || 'Unassigned';
        if (!map.has(name)) map.set(name, { assignee: name, total: 0, stories: 0, bugs: 0 });
        const entry = map.get(name)!;
        entry.total++;
        const type = (issue.issue_type || '').toLowerCase();
        if (type === 'story' || type === 'task') entry.stories++;
        if (type === 'bug') entry.bugs++;
      }

      return Array.from(map.values()).sort((a, b) => b.total - a.total);
    },
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

// ─── Scope Change — per active release ───
export function useDashboardScopeChange(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['ph-dashboard-scope-change', projectId],
    queryFn: async () => {
      const pKey = await getProjectKey(projectId!);
      if (!pKey) return [];

      const { data: releases, error: releasesError } = await supabase
        .from('releases')
        .select('id, name, start_date')
        .eq('project_id', projectId!)
        .not('status', 'in', `(${INACTIVE_STATUSES.join(',')})`);
      if (releasesError) throw releasesError;
      if (!releases?.length) return [];

      const { data: issues, error: issuesError } = await supabase
        .from('ph_issues')
        .select('fix_versions, jira_created_at')
        .eq('project_key', pKey)
        .is('deleted_at', null);
      if (issuesError) throw issuesError;

      const results: { releaseName: string; totalItems: number; addedAfterStart: number; deltaPercent: number }[] = [];

      for (const rel of releases) {
        if (!rel.start_date) continue;
        const startDate = new Date(rel.start_date);
        let totalItems = 0;
        let addedAfterStart = 0;

        for (const issue of issues ?? []) {
          const fv = issue.fix_versions;
          const versions = Array.isArray(fv) ? fv : [];
          const belongsToRelease = versions.some((v: any) =>
            typeof v === 'string' ? v === rel.name : v?.name === rel.name
          );
          if (!belongsToRelease) continue;
          totalItems++;
          if (issue.jira_created_at && new Date(issue.jira_created_at) > startDate) {
            addedAfterStart++;
          }
        }

        results.push({
          releaseName: rel.name || 'Unnamed Release',
          totalItems,
          addedAfterStart,
          deltaPercent: totalItems > 0 ? Math.round((addedAfterStart / totalItems) * 100) : 0,
        });
      }

      return results;
    },
    enabled: !!projectId,
    staleTime: 120_000,
  });
}

// ─── Production Incidents (cross-hub) ───
export function useDashboardIncidents(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['ph-dashboard-incidents', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select('id, incident_key, title, priority, status, reporter_name, assignee_id, created_at')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;

      return (data ?? []).map(inc => ({
        ...inc,
        days_open: Math.max(0, Math.floor((Date.now() - new Date(inc.created_at).getTime()) / 86400000)),
      }));
    },
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

// ─── QA Defects (cross-hub from tm_defects) ───
export function useDashboardDefects(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['ph-dashboard-defects', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tm_defects')
        .select('id, defect_key, title, severity, status, created_at')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;

      return (data ?? []).map(d => ({
        ...d,
        days_open: d.created_at
          ? Math.max(0, Math.floor((Date.now() - new Date(d.created_at).getTime()) / 86400000))
          : 0,
      }));
    },
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

// ─── Recent Activity (latest updated ph_issues) ───
export function useDashboardRecentActivity(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['ph-dashboard-recent-activity', projectId],
    queryFn: async () => {
      const pKey = await getProjectKey(projectId!);
      if (!pKey) return [];

      const { data, error } = await supabase
        .from('ph_issues')
        .select('id, issue_key, summary, status, status_category, assignee_display_name, jira_updated_at, issue_type')
        .eq('project_key', pKey)
        .is('deleted_at', null)
        .order('jira_updated_at', { ascending: false })
        .limit(15);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

// ─── Release Health (active release progress) ───
export function useDashboardReleaseHealth(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['ph-dashboard-release-health', projectId],
    queryFn: async () => {
      const pKey = await getProjectKey(projectId!);
      if (!pKey) return [];

      const { data: releases, error: relHealthRelError } = await supabase
        .from('releases')
        .select('id, name, status, target_date, start_date')
        .eq('project_id', projectId!)
        .not('status', 'in', `(${INACTIVE_STATUSES.join(',')})`);
      if (relHealthRelError) throw relHealthRelError;
      if (!releases?.length) return [];

      const { data: issues, error: relHealthIssError } = await supabase
        .from('ph_issues')
        .select('fix_versions, status_category')
        .eq('project_key', pKey)
        .is('deleted_at', null);
      if (relHealthIssError) throw relHealthIssError;

      return releases.map(rel => {
        let total = 0;
        let done = 0;

        for (const issue of issues ?? []) {
          const fv = issue.fix_versions;
          const versions = Array.isArray(fv) ? fv : [];
          const belongs = versions.some((v: any) =>
            typeof v === 'string' ? v === rel.name : v?.name === rel.name
          );
          if (!belongs) continue;
          total++;
          if ((issue.status_category || '').toLowerCase() === 'done') done++;
        }

        const daysLeft = rel.target_date
          ? Math.ceil((new Date(rel.target_date).getTime() - Date.now()) / 86400000)
          : null;

        return {
          id: rel.id,
          name: rel.name,
          status: rel.status,
          targetDate: rel.target_date,
          total,
          done,
          completionPct: total > 0 ? Math.round((done / total) * 100) : 0,
          daysLeft,
          atRisk: daysLeft !== null && daysLeft < 7 && total > 0 && done / total < 0.8,
        };
      });
    },
    enabled: !!projectId,
    staleTime: 60_000,
  });
}
