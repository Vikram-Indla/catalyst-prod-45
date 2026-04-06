/**
 * WorkItemFilters — Jira-style smart multi-select filter dropdowns
 * Features: inline search, select all/none, selected chips, badge counts
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, ChevronDown, Check, X, Milestone, FolderGit2, Layers, Activity, Filter } from 'lucide-react';
import { useIssueProjectKeys, useIssueTypes, useIssueStatuses, useIssueFixVersions } from '@/hooks/workhub/useWorkItems';
import type { WorkItemFilterConfig } from '@/hooks/workhub/useWorkItems';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface WorkItemFiltersProps {
  filters: Partial<WorkItemFilterConfig>;
  onChange: (filters: Partial<WorkItemFilterConfig>) => void;
}

/* ─── Jira-style Smart Multi-Select Dropdown ──────────────────────── */

interface SmartFilterDropdownProps {
  label: string;
  icon: React.ReactNode;
  options: { value: string; label: string; meta?: string }[];
  selected: string[];
  onSelectionChange: (selected: string[]) => void;
  emptyMessage?: string;
}

function SmartFilterDropdown({ label, icon, options, selected, onSelectionChange, emptyMessage }: SmartFilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (open && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q));
  }, [options, search]);

  const toggle = (val: string) => {
    const next = selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val];
    onSelectionChange(next);
  };

  const selectAll = () => onSelectionChange(filtered.map(o => o.value));
  const selectNone = () => {
    const filteredValues = new Set(filtered.map(o => o.value));
    onSelectionChange(selected.filter(s => !filteredValues.has(s)));
  };

  const isActive = selected.length > 0;
  const allFilteredSelected = filtered.length > 0 && filtered.every(o => selected.includes(o.value));

  return (
    <div ref={ref} className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-md border transition-all"
        style={{
          borderColor: isActive ? 'var(--wh-primary, #2563eb)' : 'var(--wh-border, #e2e8f0)',
          backgroundColor: isActive ? '#eff6ff' : 'var(--wh-surface, #fff)',
          color: isActive ? 'var(--wh-primary, #2563eb)' : 'var(--wh-text-secondary, #64748b)',
        }}
      >
        <span className="w-3.5 h-3.5 shrink-0 flex items-center justify-center">{icon}</span>
        <span>{isActive ? `${label}` : `All ${label}`}</span>
        {isActive && (
          <span
            className="inline-flex items-center justify-center rounded text-[10px] font-bold min-w-[18px] h-[18px] px-1"
            style={{ backgroundColor: 'var(--wh-primary, #2563eb)', color: '#fff' }}
          >
            {selected.length}
          </span>
        )}
        <ChevronDown className="w-3 h-3 ml-0.5" style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 150ms' }} />
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div
          className="absolute top-full left-0 mt-1 w-[300px] rounded-lg border bg-white flex flex-col"
          style={{
            zIndex: 9999,
            boxShadow: '0 10px 40px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.08)',
            borderColor: 'var(--wh-border, #e2e8f0)',
            maxHeight: '380px',
          }}
        >
          {/* Search Input */}
          <div className="p-2 border-b" style={{ borderColor: 'var(--wh-border, #e2e8f0)' }}>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#94a3b8' }} />
              <input
                ref={searchRef}
                type="text"
                placeholder={`Search ${label.toLowerCase()}...`}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border outline-none transition-colors"
                style={{
                  borderColor: 'var(--wh-border, #e2e8f0)',
                  color: 'var(--wh-text-primary, #0f172a)',
                  backgroundColor: '#f8fafc',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--wh-primary, #2563eb)')}
                onBlur={e => (e.target.style.borderColor = 'var(--wh-border, #e2e8f0)')}
              />
            </div>
          </div>

          {/* Select All / None */}
          {options.length > 0 && (
            <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ borderColor: 'var(--wh-border, #e2e8f0)' }}>
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#94a3b8' }}>
                {filtered.length} option{filtered.length !== 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAll}
                  className="text-[11px] font-medium hover:underline"
                  style={{ color: 'var(--wh-primary, #2563eb)' }}
                >
                  Select all
                </button>
                <span style={{ color: '#cbd5e1' }}>|</span>
                <button
                  onClick={selectNone}
                  className="text-[11px] font-medium hover:underline"
                  style={{ color: '#64748b' }}
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="overflow-y-auto flex-1" style={{ maxHeight: '260px' }}>
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-xs text-center" style={{ color: '#94a3b8' }}>
                {emptyMessage || 'No options found'}
              </div>
            ) : (
              filtered.map(opt => {
                const isSelected = selected.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    onClick={() => toggle(opt.value)}
                    className="flex items-center w-full px-3 py-2 text-xs transition-colors group"
                    style={{
                      backgroundColor: isSelected ? '#f0f7ff' : 'transparent',
                      color: 'var(--wh-text-primary, #0f172a)',
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) (e.currentTarget.style.backgroundColor = '#f8fafc');
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = isSelected ? '#f0f7ff' : 'transparent';
                    }}
                  >
                    {/* Checkbox */}
                    <div
                      className="w-4 h-4 rounded border flex items-center justify-center shrink-0 mr-2.5 transition-colors"
                      style={{
                        borderColor: isSelected ? 'var(--wh-primary, #2563eb)' : '#cbd5e1',
                        backgroundColor: isSelected ? 'var(--wh-primary, #2563eb)' : 'transparent',
                      }}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5" style={{ color: '#fff' }} />}
                    </div>
                    <span className="truncate flex-1 text-left font-medium">{opt.label}</span>
                    {opt.meta && (
                      <span className="text-[10px] shrink-0 ml-2" style={{ color: '#94a3b8' }}>
                        {opt.meta}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer showing selected count */}
          {selected.length > 0 && (
            <div
              className="px-3 py-2 border-t flex items-center justify-between"
              style={{ borderColor: 'var(--wh-border, #e2e8f0)', backgroundColor: '#f8fafc' }}
            >
              <span className="text-[11px] font-medium" style={{ color: '#64748b' }}>
                {selected.length} selected
              </span>
              <button
                onClick={() => { onSelectionChange([]); setSearch(''); }}
                className="text-[11px] font-medium hover:underline"
                style={{ color: '#dc2626' }}
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main Filters Component ──────────────────────────────────────── */

export function WorkItemFilters({ filters, onChange }: WorkItemFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search_query || '');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const { data: projectKeys = [] } = useIssueProjectKeys();
  const { data: issueTypes = [] } = useIssueTypes();
  const { data: statuses = [] } = useIssueStatuses();
  const { data: fixVersions = [] } = useIssueFixVersions();

  // Fetch project names from ph_jira_projects for display labels
  const { data: projectNameMap = {} } = useQuery({
    queryKey: ['ph-jira-project-names'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_jira_projects')
        .select('project_key, name');
      if (!data) return {};
      const map: Record<string, string> = {};
      data.forEach(p => { map[p.project_key] = p.name; });
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });

  const projectOptions = useMemo(() => projectKeys.map(pk => ({
    value: pk,
    label: projectNameMap[pk] ? `${pk} - ${projectNameMap[pk].replace(/^.*? - /, '')}` : pk,
  })), [projectKeys, projectNameMap]);
  const typeOptions = useMemo(() => issueTypes.map(t => ({ value: t, label: t })), [issueTypes]);
  const statusOptions = useMemo(() => statuses.map(s => ({ value: s, label: s })), [statuses]);
  const releaseOptions = useMemo(
    () => fixVersions.map(v => ({ value: v.name, label: v.name, meta: v.releaseDate || undefined })),
    [fixVersions]
  );

  const handleSearch = (val: string) => {
    setSearchInput(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange({ ...filters, search_query: val || undefined });
    }, 300);
  };

  const updateFilter = useCallback((key: keyof WorkItemFilterConfig, values: string[]) => {
    onChange({ ...filters, [key]: values.length ? values : undefined });
  }, [filters, onChange]);

  const selectedProjects = filters.project_keys || [];
  const selectedTypes = filters.types || [];
  const selectedStatuses = filters.statuses || [];
  const selectedReleases = filters.fix_version_names || [];

  const hasAnyFilter = selectedProjects.length > 0 || selectedTypes.length > 0 || selectedStatuses.length > 0 || selectedReleases.length > 0 || !!filters.search_query;

  const totalActive = selectedProjects.length + selectedTypes.length + selectedStatuses.length + selectedReleases.length;

  const removeChip = (key: keyof WorkItemFilterConfig, val: string) => {
    const current = (filters[key] as string[]) || [];
    const next = current.filter(v => v !== val);
    onChange({ ...filters, [key]: next.length ? next : undefined });
  };

  return (
    <div className="space-y-2">
      {/* Row 1: Filter dropdowns + search */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Filter icon */}
        <div className="flex items-center gap-1.5 mr-1">
          <Filter className="w-4 h-4" style={{ color: 'var(--wh-text-tertiary, #94a3b8)' }} />
          {totalActive > 0 && (
            <span className="text-[11px] font-semibold" style={{ color: 'var(--wh-primary, #2563eb)' }}>
              {totalActive}
            </span>
          )}
        </div>

        <SmartFilterDropdown
          label="Projects"
          icon={<FolderGit2 className="w-3.5 h-3.5" />}
          options={projectOptions}
          selected={selectedProjects}
          onSelectionChange={vals => updateFilter('project_keys', vals)}
          emptyMessage="No projects found in synced data"
        />

        <SmartFilterDropdown
          label="Types"
          icon={<Layers className="w-3.5 h-3.5" />}
          options={typeOptions}
          selected={selectedTypes}
          onSelectionChange={vals => updateFilter('types', vals)}
          emptyMessage="No issue types found"
        />

        <SmartFilterDropdown
          label="Statuses"
          icon={<Activity className="w-3.5 h-3.5" />}
          options={statusOptions}
          selected={selectedStatuses}
          onSelectionChange={vals => updateFilter('statuses', vals)}
          emptyMessage="No statuses found"
        />

        <SmartFilterDropdown
          label="Releases"
          icon={<Milestone className="w-3.5 h-3.5" />}
          options={releaseOptions}
          selected={selectedReleases}
          onSelectionChange={vals => updateFilter('fix_version_names', vals)}
          emptyMessage="No fix versions found in synced data"
        />

        <div className="flex-1" />

        {hasAnyFilter && (
          <button
            onClick={() => { onChange({}); setSearchInput(''); }}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md border transition-colors"
            style={{ borderColor: '#fecaca', color: '#dc2626', backgroundColor: '#fef2f2' }}
          >
            <X className="w-3 h-3" /> Clear all
          </button>
        )}
      </div>

      {/* Row 2: Selected filter chips */}
      {totalActive > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pl-7">
          {selectedProjects.map(pk => (
            <FilterChip key={`p-${pk}`} label={pk} color="#2563eb" bgColor="#eff6ff" borderColor="#bfdbfe" onRemove={() => removeChip('project_keys', pk)} />
          ))}
          {selectedTypes.map(t => (
            <FilterChip key={`t-${t}`} label={t} color="#2563EB" bgColor="var(--tint-blue, #EFF6FF)" borderColor="#BFDBFE" onRemove={() => removeChip('types', t)} />
          ))}
          {selectedStatuses.map(s => (
            <FilterChip key={`s-${s}`} label={s} color="#0891b2" bgColor="#ecfeff" borderColor="#a5f3fc" onRemove={() => removeChip('statuses', s)} />
          ))}
          {selectedReleases.map(r => (
            <FilterChip key={`r-${r}`} label={r} color="#059669" bgColor="#ecfdf5" borderColor="#a7f3d0" onRemove={() => removeChip('fix_version_names', r)} />
          ))}
        </div>
      )}

      {/* Row 3: Search */}
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

/* ─── Filter Chip ─────────────────────────────────────────────────── */

function FilterChip({ label, color, bgColor, borderColor, onRemove }: {
  label: string; color: string; bgColor: string; borderColor: string; onRemove: () => void;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition-colors"
      style={{ backgroundColor: bgColor, color, border: `1px solid ${borderColor}` }}
    >
      {label}
      <button onClick={onRemove} className="hover:opacity-70 transition-opacity">
        <X className="w-2.5 h-2.5" />
      </button>
    </span>
  );
}
