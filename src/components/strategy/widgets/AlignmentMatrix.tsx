/**
 * AlignmentMatrix — Widget 10: 7 horizontal bars for workstream alignment
 * Row 4, span 3
 * DATA SOURCE: es_team_alignment
 */

import { useTeamAlignment } from '@/hooks/strategy/useStrategyData';

export function AlignmentMatrix() {
  const { data: workstreams, isLoading } = useTeamAlignment();

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        {[1, 2, 3, 4, 5, 6, 7].map(i => (
          <div key={i} className="flex items-center gap-2">
            <div style={{ width: 60, height: 12, background: 'var(--catalyst-bg-hover)', borderRadius: 4 }} />
            <div className="flex-1" style={{ height: 6, background: 'var(--catalyst-bg-hover)', borderRadius: 3 }} />
          </div>
        ))}
      </div>
    );
  }

  if (!workstreams || workstreams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2" style={{ color: 'var(--exec-text-tertiary)' }}>
        <span style={{ fontSize: 12 }}>No alignment data</span>
      </div>
    );
  }

  const sorted = [...workstreams].sort((a, b) => (Number(b.alignment_score) || 0) - (Number(a.alignment_score) || 0));

  return (
    <div className="space-y-1.5">
      {sorted.map(ws => {
        const score = Number(ws.alignment_score) || 0;
        const name = ws.workstream === 'Stand-Alone' ? 'Standalone' : ws.workstream;
        /* Uniform blue bars; red only if score < 50% */
        const barColor = score < 50 ? 'var(--exec-signal-red, #DC2626)' : 'var(--exec-blue-500, #3B82F6)';
        return (
          <div key={ws.id} className="flex items-center gap-2">
            <span style={{ width: 60, fontSize: 10, textAlign: 'right', color: 'var(--exec-text-secondary)', flexShrink: 0, whiteSpace: 'nowrap' }}>
              {name}
            </span>
            <div className="flex-1" style={{ height: 6, borderRadius: 4, background: 'var(--exec-bg-hover, #1A1A1A)', overflow: 'hidden' }}>
              <div style={{
                width: `${score}%`, height: '100%', borderRadius: 4,
                background: barColor, opacity: 0.85,
                transition: 'width 800ms ease-out',
              }} />
            </div>
            <span style={{ width: 30, fontSize: 11, fontWeight: 600, textAlign: 'right', color: 'var(--exec-text-primary)', flexShrink: 0 }}>
              {score}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
