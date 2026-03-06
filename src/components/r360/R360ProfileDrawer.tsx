/**
 * R360 Profile Drawer — 700px inline split-pane intelligence view
 * V12 Hybrid Precision · No portal, no fixed, no overlay
 */
import React, { useState, useMemo } from 'react';
import { ChevronLeft, X, AlertTriangle, Info, BookOpen, ChevronRight, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { R360_STATUS_MAP, R360_STATUS_DEFAULT } from '@/constants/r360';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';

// ── Constants ──
const R360_WEEK = 9;

const STATUS_MAP: Record<string, { bg: string; color: string; label: string }> = {
  TO_DO:       { bg: '#DFE1E6', color: '#253858', label: 'TO DO' },
  IN_PROGRESS: { bg: '#DEEBFF', color: '#0747A6', label: 'IN PROGRESS' },
  IN_REVIEW:   { bg: '#DEEBFF', color: '#0747A6', label: 'IN REVIEW' },
  DONE:        { bg: '#E3FCEF', color: '#006644', label: 'DONE' },
  BACKLOG:     { bg: '#DFE1E6', color: '#253858', label: 'BACKLOG' },
};

// Work item icons now use canonical JiraIssueTypeIcon from src/lib/jira-issue-type-icons.tsx

const TYPE_COLORS: Record<string, { color: string; opacity: number }> = {
  Bug:      { color: '#FF5630', opacity: 0.75 },
  Story:    { color: '#36B37E', opacity: 0.80 },
  Subtask:  { color: '#2684FF', opacity: 0.75 },
  Incident: { color: '#FF5630', opacity: 0.50 },
};

// ── Colour tokens ──
const INK1 = '#0F172A';
const INK2 = '#334155';
const INK4 = '#64748B';
const MUTED = '#94A3B8';
const SUCCESS = '#16A34A';
const WARNING = '#D97706';
const DANGER = '#DC2626';
const BRAND = '#2563EB';
const BORDER = 'rgba(15,23,42,0.12)';
const BORDER_LIGHT = 'rgba(15,23,42,0.06)';

// ── Hooks — wired to existing Catalyst tables ──
function mapStatus(jiraStatus: string) {
  return R360_STATUS_MAP[jiraStatus] || R360_STATUS_DEFAULT;
}

function useR360WeeklyStats(resourceId: string) {
  return useQuery({
    queryKey: ['r360-profile-stats', resourceId],
    queryFn: async () => {
      // Try snapshot first
      const { data: current } = await supabase
        .from('r360_weekly_snapshots')
        .select('*')
        .eq('resource_id', resourceId)
        .eq('week_number', R360_WEEK)
        .maybeSingle();
      const { data: prev } = await supabase
        .from('r360_weekly_snapshots')
        .select('closed_this_week')
        .eq('resource_id', resourceId)
        .eq('week_number', R360_WEEK - 1)
        .maybeSingle();
      return { current, prev };
    },
    enabled: !!resourceId,
    staleTime: 5 * 60 * 1000,
  });
}

function useR360ClosureTrend(resourceId: string) {
  return useQuery({
    queryKey: ['r360-profile-trend', resourceId],
    queryFn: async () => {
      const { data } = await supabase
        .from('r360_weekly_snapshots')
        .select('week_number, closed_this_week')
        .eq('resource_id', resourceId)
        .order('week_number', { ascending: true })
        .limit(8);
      return (data || []).map((d: any) => ({
        weekNumber: d.week_number,
        weekLabel: `W${d.week_number}`,
        closedCount: d.closed_this_week,
        isCurrent: d.week_number === R360_WEEK,
      }));
    },
    enabled: !!resourceId,
    staleTime: 5 * 60 * 1000,
  });
}

function useR360Resource(resourceId: string) {
  return useQuery({
    queryKey: ['r360-profile-resource', resourceId],
    queryFn: async () => {
      // Query resource_inventory (same table powering the ring view)
      const { data: resource } = await (supabase as any).from('resource_inventory')
        .select('id, rid, name, role_name, department_name, vendor_name, resource_type, profile_id, jira_account_id')
        .eq('id', resourceId)
        .maybeSingle();
      if (!resource) return null;

      // Fetch real avatar from profiles table
      let avatar_url: string | null = null;
      if (resource.profile_id) {
        const { data: profile } = await supabase.from('profiles')
          .select('avatar_url')
          .eq('id', resource.profile_id)
          .maybeSingle();
        avatar_url = profile?.avatar_url ?? null;
      }

      return {
        ...resource,
        full_name: resource.name,
        role: resource.role_name || 'Team Member',
        department: resource.department_name || '',
        avatar_url,
        resource_key: `R-${String(resource.rid).padStart(3, '0')}`,
      };
    },
    enabled: !!resourceId,
    staleTime: 5 * 60 * 1000,
  });
}

function useR360ProfileWorkItems(resourceId: string) {
  return useQuery({
    queryKey: ['r360-profile-work-items', resourceId],
    queryFn: async () => {
      // Get resource identity for querying ph_issues
      const { data: resource } = await (supabase as any).from('resource_inventory')
        .select('name, jira_account_id')
        .eq('id', resourceId)
        .maybeSingle();
      if (!resource) return [];

      let query = (supabase as any).from('ph_issues')
        .select('issue_key, project_key, summary, issue_type, status, priority, assignee_display_name, jira_created_at, jira_updated_at');
      if (resource.jira_account_id) {
        query = query.eq('assignee_account_id', resource.jira_account_id);
      } else {
        query = query.eq('assignee_display_name', resource.name);
      }
      query = query.order('jira_updated_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((item: any) => {
        const st = mapStatus(item.status);
        return {
          id: item.issue_key,
          item_key: item.issue_key,
          title: item.summary || '',
          work_item_type: item.issue_type || 'Task',
          status: item.status,
          status_category: st.category,
          source_hub: (item.project_key || '').toLowerCase().includes('inc') ? 'incident' : 'BAU',
          priority: item.priority,
          created_at: item.jira_created_at,
          updated_at: item.jira_updated_at,
        };
      });
    },
    enabled: !!resourceId,
    staleTime: 5 * 60 * 1000,
  });
}

