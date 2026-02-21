/**
 * IdeationMatrixView — Impact vs Complexity scatter plot with 4 quadrants
 */
import React, { useState } from 'react';

interface Props {
  onOpenDetail: (key: string) => void;
}

interface DotData {
  key: string; left: number; bottom: number; size: number; color: string; title: string; impact: number; votes: number;
}

const DOTS: DotData[] = [
  { key: 'IDH-001', left: 32, bottom: 88, size: 32, color: 'rgba(22,163,74,0.8)', title: 'Unified Portal', impact: 4.40, votes: 12 },
  { key: 'IDH-002', left: 48, bottom: 78, size: 26, color: 'rgba(124,58,237,0.75)', title: 'AI Permit Classification', impact: 3.90, votes: 8 },
  { key: 'IDH-003', left: 65, bottom: 62, size: 20, color: 'rgba(37,99,235,0.6)', title: 'Factory Compliance', impact: 3.50, votes: 5 },
  { key: 'IDH-004', left: 38, bottom: 72, size: 28, color: 'rgba(37,99,235,0.6)', title: 'Bilingual Docs', impact: 3.70, votes: 9 },
  { key: 'IDH-005', left: 28, bottom: 92, size: 36, color: 'rgba(22,163,74,0.85)', title: 'Investor Onboarding', impact: 4.60, votes: 15 },
  { key: 'IDH-006', left: 82, bottom: 50, size: 22, color: 'rgba(217,119,6,0.6)', title: 'Predictive Maintenance', impact: 2.80, votes: 6 },
  { key: 'IDH-011', left: 68, bottom: 85, size: 30, color: 'rgba(124,58,237,0.7)', title: 'Regulatory Assessment', impact: 4.20, votes: 11 },
  { key: 'IDH-013', left: 42, bottom: 86, size: 34, color: 'rgba(22,163,74,0.8)', title: 'Payment Gateway', impact: 4.30, votes: 14 },
  { key: 'IDH-015', left: 85, bottom: 82, size: 28, color: 'rgba(217,119,6,0.65)', title: 'Data Sharing', impact: 4.10, votes: 10 },
  { key: 'IDH-009', left: 88, bottom: 20, size: 14, color: 'rgba(239,68,68,0.6)', title: 'Blockchain Cert', impact: 1.50, votes: -2 },
];

export default function IdeationMatrixView({ onOpenDetail }: Props) {
  const [hoveredDot, setHoveredDot] = useState<string | null>(null);

  return (
    <div style={{ padding: '16px 28px' }}>
      {/* Controls bar */}
      <div style={{ display: 'flex', gap: '24px', marginBottom: '16px', alignItems: 'center' }}>
        {[
          { label: 'X-Axis', value: 'Complexity (C)' },
          { label: 'Y-Axis', value: 'Strategic Value (I+M+A)' },
          { label: 'Size', value: 'Votes' },
        ].map(ctrl => (
          <div key={ctrl.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>{ctrl.label}:</span>
            <div style={{
              width: '160px', fontSize: '12px', padding: '5px 10px', background: '#FFFFFF',
              border: '1px solid #E2E8F0', borderRadius: '6px', color: '#334155', cursor: 'pointer',
            }}>
              {ctrl.value}
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{
          width: '100%', height: '520px', background: '#FFFFFF', border: '1px solid #E2E8F0',
          borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', position: 'relative', overflow: 'hidden',
        }}>
          {/* Grid area */}
          <div style={{ position: 'absolute', top: '40px', right: '40px', bottom: '50px', left: '60px' }}>
            {/* Quadrants */}
            {[
              { top: 0, left: 0, label: '⚡ Quick Wins', bg: 'rgba(22,163,74,0.04)', tc: 'rgba(22,163,74,0.35)' },
              { top: 0, left: '50%', label: '🎯 Big Bets', bg: 'rgba(37,99,235,0.04)', tc: 'rgba(37,99,235,0.3)' },
              { top: '50%', left: 0, label: '📋 Fill-Ins', bg: 'rgba(161,161,170,0.04)', tc: 'rgba(161,161,170,0.4)' },
              { top: '50%', left: '50%', label: '⚠ Money Pit', bg: 'rgba(239,68,68,0.04)', tc: 'rgba(239,68,68,0.3)' },
            ].map(q => (
              <div key={q.label} style={{
                position: 'absolute', top: q.top, left: q.left, width: '50%', height: '50%',
                background: q.bg, border: '1px dashed #E2E8F0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{
                  fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px',
                  color: q.tc,
                }}>
                  {q.label}
                </span>
              </div>
            ))}

            {/* Midlines */}
            <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px', background: '#E2E8F0' }} />
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: '#E2E8F0' }} />

            {/* Dots */}
            {DOTS.map(dot => (
              <div
                key={dot.key}
                onClick={() => onOpenDetail(dot.key)}
                onMouseEnter={() => setHoveredDot(dot.key)}
                onMouseLeave={() => setHoveredDot(null)}
                style={{
                  position: 'absolute',
                  left: `calc(${dot.left}% - ${dot.size / 2}px)`,
                  bottom: `calc(${dot.bottom}% - ${dot.size / 2}px)`,
                  width: `${dot.size}px`, height: `${dot.size}px`,
                  borderRadius: '50%', background: dot.color, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '9px', fontWeight: 700, color: '#FFFFFF',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  transform: hoveredDot === dot.key ? 'scale(1.4)' : 'scale(1)',
                  zIndex: hoveredDot === dot.key ? 10 : 2,
                  transition: 'all 0.2s',
                }}
              >
                {dot.key.replace('IDH-0', '')}

                {/* Tooltip */}
                {hoveredDot === dot.key && (
                  <div style={{
                    position: 'absolute', bottom: `${dot.size + 8}px`, left: '50%', transform: 'translateX(-50%)',
                    background: '#0F172A', color: '#FFFFFF', fontSize: '11px', borderRadius: '8px',
                    padding: '6px 10px', whiteSpace: 'nowrap', zIndex: 20,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  }}>
                    {dot.key} {dot.title} · {dot.impact.toFixed(2)} · {dot.votes} votes
                    <div style={{
                      position: 'absolute', bottom: '-4px', left: '50%', transform: 'translateX(-50%)',
                      width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
                      borderTop: '5px solid #0F172A',
                    }} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Axis labels */}
          <div style={{
            position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)',
            fontSize: '11px', fontWeight: 600, color: '#94A3B8', whiteSpace: 'nowrap',
          }}>
            ← LOW COMPLEXITY — HIGH COMPLEXITY →
          </div>
          <div style={{
            position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%) rotate(-90deg)',
            fontSize: '11px', fontWeight: 600, color: '#94A3B8', whiteSpace: 'nowrap',
          }}>
            ← LOW STRATEGIC VALUE — HIGH STRATEGIC VALUE →
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', marginTop: '16px',
      }}>
        {[
          { color: 'rgba(22,163,74,0.8)', label: 'Approved' },
          { color: 'rgba(124,58,237,0.7)', label: 'Under Review AI' },
          { color: 'rgba(37,99,235,0.6)', label: 'Submitted' },
          { color: 'rgba(217,119,6,0.6)', label: 'Under Review' },
          { color: 'rgba(239,68,68,0.6)', label: 'Rejected' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: l.color }} />
            <span style={{ fontSize: '11px', color: '#334155', fontWeight: 500 }}>{l.label}</span>
          </div>
        ))}
        <span style={{ fontSize: '11px', color: '#94A3B8' }}>Dot size = Vote count</span>
      </div>
    </div>
  );
}
