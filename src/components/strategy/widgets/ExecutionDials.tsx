/**
 * ExecutionDials — Widget 4: 4 donut gauges for work item completion
 * Row 2, span 6
 */

import { CircularGauge } from '../shared/CircularGauge';

interface DialData {
  label: string;
  completed: number;
  total: number;
  color: string;
}

const DIALS: DialData[] = [
  { label: 'Business Requests', completed: 134, total: 200, color: '#2563EB' },
  { label: 'Epics', completed: 27, total: 50, color: '#D97706' },
  { label: 'Features', completed: 142, total: 200, color: '#0D9488' },
  { label: 'Stories', completed: 415, total: 500, color: '#0D9488' },
];

export function ExecutionDials() {
  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}
    >
      {DIALS.map(dial => {
        const pct = Math.round((dial.completed / dial.total) * 100);
        return (
          <div key={dial.label} className="flex flex-col items-center">
            <CircularGauge
              value={pct}
              size={100}
              strokeWidth={10}
              color={dial.color}
              animated
            />
            <span style={{ fontSize: 11, color: 'var(--catalyst-text-secondary)', marginTop: 6, textAlign: 'center' }}>
              {dial.label}
            </span>
            <span style={{ fontSize: 10, color: 'var(--catalyst-text-tertiary)' }}>
              {dial.completed} / {dial.total}
            </span>
          </div>
        );
      })}
    </div>
  );
}
