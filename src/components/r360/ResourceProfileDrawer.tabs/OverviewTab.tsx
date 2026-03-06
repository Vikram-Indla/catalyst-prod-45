/**
 * OverviewTab — 8 sections: KPI, Capacity Ring, Closure Trend, Work Mix,
 * Weekly Story card, Hub Breakdown
 */

import { useEffect, useRef, useMemo } from 'react';
import { AlertTriangle, Info, BookOpen, ChevronRight } from 'lucide-react';
import { useR360WeeklyStats, useR360WorkItems, useR360ClosureTrend, R360_CURRENT_WEEK } from '@/hooks/useR360Profile';
import type { R360ProfileResource } from '@/types/r360';
import type { R360ActiveTab } from '@/pages/R360ProfilePage';
import { WorkItemIcon } from '../R360WorkItemIcons';

interface OverviewTabProps {
  resourceId: string;
  resource: R360ProfileResource;
  weekOffset: number;
  onTabChange: (tab: R360ActiveTab) => void;
}

export function OverviewTab({ resourceId, resource, weekOffset, onTabChange }: OverviewTabProps) {
  const { data: stats } = useR360WeeklyStats(resourceId, weekOffset);
  const { data: workItems = [] } = useR360WorkItems(resourceId);
  const { data: trend = [] } = useR360ClosureTrend(resourceId);

  const weekNum = Math.max(1, R360_CURRENT_WEEK + weekOffset);

  // Work mix calculation
  const workMix = useMemo(() => {
    const counts: Record<string, number> = {};
    workItems.forEach((item) => {
      const t = item.itemType || 'Task';
      counts[t] = (counts[t] || 0) + 1;
    });
    const total = workItems.length || 1;
    return Object.entries(counts)
      .map(([type, count]) => ({ type, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count);
  }, [workItems]);

  // Hub breakdown
  const hubBreakdown = useMemo(() => {
    const hubs: Record<string, { open: number; closed: number }> = {};
    workItems.forEach((item) => {
      const hub = item.hubSource || 'BAU';
      if (!hubs[hub]) hubs[hub] = { open: 0, closed: 0 };
      if (item.status === 'DONE') hubs[hub].closed++;
      else hubs[hub].open++;
    });
    // Also count DONE items from all items query
    return Object.entries(hubs).map(([name, data]) => ({
      name,
      code: name === 'IncidentHub' ? 'I' : name === 'BAU' ? 'B' : 'Σ',
      isIncident: name === 'IncidentHub',
      open: data.open,
      closed: data.closed,
      total: data.open + data.closed,
      closurePct: (data.open + data.closed) > 0 ? Math.round((data.closed / (data.open + data.closed)) * 100) : 0,
    }));
  }, [workItems]);

  const totalOpen = stats?.totalOpen ?? workItems.filter(i => i.status !== 'DONE').length;
  const inProgress = workItems.filter(i => i.status === 'IN_PROGRESS').length;
  const toDo = workItems.filter(i => i.status === 'TO_DO').length;

  // Bar animation
  const barsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!barsRef.current) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        barsRef.current?.querySelectorAll<HTMLDivElement>('[data-target-width]').forEach((el) => {
          el.style.width = el.dataset.targetWidth || '0%';
        });
      });
    });
  }, [workMix]);

  // Ring arc math
  const ringR = 44;
  const circumference = 2 * Math.PI * ringR;
  const openCount = totalOpen;
  const maxItems = 12;
  const fillRatio = Math.min(openCount / maxItems, 1);
  const dashLen = circumference * fillRatio;
  const gapLen = circumference - dashLen;
  const avgRatio = Math.min(5 / maxItems, 1);
  const avgDash = circumference * avgRatio;
  const offset = -circumference * 0.25;

  return (
    <>
      {/* S1 — KPI Stats Bar */}
      <div className="r3p-section">
        <div className="r3p-sec-title">This Week · W{weekNum} · Mar 1–5, 2026</div>
        <div className="r3p-kpi-grid">
          <div className="r3p-kpi-cell">
            <div className="r3p-kpi-value" style={{ color: 'var(--r3-danger)' }}>{totalOpen}</div>
            <div className="r3p-kpi-label">Total Open</div>
            <div className="r3p-kpi-compare">vs role avg {resource.roleAvgOpenCount}</div>
          </div>
          <div className="r3p-kpi-cell">
            <div className="r3p-kpi-value" style={{ color: 'var(--r3-success)' }}>
              {stats?.closedThisWeek ?? 0}
              <span style={{ fontSize: 11, marginLeft: 3, color: 'var(--r3-success)' }}>↑</span>
            </div>
            <div className="r3p-kpi-label">Closed This Week</div>
            <div className="r3p-kpi-compare">vs 3 last week</div>
          </div>
          <div className="r3p-kpi-cell">
            <div className="r3p-kpi-value">{stats?.inReview ?? 0}</div>
            <div className="r3p-kpi-label">In Review</div>
            <div className="r3p-kpi-compare" style={{ color: 'var(--r3-warning)' }}>0 items under review</div>
          </div>
          <div className="r3p-kpi-cell">
            <div className="r3p-kpi-value">
              {stats?.pickupSpeedHours ?? 0}
              <span className="r3p-kpi-unit">h</span>
            </div>
            <div className="r3p-kpi-label">Pickup Speed</div>
            <div className="r3p-kpi-compare">team avg 38h</div>
          </div>
        </div>
      </div>

      {/* S2 — Capacity & Load Ring */}
      <div className="r3p-section">
        <div className="r3p-sec-title">Capacity & Load</div>
        <div className="r3p-capacity">
          <svg width="110" height="110" viewBox="0 0 110 110">
            <circle cx="55" cy="55" r={ringR} fill="none" stroke="var(--ring-track)" strokeWidth="9" />
            <circle
              cx="55" cy="55" r={ringR}
              fill="none" stroke="#CBD5E1" strokeWidth="2"
              strokeDasharray={`${avgDash} ${circumference - avgDash}`}
              strokeDashoffset={offset}
              opacity="0.7"
              strokeLinecap="round"
            />
            <circle
              cx="55" cy="55" r={ringR}
              fill="none" stroke="var(--r3-warning)" strokeWidth="9"
              strokeDasharray={`${dashLen} ${gapLen}`}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
            <text x="55" y="52" textAnchor="middle" fill="var(--r3-warning)"
              style={{ fontFamily: 'var(--ff-head)', fontSize: 22, fontWeight: 700 }}>
              {openCount}
            </text>
            <text x="55" y="66" textAnchor="middle" fill="var(--tx-muted)"
              style={{ fontFamily: 'var(--ff-body)', fontSize: 11, fontWeight: 700 }}>
              OPEN
            </text>
            <text x="55" y="100" textAnchor="middle" fill="#CBD5E1"
              style={{ fontFamily: 'var(--ff-body)', fontSize: 11 }}>
              avg {resource.roleAvgOpenCount}
            </text>
          </svg>

          <div className="r3p-capacity-stats">
            <div className="r3p-stat-row">
              <span className="r3p-stat-label">In progress right now</span>
              <span className="r3p-stat-value" style={{ color: 'var(--r3-danger)' }}>
                {stats?.inProgressConcurrent ?? inProgress} concurrent
              </span>
            </div>
            <div className="r3p-stat-row">
              <span className="r3p-stat-label">Closed this week</span>
              <span className="r3p-stat-value">
                {stats?.closedOfTouched ?? 0} of {stats?.totalTouched ?? 0} touched
              </span>
            </div>
            <div className="r3p-stat-row">
              <span className="r3p-stat-label">Avg cycle time</span>
              <span className="r3p-stat-value" style={{ color: 'var(--r3-warning)' }}>
                {stats?.avgCycleTimeDays ?? 0}d per item
              </span>
            </div>
            <div className="r3p-stat-row">
              <span className="r3p-stat-label">Oldest open item</span>
              <span className="r3p-stat-value" style={{ color: 'var(--r3-danger)' }}>
                {stats?.oldestItemAgeDays ?? 0}d · {stats?.oldestItemKey || '—'}
              </span>
            </div>
          </div>
        </div>

        <div className="r3p-anomaly">
          <AlertTriangle size={13} style={{ color: 'var(--r3-warning)', flexShrink: 0, marginTop: 2 }} />
          <span className="r3p-anomaly-text">
            {stats?.inProgressConcurrent ?? inProgress} items in progress simultaneously.
            Only {stats?.closedOfTouched ?? 0} of {stats?.totalTouched ?? 0} touched items closed this week —
            potential context-switching detected.
          </span>
        </div>
      </div>

      {/* S3 — Closure Trend */}
      <div className="r3p-section">
        <div className="r3p-sec-title">Closure Trend</div>
        <div className="r3p-card">
          <div className="r3p-card-header">
            <span className="r3p-card-title">Items closed per week (W2–W{weekNum})</span>
            <span className="r3p-card-badge" style={{ color: 'var(--r3-success)' }}>↑ +140% vs prev 4 weeks</span>
          </div>
          <ClosureTrendSvg trend={trend} />
        </div>
      </div>

      {/* S4 — Work Mix */}
      <div className="r3p-section">
        <div className="r3p-sec-title">Work Mix</div>
        <div ref={barsRef}>
          {workMix.map((item) => (
            <div key={item.type} className="r3p-mix-row">
              <WorkItemIcon type={item.type} />
              <span className="r3p-mix-label">{item.type}</span>
              <div className="r3p-mix-bar-wrap">
                <div
                  className="r3p-mix-bar"
                  data-target-width={`${item.pct}%`}
                  style={{
                    width: '0%',
                    background: getMixColor(item.type),
                  }}
                />
              </div>
              <span className="r3p-mix-count">{item.count} ({item.pct}%)</span>
            </div>
          ))}
        </div>
        <div className="r3p-insight">
          <Info size={14} style={{ color: 'var(--r3-primary)', flexShrink: 0 }} />
          <span className="r3p-insight-text">
            Bug-heavy workload ({workMix.find(m => m.type === 'Bug')?.pct ?? 0}% bugs) — consider
            root-cause analysis to reduce incoming defects.
          </span>
        </div>
      </div>

      {/* S5 — Weekly Story Card */}
      <div className="r3p-section">
        <button
          className="r3p-story-card"
          onClick={() => onTabChange('weekly-story')}
          style={{ width: '100%', textAlign: 'left', fontFamily: 'var(--ff-body)' }}
        >
          <div className="r3p-story-icon-box">
            <BookOpen size={16} style={{ color: 'var(--r3-primary)' }} />
          </div>
          <div className="r3p-story-content">
            <div className="r3p-story-label">Weekly Story · W{weekNum}</div>
            <div className="r3p-story-quote">
              "Focused on bug fixes with limited closure velocity this week."
            </div>
            <div className="r3p-story-dots">
              <span className="r3p-story-dot-item">
                <span className="r3p-dot" style={{ background: 'var(--r3-success)' }} />
                {stats?.closedThisWeek ?? 0} closed
              </span>
              <span className="r3p-story-dot-item">
                <span className="r3p-dot" style={{ background: 'var(--r3-primary)' }} />
                {stats?.inReview ?? 0} review
              </span>
              <span className="r3p-story-dot-item">
                <span className="r3p-dot" style={{ background: 'var(--tx-muted)' }} />
                {stats?.totalTouched ?? 0} status changes
              </span>
            </div>
          </div>
          <ChevronRight size={14} style={{ color: 'var(--r3-primary)', flexShrink: 0 }} />
        </button>
      </div>

      {/* S6 — Hub Breakdown */}
      <div className="r3p-section">
        <div className="r3p-sec-title">Hub Breakdown</div>
        <div className="r3p-hub-summary">
          <div className="r3p-kpi-cell">
            <div className="r3p-kpi-value" style={{ color: 'var(--r3-danger)' }}>{totalOpen}</div>
            <div className="r3p-kpi-label">Total Backlog</div>
          </div>
          <div className="r3p-kpi-cell">
            <div className="r3p-kpi-value">{inProgress}</div>
            <div className="r3p-kpi-label">In Progress</div>
          </div>
          <div className="r3p-kpi-cell">
            <div className="r3p-kpi-value">{toDo}</div>
            <div className="r3p-kpi-label">To Do</div>
          </div>
          <div className="r3p-kpi-cell">
            <div className="r3p-kpi-value" style={{ color: 'var(--tx-muted)' }}>—</div>
            <div className="r3p-kpi-label">Blocked</div>
          </div>
        </div>

        {hubBreakdown.map((hub) => (
          <div key={hub.name} className="r3p-hub-card">
            <div
              className="r3p-hub-badge"
              style={{ background: hub.isIncident ? 'var(--r3-danger)' : 'var(--tx-tertiary)' }}
            >
              {hub.code}
            </div>
            <div className="r3p-hub-info">
              <div className="r3p-hub-name">{hub.name}</div>
              <div className="r3p-hub-date">Active this week</div>
            </div>
            <div className="r3p-hub-right">
              <span className="r3p-hub-count" style={{ color: hub.open > 0 ? 'var(--r3-danger)' : 'var(--tx-secondary)' }}>
                {hub.open} open
              </span>
              <div className="r3p-hub-bar-wrap">
                <div
                  className="r3p-hub-bar"
                  style={{
                    width: `${hub.closurePct}%`,
                    background: hub.isIncident ? 'var(--r3-danger)' : 'var(--tx-tertiary)',
                  }}
                />
              </div>
              <span className="r3p-hub-pct" style={{ color: hub.isIncident ? 'var(--r3-danger)' : 'var(--tx-tertiary)' }}>
                {hub.closurePct}%
              </span>
            </div>
          </div>
        ))}

        <div className="r3p-hub-total">
          <span>Total open across all hubs</span>
          <span style={{ fontWeight: 700, color: 'var(--r3-danger)' }}>{totalOpen}</span>
        </div>
      </div>
    </>
  );
}

