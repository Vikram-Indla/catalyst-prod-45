/**
 * Hook for Department Intelligence V5 — Role-Based Executive Briefing
 * Single AI call generates all 3 tabs: summary (role-based), digest, recommendations.
 */
import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getWeekStart, getWeekEnd, getWeekNumber, formatWeekRange } from '@/constants/r360WeekConfig';

/* ── Types ── */
export interface DigestEvent {
  number: number;
  day: string;
  dayIndex: number;
  hub: string;
  hubCss: string;
  signal: string | null;
  signalLabel: string | null;
  body: string;
}

export interface TopContributor {
  name: string;
  role: string;
  roleGroup: string;
  projects: string[];
  consecutiveWeeks: number;
  kpis: { value: number; label: string }[];
}

export interface RoleContribution {
  role: string;
  roleCss: string;
  resourceCount: number;
  projects: string[];
  kpis: { value: number; label: string }[];
  resources: { name: string; desc: string }[];
}

export interface ProjectActivity {
  name: string;
  desc: string;
  status: 'active' | 'risk' | 'stalled';
}

export interface ExecSummaryV5 {
  topContributor: TopContributor | null;
  roleContributions: RoleContribution[];
  projectActivity: ProjectActivity[];
  requiresAttention: string[];
}

// Keep old ExecSummary for backward compat
export interface ExecSummary {
  closureRate: number;
  closureNumerator: number;
  closureDenominator: number;
  topContributor: string;
  topContributorPct: number;
  wentWell: string[];
  requiresAttention: string[];
  hubStatus: { hub: string; stat: string; rag: 'g' | 'a' | 'r' }[];
}

export interface Recommendation {
  number: number;
  title: string;
  description: string;
  priority: 'high' | 'medium';
  roleTag?: string;
  roleTagCss?: string;
  project?: string;
}

export interface DeptIntelData {
  digest: DigestEvent[];
  summary: ExecSummary | null;
  summaryV5: ExecSummaryV5 | null;
  recommendations: Recommendation[];
}

/* ── Hub classification ── */
function getHubFromKey(key: string): { label: string; css: string } {
  if (!key) return { label: 'OTHER', css: 'hub-oth' };
  if (key.startsWith('BAU-') || key.startsWith('INC-')) return { label: 'INC', css: 'hub-inc' };
  if (key.startsWith('PRD-') || key.startsWith('PB-'))  return { label: 'PRD', css: 'hub-prd' };
  if (key.startsWith('TST-') || key.startsWith('TC-'))  return { label: 'TST', css: 'hub-tst' };
  if (key.startsWith('PRJ-') || key.startsWith('SPR-')) return { label: 'PRJ', css: 'hub-prj' };
  if (key.startsWith('REL-'))                           return { label: 'REL', css: 'hub-rel' };
  return { label: 'OTHER', css: 'hub-oth' };
}

/* ── Date helpers ── */
function fmtYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/* ── Role classification ── */
export type RoleGroup = 'developer' | 'qa' | 'product_owner' | 'ux_designer' | 'delivery_mgmt' | 'devops';

export function classifyRole(jobRole: string): RoleGroup {
  const role = jobRole?.toLowerCase() || '';
  if (role.includes('qa') || role.includes('test') || role.includes('quality')) return 'qa';
  if (role.includes('product') || role.includes('po') || role.includes('business analyst')) return 'product_owner';
  if (role.includes('ux') || role.includes('ui') || role.includes('design')) return 'ux_designer';
  if (role.includes('manager') || role.includes('lead') || role.includes('delivery') || role.includes('scrum')) return 'delivery_mgmt';
  if (role.includes('devops') || role.includes('infra') || role.includes('cloud') || role.includes('sre')) return 'devops';
  return 'developer';
}

/* ── Fetch department resources (parallelized) ── */
let _deptResourcesCache: Map<string, { data: any; ts: number }> = new Map();
const DEPT_CACHE_TTL = 5 * 60 * 1000; // 5 min in-memory cache

