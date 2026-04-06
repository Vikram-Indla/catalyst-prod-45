import { X, ChevronDown } from 'lucide-react';
import type { ProjectFilters } from '@/types/projecthub';
import { PROJECT_HEALTH_DISPLAY, STATUS_CATEGORY_DISPLAY } from '@/types/projecthub';
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
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

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
    <div ref={ref} style={{ position: 'relative' }}>
      <div className="text-[rgba(237,237,237,0.40)] dark:text-[rgba(255,255,255,0.55)]" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{label}</div>
      <button
        onClick={() => setOpen(!open)}
        className="bg-white dark:bg-transparent border-[1.5px] border-[rgba(255,255,255,0.10)] dark:border-[rgba(255,255,255,0.10)]"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', height: 50, padding: '8px 12px',
          fontSize: 13, color: selected.length > 0 ? (isDark ? 'rgba(255,255,255,0.92)' : 'var(--fg-1)') : (isDark ? 'rgba(255,255,255,0.40)' : 'var(--fg-4)'),
          borderRadius: 6, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{display}</span>
        <ChevronDown size={14} className="text-[rgba(237,237,237,0.40)] dark:text-[rgba(255,255,255,0.40)]" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms', flexShrink: 0 }} />
      </button>
      {open && (
        <div className="bg-white dark:bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] dark:border-[rgba(255,255,255,0.10)]" style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          borderRadius: 8, boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.60)' : '0 10px 15px -3px rgba(0,0,0,0.1)',
          maxHeight: 220, overflowY: 'auto', padding: 4, zIndex: 50,
        }}>
          {options.map(o => {
            const active = selected.includes(o.value);
            return (
              <button
                key={o.value}
                onClick={() => onToggle(o.value)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '7px 10px', borderRadius: 6,
                  fontSize: 13,
                  color: active ? '#2563EB' : (isDark ? 'rgba(255,255,255,0.72)' : 'var(--fg-2)'),
                  background: active ? (isDark ? 'rgba(59,130,246,0.10)' : 'var(--cp-blue-wash)') : 'transparent',
                  fontWeight: active ? 600 : 400,
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                }}
                onMouseEnter={e => { if (!active) (e.target as HTMLElement).style.background = isDark ? 'rgba(255,255,255,0.03)' : 'var(--bg-1)'; }}
                onMouseLeave={e => { if (!active) (e.target as HTMLElement).style.background = 'transparent'; }}
              >
                <span style={{
                  width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                  border: `1.5px solid ${active ? 'var(--cp-blue)' : (isDark ? 'rgba(255,255,255,0.20)' : 'rgba(237,237,237,0.53)')}`,
                  background: active ? '#2563EB' : (isDark ? 'transparent' : 'var(--bg-app)'),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
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
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  const toggle = (key: keyof Pick<ProjectFilters, 'departments' | 'healths' | 'categories'>, value: string) => {
    const arr = filters[key];
    onChange({ ...filters, [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] });
  };

  const clearAll = () => {
    onChange({ ...filters, departments: [], healths: [], categories: [] });
  };

  const hasFilters = filters.departments.length + filters.healths.length + filters.categories.length > 0;

  return (
    <div className="bg-white dark:bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] dark:border-[rgba(255,255,255,0.10)]" style={{ borderRadius: 8, padding: 16, marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span className="text-[rgba(237,237,237,0.93)] dark:text-[rgba(255,255,255,0.92)]" style={{ fontSize: 13, fontWeight: 600 }}>Advanced Filters</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {hasFilters && (
            <button onClick={clearAll} style={{ fontSize: 12, color: 'var(--sem-danger)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}>
              Clear all
            </button>
          )}
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
            <X size={16} className="text-[rgba(237,237,237,0.40)] dark:text-[rgba(255,255,255,0.55)]" />
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <FilterDropdown label="Department" placeholder="All departments" options={departments.map(d => ({ value: d, label: d }))} selected={filters.departments} onToggle={v => toggle('departments', v)} />
        <FilterDropdown label="Health" placeholder="All health" options={Object.entries(PROJECT_HEALTH_DISPLAY).map(([v, l]) => ({ value: v, label: l }))} selected={filters.healths} onToggle={v => toggle('healths', v)} />
        <FilterDropdown label="Category" placeholder="All categories" options={Object.entries(STATUS_CATEGORY_DISPLAY).map(([v, l]) => ({ value: v, label: l }))} selected={filters.categories} onToggle={v => toggle('categories', v)} />
      </div>
    </div>
  );
}