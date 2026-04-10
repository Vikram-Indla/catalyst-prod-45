/**
 * Timeline View — Gantt-style horizontal timeline for releases
 * Extracted from AllReleasesPage.tsx
 */

import React, { useState } from 'react';
import {
  ViewRelease,
  getHealthColor,
  getHealthDisplay,
  getStatusConfig,
} from './ReleaseTableView';

const MONTHS = ['Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026', 'Sep 2026', 'Oct 2026'];

function getTimelineBarColor(r: ViewRelease): string {
  if (r.status === 'released') return '#0d9488';
  if (r.progress === 0) return '#cbd5e1';
  if (r.health < 40) return '#ef4444';
  if (r.health < 60) return '#d97706';
  if (r.health < 80) return '#2563eb';
  return '#0d9488';
}

const LEGEND_ITEMS = [
  { label: 'Critical', color: '#ef4444', shape: 'circle' },
  { label: 'At Risk', color: '#d97706', shape: 'circle' },
  { label: 'Healthy', color: '#0d9488', shape: 'circle' },
  { label: 'Today', color: '#ef4444', shape: 'line' },
];

interface TimelineViewProps {
  releases: ViewRelease[];
  onBarClick: (r: ViewRelease) => void;
}

export function TimelineView({ releases, onBarClick }: TimelineViewProps) {
  const [hoveredRelease, setHoveredRelease] = useState<ViewRelease | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const handleBarHover = (e: React.MouseEvent, r: ViewRelease | null) => {
    setHoveredRelease(r);
    if (r) setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  // Calculate today marker position
  const timelineStart = new Date('2026-01-01').getTime();
  const timelineEnd = new Date('2026-11-01').getTime();
  const todayPos = Math.max(0, Math.min(100, ((Date.now() - timelineStart) / (timelineEnd - timelineStart)) * 100));

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <div />
        <div className="flex items-center gap-4">
          {LEGEND_ITEMS.map(l => (
            <div key={l.label} className="flex items-center" style={{ gap: '6px', fontSize: '12px', fontWeight: 500, color: '#64748b' }}>
              {l.shape === 'circle' ? (
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: l.color }} />
              ) : (
                <div style={{ width: '12px', height: '2px', background: l.color, borderRadius: '1px' }} />
              )}
              {l.label}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-1 min-h-0" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: 'var(--bg-app, #fff)' }}>
        <div style={{ width: '260px', flexShrink: 0, borderRight: '1px solid #e2e8f0' }}>
          <div style={{ height: '32px', background: '#f8fafc', display: 'flex', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>RELEASE</span>
          </div>
          {releases.map(r => (
            <div
              key={r.id}
              onClick={() => onBarClick(r)}
              className="flex items-center gap-2 cursor-pointer transition-colors hover:bg-[#f8fafc]"
              style={{ height: '50px', padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}
            >
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getHealthColor(r.health), flexShrink: 0 }} />
              <div className="min-w-0 flex-1">
                <div className="truncate" style={{ fontSize: '14px', fontWeight: 500, color: '#0f172a', lineHeight: '36px' }}>{r.name}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-x-auto relative">
          <div className="flex" style={{ height: '32px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            {MONTHS.map(m => (
              <div key={m} className="flex-1" style={{ minWidth: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.05em', borderRight: '1px solid #f1f5f9' }}>
                {m}
              </div>
            ))}
          </div>

          {/* Today marker */}
          <div className="absolute" style={{ left: `${todayPos}%`, top: '32px', bottom: 0, width: '2px', background: '#ef4444', zIndex: 5 }}>
            <span style={{ position: 'absolute', top: '-18px', left: '50%', transform: 'translateX(-50%)', fontSize: '11px', fontWeight: 600, color: '#ef4444', whiteSpace: 'nowrap' }}>Today</span>
          </div>

          {releases.map((r, i) => {
            const isPlanned = r.progress === 0 && r.status !== 'released';
            const barColor = getTimelineBarColor(r);
            return (
              <div key={r.id} className="relative" style={{ height: '50px', borderBottom: '1px solid #f1f5f9' }}>
                <div
                  onClick={() => onBarClick(r)}
                  onMouseMove={e => handleBarHover(e, r)}
                  onMouseLeave={e => { setHoveredRelease(null); e.currentTarget.style.filter = ''; }}
                  className="absolute cursor-pointer"
                  style={{
                    left: `${r.barLeft}%`, width: `${r.barWidth}%`,
                    height: '24px', top: '6px', borderRadius: '4px',
                    background: isPlanned ? 'transparent' : barColor,
                    border: isPlanned ? `1.5px dashed #cbd5e1` : 'none',
                    animation: 'barGrow 0.4s ease-out both',
                    animationDelay: `${i * 40}ms`,
                    transformOrigin: 'left center',
                    transition: 'filter 100ms',
                    zIndex: 1,
                    overflow: 'hidden',
                    minWidth: '40px',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(0.88)')}
                >
                  {/* Progress fill inside bar */}
                  {r.progress > 0 && !isPlanned && (
                    <div style={{ width: `${r.progress}%`, height: '100%', background: 'rgba(255,255,255,0.35)', position: 'absolute', left: 0, top: 0 }} />
                  )}
                  <span style={{ fontSize: '11px', fontWeight: 700, color: isPlanned ? '#94a3b8' : '#fff', padding: '0 6px', lineHeight: '24px', position: 'relative', zIndex: 1, textShadow: isPlanned ? 'none' : '0 1px 2px rgba(0,0,0,0.3)' }}>
                    {r.progress}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {hoveredRelease && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: tooltipPos.x + 8, top: tooltipPos.y + 8,
            background: 'var(--bg-app, #fff)', border: '1px solid #e2e8f0', borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.1)', padding: '12px',
            animation: 'fadeInUp 150ms ease both', minWidth: '200px',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{hoveredRelease.name}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Status: {getStatusConfig(hoveredRelease.status).label}</div>
          <div style={{ fontSize: '12px', marginTop: '2px' }}>
            <span style={{ color: '#64748b' }}>Health: </span>
            <span style={{ color: getHealthColor(hoveredRelease.health), fontWeight: 600 }}>{hoveredRelease.health} ({getHealthDisplay(hoveredRelease.health)})</span>
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Progress: {hoveredRelease.progress}%</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Target: {hoveredRelease.targetDate}</div>
        </div>
      )}
    </div>
  );
}
