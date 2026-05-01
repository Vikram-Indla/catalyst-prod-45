import React from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  totalItems: number;
  pendingItems?: number;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  weekOffset: number;
  onWeekChange: (offset: number) => void;
}

export const R360WeekNav: React.FC<Props> = ({ totalItems, pendingItems, activeFilter, onFilterChange, weekOffset, onWeekChange }) => {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1 + weekOffset * 7);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const isThisWeek = weekOffset === 0;

  const FILTERS = [
    { key: 'all', label: 'All', count: totalItems },
    { key: 'pending', label: 'Pending', count: pendingItems ?? 0 },
  ];

  return (
    <div className="r3-week-nav" role="toolbar" aria-label="Week navigation">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Calendar size={16} color="var(--ds-text-subtlest, #64748B)" aria-hidden="true" />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#020617' }}>
          {isThisWeek ? 'This Week' : `Week of ${fmt(startOfWeek).split(',')[0]}`}
        </span>
        <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #64748B)' }}>
          {fmt(startOfWeek)} – {fmt(endOfWeek)}
        </span>
        <button className="r3-week-arrow" onClick={() => onWeekChange(weekOffset - 1)} aria-label="Previous week">
          <ChevronLeft size={14} />
        </button>
        <button className="r3-week-arrow" onClick={() => onWeekChange(weekOffset + 1)} aria-label="Next week">
          <ChevronRight size={14} />
        </button>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            className={`r3-filter-pill ${activeFilter === f.key ? 'active' : ''}`}
            onClick={() => onFilterChange(f.key)}
            aria-pressed={activeFilter === f.key}
            aria-label={`Filter: ${f.label} (${f.count})`}
          >
            {f.label} <strong style={{ marginLeft: 4 }}>{f.count}</strong>
          </button>
        ))}
      </div>
    </div>
  );
};
