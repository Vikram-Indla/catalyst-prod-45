/**
 * Hook for Department Intelligence — Weekly Significant Events (STEERCOM)
 * Fetches transitions from DB, sends to AI edge function for narrative generation.
 * Cache-first: renders cached data instantly, regenerates on demand.
 */
import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getWeekStart, getWeekEnd, getWeekNumber, formatWeekRange } from '@/constants/r360WeekConfig';

/* ── Types ── */
export interface HubEvent {
  number: number;
  day: string;
  dayClass: string;
  callout: string | null;
  calloutLabel: string | null;
  body: string;
}

export interface HubGroup {
  hub: string;
  rag: 'GREEN' | 'AMBER' | 'RED' | null;
  hubColor: string;
  totalItems: number | null;
  events: HubEvent[];
}

export interface WeekStats {
  transitions: number;
  closed: number;
  inReview: number;
  activeResources: number;
}

export interface DeptWeeklyData {
  hubGroups: HubGroup[];
  stats: WeekStats;
  weekLabel: string;
  weekRange: string;
  weekNumber: number;
  weekStart: string;
  weekEnd: string;
  generatedAt: string | null;
}

/* ── Hub classification ── */
function getHubFromKey(key: string): string {
  if (!key) return 'Other';
  if (key.startsWith('BAU-') || key.startsWith('INC-')) return 'IncidentHub';
  if (key.startsWith('PRD-') || key.startsWith('PB-')) return 'ProductHub';
  if (key.startsWith('TST-') || key.startsWith('TC-')) return 'TestHub';
  if (key.startsWith('PRJ-') || key.startsWith('SPR-')) return 'ProjectHub';
  if (key.startsWith('REL-')) return 'ReleaseHub';
  return 'Other';
}

