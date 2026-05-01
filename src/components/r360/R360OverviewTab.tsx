/**
 * R360 Profile Drawer — Overview Tab
 * Extracted from R360ProfileDrawer.tsx
 */
import React from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle, Info, BookOpen } from 'lucide-react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import {
  INK1, INK2, INK4, MUTED, SUCCESS, WARNING, DANGER, BRAND,
  BORDER, BORDER_LIGHT, TYPE_COLORS, Skeleton, SectionTitle,
  type TabKey,
} from './R360DrawerShared';

interface OverviewTabProps {
  stats: any;
  statsLoading: boolean;
  prevWeekClosed: number;
  openCount: number;
  roleAvg: number;
  loadColour: string;
  trend: any[];
  trendLoading: boolean;
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
}

export function OverviewTab({
  stats, statsLoading, prevWeekClosed, openCount, roleAvg, loadColour,
  trend, trendLoading, workMix, hubBreakdown, hubSummary, totalOpenAcrossHubs,
  onTabSwitch, workItems, showFilteredList, showItemDetail,
  weekLabel, weekStart, weekEnd, weekOffset, setWeekOffset,
}: OverviewTabProps) {
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
            <span style={{ fontSize: 12, fontFamily: 'var(--cp-font-mono)', color: INK2, whiteSpace: 'nowrap' as const }}>{weekLabel}</span>
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
              <div style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 28, fontWeight: 650, color: loadColour }}>{openCount}</div>
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
                <span style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 28, fontWeight: 650, color: closedColour }}>{closedThisWeek}</span>
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
              <div style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 28, fontWeight: 650, color: INK1 }}>{inReview}</div>
              <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: MUTED, marginTop: 2 }}>IN REVIEW</div>
              <div style={{ fontSize: 11, fontWeight: 400, color: INK4, marginTop: 2 }}>{inReview === 0 ? 'None pending' : `${inReview} awaiting`}</div>
            </div>
            {/* Pickup Speed — color-coded */}
            <div style={{ background: 'var(--bg-app)', padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                {pickupHours > 0 ? (
                  <>
                    <span style={{
                      fontFamily: 'var(--cp-font-heading)', fontSize: 28, fontWeight: 650,
                      color: pickupHours > 38 ? DANGER : SUCCESS,
                    }}>
                      {pickupHours < 24 ? pickupHours : Math.round(pickupHours / 24)}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 500, color: INK4 }}>
                      {pickupHours < 24 ? 'h' : 'd'}
                    </span>
                  </>
                ) : (
                  <span style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 28, fontWeight: 650, color: MUTED }}>—</span>
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
            <circle cx={55} cy={55} r={44} fill="none" stroke="var(--ds-text-disabled, #CBD5E1)" strokeWidth={2}
              strokeDasharray="125 151" strokeDashoffset={-69} opacity={0.7} />
            <circle cx={55} cy={55} r={44} fill="none" stroke={loadColour} strokeWidth={9}
              strokeDasharray={`${Math.min((openCount / 11) * 276.5, 276.5)} ${276.5 - Math.min((openCount / 11) * 276.5, 276.5)}`}
              strokeDashoffset={-69} strokeLinecap="round" />
            <text x={55} y={52} textAnchor="middle" fontFamily='var(--cp-font-heading)' fontSize={22} fontWeight={700} fill={loadColour}>{openCount}</text>
            <text x={55} y={67} textAnchor="middle" fontFamily='var(--cp-font-body)' fontSize={11} fontWeight={700} fill={MUTED}>OPEN</text>
            <text x={55} y={82} textAnchor="middle" fontFamily='var(--cp-font-body)' fontSize={11} fill="var(--ds-text-disabled, #CBD5E1)">avg {roleAvg}</text>
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
              <span style={{ fontSize: 12, fontWeight: 600, color: concurrentColour, fontFamily: 'var(--cp-font-mono)' }}>{concurrent} concurrent</span>
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
              <span style={{ fontSize: 12, fontWeight: 600, color: INK1, fontFamily: 'var(--cp-font-mono)' }}>{closedOfTouched} of {totalTouched} touched</span>
            </div>
            {/* Avg cycle time row — not clickable */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 10px', border: `1px solid ${BORDER}`, borderRadius: 4,
              boxShadow: '0 1px 2px rgba(15,23,42,0.06)',
            }}>
              <span style={{ fontSize: 12, color: INK2 }}>Avg cycle time</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: (avgDays === 0 || avgDays == null) ? MUTED : cycleColour, fontFamily: 'var(--cp-font-mono)' }}>{(avgDays === 0 || avgDays == null) ? '—' : `${avgDays}d per item`}</span>
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
              <span style={{ fontSize: 12, fontWeight: 600, color: oldestColour, fontFamily: 'var(--cp-font-mono)' }}>{oldestAgeDays}d · {oldestKey}</span>
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
                      fontFamily='var(--cp-font-body)'
                      fontWeight={isPeak || isCurrentW ? 700 : 400}
                      fill={isCurrentW ? WARNING : isPeak ? SUCCESS : MUTED}
                    >{t.closedCount}</text>
                    <text x={x} y={72} textAnchor="middle" fontSize={10} fill={MUTED} fontFamily='var(--cp-font-body)'>{t.weekLabel}</text>
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
            const tc = TYPE_COLORS[row.type] || { color: 'var(--ds-text-subtlest, #94A3B8)', opacity: 0.6 };
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
                <span style={{ fontSize: 11, fontWeight: 650, fontFamily: 'var(--cp-font-mono)', fontVariantNumeric: 'tabular-nums', color: INK2, width: 28, textAlign: 'right' as const }}>{row.count}</span>
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
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--ds-text-disabled, #CBD5E1)' }} />
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--ds-text-disabled, #CBD5E1)' }} />
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
              <div style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 28, fontWeight: 650, color: tile.color }}>{tile.value}</div>
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
                  fontSize: 11, fontWeight: 650, fontFamily: 'var(--cp-font-mono)',
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
