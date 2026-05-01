/**
 * ReleaseTimeline — Gantt-style horizontal timeline
 * Phase 8
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import type { ReleaseProgress } from '@/types/workhub.types';

interface ReleaseTimelineProps {
  releases: ReleaseProgress[];
}

function addMonths(d: Date, n: number) {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

function monthsBetween(a: Date, b: Date) {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

function formatMonth(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short' });
}

function formatDate(s: string) {
  const d = new Date(s + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function ReleaseTimeline({ releases }: ReleaseTimelineProps) {
  const navigate = useNavigate();
  const [tooltip, setTooltip] = useState<{ release: ReleaseProgress; x: number; y: number } | null>(null);

  if (releases.length === 0) return null;

  // Calculate time window
  const dates = releases.flatMap(r => {
    const arr: Date[] = [];
    if (r.start_date) arr.push(new Date(r.start_date + 'T00:00:00'));
    if (r.target_date) arr.push(new Date(r.target_date + 'T00:00:00'));
    return arr;
  });
  if (dates.length === 0) return null;

  const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
  const windowStart = addMonths(new Date(minDate.getFullYear(), minDate.getMonth(), 1), -1);
  const windowEnd = addMonths(new Date(maxDate.getFullYear(), maxDate.getMonth(), 1), 2);
  const totalMonths = Math.max(monthsBetween(windowStart, windowEnd), 6);

  // Generate month labels
  const months: Date[] = [];
  for (let i = 0; i <= totalMonths; i++) {
    months.push(addMonths(windowStart, i));
  }

  const today = new Date();
  const totalMs = windowEnd.getTime() - windowStart.getTime();
  const todayPct = Math.max(0, Math.min(100, ((today.getTime() - windowStart.getTime()) / totalMs) * 100));

  function getBarPosition(startStr: string | undefined, endStr: string | undefined) {
    const s = startStr ? new Date(startStr + 'T00:00:00') : windowStart;
    const e = endStr ? new Date(endStr + 'T00:00:00') : windowEnd;
    const left = ((s.getTime() - windowStart.getTime()) / totalMs) * 100;
    const width = ((e.getTime() - s.getTime()) / totalMs) * 100;
    return { left: Math.max(0, left), width: Math.min(100 - Math.max(0, left), Math.max(2, width)) };
  }

  const sortedReleases = [...releases].sort((a, b) => {
    const aDate = a.start_date || a.target_date;
    const bDate = b.start_date || b.target_date;
    return (aDate || '').localeCompare(bDate || '');
  });

  return (
    <div style={{
      background: 'var(--cp-float)',
      border: '1px solid var(--divider)',
      borderRadius: 'var(--wh-radius-xl, 16px)',
      padding: 24,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{
          fontFamily: 'var(--cp-font-body)',
          fontSize: 18,
          fontWeight: 600,
          color: 'var(--fg-1)',
          margin: 0,
        }}>
          Release Timeline
        </h2>
        <button
          onClick={() => navigate('/projecthub/calendar')}
          style={{
            fontFamily: 'var(--cp-font-body)',
            fontSize: 13,
            color: 'var(--cp-blue)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
          className="hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500/30 rounded"
        >
          View Calendar <ArrowRight style={{ width: 14, height: 14 }} />
        </button>
      </div>

      {/* Gantt area */}
      <div style={{ overflowX: 'auto', minWidth: 600, position: 'relative' }}>
        {/* Month headers */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--divider)',
          paddingBottom: 8,
          marginBottom: 8,
          position: 'relative',
          marginLeft: 120,
        }}>
          {months.map((m, i) => (
            <div key={i} style={{
              flex: `0 0 ${100 / (totalMonths + 1)}%`,
              fontFamily: 'var(--cp-font-body)',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--fg-4)',
              textTransform: 'uppercase',
              textAlign: 'center',
            }}>
              {formatMonth(m)}
            </div>
          ))}
        </div>

        {/* Rows */}
        <div style={{ position: 'relative' }}>
          {/* Today line */}
          {todayPct > 0 && todayPct < 100 && (
            <div style={{
              position: 'absolute',
              left: `calc(120px + ${todayPct}% * (100% - 120px) / 100%)`,
              top: -20,
              bottom: 0,
              width: 2,
              background: 'var(--cp-blue)',
              zIndex: 10,
              pointerEvents: 'none',
            }}>
              <div style={{
                position: 'absolute',
                top: -6,
                left: -4,
                width: 0,
                height: 0,
                borderLeft: '5px solid transparent',
                borderRight: '5px solid transparent',
                borderTop: '6px solid var(--cp-blue)',
              }} />
            </div>
          )}

          {sortedReleases.map(release => {
            const pos = getBarPosition(release.start_date, release.target_date);
            const isCompleted = release.status === 'Completed';
            const isAtRisk = release.status === 'At Risk';
            const isCancelled = release.status === 'Cancelled';

            return (
              <div
                key={release.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: 48,
                  borderBottom: '1px solid var(--bg-1)',
                  cursor: 'pointer',
                }}
                onClick={() => navigate(`/projecthub/releases/${release.id}`)}
                onMouseEnter={e => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltip({ release, x: rect.left + rect.width / 2, y: rect.top });
                }}
                onMouseLeave={() => setTooltip(null)}
                className="hover:bg-blue-50/50"
              >
                {/* Label */}
                <div style={{ width: 120, flexShrink: 0, paddingRight: 12 }}>
                  <div style={{
                    fontFamily: 'var(--cp-font-body)',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--fg-1)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {release.name}
                  </div>
                  <div style={{
                    fontFamily: 'var(--cp-font-body)',
                    fontSize: 11,
                    color: 'var(--fg-4)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {release.title}
                  </div>
                </div>

                {/* Bar area */}
                <div style={{ flex: 1, position: 'relative', height: 20 }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: `${pos.left}%`,
                      width: `${pos.width}%`,
                      height: 20,
                      borderRadius: 4,
                      background: isCancelled
                        ? 'var(--ds-text-subtlest, #94a3b8)'
                        : isAtRisk
                          ? `repeating-linear-gradient(135deg, ${release.color}, ${release.color} 4px, transparent 4px, transparent 8px)`
                          : release.color,
                      opacity: isCompleted ? 0.7 : 1,
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {/* Completion fill */}
                    {!isCancelled && release.completion_percent > 0 && (
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        height: '100%',
                        width: `${release.completion_percent}%`,
                        background: 'rgba(0,0,0,0.15)',
                        borderRadius: '4px 0 0 4px',
                      }} />
                    )}
                    {/* Completed check */}
                    {isCompleted && (
                      <Check style={{
                        width: 14,
                        height: 14,
                        color: 'var(--bg-app)',
                        position: 'relative',
                        zIndex: 1,
                        marginLeft: 4,
                      }} />
                    )}
                    {isCancelled && (
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '10%',
                        right: '10%',
                        height: 2,
                        background: 'var(--bg-app)',
                        transform: 'translateY(-50%)',
                      }} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed',
          left: tooltip.x,
          top: tooltip.y - 10,
          transform: 'translate(-50%, -100%)',
          background: '#1e293b',
          color: 'var(--bg-app)',
          borderRadius: 8,
          padding: '8px 12px',
          fontSize: 12,
          fontFamily: 'var(--cp-font-body)',
          zIndex: 1000,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}>
          <div style={{ fontWeight: 600 }}>{tooltip.release.name} — {tooltip.release.title}</div>
          <div>Status: {tooltip.release.status}  Progress: {tooltip.release.completion_percent}%</div>
          <div>{tooltip.release.start_date ? formatDate(tooltip.release.start_date) : '?'} → {formatDate(tooltip.release.target_date)}</div>
        </div>
      )}
    </div>
  );
}
