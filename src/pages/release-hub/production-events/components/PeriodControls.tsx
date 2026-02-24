import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PcPeriodType } from '../types/production-events.types';

const PERIOD_TABS: { key: PcPeriodType; label: string }[] = [
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'quarterly', label: 'Quarterly' },
];

// Fix 4: Use event types not Jira types
const FILTER_CHIPS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'feature', label: 'Features' },
  { key: 'incident', label: 'Incidents' },
  { key: 'improvement', label: 'Improvements' },
  { key: 'security', label: 'Security' },
];

interface PeriodControlsProps {
  periodType: PcPeriodType;
  onPeriodTypeChange: (t: PcPeriodType) => void;
  periodLabel: string;
  onNavigate: (dir: 'prev' | 'next') => void;
  filterType: string;
  onFilterChange: (f: string) => void;
}

export function PeriodControls({
  periodType, onPeriodTypeChange, periodLabel, onNavigate, filterType, onFilterChange,
}: PeriodControlsProps) {
  return (
    <div className="flex items-center gap-4 flex-wrap" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Period Tabs — Fix 26: active shadow */}
      <div className="flex items-center rounded-lg" style={{ background: '#F1F5F9', padding: 3 }}>
        {PERIOD_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => onPeriodTypeChange(t.key)}
            style={{
              padding: '5px 14px', fontSize: 12, fontWeight: periodType === t.key ? 600 : 500,
              borderRadius: 6, border: 'none', cursor: 'pointer',
              background: periodType === t.key ? '#FFFFFF' : 'transparent',
              color: periodType === t.key ? '#2563EB' : '#64748B',
              boxShadow: periodType === t.key ? '0 1px 3px rgba(0,0,0,0.04)' : 'none',
              transition: 'all 150ms ease',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Period Navigation */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onNavigate('prev')}
          style={{
            width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 6, border: '1px solid #E2E8F0', background: '#FFFFFF', cursor: 'pointer',
          }}
        >
          <ChevronLeft size={14} color="#64748B" />
        </button>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', minWidth: 180, textAlign: 'center' }}>
          {periodLabel}
        </span>
        <button
          onClick={() => onNavigate('next')}
          style={{
            width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 6, border: '1px solid #E2E8F0', background: '#FFFFFF', cursor: 'pointer',
          }}
        >
          <ChevronRight size={14} color="#64748B" />
        </button>
      </div>

      <div className="flex-1" />

      {/* Fix 4 + Fix 27: Filter Chips with correct active styling */}
      <div className="flex items-center gap-1.5">
        {FILTER_CHIPS.map(f => (
          <button
            key={f.key}
            onClick={() => onFilterChange(f.key)}
            style={{
              padding: '4px 12px', fontSize: 11.5, fontWeight: filterType === f.key ? 600 : 500,
              borderRadius: 16, cursor: 'pointer',
              border: filterType === f.key ? '1px solid #2563EB' : '1px solid #E2E8F0',
              background: filterType === f.key ? '#EFF6FF' : '#FFFFFF',
              color: filterType === f.key ? '#2563EB' : '#64748B',
              transition: 'all 150ms ease',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}
