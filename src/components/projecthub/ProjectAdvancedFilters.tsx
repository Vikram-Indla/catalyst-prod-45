import { X, ChevronDown } from 'lucide-react';
import type { ProjectFilters } from '@/types/projecthub';
import { PROJECT_STATUS_DISPLAY, PROJECT_HEALTH_DISPLAY, STATUS_CATEGORY_DISPLAY } from '@/types/projecthub';
import { useState, useRef, useEffect } from 'react';

interface AdvancedFiltersProps {
  filters: ProjectFilters;
  onChange: (f: ProjectFilters) => void;
  departments: string[];
  onClose: () => void;
}

function FilterDropdown({ label, placeholder, options, selected, onToggle }: {
  label: string;
  placeholder: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const display = selected.length === 0
    ? placeholder
    : selected.length === 1
      ? options.find(o => o.value === selected[0])?.label || selected[0]
      : `${selected.length} selected`;

  return (
    <div ref={ref} className="relative">
      <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full rounded-md transition-colors"
        style={{
          height: 36,
          padding: '0 12px',
          fontSize: 13,
          color: selected.length > 0 ? '#0F172A' : '#94A3B8',
          background: '#FFF',
          border: '1px solid #CBD5E1',
          cursor: 'pointer',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <span className="truncate">{display}</span>
        <ChevronDown size={14} color="#94A3B8" className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          className="absolute left-0 right-0 mt-1 rounded-md shadow-lg overflow-auto"
          style={{ background: '#FFF', border: '1px solid #E2E8F0', zIndex: 50, maxHeight: 220 }}
        >
          {options.map(o => {
            const active = selected.includes(o.value);
            return (
              <button
                key={o.value}
                onClick={() => onToggle(o.value)}
                className="flex items-center gap-2 w-full text-left transition-colors hover:bg-slate-50"
                style={{ padding: '8px 12px', fontSize: 12, color: '#334155', cursor: 'pointer', background: 'none', border: 'none' }}
              >
                <span
                  className="flex items-center justify-center rounded"
                  style={{ width: 16, height: 16, border: `1px solid ${active ? '#2563EB' : '#CBD5E1'}`, background: active ? '#2563EB' : '#FFF', flexShrink: 0 }}
                >
                  {active && <span style={{ color: '#FFF', fontSize: 10, fontWeight: 700 }}>✓</span>}
                </span>
                {o.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ProjectAdvancedFilters({ filters, onChange, departments, onClose }: AdvancedFiltersProps) {
  const toggle = (key: keyof Pick<ProjectFilters, 'departments' | 'statuses' | 'healths' | 'categories'>, value: string) => {
    const arr = filters[key];
    onChange({ ...filters, [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] });
  };

  return (
    <div className="rounded-lg" style={{ background: '#FFF', border: '1px solid #E2E8F0', padding: '16px 20px', marginBottom: 12 }}>
      <div className="flex items-center justify-between mb-4">
        <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Advanced Filters</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
          <X size={16} color="#64748B" />
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <FilterDropdown
          label="Department"
          placeholder="All departments"
          options={departments.map(d => ({ value: d, label: d }))}
          selected={filters.departments}
          onToggle={v => toggle('departments', v)}
        />
        <FilterDropdown
          label="Status"
          placeholder="All statuss"
          options={Object.entries(PROJECT_STATUS_DISPLAY).filter(([k]) => !['cancelled', 'archived'].includes(k)).map(([v, l]) => ({ value: v, label: l }))}
          selected={filters.statuses}
          onToggle={v => toggle('statuses', v)}
        />
        <FilterDropdown
          label="Health"
          placeholder="All healths"
          options={Object.entries(PROJECT_HEALTH_DISPLAY).map(([v, l]) => ({ value: v, label: l }))}
          selected={filters.healths}
          onToggle={v => toggle('healths', v)}
        />
        <FilterDropdown
          label="Status Category"
          placeholder="All status categorys"
          options={Object.entries(STATUS_CATEGORY_DISPLAY).map(([v, l]) => ({ value: v, label: l }))}
          selected={filters.categories}
          onToggle={v => toggle('categories', v)}
        />
      </div>
    </div>
  );
}
