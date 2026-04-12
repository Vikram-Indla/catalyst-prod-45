/**
 * SegmentedProgressBar — Jira-parity multi-color progress bar.
 * Shows done (green), in_progress (blue), todo (grey) segments + "X% Done" label.
 */
import React from 'react';

interface SegmentedProgressBarProps {
  total: number;
  doneCount: number;
  inProgressCount: number;
}

export function SegmentedProgressBar({ total, doneCount, inProgressCount }: SegmentedProgressBarProps) {
  if (total === 0) return null;

  const todoCount = total - doneCount - inProgressCount;
  const donePct = Math.round((doneCount / total) * 100);
  const inProgressPct = Math.round((inProgressCount / total) * 100);
  const todoPct = 100 - donePct - inProgressPct;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <div style={{
        flex: 1, height: 6, borderRadius: 3, overflow: 'hidden',
        display: 'flex', background: '#DFE1E6',
      }}>
        {donePct > 0 && (
          <div style={{ width: `${donePct}%`, background: '#36B37E', transition: 'width 300ms ease' }} />
        )}
        {inProgressPct > 0 && (
          <div style={{ width: `${inProgressPct}%`, background: '#0052CC', transition: 'width 300ms ease' }} />
        )}
        {todoPct > 0 && (
          <div style={{ width: `${todoPct}%`, background: '#DFE1E6', transition: 'width 300ms ease' }} />
        )}
      </div>
      <span style={{
        fontSize: 12, fontWeight: 500, color: '#5E6C84',
        whiteSpace: 'nowrap', minWidth: 60, textAlign: 'right',
      }}>
        {donePct}% Done
      </span>
    </div>
  );
}
