/**
 * Dashboard V4 — TanStack Query hooks for widget data
 * All queries use REAL Supabase data — zero mocks.
 *
 * ═══════════════════════════════════════════════════════════════
 * 🛡️  2026 GUARDRAIL — PLATFORM-WIDE DASHBOARD POLICY
 * ═══════════════════════════════════════════════════════════════
 * Every dashboard widget MUST scope to the 2026 fiscal window:
 * any record created OR updated in 2026. Use YEAR_2026_START /
 * YEAR_2026_END constants and the `or2026(createdCol, updatedCol)`
 * helper. Do NOT remove or weaken these filters without an explicit
 * guardrail-amendment note in this header. Owner: Vikram.
 * ═══════════════════════════════════════════════════════════════
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// "Active" releases = not archived/released/shipped
const INACTIVE_STATUSES = ['archived', 'released', 'shipped'] as const;

// 🛡️ 2026 GUARDRAIL — fiscal window boundaries
export const YEAR_2026_START = '2026-01-01T00:00:00.000Z';
export const YEAR_2026_END   = '2027-01-01T00:00:00.000Z';

/** Supabase .or() expression: created OR updated within 2026. */
function or2026(createdCol: string, updatedCol: string): string {
  return `and(${createdCol}.gte.${YEAR_2026_START},${createdCol}.lt.${YEAR_2026_END}),and(${updatedCol}.gte.${YEAR_2026_START},${updatedCol}.lt.${YEAR_2026_END})`;
}

/** Resolve canonical projects.id from any incoming projectId (handles ph_projects.id case). */
async function getCanonicalProjectId(projectId: string, pKey: string | null): Promise<string> {
  if (!pKey) return projectId;
  const { data } = await supabase.from('projects').select('id').eq('key', pKey).maybeSingle();
  return data?.id ?? projectId;
}

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
  // Try ph_projects first (dashboard resolves projectId from ph_projects);
  // fall back to canonical projects table for legacy callers.
  const { data: ph } = await supabase.from('ph_projects').select('key').eq('id', projectId).maybeSingle();
  if (ph?.key) return ph.key;
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
      const pKey = await getProjectKey(projectId!);
      const canonicalId = await getCanonicalProjectId(projectId!, pKey);
      // 🛡️ 2026 GUARDRAIL: only releases with a 2026 target date OR updated in 2026.
      const { data, error } = await supabase
        .from('rh_releases')
        .select('id, name, status, target_date, updated_at')
        .eq('project_id', canonicalId)
        .neq('status', 'done')
        .or(
          `and(target_date.gte.${YEAR_2026_START.slice(0,10)},target_date.lt.${YEAR_2026_END.slice(0,10)}),` +
          `and(updated_at.gte.${YEAR_2026_START},updated_at.lt.${YEAR_2026_END})`
        );
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

// ─── Status Counts (To Do / In Progress / Done) ───
export interface DashboardDateFilter { dateFrom?: string | null; dateTo?: string | null; }

