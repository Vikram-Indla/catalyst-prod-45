/**
 * WorkItemFilters — Type pills with project badges, dropdown filters, search
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ChevronDown, Check, FolderGit2 } from 'lucide-react';
import { useWHJiraProjects } from '@/hooks/workhub/useJiraProjects';
import { useWHThemes } from '@/hooks/workhub/useThemes';
import { useWHReleases } from '@/hooks/workhub/useReleases';
import { useWHResources } from '@/hooks/workhub/useResources';
import type { WorkItemFilterConfig } from '@/hooks/workhub/useWorkItems';

interface WorkItemFiltersProps {
  filters: Partial<WorkItemFilterConfig>;
  onChange: (filters: Partial<WorkItemFilterConfig>) => void;
}

type TypePill = { label: string; value: string[] };
const TYPE_PILLS: TypePill[] = [
  { label: 'All Types', value: [] },
  { label: 'Epics', value: ['Epic'] },
  { label: 'Stories', value: ['Story'] },
  { label: 'Bugs', value: ['Bug'] },
  { label: 'Tasks', value: ['Task'] },
  { label: 'Subtasks', value: ['Subtask'] },
];

function FilterDropdown({ label, badge, children, isActive }: { label: string; badge?: number; children: React.ReactNode; isActive: boolean }) {
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
          borderColor: isActive ? 'var(--wh-primary)' : 'var(--wh-border)',
          backgroundColor: isActive ? 'var(--wh-primary-light)' : 'var(--wh-surface)',
          color: isActive ? 'var(--wh-primary)' : 'var(--wh-text-secondary)',
        }}
      >
        {label}
        {badge != null && badge > 0 && (
          <span
            className="ml-0.5 inline-flex items-center justify-center rounded-full text-[10px] font-bold min-w-[18px] h-[18px] px-1"
            style={{
              backgroundColor: isActive ? 'var(--wh-primary)' : '#94a3b8',
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
          className="absolute top-full left-0 mt-1 min-w-[200px] max-h-[240px] overflow-y-auto rounded-lg border bg-white"
          style={{
            zIndex: 9999,
            boxShadow: 'var(--wh-shadow-lg)',
            borderColor: 'var(--wh-border)',
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

  const { data: projects } = useWHJiraProjects();
  const { data: themes } = useWHThemes();
  const { data: releases } = useWHReleases();
  const { data: resources } = useWHResources();

  const activeType = filters.types?.length
    ? TYPE_PILLS.find(p => JSON.stringify(p.value) === JSON.stringify(filters.types))?.label || 'All Types'
    : 'All Types';

  const selectedProjectCount = filters.project_ids?.length ?? 0;

  const handleSearch = (val: string) => {
    setSearchInput(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange({ ...filters, search_query: val || undefined });
    }, 300);
  };

  const toggleArrayFilter = (key: keyof WorkItemFilterConfig, id: string) => {
    const current = (filters[key] as string[]) || [];
    const next = current.includes(id) ? current.filter(v => v !== id) : [...current, id];
    onChange({ ...filters, [key]: next.length ? next : undefined });
  };

  // Selected project keys for display
  const selectedProjectKeys = useMemo(() => {
    if (!filters.project_ids?.length || !projects) return [];
    return filters.project_ids.map(id => {
      const p = projects.find(proj => proj.id === id);
      return p ? { key: p.project_key, color: p.color } : null;
    }).filter(Boolean) as { key: string; color: string }[];
  }, [filters.project_ids, projects]);

  return (
    <div className="space-y-3">
      {/* Row 1: Type pills + dropdowns */}
      <div className="flex items-center gap-2 flex-wrap" data-print-hide="true">
        {/* Type pills */}
        {TYPE_PILLS.map(pill => (
          <button
            key={pill.label}
            onClick={() => onChange({ ...filters, types: pill.value.length ? pill.value : undefined })}
            className="px-4 py-1.5 text-[13px] font-medium rounded-full transition-colors"
            style={{
              backgroundColor: activeType === pill.label ? 'var(--wh-primary)' : '#f1f5f9',
              color: activeType === pill.label ? 'white' : 'var(--wh-text-secondary)',
            }}
          >
            {pill.label}
          </button>
        ))}

        <div className="flex-1" />

        {/* Projects with badge */}
        <FilterDropdown
          label={selectedProjectCount > 0 ? `${selectedProjectCount} Project${selectedProjectCount !== 1 ? 's' : ''}` : 'All Projects'}
          badge={selectedProjectCount > 0 ? selectedProjectCount : undefined}
          isActive={selectedProjectCount > 0}
        >
          {(projects ?? []).map(p => (
            <button
              key={p.id}
              onClick={() => toggleArrayFilter('project_ids', p.id)}
              className="flex items-center justify-between w-full px-3 py-2 text-xs hover:bg-slate-50 transition-colors"
              style={{ color: 'var(--wh-text-primary)' }}
            >
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                <span className="font-semibold">{p.project_key}</span>
                <span style={{ color: 'var(--wh-text-tertiary)' }}>{p.name}</span>
              </span>
              {filters.project_ids?.includes(p.id) && <Check className="w-3.5 h-3.5" style={{ color: 'var(--wh-primary)' }} />}
            </button>
          ))}
        </FilterDropdown>

        {/* Themes */}
        <FilterDropdown label="All Themes" isActive={!!filters.theme_ids?.length}>
          {(themes ?? []).map(t => (
            <button
              key={t.id}
              onClick={() => toggleArrayFilter('theme_ids', t.id)}
              className="flex items-center justify-between w-full px-3 py-2 text-xs hover:bg-slate-50 transition-colors"
              style={{ color: 'var(--wh-text-primary)' }}
            >
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                {t.name}
              </span>
              {filters.theme_ids?.includes(t.id) && <Check className="w-3.5 h-3.5" style={{ color: 'var(--wh-primary)' }} />}
            </button>
          ))}
        </FilterDropdown>

        {/* Releases */}
        <FilterDropdown label="All Releases" isActive={!!filters.release_ids?.length}>
          {(releases ?? []).map(r => (
            <button
              key={r.id}
              onClick={() => toggleArrayFilter('release_ids', r.id)}
              className="flex items-center justify-between w-full px-3 py-2 text-xs hover:bg-slate-50 transition-colors"
              style={{ color: 'var(--wh-text-primary)' }}
            >
              <span>{r.name} — {r.title}</span>
              {filters.release_ids?.includes(r.id) && <Check className="w-3.5 h-3.5" style={{ color: 'var(--wh-primary)' }} />}
            </button>
          ))}
        </FilterDropdown>

        {/* Assignees */}
        <FilterDropdown label="All Assignees" isActive={!!filters.assignee_ids?.length}>
          {(resources ?? []).map(r => (
            <button
              key={r.id}
              onClick={() => toggleArrayFilter('assignee_ids', r.user_id)}
              className="flex items-center justify-between w-full px-3 py-2 text-xs hover:bg-slate-50 transition-colors"
              style={{ color: 'var(--wh-text-primary)' }}
            >
              <span className="flex items-center gap-2">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                  style={{ backgroundColor: r.color }}
                >
                  {r.name[0]}
                </span>
                {r.name}
              </span>
              {filters.assignee_ids?.includes(r.user_id) && <Check className="w-3.5 h-3.5" style={{ color: 'var(--wh-primary)' }} />}
            </button>
          ))}
        </FilterDropdown>
      </div>

      {/* Selected project chips row */}
      {selectedProjectKeys.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap" data-print-hide="true">
          <FolderGit2 className="w-3.5 h-3.5" style={{ color: 'var(--wh-text-tertiary)' }} />
          <span className="text-[11px] font-medium" style={{ color: 'var(--wh-text-tertiary)' }}>Filtered:</span>
          {selectedProjectKeys.map(p => (
            <span
              key={p.key}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold"
              style={{
                backgroundColor: `${p.color}15`,
                color: p.color,
                border: `1px solid ${p.color}30`,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
              {p.key}
            </span>
          ))}
          <button
            onClick={() => onChange({ ...filters, project_ids: undefined })}
            className="text-[10px] font-medium ml-1 hover:underline"
            style={{ color: 'var(--wh-primary)' }}
          >
            Clear
          </button>
        </div>
      )}

      {/* Row 2: Search */}
      <div className="relative" data-print-hide="true">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
          style={{ color: 'var(--wh-text-tertiary)' }}
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
            fontFamily: 'var(--wh-font-sans)',
            borderColor: 'var(--wh-border)',
            borderRadius: 'var(--wh-radius-lg)',
            color: 'var(--wh-text-primary)',
          }}
          onFocus={e => (e.target.style.borderColor = 'var(--wh-primary)')}
          onBlur={e => (e.target.style.borderColor = 'var(--wh-border)')}
        />
      </div>
    </div>
  );
}