async function getDeptResources(department: string) {
  // In-memory cache to avoid repeated DB calls within same session
  const cached = _deptResourcesCache.get(department);
  if (cached && Date.now() - cached.ts < DEPT_CACHE_TTL) return cached.data;

  // Parallel fetch — both queries at once
  const [resourcesRes, deptsRes] = await Promise.all([
    supabase
      .from('resource_inventory')
      .select('id, name, role_name, jira_account_id, department_name, department_id')
      .eq('is_active', true),
    supabase.from('capacity_departments').select('id, name'),
  ]);

  const deptIdMap = new Map((deptsRes.data || []).map((d: any) => [d.id, d.name]));

  const filtered = (resourcesRes.data || []).filter((r: any) => {
    const resolved = r.department_name || deptIdMap.get(r.department_id) || null;
    return resolved === department;
  });

  const result = {
    resources: filtered as any[],
    jiraIds: filtered.map((r: any) => r.jira_account_id).filter(Boolean),
    nameMap: new Map(filtered.map((r: any) => [r.jira_account_id, r.name])),
    roleMap: new Map(filtered.map((r: any) => [r.name, r.role_name || 'Team Member'])),
    roleGroupMap: new Map(filtered.map((r: any) => [r.name, classifyRole(r.role_name || '')])),
  };

  _deptResourcesCache.set(department, { data: result, ts: Date.now() });
  return result;
}

/* ── Stats from DB ── */
async function computeStats(jiraIds: string[], ws: Date, we: Date) {
  if (jiraIds.length === 0) return { transitions: 0, closed: 0, inReview: 0, activeResources: 0 };

  const { data: issues } = await supabase
    .from('ph_issues')
    .select('issue_key, status, assignee_account_id, changelog, jira_updated_at')
    .in('assignee_account_id', jiraIds)
    .gte('jira_updated_at', ws.toISOString())
    .lte('jira_updated_at', we.toISOString())
    .limit(1000);

  let transitions = 0, closed = 0, inReview = 0;
  const activeSet = new Set<string>();

  (issues || []).forEach((issue: any) => {
    const cl = issue.changelog;
    if (Array.isArray(cl) && cl.length > 0) {
      cl.forEach((entry: any) => {
        const d = new Date(entry.created || entry.timestamp || issue.jira_updated_at);
        if (d < ws || d > we) return;
        if (d.getDay() === 5 || d.getDay() === 6) return;
        (entry.items || []).forEach((item: any) => {
          if (item.field === 'status') {
            transitions++;
            activeSet.add(issue.assignee_account_id);
            const to = (item.toString || '').toLowerCase();
            if (['done', 'closed', 'resolved'].includes(to)) closed++;
            if (['in review', 'code review', 'ready for qa', 'under review', 'implementation review'].includes(to)) inReview++;
          }
        });
      });
    } else {
      transitions++;
      activeSet.add(issue.assignee_account_id);
      const s = (issue.status || '').toLowerCase();
      if (['done', 'closed', 'resolved'].includes(s)) closed++;
      if (['in review', 'code review', 'ready for qa', 'under review', 'implementation review'].includes(s)) inReview++;
    }
  });

  return { transitions, closed, inReview, activeResources: activeSet.size };
}

/* ── Extract transitions ── */
async function extractTransitions(jiraIds: string[], nameMap: Map<string, string>, ws: Date, we: Date) {
  const { data: issues } = await supabase
    .from('ph_issues')
    .select('issue_key, summary, status, assignee_account_id, assignee_display_name, changelog, jira_updated_at, priority, project_name')
    .in('assignee_account_id', jiraIds)
    .gte('jira_updated_at', ws.toISOString())
    .lte('jira_updated_at', we.toISOString())
    .order('jira_updated_at', { ascending: true })
    .limit(2000);

  const result: any[] = [];
  (issues || []).forEach((issue: any) => {
    const cl = issue.changelog;
    const actor = nameMap.get(issue.assignee_account_id) || issue.assignee_display_name || 'Unknown';
    const { label: hub } = getHubFromKey(issue.issue_key || '');

    if (Array.isArray(cl) && cl.length > 0) {
      cl.forEach((entry: any) => {
        const d = new Date(entry.created || entry.timestamp || issue.jira_updated_at);
        if (d < ws || d > we) return;
        if (d.getDay() === 5 || d.getDay() === 6) return;
        (entry.items || []).forEach((item: any) => {
          if (item.field === 'status') {
            const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU'];
            result.push({
              key: issue.issue_key, title: issue.summary, actor,
              from: item.fromString || '', to: item.toString || '',
              day: dayNames[d.getDay()] || '', dayIndex: d.getDay(),
              hub, priority: issue.priority || '',
              projectName: issue.project_name || '',
            });
          }
        });
      });
    } else {
      const d = new Date(issue.jira_updated_at);
      if (d.getDay() >= 0 && d.getDay() <= 4) {
        const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU'];
        result.push({
          key: issue.issue_key, title: issue.summary, actor,
          from: '', to: issue.status || '',
          day: dayNames[d.getDay()] || '', dayIndex: d.getDay(),
          hub, priority: issue.priority || '',
          projectName: issue.project_name || '',
        });
      }
    }
  });

  return result;
}

