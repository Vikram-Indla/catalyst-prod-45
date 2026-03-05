/**
 * R360CriticalityBanner — "Why Critical" explanation banner
 * Dynamically built from primaryMetrics — never hardcoded.
 */
import React from 'react';
import type { PrimaryMetric, PeerComparisonRow } from '@/services/r360CriticalityService';

interface R360CriticalityBannerProps {
  label: string;
  percentile: number;
  irreplaceabilityRatio: number;
  isSinglePointOfFailure: boolean;
  primaryMetrics: PrimaryMetric[];
  peerComparison: PeerComparisonRow[];
  roleName?: string;
  loading?: boolean;
}

function formatMetricValue(value: number, unit: string): string {
  if (unit === 'pct') return `${value}%`;
  if (unit === 'hours') return `${value}h`;
  if (unit === 'ratio') return `${value}×`;
  return String(value);
}

export const R360CriticalityBanner: React.FC<R360CriticalityBannerProps> = ({
  label, irreplaceabilityRatio, isSinglePointOfFailure,
  primaryMetrics, peerComparison, roleName, loading,
}) => {
  if (loading) {
    return (
      <div style={{
        background: '#EBF0FC', borderLeft: '5px solid #1D55D4',
        borderRadius: 6, padding: '14px 16px', marginBottom: 12,
      }}>
        <div style={{ height: 12, width: 200, background: '#C7D5F8', borderRadius: 3, marginBottom: 8 }} />
        <div style={{ height: 10, width: '90%', background: '#C7D5F8', borderRadius: 3, marginBottom: 6 }} />
        <div style={{ height: 10, width: '70%', background: '#C7D5F8', borderRadius: 3 }} />
      </div>
    );
  }

  if (!peerComparison.length || !primaryMetrics.length) return null;

  const currentRow = peerComparison.find(p => p.isCurrentResource);
  if (!currentRow) return null;

  const peerCount = peerComparison.length;
  const sorted = [...peerComparison].sort((a, b) => b.totalScore - a.totalScore);
  const overallRank = sorted.findIndex(p => p.isCurrentResource) + 1;

  // Build per-metric rank text for top 2 primary metrics
  const metricTexts = primaryMetrics.slice(0, 2).map(pm => {
    const metricVals = peerComparison
      .map(p => ({ id: p.peerId, isCurrent: p.isCurrentResource, value: p.metrics?.[pm.artifactType]?.value ?? 0 }))
      .sort((a, b) => b.value - a.value);
    const rank = metricVals.findIndex(v => v.isCurrent) + 1;
    const val = currentRow.metrics?.[pm.artifactType]?.value ?? 0;
    const formatted = formatMetricValue(val, pm.unit);
    return `#${rank} in ${pm.label} (${formatted})`;
  });

  const bodyText = `Ranked ${metricTexts.join(' and ')} among ${peerCount} peers in the same role.`;

  return (
    <div style={{
      background: '#EBF0FC', borderLeft: '5px solid #1D55D4',
      borderRadius: 6, padding: '14px 16px', marginBottom: 12,
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: '#1340A8',
        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6,
      }}>
        Why {label} · {roleName || 'Role'} Cohort
      </div>
      <div style={{ fontSize: 12, color: '#2D3A4A', lineHeight: 1.6 }}>
        {bodyText}
        {isSinglePointOfFailure && (
          <span style={{ fontWeight: 700 }}>
            {' '}Carries {Math.round(irreplaceabilityRatio * 100)}% of the team's {primaryMetrics[0].label}. No peer substitution available.
          </span>
        )}
      </div>
    </div>
  );
};
