import React from 'react';

const TYPE_ICONS: Record<string, { symbol: string; color: string }> = {
  Epic: { symbol: '◆', color: '#7C3AED' },
  Feature: { symbol: '▲', color: '#2563EB' },
  Story: { symbol: '●', color: '#0D9488' },
  Bug: { symbol: '⬡', color: '#DC2626' },
  Task: { symbol: '■', color: '#D97706' },
  Subtask: { symbol: '○', color: '#94A3B8' },
};

interface FilterState {
  statuses: string[];
  priorities: string[];
  types: string[];
  dueDate: 'all' | 'overdue' | 'this_week' | 'this_month';
}

interface Props {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  onApply: () => void;
  onClear: () => void;
  uniqueStatuses: string[];
  uniquePriorities: string[];
  uniqueTypes: string[];
}

export function AdvancedFilterPanel({ filters, onChange, onApply, onClear, uniqueStatuses, uniquePriorities, uniqueTypes }: Props) {
  const toggle = (arr: string[], val: string) => arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];

  return (
    <div
      className="absolute left-0 top-full mt-1 rounded-lg overflow-hidden"
      style={{
        width: 320, background: '#FFF', border: '1px solid #E2E8F0',
        boxShadow: '0 12px 32px rgba(0,0,0,0.15)', zIndex: 9999,
      }}
    >
      <div className="grid grid-cols-2 gap-0">
        {/* Status */}
        <div style={{ borderRight: '1px solid #F1F5F9', borderBottom: '1px solid #F1F5F9' }} className="p-3">
          <div className="text-[10px] font-semibold uppercase mb-2" style={{ color: '#94A3B8', letterSpacing: '0.06em' }}>Status</div>
          {uniqueStatuses.map(s => (
            <label key={s} className="flex items-center gap-2 py-0.5 cursor-pointer">
              <input type="checkbox" checked={filters.statuses.includes(s)} onChange={() => onChange({ ...filters, statuses: toggle(filters.statuses, s) })} className="w-3.5 h-3.5 rounded accent-[#2563EB]" />
              <span className="text-[11px]" style={{ color: '#334155' }}>{s}</span>
            </label>
          ))}
        </div>

        {/* Priority */}
        <div style={{ borderBottom: '1px solid #F1F5F9' }} className="p-3">
          <div className="text-[10px] font-semibold uppercase mb-2" style={{ color: '#94A3B8', letterSpacing: '0.06em' }}>Priority</div>
          {uniquePriorities.map(p => (
            <label key={p} className="flex items-center gap-2 py-0.5 cursor-pointer">
              <input type="checkbox" checked={filters.priorities.includes(p)} onChange={() => onChange({ ...filters, priorities: toggle(filters.priorities, p) })} className="w-3.5 h-3.5 rounded accent-[#2563EB]" />
              <span className="text-[11px] capitalize" style={{ color: '#334155' }}>{p}</span>
            </label>
          ))}
        </div>

        {/* Type */}
        <div style={{ borderRight: '1px solid #F1F5F9', borderBottom: '1px solid #F1F5F9' }} className="p-3">
          <div className="text-[10px] font-semibold uppercase mb-2" style={{ color: '#94A3B8', letterSpacing: '0.06em' }}>Type</div>
          {uniqueTypes.map(t => {
            const icon = TYPE_ICONS[t];
            return (
              <label key={t} className="flex items-center gap-2 py-0.5 cursor-pointer">
                <input type="checkbox" checked={filters.types.includes(t)} onChange={() => onChange({ ...filters, types: toggle(filters.types, t) })} className="w-3.5 h-3.5 rounded accent-[#2563EB]" />
                {icon && <span style={{ color: icon.color, fontSize: 11 }}>{icon.symbol}</span>}
                <span className="text-[11px]" style={{ color: '#334155' }}>{t}</span>
              </label>
            );
          })}
        </div>

        {/* Due Date */}
        <div style={{ borderBottom: '1px solid #F1F5F9' }} className="p-3">
          <div className="text-[10px] font-semibold uppercase mb-2" style={{ color: '#94A3B8', letterSpacing: '0.06em' }}>Due Date</div>
          {([
            { value: 'all', label: 'All' },
            { value: 'overdue', label: 'Overdue' },
            { value: 'this_week', label: 'This week' },
            { value: 'this_month', label: 'This month' },
          ] as const).map(o => (
            <label key={o.value} className="flex items-center gap-2 py-0.5 cursor-pointer">
              <input type="radio" name="dueDate" checked={filters.dueDate === o.value} onChange={() => onChange({ ...filters, dueDate: o.value })} className="accent-[#2563EB]" />
              <span className="text-[11px]" style={{ color: '#334155' }}>{o.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 px-3 py-2" style={{ borderTop: '1px solid #F1F5F9' }}>
        <button onClick={onClear} className="text-[11px] font-medium px-3 py-1 rounded hover:bg-[#F1F5F9]" style={{ color: '#64748B' }}>
          Clear
        </button>
        <button onClick={onApply} className="text-[11px] font-semibold px-3 py-1 rounded text-white" style={{ background: '#2563EB' }}>
          Apply
        </button>
      </div>
    </div>
  );
}
