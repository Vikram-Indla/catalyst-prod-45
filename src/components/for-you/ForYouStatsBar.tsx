/**
 * ForYouStatsBar — Hub counts + project/reporter counts
 * MARAM V3.1 · fy- ring-fenced
 */

import React from 'react';

const HUB_DOT_COLORS: Record<string, string> = {
  Project: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563EB))',
  Product: 'var(--cp-purple-60, #7C3AED)',
  Task: 'var(--ds-background-warning-bold, #E2B203)',
  Incident: 'var(--ds-text-danger, var(--cp-danger, #DC2626))',
  Release: 'var(--ds-text-success, var(--cp-success, #16A34A))',
  Test: 'var(--ds-link, #0C66E4)',
  Strategy: 'var(--ds-link, #0C66E4)',
  Plan: 'var(--ds-background-discovery-bold, #6366f1)',
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
            background: HUB_DOT_COLORS[hub] || 'var(--ds-text-subtlest, #626F86)',
            flexShrink: 0, alignSelf: 'center',
          }} />
          <span style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 'var(--ds-font-size-500)', fontWeight: 700, color: 'var(--fg-1)' }}>{count}</span>
          <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 500, color: 'var(--fg-3)' }}>{hub}</span>
        </div>
      ))}
      <span style={{ color: 'var(--fg-4)' }}>|</span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 'var(--ds-font-size-400)', fontWeight: 700, color: 'var(--fg-1)' }}>{projectCount}</span>
        <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 500, color: 'var(--fg-3)' }}>projects</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 'var(--ds-font-size-400)', fontWeight: 700, color: 'var(--fg-1)' }}>{reporterCount}</span>
        <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 500, color: 'var(--fg-3)' }}>reporters</span>
      </div>
    </div>
  );
}
