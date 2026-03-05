/**
 * R360ExitRisk — Single Point of Failure warning strip.
 * ONLY render when isSinglePointOfFailure === true.
 */
import React from 'react';
import type { PrimaryMetric } from '@/services/r360CriticalityService';

interface R360ExitRiskProps {
  resourceName: string;
  primaryMetrics: PrimaryMetric[];
  irreplaceabilityRatio: number;
}

export const R360ExitRisk: React.FC<R360ExitRiskProps> = ({
  resourceName, primaryMetrics, irreplaceabilityRatio,
}) => {
  const primaryLabel = primaryMetrics[0]?.label ?? 'primary output';
  const ratioPct = Math.round(irreplaceabilityRatio * 100);
  const hasIncident = primaryMetrics.some(m =>
    m.artifactType.includes('incident')
  );

  return (
    <div style={{
      background: '#FEF2F2',
      border: '1.5px solid #FECACA',
      borderLeft: '4px solid #B91C1C',
      borderRadius: 6,
      padding: '12px 14px',
      marginBottom: 12,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6,
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: '#B91C1C', flexShrink: 0,
        }} />
        <span style={{
          fontSize: 10.5, fontWeight: 700, color: '#B91C1C',
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          Exit Risk
        </span>
      </div>
      <div style={{ fontSize: 12.5, color: '#2D3A4A', lineHeight: 1.6 }}>
        No substitution available for {primaryLabel} coverage. {resourceName} carries {ratioPct}% of the team's total.
        {hasIncident && ' Estimated resolution time impact: +3.1d per incident.'}
      </div>
    </div>
  );
};
