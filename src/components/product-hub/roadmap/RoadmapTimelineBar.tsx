/**
 * Product Roadmap — Individual initiative timeline bar
 * Theme-aware tooltip
 */
import React, { useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useTheme } from '@/hooks/useTheme';
import type { RoadmapInitiative } from './types/roadmap.types';
import { BUSINESS_REQUEST_COLOR, FONT, INK, INK_DARK, SURFACE, SURFACE_DARK } from './constants/roadmap.constants';

interface RoadmapTimelineBarProps {
  item: RoadmapInitiative;
  left: number;
  width: number;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
}

export function RoadmapTimelineBar({ item, left, width, isSelected, isHovered, onClick }: RoadmapTimelineBarProps) {
  const { isDark } = useTheme();
  const ink = isDark ? INK_DARK : INK;
  const surface = isDark ? SURFACE_DARK : SURFACE;

  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const tooltipTimer = useRef<ReturnType<typeof setTimeout>>();

  const barGradient = `linear-gradient(135deg, ${BUSINESS_REQUEST_COLOR}, #8A6800)`;
  const barColor = BUSINESS_REQUEST_COLOR;
  const isOverdue = item.status !== 'Completed' && item.progress < 100 && item.hasRealEndDate && new Date(item.endDate) < new Date();
  const isFallbackEnd = !item.hasRealEndDate;

  const fmtShort = (d: string) => {
    try { return format(parseISO(d), 'd MMM'); } catch { return ''; }
  };
  const dateLabel = `${fmtShort(item.startDate)} → ${fmtShort(item.endDate)}`;

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

  const tooltipBg = isDark ? '#1A1A1A' : '#FFFFFF';
  const tooltipShadow = isDark ? '0 20px 60px rgba(0,0,0,0.4)' : '0 20px 60px rgba(0,0,0,0.12)';
  const progressTrackBg = isDark ? '#2E2E2E' : surface.borderLight;

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-label={`${item.initiativeKey}: ${item.titleEn}`}
        onClick={onClick}
        onKeyDown={e => e.key === 'Enter' && onClick()}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="absolute top-1/2 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        style={{
          left: `${left}%`,
          width: `${Math.max(width, 2)}%`,
          height: 26,
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          borderRadius: 6,
          background: isOverdue ? '#EF4444' : barGradient,
          border: 'none',
          opacity: 1,
          transform: isHovered ? 'translateY(calc(-50% - 1px))' : 'translateY(-50%)',
          boxShadow: isDark
            ? 'none'
            : (isHovered || isSelected
              ? '0 4px 8px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.08)'
              : '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.06)'),
          filter: isHovered ? 'brightness(1.05)' : 'none',
          zIndex: isSelected ? 10 : isHovered ? 5 : 1,
          transition: 'transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease',
        }}
      >
        {/* Progress fill */}
        {item.progress > 0 && (
          <div
            className="absolute left-0 top-0 bottom-0"
            style={{
              width: `${Math.min(100, item.progress)}%`,
              background: 'rgba(255,255,255,0.18)',
              borderRight: item.progress < 100 ? '2px solid rgba(255,255,255,0.35)' : 'none',
              borderRadius: '5px 0 0 5px',
              zIndex: 0,
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Title text */}
        {width > 5 && (
          <span
            className="relative truncate"
            style={{
              zIndex: 1, fontSize: 11, fontWeight: 600,
              color: '#FFFFFF',
              paddingLeft: 8, paddingRight: 4, lineHeight: '26px',
              flex: 1,
              textShadow: '0 1px 2px rgba(0,0,0,0.15)',
            }}
          >
            {width > 12 ? item.titleEn : item.initiativeKey}
          </span>
        )}

        {/* Date label on bar */}
        {width > 18 && (
          <span
            className="relative flex-shrink-0"
            style={{
              zIndex: 1,
              fontFamily: FONT.mono,
              fontSize: 9,
              fontWeight: 500,
              color: 'rgba(255,255,255,0.7)',
              paddingRight: 8,
              paddingLeft: 4,
            }}
          >
            {dateLabel}
          </span>
        )}

        {/* Estimated end date indicator */}
        {isFallbackEnd && (
          <div style={{
            position: 'absolute', right: 0, top: 0, bottom: 0,
            width: 3, background: 'rgba(255,255,255,0.4)',
            borderRadius: '0 5px 5px 0',
          }} />
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
              className="absolute"
              title={m.title}
              style={{
                left: `${mPos}%`, top: '50%',
                width: 7, height: 7, marginTop: -3.5, marginLeft: -3.5,
                background: m.completed ? '#FFFFFF' : barColor,
                border: '2px solid #FFFFFF', borderRadius: 1,
                transform: 'rotate(45deg)', zIndex: 3,
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
            background: tooltipBg, border: `1px solid ${surface.border}`, borderRadius: 12,
            boxShadow: tooltipShadow, pointerEvents: 'none',
            maxWidth: 320, minWidth: 260, padding: 12,
            fontFamily: FONT.body,
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 13, color: ink[1], marginBottom: 6 }}>
            {item.initiativeKey}: {item.titleEn}
          </div>
          <div className="flex items-center gap-1.5" style={{ fontSize: 12, color: ink[3], marginBottom: 4 }}>
            <Calendar className="w-3 h-3" />
            {fmtDate(item.startDate)} → {fmtDate(item.endDate)}
            {isFallbackEnd && <span style={{ fontSize: 10, color: ink[4], fontStyle: 'italic' }}>(est.)</span>}
          </div>
          <div className="flex items-center gap-2">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: barColor }} />
            <span style={{ fontSize: 11, fontWeight: 500, color: ink[2] }}>
              {typeConfig?.label || item.type}
            </span>
            {item.progress > 0 && (
              <div className="flex items-center gap-1 ml-auto">
                <div style={{ width: 60, height: 4, background: progressTrackBg, borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${item.progress}%`, height: '100%', background: barColor, borderRadius: 999 }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: ink[1] }}>{item.progress}%</span>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
