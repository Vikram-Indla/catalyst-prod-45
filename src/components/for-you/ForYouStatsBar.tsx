/**
 * ForYouStatsBar — Hub counts + project/reporter counts
 * MARAM V3.1 · fy- ring-fenced
 */

import React from 'react';

const HUB_DOT_COLORS: Record<string, string> = {
  Project: '#2563EB',
  Product: '#7C3AED',
  Task: '#EA580C',
  Incident: '#DC2626',
  Release: '#16A34A',
  Test: '#0891B2',
  Strategy: '#0891B2',
  Plan: '#6366F1',
};

interface ForYouStatsBarProps {
  hubCounts: Record<string, number>;
  projectCount: number;
  reporterCount: number;
}

export function ForYouStatsBar({ hubCounts, projectCount, reporterCount }: ForYouStatsBarProps) {
  const entries = Object.entries(hubCounts).filter(([, c]) => c > 0);
  if (entries.length === 0) return null;

  return (
    <div className="fy-stats-bar" style={{
      display: 'flex',
      alignItems: 'center',
      gap: 24,
      padding: '10px 0',
      marginBottom: 12,
      borderBottom: '1px solid var(--cp-bd, var(--divider))',
    }}>
      {entries.map(([hub, count]) => (
        <div key={hub} style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: HUB_DOT_COLORS[hub] || '#71717A',
            flexShrink: 0, alignSelf: 'center',
          }} />
          <span style={{ fontFamily: "'Sora', system-ui", fontSize: 16, fontWeight: 700, color: 'var(--fg-1)' }}>{count}</span>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-3)' }}>{hub}</span>
        </div>
      ))}
      <span style={{ color: 'var(--fg-4)' }}>|</span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontFamily: "'Sora', system-ui", fontSize: 14, fontWeight: 700, color: 'var(--fg-1)' }}>{projectCount}</span>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-3)' }}>projects</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontFamily: "'Sora', system-ui", fontSize: 14, fontWeight: 700, color: 'var(--fg-1)' }}>{reporterCount}</span>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-3)' }}>reporters</span>
      </div>
    </div>
  );
}
