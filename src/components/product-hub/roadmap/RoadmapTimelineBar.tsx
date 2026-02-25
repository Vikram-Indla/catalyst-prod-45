/**
 * Product Roadmap — Individual initiative timeline bar
 * Polish: type-shadow hover, planned=dashed+55%, progress=white fill+border, milestone=8px diamond
 */
import React, { useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { RoadmapInitiative } from './types/roadmap.types';
import { TYPE_COLORS, FONT, INK, SURFACE } from './constants/roadmap.constants';

interface RoadmapTimelineBarProps {
  item: RoadmapInitiative;
  left: number;
  width: number;
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

  const fmtDate = (d: string) => {
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

  // Box shadow: type-colored glow on hover
  const hoverShadow = `0 4px 16px ${finalColor}40`;

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-label={`${item.initiativeKey}: ${item.titleEn}, ${TYPE_COLORS[item.type]?.label || item.type}, ${item.status}`}
        onClick={onClick}
        onKeyDown={e => e.key === 'Enter' && onClick()}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="absolute top-1/2 rounded cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        style={{
          left: `${left}%`,
          width: `${Math.max(width, 3)}%`,
          height: 28,
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          background: isPlanned ? 'transparent' : finalColor,
          border: isPlanned ? `2px dashed ${finalColor}` : 'none',
          opacity: isPlanned ? 0.55 : 1,
          transform: isHovered ? 'translateY(calc(-50% - 2px)) scaleY(1.08)' : 'translateY(-50%)',
          boxShadow: isHovered || isSelected ? hoverShadow : 'none',
          zIndex: isSelected ? 10 : isHovered ? 5 : 1,
          transition: 'transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease',
        }}
      >
        {/* Planned fill — dashed border handles the visual, add subtle bg */}
        {isPlanned && (
          <div className="absolute inset-0 rounded" style={{ background: `${finalColor}18` }} />
        )}

        {/* Progress fill — white overlay with right border */}
        {item.progress > 0 && (
          <div
            className="absolute left-0 top-0 bottom-0 rounded-l"
            style={{
              width: `${Math.min(100, item.progress)}%`,
              background: 'rgba(255,255,255,0.2)',
              borderRight: item.progress < 100 ? '2px solid rgba(255,255,255,0.5)' : 'none',
              zIndex: 0,
            }}
          />
        )}

        {/* Label */}
        {width > 6 && (
          <span
            className="relative truncate"
            style={{ zIndex: 1, fontSize: 12, fontWeight: 600, color: '#FFFFFF', paddingLeft: 8, paddingRight: 8, lineHeight: '28px', textShadow: isPlanned ? 'none' : '0 1px 2px rgba(0,0,0,0.2)' }}
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

        {/* Milestone diamonds — 8px, rotated 45deg, 2px white border, type-colored fill */}
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
              className="absolute"
              title={m.title}
              style={{
                left: `${mPos}%`,
                top: '50%',
                width: 8, height: 8,
                marginTop: -4,
                marginLeft: -4,
                background: m.completed ? '#FFFFFF' : finalColor,
                border: '2px solid #FFFFFF',
                borderRadius: 1,
                transform: 'rotate(45deg)',
                zIndex: 3,
                boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
              }}
            />
          );
        })}
      </div>

      {/* Tooltip */}
      {showTooltip && createPortal(
        <div
          className="animate-scale-in"
          style={{
            position: 'fixed', left: tooltipPos.x, top: tooltipPos.y, zIndex: 9999,
            background: '#FFFFFF', border: `1px solid ${SURFACE.border}`, borderRadius: 10,
            boxShadow: '0 20px 60px rgba(0,0,0,0.12)', pointerEvents: 'none',
            maxWidth: 320, minWidth: 260, padding: 12,
            fontFamily: FONT.body,
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 13, color: INK[1], marginBottom: 6 }}>
            {item.initiativeKey}: {item.titleEn}
          </div>
          <div className="flex items-center gap-1.5" style={{ fontSize: 12, color: INK[3], marginBottom: 4 }}>
            <Calendar className="w-3 h-3" />
            {fmtDate(item.startDate)} → {fmtDate(item.endDate)}
          </div>
          <div className="flex items-center gap-2">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: finalColor }} />
            <span style={{ fontSize: 11, fontWeight: 500, color: INK[2] }}>
              {TYPE_COLORS[item.type]?.label || item.type}
            </span>
            {item.progress > 0 && (
              <div className="flex items-center gap-1 ml-auto">
                <div style={{ width: 60, height: 4, background: SURFACE.borderLight, borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${item.progress}%`, height: '100%', background: finalColor, borderRadius: 999 }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: INK[1] }}>{item.progress}%</span>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