// ── Helpers ──
function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function computeLoadColour(openCount: number, roleAvg: number): string {
  if (openCount === 0) return SUCCESS;
  if (openCount <= roleAvg) return INK1;
  if (openCount <= roleAvg * 1.4) return WARNING;
  return DANGER;
}

// ── StatusLozenge (3 colours) ──
function DrawerLozenge({ status }: { status: string }) {
  const key = status.toUpperCase().replace(/ /g, '_');
  const s = STATUS_MAP[key] || STATUS_MAP.TO_DO;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', height: 20,
      padding: '0 6px', borderRadius: 3, fontSize: 11, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.03em',
      background: s.bg, color: s.color, whiteSpace: 'nowrap',
    }}>{s.label}</span>
  );
}

// ── Skeleton ──
function Skeleton({ h = 20, w = '100%', r = 4 }: { h?: number; w?: string | number; r?: number }) {
  return (
    <div style={{
      height: h, width: w, borderRadius: r, background: '#E2E8F0',
      animation: 'pulse 1.5s ease-in-out infinite',
    }} />
  );
}

// ── Section Title ──
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: "'Inter', system-ui, sans-serif", fontSize: 11, fontWeight: 650,
      textTransform: 'uppercase', letterSpacing: '0.06em', color: INK4, marginBottom: 12,
    }}>{children}</div>
  );
}

// ══════════════════════════════════════════
// MAIN DRAWER
// ══════════════════════════════════════════
interface R360ProfileDrawerProps {
  resourceId: string;
  onClose: () => void;
}

type TabKey = 'overview' | 'behavioural' | 'weekly' | 'items';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'behavioural', label: 'Behavioural Patterns' },
  { key: 'weekly', label: 'Weekly Story' },
  { key: 'items', label: 'Work Items' },
];

