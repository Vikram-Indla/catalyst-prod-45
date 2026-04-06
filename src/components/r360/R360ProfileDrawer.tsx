/**
 * R360 Profile Drawer — 700px inline split-pane intelligence view
 * V12 Hybrid Precision · No portal, no fixed, no overlay
 */
import React, { useState, useMemo, useCallback, useEffect, memo } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { ChevronLeft, X, AlertTriangle, Info, BookOpen, ChevronRight, ChevronLeft as ChevronLeftIcon, RefreshCw, CalendarX, Inbox } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { R360_STATUS_MAP, R360_STATUS_DEFAULT } from '@/constants/r360';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { fetchItemDetail, calcDaysSitting } from '@/lib/r360/fetchItemDetail';
import type { ItemDetailFull } from '@/lib/r360/fetchItemDetail';
import { getWeekNumber } from '@/constants/r360WeekConfig';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const STATUS_MAP: Record<string, { bg: string; color: string; label: string }> = {
  TO_DO:       { bg: '#DFE1E6', color: '#42526E', label: 'TO DO' },
  IN_PROGRESS: { bg: '#0C66E4', color: '#FFFFFF', label: 'IN PROGRESS' },
  IN_REVIEW:   { bg: '#0C66E4', color: '#FFFFFF', label: 'IN REVIEW' },
  DONE:        { bg: '#1B7F37', color: '#FFFFFF', label: 'DONE' },
  BACKLOG:     { bg: '#DFE1E6', color: '#42526E', label: 'BACKLOG' },
};

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

function useR360WeeklyStats(resourceId: string, weekNumber: number) {
  return useQuery({
    queryKey: ['r360-profile-stats', resourceId, weekNumber],
    queryFn: async () => {
      const { data: current } = await supabase
        .from('r360_weekly_snapshots')
        .select('*')
        .eq('resource_id', resourceId)
        .eq('week_number', weekNumber)
        .maybeSingle();
      const { data: prev } = await supabase
        .from('r360_weekly_snapshots')
        .select('closed_this_week')
        .eq('resource_id', resourceId)
        .eq('week_number', weekNumber - 1)
        .maybeSingle();
      return { current, prev };
    },
    enabled: !!resourceId,
    staleTime: 5 * 60 * 1000,
  });
}

function useR360ClosureTrend(resourceId: string, weekNumber: number) {
  return useQuery({
    queryKey: ['r360-profile-trend', resourceId, weekNumber],
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
        isCurrent: d.week_number === weekNumber,
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
      const { data: resource } = await (supabase as any).from('resource_inventory')
        .select('id, rid, name, role_name, department_name, vendor_name, resource_type, profile_id, jira_account_id')
        .eq('id', resourceId)
        .maybeSingle();
      if (!resource) return null;

      let avatar_url: string | null = null;
      let skills: string[] = [];
      if (resource.profile_id) {
        const { data: profile } = await (supabase as any).from('profiles')
          .select('avatar_url, skills')
          .eq('id', resource.profile_id)
          .maybeSingle();
        avatar_url = profile?.avatar_url ?? null;
        const rawSkills = profile?.skills;
        if (Array.isArray(rawSkills)) {
          skills = rawSkills.filter(Boolean);
        } else if (typeof rawSkills === 'string' && rawSkills) {
          skills = rawSkills.split(',').map((s: string) => s.trim()).filter(Boolean);
        }
      }

      return {
        ...resource,
        full_name: resource.name,
        role: resource.role_name || 'Team Member',
        department: resource.department_name || '',
        avatar_url,
        skills,
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

const SLATE = '#64748B';

function computeLoadColour(openCount: number, roleAvg: number): string {
  if (openCount === 0) return SUCCESS;
  if (openCount <= roleAvg) return SLATE;
  if (openCount <= roleAvg * 1.5) return WARNING;
  return DANGER;
}

// ── R360StatusLozenge (3 colours — IMMUTABLE) ──
function R360StatusLozenge({ status }: { status: string }) {
  const s = (status ?? '').toLowerCase().replace(/[\s_-]/g, '');
  let bg = '#DFE1E6';
  let color = '#42526E';
  if (['done', 'closed', 'completed', 'approved', 'resolved'].includes(s)) {
    bg = '#1B7F37'; color = '#FFFFFF';
  } else if (['inprogress', 'inreview', 'active', 'started'].includes(s)) {
    bg = '#0C66E4'; color = '#FFFFFF';
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      backgroundColor: bg, color,
      fontSize: '11px', fontWeight: 700,
      letterSpacing: '0.03em', textTransform: 'uppercase' as const,
      padding: '0 6px', height: '20px', borderRadius: '4px',
      lineHeight: '20px', whiteSpace: 'nowrap' as const,
      fontFamily: "'Inter', sans-serif",
    }}>
      {(status || '').toUpperCase()}
    </span>
  );
}

// ── Skeleton ──
function Skeleton({ h = 20, w = '100%', r = 4 }: { h?: number; w?: string | number; r?: number }) {
  return (
    <div style={{
      height: h, width: w, borderRadius: r, background: 'var(--divider)',
      animation: 'pulse 1.5s ease-in-out infinite',
    }} />
  );
}

// ── Section Title ──
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: "'Inter', system-ui, sans-serif", fontSize: 11, fontWeight: 500,
      textTransform: 'uppercase', letterSpacing: '0.05em', color: INK4, marginBottom: 12,
    }}>{children}</div>
  );
}

// ══════════════════════════════════════════
// PANEL STACK TYPES
// ══════════════════════════════════════════
type PanelView =
  | { type: 'list'; label: string; items: any[] }
  | { type: 'detail'; itemKey: string };