/* ── Date helpers ── */
function formatLocalYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/* ── Fetch department resource jira IDs ── */
async function getDeptJiraIds(department: string) {
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

/* ── Compute stats from DB (pure SQL, no AI) ── */
async function computeStats(jiraIds: string[], weekStartDate: Date, weekEndDate: Date): Promise<WeekStats> {
  if (jiraIds.length === 0) return { transitions: 0, closed: 0, inReview: 0, activeResources: 0 };

  const { data: issues } = await supabase
    .from('ph_issues')
    .select('issue_key, status, assignee_account_id, changelog, jira_updated_at')
    .in('assignee_account_id', jiraIds)
    .gte('jira_updated_at', weekStartDate.toISOString())
    .lte('jira_updated_at', weekEndDate.toISOString())
    .limit(1000);

  let transitions = 0, closed = 0, inReview = 0;
  const activeSet = new Set<string>();

  (issues || []).forEach((issue: any) => {
    const cl = issue.changelog;
    if (Array.isArray(cl) && cl.length > 0) {
      cl.forEach((entry: any) => {
        const d = new Date(entry.created || entry.timestamp || issue.jira_updated_at);
        if (d < weekStartDate || d > weekEndDate) return;
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
      // Empty/missing changelog — treat latest issue movement as one transition in the selected week
      transitions++;
      activeSet.add(issue.assignee_account_id);
      const s = (issue.status || '').toLowerCase();
      if (['done', 'closed', 'resolved'].includes(s)) closed++;
      if (['in review', 'code review', 'ready for qa', 'under review', 'implementation review'].includes(s)) inReview++;
    }
  });

  return { transitions, closed, inReview, activeResources: activeSet.size };
}

/* ── Extract transitions for AI prompt ── */
async function extractTransitions(jiraIds: string[], nameMap: Map<string, string>, weekStartDate: Date, weekEndDate: Date) {
  const { data: issues } = await supabase
    .from('ph_issues')
    .select('issue_key, summary, status, assignee_account_id, assignee_display_name, changelog, jira_updated_at, priority')
    .in('assignee_account_id', jiraIds)
    .gte('jira_updated_at', weekStartDate.toISOString())
    .lte('jira_updated_at', weekEndDate.toISOString())
    .order('jira_updated_at', { ascending: true })
    .limit(2000);

  const result: any[] = [];
  (issues || []).forEach((issue: any) => {
    const cl = issue.changelog;
    const actor = nameMap.get(issue.assignee_account_id) || issue.assignee_display_name || 'Unknown';
    const hub = getHubFromKey(issue.issue_key || '');

    if (Array.isArray(cl) && cl.length > 0) {
      cl.forEach((entry: any) => {
        const d = new Date(entry.created || entry.timestamp || issue.jira_updated_at);
        if (d < weekStartDate || d > weekEndDate) return;
        if (d.getDay() === 5 || d.getDay() === 6) return;
        (entry.items || []).forEach((item: any) => {
          if (item.field === 'status') {
            const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU'];
            result.push({
              key: issue.issue_key,
              title: issue.summary,
              actor,
              from: item.fromString || '',
              to: item.toString || '',
              day: dayNames[d.getDay()] || '',
              hub,
              priority: issue.priority || '',
            });
          }
        });
      });
    } else {
      const d = new Date(issue.jira_updated_at);
      if (d.getDay() >= 0 && d.getDay() <= 4) {
        const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU'];
        result.push({
          key: issue.issue_key,
          title: issue.summary,
          actor,
          from: '',
          to: issue.status || '',
          day: dayNames[d.getDay()] || '',
          hub,
          priority: issue.priority || '',
        });
      }
    }
  });

  return result;
}

/* ── Build per-resource summary for richer AI context ── */
function buildResourceSummary(transitions: any[]): string {
  const byActor: Record<string, { total: number; closed: number; inReview: number; hubs: Set<string>; tickets: string[] }> = {};
  transitions.forEach(t => {
    if (!byActor[t.actor]) byActor[t.actor] = { total: 0, closed: 0, inReview: 0, hubs: new Set(), tickets: [] };
    const entry = byActor[t.actor];
    entry.total++;
    entry.hubs.add(t.hub);
    if (entry.tickets.length < 5) entry.tickets.push(t.key);
    const toLower = (t.to || '').toLowerCase();
    if (['done', 'closed', 'resolved'].includes(toLower)) entry.closed++;
    if (['in review', 'code review', 'ready for qa', 'under review', 'implementation review', 'uat ready'].includes(toLower)) entry.inReview++;
  });

  return Object.entries(byActor)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([name, d]) => `- ${name}: ${d.total} transitions (${d.closed} closed, ${d.inReview} in review) across ${[...d.hubs].join(', ')}. Tickets: ${d.tickets.join(', ')}`)
    .join('\n');
}

/* ── Main hook ── */
export function useDeptWeeklyEventsAI(department: string | null) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const qc = useQueryClient();

  const now = new Date();
  const weekStartDate = getWeekStart(now);
  weekStartDate.setDate(weekStartDate.getDate() - weekOffset * 7);
  const weekEndDate = getWeekEnd(weekStartDate);
  const weekNum = getWeekNumber(weekStartDate);
  const weekRangeStr = formatWeekRange(weekStartDate);
  const weekStartStr = formatLocalYMD(weekStartDate);

  // Stats query (pure DB, always runs)
  const statsQ = useQuery({
    queryKey: ['di-stats', department, weekOffset],
    queryFn: async (): Promise<WeekStats> => {
      const { jiraIds } = await getDeptJiraIds(department!);
      return computeStats(jiraIds, weekStartDate, weekEndDate);
    },
    enabled: !!department,
    staleTime: 60_000,
  });

  // Hub groups: cache-first, then AI generation
  const eventsQ = useQuery({
    queryKey: ['di-hub-events', department, weekOffset],
    queryFn: async (): Promise<HubGroup[]> => {
      // Try cache first
      const { data: cached } = await supabase
        .from('r360_ai_cache')
        .select('data, computed_at')
        .eq('scope_type', 'department')
        .eq('scope_id', department!)
        .eq('section', 'weekly_events')
        .eq('week_start', weekStartStr)
        .maybeSingle();

      if (cached?.data) {
        const cacheData = cached.data as any;
        return cacheData.hubGroups || [];
      }

      return []; // No cache — return empty, user triggers "Refresh AI"
    },
    enabled: !!department,
    staleTime: 60_000,
  });

  // Meta query
  const metaQ = useQuery({
    queryKey: ['di-meta', department],
    queryFn: async () => {
      const { resources, jiraIds } = await getDeptJiraIds(department!);
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
  const cacheAgeQ = useQuery({
    queryKey: ['di-cache-age', department, weekOffset],
    queryFn: async (): Promise<string | null> => {
      const { data: cached } = await supabase
        .from('r360_ai_cache')
        .select('computed_at')
        .eq('scope_type', 'department')
        .eq('scope_id', department!)
        .eq('section', 'weekly_events')
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

  // Generate AI events
  const generateEvents = useCallback(async () => {
    if (!department) return;
    setIsGenerating(true);
    try {
      const { jiraIds, nameMap } = await getDeptJiraIds(department);
      const transitions = await extractTransitions(jiraIds, nameMap, weekStartDate, weekEndDate);
      const stats = await computeStats(jiraIds, weekStartDate, weekEndDate);

      const resourceSummary = buildResourceSummary(transitions);

      const { data, error } = await supabase.functions.invoke('r360-dept-weekly-events', {
        body: {
          department,
          weekStart: weekStartStr,
          weekEnd: formatLocalYMD(weekEndDate),
          weekNumber: weekNum,
          weekRange: weekRangeStr,
          transitions,
          stats,
          resourceSummary,
        },
      });

      if (error) throw error;

      // Invalidate to pick up fresh stats + new cache
      qc.invalidateQueries({ queryKey: ['di-stats', department, weekOffset] });
      qc.invalidateQueries({ queryKey: ['di-hub-events', department, weekOffset] });
      qc.invalidateQueries({ queryKey: ['di-cache-age', department, weekOffset] });
    } catch (e) {
      console.error('Failed to generate weekly events:', e);
    } finally {
      setIsGenerating(false);
    }
  }, [department, weekStartDate, weekEndDate, weekNum, weekRangeStr, weekStartStr, weekOffset, qc]);

  const prevWeek = useCallback(() => setWeekOffset(o => o + 1), []);
  const nextWeek = useCallback(() => setWeekOffset(o => Math.max(0, o - 1)), []);

  return {
    hubGroups: eventsQ.data || [],
    stats: statsQ.data || { transitions: 0, closed: 0, inReview: 0, activeResources: 0 },
    isLoadingStats: statsQ.isLoading,
    isLoadingEvents: eventsQ.isLoading,
    isGenerating,
    hasEvents: (eventsQ.data || []).length > 0,
    weekLabel: `W${weekNum}`,
    weekRange: weekRangeStr,
    weekOffset,
    dataAge: cacheAgeQ.data || null,
    meta: metaQ.data || null,
    prevWeek,
    nextWeek,
    generateEvents,
    refreshStats: () => qc.invalidateQueries({ queryKey: ['di-stats', department, weekOffset] }),
  };
}
