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

const BUSINESS_REQUEST_COLOR = '#B38600';

export function RoadmapKPIStrip({ stats }: RoadmapKPIStripProps) {
  const { isDark } = useTheme();
  const ink = isDark ? INK_DARK : INK;
  const surface = isDark ? SURFACE_DARK : SURFACE;

  const cardStyle: React.CSSProperties = {
    background: isDark ? 'transparent' : '#FFFFFF',
    border: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`,
    borderRadius: 12,
    padding: '14px 18px',
    boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: ink[4],
    marginBottom: 6,
  };

  const valueStyle: React.CSSProperties = {
    fontFamily: FONT.heading,
    fontSize: 28,
    fontWeight: 700,
    color: ink[1],
    letterSpacing: '-0.03em',
    lineHeight: 1.1,
  };


  return (
    <div
      className="grid grid-cols-4 gap-3 px-6 py-3"
      style={{ background: surface.page, borderBottom: `1px solid ${surface.borderLight}` }}
    >
      {/* On Roadmap */}
      <div style={cardStyle}>
        <div style={labelStyle}>On Roadmap</div>
        <div style={valueStyle}>{stats.totalOnRoadmap}</div>
        <div style={{ fontSize: 11, fontWeight: 500, color: ink[4], marginTop: 2 }}>of {stats.totalInitiatives} total initiatives</div>
      </div>

      {/* By Status */}
      <div style={cardStyle}>
        <div style={labelStyle}>By Status</div>
        <div className="flex items-baseline gap-2" style={{ marginTop: 4 }}>
          <span style={{ fontFamily: FONT.heading, fontSize: 26, fontWeight: 700, color: '#16A34A', letterSpacing: '-0.03em' }}>{stats.activeCount}</span>
          <span style={{ fontSize: 11, fontWeight: 500, color: ink[3] }}>Active</span>
          <span style={{ fontFamily: FONT.heading, fontSize: 26, fontWeight: 700, color: ink[4], marginLeft: 8, letterSpacing: '-0.03em' }}>{stats.validationCount}</span>
          <span style={{ fontSize: 11, fontWeight: 500, color: ink[3] }}>Validation</span>
        </div>
      </div>

      {/* This Quarter */}
      <div style={cardStyle}>
        <div style={labelStyle}>This Quarter</div>
        <div style={valueStyle}>{stats.currentQuarter}</div>
        <div style={{ fontSize: 11, fontWeight: 500, color: ink[4], marginTop: 2 }}>Active initiatives</div>
      </div>

      {/* Business Request indicator */}
      <div style={cardStyle}>
        <div style={labelStyle}>Work Item Type</div>
        <div className="flex items-center gap-2" style={{ marginTop: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: BUSINESS_REQUEST_COLOR, display: 'inline-block', flexShrink: 0 }} />
          <span style={{ fontFamily: FONT.heading, fontSize: 16, fontWeight: 700, color: BUSINESS_REQUEST_COLOR }}>Business Request</span>
        </div>
      </div>
    </div>
  );
}
