/**
 * R360 Profile Drawer — 700px inline split-pane intelligence view
 * V12 Hybrid Precision · No portal, no fixed, no overlay
 *
 * Sub-components extracted to:
 *   R360DrawerShared.tsx  — shared tokens, helpers, panels
 *   R360OverviewTab.tsx   — Overview tab
 *   R360BehaviouralTab.tsx — Behavioural Patterns tab
 *   R360WeeklyStoryTab.tsx — Weekly Story tab
 *   R360WorkItemsTab.tsx   — Work Items tab
 */
import React, { useState, useMemo, useCallback, useEffect, memo } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { ChevronLeft, X, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { R360_STATUS_MAP, R360_STATUS_DEFAULT } from '@/constants/r360';
import { getWeekNumber } from '@/constants/r360WeekConfig';
import {
  INK1, INK2, INK4, MUTED, SUCCESS, WARNING, DANGER, BRAND,
  BORDER, BORDER_LIGHT, SLATE,
  Skeleton, FilteredListPanel, ItemDetailPanel,
  type PanelView, type TabKey,
} from './R360DrawerShared';
import { OverviewTab } from './R360OverviewTab';
import { BehaviouralTab } from './R360BehaviouralTab';
import { WeeklyStoryTab } from './R360WeeklyStoryTab';
import { WorkItemsTab } from './R360WorkItemsTab';

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
      const { data: resource } = await typedQuery('resource_inventory')
        .select('id, rid, name, role_name, department_name, vendor_name, resource_type, profile_id, jira_account_id')
        .eq('id', resourceId)
        .maybeSingle();
      if (!resource) return null;

      let avatar_url: string | null = null;
      let skills: string[] = [];
      if (resource.profile_id) {
        const { data: profile } = await typedQuery('profiles')
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
      const { data: resource } = await typedQuery('resource_inventory')
        .select('name, jira_account_id')
        .eq('id', resourceId)
        .maybeSingle();
      if (!resource) return [];

      let query = typedQuery('ph_issues')
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
  if (openCount <= roleAvg) return SLATE;
  if (openCount <= roleAvg * 1.5) return WARNING;
  return DANGER;
}

// ══════════════════════════════════════════
// MAIN DRAWER
// ══════════════════════════════════════════
interface R360ProfileDrawerProps {
  resourceId: string;
  onClose: () => void;
}

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

export default R360ProfileDrawer;

// NOTE: OverviewTab, BehaviouralTab, WeeklyStoryTab, WorkItemsTab
// have been extracted to separate files. See file header comment.

/* eslint-disable @typescript-eslint/no-unused-vars */
// Remaining inline tab definitions removed — see:
//   R360OverviewTab.tsx
//   R360BehaviouralTab.tsx
//   R360WeeklyStoryTab.tsx
//   R360WorkItemsTab.tsx
/* eslint-enable @typescript-eslint/no-unused-vars */
/* END OF FILE — inline tabs extracted to separate files */
