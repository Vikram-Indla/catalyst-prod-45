/**
 * Dashboard V4 — TanStack Query hooks for widget data
 * All queries use REAL Supabase data — zero mocks.
 *
 * ═══════════════════════════════════════════════════════════════
 * 🛡️  FISCAL SCOPE — PLATFORM-WIDE DASHBOARD POLICY (Apr 26, 2026)
 * ═══════════════════════════════════════════════════════════════
 * Every dashboard widget MUST scope to the project's CURRENT fiscal
 * surface, defined as the union of three conditions:
 *   1. Item created in 2026, OR
 *   2. Item updated in 2026, OR
 *   3. Item is in an active release (fix_versions contains the name
 *      of any release whose status is not archived/released/shipped).
 *
 * The third condition catches carry-in work assigned to active 2026
 * releases whose Jira sync hasn't ticked the updated_at column.
 * Without it, dashboards under-count active scope.
 *
 * Use YEAR_2026_START / YEAR_2026_END constants and the async
 * `fiscalScopeFor(pKey, createdCol, updatedCol)` helper. Do NOT
 * remove or weaken these filters without an explicit guardrail-
 * amendment note in this header. Owner: Vikram.
 * ═══════════════════════════════════════════════════════════════
 */
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';

// "Active" releases = not archived/released/shipped
const INACTIVE_STATUSES = ['archived', 'released', 'shipped'] as const;

// 🛡️ 2026 GUARDRAIL — fiscal window boundaries
export const YEAR_2026_START = '2026-01-01T00:00:00.000Z';
export const YEAR_2026_END   = '2027-01-01T00:00:00.000Z';

// Module-level cache for active release names per project_key. Many
// widget hooks fire concurrently and would otherwise each issue an
// identical SELECT against `releases`. 60s TTL — releases rarely
// change mid-session.
const _activeReleaseNamesCache = new Map<string, { names: string[]; ts: number }>();
const ACTIVE_RELEASE_TTL_MS = 60_000;

async function getActiveReleaseNamesForKey(pKey: string | null | undefined): Promise<string[]> {
  if (!pKey) return [];
  const cached = _activeReleaseNamesCache.get(pKey);
  if (cached && Date.now() - cached.ts < ACTIVE_RELEASE_TTL_MS) return cached.names;
  // Translate pKey → canonical projects.id (releases.project_id targets this).
  const { data: proj } = await supabase
    .from('projects')
    .select('id')
    .eq('key', pKey)
    .maybeSingle();
  if (!proj?.id) {
    _activeReleaseNamesCache.set(pKey, { names: [], ts: Date.now() });
    return [];
  }
  const { data } = await supabase
    .from('releases')
    .select('name')
    .eq('project_id', proj.id)
    .not('status', 'in', `(${INACTIVE_STATUSES.join(',')})`);
  const names = ((data ?? []) as any[]).map((r) => r.name).filter(Boolean);
  _activeReleaseNamesCache.set(pKey, { names, ts: Date.now() });
  return names;
}

/**
 * Build a Supabase .or() expression that scopes a ph_issues query to
 * the canonical fiscal surface: 2026 created/updated OR currently in
 * an active release.
 *
 * Returns a string ready for `q.or(...)`. Async because we need to
 * fetch the active release names — caller's queryFn is already async.
 *
 * Backwards-compat alias `or2026(createdCol, updatedCol)` is kept for
 * call sites that have NOT yet been migrated; it returns the legacy
 * 2-clause OR (no release scope). New code should prefer
 * fiscalScopeFor(pKey, ...).
 */
async function fiscalScopeFor(
  pKey: string | null | undefined,
  createdCol: string,
  updatedCol: string,
): Promise<string> {
  const releaseNames = await getActiveReleaseNamesForKey(pKey);
  const baseClauses = [
    `and(${createdCol}.gte.${YEAR_2026_START},${createdCol}.lt.${YEAR_2026_END})`,
    `and(${updatedCol}.gte.${YEAR_2026_START},${updatedCol}.lt.${YEAR_2026_END})`,
  ];
  const releaseClauses = releaseNames.map(
    (name) => `fix_versions.cs.${JSON.stringify([{ name }])}`,
  );
  return [...baseClauses, ...releaseClauses].join(',');
}

/** @deprecated Use fiscalScopeFor(pKey, ...) — broader scope (also matches active releases). */
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

/**
 * Layer 2 (per-gadget) filter dimensions persisted by useGadgetSettings.
 * Every ph_issues-backed widget hook accepts these and AND-combines any
 * non-empty filter into the underlying Supabase query. Each filter array
 * also participates in the queryKey so a settings change triggers a refetch.
 */
export interface DashboardWidgetFilters extends DashboardDateFilter {
  statusFilter?: string[];      // matched against ph_issues.status_category
  releaseFilter?: string[];     // JSONB containment on ph_issues.fix_versions
  assigneeFilter?: string[];    // matched against ph_issues.assignee_display_name
  itemTypeFilter?: string[];    // matched against ph_issues.issue_type
  priorityFilter?: string[];    // matched against ph_issues.priority
}

/** Apply Layer 2 filters to a ph_issues query builder. Mutates and returns q. */
function applyPhIssuesLayer2Filters(q: any, f: DashboardWidgetFilters): any {
  if (f.statusFilter?.length)   q = q.in('status_category', f.statusFilter);
  if (f.assigneeFilter?.length) q = q.in('assignee_display_name', f.assigneeFilter);
  if (f.itemTypeFilter?.length) q = q.in('issue_type', f.itemTypeFilter);
  if (f.priorityFilter?.length) q = q.in('priority', f.priorityFilter);
  if (f.releaseFilter?.length) {
    const orClause = f.releaseFilter
      .map((name: string) => `fix_versions.cs.${JSON.stringify([{ name }])}`)
      .join(',');
    q = q.or(orClause);
  }
  return q;
}