// ─── Closure Trend SVG ───
function ClosureTrendSvg({ trend }: { trend: { weekLabel: string; closedCount: number; isCurrent: boolean }[] }) {
  if (!trend.length) return <div style={{ height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tx-muted)', fontSize: 12 }}>No trend data</div>;

  const w = 624;
  const h = 72;
  const pad = 30;
  const maxVal = Math.max(...trend.map((t) => t.closedCount), 1);
  const points = trend.map((t, i) => ({
    x: pad + (i / Math.max(trend.length - 1, 1)) * (w - pad * 2),
    y: h - pad - ((t.closedCount / maxVal) * (h - pad * 2)),
    ...t,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = `${linePath} L${points[points.length - 1].x},${h - pad} L${points[0].x},${h - pad} Z`;

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--r3-success)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="var(--r3-success)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#trend-fill)" />
      <path d={linePath} fill="none" stroke="var(--r3-success)" strokeWidth="1.5" />
      {points.map((p, i) => (
        <g key={i}>
          <circle
            cx={p.x} cy={p.y}
            r={p.isCurrent ? 4 : 2.5}
            fill={p.isCurrent ? 'var(--r3-warning)' : 'var(--r3-success)'}
          />
          {p.isCurrent && (
            <line x1={p.x} y1={0} x2={p.x} y2={h - pad}
              stroke="var(--r3-warning)" strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
          )}
          <text
            x={p.x} y={h - 4}
            textAnchor="middle"
            fill={p.isCurrent ? 'var(--r3-warning)' : 'var(--tx-muted)'}
            style={{
              fontFamily: 'var(--ff-body)',
              fontSize: 11,
              fontWeight: p.isCurrent ? 700 : 400,
            }}
          >
            {p.weekLabel}
          </text>
          <text
            x={p.x} y={p.y - 8}
            textAnchor="middle"
            fill={p.closedCount === maxVal ? 'var(--r3-success)' : p.isCurrent ? 'var(--r3-warning)' : 'var(--tx-muted)'}
            style={{
              fontFamily: 'var(--ff-body)',
              fontSize: 11,
              fontWeight: p.closedCount === maxVal || p.isCurrent ? 700 : 400,
            }}
          >
            {p.closedCount}
          </text>
        </g>
      ))}
    </svg>
  );
}

function getMixColor(type: string): string {
  switch (type) {
    case 'Bug': return 'rgba(255,86,48,0.75)';
    case 'Story': return 'rgba(54,179,126,0.80)';
    case 'Subtask': return 'rgba(38,132,255,0.75)';
    case 'Incident': return 'rgba(255,86,48,0.50)';
    default: return 'rgba(38,132,255,0.5)';
  }
}
