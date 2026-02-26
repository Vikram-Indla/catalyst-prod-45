/**
 * Hook for Department Intelligence V4 — 3-Tab STEERCOM Panel
 * Single AI call generates all 3 tabs: digest, summary, recommendations.
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
}

export interface DeptIntelData {
  digest: DigestEvent[];
  summary: ExecSummary | null;
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

/* ── Fetch department resources ── */
async function getDeptResources(department: string) {
  const { data: resources } = await supabase
    .from('resource_inventory')
    .select('id, name, role_name, jira_account_id, department_name, department_id')
    .eq('is_active', true);

  const { data: depts } = await supabase.from('capacity_departments').select('id, name');
  const deptIdMap = new Map((depts || []).map((d: any) => [d.id, d.name]));

  const filtered = (resources || []).filter((r: any) => {
    const resolved = r.department_name || deptIdMap.get(r.department_id) || null;
    return resolved === department;
  });

  return {
    resources: filtered as any[],
    jiraIds: filtered.map((r: any) => r.jira_account_id).filter(Boolean),
    nameMap: new Map(filtered.map((r: any) => [r.jira_account_id, r.name])),
  };
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
    .select('issue_key, summary, status, assignee_account_id, assignee_display_name, changelog, jira_updated_at, priority')
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
        });
      }
    }
  });

  return result;
}

/* ── Resource summary for richer context ── */
function buildResourceSummary(transitions: any[]): string {
  const byActor: Record<string, { total: number; closed: number; inReview: number; hubs: Set<string>; tickets: string[] }> = {};
  transitions.forEach(t => {
    if (!byActor[t.actor]) byActor[t.actor] = { total: 0, closed: 0, inReview: 0, hubs: new Set(), tickets: [] };
    const e = byActor[t.actor];
    e.total++;
    e.hubs.add(t.hub);
    if (e.tickets.length < 5) e.tickets.push(t.key);
    const toLower = (t.to || '').toLowerCase();
    if (['done', 'closed', 'resolved'].includes(toLower)) e.closed++;
    if (['in review', 'code review', 'ready for qa', 'under review', 'implementation review', 'uat ready'].includes(toLower)) e.inReview++;
  });

  return Object.entries(byActor)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([name, d]) => `- ${name}: ${d.total} transitions (${d.closed} closed, ${d.inReview} in review) across ${[...d.hubs].join(', ')}. Tickets: ${d.tickets.join(', ')}`)
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

  // Cache query — loads all 3 tabs from single cache entry
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
        return { digest: d.digest || [], summary: d.summary || null, recommendations: d.recommendations || [] };
      }
      return { digest: [], summary: null, recommendations: [] };
    },
    enabled: !!department,
    staleTime: 60_000,
  });

  // Stats (pure DB)
  const statsQ = useQuery({
    queryKey: ['di-v4-stats', department, weekOffset],
    queryFn: async () => {
      const { jiraIds } = await getDeptResources(department!);
      return computeStats(jiraIds, weekStartDate, weekEndDate);
    },
    enabled: !!department,
    staleTime: 60_000,
  });

  // Meta
  const metaQ = useQuery({
    queryKey: ['di-v4-meta', department],
    queryFn: async () => {
      const { resources, jiraIds } = await getDeptResources(department!);
      const { count } = await supabase
        .from('ph_issues')
        .select('*', { count: 'exact', head: true })
        .in('assignee_account_id', jiraIds);
      return { resourceCount: resources.length, itemCount: count || 0 };
    },
    enabled: !!department,
    staleTime: 120_000,
  });

  // Cache age
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
    staleTime: 30_000,
  });

  // Generate — single AI call for all 3 tabs
  const generateAll = useCallback(async () => {
    if (!department) return;
    setIsGenerating(true);
    try {
      const { jiraIds, nameMap } = await getDeptResources(department);
      const transitions = await extractTransitions(jiraIds, nameMap, weekStartDate, weekEndDate);
      const stats = await computeStats(jiraIds, weekStartDate, weekEndDate);
      const resourceSummary = buildResourceSummary(transitions);

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
        },
      });

      if (error) throw error;

      qc.invalidateQueries({ queryKey: ['di-v4-cache', department, weekOffset] });
      qc.invalidateQueries({ queryKey: ['di-v4-stats', department, weekOffset] });
      qc.invalidateQueries({ queryKey: ['di-v4-age', department, weekOffset] });
    } catch (e) {
      console.error('Failed to generate dept intelligence v4:', e);
    } finally {
      setIsGenerating(false);
    }
  }, [department, weekStartDate, weekEndDate, weekNum, weekRangeStr, weekStartStr, weekOffset, qc]);

  const prevWeek = useCallback(() => setWeekOffset(o => o + 1), []);
  const nextWeek = useCallback(() => setWeekOffset(o => Math.max(0, o - 1)), []);

  const d = cacheQ.data || { digest: [], summary: null, recommendations: [] };

  return {
    digest: d.digest,
    summary: d.summary,
    recommendations: d.recommendations,
    stats: statsQ.data || { transitions: 0, closed: 0, inReview: 0, activeResources: 0 },
    isGenerating,
    hasData: d.digest.length > 0,
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