export function useDashboardStatusCounts(
  projectId: string | null | undefined,
  filters: DashboardWidgetFilters & { blockedStatuses?: string[] } = {},
) {
  const {
    dateFrom = null,
    dateTo = null,
    statusFilter = [], releaseFilter = [], assigneeFilter = [],
    itemTypeFilter = [], priorityFilter = [],
    blockedStatuses = ['on hold', 'blocked', 'awaiting info', 'impediment'],
  } = filters;

  return useQuery({
    queryKey: ['ph-dashboard-status-counts', projectId, dateFrom, dateTo,
      statusFilter, releaseFilter, assigneeFilter, itemTypeFilter, priorityFilter,
      blockedStatuses],
    queryFn: async () => {
      const pKey = await getProjectKey(projectId!);
      if (!pKey) return {
        todo: 0, inProgress: 0, done: 0, blocked: 0, total: 0,
        blockedDetail: { onHold: 0, awaitingInfo: 0, blocked: 0 },
      };

      let q = supabase
        .from('ph_issues')
        .select('status_category, status')
        .eq('project_key', pKey)
        .is('deleted_at', null);

      if (dateFrom) q = q.gte('jira_created_at', dateFrom);
      if (dateTo)   q = q.lte('jira_created_at', dateTo);
      if (!dateFrom && !dateTo) q = q.or(await fiscalScopeFor(pKey,'jira_created_at', 'jira_updated_at'));

      // Apply Release / Assignee / Item Type / Priority / Status filters
      // from the gadget settings panel (Layer 2). Same helper used by all
      // other dashboard hooks for consistency.
      q = applyPhIssuesLayer2Filters(q, filters);

      const { data: issues, error } = await q;
      if (error) throw error;

      const counts = {
        todo: 0, inProgress: 0, done: 0, blocked: 0, total: 0,
        blockedDetail: { onHold: 0, awaitingInfo: 0, blocked: 0 },
      };

      for (const issue of issues ?? []) {
        counts.total++;
        const rawStatus = (issue.status ?? '').toLowerCase();
        const cat       = (issue.status_category ?? '').toLowerCase();

        // Blocked check fires first — pulls matching items out of todo/inProgress.
        const isBlocked = blockedStatuses.some((s) => rawStatus.includes(s.toLowerCase()));

        if (isBlocked) {
          counts.blocked++;
          if (rawStatus.includes('awaiting'))   counts.blockedDetail.awaitingInfo++;
          else if (rawStatus.includes('block')) counts.blockedDetail.blocked++;
          else                                  counts.blockedDetail.onHold++;
        } else if (cat === 'done') {
          counts.done++;
        } else if (cat === 'in progress' || cat === 'in_progress') {
          counts.inProgress++;
        } else {
          counts.todo++;
        }
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
  filters: DashboardWidgetFilters = {},
) {
  const { dateFrom = null, dateTo = null,
    statusFilter = [], releaseFilter = [], assigneeFilter = [],
    itemTypeFilter = [], priorityFilter = [] } = filters;
  return useQuery({
    queryKey: ['ph-dashboard-overdue', projectId, dateFrom, dateTo,
      statusFilter, releaseFilter, assigneeFilter, itemTypeFilter, priorityFilter],
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

      if (dateFrom) q = q.gte('effective_due_date', dateFrom);
      if (dateTo) q = q.lte('effective_due_date', dateTo);
      if (!dateFrom && !dateTo) q = q.or(await fiscalScopeFor(pKey,'effective_due_date', 'effective_due_date'));

      q = applyPhIssuesLayer2Filters(q, filters);

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
  filters: DashboardWidgetFilters = {},
) {
  const { dateFrom = null, dateTo = null,
    statusFilter = [], releaseFilter = [], assigneeFilter = [],
    itemTypeFilter = [], priorityFilter = [] } = filters;
  return useQuery({
    queryKey: ['ph-dashboard-on-hold', projectId, dateFrom, dateTo,
      statusFilter, releaseFilter, assigneeFilter, itemTypeFilter, priorityFilter],
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
      if (!dateFrom && !dateTo) q = q.or(await fiscalScopeFor(pKey,'jira_created_at', 'jira_updated_at'));

      q = applyPhIssuesLayer2Filters(q, filters);

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
  filters: DashboardWidgetFilters = {},
) {
  const { dateFrom = null, dateTo = null,
    statusFilter = [], releaseFilter = [], assigneeFilter = [],
    itemTypeFilter = [], priorityFilter = [] } = filters;
  return useQuery({
    queryKey: ['ph-dashboard-team-workload', projectId, dateFrom, dateTo,
      statusFilter, releaseFilter, assigneeFilter, itemTypeFilter, priorityFilter],
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
      if (!dateFrom && !dateTo) q = q.or(await fiscalScopeFor(pKey,'jira_created_at', 'jira_updated_at'));

      q = applyPhIssuesLayer2Filters(q, filters);

      const { data: issues, error } = await q;
      if (error) throw error;

      type WorkloadEntry = {
        assignee: string;
        total: number;
        stories: number;
        bugs: number;
        subtasks: number;
      };
      const map = new Map<string, WorkloadEntry>();
      // Three-way partition (Apr 26, 2026) — total = stories + bugs + subtasks.
      //   bugs     = defect family (bug / defect / production incident)
      //   subtasks = sub-task / subtask (any casing / hyphen variant)
      //   stories  = everything else (story / task / epic / feature / business request)
      // Subtasks were previously bucketed into stories, hiding the granular
      // load each engineer carries (most teams break stories into 5–10 subtasks,
      // so the subtask count dwarfs the story count).
      const isBugType = (t: string) => {
        const v = t.toLowerCase();
        return v === 'bug' || v === 'defect' || v === 'production incident' || v.includes('incident');
      };
      const isSubtaskType = (t: string) => {
        const v = t.toLowerCase().replace(/[-_\s]/g, '');
        return v === 'subtask';
      };
      for (const issue of issues ?? []) {
        const name = issue.assignee_display_name || 'Unassigned';
        if (!map.has(name)) {
          map.set(name, { assignee: name, total: 0, stories: 0, bugs: 0, subtasks: 0 });
        }
        const entry = map.get(name)!;
        entry.total++;
        const it = issue.issue_type ?? '';
        if (isBugType(it)) {
          entry.bugs++;
        } else if (isSubtaskType(it)) {
          entry.subtasks++;
        } else {
          entry.stories++;
        }
      }

      return Array.from(map.values()).sort((a, b) => b.total - a.total);
    },
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

// ─── Scope Change — per active release ───
export interface ScopeChangeRow {
  releaseId: string;
  releaseKey: string | null;
  releaseName: string;
  startDate: string | null;     // ISO 'YYYY-MM-DD' (resolved or fallback)
  endDate: string | null;       // ISO 'YYYY-MM-DD'
  originalCount: number;
  addedCount: number;
  totalItems: number;           // legacy alias = original + added
  addedAfterStart: number;      // legacy alias = addedCount
  deltaPercent: number;         // legacy alias = scopeChangePct
}

export function useDashboardScopeChange(
  projectId: string | null | undefined,
  filters: DashboardWidgetFilters & { showOnlyActive?: boolean } = {},
) {
  const {
    dateFrom = null, dateTo = null,
    statusFilter = [], releaseFilter = [], assigneeFilter = [],
    itemTypeFilter = [], priorityFilter = [],
    showOnlyActive = true,
  } = filters;

  return useQuery({
    queryKey: ['ph-dashboard-scope-change', projectId,
      dateFrom, dateTo, statusFilter, releaseFilter, assigneeFilter,
      itemTypeFilter, priorityFilter, showOnlyActive],
    queryFn: async (): Promise<ScopeChangeRow[]> => {
      const pKey = await getProjectKey(projectId!);
      if (!pKey) return [];

      const canonicalId = await getCanonicalProjectId(projectId!, pKey);

      // ── 1. Releases (2026 guardrail) ──────────────────────────────────────
      let relQ = supabase
        .from('rh_releases')
        .select('id, name, jira_key, target_date, status')
        .eq('project_id', canonicalId)
        .gte('target_date', YEAR_2026_START.slice(0, 10))
        .lt('target_date', YEAR_2026_END.slice(0, 10));
      if (showOnlyActive) relQ = relQ.neq('status', 'done');

      const { data: releases, error: releasesError } = await relQ;
      if (releasesError) throw releasesError;
      if (!releases?.length) return [];

      // ── 2. Start dates from ph_versions ───────────────────────────────────
      // Canonical date field for this gadget. Fallback: target_date - 14 days.
      const { data: phVersions } = await supabase
        .from('ph_versions' as any)
        .select('jira_id, name, start_date')
        .eq('project_key', pKey);

      const versionByJiraId = new Map<string, string | null>();
      const versionByName  = new Map<string, string | null>();
      for (const v of (phVersions ?? []) as unknown as Array<{ jira_id: string | null; name: string | null; start_date: string | null }>) {
        if (v.jira_id) versionByJiraId.set(v.jira_id, v.start_date ?? null);
        if (v.name)    versionByName.set(v.name,    v.start_date ?? null);
      }

      // ── 3. Issues with fix_versions (Layer 2 filters applied) ─────────────
      let issueQ = supabase
        .from('ph_issues')
        .select('id, fix_versions, jira_created_at, status_category, assignee_display_name, issue_type, priority')
        .eq('project_key', pKey)
        .is('deleted_at', null)
        .or(await fiscalScopeFor(pKey,'jira_created_at', 'jira_updated_at'));

      issueQ = applyPhIssuesLayer2Filters(issueQ, {
        statusFilter, releaseFilter, assigneeFilter, itemTypeFilter, priorityFilter,
      });

      const { data: issues, error: issuesError } = await issueQ;
      if (issuesError) throw issuesError;

      // ── 4. ph_activity_log — fix_version assignment events ────────────────
      const issueIds = (issues ?? []).map((i: any) => i.id).filter(Boolean);
      const activityByItemId = new Map<string, { new_value: string; created_at: string }[]>();

      if (issueIds.length > 0) {
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
      const dateFromMs = dateFrom ? new Date(dateFrom).getTime() : null;
      const dateToMs   = dateTo   ? new Date(dateTo).getTime()   : null;

      const results: ScopeChangeRow[] = [];

      for (const rel of releases as Array<{ id: string; name: string; jira_key: string | null; target_date: string | null }>) {
        // Resolve start_date: jira_key → name → target_date - 14d
        let resolvedStartIso: string | null =
          (rel.jira_key ? versionByJiraId.get(rel.jira_key) ?? null : null) ||
          versionByName.get(rel.name) ||
          null;

        let startDate: Date | null = null;
        if (resolvedStartIso) {
          startDate = new Date(resolvedStartIso);
        } else if (rel.target_date) {
          startDate = new Date(rel.target_date);
          startDate.setDate(startDate.getDate() - 14);
          resolvedStartIso = startDate.toISOString().slice(0, 10);
        } else {
          continue;
        }

        // Apply page-level date filter against canonical start_date
        const startMs = startDate.getTime();
        if (dateFromMs !== null && startMs < dateFromMs) continue;
        if (dateToMs   !== null && startMs > dateToMs)   continue;

        let originalCount = 0;
        let addedCount    = 0;

        for (const issue of (issues ?? []) as any[]) {
          const fv = issue.fix_versions;
          const issueVersions = Array.isArray(fv) ? fv : [];
          const belongsToRelease = issueVersions.some((v: any) =>
            typeof v === 'string' ? v === rel.name : v?.name === rel.name
          );
          if (!belongsToRelease) continue;

          const actEntries = activityByItemId.get(issue.id) ?? [];
          const hasActivityForThisRelease = actEntries.some(e =>
            e.new_value?.split(',').map(s => s.trim()).includes(rel.name) ||
            e.new_value === rel.name
          );

          let assignedAfterStart = false;
          if (hasActivityForThisRelease) {
            assignedAfterStart = actEntries.some(e => {
              const releaseInEntry =
                e.new_value?.split(',').map(s => s.trim()).includes(rel.name) ||
                e.new_value === rel.name;
              return releaseInEntry && new Date(e.created_at) > startDate!;
            });
          } else if (issue.jira_created_at && new Date(issue.jira_created_at) > startDate) {
            assignedAfterStart = true;
          }

          if (assignedAfterStart) addedCount++;
          else                    originalCount++;
        }

        const totalItems = originalCount + addedCount;
        const deltaPercent = originalCount === 0
          ? (addedCount > 0 ? 100 : 0)
          : Math.round((addedCount / originalCount) * 100);

        results.push({
          releaseId:   rel.id,
          releaseKey:  rel.jira_key,
          releaseName: rel.name || 'Unnamed Release',
          startDate:   resolvedStartIso,
          endDate:     rel.target_date,
          originalCount,
          addedCount,
          totalItems,
          addedAfterStart: addedCount,
          deltaPercent,
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
  filters: DashboardWidgetFilters = {},
) {
  const { dateFrom = null, dateTo = null,
    statusFilter = [], releaseFilter = [], assigneeFilter = [],
    itemTypeFilter = [], priorityFilter = [] } = filters;
  return useQuery({
    queryKey: ['ph-dashboard-incidents', projectId, projectKey, dateFrom, dateTo,
      statusFilter, releaseFilter, assigneeFilter, itemTypeFilter, priorityFilter],
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
      if (!dateFrom && !dateTo) q = q.or(await fiscalScopeFor(pKey,'jira_created_at', 'jira_updated_at'));

      // Layer 2 filters — note: itemType is fixed to 'Production Incident' for
      // this widget so itemTypeFilter is intentionally ignored here.
      if (statusFilter.length)   q = q.in('status_category', statusFilter);
      if (assigneeFilter.length) q = q.in('assignee_display_name', assigneeFilter);
      if (priorityFilter.length) q = q.in('priority', priorityFilter);
      if (releaseFilter.length) {
        const orClause = releaseFilter
          .map((name: string) => `fix_versions.cs.${JSON.stringify([{ name }])}`)
          .join(',');
        q = q.or(orClause);
      }

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
  filters: DashboardWidgetFilters = {},
) {
  const { dateFrom = null, dateTo = null,
    statusFilter = [], releaseFilter = [], assigneeFilter = [],
    itemTypeFilter = [], priorityFilter = [] } = filters;
  return useQuery({
    queryKey: ['ph-dashboard-defects', projectId, projectKey, dateFrom, dateTo,
      statusFilter, releaseFilter, assigneeFilter, itemTypeFilter, priorityFilter],
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

      // Layer 2 filter mapping for tm_defects (column shape differs from ph_issues):
      //   statusFilter   → status (text)
      //   priorityFilter → severity
      //   assigneeFilter → jira_assignee_name
      //   itemTypeFilter, releaseFilter → not modeled on tm_defects, ignored
      const applyLayer2 = (q: any) => {
        if (statusFilter.length)   q = q.in('status', statusFilter);
        if (priorityFilter.length) q = q.in('severity', priorityFilter);
        if (assigneeFilter.length) q = q.in('jira_assignee_name', assigneeFilter);
        return q;
      };

      // Fetch Jira-synced defects by project key
      if (projectKey) {
        let jq = supabase
          .from('tm_defects')
          .select('id, defect_key, title, severity, status, created_at, jira_key, jira_source, jira_assignee_name')
          .eq('jira_project_key', projectKey);
        jq = applyDate(jq);
        jq = applyLayer2(jq);
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
      nq = applyLayer2(nq);
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
  // Actor proxy fields. None of our three sources (ph_issues,
  // catalyst_status_history, tm_defects) capture the Jira changelog
  // author, so we fall back to the issue's assignee — the most likely
  // person to have triggered the update. When neither is known (truly
  // automated transitions), actor_name stays null and the widget
  // renders the "System" cog avatar.
  actor_name: string | null;
  actor_avatar_url: string | null;
}

const ACTIVITY_PAGE_SIZE = 10;

export function useDashboardRecentActivity(
  projectId: string | null | undefined,
  filters: DashboardWidgetFilters = {},
) {
  const { dateFrom = null, dateTo = null,
    statusFilter = [], releaseFilter = [], assigneeFilter = [],
    itemTypeFilter = [], priorityFilter = [] } = filters;
  return useInfiniteQuery({
    queryKey: ['ph-dashboard-recent-activity-v5', projectId, dateFrom, dateTo,
      statusFilter, releaseFilter, assigneeFilter, itemTypeFilter, priorityFilter],
    initialPageParam: 0,
    getNextPageParam: (last: any) => last?.nextOffset ?? null,
    queryFn: async ({ pageParam = 0 }) => {
      const offset = pageParam as number;
      const pKey = await getProjectKey(projectId!);
      if (!pKey) return { items: [] as DashboardActivityItem[], nextOffset: null };

      // ─── DEFAULT: last 14 days. The previous implementation read from
      // `work_item_activity` which is RLS-locked per user_id (not project-
      // scoped) and contains only 3 rows in this tenant — useless for a
      // project-level "what's happening" feed. New implementation merges
      // three project-scoped sources:
      //   1. ph_issues — every recently-updated issue
      //   2. catalyst_status_history — every status transition
      //   3. tm_defects — every recently-updated QA defect
      // Result is sorted desc by occurred_at, capped at 20 rows.
      const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;
      const fromIso = dateFrom ?? new Date(Date.now() - TWO_WEEKS_MS).toISOString();
      const toIso = dateTo ?? new Date().toISOString();

      const events: DashboardActivityItem[] = [];

      // Avatar map shared across all three sources. Same pattern as
      // useDashboardIncidents / useDashboardDefects.
      const avatarMap = await getAvatarMap();

      // Track issue_keys we've seen on ph_issues so we can join their
      // assignees onto status_history rows below (saves a second round-trip
      // for transitions whose issue we already loaded).
      const phAssigneeByKey = new Map<string, string | null>();

      // 1. ph_issues — updates within the window
      try {
        let iq = supabase
          .from('ph_issues')
          .select('issue_key, summary, status, issue_type, jira_created_at, jira_updated_at, assignee_display_name')
          .eq('project_key', pKey)
          .is('deleted_at', null)
          .gte('jira_updated_at', fromIso)
          .lte('jira_updated_at', toIso);
        iq = applyPhIssuesLayer2Filters(iq, filters);
        const { data: issues } = await iq.order('jira_updated_at', { ascending: false }).limit(50);
        for (const i of issues ?? []) {
          const created = i.jira_created_at ? new Date(i.jira_created_at).getTime() : 0;
          const updated = i.jira_updated_at ? new Date(i.jira_updated_at).getTime() : 0;
          const isCreated = updated && created && Math.abs(updated - created) < 60_000;
          const assignee = i.assignee_display_name ?? null;
          if (assignee) phAssigneeByKey.set(i.issue_key, assignee);
          events.push({
            id: `ph:${i.issue_key}:${i.jira_updated_at}`,
            work_item_id: i.issue_key,
            work_item_type: i.issue_type ?? 'task',
            activity_type: isCreated ? 'created' : 'updated',
            activity_label: isCreated ? 'Created' : 'Updated',
            occurred_at: i.jira_updated_at,
            metadata: { assignee },
            issue_key: i.issue_key,
            summary: i.summary,
            status: i.status,
            actor_name: assignee,
            actor_avatar_url: resolveAvatarUrl(avatarMap, assignee),
          });
        }
      } catch {
        /* soft-fail per source */
      }

      // 2. catalyst_status_history — status transitions within the window
      try {
        const { data: trans } = await typedQuery('catalyst_status_history')
          .select('issue_key, from_status, to_status, changed_at, actor_name, actor_account_id')
          .eq('project_key', pKey)
          .gte('changed_at', fromIso)
          .lte('changed_at', toIso)
          .order('changed_at', { ascending: false })
          .limit(50) as { data: any[] | null };

        // Backfill assignees for transition issue_keys we DIDN'T already
        // load via ph_issues above. One round-trip, batched IN clause.
        const missingKeys = Array.from(
          new Set(
            (trans ?? [])
              .map((t: any) => t.issue_key as string)
              .filter((k) => k && !phAssigneeByKey.has(k)),
          ),
        );
        if (missingKeys.length) {
          try {
            const { data: extra } = await supabase
              .from('ph_issues')
              .select('issue_key, assignee_display_name')
              .in('issue_key', missingKeys);
            for (const r of extra ?? []) {
              phAssigneeByKey.set(r.issue_key, r.assignee_display_name ?? null);
            }
          } catch {
            /* assignee enrichment is best-effort */
          }
        }

        for (const t of trans ?? []) {
          const assignee = phAssigneeByKey.get(t.issue_key) ?? null;
          // Prefer the real Jira changelog actor (populated by the
          // wh-jira-changelog-backfill edge function) and fall back to the
          // current assignee only when actor is unknown — e.g. transitions
          // recorded by the live trigger before the backfill catches up.
          const actor = (t as any).actor_name ?? assignee;
          events.push({
            id: `csh:${t.issue_key}:${t.changed_at}:${t.to_status}`,
            work_item_id: t.issue_key,
            work_item_type: 'task',
            activity_type: 'status_changed',
            activity_label: t.from_status
              ? `transitioned to ${t.to_status}`
              : `set status to ${t.to_status}`,
            occurred_at: t.changed_at,
            metadata: {
              from_status: t.from_status,
              to_status: t.to_status,
              assignee,
              actor_account_id: (t as any).actor_account_id ?? null,
            },
            issue_key: t.issue_key,
            summary: null,
            status: t.to_status,
            actor_name: actor,
            actor_avatar_url: resolveAvatarUrl(avatarMap, actor),
          });
        }
      } catch {
        /* table may not exist — soft-fail */
      }

      // 3. tm_defects — QA defect updates within the window
      try {
        const { data: defects } = await supabase
          .from('tm_defects')
          .select('defect_key, jira_key, title, status, severity, jira_assignee_name, created_at, updated_at')
          .eq('jira_project_key', pKey)
          .gte('updated_at', fromIso)
          .lte('updated_at', toIso)
          .order('updated_at', { ascending: false })
          .limit(50);
        for (const d of defects ?? []) {
          const assignee = d.jira_assignee_name ?? null;
          events.push({
            id: `def:${d.defect_key ?? d.jira_key}:${d.updated_at}`,
            work_item_id: d.jira_key ?? d.defect_key,
            work_item_type: 'bug',
            activity_type: 'updated',
            // Verb reads naturally with the assignee as actor:
            // "Yazeed updated BAU-4510". Falls back to "updated" cleanly
            // when actor is null and the widget renders "System updated".
            activity_label: 'updated',
            occurred_at: d.updated_at,
            metadata: { severity: d.severity, assignee },
            issue_key: d.jira_key ?? d.defect_key,
            summary: d.title,
            status: d.status,
            actor_name: assignee,
            actor_avatar_url: resolveAvatarUrl(avatarMap, assignee),
          });
        }
      } catch {
        /* soft-fail */
      }

      // Sort merged events by recency desc, dedupe by id
      const seen = new Set<string>();
      const merged = events
        .filter((e) => {
          if (seen.has(e.id)) return false;
          seen.add(e.id);
          return true;
        })
        .sort((a, b) => {
          const ta = a.occurred_at ? new Date(a.occurred_at).getTime() : 0;
          const tb = b.occurred_at ? new Date(b.occurred_at).getTime() : 0;
          return tb - ta;
        });

      // Page slice — return PAGE_SIZE rows starting at offset
      const page = merged.slice(offset, offset + ACTIVITY_PAGE_SIZE);
      const hasMore = merged.length > offset + ACTIVITY_PAGE_SIZE;
      return {
        items: page,
        nextOffset: hasMore ? offset + ACTIVITY_PAGE_SIZE : null,
        total: merged.length,
      };
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
  statusFilter?: string[];
  assigneeFilter?: string[];
  itemTypeFilter?: string[];
  priorityFilter?: string[];
  maxRows?: number;
}

export function useDashboardReleaseHealth(
  projectId: string | null | undefined,
  filters: DashboardReleaseHealthFilters = {},
) {
  const { dateFrom = null, dateTo = null, releaseFilter = [],
    statusFilter = [], assigneeFilter = [], itemTypeFilter = [], priorityFilter = [],
    maxRows } = filters;
  return useQuery({
    queryKey: ['ph-dashboard-release-health', projectId, dateFrom, dateTo, releaseFilter,
      statusFilter, assigneeFilter, itemTypeFilter, priorityFilter, maxRows],
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
      let issuesQ = supabase
        .from('ph_issues')
        .select('fix_versions, status_category')
        .eq('project_key', pKey)
        .is('deleted_at', null)
        .or(fvOrClause);
      if (statusFilter.length)   issuesQ = issuesQ.in('status_category', statusFilter);
      if (assigneeFilter.length) issuesQ = issuesQ.in('assignee_display_name', assigneeFilter);
      if (itemTypeFilter.length) issuesQ = issuesQ.in('issue_type', itemTypeFilter);
      if (priorityFilter.length) issuesQ = issuesQ.in('priority', priorityFilter);
      const { data: issues, error: relHealthIssError } = await issuesQ.limit(5000);
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

// ─── Time in Status — workflow-aware matrix (Apr 25, 2026 v2) ───
//
// Reads `catalyst_status_history` (forward-tracked from ph_issues trigger)
// + `ph_issues` for ticket metadata + `catalyst_workflow_statuses` for the
// column definitions of the selected issue type. Computes time spent in
// each status per ticket.
//
// Algorithm per ticket:
//   1. Fetch transitions ordered by changed_at ASC.
//   2. Synthesize a "creation" anchor at jira_created_at with from=null,
//      to=<first transition's from_status OR current status>.
//   3. Pairwise-walk: time_in[transition[i].from_status] += transition[i+1].changed_at - transition[i].changed_at
//   4. Time in current status = now() - last_transition.changed_at
//   5. Sum across all visits to the same status.
//
// Returns: { rows: TimeInStatusMatrixRow[], statusColumns: string[], total }
export interface TimeInStatusMatrixRow {
  issue_key: string;
  title: string;
  issue_type: string | null;
  current_status: string | null;
  priority: string | null;
  assignee_display_name: string | null;
  assignee_avatar_url: string | null;
  jira_created_at: string | null;
  /** ms spent in each status (summed across all visits), keyed by status name */
  byStatus: Record<string, number>;
  /** number of distinct visits to each status. > 1 means the ticket re-entered. */
  visitsByStatus: Record<string, number>;
  totalMs: number;
  hasHistory: boolean;
}

export interface TimeInStatusMatrixResult {
  rows: TimeInStatusMatrixRow[];
  statusColumns: { name: string; category: 'todo' | 'in_progress' | 'done'; position: number }[];
  total: number;
  hasAnyHistory: boolean;
}

interface TIMSFilters extends DashboardWidgetFilters {
  issueType: string;
  /** Page size for tickets (matrix rows). Default 50. */
  limit?: number;
  /** Offset for infinite scroll. Default 0. */
  offset?: number;
}

export function useTimeInStatusMatrix(
  projectKey: string | null | undefined,
  filters: TIMSFilters,
) {
  const {
    issueType,
    dateFrom = null,
    dateTo = null,
    assigneeFilter = [],
    priorityFilter = [],
    limit = 50,
    offset = 0,
  } = filters;

  return useQuery({
    queryKey: [
      'ph-time-in-status-matrix',
      projectKey,
      issueType,
      dateFrom,
      dateTo,
      assigneeFilter,
      priorityFilter,
      limit,
      offset,
    ],
    enabled: !!projectKey && !!issueType,
    staleTime: 60_000,
    queryFn: async (): Promise<TimeInStatusMatrixResult> => {
      // 1. Workflow status definitions — soft-fail if missing.
      //    Catalyst exposes columns even with zero schemes (degraded mode).
      let statusColumns: TimeInStatusMatrixResult['statusColumns'] = [];
      try {
        const { data: schemes } = await typedQuery('catalyst_workflow_schemes' as any)
          .select('id')
          .eq('issue_type', issueType)
          .eq('is_default', true)
          .eq('is_active', true)
          .limit(1);
        const schemeId = (schemes as any)?.[0]?.id;
        if (schemeId) {
          const { data: statuses } = await typedQuery('catalyst_workflow_statuses' as any)
            .select('name, category, position')
            .eq('scheme_id', schemeId)
            .order('position', { ascending: true });
          statusColumns = ((statuses as any) ?? []).map((s: any) => ({
            name: s.name,
            category: s.category,
            position: s.position,
          }));
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[TimeInStatus] workflow lookup failed — falling back to discovered statuses', e);
      }

      // 2. Tickets — try with full select, fall back on column errors.
      // Pre-resolve the fiscal scope (created/updated 2026 OR active release)
      // outside the closures below so we don't `await` inside a sync arrow.
      const fiscalOrClause = (!dateFrom && !dateTo)
        ? await fiscalScopeFor(projectKey, 'jira_created_at', 'jira_updated_at')
        : null;
      let tickets: any[] | null = null;
      let count = 0;
      const buildQuery = () => {
        let tq = supabase
          .from('ph_issues')
          .select(
            'issue_key, project_key, summary, issue_type, status, priority, assignee_display_name, jira_created_at, jira_updated_at',
            { count: 'exact' },
          )
          .eq('project_key', projectKey!)
          .eq('issue_type', issueType);

        if (dateFrom) tq = tq.gte('jira_updated_at', dateFrom);
        if (dateTo) tq = tq.lte('jira_updated_at', dateTo);
        if (fiscalOrClause) tq = tq.or(fiscalOrClause);
        if (assigneeFilter.length) tq = tq.in('assignee_display_name', assigneeFilter);
        if (priorityFilter.length) tq = tq.in('priority', priorityFilter);

        return tq
          .order('jira_updated_at', { ascending: false })
          .range(offset, offset + limit - 1);
      };

      const r1 = await buildQuery();
      if (r1.error) {
        // Retry without `priority` (in case the column doesn't exist on this tenant)
        const fallbackSelect =
          'issue_key, project_key, summary, issue_type, status, assignee_display_name, jira_created_at, jira_updated_at';
        let tq2 = supabase
          .from('ph_issues')
          .select(fallbackSelect, { count: 'exact' })
          .eq('project_key', projectKey!)
          .eq('issue_type', issueType);
        if (dateFrom) tq2 = tq2.gte('jira_updated_at', dateFrom);
        if (dateTo) tq2 = tq2.lte('jira_updated_at', dateTo);
        if (fiscalOrClause) tq2 = tq2.or(fiscalOrClause);
        if (assigneeFilter.length) tq2 = tq2.in('assignee_display_name', assigneeFilter);
        const r2 = await tq2
          .order('jira_updated_at', { ascending: false })
          .range(offset, offset + limit - 1);
        if (r2.error) {
          // eslint-disable-next-line no-console
          console.error('[TimeInStatus] ph_issues query failed', r2.error);
          throw r2.error;
        }
        tickets = r2.data;
        count = r2.count ?? 0;
      } else {
        tickets = r1.data;
        count = r1.count ?? 0;
      }

      const issueKeys = (tickets ?? []).map((t: any) => t.issue_key);
      if (!issueKeys.length) {
        return {
          rows: [],
          statusColumns,
          total: count,
          hasAnyHistory: false,
        };
      }

      // 3. Transitions — soft-fail (RLS denial / missing table both ok).
      let transitions: any[] | null = [];
      try {
        const { data, error } = await typedQuery('catalyst_status_history')
          .select('issue_key, from_status, to_status, changed_at')
          .eq('project_key', projectKey!)
          .in('issue_key', issueKeys)
          .order('changed_at', { ascending: true }) as { data: any[] | null; error: any };
        if (error) {
          // eslint-disable-next-line no-console
          console.warn('[TimeInStatus] history fetch failed (likely RLS or empty table)', error);
        } else {
          transitions = data ?? [];
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[TimeInStatus] history fetch threw', e);
      }

      const txByKey = new Map<string, any[]>();
      (transitions ?? []).forEach((t: any) => {
        const arr = txByKey.get(t.issue_key) ?? [];
        arr.push(t);
        txByKey.set(t.issue_key, arr);
      });

      const avatarMap = await getAvatarMap();

      // 4. Compute matrix per ticket
      const now = Date.now();
      // Edge weights for chronological-frequency column sort:
      //   for every transition A→B observed, edges[A][B] += 1
      const edges: Record<string, Record<string, number>> = {};
      const incEdge = (a: string | null, b: string) => {
        if (!a || !b) return;
        edges[a] = edges[a] ?? {};
        edges[a][b] = (edges[a][b] ?? 0) + 1;
      };

      const rows: TimeInStatusMatrixRow[] = (tickets ?? []).map((tk: any) => {
        const tx = txByKey.get(tk.issue_key) ?? [];
        const byStatus: Record<string, number> = {};
        const visitsByStatus: Record<string, number> = {};
        const created = tk.jira_created_at ? new Date(tk.jira_created_at).getTime() : null;

        const enterStatus = (s: string | null) => {
          if (!s) return;
          visitsByStatus[s] = (visitsByStatus[s] ?? 0) + 1;
        };

        if (tx.length === 0) {
          // No history yet — full duration sits in current status (1 visit).
          const dur = created ? now - created : 0;
          if (tk.status) {
            byStatus[tk.status] = dur;
            visitsByStatus[tk.status] = 1;
          }
          return {
            issue_key: tk.issue_key,
            title: tk.summary ?? '',
            issue_type: tk.issue_type,
            current_status: tk.status,
            priority: tk.priority,
            assignee_display_name: tk.assignee_display_name,
            assignee_avatar_url: resolveAvatarUrl(avatarMap, tk.assignee_display_name),
            jira_created_at: tk.jira_created_at,
            byStatus,
            visitsByStatus,
            totalMs: dur,
            hasHistory: false,
          };
        }

        // Pairwise walk + count visits per status entry
        const first = tx[0];
        let prevAt: number;
        let prevStatus: string | null;
        if (first.from_status === null) {
          prevAt = new Date(first.changed_at).getTime();
          prevStatus = first.to_status;
          enterStatus(first.to_status);
        } else if (created) {
          // Ticket existed before trigger — initial state was first.from_status
          enterStatus(first.from_status);
          byStatus[first.from_status] =
            (byStatus[first.from_status] ?? 0) +
            (new Date(first.changed_at).getTime() - created);
          incEdge(first.from_status, first.to_status);
          prevAt = new Date(first.changed_at).getTime();
          prevStatus = first.to_status;
          enterStatus(first.to_status);
        } else {
          prevAt = new Date(first.changed_at).getTime();
          prevStatus = first.to_status;
          enterStatus(first.to_status);
        }

        for (let i = 1; i < tx.length; i++) {
          const at = new Date(tx[i].changed_at).getTime();
          if (prevStatus) {
            byStatus[prevStatus] = (byStatus[prevStatus] ?? 0) + (at - prevAt);
            incEdge(prevStatus, tx[i].to_status);
          }
          prevAt = at;
          prevStatus = tx[i].to_status;
          enterStatus(tx[i].to_status);
        }

        if (prevStatus) byStatus[prevStatus] = (byStatus[prevStatus] ?? 0) + (now - prevAt);

        const totalMs = Object.values(byStatus).reduce((a, b) => a + b, 0);

        return {
          issue_key: tk.issue_key,
          title: tk.summary ?? '',
          issue_type: tk.issue_type,
          current_status: tk.status,
          priority: tk.priority,
          assignee_display_name: tk.assignee_display_name,
          assignee_avatar_url: resolveAvatarUrl(avatarMap, tk.assignee_display_name),
          jira_created_at: tk.jira_created_at,
          byStatus,
          visitsByStatus,
          totalMs,
          hasHistory: true,
        };
      });

      // Chronological column ordering — score each status by
      // (incoming-edge count) − (outgoing-edge count). Lower score = appears
      // earlier in typical flow. If no transitions were observed (edges
      // map is empty), preserve the workflow's `position` ordering.
      const hasEdgeData = Object.keys(edges).length > 0;
      if (hasEdgeData && statusColumns.length > 0) {
        const scoreOf = (name: string) => {
          let inc = 0;
          let out = 0;
          for (const [from, tos] of Object.entries(edges)) {
            for (const [to, n] of Object.entries(tos)) {
              if (to === name) inc += n;
              if (from === name) out += n;
            }
          }
          return inc - out;
        };
        statusColumns = [...statusColumns].sort((a, b) => {
          const sa = scoreOf(a.name);
          const sb = scoreOf(b.name);
          if (sa !== sb) return sa - sb;
          return a.position - b.position;
        });
      }

      // Sort by total descending — biggest pain first
      rows.sort((a, b) => b.totalMs - a.totalMs);

      // Fallback: if workflow has no configured statuses for this issue type,
      // derive columns from data we actually saw — every distinct status that
      // appeared in either current ph_issues.status or transition history.
      if (statusColumns.length === 0) {
        const seen = new Map<string, number>();
        for (const r of rows) {
          if (r.current_status) seen.set(r.current_status, seen.get(r.current_status) ?? 0);
          for (const k of Object.keys(r.byStatus)) {
            if (!seen.has(k)) seen.set(k, seen.size);
          }
        }
        statusColumns = Array.from(seen.keys()).map((name, i) => ({
          name,
          // Best-effort category guess via toStatusCategory-like rules
          category:
            /done|closed|complete|resolved|shipped/i.test(name) ? 'done'
            : /progress|review|qa|testing|dev/i.test(name) ? 'in_progress'
            : 'todo',
          position: i,
        }));
      }

      const hasAnyHistory = rows.some((r) => r.hasHistory);
      return { rows, statusColumns, total: count, hasAnyHistory };
    },
  });
}

// ─── Time in Status — infinite-paginated "stuck tickets" view ───
//
// Apr 25, 2026. Path A only — no transition history (yet). Reads ph_issues
// directly via Supabase REST (same pattern other widgets use), computes
// duration as `now() - jira_updated_at` for each issue. Catalyst-native
// issues will be union-merged when `catalyst_issues` is bootstrapped (see
// pending Path B work).
//
// Page size 20. Sort = longest-stuck first. 2026 fiscal-window guardrail
// applies via the existing `or2026(...)` helper — same as every other
// dashboard hook.
export interface TimeInStatusFilters extends DashboardWidgetFilters {
  /** When true, include rows whose status_category is 'done' / 'closed'. Default false. */
  includeClosed?: boolean;
  /** 'all' | 'jira' | 'catalyst' — currently only 'jira'/'all' have data. */
  sourceFilter?: 'all' | 'jira' | 'catalyst';
}

export interface TimeInStatusRow {
  source: 'jira' | 'catalyst';
  issue_key: string;
  project_key: string | null;
  title: string;
  issue_type: string | null;
  status: string | null;
  status_category: string | null;
  priority: string | null;
  assignee_display_name: string | null;
  assignee_avatar_url: string | null;
  last_status_change_at: string | null;
}

const PAGE_SIZE = 20;

export function useDashboardTimeInStatus(
  projectKey: string | null | undefined,
  filters: TimeInStatusFilters = {},
) {
  const {
    dateFrom = null,
    dateTo = null,
    statusFilter = [],
    assigneeFilter = [],
    itemTypeFilter = [],
    priorityFilter = [],
    includeClosed = false,
    sourceFilter = 'all',
  } = filters;

  return useInfiniteQuery({
    queryKey: [
      'ph-time-in-status',
      projectKey,
      dateFrom,
      dateTo,
      statusFilter,
      assigneeFilter,
      itemTypeFilter,
      priorityFilter,
      includeClosed,
      sourceFilter,
    ],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      if (!projectKey) return { rows: [] as TimeInStatusRow[], nextOffset: null, total: 0 };
      const offset = pageParam as number;

      let q = supabase
        .from('ph_issues')
        .select(
          'issue_key, project_key, summary, issue_type, status, status_category, priority, assignee_display_name, jira_created_at, jira_updated_at',
          { count: 'exact' },
        )
        .eq('project_key', projectKey);

      // Excluded subtasks per Q9 default. Epics included.
      q = q.not(
        'issue_type',
        'in',
        '("Sub-task","Subtask","sub-task","subtask")',
      );

      // Closed/done excluded by default
      if (!includeClosed) {
        q = q.not('status_category', 'in', '("done","closed")');
      }

      // Date window — page-level filter, with 2026 + active-release fallback.
      // This hook receives `projectKey` (not `pKey`); fiscalScopeFor accepts
      // either since both resolve to the same release-name lookup.
      if (dateFrom) q = q.gte('jira_updated_at', dateFrom);
      if (dateTo) q = q.lte('jira_updated_at', dateTo);
      if (!dateFrom && !dateTo) {
        q = q.or(await fiscalScopeFor(projectKey, 'jira_created_at', 'jira_updated_at'));
      }

      // Layer-2 filters
      if (statusFilter.length) q = q.in('status_category', statusFilter);
      if (assigneeFilter.length) q = q.in('assignee_display_name', assigneeFilter);
      if (itemTypeFilter.length) q = q.in('issue_type', itemTypeFilter);
      if (priorityFilter.length) q = q.in('priority', priorityFilter);

      // Sort: longest in current status first (ascending jira_updated_at = oldest first)
      q = q.order('jira_updated_at', { ascending: true, nullsFirst: false });

      const { data, error, count } = await q.range(offset, offset + PAGE_SIZE - 1);
      if (error) throw error;

      const avatarMap = await getAvatarMap();
      const rows: TimeInStatusRow[] = (data ?? []).map((d: any) => ({
        source: 'jira' as const,
        issue_key: d.issue_key,
        project_key: d.project_key,
        title: d.summary ?? '',
        issue_type: d.issue_type,
        status: d.status,
        status_category: d.status_category,
        priority: d.priority,
        assignee_display_name: d.assignee_display_name,
        assignee_avatar_url: resolveAvatarUrl(avatarMap, d.assignee_display_name),
        last_status_change_at: d.jira_updated_at ?? d.jira_created_at,
      }));

      const nextOffset =
        rows.length === PAGE_SIZE && (count ?? 0) > offset + PAGE_SIZE
          ? offset + PAGE_SIZE
          : null;

      return { rows, nextOffset, total: count ?? 0 };
    },
    getNextPageParam: (last) => last.nextOffset,
    enabled: !!projectKey,
    staleTime: 60_000,
  });
}