export default function R360ProfileDrawer({ resourceId, onClose }: R360ProfileDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const { data: resource, isLoading: resLoading, isError: resError } = useR360Resource(resourceId);
  const { data: statsData, isLoading: statsLoading } = useR360WeeklyStats(resourceId);
  const { data: trend = [], isLoading: trendLoading } = useR360ClosureTrend(resourceId);
  const { data: workItems = [], isLoading: itemsLoading } = useR360ProfileWorkItems(resourceId);

  const stats = statsData?.current;
  const prevWeekClosed = statsData?.prev?.closed_this_week ?? 0;

  // Compute stats from live work items when snapshot is empty
  const liveStats = useMemo(() => {
    if (stats) return null; // snapshot exists, use it

    // Saudi work week bounds: Sunday–Thursday
    const now = new Date();
    const day = now.getDay();
    const daysSinceSunday = day === 0 ? 0 : day;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysSinceSunday);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 4);
    weekEnd.setHours(23, 59, 59, 999);

    const open = workItems.filter((i: any) => i.status_category !== 'done');
    const done = workItems.filter((i: any) => i.status_category === 'done');
    const closedThisWeek = done.filter((i: any) => {
      const u = new Date(i.updated_at);
      return u >= weekStart && u <= weekEnd;
    }).length;
    const inProg = workItems.filter((i: any) => i.status_category === 'in_progress');
    const inRev = workItems.filter((i: any) => i.status_category === 'in_review');
    const nowMs = Date.now();
    const oldest = open.reduce((max: { age: number; key: string }, i: any) => {
      const age = Math.floor((nowMs - new Date(i.created_at).getTime()) / 86400000);
      return age > max.age ? { age, key: i.item_key ?? '—' } : max;
    }, { age: 0, key: '—' });
    return {
      total_open: open.length,
      closed_this_week: closedThisWeek,
      in_review: inRev.length,
      pickup_speed_hours: 0,
      in_progress_concurrent: inProg.length,
      closed_of_touched: closedThisWeek,
      total_touched: open.length + closedThisWeek,
      avg_cycle_time_days: 0,
      oldest_item_age_days: oldest.age,
      oldest_item_key: oldest.key,
      closure_rate_pct: (open.length + closedThisWeek) > 0 ? Math.round((closedThisWeek / (open.length + closedThisWeek)) * 100) : 0,
    };
  }, [stats, workItems]);

  const effectiveStats = stats || liveStats;

  // Derived
  const openCount = effectiveStats?.total_open ?? 0;
  const roleAvg = 5; // benchmark
  const loadColour = computeLoadColour(openCount, roleAvg);

  const resourceName = resource?.full_name || '';
  const resourceRole = resource?.role || '';
  const deptName = resource?.department || '';
  const resourceRid = resource?.resource_key || '';

  // Work mix
  const workMix = useMemo(() => {
    const openItems = workItems.filter((i: any) => i.status_category !== 'done');
    const total = openItems.length || 1;
    // Normalize issue_type: "Sub-task" → "Subtask", "New Feature" → "Story", etc.
    const normalize = (t: string) => {
      const lower = (t || '').toLowerCase();
      if (lower === 'bug') return 'Bug';
      if (lower === 'story' || lower === 'new feature' || lower === 'improvement') return 'Story';
      if (lower === 'sub-task' || lower === 'subtask') return 'Subtask';
      if (lower === 'incident') return 'Incident';
      return t; // keep original for "Task", "Epic", etc.
    };
    const counts: Record<string, number> = {};
    openItems.forEach((i: any) => { const n = normalize(i.work_item_type); counts[n] = (counts[n] || 0) + 1; });
    const roleAvgs: Record<string, number> = { Bug: 35, Story: 30, Subtask: 20, Incident: 15 };
    // Show canonical types + any extra types found in data
    const canonical = ['Bug', 'Story', 'Subtask', 'Incident'];
    const extraTypes = Object.keys(counts).filter(t => !canonical.includes(t) && counts[t] > 0);
    return [...canonical, ...extraTypes].map(t => ({
      type: t,
      count: counts[t] || 0,
      pct: Math.round(((counts[t] || 0) / total) * 100),
      roleAvgPct: roleAvgs[t] || 0,
    }));
  }, [workItems]);

  // Hub breakdown
  const hubBreakdown = useMemo(() => {
    const hubs: Record<string, { open: number; closed: number }> = {};
    workItems.forEach((i: any) => {
      const hub = i.source_hub || 'BAU';
      if (!hubs[hub]) hubs[hub] = { open: 0, closed: 0 };
      if (i.status_category === 'done') hubs[hub].closed++;
      else hubs[hub].open++;
    });
    return Object.entries(hubs).map(([hub, d]) => ({
      hub,
      code: hub === 'incident' ? 'I' : hub === 'bau' ? 'B' : 'Σ',
      isIncident: hub === 'incident',
      open: d.open,
      closed: d.closed,
      total: d.open + d.closed,
      closurePct: d.open + d.closed > 0 ? Math.round((d.closed / (d.open + d.closed)) * 100) : 0,
    }));
  }, [workItems]);

  const totalOpenAcrossHubs = hubBreakdown.reduce((s, h) => s + h.open, 0);

  // Summary KPIs for hub section
  const hubSummary = useMemo(() => {
    let inProgress = 0, toDo = 0, blocked = 0;
    workItems.forEach((i: any) => {
      if (i.status_category === 'done') return;
      if (i.status_category === 'in_progress') inProgress++;
      else if (i.status_category === 'blocked') blocked++;
      else toDo++;
    });
    return { total: totalOpenAcrossHubs, inProgress, toDo, blocked };
  }, [workItems, totalOpenAcrossHubs]);

  if (resError) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, fontFamily: "'Inter', system-ui, sans-serif" }}>
        <RefreshCw size={20} color={INK4} />
        <span style={{ fontSize: 13, color: INK2 }}>Failed to load — retry</span>
        <button onClick={onClose} style={{ fontSize: 12, color: BRAND, background: 'none', border: 'none', cursor: 'pointer' }}>Close</button>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ━━ A. TOPBAR ━━ */}
      <div style={{
        height: 48, flexShrink: 0, borderBottom: `1px solid ${BORDER}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px',
      }}>
        <button
          onClick={onClose}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: BRAND, color: '#FFFFFF',
            fontFamily: "'Inter', system-ui, sans-serif", fontSize: 12, fontWeight: 600,
            padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
            transition: 'background 100ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#1D4ED8'; }}
          onMouseLeave={e => { e.currentTarget.style.background = BRAND; }}
        >
          <ChevronLeft size={16} /> Resources
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: MUTED }}>Data: 1h ago</span>
          <button
            onClick={onClose}
            style={{
              width: 26, height: 26, borderRadius: 4, border: 'none', background: 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              transition: 'background 100ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(15,23,42,0.04)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <X size={14} color={INK4} />
          </button>
        </div>
      </div>

      {/* ━━ B. PROFILE HEADER ━━ */}
      <div style={{ padding: 16, flexShrink: 0, borderBottom: `1px solid ${BORDER_LIGHT}`, display: 'flex', gap: 12 }}>
        {resLoading ? (
          <><Skeleton h={52} w={52} r={26} /><div style={{ flex: 1 }}><Skeleton h={20} w="60%" /><Skeleton h={14} w="80%" /></div></>
        ) : (
          <>
            {resource?.avatar_url ? (
              <img
                src={resource.avatar_url}
                alt={resourceName}
                style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover' as const, flexShrink: 0 }}
                onError={(e) => { (e.currentTarget).style.display = 'none'; const sib = e.currentTarget.nextElementSibling as HTMLElement; if (sib) sib.style.display = 'flex'; }}
              />
            ) : null}
            <div style={{
              width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #475569, #334155)',
              display: resource?.avatar_url ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#FFFFFF', fontFamily: "'Sora', sans-serif", fontSize: 17, fontWeight: 700,
            }}>
              {getInitials(resourceName || '?')}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 18, fontWeight: 700, color: INK1 }}>{resourceName || '—'}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: INK4, flexWrap: 'wrap', marginTop: 2 }}>
                <span>{resourceRole || '—'}</span>
                {deptName && <><span>·</span><span>{deptName}</span></>}
                {resourceRid && <><span>·</span><span style={{
                  background: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: 3,
                  padding: '2px 7px', fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11, fontWeight: 700, color: BRAND,
                }}>{resourceRid}</span></>}
                <span style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: openCount > roleAvg ? WARNING : openCount === 0 ? SUCCESS : INK1,
                }} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* ━━ C. TABS ━━ */}
      <div style={{ flexShrink: 0, borderBottom: `1px solid ${BORDER}`, padding: '0 16px', display: 'flex' }}>
        {TABS.map(t => {
          const isActive = activeTab === t.key;
          return (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              fontFamily: "'Inter', system-ui, sans-serif", fontSize: 12, fontWeight: isActive ? 600 : 500,
              color: isActive ? BRAND : INK4, padding: '0 14px', height: 38,
              border: 'none', borderBottom: `2px solid ${isActive ? BRAND : 'transparent'}`,
              background: 'transparent', cursor: 'pointer',
              transition: 'color 100ms, border-color 100ms',
            }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = INK1; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = INK4; }}
            >{t.label}</button>
          );
        })}
      </div>

      {/* ━━ D. BODY ━━ */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {activeTab === 'overview' && (
          <OverviewTab
            stats={effectiveStats}
            statsLoading={statsLoading}
            prevWeekClosed={prevWeekClosed}
            openCount={openCount}
            roleAvg={roleAvg}
            loadColour={loadColour}
            trend={trend}
            trendLoading={trendLoading}
            workMix={workMix}
            hubBreakdown={hubBreakdown}
            hubSummary={hubSummary}
            totalOpenAcrossHubs={totalOpenAcrossHubs}
            onTabSwitch={setActiveTab}
          />
        )}
        {activeTab === 'behavioural' && (
          <div style={{ padding: 16, fontSize: 13, color: INK4 }}>Behavioural Patterns — coming in Stage D</div>
        )}
        {activeTab === 'weekly' && (
          <div style={{ padding: 16, fontSize: 13, color: INK4 }}>Weekly Story — coming in Stage D</div>
        )}
        {activeTab === 'items' && (
          <div style={{ padding: 16, fontSize: 13, color: INK4 }}>Work Items — coming in Stage D</div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// OVERVIEW TAB
// ══════════════════════════════════════════
function OverviewTab({
  stats, statsLoading, prevWeekClosed, openCount, roleAvg, loadColour,
  trend, trendLoading, workMix, hubBreakdown, hubSummary, totalOpenAcrossHubs,
  onTabSwitch,
}: {
  stats: any; statsLoading: boolean; prevWeekClosed: number;
  openCount: number; roleAvg: number; loadColour: string;
  trend: any[]; trendLoading: boolean;
  workMix: { type: string; count: number; pct: number; roleAvgPct: number }[];
  hubBreakdown: { hub: string; code: string; isIncident: boolean; open: number; closed: number; total: number; closurePct: number }[];
  hubSummary: { total: number; inProgress: number; toDo: number; blocked: number };
  totalOpenAcrossHubs: number;
  onTabSwitch: (t: TabKey) => void;
}) {
  const closedThisWeek = stats?.closed_this_week ?? 0;
  const inReview = stats?.in_review ?? 0;
  const pickupHours = stats?.pickup_speed_hours ?? 0;
  const concurrent = stats?.in_progress_concurrent ?? 0;
  const closedOfTouched = stats?.closed_of_touched ?? 0;
  const totalTouched = stats?.total_touched ?? 0;
  const avgDays = stats?.avg_cycle_time_days ?? 0;
  const oldestAgeDays = stats?.oldest_item_age_days ?? 0;
  const oldestKey = stats?.oldest_item_key ?? '—';

  const closedColour = openCount === 0 ? INK1 : closedThisWeek === 0 ? WARNING : closedThisWeek >= 3 ? SUCCESS : INK1;
  const closedTrend = closedThisWeek > prevWeekClosed ? '↑' : closedThisWeek < prevWeekClosed ? '↓' : '';
  const closedTrendColor = closedThisWeek > prevWeekClosed ? SUCCESS : closedThisWeek < prevWeekClosed ? DANGER : INK1;

  const concurrentColour = concurrent === 0 ? SUCCESS : concurrent >= 3 ? DANGER : INK1;
  const cycleColour = avgDays > 10 ? DANGER : avgDays > 5 ? WARNING : INK1;
  const oldestColour = oldestAgeDays >= 14 ? DANGER : oldestAgeDays >= 8 ? WARNING : INK1;

  // Sparkline
  const trendMax = Math.max(...trend.map(t => t.closedCount), 1);
  const trendPrev4Avg = trend.length > 4 ? trend.slice(-5, -1).reduce((s: number, t: any) => s + t.closedCount, 0) / 4 : 0;
  const trendCurrent = trend.length > 0 ? trend[trend.length - 1]?.closedCount : 0;
  const trendChangePct = trendPrev4Avg > 0 ? Math.round(((trendCurrent - trendPrev4Avg) / trendPrev4Avg) * 100) : 0;

  const bugRow = workMix.find(w => w.type === 'Bug');
  const showBugInsight = bugRow && bugRow.pct > bugRow.roleAvgPct;

  return (
    <>
      {/* §1 — KPI Stats Bar */}
      <div style={{ padding: 16, borderBottom: `1px solid ${BORDER_LIGHT}` }}>
        <SectionTitle>THIS WEEK · W{R360_WEEK} · MAR 1–5, 2026</SectionTitle>
        {statsLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: BORDER, border: `1px solid ${BORDER}`, borderRadius: 6, overflow: 'hidden' }}>
            {[1,2,3,4].map(i => <div key={i} style={{ background: '#FFFFFF', padding: '12px 14px' }}><Skeleton h={28} w="40%" /><Skeleton h={12} w="60%" /></div>)}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: BORDER, border: `1px solid ${BORDER}`, borderRadius: 6, overflow: 'hidden' }}>
            {/* Total Open */}
            <div style={{ background: '#FFFFFF', padding: '12px 14px' }}>
              <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 22, fontWeight: 700, color: loadColour }}>{openCount}</div>
              <div style={{ fontSize: 11, fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.05em', color: MUTED, marginTop: 2 }}>TOTAL OPEN</div>
              <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>vs role avg {roleAvg}</div>
            </div>
            {/* Closed This Week */}
            <div style={{ background: '#FFFFFF', padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 22, fontWeight: 700, color: closedColour }}>{closedThisWeek}</span>
                {closedTrend && <span style={{ fontSize: 14, fontWeight: 700, color: closedTrendColor }}>{closedTrend}</span>}
              </div>
              <div style={{ fontSize: 11, fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.05em', color: MUTED, marginTop: 2 }}>CLOSED THIS WEEK</div>
              <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>vs {prevWeekClosed} last week</div>
            </div>
            {/* In Review */}
            <div style={{ background: '#FFFFFF', padding: '12px 14px' }}>
              <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 22, fontWeight: 700, color: INK1 }}>{inReview}</div>
              <div style={{ fontSize: 11, fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.05em', color: MUTED, marginTop: 2 }}>IN REVIEW</div>
              <div style={{ fontSize: 11, color: inReview === 0 ? WARNING : INK1, marginTop: 2 }}>{inReview === 0 ? 'None pending' : `${inReview} awaiting`}</div>
            </div>
            {/* Pickup Speed */}
            <div style={{ background: '#FFFFFF', padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 22, fontWeight: 700, color: INK1 }}>{pickupHours}</span>
                <span style={{ fontSize: 14, fontWeight: 500, color: INK4 }}>h</span>
              </div>
              <div style={{ fontSize: 11, fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.05em', color: MUTED, marginTop: 2 }}>PICKUP SPEED</div>
              <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>team avg 38h</div>
            </div>
          </div>
        )}
      </div>

      {/* §2 — Capacity & Load Ring */}
      <div style={{ padding: 16, borderBottom: `1px solid ${BORDER_LIGHT}` }}>
        <SectionTitle>CAPACITY & LOAD</SectionTitle>
        <div style={{ display: 'flex', gap: 16 }}>
          {/* SVG Ring */}
          <svg width={110} height={110} viewBox="0 0 110 110" style={{ flexShrink: 0 }}>
            {/* Track */}
            <circle cx={55} cy={55} r={44} fill="none" stroke="#E2E8F0" strokeWidth={9} />
            {/* Ghost arc (role avg) */}
            <circle cx={55} cy={55} r={44} fill="none" stroke="#CBD5E1" strokeWidth={2}
              strokeDasharray="125 151" strokeDashoffset={-69} opacity={0.7} />
            {/* Main arc */}
            <circle cx={55} cy={55} r={44} fill="none" stroke={loadColour} strokeWidth={9}
              strokeDasharray={`${Math.min((openCount / 11) * 276.5, 276.5)} ${276.5 - Math.min((openCount / 11) * 276.5, 276.5)}`}
              strokeDashoffset={-69} strokeLinecap="round" />
            {/* Center text */}
            <text x={55} y={52} textAnchor="middle" fontFamily="'Sora', sans-serif" fontSize={22} fontWeight={700} fill={loadColour}>{openCount}</text>
            <text x={55} y={67} textAnchor="middle" fontFamily="'Inter', sans-serif" fontSize={11} fontWeight={700} fill={MUTED}>OPEN</text>
            <text x={55} y={82} textAnchor="middle" fontFamily="'Inter', sans-serif" fontSize={11} fill="#CBD5E1">avg {roleAvg}</text>
          </svg>

          {/* Stat rows */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { label: 'In progress right now', value: `${concurrent} concurrent`, color: concurrentColour },
              { label: 'Closed this week', value: `${closedOfTouched} of ${totalTouched} touched`, color: INK1 },
              { label: 'Avg cycle time', value: `${avgDays}d per item`, color: cycleColour },
              { label: 'Oldest open item', value: `${oldestAgeDays}d · ${oldestKey}`, color: oldestColour },
            ].map((row, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 10px', border: `1px solid ${BORDER}`, borderRadius: 4,
                boxShadow: '0 1px 2px rgba(15,23,42,0.06)',
              }}>
                <span style={{ fontSize: 12, color: INK2 }}>{row.label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: row.color, fontFamily: "'JetBrains Mono', monospace" }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Anomaly callout */}
        {concurrent >= 3 && (
          <div style={{
            marginTop: 10, background: 'rgba(217,119,6,0.08)', borderLeft: `3px solid ${WARNING}`,
            borderRadius: 4, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <AlertTriangle size={13} color={WARNING} />
            <span style={{ fontSize: 12, color: '#92400E' }}>
              {concurrent} items in progress simultaneously — may indicate context-switching
            </span>
          </div>
        )}
      </div>

      {/* §3 — Closure Trend */}
      <div style={{ padding: 16, borderBottom: `1px solid ${BORDER_LIGHT}` }}>
        <SectionTitle>CLOSURE TREND</SectionTitle>
        <div style={{ border: `1px solid ${BORDER}`, borderRadius: 6, boxShadow: '0 1px 2px rgba(15,23,42,0.04)', padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: INK2 }}>Items closed per week ({trend.length > 0 ? `${trend[0]?.weekLabel}–${trend[trend.length-1]?.weekLabel}` : '—'})</span>
            {trendChangePct !== 0 && (
              <span style={{ fontSize: 11, fontWeight: 600, color: trendChangePct > 0 ? SUCCESS : DANGER }}>
                {trendChangePct > 0 ? '+' : ''}{trendChangePct}% vs prev 4 weeks
              </span>
            )}
          </div>
          {trendLoading ? <Skeleton h={72} /> : trend.length === 0 ? (
            <div style={{ height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: MUTED }}>No trend data</div>
          ) : (
            <svg width="100%" height={72} viewBox={`0 0 ${trend.length * 80} 72`} preserveAspectRatio="none">
              <defs>
                <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SUCCESS} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={SUCCESS} stopOpacity={0} />
                </linearGradient>
              </defs>
              {/* Area */}
              <path d={
                `M${trend.map((t, i) => `${i * 80 + 40},${62 - (t.closedCount / trendMax) * 50}`).join(' L')} L${(trend.length - 1) * 80 + 40},62 L40,62 Z`
              } fill="url(#trendGrad)" />
              {/* Line */}
              <polyline
                points={trend.map((t, i) => `${i * 80 + 40},${62 - (t.closedCount / trendMax) * 50}`).join(' ')}
                fill="none" stroke={SUCCESS} strokeWidth={1.5}
              />
              {/* Points + labels */}
              {trend.map((t, i) => {
                const x = i * 80 + 40;
                const y = 62 - (t.closedCount / trendMax) * 50;
                const isCurrentW = t.isCurrent;
                const isPeak = t.closedCount === trendMax;
                return (
                  <g key={i}>
                    <circle cx={x} cy={y} r={isCurrentW ? 4 : 2.5} fill={isCurrentW ? WARNING : SUCCESS} />
                    <text x={x} y={y - 8} textAnchor="middle" fontSize={11}
                      fontFamily="'Inter', sans-serif"
                      fontWeight={isPeak || isCurrentW ? 700 : 400}
                      fill={isCurrentW ? WARNING : isPeak ? SUCCESS : MUTED}
                    >{t.closedCount}</text>
                    <text x={x} y={72} textAnchor="middle" fontSize={10} fill={MUTED} fontFamily="'Inter', sans-serif">{t.weekLabel}</text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>
      </div>

      {/* §4 — Work Mix */}
      <div style={{ padding: 16, borderBottom: `1px solid ${BORDER_LIGHT}` }}>
        <SectionTitle>WORK MIX</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {workMix.map(row => {
            const tc = TYPE_COLORS[row.type] || { color: '#94A3B8', opacity: 0.6 };
            const icon = WORK_ITEM_ICONS[row.type];
            return (
              <div key={row.type} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {icon && <span dangerouslySetInnerHTML={{ __html: icon }} style={{ flexShrink: 0, width: 16, height: 16, display: 'flex' }} />}
                <span style={{ fontSize: 12, color: INK2, width: 72, flexShrink: 0 }}>{row.type}</span>
                <div style={{ flex: 1, height: 18, background: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 3,
                    width: `${row.pct}%`,
                    background: tc.color, opacity: tc.opacity,
                    transition: 'width 300ms ease',
                  }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 650, fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: 'tabular-nums', color: INK2, width: 28, textAlign: 'right' as const }}>{row.count}</span>
              </div>
            );
          })}
        </div>
        {/* Bug insight */}
        {showBugInsight && (
          <div style={{
            marginTop: 10, background: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: 4,
            padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Info size={14} color={BRAND} />
            <span style={{ fontSize: 11, color: BRAND }}>Bug ratio ({bugRow!.pct}%) exceeds role average ({bugRow!.roleAvgPct}%)</span>
          </div>
        )}
      </div>

      {/* §5 — Weekly Story Card */}
      <div style={{ padding: 16, borderBottom: `1px solid ${BORDER_LIGHT}` }}>
        <SectionTitle>WEEKLY STORY</SectionTitle>
        <div
          onClick={() => onTabSwitch('weekly')}
          style={{
            border: `1px solid ${BORDER}`, borderRadius: 6, boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
            padding: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
            transition: 'background 100ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(15,23,42,0.04)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; }}
        >
          <div style={{
            width: 32, height: 32, flexShrink: 0, background: '#EFF6FF', border: '1px solid #DBEAFE',
            borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BookOpen size={16} color={BRAND} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.05em', color: BRAND }}>Weekly Story · W{R360_WEEK}</div>
            <div style={{ fontSize: 13, fontWeight: 500, fontStyle: 'italic', color: INK1, marginTop: 2 }}>
              &ldquo;Focus on incident resolution and QA throughput&rdquo;
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: SUCCESS }} />
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: WARNING }} />
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: BRAND }} />
            </div>
          </div>
          <ChevronRight size={14} color={BRAND} />
        </div>
      </div>

      {/* §6 — Hub Breakdown */}
      <div style={{ padding: 16, borderBottom: `1px solid ${BORDER_LIGHT}` }}>
        <SectionTitle>HUB BREAKDOWN</SectionTitle>
        {/* Summary grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: BORDER, border: `1px solid ${BORDER}`, borderRadius: 6, overflow: 'hidden', marginBottom: 12 }}>
          {[
            { label: 'Total Backlog', value: hubSummary.total, color: INK1 },
            { label: 'In Progress', value: hubSummary.inProgress, color: BRAND },
            { label: 'To Do', value: hubSummary.toDo, color: INK1 },
            { label: 'Blocked', value: hubSummary.blocked, color: hubSummary.blocked > 0 ? DANGER : INK1 },
          ].map((c, i) => (
            <div key={i} style={{ background: '#FFFFFF', padding: '10px 12px' }}>
              <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 18, fontWeight: 700, color: c.color }}>{c.value}</div>
              <div style={{ fontSize: 11, fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.05em', color: MUTED, marginTop: 2 }}>{c.label}</div>
            </div>
          ))}
        </div>

        {/* Per-hub rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {hubBreakdown.map(hub => (
            <div key={hub.hub} style={{
              border: `1px solid ${BORDER}`, borderRadius: 6, boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
              padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
            }}>
              <span style={{
                width: 22, height: 22, borderRadius: 4, flexShrink: 0,
                background: hub.isIncident ? DANGER : INK4, color: '#FFFFFF',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700,
              }}>{hub.code}</span>
              <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: INK1 }}>
                {hub.hub === 'incident' ? 'IncidentHub' : hub.hub === 'bau' ? 'BAU' : hub.hub}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: hub.open > 0 ? WARNING : SUCCESS, fontFamily: "'JetBrains Mono', monospace" }}>{hub.open}</span>
              <div style={{ width: 60, height: 6, background: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 3, width: `${hub.closurePct}%`, background: SUCCESS, transition: 'width 300ms' }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: INK4, fontFamily: "'JetBrains Mono', monospace", width: 36, textAlign: 'right' as const }}>{hub.closurePct}%</span>
            </div>
          ))}
        </div>

        {/* Total row */}
        <div style={{
          marginTop: 8, padding: '8px 12px', borderRadius: 4,
          background: totalOpenAcrossHubs > roleAvg ? 'rgba(220,38,38,0.06)' : 'rgba(22,163,74,0.06)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 12, color: INK2 }}>Total open across all hubs</span>
          <span style={{
            fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
            color: totalOpenAcrossHubs > roleAvg ? DANGER : SUCCESS,
          }}>{totalOpenAcrossHubs}</span>
        </div>
      </div>
    </>
  );
}
