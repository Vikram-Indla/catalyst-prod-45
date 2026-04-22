/**
 * Dashboard V4 — TanStack Query hooks for widget data
 * All queries use REAL Supabase data — zero mocks.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// "Active" releases = not archived/released/shipped
const INACTIVE_STATUSES = ['archived', 'released', 'shipped'] as const;

// ─── Avatar resolver: maps display names → avatar URLs via resource_inventory + profiles ───
let _avatarCache: Map<string, string | null> | null = null;
let _avatarCachePromise: Promise<Map<string, string | null>> | null = null;

async function getAvatarMap(): Promise<Map<string, string | null>> {
  if (_avatarCache) return _avatarCache;
  if (_avatarCachePromise) return _avatarCachePromise;

  _avatarCachePromise = (async () => {
    const { data: resources } = await supabase
      .from('resource_inventory')
      .select('name, profile_id')
      .eq('is_active', true);

    const profileIds = (resources || []).map(r => r.profile_id).filter((id): id is string => !!id);
    const avatarMap = new Map<string, string | null>();

    if (profileIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, avatar_url')
        .in('id', profileIds);

      const profileAvatars = new Map<string, string | null>();
      for (const p of profiles || []) {
        profileAvatars.set(p.id, p.avatar_url || null);
      }

      for (const r of resources || []) {
        if (r.name && r.profile_id) {
          const url = profileAvatars.get(r.profile_id) || null;
          avatarMap.set(r.name.toLowerCase(), url);
        }
      }
    }

    _avatarCache = avatarMap;
    // Invalidate cache after 5 minutes
    setTimeout(() => { _avatarCache = null; _avatarCachePromise = null; }, 5 * 60 * 1000);
    return avatarMap;
  })();

  return _avatarCachePromise;
}

export function resolveAvatarUrl(avatarMap: Map<string, string | null>, displayName: string | null): string | null {
  if (!displayName) return null;
  return avatarMap.get(displayName.toLowerCase()) || null;
}

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

// ─── Production Incidents (native, from ph_incidents) ───
export interface DashboardIncident {
  id: string;
  key: string | null;
  title: string | null;
  priority: string | null;
  status: string | null;
  assigned_to: string | null;
  resolved_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  // Derived
  assignee: string;
  assignee_avatar_url: string | null;
  days_open: number;
}

export function useDashboardIncidents(projectId: string | null | undefined, _projectKey?: string | null) {
  return useQuery<DashboardIncident[]>({
    queryKey: ['ph-dashboard-incidents', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from('ph_incidents')
        .select('id, key, title, priority, status, assigned_to, resolved_at, created_at, updated_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const rows = data ?? [];
      const assigneeIds = Array.from(
        new Set(rows.map(r => r.assigned_to).filter((v): v is string => !!v))
      );

      // Resolve assignee display names from profiles (best-effort, no fakes)
      const nameMap = new Map<string, string>();
      if (assigneeIds.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', assigneeIds);
        (profs ?? []).forEach((p: any) => {
          if (p?.id && p?.full_name) nameMap.set(p.id, p.full_name);
        });
      }

      const avatarMap = await getAvatarMap();

      return rows.map((inc: any) => {
        const assignee = inc.assigned_to ? (nameMap.get(inc.assigned_to) ?? '') : '';
        return {
          id: inc.id,
          key: inc.key,
          title: inc.title,
          priority: inc.priority,
          status: inc.status,
          assigned_to: inc.assigned_to,
          resolved_at: inc.resolved_at,
          created_at: inc.created_at,
          updated_at: inc.updated_at,
          assignee,
          assignee_avatar_url: assignee ? resolveAvatarUrl(avatarMap, assignee) : null,
          days_open: inc.created_at
            ? Math.max(0, Math.floor((Date.now() - new Date(inc.created_at).getTime()) / 86400000))
            : 0,
        };
      });
    },
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

// ─── QA Defects (cross-hub from tm_defects) ───
export function useDashboardDefects(projectId: string | null | undefined, projectKey?: string | null) {
  return useQuery({
    queryKey: ['ph-dashboard-defects', projectId, projectKey],
    queryFn: async () => {
      let allDefects: any[] = [];
      const avatarMap = await getAvatarMap();

      // Fetch Jira-synced defects by project key
      if (projectKey) {
        const { data: jiraDefects } = await supabase
          .from('tm_defects')
          .select('id, defect_key, title, severity, status, created_at, jira_key, jira_source, jira_assignee_name')
          .eq('jira_project_key', projectKey)
          .order('created_at', { ascending: false })
          .limit(10);
        if (jiraDefects?.length) allDefects.push(...jiraDefects);
      }

      // Also fetch native defects by project_id
      const { data: nativeDefects } = await supabase
        .from('tm_defects')
        .select('id, defect_key, title, severity, status, created_at, jira_key, jira_source, jira_assignee_name')
        .eq('project_id', projectId!)
        .eq('jira_source', false)
        .order('created_at', { ascending: false })
        .limit(10);
      if (nativeDefects?.length) allDefects.push(...nativeDefects);

      // Dedupe, sort, cap at 10
      const seen = new Set<string>();
      allDefects = allDefects.filter(d => {
        if (seen.has(d.id)) return false;
        seen.add(d.id);
        return true;
      });
      allDefects.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      allDefects = allDefects.slice(0, 10);

      return allDefects.map(d => ({
        ...d,
        assignee_avatar_url: resolveAvatarUrl(avatarMap, d.jira_assignee_name),
        days_open: d.created_at
          ? Math.max(0, Math.floor((Date.now() - new Date(d.created_at).getTime()) / 86400000))
          : 0,
      }));
    },
    enabled: !!projectId || !!projectKey,
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
