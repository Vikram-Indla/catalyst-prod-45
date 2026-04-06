/**
 * SidePanelCycleTime — Cycle Time Analytics Banner (V12)
 * Shows TO DO / IN PROGRESS / DONE phase durations with progress bars
 */
import { Clock } from 'lucide-react';
import { useCycleSummary, useCycleTime } from '@/hooks/useWorkHub';
import { format } from 'date-fns';

interface Props {
  workItemId: string;
}

function formatDuration(seconds: number): string {
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`;
  return `${(seconds / 86400).toFixed(1)}d`;
}

const PHASES = [
  { key: 'to_do', label: 'TO DO', labelColor: '#42526E', barColor: '#DFE1E6' },
  { key: 'in_progress', label: 'IN PROGRESS', labelColor: 'var(--bg-app)', barColor: '#0C66E4' },
  { key: 'done', label: 'DONE', labelColor: 'var(--bg-app)', barColor: '#1B7F37' },
] as const;

export default function SidePanelCycleTime({ workItemId }: Props) {
  const { data: summary = [], isLoading: summaryLoading } = useCycleSummary(workItemId);
  const { data: timeline = [], isLoading: timelineLoading } = useCycleTime(workItemId);

  const isLoading = summaryLoading || timelineLoading;

  if (isLoading) {
    return (
      <div style={{ border: '1px solid var(--bd-default, #2E2E2E)', borderRadius: 6, padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <Clock size={16} color="#64748B" />
          <span style={{ fontSize: 11, fontWeight: 650, textTransform: 'uppercase', color: 'var(--fg-3)', letterSpacing: '0.06em' }}>Cycle Time</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {[0, 1, 2].map(i => (
            <div key={i} className="wh-skeleton" style={{ flex: 1, height: 80, borderRadius: 6 }} />
          ))}
        </div>
      </div>
    );
  }

  const phaseMap: Record<string, { total_seconds: number; total_days: number }> = {};
  for (const s of summary) {
    phaseMap[s.status_category] = { total_seconds: Number(s.total_seconds), total_days: Number(s.total_days) };
  }

  const totalSeconds = Object.values(phaseMap).reduce((a, b) => a + b.total_seconds, 0);
  const totalDays = totalSeconds / 86400;

  // Current status from last timeline entry
  const lastEntry = timeline.length > 0 ? timeline[timeline.length - 1] : null;
  const currentStatus = lastEntry?.status ?? null;
  const timeInCurrentSec = lastEntry ? (Date.now() - new Date(lastEntry.entered_at).getTime()) / 1000 : 0;
  const enteredCurrent = lastEntry?.entered_at ?? null;

  if (summary.length === 0 && timeline.length === 0) {
    return (
      <div style={{ border: '1px solid var(--bd-default, #2E2E2E)', borderRadius: 6, padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <Clock size={16} color="#64748B" />
          <span style={{ fontSize: 11, fontWeight: 650, textTransform: 'uppercase', color: 'var(--fg-3)', letterSpacing: '0.06em' }}>Cycle Time</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--fg-4)', margin: 0 }}>
          Cycle time data will appear once status transitions are synced from Jira.
        </p>
      </div>
    );
  }

  return (
    <div style={{ border: '1px solid var(--bd-default, #2E2E2E)', borderRadius: 6, padding: 16, marginBottom: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <Clock size={16} color="#64748B" />
        <span style={{ fontSize: 11, fontWeight: 650, textTransform: 'uppercase', color: 'var(--fg-3)', letterSpacing: '0.06em' }}>Cycle Time</span>
      </div>

      {/* Three phase cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        {PHASES.map(phase => {
          const data = phaseMap[phase.key];
          const seconds = data?.total_seconds ?? 0;
          const pct = totalSeconds > 0 ? (seconds / totalSeconds) * 100 : 0;

          return (
            <div key={phase.key} style={{
              flex: 1, background: 'var(--bg-app)', border: '1px solid var(--bd-subtle, #292929)',
              borderRadius: 6, padding: 12, display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              <span style={{ fontSize: 11, fontWeight: 650, textTransform: 'uppercase', color: phase.labelColor, letterSpacing: '0.04em' }}>
                {phase.label}
              </span>
              <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 28, fontWeight: 700, color: seconds > 0 ? phase.labelColor : 'var(--fg-4)' }}>
                {seconds > 0 ? formatDuration(seconds) : '—'}
              </span>
              <div style={{ height: 4, borderRadius: 4, background: 'var(--bg-1)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: phase.barColor, borderRadius: 4, transition: 'width 300ms' }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>Total Lead Time: </span>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-1)' }}>{totalDays.toFixed(1)} days</span>
        </div>
        {currentStatus && (
          <div>
            <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>Currently in: </span>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', padding: '1px 6px', borderRadius: 4, background: '#0C66E4', color: 'var(--bg-app)' }}>{currentStatus}</span>
          </div>
        )}
        {timeInCurrentSec > 0 && (
          <div>
            <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>Time in current: </span>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-1)' }}>{formatDuration(timeInCurrentSec)}</span>
          </div>
        )}
        {enteredCurrent && (
          <div>
            <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>Entered: </span>
            <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: 'var(--fg-1)' }}>{format(new Date(enteredCurrent), 'MMM d, yyyy')}</span>
          </div>
        )}
      </div>
    </div>
  );
}