/* ── Resource summary for richer context ── */
function buildResourceSummary(transitions: any[], roleMap: Map<string, string>, roleGroupMap: Map<string, string>): string {
  const byActor: Record<string, { total: number; closed: number; inReview: number; hubs: Set<string>; tickets: string[]; projects: Set<string>; role: string; roleGroup: string }> = {};
  transitions.forEach(t => {
    if (!byActor[t.actor]) byActor[t.actor] = { total: 0, closed: 0, inReview: 0, hubs: new Set(), tickets: [], projects: new Set(), role: roleMap.get(t.actor) || 'Team Member', roleGroup: roleGroupMap.get(t.actor) || 'developer' };
    const e = byActor[t.actor];
    e.total++;
    e.hubs.add(t.hub);
    if (t.projectName) e.projects.add(t.projectName);
    if (e.tickets.length < 5) e.tickets.push(t.key);
    const toLower = (t.to || '').toLowerCase();
    if (['done', 'closed', 'resolved'].includes(toLower)) e.closed++;
    if (['in review', 'code review', 'ready for qa', 'under review', 'implementation review', 'uat ready'].includes(toLower)) e.inReview++;
  });

  return Object.entries(byActor)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([name, d]) => `- ${name} [${d.role}] (${d.roleGroup}): ${d.total} transitions (${d.closed} closed, ${d.inReview} in review) across ${[...d.hubs].join(', ')}. Projects: ${[...d.projects].join(', ')}. Tickets: ${d.tickets.join(', ')}`)
    .join('\n');
}

/* ═══════════════════════════════════════════
   Main Hook
   ═══════════════════════════════════════════ */
