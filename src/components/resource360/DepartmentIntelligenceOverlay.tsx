/**
 * Department Intelligence Panel — LINEAR PRECISION
 * Nuke & Rebuild: Progressive section-by-section loading, no monolithic "Analyzing..." screen.
 */
import React, { useEffect, useCallback } from 'react';
import {
  useDeptHealthKPIs, useDeptWorkload, useDeptDistribution,
  useDeptWeeklyEvents, useDeptLeaderboard, useDeptRefreshAll, useDeptMeta,
  type HealthKPIs, type WorkloadItem, type DistItem, type ItemDistribution,
  type WeekEvent, type WeekEventsData, type LeaderboardRow,
} from '@/hooks/useDeptIntelligence';
import '@/styles/dept-intelligence.css';

interface Props {
  departmentName: string;
  onClose: () => void;
}

export default function DepartmentIntelligenceOverlay({ departmentName, onClose }: Props) {
  const healthQ = useDeptHealthKPIs(departmentName);
  const workloadQ = useDeptWorkload(departmentName);
  const distQ = useDeptDistribution(departmentName);
  const eventsQ = useDeptWeeklyEvents(departmentName);
  const leaderboardQ = useDeptLeaderboard(departmentName);
  const metaQ = useDeptMeta(departmentName);
  const refreshAll = useDeptRefreshAll(departmentName);

  const isAnyLoading = healthQ.isLoading || workloadQ.isLoading || distQ.isLoading || eventsQ.isLoading || leaderboardQ.isLoading;
  const loadedAt = healthQ.dataUpdatedAt || Date.now();
  const dataAge = getAge(loadedAt);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="di-root">
      {/* Backdrop */}
      <div className="di-backdrop" onClick={onClose} />

      {/* Panel */}
      <div className="di-panel">
        {/* TOP BAR */}
        <div className="di-topbar">
          <button className="di-back-btn" onClick={onClose}>← Back to Resources</button>
          <div className="di-topbar-spacer" />
          <span className="di-data-age">Data: {dataAge}</span>
          <button className="di-ghost-btn" onClick={refreshAll}>Sync Data</button>
          <button className="di-refresh-btn" onClick={refreshAll} disabled={isAnyLoading}>
            ✦ Refresh AI
          </button>
          <button className="di-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="di-body">
          {/* IDENTITY */}
          <div className="di-identity">
            <div className="di-identity-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round">
                <rect x="2" y="3" width="20" height="18" rx="2" />
                <path d="M9 12h6M9 16h6M9 8h6" />
              </svg>
            </div>
            <div>
              <div className="di-identity-name">{departmentName}</div>
              <div className="di-identity-meta">
                {metaQ.data ? `${metaQ.data.resourceCount} resources · ${metaQ.data.itemCount} items tracked · Q1-2026` : '…'}
              </div>
            </div>
          </div>

          {/* HEALTH KPIs */}
          {healthQ.data ? <HealthKPIsSection data={healthQ.data} /> : <SkeletonSection height={80} />}

          {/* WORKLOAD DISTRIBUTION */}
          {workloadQ.data ? <WorkloadSection data={workloadQ.data} /> : <SkeletonSection height={120} />}

          {/* WORK ITEM DISTRIBUTION */}
          {distQ.data ? <DistributionSection data={distQ.data} /> : <SkeletonSection height={160} />}

          {/* THIS WEEK'S SIGNIFICANT EVENTS */}
          <EventsSection
            data={eventsQ.data || null}
            isLoading={eventsQ.isLoading}
            prevWeek={eventsQ.prevWeek}
            nextWeek={eventsQ.nextWeek}
            weekOffset={eventsQ.weekOffset}
          />

          {/* RESOURCE LEADERBOARD */}
          {leaderboardQ.data ? <LeaderboardSection data={leaderboardQ.data} /> : <SkeletonSection height={200} />}
        </div>

        {/* FOOTER */}
        <div className="di-footer">
          Generated: {new Date().toLocaleString()} · {metaQ.data?.resourceCount || '…'} resources · {metaQ.data?.itemCount || '…'} items analyzed
        </div>
      </div>
    </div>
  );
}

