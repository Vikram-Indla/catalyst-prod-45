/**
 * Independent React Query hooks for Department Intelligence sections.
 * Each section loads independently → progressive rendering.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getWeekStart, getWeekEnd, getWeekNumber, formatWeekRange } from '@/constants/r360WeekConfig';
import { useState, useCallback } from 'react';

/* ── Shared helpers ── */
const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU'];
const HUB_MAP: Record<string, { name: string; color: string }> = {
  'BAU-': { name: 'INC', color: '#DC2626' },
  'INC-': { name: 'INC', color: '#DC2626' },
  'PRD-': { name: 'PRD', color: '#0D9488' },
  'PB-':  { name: 'PRD', color: '#0D9488' },
  'TST-': { name: 'TST', color: '#7C3AED' },
  'TC-':  { name: 'TST', color: '#7C3AED' },
  'PRJ-': { name: 'PRJ', color: '#2563EB' },
  'SPR-': { name: 'PRJ', color: '#2563EB' },
  'REL-': { name: 'REL', color: '#D97706' },
};

function classifyHub(key: string): { name: string; color: string } {
  for (const [prefix, hub] of Object.entries(HUB_MAP)) {
    if (key.startsWith(prefix)) return hub;
  }
  return { name: 'OTH', color: '#71717A' };
}

const WORKLOAD_COLORS: Record<string, string> = {
  QA: '#2563EB', Feature: '#0D9488', Incidents: '#DC2626', Frontend: '#7C3AED',
  Backend: '#71717A', Epics: '#D97706', Other: '#71717A',
  'Bug': '#DC2626', 'Story': '#0D9488', 'Task': '#2563EB', 'Sub-task': '#71717A', 'Epic': '#D97706',
};

async function getDeptResourceIds(department: string) {
  const { data: resources } = await supabase
    .from('resource_inventory')
    .select('id, rid, name, role_name, jira_account_id, department_name, department_id')
    .eq('is_active', true);

  const { data: depts } = await supabase.from('capacity_departments').select('id, name');
  const deptIdMap = new Map((depts || []).map((d: any) => [d.id, d.name]));

  const filtered = (resources || []).filter((r: any) => {
    const resolved = r.department_name || deptIdMap.get(r.department_id) || null;
    return resolved === department;
  });

  return filtered as any[];
}

/* ── 1. Health KPIs ── */
export interface HealthKPIs {
  total: number;
  closed: number;
  inProgress: number;
  backlog: number;
  closureRate: number;
}

export function useDeptHealthKPIs(department: string | null) {
  return useQuery({
    queryKey: ['di-health', department],
    queryFn: async (): Promise<HealthKPIs> => {
      const resources = await getDeptResourceIds(department!);
      const jiraIds = resources.map(r => r.jira_account_id).filter(Boolean);
      if (jiraIds.length === 0) return { total: 0, closed: 0, inProgress: 0, backlog: 0, closureRate: 0 };

      const { data: issues } = await supabase
        .from('ph_issues')
        .select('status, status_category')
        .in('assignee_account_id', jiraIds);

      let total = 0, closed = 0, inProgress = 0, backlog = 0;
      (issues || []).forEach((i: any) => {
        total++;
        const sc = (i.status_category || '').toLowerCase();
        const s = (i.status || '').toLowerCase();
        if (sc === 'done' || s === 'done' || s === 'closed' || s === 'resolved') closed++;
        else if (sc === 'indeterminate' || s === 'in progress' || s === 'under implementation' || s === 'in development') inProgress++;
        else backlog++;
      });

      return { total, closed, inProgress, backlog, closureRate: total > 0 ? Math.round((closed / total) * 100) : 0 };
    },
    enabled: !!department,
    staleTime: 60_000,
  });
}

/* ── 2. Workload Distribution ── */
export interface WorkloadItem { label: string; pct: number; color: string; }

