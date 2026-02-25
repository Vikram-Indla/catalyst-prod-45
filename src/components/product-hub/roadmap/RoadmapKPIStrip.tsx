/**
 * Product Roadmap — 4 KPI cards
 * Defect 7 fix: visible borders (#E2E8F0), shadow, bold values
 */
import React from 'react';
import type { RoadmapStats } from './types/roadmap.types';
import { INK, SURFACE } from './constants/roadmap.constants';

interface RoadmapKPIStripProps {
  stats: RoadmapStats;
}

const cardStyle: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid #E2E8F0',
  borderRadius: 10,
  padding: '14px 18px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
};

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: '#94A3B8',
};

const valueStyle: React.CSSProperties = {
  fontSize: 26,
  fontWeight: 800,
  color: '#0F172A',
  letterSpacing: '-0.02em',
  marginTop: 4,
};

export function RoadmapKPIStrip({ stats }: RoadmapKPIStripProps) {
  return (
    <div
      className="grid grid-cols-4 gap-3 px-6 py-3"
      style={{ background: SURFACE.page, borderBottom: `1px solid ${SURFACE.borderLight}` }}
    >
      {/* On Roadmap */}
      <div style={cardStyle}>
        <div style={labelStyle}>On Roadmap</div>
        <div style={valueStyle}>{stats.totalOnRoadmap}</div>
        <div style={{ fontSize: 11, fontWeight: 500, color: INK[4], marginTop: 2 }}>of {stats.totalInitiatives} total initiatives</div>
      </div>

      {/* By Status */}
      <div style={cardStyle}>
        <div style={labelStyle}>By Status</div>
        <div className="flex items-baseline gap-2" style={{ marginTop: 4 }}>
          <span style={{ fontSize: 26, fontWeight: 800, color: '#16A34A', letterSpacing: '-0.02em' }}>{stats.activeCount}</span>
          <span style={{ fontSize: 11, fontWeight: 500, color: INK[3] }}>Active</span>
          <span style={{ fontSize: 26, fontWeight: 800, color: INK[4], marginLeft: 8, letterSpacing: '-0.02em' }}>{stats.validationCount}</span>
          <span style={{ fontSize: 11, fontWeight: 500, color: INK[3] }}>Validation</span>
        </div>
      </div>

      {/* This Quarter */}
      <div style={cardStyle}>
        <div style={labelStyle}>This Quarter</div>
        <div style={valueStyle}>{stats.currentQuarter}</div>
        <div style={{ fontSize: 11, fontWeight: 500, color: INK[4], marginTop: 2 }}>Active initiatives</div>
      </div>

      {/* By Type */}
      <div style={cardStyle}>
        <div style={labelStyle}>By Type</div>
        <div className="flex items-baseline gap-2" style={{ marginTop: 4 }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#2563EB' }}>{stats.projectCount}</span>
          <span style={{ fontSize: 10, fontWeight: 500, color: INK[3] }}>Proj</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#0D9488', marginLeft: 4 }}>{stats.enhancementCount}</span>
          <span style={{ fontSize: 10, fontWeight: 500, color: INK[3] }}>Enh</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#D97706', marginLeft: 4 }}>{stats.improvementCount}</span>
          <span style={{ fontSize: 10, fontWeight: 500, color: INK[3] }}>Imp</span>
        </div>
      </div>
    </div>
  );
}