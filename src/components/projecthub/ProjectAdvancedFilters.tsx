import { X } from 'lucide-react';
import type { ProjectFilters } from '@/types/projecthub';
import { PROJECT_STATUS_DISPLAY, PROJECT_HEALTH_DISPLAY, STATUS_CATEGORY_DISPLAY } from '@/types/projecthub';

interface AdvancedFiltersProps {
  filters: ProjectFilters;
  onChange: (f: ProjectFilters) => void;
  departments: string[];
  onClose: () => void;
}

function MultiSelect({ label, options, selected, onToggle }: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map(o => {
          const active = selected.includes(o.value);
          return (
            <button
              key={o.value}
              onClick={() => onToggle(o.value)}
              className="rounded-full transition-all"
              style={{
                padding: '4px 12px',
                fontSize: 12,
                fontWeight: active ? 600 : 400,
                background: active ? '#EFF6FF' : '#F8FAFC',
                color: active ? '#2563EB' : '#64748B',
                border: `1px solid ${active ? '#BFDBFE' : '#E2E8F0'}`,
                cursor: 'pointer',
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ProjectAdvancedFilters({ filters, onChange, departments, onClose }: AdvancedFiltersProps) {
  const toggle = (key: keyof Pick<ProjectFilters, 'departments' | 'statuses' | 'healths' | 'categories'>, value: string) => {
    const arr = filters[key];
    onChange({ ...filters, [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] });
  };

  const hasActive = filters.departments.length + filters.statuses.length + filters.healths.length + filters.categories.length > 0;

  return (
    <div className="rounded-lg" style={{ background: '#FFF', border: '1px solid #E2E8F0', padding: '16px 20px', marginBottom: 12 }}>
      <div className="flex items-center justify-between mb-4">
        <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Advanced Filters</span>
        <div className="flex items-center gap-3">
          {hasActive && (
            <button
              onClick={() => onChange({ ...filters, departments: [], statuses: [], healths: [], categories: [] })}
              style={{ fontSize: 12, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
            >
              Clear all
            </button>
          )}
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
            <X size={16} color="#64748B" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MultiSelect
          label="Department"
          options={departments.map(d => ({ value: d, label: d }))}
          selected={filters.departments}
          onToggle={v => toggle('departments', v)}
        />
        <MultiSelect
          label="Status"
          options={Object.entries(PROJECT_STATUS_DISPLAY).filter(([k]) => !['cancelled', 'archived'].includes(k)).map(([v, l]) => ({ value: v, label: l }))}
          selected={filters.statuses}
          onToggle={v => toggle('statuses', v)}
        />
        <MultiSelect
          label="Health"
          options={Object.entries(PROJECT_HEALTH_DISPLAY).map(([v, l]) => ({ value: v, label: l }))}
          selected={filters.healths}
          onToggle={v => toggle('healths', v)}
        />
        <MultiSelect
          label="Category"
          options={Object.entries(STATUS_CATEGORY_DISPLAY).map(([v, l]) => ({ value: v, label: l }))}
          selected={filters.categories}
          onToggle={v => toggle('categories', v)}
        />
      </div>
    </div>
  );
}
