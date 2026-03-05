/**
 * R360CohortSpectrum — Percentile position on a gradient track
 * Labels: Developing · Active Contributor · Core Contributor · Critical · Anchor
 */
import React from 'react';

interface R360CohortSpectrumProps {
  percentile: number; // 0–100
  label: string;
}

const LABELS = [
  'Developing',
  'Active Contributor',
  'Core Contributor',
  'Critical',
  'Anchor',
];

export const R360CohortSpectrum: React.FC<R360CohortSpectrumProps> = ({ percentile, label }) => {
  const pct = Math.min(100, Math.max(0, percentile));
  // Map label to closest match
  const matchLabel = (l: string) => {
    if (label.includes('Anchor')) return l === 'Anchor';
    if (label.includes('Critical')) return l === 'Critical';
    if (label.includes('Core')) return l === 'Core Contributor';
    if (label.includes('Active')) return l === 'Active Contributor';
    return l === 'Developing';
  };

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Track */}
      <div style={{
        position: 'relative', height: 8, borderRadius: 4, overflow: 'visible',
        background: 'linear-gradient(90deg, #D1D9E0 0%, #93C5FD 40%, #3B82F6 70%, #1D55D4 100%)',
      }}>
        {/* Marker */}
        <div style={{
          position: 'absolute',
          left: `${pct}%`,
          top: '50%',
          width: 16, height: 16,
          borderRadius: '50%',
          background: '#FFFFFF',
          border: '3px solid #1D55D4',
          boxShadow: '0 0 0 3px rgba(29,85,212,0.20)',
          transform: 'translate(-50%, -50%)',
          transition: 'left 600ms ease-out',
        }} />
      </div>

      {/* Labels */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        marginTop: 6, padding: '0 2px',
      }}>
        {LABELS.map(l => (
          <span key={l} style={{
            fontSize: 9.5,
            fontWeight: matchLabel(l) ? 700 : 500,
            color: matchLabel(l) ? '#1D55D4' : '#7A8A96',
          }}>
            {l}
          </span>
        ))}
      </div>
    </div>
  );
};