export function useDeptWorkload(department: string | null) {
  return useQuery({
    queryKey: ['di-workload', department],
    queryFn: async (): Promise<WorkloadItem[]> => {
      const resources = await getDeptResourceIds(department!);
      const jiraIds = resources.map(r => r.jira_account_id).filter(Boolean);
      if (jiraIds.length === 0) return [];

      const { data: issues } = await supabase
        .from('ph_issues')
        .select('issue_type')
        .in('assignee_account_id', jiraIds);

      const counts: Record<string, number> = {};
      let total = 0;
      (issues || []).forEach((i: any) => {
        const t = i.issue_type || 'Other';
        counts[t] = (counts[t] || 0) + 1;
        total++;
      });

      return Object.entries(counts)
        .map(([label, count]) => ({
          label,
          pct: total > 0 ? Math.round((count / total) * 100) : 0,
          color: WORKLOAD_COLORS[label] || '#71717A',
        }))
        .sort((a, b) => b.pct - a.pct);
    },
    enabled: !!department,
    staleTime: 60_000,
  });
}

/* ── 3. Work Item Distribution ── */
export interface DistItem { name: string; count: number; color: string; pct: number; }
export interface ItemDistribution { byStatus: DistItem[]; byHub: DistItem[]; }

export function useDeptDistribution(department: string | null) {
  return useQuery({
    queryKey: ['di-distribution', department],
    queryFn: async (): Promise<ItemDistribution> => {
      const resources = await getDeptResourceIds(department!);
      const jiraIds = resources.map(r => r.jira_account_id).filter(Boolean);
      if (jiraIds.length === 0) return { byStatus: [], byHub: [] };

      const { data: issues } = await supabase
        .from('ph_issues')
        .select('status, issue_key')
        .in('assignee_account_id', jiraIds);

      const items = issues || [];
      const total = items.length;

      // By Status
      const statusMap: Record<string, number> = {};
      const statusColors: Record<string, string> = {
        'Done': '#16A34A', 'Closed': '#16A34A', 'Resolved': '#16A34A',
        'In Progress': '#2563EB', 'Under Implementation': '#2563EB', 'In Development': '#2563EB',
        'To Do': '#D97706', 'Open': '#D97706', 'Backlog': '#D97706',
        'In Review': '#0D9488', 'Code Review': '#0D9488', 'Ready for QA': '#0D9488',
        'Blocked': '#DC2626',
      };
      items.forEach((i: any) => {
        const s = i.status || 'Unknown';
        statusMap[s] = (statusMap[s] || 0) + 1;
      });
      const byStatus = Object.entries(statusMap)
        .map(([name, count]) => ({
          name, count,
          color: statusColors[name] || '#71717A',
          pct: total > 0 ? Math.round((count / total) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count);

      // By Hub
      const hubMap: Record<string, { count: number; color: string }> = {};
      items.forEach((i: any) => {
        const hub = classifyHub(i.issue_key || '');
        if (!hubMap[hub.name]) hubMap[hub.name] = { count: 0, color: hub.color };
        hubMap[hub.name].count++;
      });
      const hubNames: Record<string, string> = { INC: 'IncidentHub', PRD: 'ProductHub', TST: 'TestHub', PRJ: 'ProjectHub', REL: 'ReleaseHub', OTH: 'Other' };
      const byHub = Object.entries(hubMap)
        .map(([code, val]) => ({
          name: hubNames[code] || code,
          count: val.count, color: val.color,
          pct: total > 0 ? Math.round((val.count / total) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count);

      return { byStatus, byHub };
    },
    enabled: !!department,
    staleTime: 60_000,
  });
}

/* ── 4. Weekly Events ── */
export interface WeekEvent {
  num: number;
  day: string;
  text: string;
  ticketKey?: string;
  hub: { name: string; color: string };
  actor?: string;
  fromStatus?: string;
  toStatus?: string;
}

export interface WeekEventsData {
  events: WeekEvent[];
  weekLabel: string;
  weekRange: string;
  totalTransitions: number;
  resourceCount: number;
  closedCount: number;
  reviewCount: number;
  pickedUpCount: number;
}

export function useDeptWeeklyEvents(department: string | null) {
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = getWeekStart(new Date());
  weekStart.setDate(weekStart.getDate() - weekOffset * 7);
  const weekEnd = getWeekEnd(weekStart);
  const weekNum = getWeekNumber(weekStart);
  const weekRange = formatWeekRange(weekStart);

  const { data, isLoading } = useQuery({
    queryKey: ['di-events', department, weekOffset],
    queryFn: async (): Promise<WeekEventsData> => {
      const resources = await getDeptResourceIds(department!);
      const jiraIds = resources.map(r => r.jira_account_id).filter(Boolean);
      const nameMap = new Map(resources.map(r => [r.jira_account_id, r.name]));

      if (jiraIds.length === 0) return {
        events: [], weekLabel: `W${weekNum}`, weekRange,
        totalTransitions: 0, resourceCount: 0, closedCount: 0, reviewCount: 0, pickedUpCount: 0,
      };

      // Fetch issues updated in this week
      const { data: issues } = await supabase
        .from('ph_issues')
        .select('issue_key, summary, status, status_category, assignee_account_id, assignee_display_name, changelog, jira_updated_at, priority')
        .in('assignee_account_id', jiraIds)
        .gte('jira_updated_at', weekStart.toISOString())
        .lte('jira_updated_at', weekEnd.toISOString())
        .order('jira_updated_at', { ascending: true })
        .limit(500);

      // Parse transitions from changelog
      interface Transition {
        key: string;
        summary: string;
        actor: string;
        from: string;
        to: string;
        date: Date;
        priority: string;
      }

      const transitions: Transition[] = [];
      (issues || []).forEach((issue: any) => {
        const cl = issue.changelog;
        if (!cl || !Array.isArray(cl)) {
          // If no changelog, treat current status as a transition
          if (issue.jira_updated_at) {
            const d = new Date(issue.jira_updated_at);
            if (d >= weekStart && d <= weekEnd && d.getDay() >= 0 && d.getDay() <= 4) {
              transitions.push({
                key: issue.issue_key,
                summary: issue.summary || '',
                actor: nameMap.get(issue.assignee_account_id) || issue.assignee_display_name || 'Unknown',
                from: '', to: issue.status || '',
                date: d, priority: issue.priority || '',
              });
            }
          }
          return;
        }
        cl.forEach((entry: any) => {
          const d = new Date(entry.created || entry.timestamp || issue.jira_updated_at);
          if (d < weekStart || d > weekEnd) return;
          if (d.getDay() === 5 || d.getDay() === 6) return; // skip weekend
          const items = entry.items || [];
          items.forEach((item: any) => {
            if (item.field === 'status') {
              transitions.push({
                key: issue.issue_key,
                summary: issue.summary || '',
                actor: nameMap.get(issue.assignee_account_id) || issue.assignee_display_name || entry.author?.displayName || 'Unknown',
                from: item.fromString || '', to: item.toString || '',
                date: d, priority: issue.priority || '',
              });
            }
          });
        });
      });

      // Count categories
      let closedCount = 0, reviewCount = 0, pickedUpCount = 0;
      const actorSet = new Set<string>();
      transitions.forEach(t => {
        actorSet.add(t.actor);
        const toLower = t.to.toLowerCase();
        if (['done', 'closed', 'resolved'].includes(toLower)) closedCount++;
        else if (['in review', 'code review', 'ready for qa', 'implementation review'].includes(toLower)) reviewCount++;
        else if (['in progress', 'under implementation', 'in development'].includes(toLower)) pickedUpCount++;
      });

      // Generate event bullets (up to 20) - prioritize burst closures
      const events: WeekEvent[] = [];

      // Group by actor+day for burst detection
      const byActorDay = new Map<string, Transition[]>();
      transitions.forEach(t => {
        const key = `${t.actor}:${t.date.getDay()}`;
        if (!byActorDay.has(key)) byActorDay.set(key, []);
        byActorDay.get(key)!.push(t);
      });

      // 1. Burst closures (3+ by same person same day)
      const bursts = [...byActorDay.entries()]
        .filter(([, ts]) => ts.filter(t => ['done', 'closed', 'resolved'].includes(t.to.toLowerCase())).length >= 3)
        .sort((a, b) => b[1].length - a[1].length);

      for (const [, ts] of bursts) {
        if (events.length >= 15) break;
        const closes = ts.filter(t => ['done', 'closed', 'resolved'].includes(t.to.toLowerCase()));
        const t = closes[0];
        events.push({
          num: events.length + 1,
          day: DAY_NAMES[t.date.getDay()],
          text: `<strong>${t.actor}</strong> closed ${closes.length} items in a single day including <ticket>${closes[0].key}</ticket> "${closes[0].summary}"`,
          ticketKey: closes[0].key,
          hub: classifyHub(closes[0].key),
          actor: t.actor,
        });
      }

      // 2. Individual notable closures
      const closures = transitions
        .filter(t => ['done', 'closed', 'resolved'].includes(t.to.toLowerCase()))
        .sort((a, b) => {
          const pOrder: Record<string, number> = { Highest: 0, High: 1, Medium: 2, Low: 3, Lowest: 4 };
          return (pOrder[a.priority] ?? 5) - (pOrder[b.priority] ?? 5);
        });

      for (const t of closures) {
        if (events.length >= 16) break;
        if (events.some(e => e.ticketKey === t.key)) continue;
        events.push({
          num: events.length + 1,
          day: DAY_NAMES[t.date.getDay()],
          text: `<strong>${t.actor}</strong> closed <ticket>${t.key}</ticket> "${t.summary}"`,
          ticketKey: t.key,
          hub: classifyHub(t.key),
          actor: t.actor,
          toStatus: t.to,
        });
      }

      // 3. Pickups
      const pickups = transitions
        .filter(t => ['in progress', 'under implementation', 'in development'].includes(t.to.toLowerCase()))
        .slice(0, 5);

      for (const t of pickups) {
        if (events.length >= 18) break;
        if (events.some(e => e.ticketKey === t.key)) continue;
        events.push({
          num: events.length + 1,
          day: DAY_NAMES[t.date.getDay()],
          text: `<strong>${t.actor}</strong> picked up <ticket>${t.key}</ticket> "${t.summary}"`,
          ticketKey: t.key,
          hub: classifyHub(t.key),
          actor: t.actor,
          toStatus: t.to,
        });
      }

      // 4. Day velocity as bullet
      const dayTransitions = [0, 0, 0, 0, 0];
      transitions.forEach(t => {
        const d = t.date.getDay();
        if (d >= 0 && d <= 4) dayTransitions[d]++;
      });
      const peakDay = dayTransitions.indexOf(Math.max(...dayTransitions));
      if (transitions.length > 0 && events.length < 19) {
        events.push({
          num: events.length + 1,
          day: DAY_NAMES[peakDay],
          text: `Peak day: ${dayTransitions[peakDay]} transitions across ${actorSet.size} resources`,
          hub: { name: '', color: '#71717A' },
        });
      }

      // 5. Week summary as last bullet
      if (events.length < 20) {
        events.push({
          num: events.length + 1,
          day: '',
          text: `Week summary: ${transitions.length} total transitions, ${closedCount} closures, ${pickedUpCount} new pickups, ${reviewCount} sent to review`,
          hub: { name: '', color: '#71717A' },
        });
      }

      // Re-number
      events.forEach((e, i) => { e.num = i + 1; });

      return {
        events,
        weekLabel: `W${weekNum}`,
        weekRange,
        totalTransitions: transitions.length,
        resourceCount: actorSet.size,
        closedCount, reviewCount, pickedUpCount,
      };
    },
    enabled: !!department,
    staleTime: 60_000,
  });

  const prevWeek = useCallback(() => setWeekOffset(o => o + 1), []);
  const nextWeek = useCallback(() => setWeekOffset(o => Math.max(0, o - 1)), []);

  return { data, isLoading, weekOffset, prevWeek, nextWeek };
}

/* ── 5. Resource Leaderboard ── */
export interface LeaderboardRow {
  name: string;
  role: string;
  done: number;
  wip: number;
  total: number;
  closurePct: number;
  avatarColor: string;
  initials: string;
}

export function useDeptLeaderboard(department: string | null) {
  return useQuery({
    queryKey: ['di-leaderboard', department],
    queryFn: async (): Promise<LeaderboardRow[]> => {
      const resources = await getDeptResourceIds(department!);
      const jiraIds = resources.map(r => r.jira_account_id).filter(Boolean);
      const nameMap = new Map(resources.map(r => [r.jira_account_id, { name: r.name, role: r.role_name || 'Team Member' }]));

      if (jiraIds.length === 0) return [];

      const { data: issues } = await supabase
        .from('ph_issues')
        .select('assignee_account_id, status, status_category')
        .in('assignee_account_id', jiraIds);

      const agg = new Map<string, { done: number; wip: number; total: number }>();
      (issues || []).forEach((i: any) => {
        const id = i.assignee_account_id;
        if (!agg.has(id)) agg.set(id, { done: 0, wip: 0, total: 0 });
        const a = agg.get(id)!;
        a.total++;
        const sc = (i.status_category || '').toLowerCase();
        const s = (i.status || '').toLowerCase();
        if (sc === 'done' || s === 'done' || s === 'closed' || s === 'resolved') a.done++;
        else if (sc === 'indeterminate' || s === 'in progress' || s === 'under implementation' || s === 'in development') a.wip++;
      });

      const colors = ['#2563EB', '#7C3AED', '#0D9488', '#D97706', '#DC2626', '#0891B2', '#4F46E5', '#059669'];
      const hashColor = (name: string) => {
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
      };
      const getInitials = (name: string) => {
        const parts = name.split(' ').filter(Boolean);
        return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : (parts[0]?.[0] || '?').toUpperCase();
      };

      return [...agg.entries()]
        .filter(([, v]) => v.total >= 5)
        .map(([id, v]) => {
          const info = nameMap.get(id) || { name: 'Unknown', role: 'Team Member' };
          return {
            name: info.name,
            role: info.role,
            done: v.done, wip: v.wip, total: v.total,
            closurePct: v.total > 0 ? Math.round((v.done / v.total) * 100) : 0,
            avatarColor: hashColor(info.name),
            initials: getInitials(info.name),
          };
        })
        .sort((a, b) => b.done - a.done);
    },
    enabled: !!department,
    staleTime: 60_000,
  });
}

/* ── Refresh All ── */
export function useDeptRefreshAll(department: string | null) {
  const qc = useQueryClient();
  return useCallback(() => {
    if (!department) return;
    qc.invalidateQueries({ queryKey: ['di-health', department] });
    qc.invalidateQueries({ queryKey: ['di-workload', department] });
    qc.invalidateQueries({ queryKey: ['di-distribution', department] });
    qc.invalidateQueries({ queryKey: ['di-events', department] });
    qc.invalidateQueries({ queryKey: ['di-leaderboard', department] });
  }, [department, qc]);
}

/* ── Meta info ── */
export function useDeptMeta(department: string | null) {
  return useQuery({
    queryKey: ['di-meta', department],
    queryFn: async () => {
      const resources = await getDeptResourceIds(department!);
      const jiraIds = resources.map(r => r.jira_account_id).filter(Boolean);
      const { count } = await supabase
        .from('ph_issues')
        .select('*', { count: 'exact', head: true })
        .in('assignee_account_id', jiraIds);
      return { resourceCount: resources.length, itemCount: count || 0 };
    },
    enabled: !!department,
    staleTime: 120_000,
  });
}
