/**
 * R360PeerTable — Fully dynamic peer comparison table.
 * Column headers come from primaryMetrics — NEVER hardcoded.
 * Role-agnostic: changing roleCode changes all column headers automatically.
 */
import React from 'react';
import type { PrimaryMetric, PeerComparisonRow } from '@/services/r360CriticalityService';

interface R360PeerTableProps {
  primaryMetrics: PrimaryMetric[];
  peerComparison: PeerComparisonRow[];
  loading?: boolean;
}

function formatValue(value: number, unit: string): string {
  if (unit === 'pct') return `${value}%`;
  if (unit === 'hours') return `${value}h`;
  if (unit === 'ratio') return `${value}×`;
  return String(value);
}

export const R360PeerTable: React.FC<R360PeerTableProps> = ({
  primaryMetrics, peerComparison, loading,
}) => {
  if (loading) {
    return (
      <div style={{ marginBottom: 16 }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{
            display: 'flex', gap: 8, marginBottom: 6, padding: '6px 0',
          }}>
            <div style={{ width: 130, height: 14, background: '#E2E8F0', borderRadius: 3 }} />
            <div style={{ flex: 1, height: 14, background: '#E2E8F0', borderRadius: 3 }} />
            <div style={{ flex: 1, height: 14, background: '#E2E8F0', borderRadius: 3 }} />
            <div style={{ width: 80, height: 14, background: '#E2E8F0', borderRadius: 3 }} />
          </div>
        ))}
      </div>
    );
  }

  if (!peerComparison.length) {
    return (
      <div style={{
        padding: '20px 0', textAlign: 'center',
        fontSize: 12, color: '#7A8A96', fontStyle: 'italic',
      }}>
        No peers found with this role in shared releases.
      </div>
    );
  }

  // Compute max values per metric for bar width scaling
  const maxValues: Record<string, number> = {};
  for (const pm of primaryMetrics) {
    maxValues[pm.artifactType] = Math.max(
      1,
      ...peerComparison.map(p => p.metrics?.[pm.artifactType]?.value ?? 0)
    );
  }

  // Items per release: total score as proxy
  const maxScore = Math.max(1, ...peerComparison.map(p => p.totalScore));

  const visibleMetrics = primaryMetrics.slice(0, 2);

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Column Headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `130px ${visibleMetrics.map(() => '1fr').join(' ')} 80px`,
        gap: 8, padding: '0 0 6px 0',
        borderBottom: '1.5px solid #D1D9E0',
        marginBottom: 4,
      }}>
        <span style={{
          fontSize: 10, fontWeight: 700, color: '#536070',
          textTransform: 'uppercase', letterSpacing: '0.07em',
        }}>
          Name
        </span>
        {visibleMetrics.map(pm => (
          <span key={pm.artifactType} style={{
            fontSize: 10, fontWeight: 700, color: '#536070',
            textTransform: 'uppercase', letterSpacing: '0.07em',
          }}>
            {pm.label}
          </span>
        ))}
        <span style={{
          fontSize: 10, fontWeight: 700, color: '#536070',
          textTransform: 'uppercase', letterSpacing: '0.07em',
          textAlign: 'right',
        }}>
          Items / Rel
        </span>
      </div>

      {/* Rows */}
      {peerComparison.slice(0, 8).map((peer) => {
        const isCurrent = peer.isCurrentResource;
        return (
          <div
            key={peer.peerId}
            style={{
              display: 'grid',
              gridTemplateColumns: `130px ${visibleMetrics.map(() => '1fr').join(' ')} 80px`,
              gap: 8,
              padding: '7px 0',
              borderBottom: '1px solid #E2E8F0',
              background: isCurrent ? '#EBF0FC' : 'transparent',
              borderLeft: isCurrent ? '4px solid #1D55D4' : '4px solid transparent',
              paddingLeft: 8,
            }}
          >
            {/* Name */}
            <div style={{
              fontSize: 12, fontWeight: isCurrent ? 700 : 500,
              color: isCurrent ? '#1340A8' : '#2D3A4A',
              display: 'flex', alignItems: 'center', gap: 6,
              overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
            }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {peer.peerName}
              </span>
              {isCurrent && (
                <span style={{
                  fontSize: 9, color: '#FFFFFF', background: '#1D55D4',
                  borderRadius: 2, padding: '1px 5px', fontWeight: 700,
                  flexShrink: 0, letterSpacing: '0.04em',
                }}>
                  YOU
                </span>
              )}
            </div>

            {/* Metric bar cells */}
            {visibleMetrics.map(pm => {
              const val = peer.metrics?.[pm.artifactType]?.value ?? 0;
              const max = maxValues[pm.artifactType];
              const pct = Math.round((val / max) * 100);
              return (
                <div key={pm.artifactType} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <div style={{
                    flex: 1, height: 6, background: '#D1D9E0', borderRadius: 3,
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%', borderRadius: 3,
                      width: `${pct}%`,
                      background: isCurrent ? '#1D55D4' : '#64748B',
                      transition: 'width 400ms ease-out',
                    }} />
                  </div>
                  <span style={{
                    fontSize: 12, fontWeight: 600,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: isCurrent ? '#1340A8' : '#2D3A4A',
                    minWidth: 36, textAlign: 'right',
                  }}>
                    {formatValue(val, pm.unit)}
                  </span>
                </div>
              );
            })}

            {/* Items / Release */}
            <div style={{
              fontSize: 12, fontWeight: 600,
              fontFamily: "'JetBrains Mono', monospace",
              color: isCurrent ? '#1340A8' : '#2D3A4A',
              textAlign: 'right',
              display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            }}>
              {peer.totalScore.toFixed(1)}
            </div>
          </div>
        );
      })}
    </div>
  );
};