export function useDeptIntelligenceAI(department: string | null) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const qc = useQueryClient();

  const now = new Date();
  const weekStartDate = getWeekStart(now);
  weekStartDate.setDate(weekStartDate.getDate() - weekOffset * 7);
  const weekEndDate = getWeekEnd(weekStartDate);
  const weekNum = getWeekNumber(weekStartDate);
  const weekRangeStr = formatWeekRange(weekStartDate);
  const weekStartStr = fmtYMD(weekStartDate);

  // Cache query — loads all tabs from single cache entry
  // GUARDRAIL: Aggressive caching to prevent re-fetches on mount/focus
  const cacheQ = useQuery({
    queryKey: ['di-v4-cache', department, weekOffset],
    queryFn: async (): Promise<DeptIntelData> => {
      const { data: cached } = await supabase
        .from('r360_ai_cache')
        .select('data, computed_at')
        .eq('scope_type', 'department')
        .eq('scope_id', department!)
        .eq('section', 'dept_intel_v4')
        .eq('week_start', weekStartStr)
        .maybeSingle();

      if (cached?.data) {
        const d = cached.data as any;
        return {
          digest: d.digest || [],
          summary: d.summary || null,
          summaryV5: d.summaryV5 || null,
          recommendations: d.recommendations || [],
        };
      }
      return { digest: [], summary: null, summaryV5: null, recommendations: [] };
    },
    enabled: !!department,
    staleTime: 5 * 60 * 1000,        // 5 minutes fresh
    gcTime: 30 * 60 * 1000,           // 30 minutes in GC
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Stats (pure DB) — aggressive caching
  const statsQ = useQuery({
    queryKey: ['di-v4-stats', department, weekOffset],
    queryFn: async () => {
      const { jiraIds } = await getDeptResources(department!);
      return computeStats(jiraIds, weekStartDate, weekEndDate);
    },
    enabled: !!department,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Meta — use materialized view for instant counts
  const metaQ = useQuery({
    queryKey: ['di-v4-meta', department],
    queryFn: async () => {
      // Try materialized view first (instant, <10ms)
      const { data: mvData } = await supabase
        .from('mv_dept_intelligence_stats' as any)
        .select('resource_count, total_items')
        .eq('department_name', department!)
        .maybeSingle();

      if (mvData) {
        return { resourceCount: (mvData as any).resource_count || 0, itemCount: (mvData as any).total_items || 0 };
      }

      // Fallback to direct query
      const { resources, jiraIds } = await getDeptResources(department!);
      const { count } = await supabase
        .from('ph_issues')
        .select('*', { count: 'exact', head: true })
        .in('assignee_account_id', jiraIds);
      return { resourceCount: resources.length, itemCount: count || 0 };
    },
    enabled: !!department,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Cache age — derive from cacheQ instead of separate query
  const ageQ = useQuery({
    queryKey: ['di-v4-age', department, weekOffset],
    queryFn: async (): Promise<string | null> => {
      const { data: cached } = await supabase
        .from('r360_ai_cache')
        .select('computed_at')
        .eq('scope_type', 'department')
        .eq('scope_id', department!)
        .eq('section', 'dept_intel_v4')
        .eq('week_start', weekStartStr)
        .maybeSingle();

      if (!cached?.computed_at) return null;
      const diff = Date.now() - new Date(cached.computed_at).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      return `${Math.floor(hrs / 24)}d ago`;
    },
    enabled: !!department,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Generate — single AI call for all tabs
  const generateAll = useCallback(async () => {
    if (!department) return;
    setIsGenerating(true);
    try {
      const { jiraIds, nameMap, roleMap, roleGroupMap, resources } = await getDeptResources(department);
      // Parallel fetch — transitions and stats simultaneously
      const [transitions, stats] = await Promise.all([
        extractTransitions(jiraIds, nameMap, weekStartDate, weekEndDate),
        computeStats(jiraIds, weekStartDate, weekEndDate),
      ]);
      const resourceSummary = buildResourceSummary(transitions, roleMap, roleGroupMap);

      // Build role breakdown for the AI
      const roleBreakdown: Record<string, string[]> = {};
      resources.forEach((r: any) => {
        const rg = classifyRole(r.role_name || '');
        if (!roleBreakdown[rg]) roleBreakdown[rg] = [];
        roleBreakdown[rg].push(`${r.name} (${r.role_name || 'Team Member'})`);
      });

      const { data, error } = await supabase.functions.invoke('r360-dept-intelligence-v4', {
        body: {
          department,
          weekStart: weekStartStr,
          weekEnd: fmtYMD(weekEndDate),
          weekNumber: weekNum,
          weekRange: weekRangeStr,
          transitions,
          stats,
          resourceSummary,
          roleBreakdown,
        },
      });

      if (error) throw error;

      qc.invalidateQueries({ queryKey: ['di-v4-cache', department, weekOffset] });
      qc.invalidateQueries({ queryKey: ['di-v4-stats', department, weekOffset] });
      qc.invalidateQueries({ queryKey: ['di-v4-age', department, weekOffset] });
    } catch (e) {
      console.error('Failed to generate dept intelligence v5:', e);
    } finally {
      setIsGenerating(false);
    }
  }, [department, weekStartDate, weekEndDate, weekNum, weekRangeStr, weekStartStr, weekOffset, qc]);

  const prevWeek = useCallback(() => setWeekOffset(o => o + 1), []);
  const nextWeek = useCallback(() => setWeekOffset(o => Math.max(0, o - 1)), []);

  const d = cacheQ.data || { digest: [], summary: null, summaryV5: null, recommendations: [] };

  return {
    digest: d.digest,
    summary: d.summary,
    summaryV5: d.summaryV5,
    recommendations: d.recommendations,
    stats: statsQ.data || { transitions: 0, closed: 0, inReview: 0, activeResources: 0 },
    isGenerating,
    hasData: d.digest.length > 0 || !!d.summaryV5,
    weekLabel: `W${weekNum}`,
    weekRange: weekRangeStr,
    weekStart: weekStartDate,
    weekOffset,
    dataAge: ageQ.data || null,
    meta: metaQ.data || null,
    prevWeek,
    nextWeek,
    generateAll,
  };
}
