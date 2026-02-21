/**
 * IdeationMatrixView — Impact vs Complexity scatter plot with 4 quadrants
 */
import React, { useState } from 'react';
import { ideas } from './ideation-data';

interface Props {
  onOpenDetail: (key: string) => void;
}

interface DotData {
  key: string; num: string; left: number; bottom: number; size: number; color: string; border: string;
  title: string; impact: number; votes: number; status: string;
}

const DOTS: DotData[] = [
  { key: 'IDH-001', num: '01', left: 32, bottom: 88, size: 34, color: '#16A34A', border: '2px solid white', title: 'Unified Digital Services Portal', impact: 4.40, votes: 12, status: 'Converted' },
  { key: 'IDH-002', num: '02', left: 48, bottom: 78, size: 28, color: '#7C3AED', border: '2px solid white', title: 'AI-Powered Permit Classification', impact: 3.90, votes: 8, status: 'Under Review' },
  { key: 'IDH-003', num: '03', left: 58, bottom: 55, size: 22, color: '#3B82F6', border: '2px solid white', title: 'Real-Time Factory Compliance Dashboard', impact: 3.50, votes: 5, status: 'Submitted' },
  { key: 'IDH-004', num: '04', left: 38, bottom: 72, size: 28, color: '#3B82F6', border: '2px solid white', title: 'Bilingual Document Generation Engine', impact: 3.70, votes: 9, status: 'Under Review' },
  { key: 'IDH-005', num: '05', left: 28, bottom: 92, size: 38, color: '#16A34A', border: '2px solid white', title: 'Investor Onboarding Simplification', impact: 4.60, votes: 15, status: 'Approved' },
  { key: 'IDH-006', num: '06', left: 78, bottom: 48, size: 24, color: '#D97706', border: '2px solid white', title: 'Predictive Maintenance for Legacy Systems', impact: 2.80, votes: 6, status: 'Under Review' },
  { key: 'IDH-007', num: '07', left: 62, bottom: 45, size: 20, color: '#3B82F6', border: '2px solid white', title: 'Mobile-First Inspection App', impact: 3.20, votes: 4, status: 'Submitted' },
  { key: 'IDH-009', num: '09', left: 88, bottom: 18, size: 16, color: '#EF4444', border: '2px solid white', title: 'Blockchain-Based Certificate Verification', impact: 1.50, votes: -2, status: 'Rejected' },
  { key: 'IDH-010', num: '10', left: 42, bottom: 52, size: 24, color: '#3B82F6', border: '2px solid white', title: 'Stakeholder Communication Hub', impact: 3.30, votes: 7, status: 'Submitted' },
  { key: 'IDH-011', num: '11', left: 65, bottom: 82, size: 32, color: '#7C3AED', border: '2px solid white', title: 'Automated Regulatory Impact Assessment', impact: 4.20, votes: 11, status: 'Under Review' },
  { key: 'IDH-013', num: '13', left: 35, bottom: 86, size: 36, color: '#16A34A', border: '2px solid white', title: 'Integrated Payment Gateway for Ministry Fees', impact: 4.30, votes: 14, status: 'Converted' },
  { key: 'IDH-014', num: '14', left: 55, bottom: 60, size: 24, color: '#3B82F6', border: '2px solid white', title: 'Carbon Footprint Tracking Module', impact: 3.40, votes: 6, status: 'Submitted' },
  { key: 'IDH-015', num: '15', left: 82, bottom: 80, size: 30, color: '#D97706', border: '2px solid white', title: 'Cross-Ministry Data Sharing Framework', impact: 4.10, votes: 10, status: 'Under Review' },
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
              { top: 0, left: 0, label: '⚡ Quick Wins', bg: 'rgba(22,163,74,0.10)', tc: 'rgba(22,163,74,0.6)' },
              { top: 0, left: '50%', label: '🎯 Big Bets', bg: 'rgba(37,99,235,0.10)', tc: 'rgba(37,99,235,0.55)' },
              { top: '50%', left: 0, label: '📋 Fill-Ins', bg: 'rgba(161,161,170,0.08)', tc: 'rgba(161,161,170,0.6)' },
              { top: '50%', left: '50%', label: '⚠ Money Pit', bg: 'rgba(239,68,68,0.08)', tc: 'rgba(239,68,68,0.55)' },
            ].map(q => (
              <div key={q.label} style={{
                position: 'absolute', top: q.top, left: q.left, width: '50%', height: '50%',
                background: q.bg, border: '1px dashed #CBD5E1',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{
                  fontSize: '13px', fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.8px',
                  color: q.tc,
                }}>
                  {q.label}
                </span>
              </div>
            ))}

            {/* Midlines */}
            <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 0, borderLeft: '1px dashed #CBD5E1', zIndex: 1 }} />
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 0, borderTop: '1px dashed #CBD5E1', zIndex: 1 }} />

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
                  borderRadius: '50%', background: dot.color, border: dot.border, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '9px', fontWeight: 800, color: '#FFFFFF',
                  boxShadow: hoveredDot === dot.key ? '0 4px 16px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.2)',
                  transform: hoveredDot === dot.key ? 'scale(1.35)' : 'scale(1)',
                  zIndex: hoveredDot === dot.key ? 10 : 2,
                  transition: 'all 0.2s',
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

          {/* Axis labels */}
          <div style={{
            position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)',
            fontSize: '12px', fontWeight: 700, color: '#64748B', letterSpacing: '0.5px', whiteSpace: 'nowrap',
          }}>
            ← LOW COMPLEXITY — HIGH COMPLEXITY →
          </div>
          <div style={{
            position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%) rotate(-90deg)',
            fontSize: '12px', fontWeight: 700, color: '#64748B', letterSpacing: '0.5px', whiteSpace: 'nowrap',
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
          { color: '#D97706', label: 'Under Review' },
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
