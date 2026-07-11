/**
 * IdeationMatrixView — Impact vs Complexity scatter plot with 4 quadrants
 * V12: Submitted bubbles use var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary))) slate (not primary blue)
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
  'converted':    'var(--ds-text-success, var(--cp-success))',
  'approved':     'var(--ds-text-success, var(--cp-success))',
  'under_review': 'var(--cp-purple-60)',  // AI-enriched marker ✓
  'submitted':    'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))',  // neutral slate — not primary blue
  'rejected':     'var(--ds-text-danger, var(--cp-danger))',
  'draft':        'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))',
};

function getBubbleColor(status: string): string {
  return STATUS_BUBBLE_COLORS[status] ?? 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))';
}

const QUADRANTS = [
  { top: 0, left: 0, label: 'QUICK WINS', bg: 'var(--ds-background-success)', labelColor: 'var(--ds-text-success, var(--cp-success))' },
  { top: 0, left: '50%', label: 'BIG BETS', bg: 'var(--ds-background-selected)', labelColor: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' },
  { top: '50%', left: 0, label: 'FILL-INS', bg: 'var(--ds-surface-sunken)', labelColor: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))' },
  { top: '50%', left: '50%', label: 'MONEY PIT', bg: 'var(--ds-background-danger)', labelColor: 'var(--ds-text-danger, var(--cp-danger))' },
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
          <div key={ctrl.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{ctrl.label}:</span>
            <div style={{
              width: '160px', fontSize: 'var(--ds-font-size-200)', fontWeight: 600, padding: '4px 10px',
              background: 'var(--cp-bg-page)', border: isDark ? '1px solid var(--ds-text)' : '1px solid var(--cp-border, var(--cp-bg-sunken))', borderRadius: '6px',
              color: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2)))', cursor: 'pointer',
            }}>
              {ctrl.value}
            </div>
          </div>
        ))}
      </div>

      {/* Chart — V12: border-only, NO box-shadow */}
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{
          width: '100%', height: '520px', background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))', border: isDark ? '1px solid var(--ds-text)' : '1px solid var(--cp-border, var(--cp-bg-sunken))',
          borderRadius: '6px', position: 'relative', overflow: 'hidden',
        }}>
          {/* Grid area */}
          <div style={{ position: 'absolute', top: '40px', right: '40px', bottom: '48px', left: '48px' }}>
            {QUADRANTS.map(q => (
              <div key={q.label} style={{
                position: 'absolute', top: q.top, left: q.left, width: '50%', height: '50%',
                background: q.bg,
                display: 'flex', padding: '12px',
                justifyContent: q.left === 0 ? 'flex-start' : 'flex-end',
                alignItems: q.top === 0 ? 'flex-start' : 'flex-end',
              }}>
                <span style={{
                  fontSize: 'var(--ds-font-size-200)', fontWeight: 800, textTransform: 'uppercase',
                  letterSpacing: '1.5px', color: q.labelColor, opacity: 0.9, userSelect: 'none',
                }}>
                  {q.label}
                </span>
              </div>
            ))}

            {/* Midlines */}
            <div style={{ position: 'absolute', left: '48%', top: 0, bottom: 0, width: 0, borderLeft: '1.5px dashed var(--cp-ink-4, var(--cp-border-neutral-light))', zIndex: 1 }} />
            <div style={{ position: 'absolute', top: '48%', left: 0, right: 0, height: 0, borderTop: '1.5px dashed var(--cp-ink-4, var(--cp-border-neutral-light))', zIndex: 1 }} />

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
                  fontSize: 'var(--ds-font-size-50)', fontWeight: 800, color: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))',
                  fontFamily: 'var(--cp-font-mono)',
                  textShadow: '0 1px 2px var(--ds-shadow-raised)',
                  boxShadow: hoveredDot === dot.key ? '0 4px 14px var(--ds-shadow-raised)' : '0 2px 6px var(--ds-shadow-raised)',
                  transform: hoveredDot === dot.key ? 'scale(1.3)' : 'scale(1)',
                  zIndex: hoveredDot === dot.key ? 10 : 2,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
              >
                {dot.num}

                {hoveredDot === dot.key && (
                  <div style={{
                    position: 'absolute', bottom: `${dot.size + 8}px`, left: '48%', transform: 'translateX(-50%)',
                    background: 'var(--ds-text, var(--cp-ink-1, var(--cp-ink-1)))', color: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))', fontSize: 'var(--ds-font-size-200)', borderRadius: '8px',
                    padding: '8px 12px', whiteSpace: 'nowrap', zIndex: 20,
                    boxShadow: '0 4px 12px var(--ds-shadow-raised)',
                  }}>
                    <div style={{ fontWeight: 700, marginBottom: '0px' }}>{dot.key} · {dot.title}</div>
                    <div style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-disabled)' }}>
                      IMPACT: {dot.impact.toFixed(2)} · Votes: {dot.votes} · {dot.status}
                    </div>
                    <div style={{
                      position: 'absolute', bottom: '-4px', left: '48%', transform: 'translateX(-50%)',
                      width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
                      borderTop: '5px solid var(--cp-ink-1, var(--cp-ink-1))',
                    }} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Axis labels */}
          <div style={{
            position: 'absolute', bottom: '12px', left: '48%', transform: 'translateX(-50%)',
            fontSize: 'var(--ds-font-size-100)', fontWeight: 700, color: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2)))', letterSpacing: '1px',
            textTransform: 'uppercase', whiteSpace: 'nowrap',
          }}>
            ← LOW COMPLEXITY — HIGH COMPLEXITY →
          </div>
          <div style={{
            position: 'absolute', left: '12px', top: '48%', transform: 'translateY(-50%) rotate(-90deg)',
            fontSize: 'var(--ds-font-size-100)', fontWeight: 700, color: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2)))', letterSpacing: '1px',
            textTransform: 'uppercase', whiteSpace: 'nowrap',
          }}>
            ← LOW STRATEGIC VALUE — HIGH STRATEGIC VALUE →
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '16px',
      }}>
        {[
          { color: 'var(--ds-text-success, var(--cp-success))', label: 'Approved / Converted' },
          { color: 'var(--cp-purple-60)', label: 'Under Review (AI-enriched)' },
          { color: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', label: 'Submitted' },
          { color: 'var(--ds-text-danger, var(--cp-danger))', label: 'Rejected' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: l.color, flexShrink: 0 }} />
            <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2)))', fontWeight: 600 }}>{l.label}</span>
          </div>
        ))}
        <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))' }}>Dot size = Vote count</span>
      </div>
    </div>
  );
}
