/**
 * Product Roadmap — Individual initiative timeline bar
 */
import React, { useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { RoadmapInitiative } from './types/roadmap.types';
import { TYPE_COLORS, FONT } from './constants/roadmap.constants';

interface RoadmapTimelineBarProps {
  item: RoadmapInitiative;
  left: number;  // percentage
  width: number; // percentage
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
}

export function RoadmapTimelineBar({ item, left, width, isSelected, isHovered, onClick }: RoadmapTimelineBarProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const tooltipTimer = useRef<ReturnType<typeof setTimeout>>();

  const barColor = TYPE_COLORS[item.type]?.solid || '#94A3B8';
  const isOverdue = item.status !== 'Completed' && item.progress < 100 && new Date(item.endDate) < new Date();
  const finalColor = isOverdue ? '#EF4444' : barColor;
  const isPlanned = item.status === 'Planned';

  const formatDate = (d: string) => {
    try { return format(parseISO(d), 'MMM d, yyyy'); } catch { return d; }
  };

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const tw = 300;
    let x = rect.left + rect.width / 2 - tw / 2;
    let y = rect.top - 140;
    if (y < 60) y = rect.bottom + 8;
    if (x < 10) x = 10;
    if (x + tw > window.innerWidth - 10) x = window.innerWidth - tw - 10;
    setTooltipPos({ x, y });
    tooltipTimer.current = setTimeout(() => setShowTooltip(true), 250);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setShowTooltip(false);
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
  }, []);

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={e => e.key === 'Enter' && onClick()}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="absolute top-1/2 -translate-y-1/2 rounded cursor-pointer transition-all duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-offset-1"
        style={{
          left: `${left}%`,
          width: `${Math.max(width, 3)}%`,
          height: 28,
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          background: finalColor,
          opacity: isPlanned ? 0.55 : 1,
          border: isPlanned ? `2px dashed ${finalColor}` : 'none',
          transform: isHovered ? 'translateY(calc(-50% - 2px)) scaleY(1.08)' : undefined,
          boxShadow: isHovered || isSelected ? `0 4px 12px ${finalColor}40` : undefined,
          zIndex: isSelected ? 10 : isHovered ? 5 : 1,
          // @ts-ignore
          '--tw-ring-color': finalColor,
        }}
      >
        {/* Progress fill */}
        {item.progress > 0 && (
          <div
            className="absolute left-0 top-0 bottom-0 rounded-l"
            style={{ width: `${Math.min(100, item.progress)}%`, background: 'rgba(255,255,255,0.3)', zIndex: 0 }}
          />
        )}

        {/* Label */}
        {width > 6 && (
          <span
            className="relative truncate"
            style={{ zIndex: 1, fontSize: 12, fontWeight: 600, color: '#FFFFFF', paddingLeft: 8, paddingRight: 8, lineHeight: '28px' }}
          >
            {width > 12 ? item.titleEn : item.initiativeKey}
          </span>
        )}

        {/* Progress pill */}
        {item.progress > 0 && width > 15 && (
          <span
            className="absolute right-2 top-1/2 -translate-y-1/2"
            style={{ fontSize: 10, fontWeight: 700, color: '#FFFFFF', background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: '1px 6px', zIndex: 2 }}
          >
            {item.progress}%
          </span>
        )}

        {/* Milestone diamonds */}
        {item.milestones.map(m => {
          const mDate = new Date(m.targetDate);
          const barStart = new Date(item.startDate);
          const barEnd = new Date(item.endDate);
          const barDuration = barEnd.getTime() - barStart.getTime();
          if (barDuration <= 0) return null;
          const mPos = ((mDate.getTime() - barStart.getTime()) / barDuration) * 100;
          if (mPos < 0 || mPos > 100) return null;
          return (
            <div
              key={m.id}
              className="absolute top-1/2 -translate-y-1/2"
              style={{
                left: `${mPos}%`,
                width: 8, height: 8,
                background: m.completed ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
                transform: 'translateY(-50%) rotate(45deg)',
                zIndex: 3,
              }}
            />
          );
        })}
      </div>

      {/* Tooltip */}
      {showTooltip && createPortal(
        <div style={{
          position: 'fixed', left: tooltipPos.x, top: tooltipPos.y, zIndex: 9999,
          background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10,
          boxShadow: '0 20px 60px rgba(0,0,0,0.12)', pointerEvents: 'none',
          maxWidth: 320, minWidth: 260, padding: 12,
        }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#0F172A', marginBottom: 6 }}>
            {item.initiativeKey}: {item.titleEn}
          </div>
          <div className="flex items-center gap-1.5" style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>
            <Calendar className="w-3 h-3" />
            {formatDate(item.startDate)} → {formatDate(item.endDate)}
          </div>
          <div className="flex items-center gap-2">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: finalColor }} />
            <span style={{ fontSize: 11, fontWeight: 500, color: '#334155' }}>
              {TYPE_COLORS[item.type]?.label || item.type}
            </span>
            {item.progress > 0 && (
              <div className="flex items-center gap-1 ml-auto">
                <div style={{ width: 60, height: 4, background: '#F1F5F9', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${item.progress}%`, height: '100%', background: finalColor, borderRadius: 999 }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#0F172A' }}>{item.progress}%</span>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
