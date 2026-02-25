/**
 * Product Roadmap — 4 KPI cards
 * Polish: font weights (label=700, value=800), 4px grid spacing
 */
import React from 'react';
import type { RoadmapStats } from './types/roadmap.types';
import { INK, SURFACE } from './constants/roadmap.constants';

interface RoadmapKPIStripProps {
  stats: RoadmapStats;
}

const cardStyle: React.CSSProperties = {
  background: SURFACE.card,
  border: `1px solid ${SURFACE.borderLight}`,
  borderRadius: 10,
  padding: '12px 16px',
};

export function RoadmapKPIStrip({ stats }: RoadmapKPIStripProps) {
  return (
    <div
      className="grid grid-cols-4 gap-3 px-6 py-3"
      style={{ background: SURFACE.page, borderBottom: `1px solid ${SURFACE.borderLight}` }}
    >
      {/* On Roadmap */}
      <div style={cardStyle}>
        <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: INK[3] }}>On Roadmap</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: INK[1], marginTop: 4 }}>{stats.totalOnRoadmap}</div>
        <div style={{ fontSize: 11, fontWeight: 500, color: INK[4], marginTop: 2 }}>of {stats.totalInitiatives} total initiatives</div>
      </div>

      {/* By Status */}
      <div style={cardStyle}>
        <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: INK[3] }}>By Status</div>
        <div className="flex items-baseline gap-2" style={{ marginTop: 4 }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: '#16A34A' }}>{stats.activeCount}</span>
          <span style={{ fontSize: 11, fontWeight: 500, color: INK[3] }}>Active</span>
          <span style={{ fontSize: 22, fontWeight: 800, color: INK[4], marginLeft: 8 }}>{stats.validationCount}</span>
          <span style={{ fontSize: 11, fontWeight: 500, color: INK[3] }}>Validation</span>
        </div>
      </div>

      {/* This Quarter */}
      <div style={cardStyle}>
        <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: INK[3] }}>This Quarter</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: INK[1], marginTop: 4 }}>{stats.currentQuarter}</div>
        <div style={{ fontSize: 11, fontWeight: 500, color: INK[4], marginTop: 2 }}>Active initiatives</div>
      </div>

      {/* By Type */}
      <div style={cardStyle}>
        <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: INK[3] }}>By Type</div>
        <div className="flex items-baseline gap-2" style={{ marginTop: 4 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#2563EB' }}>{stats.projectCount}</span>
          <span style={{ fontSize: 10, fontWeight: 500, color: INK[3] }}>Proj</span>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#0D9488', marginLeft: 4 }}>{stats.enhancementCount}</span>
          <span style={{ fontSize: 10, fontWeight: 500, color: INK[3] }}>Enh</span>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#D97706', marginLeft: 4 }}>{stats.improvementCount}</span>
          <span style={{ fontSize: 10, fontWeight: 500, color: INK[3] }}>Imp</span>
        </div>
      </div>
    </div>
  );
}
