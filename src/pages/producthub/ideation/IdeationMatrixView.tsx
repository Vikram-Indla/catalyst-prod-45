/**
 * IdeationMatrixView — Impact vs Complexity scatter plot with 4 quadrants
 */
import React, { useState } from 'react';
import { ideas } from './ideation-data';

interface Props {
  onOpenDetail: (key: string) => void;
}

interface DotData {
  key: string; num: string; left: number; bottom: number; size: number; color: string;
  title: string; impact: number; votes: number; status: string;
}

const DOTS: DotData[] = [
  { key: 'IDH-001', num: '01', left: 30, bottom: 82, size: 32, color: '#16A34A', title: 'Unified Digital Services Portal', impact: 4.40, votes: 12, status: 'Converted' },
  { key: 'IDH-002', num: '02', left: 52, bottom: 75, size: 26, color: '#7C3AED', title: 'AI-Powered Permit Classification', impact: 3.90, votes: 8, status: 'Under Review' },
  { key: 'IDH-003', num: '03', left: 60, bottom: 53, size: 22, color: '#3B82F6', title: 'Real-Time Factory Compliance Dashboard', impact: 3.50, votes: 5, status: 'Submitted' },
  { key: 'IDH-004', num: '04', left: 40, bottom: 68, size: 26, color: '#7C3AED', title: 'Bilingual Document Generation Engine', impact: 3.70, votes: 9, status: 'Under Review' },
  { key: 'IDH-005', num: '05', left: 22, bottom: 90, size: 36, color: '#16A34A', title: 'Investor Onboarding Simplification', impact: 4.60, votes: 15, status: 'Approved' },
  { key: 'IDH-006', num: '06', left: 80, bottom: 42, size: 22, color: '#7C3AED', title: 'Predictive Maintenance for Legacy Systems', impact: 2.80, votes: 6, status: 'Under Review' },
  { key: 'IDH-007', num: '07', left: 68, bottom: 38, size: 20, color: '#3B82F6', title: 'Mobile-First Inspection App', impact: 3.20, votes: 4, status: 'Submitted' },
  { key: 'IDH-009', num: '09', left: 85, bottom: 15, size: 16, color: '#EF4444', title: 'Blockchain-Based Certificate Verification', impact: 1.50, votes: -2, status: 'Rejected' },
  { key: 'IDH-010', num: '10', left: 45, bottom: 48, size: 22, color: '#3B82F6', title: 'Stakeholder Communication Hub', impact: 3.30, votes: 7, status: 'Submitted' },
  { key: 'IDH-011', num: '11', left: 72, bottom: 80, size: 30, color: '#7C3AED', title: 'Automated Regulatory Impact Assessment', impact: 4.20, votes: 11, status: 'Under Review' },
  { key: 'IDH-013', num: '13', left: 25, bottom: 88, size: 34, color: '#16A34A', title: 'Integrated Payment Gateway for Ministry Fees', impact: 4.30, votes: 14, status: 'Converted' },
  { key: 'IDH-014', num: '14', left: 55, bottom: 58, size: 22, color: '#3B82F6', title: 'Carbon Footprint Tracking Module', impact: 3.40, votes: 6, status: 'Submitted' },
  { key: 'IDH-015', num: '15', left: 82, bottom: 78, size: 28, color: '#7C3AED', title: 'Cross-Ministry Data Sharing Framework', impact: 4.10, votes: 10, status: 'Under Review' },
];

const QUADRANTS = [
  { top: 0, left: 0, label: 'QUICK WINS', bg: '#F0FDF4', labelColor: '#16A34A' },
  { top: 0, left: '50%', label: 'BIG BETS', bg: '#EFF6FF', labelColor: '#2563EB' },
  { top: '50%', left: 0, label: 'FILL-INS', bg: '#F8FAFC', labelColor: '#64748B' },
  { top: '50%', left: '50%', label: 'MONEY PIT', bg: '#FEF2F2', labelColor: '#DC2626' },
];

