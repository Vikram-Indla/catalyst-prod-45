/**
 * CriticalityBadge — Displays role-aware criticality scoring
 * Includes: label badge, cohort spectrum, SPOF warning, peer comparison with DYNAMIC columns
 */
import React from 'react';
import type { CriticalityResult } from '@/services/r360CriticalityService';

interface Props {
  criticality: CriticalityResult | undefined;
  isLoading: boolean;
  roleName: string;
}

const LABEL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Anchor Resource':    { bg: '#DCFCE7', text: '#166534', border: '#BBF7D0' },
  'Critical Resource':  { bg: '#DBEAFE', text: '#1E40AF', border: '#BFDBFE' },
  'Core Contributor':   { bg: '#E0E7FF', text: '#3730A3', border: '#C7D2FE' },
  'Active Contributor': { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
  'Developing':         { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' },
};

export const CriticalityBadge: React.FC<Props> = ({ criticality, isLoading, roleName }) => {
  if (isLoading) {
    return (
      <div style={{ padding: '12px 20px', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ height: 20, width: 140, borderRadius: 4, background: '#F1F5F9' }} className="rai-skeleton" />
      </div>
    );
  }

  if (!criticality) return null;

  const colors = LABEL_COLORS[criticality.label] || LABEL_COLORS['Developing'];
  const primaryDesc = criticality.primaryMetrics.map(m => m.label).join(' + ');

  return (
    <div style={{ borderBottom: '1px solid #E2E8F0' }}>
      {/* Label + Percentile */}
      <div style={{ padding: '14px 20px 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          display: 'inline-block', padding: '3px 12px', borderRadius: 9999,
          fontSize: 11, fontWeight: 700,
          background: colors.bg, color: colors.text,
          border: `1px solid ${colors.border}`, letterSpacing: '0.02em',
        }}>
          {criticality.label}
        </span>
        <span style={{ fontSize: 11, color: '#64748B', fontFamily: "'JetBrains Mono', monospace" }}>
          P{criticality.percentile}
        </span>
      </div>

      {/* Why text */}
      <div style={{ padding: '0 20px 10px', fontSize: 11, color: '#475569', lineHeight: 1.5 }}>
        Based on <strong>{primaryDesc}</strong> relative to {roleName} peers.
      </div>

      {/* Cohort Spectrum */}
      <div style={{ padding: '0 20px 12px' }}>
        <div style={{ position: 'relative', height: 8, background: '#E2E8F0', borderRadius: 4, overflow: 'visible' }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: `${criticality.percentile}%`, borderRadius: 4,
            background: 'linear-gradient(90deg, #94A3B8, #2563EB)',
            transition: 'width 600ms ease-out',
          }} />
          <div style={{
            position: 'absolute', left: `${criticality.percentile}%`, top: -3,
            width: 14, height: 14, borderRadius: '50%',
            background: '#2563EB', border: '2px solid #FFFFFF',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transform: 'translateX(-50%)',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 9, color: '#94A3B8' }}>
          <span>Developing</span>
          <span>Anchor</span>
        </div>
      </div>

      {/* SPOF Warning */}
      {criticality.isSinglePointOfFailure && (
        <div style={{
          margin: '0 20px 12px', padding: '8px 12px',
          background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6,
          fontSize: 11, color: '#991B1B', lineHeight: 1.5,
        }}>
          ⚠ Carries {Math.round(criticality.irreplaceabilityRatio * 100)}% of team's {primaryDesc} output. Single point of failure risk.
        </div>
      )}

      {/* Peer Comparison — Dynamic Columns */}
      {criticality.peerComparison.length > 1 && (
        <div style={{ padding: '0 20px 14px' }}>
          <div style={{
            fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const,
            color: '#94A3B8', letterSpacing: '0.06em', marginBottom: 8,
          }}>
            Peer Comparison ({roleName})
          </div>

          {/* Column headers */}
          {criticality.primaryMetrics.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: `1fr ${criticality.primaryMetrics.map(() => '70px').join(' ')} 60px`,
              gap: 4, marginBottom: 6, fontSize: 9, fontWeight: 600,
              color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              <span>Name</span>
              {criticality.primaryMetrics.map(pm => (
                <span key={pm.artifactType} style={{ textAlign: 'right' }}>{pm.label}</span>
              ))}
              <span style={{ textAlign: 'right' }}>Score</span>
            </div>
          )}

          {/* Peer rows */}
          {criticality.peerComparison.slice(0, 6).map((peer) => {
            const maxScore = criticality.peerComparison[0]?.totalScore || 1;
            const pct = Math.round((peer.totalScore / maxScore) * 100);
            return (
              <div key={peer.peerId} style={{ marginBottom: 6 }}>
                {/* Data row */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: `1fr ${criticality.primaryMetrics.map(() => '70px').join(' ')} 60px`,
                  gap: 4, fontSize: 10,
                  fontWeight: peer.isCurrentResource ? 700 : 500,
                  color: peer.isCurrentResource ? '#1E40AF' : '#475569',
                  marginBottom: 2,
                }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {peer.isCurrentResource ? '★ You' : peer.peerName}
                  </span>
                  {criticality.primaryMetrics.map(pm => {
                    const mv = peer.metrics?.[pm.artifactType];
                    const val = mv?.value ?? 0;
                    const display = pm.unit === 'pct' ? `${val}%`
                      : pm.unit === 'hours' ? `${val}h`
                      : String(val);
                    return (
                      <span key={pm.artifactType} style={{
                        textAlign: 'right',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 10,
                      }}>
                        {display}
                      </span>
                    );
                  })}
                  <span style={{
                    textAlign: 'right',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    {peer.totalScore.toFixed(1)}
                  </span>
                </div>
                {/* Score bar */}
                <div style={{ height: 4, borderRadius: 2, background: '#E2E8F0', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 2,
                    width: `${pct}%`,
                    background: peer.isCurrentResource ? '#2563EB' : '#94A3B8',
                    transition: 'width 400ms ease-out',
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
