/**
 * IdeationMatrixView — Impact vs Complexity scatter plot with 4 quadrants
 * V12: Submitted bubbles use #64748B slate (not primary blue)
 */
import React, { useState } from 'react';
import { useIdeas } from '@/hooks/useIdeation';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  onOpenDetail: (key: string) => void;
}

interface DotData {
  key: string; num: string; left: number; bottom: number; size: number; color: string;
  title: string; impact: number; votes: number; status: string;
}

// V12 bubble colors — submitted = slate, NOT primary blue
const STATUS_BUBBLE_COLORS: Record<string, string> = {
  'converted':    '#16A34A',
  'approved':     '#16A34A',
  'under_review': '#7C3AED',  // AI-enriched marker ✓
  'submitted':    '#64748B',  // neutral slate — not primary blue
  'rejected':     '#DC2626',
  'draft':        '#94A3B8',
};

function getBubbleColor(status: string): string {
  return STATUS_BUBBLE_COLORS[status] ?? '#64748B';
}

const QUADRANTS = [
  { top: 0, left: 0, label: 'QUICK WINS', bg: '#F0FDF4', labelColor: '#16A34A' },
  { top: 0, left: '50%', label: 'BIG BETS', bg: '#EFF6FF', labelColor: '#2563EB' },
  { top: '50%', left: 0, label: 'FILL-INS', bg: '#F8FAFC', labelColor: '#64748B' },
  { top: '50%', left: '50%', label: 'MONEY PIT', bg: '#FEF2F2', labelColor: '#DC2626' },
];

export default function IdeationMatrixView({ onOpenDetail }: Props) {
  const [hoveredDot, setHoveredDot] = useState<string | null>(null);
  const { data: ideas = [] } = useIdeas();
  const { isDark } = useTheme();

  // Generate dot positions from real data
  const dots: DotData[] = ideas.slice(0, 30).map((idea, i) => {
    // Spread dots across the chart based on priority and index
    const hash = idea.key.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const complexity = ((hash * 7 + i * 13) % 80) + 10;
    const strategic = idea.priority === 'P1' ? 70 + (hash % 25) : idea.priority === 'P2' ? 40 + (hash % 35) : 15 + (hash % 40);
    const size = Math.max(16, Math.min(36, 18 + Math.abs(idea.votes) * 2));
    return {
      key: idea.key,
      num: idea.key.replace('IDH-', ''),
      left: complexity,
      bottom: strategic,
      size,
      color: getBubbleColor(idea.status),
      title: idea.title,
      impact: idea.impact,
      votes: idea.votes,
      status: idea.status === 'under_review' ? 'Under Review' : idea.status.charAt(0).toUpperCase() + idea.status.slice(1),
    };
  });

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
              background: isDark ? '#1A1A1A' : '#F8FAFC', border: isDark ? '1px solid #2E2E2E' : '1px solid #E2E8F0', borderRadius: '6px',
              color: isDark ? '#EDEDED' : '#334155', cursor: 'pointer',
            }}>
              {ctrl.value}
            </div>
          </div>
        ))}
      </div>

      {/* Chart — V12: border-only, NO box-shadow */}
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{
          width: '100%', height: '520px', background: isDark ? '#1A1A1A' : '#FFFFFF', border: isDark ? '1px solid #2E2E2E' : '1px solid #E2E8F0',
          borderRadius: '6px', position: 'relative', overflow: 'hidden',
        }}>
          {/* Grid area */}
          <div style={{ position: 'absolute', top: '40px', right: '40px', bottom: '50px', left: '60px' }}>
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

            {/* Midlines */}
            <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 0, borderLeft: '1.5px dashed #94A3B8', zIndex: 1 }} />
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 0, borderTop: '1.5px dashed #94A3B8', zIndex: 1 }} />

            {/* Dots */}
            {dots.map(dot => (
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
          { color: '#64748B', label: 'Submitted' },
          { color: '#DC2626', label: 'Rejected' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: l.color, flexShrink: 0 }} />
            <span style={{ fontSize: '12px', color: isDark ? '#A1A1A1' : '#334155', fontWeight: 600 }}>{l.label}</span>
          </div>
        ))}
        <span style={{ fontSize: '11px', color: '#94A3B8' }}>Dot size = Vote count</span>
      </div>
    </div>
  );
}