// ══════════════════════════════════════════
// FILTERED LIST PANEL
// ══════════════════════════════════════════
function FilteredListPanel({
  label, items, onBack, onItemClick,
}: {
  label: string;
  items: any[];
  onBack: () => void;
  onItemClick: (item: any) => void;
}) {
  const relTime = (ds: string) => {
    const d = Math.floor((Date.now() - new Date(ds).getTime()) / 86400000);
    if (d === 0) return 'Today';
    if (d === 1) return '1d ago';
    return `${d}d ago`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        height: 48, flexShrink: 0, borderBottom: '0.75px solid var(--divider)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px',
      }}>
        <button onClick={onBack} style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none',
          border: 'none', cursor: 'pointer', padding: 0,
        }}>
          <ChevronLeft size={16} color={INK4} />
          <span style={{ fontSize: 13, color: INK2 }}>Back</span>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: INK1 }}>{label}</span>
          <span style={{
            display: 'inline-flex', alignItems: 'center',
            backgroundColor: '#DFE1E6', color: '#42526E',
            fontSize: '11px', fontWeight: 700, padding: '0 6px', height: '20px', borderRadius: '4px',
          }}>{items.length} item{items.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {items.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 8, padding: '48px 16px',
          }}>
            <Inbox size={24} color={MUTED} />
            <span style={{ fontSize: 13, color: INK4 }}>No items found</span>
          </div>
        ) : (
          items.map((item: any, idx: number) => (
            <div
              key={item.id || idx}
              onClick={() => onItemClick(item)}
              style={{
                display: 'flex', alignItems: 'center', height: 50, padding: '8px 12px', gap: 8,
                borderBottom: idx < items.length - 1 ? '0.75px solid var(--divider)' : 'none',
                background: 'var(--bg-app)', cursor: 'pointer', transition: 'background 120ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-app)'; }}
            >
              <span style={{ width: 20, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                <JiraIssueTypeIcon type={item.work_item_type || 'Task'} size={16} />
              </span>
              <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: INK4, flexShrink: 0 }}>{item.item_key}</span>
              <span style={{
                flex: 1, fontSize: 13, color: INK2, overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
              }}>{item.title}</span>
              <R360StatusLozenge status={item.status || item.status_category || 'To Do'} />
              <span style={{ fontSize: 11, color: MUTED, flexShrink: 0 }}>{relTime(item.updated_at)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// ITEM DETAIL PANEL
// ══════════════════════════════════════════
function ItemDetailPanel({
  itemKey, onBack, backLabel,
}: {
  itemKey: string;
  onBack: () => void;
  backLabel: string;
}) {
  const { data: detail, isLoading } = useQuery({
    queryKey: ['r360-item-detail', itemKey],
    queryFn: () => fetchItemDetail(itemKey),
    enabled: !!itemKey,
    staleTime: 2 * 60 * 1000,
  });

  const relTime = (ds: string | null) => {
    if (!ds) return '—';
    const d = Math.floor((Date.now() - new Date(ds).getTime()) / 86400000);
    if (d === 0) return 'Today';
    if (d === 1) return '1d ago';
    return `${d}d ago`;
  };

  const daysSitting = detail ? calcDaysSitting(detail.assignedAt, detail.resolution) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        height: 48, flexShrink: 0, borderBottom: '0.75px solid var(--divider)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px',
      }}>
        <button onClick={onBack} style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none',
          border: 'none', cursor: 'pointer', padding: 0,
        }}>
          <ChevronLeft size={16} color={INK4} />
          <span style={{ fontSize: 13, color: INK2 }}>{backLabel}</span>
        </button>
        <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: INK4 }}>{itemKey}</span>
      </div>
      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Skeleton h={20} w="40%" />
            <Skeleton h={28} w="80%" />
            <Skeleton h={16} w="50%" />
            <Skeleton h={120} />
          </div>
        ) : !detail ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '48px 0' }}>
            <Inbox size={24} color={MUTED} />
            <span style={{ fontSize: 13, color: INK4 }}>Item not found</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Type + Key */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <JiraIssueTypeIcon type={detail.type || 'Task'} size={16} />
              <span style={{ fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: INK4 }}>{detail.key}</span>
            </div>

            {/* Title */}
            <div style={{ fontSize: 16, fontWeight: 650, color: INK1, lineHeight: 1.4 }}>{detail.title}</div>

            {/* Status + Priority */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <R360StatusLozenge status={detail.status} />
              <span style={{ fontSize: 12, color: INK4 }}>Priority: {detail.priority}</span>
            </div>

            {/* Metadata grid */}
            <div style={{ border: '1px solid var(--divider)', borderRadius: 8, overflow: 'hidden' }}>
              {[
                { label: 'Project', value: detail.projectName },
                { label: 'Assignee', value: detail.assigneeName },
                { label: 'Assigned', value: relTime(detail.assignedAt) },
                { label: 'Days Sitting', value: `${daysSitting}d` },
                ...(detail.releaseName ? [{ label: 'Release', value: detail.releaseName }] : []),
                ...(detail.dueDate ? [{ label: 'Due Date', value: new Date(detail.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }] : []),
                ...(detail.sprintName ? [{ label: 'Release', value: detail.sprintName }] : []),
                ...(detail.resolution ? [{ label: 'Resolution', value: detail.resolution }] : []),
              ].map((row, i, arr) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  height: 50, padding: '0 14px',
                  borderBottom: i < arr.length - 1 ? '0.75px solid var(--divider)' : 'none',
                }}>
                  <span style={{ fontSize: 12, color: INK4 }}>{row.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: INK1 }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Parent */}
            {detail.parentKey && (
              <div style={{ border: '1px solid var(--divider)', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: INK4, marginBottom: 6 }}>PARENT</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: INK4 }}>{detail.parentKey}</span>
                  <span style={{ fontSize: 13, color: INK2 }}>{detail.parentName || '—'}</span>
                </div>
              </div>
            )}

            {/* Days Sitting Progress */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: INK4, marginBottom: 6 }}>TIME IN ASSIGNMENT</div>
              <div style={{ height: 6, borderRadius: 4, background: 'var(--divider)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 4,
                  width: `${Math.min((daysSitting / 30) * 100, 100)}%`,
                  background: daysSitting >= 29 ? DANGER : daysSitting >= 15 ? WARNING : SUCCESS,
                  transition: 'width 300ms',
                }} />
              </div>
              <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{daysSitting}d sitting · {daysSitting >= 29 ? 'Critical' : daysSitting >= 15 ? 'Aging' : 'Healthy'}</div>
            </div>
          </div>
        )}
      </div>
    </div>
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

