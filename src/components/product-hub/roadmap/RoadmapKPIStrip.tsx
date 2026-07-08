/**
 * Product Roadmap — 4 KPI cards
 * AUDIT #24: Sora heading font, 28px values
 * AUDIT #4: Entity Integration count added with amber dot
 */
import React from 'react';
import type { RoadmapStats } from './types/roadmap.types';
import { INK, INK_DARK, SURFACE, SURFACE_DARK, FONT } from './constants/roadmap.constants';
import { useTheme } from '@/hooks/useTheme';

interface RoadmapKPIStripProps {
  stats: RoadmapStats;
}

export function RoadmapKPIStrip({ stats }: RoadmapKPIStripProps) {
  const { isDark } = useTheme();
  const ink = isDark ? INK_DARK : INK;
  const surface = isDark ? SURFACE_DARK : SURFACE;

  const cardStyle: React.CSSProperties = {
    background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))',
    border: `1px solid ${'var(--cp-border, var(--cp-border, var(--cp-bg-sunken)))'}`,
    borderRadius: 12,
    padding: '12px 18px',
    boxShadow: isDark ? 'none' : '0 1px 3px var(--ds-shadow-raised, rgba(0,0,0,0.06))',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 'var(--ds-font-size-100)',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: ink[4],
    marginBottom: 4,
  };

  const valueStyle: React.CSSProperties = {
    fontFamily: FONT.heading,
    fontSize: 'var(--ds-font-size-800)',
    fontWeight: 700,
    color: ink[1],
    letterSpacing: '-0.03em',
    lineHeight: 1.1,
  };


  return (
    <div
      className="grid grid-cols-3 gap-3 px-6 py-3"
      style={{ background: surface.page, borderBottom: `1px solid ${surface.borderLight}` }}
    >
      {/* On Roadmap */}
      <div style={cardStyle}>
        <div style={labelStyle}>On Roadmap</div>
        <div style={valueStyle}>{stats.totalOnRoadmap}</div>
        <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 500, color: ink[4], marginTop: 0 }}>of {stats.totalInitiatives} total business requests</div>
      </div>

      {/* By Status */}
      <div style={cardStyle}>
        <div style={labelStyle}>By Status</div>
        <div className="flex items-baseline gap-2" style={{ marginTop: 4 }}>
          {/* success green only when there IS activity — a green "0" is semantic
              color used decoratively (audit A5/E3) */}
          <span style={{ fontFamily: FONT.heading, fontSize: 'var(--ds-font-size-800)', fontWeight: 700, color: stats.activeCount > 0 ? 'var(--ds-text-success)' : 'var(--ds-text)', letterSpacing: '-0.03em' }}>{stats.activeCount}</span>
          <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 500, color: ink[3] }}>Active</span>
          <span style={{ fontFamily: FONT.heading, fontSize: 'var(--ds-font-size-800)', fontWeight: 700, color: ink[4], marginLeft: 8, letterSpacing: '-0.03em' }}>{stats.validationCount}</span>
          <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 500, color: ink[3] }}>Validation</span>
        </div>
      </div>

      {/* This Quarter */}
      <div style={cardStyle}>
        <div style={labelStyle}>This Quarter</div>
        <div style={valueStyle}>{stats.currentQuarter}</div>
        <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 500, color: ink[4], marginTop: 0 }}>Active business requests</div>
      </div>
    </div>
  );
}
