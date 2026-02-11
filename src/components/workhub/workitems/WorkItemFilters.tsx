/**
 * WorkItemFilters — Type pills with project badges, search
 * Reads distinct values from wh_issues (real synced data)
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ChevronDown, Check, FolderGit2, X } from 'lucide-react';
import { useIssueProjectKeys, useIssueTypes, useIssueStatuses } from '@/hooks/workhub/useWorkItems';
import type { WorkItemFilterConfig } from '@/hooks/workhub/useWorkItems';

interface WorkItemFiltersProps {
  filters: Partial<WorkItemFilterConfig>;
  onChange: (filters: Partial<WorkItemFilterConfig>) => void;
}

function FilterDropdown({
  label,
  badge,
  children,
  isActive,
}: {
  label: string;
  badge?: number;
  children: React.ReactNode;
  isActive: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-full border transition-colors"
        style={{
          borderColor: isActive ? 'var(--wh-primary, #2563eb)' : 'var(--wh-border, #e2e8f0)',
          backgroundColor: isActive ? '#eff6ff' : 'var(--wh-surface, #fff)',
          color: isActive ? 'var(--wh-primary, #2563eb)' : 'var(--wh-text-secondary, #64748b)',
        }}
      >
        {label}
        {badge != null && badge > 0 && (
          <span
            className="ml-0.5 inline-flex items-center justify-center rounded-full text-[10px] font-bold min-w-[18px] h-[18px] px-1"
            style={{
              backgroundColor: isActive ? 'var(--wh-primary, #2563eb)' : '#94a3b8',
              color: '#fff',
            }}
          >
            {badge}
          </span>
        )}
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div
          className="absolute top-full left-0 mt-1 min-w-[220px] max-h-[300px] overflow-y-auto rounded-lg border bg-white"
          style={{
            zIndex: 9999,
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
            borderColor: 'var(--wh-border, #e2e8f0)',
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function WorkItemFilters({ filters, onChange }: WorkItemFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search_query || '');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const { data: projectKeys = [] } = useIssueProjectKeys();
  const { data: issueTypes = [] } = useIssueTypes();
  const { data: statuses = [] } = useIssueStatuses();

  const selectedTypeCount = filters.types?.length ?? 0;
  const selectedProjectCount = filters.project_keys?.length ?? 0;
  const selectedStatusCount = filters.statuses?.length ?? 0;

  const handleSearch = (val: string) => {
    setSearchInput(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange({ ...filters, search_query: val || undefined });
    }, 300);
  };

  const toggleArrayFilter = (key: keyof WorkItemFilterConfig, val: string) => {
    const current = (filters[key] as string[]) || [];
    const next = current.includes(val) ? current.filter(v => v !== val) : [...current, val];
    onChange({ ...filters, [key]: next.length ? next : undefined });
  };

  const hasAnyFilter = selectedTypeCount > 0 || selectedProjectCount > 0 || selectedStatusCount > 0 || !!filters.search_query;

  return (
    <div className="space-y-3">
      {/* Row 1: Filter dropdowns */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Projects */}
        <FilterDropdown
          label={selectedProjectCount > 0 ? `${selectedProjectCount} Project${selectedProjectCount !== 1 ? 's' : ''}` : 'All Projects'}
          badge={selectedProjectCount > 0 ? selectedProjectCount : undefined}
          isActive={selectedProjectCount > 0}
        >
          {projectKeys.map(pk => (
            <button
              key={pk}
              onClick={() => toggleArrayFilter('project_keys', pk)}
              className="flex items-center justify-between w-full px-3 py-2 text-xs hover:bg-slate-50 transition-colors"
              style={{ color: 'var(--wh-text-primary, #0f172a)' }}
            >
              <span className="font-semibold">{pk}</span>
              {filters.project_keys?.includes(pk) && <Check className="w-3.5 h-3.5" style={{ color: 'var(--wh-primary, #2563eb)' }} />}
            </button>
          ))}
        </FilterDropdown>

        {/* Issue Types */}
        <FilterDropdown
          label={selectedTypeCount > 0 ? `${selectedTypeCount} Type${selectedTypeCount !== 1 ? 's' : ''}` : 'All Types'}
          badge={selectedTypeCount > 0 ? selectedTypeCount : undefined}
          isActive={selectedTypeCount > 0}
        >
          {issueTypes.map(t => (
            <button
              key={t}
              onClick={() => toggleArrayFilter('types', t)}
              className="flex items-center justify-between w-full px-3 py-2 text-xs hover:bg-slate-50 transition-colors"
              style={{ color: 'var(--wh-text-primary, #0f172a)' }}
            >
              <span>{t}</span>
              {filters.types?.includes(t) && <Check className="w-3.5 h-3.5" style={{ color: 'var(--wh-primary, #2563eb)' }} />}
            </button>
          ))}
        </FilterDropdown>

        {/* Statuses */}
        <FilterDropdown
          label={selectedStatusCount > 0 ? `${selectedStatusCount} Status${selectedStatusCount !== 1 ? 'es' : ''}` : 'All Statuses'}
          badge={selectedStatusCount > 0 ? selectedStatusCount : undefined}
          isActive={selectedStatusCount > 0}
        >
          {statuses.map(s => (
            <button
              key={s}
              onClick={() => toggleArrayFilter('statuses', s)}
              className="flex items-center justify-between w-full px-3 py-2 text-xs hover:bg-slate-50 transition-colors"
              style={{ color: 'var(--wh-text-primary, #0f172a)' }}
            >
              <span>{s}</span>
              {filters.statuses?.includes(s) && <Check className="w-3.5 h-3.5" style={{ color: 'var(--wh-primary, #2563eb)' }} />}
            </button>
          ))}
        </FilterDropdown>

        <div className="flex-1" />

        {hasAnyFilter && (
          <button
            onClick={() => {
              onChange({});
              setSearchInput('');
            }}
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-full hover:bg-red-50 transition-colors"
            style={{ color: '#dc2626' }}
          >
            <X className="w-3 h-3" /> Clear all
          </button>
        )}
      </div>

      {/* Selected project chips */}
      {selectedProjectCount > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <FolderGit2 className="w-3.5 h-3.5" style={{ color: 'var(--wh-text-tertiary, #94a3b8)' }} />
          <span className="text-[11px] font-medium" style={{ color: 'var(--wh-text-tertiary, #94a3b8)' }}>
            Projects:
          </span>
          {filters.project_keys!.map(pk => (
            <span
              key={pk}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold"
              style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}
            >
              {pk}
              <button onClick={() => toggleArrayFilter('project_keys', pk)} className="hover:text-red-500">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
          style={{ color: 'var(--wh-text-tertiary, #94a3b8)' }}
        />
        <input
          type="text"
          placeholder="Search by key or summary..."
          value={searchInput}
          onChange={e => handleSearch(e.target.value)}
          className="w-full pl-9 pr-4 rounded-lg border outline-none transition-colors"
          style={{
            height: '36px',
            fontSize: '13px',
            borderColor: 'var(--wh-border, #e2e8f0)',
            color: 'var(--wh-text-primary, #0f172a)',
          }}
          onFocus={e => (e.target.style.borderColor = 'var(--wh-primary, #2563eb)')}
          onBlur={e => (e.target.style.borderColor = 'var(--wh-border, #e2e8f0)')}
        />
      </div>
    </div>
  );
}