const R360ProfileDrawer = memo(function R360ProfileDrawer({ resourceId, onClose }: R360ProfileDrawerProps) {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [panelStack, setPanelStack] = useState<PanelView[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);

  // Shared week computation
  const { weekStart, weekEnd, weekLabel, weekNumber } = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const daysSinceSunday = day === 0 ? 0 : day;
    const ws = new Date(now);
    ws.setDate(now.getDate() - daysSinceSunday + (weekOffset * 7));
    ws.setHours(0, 0, 0, 0);
    const we = new Date(ws);
    we.setDate(ws.getDate() + 4);
    we.setHours(23, 59, 59, 999);
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const wn = getWeekNumber(ws);
    return {
      weekStart: ws, weekEnd: we, weekNumber: wn,
      weekLabel: `W${wn} · ${fmt(ws)}–${fmt(we).split(' ')[1]}, ${we.getFullYear()}`,
    };
  }, [weekOffset]);

  const pushPanel = useCallback((view: PanelView) => {
    setPanelStack(prev => [...prev, view]);
  }, []);
  const popPanel = useCallback(() => {
    setPanelStack(prev => prev.slice(0, -1));
  }, []);
  const clearPanels = useCallback(() => {
    setPanelStack([]);
  }, []);

  const { data: resource, isLoading: resLoading, isError: resError, dataUpdatedAt: resUpdatedAt } = useR360Resource(resourceId);
  const { data: statsData, isLoading: statsLoading, dataUpdatedAt: statsUpdatedAt } = useR360WeeklyStats(resourceId, weekNumber);
  const { data: trend = [], isLoading: trendLoading } = useR360ClosureTrend(resourceId, weekNumber);
  const { data: workItems = [], isLoading: itemsLoading, dataUpdatedAt: itemsUpdatedAt } = useR360ProfileWorkItems(resourceId);

  // P2-02: Compute data freshness from most recent query update
  const [, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(iv);
  }, []);
  const latestUpdatedAt = Math.max(resUpdatedAt || 0, statsUpdatedAt || 0, itemsUpdatedAt || 0);
  const dataAge = latestUpdatedAt > 0
    ? (() => {
        const mins = Math.floor((Date.now() - latestUpdatedAt) / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        return `${hrs}h ago`;
      })()
    : '—';

  const stats = statsData?.current;
  const prevWeekClosed = statsData?.prev?.closed_this_week ?? 0;

  const liveStats = useMemo(() => {
    if (stats) return null;
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
    // Compute pickup speed from items that have moved past To Do/Backlog
    const pickedUp = workItems.filter((i: any) => {
      const cat = (i.status_category || '').toLowerCase();
      return cat !== 'new' && cat !== 'backlog' && i.created_at && i.updated_at;
    });
    let pickupSpeedHours = 0;
    if (pickedUp.length > 0) {
      const totalH = pickedUp.reduce((sum: number, i: any) => {
        const h = (new Date(i.updated_at).getTime() - new Date(i.created_at).getTime()) / 3600000;
        return sum + Math.min(Math.max(h, 0), 240);
      }, 0);
      pickupSpeedHours = Math.round(totalH / pickedUp.length);
    }
    return {
      total_open: open.length,
      closed_this_week: closedThisWeek,
      in_review: inRev.length,
      pickup_speed_hours: pickupSpeedHours,
      in_progress_concurrent: inProg.length,
      closed_of_touched: closedThisWeek,
      total_touched: open.length + closedThisWeek,
      avg_cycle_time_days: 0,
      oldest_item_age_days: oldest.age,
      oldest_item_key: oldest.key,
      closure_rate_pct: (open.length + closedThisWeek) > 0 ? Math.round((closedThisWeek / (open.length + closedThisWeek)) * 100) : 0,
    };
  }, [stats, workItems, weekStart, weekEnd]);

  const effectiveStats = stats || liveStats;

  const openCount = effectiveStats?.total_open ?? 0;
  const roleAvg = 5;
  const loadColour = computeLoadColour(openCount, roleAvg);
  const resourceName = resource?.full_name || '';
  const resourceRole = resource?.role || '';
  const deptName = resource?.department || '';
  const resourceRid = resource?.resource_key || '';

  // Work mix
  const workMix = useMemo(() => {
    const openItems = workItems.filter((i: any) => i.status_category !== 'done');
    const total = openItems.length || 1;
    const normalize = (t: string) => {
      const lower = (t || '').toLowerCase();
      if (lower === 'bug') return 'Bug';
      if (lower === 'story' || lower === 'new feature' || lower === 'improvement') return 'Story';
      if (lower === 'sub-task' || lower === 'subtask') return 'Subtask';
      if (lower === 'incident') return 'Incident';
      return t;
    };
    const counts: Record<string, number> = {};
    openItems.forEach((i: any) => { const n = normalize(i.work_item_type); counts[n] = (counts[n] || 0) + 1; });
    const roleAvgs: Record<string, number> = { Bug: 35, Story: 30, Subtask: 20, Incident: 15 };
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

  // ── Drill-down helpers ──
  const showFilteredList = useCallback((label: string, filterFn: (i: any) => boolean) => {
    const items = workItems.filter(filterFn);
    pushPanel({ type: 'list', label, items });
  }, [workItems, pushPanel]);

  const showItemDetail = useCallback((itemKey: string) => {
    pushPanel({ type: 'detail', itemKey });
  }, [pushPanel]);

  // Tab change clears panels
  const handleTabChange = useCallback((tab: TabKey) => {
    clearPanels();
    setActiveTab(tab);
  }, [clearPanels]);

  // Escape key handler (W22+W40)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (panelStack.length > 0) {
          popPanel();
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [panelStack, onClose, popPanel]);

  if (resError) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, fontFamily: "'Inter', system-ui, sans-serif" }}>
        <RefreshCw size={20} color={INK4} />
        <span style={{ fontSize: 13, color: INK2 }}>Failed to load — retry</span>
        <button onClick={onClose} style={{ fontSize: 12, color: BRAND, background: 'none', border: 'none', cursor: 'pointer' }}>Close</button>
      </div>
    );
  }

  const currentPanel = panelStack.length > 0 ? panelStack[panelStack.length - 1] : null;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'Inter', system-ui, sans-serif", position: 'relative' }}>

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
            background: BRAND, color: 'var(--bg-app)',
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
          <span style={{ fontSize: 11, color: MUTED }}>Data: {dataAge}</span>
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
              background: 'linear-gradient(135deg, var(--fg-2), var(--fg-2))',
              display: resource?.avatar_url ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--bg-app)', fontFamily: "'Sora', sans-serif", fontSize: 17, fontWeight: 700,
            }}>
              {getInitials(resourceName || '?')}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 18, fontWeight: 700, color: INK1 }}>{resourceName || '—'}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: INK4, flexWrap: 'wrap', marginTop: 2 }}>
                <span>{resourceRole || '—'}</span>
                {deptName && <><span>·</span><span>{deptName}</span></>}
                {resourceRid && <><span>·</span><span style={{
                  background: 'var(--cp-blue-wash)', border: '1px solid #DBEAFE', borderRadius: 4,
                  padding: '2px 7px', fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11, fontWeight: 700, color: BRAND,
                }}>{resourceRid}</span></>}
              </div>
              {/* P2-05: Skills chips */}
              {resource?.skills && (resource.skills as string[]).length > 0 && (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                  {(resource.skills as string[]).map((skill: string) => (
                    <span key={skill} style={{
                      fontSize: 11, fontWeight: 500,
                      background: 'var(--bg-3)', color: 'var(--fg-2)',
                      border: '0.75px solid var(--divider)',
                      borderRadius: 4, padding: '2px 6px',
                    }}>
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ━━ C. TABS ━━ */}
      <div style={{ flexShrink: 0, borderBottom: `1px solid ${BORDER}`, padding: '0 16px', display: 'flex' }}>
        {TABS.map(t => {
          const isActive = activeTab === t.key;
          return (
            <button key={t.key} onClick={() => handleTabChange(t.key)} style={{
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
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', position: 'relative' }}>
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
            onTabSwitch={handleTabChange}
            workItems={workItems}
            showFilteredList={showFilteredList}
            showItemDetail={showItemDetail}
            weekLabel={weekLabel}
            weekStart={weekStart}
            weekEnd={weekEnd}
            weekOffset={weekOffset}
            setWeekOffset={setWeekOffset}
          />
        )}
        {activeTab === 'behavioural' && (
          <BehaviouralTab workItems={workItems} showFilteredList={showFilteredList} weekStart={weekStart} weekEnd={weekEnd} weekLabel={weekLabel} />
        )}
        {activeTab === 'weekly' && (
          <WeeklyStoryTab workItems={workItems} openCount={openCount} showFilteredList={showFilteredList} weekStart={weekStart} weekEnd={weekEnd} weekLabel={weekLabel} />
        )}
        {activeTab === 'items' && (
          <WorkItemsTab workItems={workItems} weekStart={weekStart} weekEnd={weekEnd} weekLabel={weekLabel} weekOffset={weekOffset} setWeekOffset={setWeekOffset} />
        )}

        {/* ━━ STACKED DETAIL PANEL ━━ */}
        <div style={{
          position: 'absolute', top: 0, right: 0, width: '100%', height: '100%',
          background: 'var(--bg-app)', zIndex: 10,
          transform: currentPanel ? 'translateX(0%)' : 'translateX(100%)',
          transition: currentPanel ? 'transform 200ms ease-out' : 'transform 150ms ease-in',
          pointerEvents: currentPanel ? 'auto' : 'none',
        }}>
          {currentPanel?.type === 'list' && (
            <FilteredListPanel
              label={currentPanel.label}
              items={currentPanel.items}
              onBack={popPanel}
              onItemClick={(item) => showItemDetail(item.item_key)}
            />
          )}
          {currentPanel?.type === 'detail' && (
            <ItemDetailPanel
              itemKey={currentPanel.itemKey}
              onBack={popPanel}
              backLabel={panelStack.length > 1 ? 'Back' : `Back to ${resourceName}`}
            />
          )}
        </div>
      </div>
    </div>
  );
});

// ══════════════════════════════════════════
// OVERVIEW TAB
// ══════════════════════════════════════════
function OverviewTab({
  stats, statsLoading, prevWeekClosed, openCount, roleAvg, loadColour,
  trend, trendLoading, workMix, hubBreakdown, hubSummary, totalOpenAcrossHubs,
  onTabSwitch, workItems, showFilteredList, showItemDetail,
  weekLabel, weekStart, weekEnd, weekOffset, setWeekOffset,
}: {
  stats: any; statsLoading: boolean; prevWeekClosed: number;
  openCount: number; roleAvg: number; loadColour: string;
  trend: any[]; trendLoading: boolean;
  workMix: { type: string; count: number; pct: number; roleAvgPct: number }[];
  hubBreakdown: { hub: string; code: string; isIncident: boolean; open: number; closed: number; total: number; closurePct: number }[];
  hubSummary: { total: number; inProgress: number; toDo: number; blocked: number };
  totalOpenAcrossHubs: number;
  onTabSwitch: (t: TabKey) => void;
  workItems: any[];
  showFilteredList: (label: string, filterFn: (i: any) => boolean) => void;
  showItemDetail: (itemKey: string) => void;
  weekLabel: string;
  weekStart: Date;
  weekEnd: Date;
  weekOffset: number;
  setWeekOffset: React.Dispatch<React.SetStateAction<number>>;
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

  const trendMax = Math.max(...trend.map(t => t.closedCount), 1);
  const trendPrev4Avg = trend.length > 4 ? trend.slice(-5, -1).reduce((s: number, t: any) => s + t.closedCount, 0) / 4 : 0;
  const trendCurrent = trend.length > 0 ? trend[trend.length - 1]?.closedCount : 0;
  const trendChangePct = trendPrev4Avg > 0 ? Math.round(((trendCurrent - trendPrev4Avg) / trendPrev4Avg) * 100) : 0;

  const bugRow = workMix.find(w => w.type === 'Bug');
  const showBugInsight = bugRow && bugRow.pct > bugRow.roleAvgPct;

  // Clickable tile style
  const clickableTileHover = (e: React.MouseEvent, entering: boolean) => {
    (e.currentTarget as HTMLElement).style.background = entering ? 'rgba(37,99,235,0.04)' : 'var(--bg-app)';
  };

  // Clickable row style
  const clickableRowHover = (e: React.MouseEvent, entering: boolean) => {
    (e.currentTarget as HTMLElement).style.background = entering ? 'rgba(0,0,0,0.03)' : 'transparent';
  };

  // Normalize type for filtering
  const normalizeType = (t: string) => {
    const lower = (t || '').toLowerCase();
    if (lower === 'bug') return 'Bug';
    if (lower === 'story' || lower === 'new feature' || lower === 'improvement') return 'Story';
    if (lower === 'sub-task' || lower === 'subtask') return 'Subtask';
    if (lower === 'incident') return 'Incident';
    return t;
  };

  return (
    <>
      {/* §1 — KPI Stats Bar */}
      <div style={{ padding: 16, borderBottom: `1px solid ${BORDER_LIGHT}` }}>
        {/* Week Navigator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <SectionTitle>THIS WEEK</SectionTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => setWeekOffset(o => Math.max(o - 1, -52))}
              disabled={weekOffset <= -52}
              style={{ width: 26, height: 26, border: 'none', background: 'transparent', cursor: weekOffset <= -52 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, opacity: weekOffset <= -52 ? 0.3 : 1 }}
              onMouseEnter={e => { if (weekOffset > -52) e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <ChevronLeft size={16} color={INK4} />
            </button>
            <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: INK2, whiteSpace: 'nowrap' as const }}>{weekLabel}</span>
            <button
              onClick={() => setWeekOffset(o => Math.min(o + 1, 0))}
              disabled={weekOffset >= 0}
              style={{ width: 26, height: 26, border: 'none', background: 'transparent', cursor: weekOffset >= 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, opacity: weekOffset >= 0 ? 0.3 : 1 }}
              onMouseEnter={e => { if (weekOffset < 0) e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <ChevronRight size={16} color={INK4} />
            </button>
          </div>
        </div>
        {statsLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: BORDER, border: `1px solid ${BORDER}`, borderRadius: 6, overflow: 'hidden' }}>
            {[1,2,3,4].map(i => <div key={i} style={{ background: 'var(--bg-app)', padding: '12px 14px' }}><Skeleton h={28} w="40%" /><Skeleton h={12} w="60%" /></div>)}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: BORDER, border: `1px solid ${BORDER}`, borderRadius: 6, overflow: 'hidden' }}>
            {/* Total Open — CLICKABLE */}
            <div
              onClick={() => showFilteredList('Total Open', (i: any) => i.status_category !== 'done')}
              style={{ background: 'var(--bg-app)', padding: '12px 14px', cursor: 'pointer', transition: 'background 120ms' }}
              onMouseEnter={e => clickableTileHover(e, true)}
              onMouseLeave={e => clickableTileHover(e, false)}
            >
              <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 28, fontWeight: 650, color: loadColour }}>{openCount}</div>
              <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: MUTED, marginTop: 2 }}>TOTAL OPEN</div>
              <div style={{ fontSize: 11, fontWeight: 400, color: INK4, marginTop: 2 }}>vs role avg {roleAvg}</div>
            </div>
            {/* Closed This Week — CLICKABLE */}
            <div
              onClick={() => showFilteredList('Closed This Week', (i: any) => {
                if ((i.status_category || '').toLowerCase() !== 'done') return false;
                const u = new Date(i.updated_at);
                return u >= weekStart && u <= weekEnd;
              })}
              style={{ background: 'var(--bg-app)', padding: '12px 14px', cursor: 'pointer', transition: 'background 120ms' }}
              onMouseEnter={e => clickableTileHover(e, true)}
              onMouseLeave={e => clickableTileHover(e, false)}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 28, fontWeight: 650, color: closedColour }}>{closedThisWeek}</span>
                {closedTrend && <span style={{ fontSize: 14, fontWeight: 700, color: closedTrendColor }}>{closedTrend}</span>}
              </div>
              <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: MUTED, marginTop: 2 }}>CLOSED THIS WEEK</div>
              <div style={{ fontSize: 11, fontWeight: 400, color: INK4, marginTop: 2 }}>vs {prevWeekClosed} last week</div>
            </div>
            {/* In Review — CLICKABLE */}
            <div
              onClick={() => showFilteredList('In Review', (i: any) => (i.status_category || '').toLowerCase() === 'in_review')}
              style={{ background: 'var(--bg-app)', padding: '12px 14px', cursor: 'pointer', transition: 'background 120ms' }}
              onMouseEnter={e => clickableTileHover(e, true)}
              onMouseLeave={e => clickableTileHover(e, false)}
            >
              <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 28, fontWeight: 650, color: INK1 }}>{inReview}</div>
              <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: MUTED, marginTop: 2 }}>IN REVIEW</div>
              <div style={{ fontSize: 11, fontWeight: 400, color: INK4, marginTop: 2 }}>{inReview === 0 ? 'None pending' : `${inReview} awaiting`}</div>
            </div>
            {/* Pickup Speed — color-coded */}
            <div style={{ background: 'var(--bg-app)', padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                {pickupHours > 0 ? (
                  <>
                    <span style={{
                      fontFamily: "'Sora', sans-serif", fontSize: 28, fontWeight: 650,
                      color: pickupHours > 38 ? DANGER : SUCCESS,
                    }}>
                      {pickupHours < 24 ? pickupHours : Math.round(pickupHours / 24)}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 500, color: INK4 }}>
                      {pickupHours < 24 ? 'h' : 'd'}
                    </span>
                  </>
                ) : (
                  <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 28, fontWeight: 650, color: MUTED }}>—</span>
                )}
              </div>
              <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: MUTED, marginTop: 2 }}>PICKUP SPEED</div>
              <div style={{ fontSize: 11, fontWeight: 400, color: INK4, marginTop: 2 }}>team avg 38h</div>
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
            <circle cx={55} cy={55} r={44} fill="none" stroke="var(--divider)" strokeWidth={9} />
            <circle cx={55} cy={55} r={44} fill="none" stroke="#CBD5E1" strokeWidth={2}
              strokeDasharray="125 151" strokeDashoffset={-69} opacity={0.7} />
            <circle cx={55} cy={55} r={44} fill="none" stroke={loadColour} strokeWidth={9}
              strokeDasharray={`${Math.min((openCount / 11) * 276.5, 276.5)} ${276.5 - Math.min((openCount / 11) * 276.5, 276.5)}`}
              strokeDashoffset={-69} strokeLinecap="round" />
            <text x={55} y={52} textAnchor="middle" fontFamily="'Sora', sans-serif" fontSize={22} fontWeight={700} fill={loadColour}>{openCount}</text>
            <text x={55} y={67} textAnchor="middle" fontFamily="'Inter', sans-serif" fontSize={11} fontWeight={700} fill={MUTED}>OPEN</text>
            <text x={55} y={82} textAnchor="middle" fontFamily="'Inter', sans-serif" fontSize={11} fill="#CBD5E1">avg {roleAvg}</text>
          </svg>

          {/* Stat rows — CLICKABLE */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* In progress row */}
            <div
              onClick={() => showFilteredList('In Progress', (i: any) => (i.status_category || '').toLowerCase() === 'in_progress')}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 10px', border: `1px solid ${BORDER}`, borderRadius: 4,
                boxShadow: '0 1px 2px rgba(15,23,42,0.06)', cursor: 'pointer', transition: 'background 120ms',
              }}
              onMouseEnter={e => clickableRowHover(e, true)}
              onMouseLeave={e => clickableRowHover(e, false)}
            >
              <span style={{ fontSize: 12, color: INK2 }}>In progress right now</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: concurrentColour, fontFamily: "'JetBrains Mono', monospace" }}>{concurrent} concurrent</span>
            </div>
            {/* Closed this week row */}
            <div
              onClick={() => showFilteredList('Closed This Week', (i: any) => {
                if ((i.status_category || '').toLowerCase() !== 'done') return false;
                const u = new Date(i.updated_at);
                return u >= weekStart && u <= weekEnd;
              })}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 10px', border: `1px solid ${BORDER}`, borderRadius: 4,
                boxShadow: '0 1px 2px rgba(15,23,42,0.06)', cursor: 'pointer', transition: 'background 120ms',
              }}
              onMouseEnter={e => clickableRowHover(e, true)}
              onMouseLeave={e => clickableRowHover(e, false)}
            >
              <span style={{ fontSize: 12, color: INK2 }}>Closed this week</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: INK1, fontFamily: "'JetBrains Mono', monospace" }}>{closedOfTouched} of {totalTouched} touched</span>
            </div>
            {/* Avg cycle time row — not clickable */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 10px', border: `1px solid ${BORDER}`, borderRadius: 4,
              boxShadow: '0 1px 2px rgba(15,23,42,0.06)',
            }}>
              <span style={{ fontSize: 12, color: INK2 }}>Avg cycle time</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: (avgDays === 0 || avgDays == null) ? MUTED : cycleColour, fontFamily: "'JetBrains Mono', monospace" }}>{(avgDays === 0 || avgDays == null) ? '—' : `${avgDays}d per item`}</span>
            </div>
            {/* Oldest open item — SINGLE ITEM CLICK */}
            <div
              onClick={() => { if (oldestKey && oldestKey !== '—') showItemDetail(oldestKey); }}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 10px', border: `1px solid ${BORDER}`, borderRadius: 4,
                boxShadow: '0 1px 2px rgba(15,23,42,0.06)',
                cursor: oldestKey !== '—' ? 'pointer' : 'default', transition: 'background 120ms',
              }}
              onMouseEnter={e => { if (oldestKey !== '—') clickableRowHover(e, true); }}
              onMouseLeave={e => { if (oldestKey !== '—') clickableRowHover(e, false); }}
            >
              <span style={{ fontSize: 12, color: INK2 }}>Oldest open item</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: oldestColour, fontFamily: "'JetBrains Mono', monospace" }}>{oldestAgeDays}d · {oldestKey}</span>
            </div>
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
              <path d={
                `M${trend.map((t, i) => `${i * 80 + 40},${62 - (t.closedCount / trendMax) * 50}`).join(' L')} L${(trend.length - 1) * 80 + 40},62 L40,62 Z`
              } fill="url(#trendGrad)" />
              <polyline
                points={trend.map((t, i) => `${i * 80 + 40},${62 - (t.closedCount / trendMax) * 50}`).join(' ')}
                fill="none" stroke={SUCCESS} strokeWidth={1.5}
              />
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

      {/* §4 — Work Mix — CLICKABLE ROWS */}
      <div style={{ padding: 16, borderBottom: `1px solid ${BORDER_LIGHT}` }}>
        <SectionTitle>WORK MIX</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {workMix.map(row => {
            const tc = TYPE_COLORS[row.type] || { color: '#94A3B8', opacity: 0.6 };
            return (
              <div
                key={row.type}
                onClick={() => showFilteredList(row.type, (i: any) => {
                  const norm = normalizeType(i.work_item_type);
                  return norm === row.type && i.status_category !== 'done';
                })}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  cursor: 'pointer', padding: '4px 0', borderRadius: 4, transition: 'background 120ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <JiraIssueTypeIcon type={row.type} size={16} />
                <span style={{ fontSize: 12, color: INK2, width: 72, flexShrink: 0 }}>{row.type}</span>
                <div style={{ flex: 1, height: 18, background: 'var(--divider)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 4,
                    width: `${row.pct}%`,
                    background: row.pct > 0 ? 'var(--sem-success)' : 'transparent',
                    transition: 'width 300ms ease',
                  }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 650, fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: 'tabular-nums', color: INK2, width: 28, textAlign: 'right' as const }}>{row.count}</span>
              </div>
            );
          })}
        </div>
        {showBugInsight && (
          <div style={{
            marginTop: 10, background: 'var(--cp-blue-wash)', border: '1px solid #DBEAFE', borderRadius: 4,
            padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Info size={14} color={BRAND} />
            <span style={{ fontSize: 11, color: BRAND }}>Bug ratio ({bugRow!.pct}%) exceeds role average ({bugRow!.roleAvgPct}%)</span>
          </div>
        )}
      </div>

      {/* §5 — Weekly Story Card — LABEL FIX: use INK4 not BRAND */}
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
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-app)'; }}
        >
          <div style={{
            width: 32, height: 32, flexShrink: 0, background: 'var(--cp-blue-wash)', border: '1px solid #DBEAFE',
            borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BookOpen size={16} color={INK4} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: INK4 }}>Weekly Story · {weekLabel}</div>
            <div style={{ fontSize: 13, fontWeight: 500, fontStyle: 'italic', color: INK1, marginTop: 2 }}>
              &ldquo;Focus on incident resolution and QA throughput&rdquo;
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--fg-3)' }} />
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#CBD5E1' }} />
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#CBD5E1' }} />
            </div>
          </div>
          <ChevronRight size={14} color={INK4} />
        </div>
      </div>

      {/* §6 — Hub Breakdown */}
      <div style={{ padding: 16, borderBottom: `1px solid ${BORDER_LIGHT}` }}>
        <SectionTitle>HUB BREAKDOWN</SectionTitle>
        {/* Summary grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: BORDER, border: `1px solid ${BORDER}`, borderRadius: 6, overflow: 'hidden', marginBottom: 12 }}>
          {[
            { label: 'Total Backlog', value: hubSummary.total, color: INK1, onClick: () => showFilteredList('Backlog Items', (i: any) => i.status_category !== 'done') },
            { label: 'In Progress', value: hubSummary.inProgress, color: INK1, onClick: () => showFilteredList('In Progress Items', (i: any) => i.status_category === 'in_progress') },
            { label: 'To Do', value: hubSummary.toDo, color: INK1, onClick: () => showFilteredList('To Do Items', (i: any) => i.status_category !== 'done' && i.status_category !== 'in_progress' && i.status_category !== 'blocked') },
            { label: 'Blocked', value: hubSummary.blocked, color: hubSummary.blocked > 0 ? DANGER : INK1, onClick: () => showFilteredList('Blocked Items', (i: any) => i.status_category === 'blocked') },
          ].map((tile, i) => (
            <div key={i}
              onClick={tile.onClick}
              style={{ background: 'var(--bg-app)', padding: '10px 12px', cursor: 'pointer', transition: 'background 120ms' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-app)'; }}
            >
              <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 28, fontWeight: 650, color: tile.color }}>{tile.value}</div>
              <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: MUTED, marginTop: 2 }}>{tile.label}</div>
            </div>
          ))}
        </div>

        {/* Per-hub cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {hubBreakdown.map((hub, i) => (
            <div key={i}
              onClick={() => showFilteredList(`${hub.hub === 'incident' ? 'IncidentHub' : hub.hub === 'bau' || hub.hub === 'BAU' ? 'BAU' : hub.hub} Items`, (item: any) => {
                const itemHub = item.source_hub || 'BAU';
                return itemHub === hub.hub;
              })}
              style={{
                border: `1px solid ${BORDER}`, borderRadius: 6, padding: '10px 14px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer', transition: 'background 150ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  backgroundColor: hub.isIncident ? DANGER : 'var(--sem-success)',
                }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: INK1 }}>
                  {hub.hub === 'incident' ? 'IncidentHub' : hub.hub === 'bau' || hub.hub === 'BAU' ? 'BAU / ProjectHub' : hub.hub}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: 11, color: INK4 }}>{hub.open} open</span>
                <span style={{ fontSize: 11, color: INK4 }}>{hub.closed} closed</span>
                <span style={{
                  fontSize: 11, fontWeight: 650, fontFamily: "'JetBrains Mono', monospace",
                  color: hub.closurePct >= 50 ? SUCCESS : hub.closurePct > 0 ? WARNING : MUTED,
                }}>{hub.closurePct}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════
// BEHAVIOURAL PATTERNS TAB
// ══════════════════════════════════════════
const WORK_DAYS = [0, 1, 2, 3, 4]; // Sun=0..Thu=4
const DAY_ABBRS = ['Su', 'Mo', 'Tu', 'We', 'Th'];

function BehaviouralTab({ workItems, showFilteredList, weekStart, weekEnd, weekLabel }: { workItems: any[]; showFilteredList: (label: string, filterFn: (i: any) => boolean) => void; weekStart: Date; weekEnd: Date; weekLabel: string }) {
  // §1 Work Rhythm DNA
  const rhythmData = useMemo(() => {
    const counts: Record<number, number> = { 0:0, 1:0, 2:0, 3:0, 4:0 };
    workItems.forEach((i: any) => {
      const sc = (i.status_category || '').toLowerCase();
      if (!['in_progress', 'done'].includes(sc)) return;
      const d = new Date(i.updated_at).getDay();
      if (d >= 0 && d <= 4) counts[d]++;
    });
    const max = Math.max(...Object.values(counts), 1);
    return { counts, max };
  }, [workItems]);

  // §2 Pickup Intelligence
  const pickupStats = useMemo(() => {
    let totalPickupMs = 0, pickupCount = 0, sameDayCount = 0;
    workItems.forEach((i: any) => {
      if (!i.created_at || !i.updated_at) return;
      const sc = (i.status_category || '').toLowerCase();
      if (!['in_progress', 'in_review', 'done'].includes(sc)) return;
      const created = new Date(i.created_at);
      const updated = new Date(i.updated_at);
      const diff = updated.getTime() - created.getTime();
      if (diff > 0) { totalPickupMs += diff; pickupCount++; }
      if (created.toDateString() === updated.toDateString()) sameDayCount++;
    });
    const avgPickup = pickupCount > 0 ? (totalPickupMs / pickupCount) / 3600000 : null;
    const teamAvg = 38;
    let vsTeam: { label: string; color: string } = { label: 'On par', color: SLATE };
    if (avgPickup !== null) {
      const diff = avgPickup - teamAvg;
      if (diff > 2) vsTeam = { label: `+${Math.round(diff)}h slower`, color: DANGER };
      else if (diff < -2) vsTeam = { label: `−${Math.round(Math.abs(diff))}h faster`, color: SUCCESS };
    }
    return {
      avgPickup,
      avgPickupLabel: avgPickup === null ? '—' : avgPickup < 24 ? `${Math.round(avgPickup)}h` : `${Math.round(avgPickup / 24)}d`,
      sameDayCount,
      vsTeam,
    };
  }, [workItems]);

  // §3 Execution Style
  const execStyle = useMemo(() => {
    const closed = workItems.filter((i: any) => (i.status_category || '').toLowerCase() === 'done');
    const total = workItems.length;
    const inProg = workItems.filter((i: any) => (i.status_category || '').toLowerCase() === 'in_progress');
    const completionRate = total > 0 ? Math.round((closed.length / total) * 100) : 0;
    let totalCycleDays = 0, cycleCount = 0;
    closed.forEach((i: any) => {
      if (i.created_at && i.updated_at) {
        const days = (new Date(i.updated_at).getTime() - new Date(i.created_at).getTime()) / 86400000;
        if (days > 0) { totalCycleDays += days; cycleCount++; }
      }
    });
    const avgCycle = cycleCount > 0 ? totalCycleDays / cycleCount : null;
    const avgCycleLabel = avgCycle === null ? '—' : `${Math.floor(avgCycle)}d ${Math.round((avgCycle % 1) * 24)}h`;
    return {
      avgCycleLabel,
      itemsClosed: closed.length,
      concurrentAvg: inProg.length,
      completionRate: `${completionRate}%`,
    };
  }, [workItems]);

  // §4 Hub Breakdown — segmented bar
  const HUB_COLORS: Record<string, string> = {
    BAU: '#0D9488', bau: '#0D9488', incident: DANGER, Product: '#3F3F46', Task: '#D4D4D8',
  };
  const hubSegments = useMemo(() => {
    const counts: Record<string, number> = {};
    workItems.forEach((i: any) => {
      const hub = i.source_hub || 'BAU';
      counts[hub] = (counts[hub] || 0) + 1;
    });
    const total = workItems.length || 1;
    return Object.entries(counts).map(([hub, count]) => ({
      hub, count, pct: (count / total) * 100,
      color: HUB_COLORS[hub] || MUTED,
    }));
  }, [workItems]);

  const hasActivity = rhythmData.counts[0] > 0 || rhythmData.counts[1] > 0 || rhythmData.counts[2] > 0 || rhythmData.counts[3] > 0 || rhythmData.counts[4] > 0;

  return (
    <>
      {/* §1 Work Rhythm DNA */}
      <div style={{ padding: 16, borderBottom: `1px solid ${BORDER_LIGHT}` }}>
        <SectionTitle>WORK RHYTHM DNA</SectionTitle>
        {!hasActivity ? (
          <div style={{ fontSize: 13, color: MUTED, padding: '20px 0', textAlign: 'center' as const }}>No activity data yet</div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
            {WORK_DAYS.map((d, idx) => {
              const val = rhythmData.counts[d];
              const barH = Math.max((val / rhythmData.max) * 90, 2);
              const isPeak = val === rhythmData.max && val > 0;
              return (
                <div key={d} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: isPeak ? 12 : 12, fontWeight: isPeak ? 600 : 400, fontFamily: "'JetBrains Mono', monospace", color: isPeak ? '#1D4ED8' : '#374151' }}>{val}</span>
                  <div style={{
                    width: '100%', maxWidth: 40, height: barH, borderRadius: 4,
                    backgroundColor: isPeak ? '#1D4ED8' : 'var(--cp-blue)',
                    transition: 'height 300ms ease, background-color 0ms',
                  }} />
                  <span style={{ fontSize: 11, color: INK4, fontWeight: 500 }}>{DAY_ABBRS[idx]}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* §2 Pickup Intelligence */}
      <div style={{ padding: 16, borderBottom: `1px solid ${BORDER_LIGHT}` }}>
        <SectionTitle>PICKUP INTELLIGENCE</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { label: 'Avg Pickup Time', value: pickupStats.avgPickupLabel, sub: 'time to first touch',
              onClick: () => showFilteredList('Pickup Time Detail', (i: any) => ['in_progress','in_review','done'].includes((i.status_category||'').toLowerCase())) },
            { label: 'Same-Day Pickups', value: String(pickupStats.sameDayCount), sub: 'picked up day of creation',
              onClick: () => showFilteredList('Same-Day Pickups', (i: any) => {
                if (!i.created_at || !i.updated_at) return false;
                return new Date(i.created_at).toDateString() === new Date(i.updated_at).toDateString() && ['in_progress','in_review','done'].includes((i.status_category||'').toLowerCase());
              }) },
            { label: 'Avg vs Team', value: pickupStats.vsTeam.label, sub: 'vs team benchmark', valueColor: pickupStats.vsTeam.color, onClick: undefined },
          ].map((tile, i) => (
            <div key={i}
              onClick={tile.onClick}
              style={{
                border: '1px solid var(--divider)', borderRadius: 8, padding: '12px 14px', background: 'var(--bg-app)',
                cursor: tile.onClick ? 'pointer' : 'default', transition: 'background 150ms',
              }}
              onMouseEnter={e => { if (tile.onClick) e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; }}
              onMouseLeave={e => { if (tile.onClick) e.currentTarget.style.background = '#FFFFFF'; }}
            >
              <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: MUTED, marginBottom: 6 }}>{tile.label}</div>
              <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 28, fontWeight: 650, color: (tile as any).valueColor || INK1 }}>{tile.value}</div>
              <div style={{ fontSize: 11, fontWeight: 400, color: INK4, marginTop: 4 }}>{tile.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* §3 Execution Style */}
      <div style={{ padding: 16, borderBottom: `1px solid ${BORDER_LIGHT}` }}>
        <SectionTitle>EXECUTION STYLE</SectionTitle>
        <div style={{ border: '1px solid var(--divider)', borderRadius: 8, overflow: 'hidden' }}>
          {[
            { label: 'Avg cycle time', value: execStyle.avgCycleLabel, onClick: undefined as (() => void) | undefined },
            { label: 'Items closed', value: String(execStyle.itemsClosed), onClick: () => showFilteredList('All Closed Items', (i: any) => (i.status_category || '').toLowerCase() === 'done') },
            { label: 'Concurrent avg', value: String(execStyle.concurrentAvg), onClick: undefined as (() => void) | undefined },
            { label: 'Completion rate', value: execStyle.completionRate, onClick: undefined as (() => void) | undefined },
          ].map((row, i, arr) => (
            <div key={i}
              onClick={row.onClick}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                height: 50, padding: '0 14px',
                borderBottom: i < arr.length - 1 ? '0.75px solid var(--divider)' : 'none',
                cursor: row.onClick ? 'pointer' : 'default', transition: 'background 150ms',
              }}
              onMouseEnter={e => { if (row.onClick) e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; }}
              onMouseLeave={e => { if (row.onClick) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ fontSize: 12, color: INK2 }}>{row.label}</span>
              <span style={{ fontSize: 12, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: INK1 }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* §4 Hub Breakdown */}
      <div style={{ padding: 16 }}>
        <SectionTitle>HUB BREAKDOWN</SectionTitle>
        <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: 'var(--bg-3)' }}>
          {hubSegments.map((s, i) => (
            <div key={i} style={{ width: `${s.pct}%`, height: 8, borderRadius: 4, backgroundColor: s.color, transition: 'width 300ms' }} />
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 10 }}>
          {hubSegments.map((s, i) => (
            <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: s.color, display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: INK2 }}>{s.hub === 'incident' ? 'IncidentHub' : s.hub === 'bau' || s.hub === 'BAU' ? 'BAU' : s.hub}</span>
              <span style={{ fontSize: 12, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: INK1 }}>{s.count}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════
// WEEKLY STORY TAB
// ══════════════════════════════════════════
function WeeklyStoryTab({ workItems, openCount, showFilteredList, weekStart, weekEnd, weekLabel }: {
  workItems: any[]; openCount: number;
  showFilteredList: (label: string, filterFn: (i: any) => boolean) => void;
  weekStart: Date; weekEnd: Date; weekLabel: string;
}) {

  const closedThisWeek = useMemo(() =>
    workItems.filter((i: any) => {
      if ((i.status_category || '').toLowerCase() !== 'done') return false;
      const u = new Date(i.updated_at);
      return u >= weekStart && u <= weekEnd;
    }).length
  , [workItems, weekStart, weekEnd]);

  const oldestDays = useMemo(() => {
    const open = workItems.filter((i: any) => (i.status_category || '').toLowerCase() !== 'done');
    if (open.length === 0) return 0;
    const now = Date.now();
    return open.reduce((max: number, i: any) => {
      const age = Math.floor((now - new Date(i.created_at).getTime()) / 86400000);
      return age > max ? age : max;
    }, 0);
  }, [workItems]);

  const headline = useMemo(() => {
    if (closedThisWeek === 0 && openCount === 0) return 'Quiet week — no active items.';
    if (closedThisWeek === 0 && openCount > 0) return `Carrying ${openCount} open items into this week, none closed yet.`;
    if (closedThisWeek > 0 && openCount === 0) return `Strong week — closed ${closedThisWeek} item(s) with nothing outstanding.`;
    return `Closed ${closedThisWeek} this week, ${openCount} still open. Oldest: ${oldestDays}d.`;
  }, [closedThisWeek, openCount, oldestDays]);

  const timelineItems = useMemo(() =>
    workItems
      .filter((i: any) => {
        const u = new Date(i.updated_at);
        return u >= weekStart && u <= weekEnd;
      })
      .sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 10)
  , [workItems, weekStart, weekEnd]);

  const createdThisWeek = useMemo(() =>
    workItems.filter((i: any) => {
      const c = new Date(i.created_at);
      return c >= weekStart && c <= weekEnd;
    }).length
  , [workItems, weekStart, weekEnd]);

  const updatedOnly = useMemo(() => {
    return workItems.filter((i: any) => {
      const u = new Date(i.updated_at);
      const c = new Date(i.created_at);
      const inWeek = u >= weekStart && u <= weekEnd;
      const createdInWeek = c >= weekStart && c <= weekEnd;
      return inWeek && !createdInWeek;
    }).length;
  }, [workItems, weekStart, weekEnd]);

  const relativeTime = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return '1d ago';
    return `${diff}d ago`;
  };

  return (
    <>
      {/* §1 Week Headline */}
      <div style={{ padding: 16, borderBottom: `1px solid ${BORDER_LIGHT}` }}>
        <div style={{
          border: '1px solid var(--divider)', borderRadius: 8, padding: 16, background: 'var(--bg-app)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: INK4, marginBottom: 8 }}>
            {weekLabel}
          </div>
          <div style={{ fontSize: 14, color: INK2, lineHeight: 1.5 }}>{headline}</div>
        </div>
      </div>

      {/* §2 Timeline */}
      <div style={{ padding: 16, borderBottom: `1px solid ${BORDER_LIGHT}` }}>
        <SectionTitle>THIS WEEK'S ACTIVITY</SectionTitle>
        {timelineItems.length === 0 ? (
          <div style={{
            border: '1px solid var(--divider)', borderRadius: 8, padding: '24px 16px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, background: 'var(--bg-app)',
          }}>
            <CalendarX size={20} color={MUTED} />
            <span style={{ fontSize: 13, color: INK4 }}>No activity recorded this week</span>
            <span style={{ fontSize: 12, color: MUTED }}>Items will appear as work progresses</span>
          </div>
        ) : (
          <div style={{ border: '1px solid var(--divider)', borderRadius: 8, overflow: 'hidden' }}>
            {timelineItems.map((item: any, idx: number) => (
              <div key={item.id || idx} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                minHeight: 50,
                borderBottom: idx < timelineItems.length - 1 ? '0.75px solid var(--divider)' : 'none',
              }}>
                <JiraIssueTypeIcon type={item.work_item_type || 'Task'} size={16} />
                <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: INK4, flexShrink: 0 }}>{item.item_key}</span>
                <span style={{
                  flex: 1, fontSize: 13, color: INK2, overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
                }}>{item.title}</span>
                <R360StatusLozenge status={item.status || item.status_category || 'To Do'} />
                <span style={{ fontSize: 11, color: MUTED, flexShrink: 0 }}>{relativeTime(item.updated_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* §3 Week Summary Tiles */}
      <div style={{ padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { label: 'Opened', value: createdThisWeek, onClick: () => showFilteredList('Opened This Week', (i: any) => {
              const c = new Date(i.created_at);
              return c >= weekStart && c <= weekEnd;
            }) },
            { label: 'Updated', value: updatedOnly, onClick: () => showFilteredList('Updated This Week', (i: any) => {
              const u = new Date(i.updated_at);
              const c = new Date(i.created_at);
              return u >= weekStart && u <= weekEnd && !(c >= weekStart && c <= weekEnd);
            }) },
            { label: 'Closed', value: closedThisWeek, onClick: () => showFilteredList('Closed This Week', (i: any) => {
              if ((i.status_category || '').toLowerCase() !== 'done') return false;
              const u = new Date(i.updated_at);
              return u >= weekStart && u <= weekEnd;
            }) },
          ].map((tile, i) => (
            <div key={i}
              onClick={tile.onClick}
              style={{
                border: '1px solid var(--divider)', borderRadius: 8, padding: '12px 14px', background: 'var(--bg-app)',
                cursor: 'pointer', transition: 'background 150ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-app)'; }}
            >
              <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 28, fontWeight: 650, color: INK1 }}>{tile.value}</div>
              <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: MUTED, marginTop: 4 }}>{tile.label}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════
// WORK ITEMS TAB
// ══════════════════════════════════════════
function WorkItemsTab({ workItems, weekStart, weekEnd, weekLabel, weekOffset, setWeekOffset }: {
  workItems: any[];
  weekStart: Date; weekEnd: Date; weekLabel: string;
  weekOffset: number;
  setWeekOffset: React.Dispatch<React.SetStateAction<number>>;
}) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const filtered = useMemo(() => {
    return workItems
      .filter((i: any) => {
        const u = new Date(i.updated_at);
        if (u < weekStart || u > weekEnd) return false;
        if (statusFilter !== 'all' && i.status_category !== statusFilter) return false;
        if (typeFilter !== 'all') {
          const t = (i.work_item_type || '').toLowerCase().replace(/[_\s-]/g, '');
          const f = typeFilter.toLowerCase().replace(/[_\s-]/g, '');
          if (t !== f) return false;
        }
        return true;
      })
      .sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [workItems, weekStart, weekEnd, statusFilter, typeFilter]);

  const display = filtered.slice(0, 50);
  const totalCount = filtered.length;

  const relTime = (ds: string) => {
    const d = Math.floor((Date.now() - new Date(ds).getTime()) / 86400000);
    if (d === 0) return 'Today';
    if (d === 1) return '1d ago';
    return `${d}d ago`;
  };

  return (
    <>
      {/* Toolbar */}
      <div style={{
        height: 40, flexShrink: 0, borderBottom: '0.75px solid var(--divider)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px', gap: 8,
      }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger style={{ height: 32, fontSize: 13, minWidth: 120 }}>
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="backlog">Backlog</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger style={{ height: 32, fontSize: 13, minWidth: 100 }}>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Bug">Bug</SelectItem>
              <SelectItem value="Story">Story</SelectItem>
              <SelectItem value="Subtask">Subtask</SelectItem>
              <SelectItem value="Incident">Incident</SelectItem>
              <SelectItem value="QA Bug">QA Bug</SelectItem>
              <SelectItem value="Frontend">Frontend</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => setWeekOffset(o => Math.max(o - 1, -52))}
            disabled={weekOffset <= -52}
            style={{ width: 26, height: 26, border: 'none', background: 'transparent', cursor: weekOffset <= -52 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, opacity: weekOffset <= -52 ? 0.3 : 1 }}
            onMouseEnter={e => { if (weekOffset > -52) e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <ChevronLeft size={16} color={INK4} />
          </button>
          <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: INK2, whiteSpace: 'nowrap' as const }}>{weekLabel}</span>
          <button
            onClick={() => setWeekOffset(o => Math.min(o + 1, 0))}
            disabled={weekOffset >= 0}
            style={{ width: 26, height: 26, border: 'none', background: 'transparent', cursor: weekOffset >= 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, opacity: weekOffset >= 0 ? 0.3 : 1 }}
            onMouseEnter={e => { if (weekOffset < 0) e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <ChevronRight size={16} color={INK4} />
          </button>
        </div>
      </div>

      {/* Table */}
      {display.length === 0 ? (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 8, padding: '48px 16px',
        }}>
          <Inbox size={24} color={MUTED} />
          <span style={{ fontSize: 13, color: INK4 }}>No work items found</span>
          <span style={{ fontSize: 12, color: MUTED }}>Try adjusting the filters</span>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', height: 50, padding: '8px 12px',
            borderBottom: '0.75px solid var(--divider)', background: 'var(--bg-app)',
          }}>
            <span style={{ width: 40, textAlign: 'center' as const, fontSize: 10.5, fontWeight: 500, textTransform: 'uppercase', color: INK4, letterSpacing: '0.04em' }}>TYPE</span>
            <span style={{ width: 100, fontSize: 10.5, fontWeight: 500, textTransform: 'uppercase', color: INK4, letterSpacing: '0.04em', paddingLeft: 8 }}>KEY</span>
            <span style={{ flex: 1, fontSize: 10.5, fontWeight: 500, textTransform: 'uppercase', color: INK4, letterSpacing: '0.04em' }}>TITLE</span>
            <span style={{ width: 120, fontSize: 10.5, fontWeight: 500, textTransform: 'uppercase', color: INK4, letterSpacing: '0.04em' }}>STATUS</span>
            <span style={{ width: 90, textAlign: 'right' as const, fontSize: 10.5, fontWeight: 500, textTransform: 'uppercase', color: INK4, letterSpacing: '0.04em' }}>UPDATED</span>
          </div>
          {/* Rows */}
          {display.map((item: any, idx: number) => (
            <div
              key={item.id || idx}
              style={{
                display: 'flex', alignItems: 'center', height: 50, padding: '8px 12px',
                borderBottom: idx < display.length - 1 ? '0.75px solid var(--divider)' : 'none',
                background: 'var(--bg-app)', transition: 'background 80ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-app)'; }}
            >
              <span style={{ width: 40, display: 'flex', justifyContent: 'center' }}>
                <JiraIssueTypeIcon type={item.work_item_type || 'Task'} size={16} />
              </span>
              <span style={{ width: 100, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: INK4, paddingLeft: 8 }}>{item.item_key}</span>
              <span style={{
                flex: 1, fontSize: 13, color: INK2, overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
              }}>{item.title}</span>
              <span style={{ width: 120 }}>
                <R360StatusLozenge status={item.status || item.status_category || 'To Do'} />
              </span>
              <span style={{ width: 90, textAlign: 'right' as const, fontSize: 11, color: MUTED }}>{relTime(item.updated_at)}</span>
            </div>
          ))}
          {totalCount > 50 && (
            <div style={{ padding: '8px 12px', fontSize: 12, color: MUTED, textAlign: 'center' as const }}>
              Showing 50 of {totalCount} items
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default R360ProfileDrawer;