export function useDashboardStatusCounts(
  projectId: string | null | undefined,
  filters: DashboardDateFilter = {},
) {
  const { dateFrom = null, dateTo = null } = filters;
  return useQuery({
    queryKey: ['ph-dashboard-status-counts', projectId, dateFrom, dateTo],
    queryFn: async () => {
      const pKey = await getProjectKey(projectId!);
      if (!pKey) return { todo: 0, inProgress: 0, done: 0, total: 0 };

      let q = supabase
        .from('ph_issues')
        .select('status_category')
        .eq('project_key', pKey)
        .is('deleted_at', null);

      if (dateFrom) q = q.gte('jira_created_at', dateFrom);
      if (dateTo) q = q.lte('jira_created_at', dateTo);
      // Fall back to 2026 guardrail when no date filter applied
      if (!dateFrom && !dateTo) q = q.or(or2026('jira_created_at', 'jira_updated_at'));

      const { data: issues, error } = await q;
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
export function useDashboardOverdueItems(
  projectId: string | null | undefined,
  filters: DashboardDateFilter = {},
) {
  const { dateFrom = null, dateTo = null } = filters;
  return useQuery({
    queryKey: ['ph-dashboard-overdue', projectId, dateFrom, dateTo],
    queryFn: async () => {
      const pKey = await getProjectKey(projectId!);
      if (!pKey) return [];

      const today = new Date().toISOString().split('T')[0];
      let q = supabase
        .from('ph_issues')
        .select('id, issue_key, summary, status, status_category, effective_due_date, assignee_display_name, issue_type')
        .eq('project_key', pKey)
        .is('deleted_at', null)
        .neq('status_category', 'Done')
        .lt('effective_due_date', today)
        .not('effective_due_date', 'is', null);

      if (dateFrom) q = q.gte('jira_created_at', dateFrom);
      if (dateTo) q = q.lte('jira_created_at', dateTo);
      if (!dateFrom && !dateTo) q = q.or(or2026('jira_created_at', 'jira_updated_at'));

      const { data, error } = await q
        .order('effective_due_date', { ascending: true })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

// ─── On Hold Items ───
export function useDashboardOnHoldItems(
  projectId: string | null | undefined,
  filters: DashboardDateFilter = {},
) {
  const { dateFrom = null, dateTo = null } = filters;
  return useQuery({
    queryKey: ['ph-dashboard-on-hold', projectId, dateFrom, dateTo],
    queryFn: async () => {
      const pKey = await getProjectKey(projectId!);
      if (!pKey) return [];

      let q = supabase
        .from('ph_issues')
        .select('id, issue_key, summary, status, assignee_display_name, issue_type')
        .eq('project_key', pKey)
        .is('deleted_at', null)
        .or('status.ilike.%hold%,status.ilike.%block%,status.ilike.%awaiting%,status.ilike.%impediment%');

      if (dateFrom) q = q.gte('jira_updated_at', dateFrom);
      if (dateTo) q = q.lte('jira_updated_at', dateTo);
      if (!dateFrom && !dateTo) q = q.or(or2026('jira_created_at', 'jira_updated_at'));

      const { data, error } = await q.limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

// ─── Team Workload — active releases only ───
export function useDashboardTeamWorkload(
  projectId: string | null | undefined,
  filters: DashboardDateFilter = {},
) {
  const { dateFrom = null, dateTo = null } = filters;
  return useQuery({
    queryKey: ['ph-dashboard-team-workload', projectId, dateFrom, dateTo],
    queryFn: async () => {
      const pKey = await getProjectKey(projectId!);
      if (!pKey) return [];

      let q = supabase
        .from('ph_issues')
        .select('assignee_display_name, issue_type, status_category')
        .eq('project_key', pKey)
        .is('deleted_at', null)
        .neq('status_category', 'Done');

      if (dateFrom) q = q.gte('jira_created_at', dateFrom);
      if (dateTo) q = q.lte('jira_created_at', dateTo);
      if (!dateFrom && !dateTo) q = q.or(or2026('jira_created_at', 'jira_updated_at'));

      const { data: issues, error } = await q;
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

      const canonicalId = await getCanonicalProjectId(projectId!, pKey);

      // ── 1. Releases (2026 guardrail) ──────────────────────────────────────
      const { data: releases, error: releasesError } = await supabase
        .from('rh_releases')
        .select('id, name, jira_key, target_date')
        .eq('project_id', canonicalId)
        .neq('status', 'done')
        .gte('target_date', YEAR_2026_START.slice(0, 10))
        .lt('target_date', YEAR_2026_END.slice(0, 10));
      if (releasesError) throw releasesError;
      if (!releases?.length) return [];

      // ── 2. Start dates from ph_versions ───────────────────────────────────
      // ph_versions.start_date is the authoritative Jira sprint/version start
      // date (synced via wh-jira-bulk-sync v.startDate). rh_releases has no
      // start_date column. Fallback: target_date - 14 days (standard sprint).
      const { data: phVersions } = await supabase
        .from('ph_versions' as any)
        .select('jira_id, name, start_date')
        .eq('project_key', pKey);

      const versionByJiraId = new Map<string, string | null>();
      const versionByName  = new Map<string, string | null>();
      for (const v of phVersions ?? []) {
        if (v.jira_id) versionByJiraId.set(v.jira_id, v.start_date ?? null);
        if (v.name)    versionByName.set(v.name,    v.start_date ?? null);
      }

      // ── 3. Issues with fix_versions ───────────────────────────────────────
      const { data: issues, error: issuesError } = await supabase
        .from('ph_issues')
        .select('id, fix_versions, jira_created_at')
        .eq('project_key', pKey)
        .is('deleted_at', null)
        .or(or2026('jira_created_at', 'jira_updated_at'));
      if (issuesError) throw issuesError;

      // ── 4. ph_activity_log — fix_version assignment events ────────────────
      // Covers both:
      //   • Catalyst-native edits  → field_name = 'fix_versions'  (written by
      //     IssueContentView / StoryDetailModal since Apr 2026 wiring)
      //   • Jira-mirrored history  → field_name = 'Fix Version'   (mirrored
      //     from jira_sync_changelog by wh-jira-bulk-sync)
      // This is the single Catalyst-native source of truth going forward;
      // jira_sync_changelog is NOT queried directly (Jira decommission ready).
      const issueIds = (issues ?? []).map(i => i.id).filter(Boolean);
      const activityByItemId = new Map<string, { new_value: string; created_at: string }[]>();

      if (issueIds.length > 0) {
        // Batch in chunks of 500 to stay within Supabase .in() limits
        for (let i = 0; i < issueIds.length; i += 500) {
          const chunk = issueIds.slice(i, i + 500);
          const { data: actRows } = await supabase
            .from('ph_activity_log')
            .select('work_item_id, new_value, created_at')
            .in('work_item_id', chunk)
            .in('field_name', ['fix_versions', 'Fix Version'])
            .not('new_value', 'is', null);

          for (const row of actRows ?? []) {
            if (!activityByItemId.has(row.work_item_id)) {
              activityByItemId.set(row.work_item_id, []);
            }
            activityByItemId.get(row.work_item_id)!.push({
              new_value: row.new_value,
              created_at: row.created_at,
            });
          }
        }
      }

      // ── 5. Compute per-release scope change ───────────────────────────────
      const results: { releaseName: string; totalItems: number; addedAfterStart: number; deltaPercent: number }[] = [];

      for (const rel of releases) {
        // Resolve start_date: jira_key match → name match → target_date proxy
        const startDateStr: string | null =
          (rel.jira_key ? versionByJiraId.get(rel.jira_key) ?? null : null) ??
          versionByName.get(rel.name) ??
          null;

        let startDate: Date;
        if (startDateStr) {
          startDate = new Date(startDateStr);
        } else if (rel.target_date) {
          startDate = new Date(rel.target_date);
          startDate.setDate(startDate.getDate() - 14);
        } else {
          continue;
        }

        let totalItems    = 0;
        let addedAfterStart = 0;

        for (const issue of issues ?? []) {
          const fv = issue.fix_versions;
          const issueVersions = Array.isArray(fv) ? fv : [];
          const belongsToRelease = issueVersions.some((v: any) =>
            typeof v === 'string' ? v === rel.name : v?.name === rel.name
          );
          if (!belongsToRelease) continue;
          totalItems++;

          const actEntries = activityByItemId.get(issue.id) ?? [];

          // Does any activity log entry show this release being assigned after start?
          const hasActivityForThisRelease = actEntries.some(e =>
            e.new_value?.split(',').map(s => s.trim()).includes(rel.name) ||
            e.new_value === rel.name
          );

          if (hasActivityForThisRelease) {
            // Use activity log as the authoritative signal
            const assignedAfterStart = actEntries.some(e => {
              const releaseInEntry =
                e.new_value?.split(',').map(s => s.trim()).includes(rel.name) ||
                e.new_value === rel.name;
              return releaseInEntry && new Date(e.created_at) > startDate;
            });
            if (assignedAfterStart) addedAfterStart++;
          } else {
            // No activity log entry yet — fall back to jira_created_at proxy.
            // This covers issues predating the activity-log wiring (pre Apr 2026)
            // and will self-correct as new edits are logged going forward.
            if (issue.jira_created_at && new Date(issue.jira_created_at) > startDate) {
              addedAfterStart++;
            }
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

// ─── Production Incidents (from ph_issues filtered by issue_type) ───
export function useDashboardIncidents(
  projectId: string | null | undefined,
  projectKey?: string | null,
  filters: DashboardDateFilter = {},
) {
  const { dateFrom = null, dateTo = null } = filters;
  return useQuery({
    queryKey: ['ph-dashboard-incidents', projectId, projectKey, dateFrom, dateTo],
    queryFn: async () => {
      const pKey = projectKey ?? (await getProjectKey(projectId!));
      if (!pKey) return [];

      let q = supabase
        .from('ph_issues')
        .select('id, issue_key, summary, priority, status, status_category, assignee_display_name, reporter_display_name, jira_created_at, resolution')
        .eq('project_key', pKey)
        .eq('issue_type', 'Production Incident')
        .is('deleted_at', null);

      if (dateFrom) q = q.gte('jira_created_at', dateFrom);
      if (dateTo) q = q.lte('jira_created_at', dateTo);
      if (!dateFrom && !dateTo) q = q.or(or2026('jira_created_at', 'jira_updated_at'));

      const { data, error } = await q
        .order('jira_created_at', { ascending: false })
        .limit(10);
      if (error) throw error;

      const avatarMap = await getAvatarMap();

      return (data ?? []).map((inc: any) => ({
        ...inc,
        assignee_avatar_url: resolveAvatarUrl(avatarMap, inc.assignee_display_name),
        days_open: inc.jira_created_at
          ? Math.max(0, Math.floor((Date.now() - new Date(inc.jira_created_at).getTime()) / 86400000))
          : 0,
      }));
    },
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

// ─── QA Defects (cross-hub from tm_defects) ───
export function useDashboardDefects(
  projectId: string | null | undefined,
  projectKey?: string | null,
  filters: DashboardDateFilter = {},
) {
  const { dateFrom = null, dateTo = null } = filters;
  return useQuery({
    queryKey: ['ph-dashboard-defects', projectId, projectKey, dateFrom, dateTo],
    queryFn: async () => {
      let allDefects: any[] = [];
      const avatarMap = await getAvatarMap();

      // Per-gadget date filter overrides 2026 guardrail when supplied
      const applyDate = (q: any) => {
        if (dateFrom) q = q.gte('created_at', dateFrom);
        if (dateTo) q = q.lte('created_at', dateTo);
        if (!dateFrom && !dateTo) {
          const dateOr = `and(created_at.gte.${YEAR_2026_START},created_at.lt.${YEAR_2026_END}),and(updated_at.gte.${YEAR_2026_START},updated_at.lt.${YEAR_2026_END})`;
          q = q.or(dateOr);
        }
        return q;
      };

      // Fetch Jira-synced defects by project key
      if (projectKey) {
        let jq = supabase
          .from('tm_defects')
          .select('id, defect_key, title, severity, status, created_at, jira_key, jira_source, jira_assignee_name')
          .eq('jira_project_key', projectKey);
        jq = applyDate(jq);
        const { data: jiraDefects } = await jq.order('created_at', { ascending: false }).limit(10);
        if (jiraDefects?.length) allDefects.push(...jiraDefects);
      }

      // Also fetch native defects by project_id
      let nq = supabase
        .from('tm_defects')
        .select('id, defect_key, title, severity, status, created_at, jira_key, jira_source, jira_assignee_name')
        .eq('project_id', projectId!)
        .eq('jira_source', false);
      nq = applyDate(nq);
      const { data: nativeDefects } = await nq.order('created_at', { ascending: false }).limit(10);
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

// ─── Recent Activity (from work_item_activity, joined to ph_issues) ───
const ACTIVITY_LABELS: Record<string, string> = {
  viewed: 'Viewed',
  updated: 'Updated',
  commented: 'Comment added',
  assigned: 'Assigned',
  status_changed: 'Status changed',
};

export interface DashboardActivityItem {
  id: string;
  work_item_id: string;
  work_item_type: string;
  activity_type: string;
  activity_label: string;
  occurred_at: string | null;
  metadata: any;
  issue_key: string | null;
  summary: string | null;
  status: string | null;
}

export function useDashboardRecentActivity(
  projectId: string | null | undefined,
  filters: DashboardDateFilter = {},
) {
  const { dateFrom = null, dateTo = null } = filters;
  return useQuery<DashboardActivityItem[]>({
    queryKey: ['ph-dashboard-recent-activity', projectId, dateFrom, dateTo],
    queryFn: async () => {
      const pKey = await getProjectKey(projectId!);
      if (!pKey) return [];

      // 🛡️ 2026 GUARDRAIL on parent issues (used to scope activity to this project)
      const { data: issues, error: issuesError } = await supabase
        .from('ph_issues')
        .select('id, issue_key, summary, status')
        .eq('project_key', pKey)
        .is('deleted_at', null)
        .or(or2026('jira_created_at', 'jira_updated_at'));
      if (issuesError) throw issuesError;

      const issueMap = new Map<string, { issue_key: string | null; summary: string | null; status: string | null }>();
      for (const i of issues ?? []) {
        if (i.id) issueMap.set(i.id, { issue_key: i.issue_key, summary: i.summary, status: i.status });
      }
      if (!issueMap.size) return [];

      // Per-gadget date filter overrides 2026 guardrail when supplied
      let aq = supabase
        .from('work_item_activity')
        .select('id, work_item_id, work_item_type, activity_type, occurred_at, metadata');
      if (dateFrom) aq = aq.gte('occurred_at', dateFrom);
      else aq = aq.gte('occurred_at', YEAR_2026_START);
      if (dateTo) aq = aq.lte('occurred_at', dateTo);
      else if (!dateFrom) aq = aq.lt('occurred_at', YEAR_2026_END);

      const { data: activity, error: actError } = await aq
        .order('occurred_at', { ascending: false })
        .limit(500);
      if (actError) throw actError;

      const scoped = (activity ?? []).filter((a: any) => issueMap.has(a.work_item_id)).slice(0, 20);

      // Step C: merge
      return scoped.map((a: any) => {
        const issue = issueMap.get(a.work_item_id);
        return {
          id: a.id,
          work_item_id: a.work_item_id,
          work_item_type: a.work_item_type,
          activity_type: a.activity_type,
          activity_label: ACTIVITY_LABELS[a.activity_type] ?? a.activity_type,
          occurred_at: a.occurred_at,
          metadata: a.metadata,
          issue_key: issue?.issue_key ?? null,
          summary: issue?.summary ?? null,
          status: issue?.status ?? null,
        };
      });
    },
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

// ─── Release Health (active release progress) ───
//
// Hybrid filter wiring (Apr 25, 2026):
//   - Layer 1 (page-level date) → filterFrom/filterTo override the 2026
//     guardrail when provided. When null, the existing 2026 window stays.
//   - Layer 2 (gadget-level) → releaseFilter narrows the returned rows by
//     release name; maxRows caps how many we return.
export interface DashboardReleaseHealthFilters {
  dateFrom?: string | null;
  dateTo?: string | null;
  releaseFilter?: string[];
  maxRows?: number;
}

export function useDashboardReleaseHealth(
  projectId: string | null | undefined,
  filters: DashboardReleaseHealthFilters = {},
) {
  const { dateFrom = null, dateTo = null, releaseFilter = [], maxRows } = filters;
  return useQuery({
    queryKey: ['ph-dashboard-release-health', projectId, dateFrom, dateTo, releaseFilter, maxRows],
    queryFn: async () => {
      console.log('[ReleaseHealth] filter received:', filters);
      console.log('[ReleaseHealth] dateFrom:', dateFrom, 'dateTo:', dateTo);
      const pKey = await getProjectKey(projectId!);
      if (!pKey) return [];

      const canonicalProjectId = await getCanonicalProjectId(projectId!, pKey);

      // Build the date predicate: page filter takes precedence; otherwise
      // fall back to the 2026 guardrail.
      const datePredicate =
        dateFrom && dateTo
          ? `and(target_date.gte.${dateFrom},target_date.lte.${dateTo}),` +
            `and(updated_at.gte.${dateFrom},updated_at.lte.${dateTo})`
          : `and(target_date.gte.${YEAR_2026_START.slice(0, 10)},target_date.lt.${YEAR_2026_END.slice(0, 10)}),` +
            `and(updated_at.gte.${YEAR_2026_START},updated_at.lt.${YEAR_2026_END})`;

      let q = supabase
        .from('rh_releases')
        .select('id, name, status, target_date, updated_at')
        .eq('project_id', canonicalProjectId)
        .neq('status', 'done');

      // Only apply the date predicate when filtering. "All active" (both
      // dates null AND no fallback needed) is handled by the else branch
      // above — which still applies the 2026 window. To truly bypass dates
      // (preset='all'), pass dateFrom='1900-01-01', dateTo='2999-12-31' or
      // wire a sentinel — current spec keeps the 2026 floor.
      q = q.or(datePredicate);

      if (releaseFilter.length > 0) {
        q = q.in('name', releaseFilter);
      }

      const { data: releases, error: relHealthRelError } = await q.order('target_date', { ascending: true });
      if (relHealthRelError) throw relHealthRelError;
      if (!releases?.length) return [];

      // NOTE: No date guardrail on ph_issues here — the 2026 scope is enforced
      // by rh_releases.target_date above. Filtering issues by jira_created_at /
      // jira_updated_at silently drops items linked to in-scope releases that
      // were last touched in 2025, causing gadget/UWV count mismatch.
      //
      // CRITICAL: Filter by fix_versions server-side. Without this, a project
      // with >1000 issues hits the Supabase default row cap and silently drops
      // release-linked items (BAU has 1,128 active issues → 29 vs real 31).
      const releaseNames = releases.map(r => r.name);
      const fvOrClause = releaseNames
        .map(n => `fix_versions.cs.${JSON.stringify([{ name: n }])}`)
        .join(',');
      const { data: issues, error: relHealthIssError } = await supabase
        .from('ph_issues')
        .select('fix_versions, status_category')
        .eq('project_key', pKey)
        .is('deleted_at', null)
        .or(fvOrClause)
        .limit(5000);
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