export default function IdeationMatrixView({ onOpenDetail }: Props) {
  const [hoveredDot, setHoveredDot] = useState<string | null>(null);

  return (
    <div style={{ padding: '16px 28px' }}>
      {/* Controls bar */}
      <div style={{ display: 'flex', gap: '24px', marginBottom: '16px', alignItems: 'center' }}>
        {[
          { label: 'X-AXIS', value: 'Complexity (C)' },
          { label: 'Y-AXIS', value: 'Strategic Value (I+M+A)' },
          { label: 'SIZE', value: 'Votes' },
        ].map(ctrl => (
          <div key={ctrl.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{ctrl.label}:</span>
            <div style={{
              width: '160px', fontSize: '12px', fontWeight: 600, padding: '5px 10px',
              background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px',
              color: '#334155', cursor: 'pointer',
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
          borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', position: 'relative', overflow: 'hidden',
        }}>
          {/* Grid area */}
          <div style={{ position: 'absolute', top: '40px', right: '40px', bottom: '50px', left: '60px' }}>
            {/* Quadrants */}
            {QUADRANTS.map(q => (
              <div key={q.label} style={{
                position: 'absolute', top: q.top, left: q.left, width: '50%', height: '50%',
                background: q.bg,
                display: 'flex', padding: '14px',
                justifyContent: q.left === 0 ? 'flex-start' : 'flex-end',
                alignItems: q.top === 0 ? 'flex-start' : 'flex-end',
              }}>
                <span style={{
                  fontSize: '12px', fontWeight: 800, textTransform: 'uppercase',
                  letterSpacing: '1.5px', color: q.labelColor, opacity: 0.9, userSelect: 'none',
                }}>
                  {q.label}
                </span>
              </div>
            ))}

            {/* Midlines — slate-400 dashed */}
            <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 0, borderLeft: '1.5px dashed #94A3B8', zIndex: 1 }} />
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 0, borderTop: '1.5px dashed #94A3B8', zIndex: 1 }} />

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
                  borderRadius: '50%', background: dot.color,
                  border: '2px solid white', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10px', fontWeight: 800, color: '#FFFFFF',
                  fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                  boxShadow: hoveredDot === dot.key ? '0 4px 14px rgba(0,0,0,0.25)' : '0 2px 6px rgba(0,0,0,0.15)',
                  transform: hoveredDot === dot.key ? 'scale(1.3)' : 'scale(1)',
                  zIndex: hoveredDot === dot.key ? 10 : 2,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
              >
                {dot.num}

                {/* Tooltip */}
                {hoveredDot === dot.key && (
                  <div style={{
                    position: 'absolute', bottom: `${dot.size + 8}px`, left: '50%', transform: 'translateX(-50%)',
                    background: '#0F172A', color: '#FFFFFF', fontSize: '12px', borderRadius: '8px',
                    padding: '8px 12px', whiteSpace: 'nowrap', zIndex: 20,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  }}>
                    <div style={{ fontWeight: 700, marginBottom: '2px' }}>{dot.key} · {dot.title}</div>
                    <div style={{ fontSize: '11px', color: '#CBD5E1' }}>
                      IMPACT: {dot.impact.toFixed(2)} · Votes: {dot.votes} · {dot.status}
                    </div>
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

          {/* Axis labels — darker */}
          <div style={{
            position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)',
            fontSize: '11px', fontWeight: 700, color: '#334155', letterSpacing: '1px',
            textTransform: 'uppercase', whiteSpace: 'nowrap',
          }}>
            ← LOW COMPLEXITY — HIGH COMPLEXITY →
          </div>
          <div style={{
            position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%) rotate(-90deg)',
            fontSize: '11px', fontWeight: 700, color: '#334155', letterSpacing: '1px',
            textTransform: 'uppercase', whiteSpace: 'nowrap',
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
          { color: '#16A34A', label: 'Approved / Converted' },
          { color: '#7C3AED', label: 'Under Review (AI-enriched)' },
          { color: '#3B82F6', label: 'Submitted' },
          { color: '#EF4444', label: 'Rejected' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: l.color, flexShrink: 0 }} />
            <span style={{ fontSize: '12px', color: '#334155', fontWeight: 600 }}>{l.label}</span>
          </div>
        ))}
        <span style={{ fontSize: '11px', color: '#94A3B8' }}>Dot size = Vote count</span>
      </div>
    </div>
  );
}
