import React from 'react';

const scoreBarStyle = (filled: boolean): React.CSSProperties => ({
  width: '4px',
  height: '12px',
  minWidth: '4px',
  minHeight: '12px',
  borderRadius: '1px',
  backgroundColor: filled ? '#71717A' : '#E4E4E7',
  display: 'block',
  flexShrink: 0,
  border: 'none',
  padding: 0,
  margin: 0,
});

const priorityBarStyle = (filled: boolean): React.CSSProperties => ({
  width: '16px',
  height: '4px',
  minWidth: '16px',
  minHeight: '4px',
  borderRadius: '4px',
  backgroundColor: filled ? '#71717A' : '#E4E4E7',
  display: 'block',
  flexShrink: 0,
  border: 'none',
  padding: 0,
  margin: 0,
});

export function RequestScoreBars({ score = 0 }: { score?: number | null }) {
  const s = score ?? 0;
  const level = Math.round(s);
  return (
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: '2px' }}>
      <div style={scoreBarStyle(level >= 1)} />
      <div style={scoreBarStyle(level >= 2)} />
      <div style={scoreBarStyle(level >= 3)} />
      <div style={scoreBarStyle(level >= 4)} />
      <div style={scoreBarStyle(level >= 5)} />
    </div>
  );
}

export function RequestPriorityBars({ score = 0 }: { score?: number | null }) {
  const s = score ?? 0;
  const level = s === 0 ? 0 : s >= 4.0 ? 4 : s >= 3.0 ? 3 : s >= 2.0 ? 2 : 1;
  return (
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '2px' }}>
      <div style={priorityBarStyle(level >= 1)} />
      <div style={priorityBarStyle(level >= 2)} />
      <div style={priorityBarStyle(level >= 3)} />
      <div style={priorityBarStyle(level >= 4)} />
    </div>
  );
}

export function RequestMetrics({ score }: { score?: number | null }) {
  const s = score ?? 0;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '24px' }}>
      <div>
        <div style={{
          fontFamily: 'var(--cp-font-body)',
          fontSize: '10px',
          fontWeight: 600,
          color: '#71717A',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: '4px',
        }}>
          SCORE
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <RequestScoreBars score={score} />
          <span style={{
            fontFamily: 'var(--cp-font-mono)',
            fontSize: '12px',
            fontWeight: 500,
            color: s > 0 ? '#18181B' : '#71717A',
          }}>
            {s > 0 ? s.toFixed(1) : '—'} /5.0
          </span>
        </div>
      </div>
      <div>
        <div style={{
          fontFamily: 'var(--cp-font-body)',
          fontSize: '10px',
          fontWeight: 600,
          color: '#71717A',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: '4px',
        }}>
          PRIORITY
        </div>
        <RequestPriorityBars score={score} />
      </div>
    </div>
  );
}