/* ═══ Section Components ═══ */

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="di-section-header">
      {title}
      <span className="di-ai-badge">AI</span>
    </div>
  );
}

function SkeletonSection({ height }: { height: number }) {
  return (
    <div className="di-skeleton-section">
      <div className="di-skeleton-bar" style={{ height: 14, width: '30%', marginBottom: 12 }} />
      <div className="di-skeleton-bar" style={{ height: height * 0.4, width: '100%', marginBottom: 8 }} />
      <div className="di-skeleton-bar" style={{ height: height * 0.3, width: '80%', marginBottom: 8 }} />
      <div className="di-skeleton-bar" style={{ height: height * 0.2, width: '60%' }} />
    </div>
  );
}

/* ── Health KPIs ── */
function HealthKPIsSection({ data }: { data: HealthKPIs }) {
  const items = [
    { label: 'Total Items', value: data.total, color: '#09090B' },
    { label: 'Closed', value: data.closed, color: '#16A34A' },
    { label: 'In Progress', value: data.inProgress, color: '#D97706' },
    { label: 'Backlog', value: data.backlog, color: '#09090B' },
    { label: 'Closure Rate', value: `${data.closureRate}%`, color: data.closureRate >= 70 ? '#16A34A' : data.closureRate >= 40 ? '#D97706' : '#DC2626' },
  ];
  return (
    <div className="di-section">
      <SectionHeader title="DEPARTMENT HEALTH" />
      <div className="di-kpi-grid">
        {items.map(k => (
          <div key={k.label} className="di-kpi-cell">
            <div className="di-kpi-value" style={{ color: k.color }}>{k.value}</div>
            <div className="di-kpi-label">{k.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Workload Distribution ── */
function WorkloadSection({ data }: { data: WorkloadItem[] }) {
  if (data.length === 0) return null;
  return (
    <div className="di-section">
      <SectionHeader title="WORKLOAD DISTRIBUTION" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {data.map(w => (
          <div key={w.label} className="di-workload-row">
            <span className="di-workload-label">{w.label}</span>
            <div className="di-workload-track">
              <div className="di-workload-fill" style={{ width: `${w.pct}%`, background: w.color }} />
            </div>
            <span className="di-workload-pct">{w.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Work Item Distribution ── */
function DistributionSection({ data }: { data: ItemDistribution }) {
  const maxStatus = Math.max(...data.byStatus.map(s => s.count), 1);
  const maxHub = Math.max(...data.byHub.map(h => h.count), 1);

  return (
    <div className="di-section">
      <SectionHeader title="WORK ITEM DISTRIBUTION" />
      <div className="di-dist-grid">
        {/* By Status */}
        <div className="di-dist-card">
          <div className="di-dist-card-header">By Status</div>
          {data.byStatus.map(s => (
            <div key={s.name} className="di-dist-row">
              <span className="di-dist-dot" style={{ background: s.color }} />
              <span className="di-dist-name">{s.name}</span>
              <div className="di-dist-minibar">
                <div className="di-dist-minibar-fill" style={{ width: `${(s.count / maxStatus) * 100}%`, background: s.color }} />
              </div>
              <span className="di-dist-count">{s.count}</span>
            </div>
          ))}
        </div>
        {/* By Hub */}
        <div className="di-dist-card">
          <div className="di-dist-card-header">By Hub</div>
          {data.byHub.map(h => (
            <div key={h.name} className="di-dist-row">
              <span className="di-dist-dot" style={{ background: h.color }} />
              <span className="di-dist-name">{h.name}</span>
              <div className="di-dist-minibar">
                <div className="di-dist-minibar-fill" style={{ width: `${(h.count / maxHub) * 100}%`, background: h.color }} />
              </div>
              <span className="di-dist-count">{h.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Events ── */
function EventsSection({ data, isLoading, prevWeek, nextWeek, weekOffset }: {
  data: WeekEventsData | null;
  isLoading: boolean;
  prevWeek: () => void;
  nextWeek: () => void;
  weekOffset: number;
}) {
  return (
    <div className="di-section">
      <SectionHeader title="THIS WEEK'S SIGNIFICANT EVENTS" />

      {/* Week nav */}
      <div className="di-week-nav">
        <button className="di-week-arrow" onClick={prevWeek}>◄</button>
        <span className="di-week-label">{data?.weekLabel || '…'}</span>
        <span>·</span>
        <span className="di-week-range">{data?.weekRange || '…'}</span>
        <button className="di-week-arrow" onClick={nextWeek} disabled={weekOffset === 0}>►</button>
      </div>

      {isLoading || !data ? (
        <div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="di-skeleton-bar" style={{ height: 20, marginBottom: 8, width: `${80 - i * 10}%` }} />
          ))}
        </div>
      ) : (
        <>
          {/* Summary banner */}
          <div className="di-summary-banner">
            <div className="di-summary-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
            </div>
            <div>
              <div className="di-summary-title">{data.totalTransitions} transitions across {data.resourceCount} resources</div>
              <div className="di-summary-sub">Sunday–Thursday · Saudi work week</div>
            </div>
            <div className="di-summary-stats">
              <div style={{ textAlign: 'center' }}>
                <div className="di-summary-stat-val" style={{ color: '#16A34A' }}>{data.closedCount}</div>
                <div className="di-summary-stat-label">Closed</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div className="di-summary-stat-val" style={{ color: '#D97706' }}>{data.reviewCount}</div>
                <div className="di-summary-stat-label">Review</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div className="di-summary-stat-val" style={{ color: '#09090B' }}>{data.pickedUpCount}</div>
                <div className="di-summary-stat-label">Picked Up</div>
              </div>
            </div>
          </div>

          {/* Event bullets */}
          {data.events.map(ev => (
            <div key={ev.num} className="di-event-row">
              <span className="di-event-num">{ev.num}</span>
              {ev.day && <span className="di-event-day">{ev.day}</span>}
              <span className="di-event-text" dangerouslySetInnerHTML={{
                __html: ev.text
                  .replace(/<ticket>([^<]+)<\/ticket>/g, '<span class="di-ticket-pill">$1</span>')
              }} />
              {ev.hub.name && (
                <span className="di-hub-badge" style={{ color: ev.hub.color, background: ev.hub.color + '15' }}>
                  {ev.hub.name}
                </span>
              )}
            </div>
          ))}

          {data.events.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: '#71717A', fontSize: 13 }}>
              No significant events this week.
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── Leaderboard ── */
function LeaderboardSection({ data }: { data: LeaderboardRow[] }) {
  if (data.length === 0) return null;

  return (
    <div className="di-section">
      <SectionHeader title="RESOURCE LEADERBOARD" />
      <table className="di-leaderboard">
        <thead>
          <tr>
            <th className="di-center" style={{ width: 32 }}>#</th>
            <th>Resource</th>
            <th className="di-right" style={{ width: 56 }}>Done</th>
            <th className="di-right" style={{ width: 56 }}>WIP</th>
            <th className="di-right" style={{ width: 56 }}>Total</th>
            <th className="di-right" style={{ width: 70 }}>Closure</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r, i) => {
            const wipColor = r.wip >= 10 ? '#DC2626' : r.wip >= 5 ? '#D97706' : '#09090B';
            const closureColor = r.closurePct >= 70 ? '#16A34A' : r.closurePct >= 40 ? '#D97706' : '#DC2626';
            return (
              <tr key={r.name}>
                <td className="di-rank" style={{ color: i === 0 ? '#2563EB' : undefined }}>#{i + 1}</td>
                <td>
                  <div className="di-resource-cell">
                    <div className="di-mini-avatar" style={{ background: r.avatarColor }}>{r.initials}</div>
                    <div>
                      <div className="di-resource-name">{r.name}</div>
                      <div className="di-resource-role">{r.role}</div>
                    </div>
                  </div>
                </td>
                <td className="di-num-cell" style={{ color: '#16A34A' }}>{r.done}</td>
                <td className="di-num-cell" style={{ color: wipColor }}>{r.wip}</td>
                <td className="di-num-cell">{r.total}</td>
                <td>
                  <div className="di-closure-cell">
                    <div className="di-closure-bar">
                      <div className="di-closure-fill" style={{ width: `${r.closurePct}%`, background: closureColor }} />
                    </div>
                    <span className="di-closure-pct" style={{ color: closureColor }}>{r.closurePct}%</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── Helpers ── */
function getAge(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
