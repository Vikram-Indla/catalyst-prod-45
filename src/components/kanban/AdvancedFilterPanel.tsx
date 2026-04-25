/**
 * AdvancedFilterPanel — Board-level advanced filter triggered from ••• menu.
 * Filters: Fix Version, Issue Type, Status, Created Date, Assignee
 * Wires into the real Kanban board dataset via callback.
 */
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import {
  X, Search, Check, CalendarIcon, ChevronDown, Filter, Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KanbanThemeTokens } from '@/components/kanban/kanban-tokens';

/* ═══ Types ═══ */

export interface AdvancedFilters {
  fixVersions: string[];
  issueTypes: string[];
  statuses: string[];
  assignees: string[];
  createdAfter: string | null;   // ISO date
  createdBefore: string | null;  // ISO date
}

export const EMPTY_ADVANCED_FILTERS: AdvancedFilters = {
  fixVersions: [],
  issueTypes: [],
  statuses: [],
  assignees: [],
  createdAfter: null,
  createdBefore: null,
};

export function hasActiveAdvancedFilters(f: AdvancedFilters): boolean {
  return (
    f.fixVersions.length > 0 ||
    f.issueTypes.length > 0 ||
    f.statuses.length > 0 ||
    f.assignees.length > 0 ||
    !!f.createdAfter ||
    !!f.createdBefore
  );
}

export function countAdvancedFilters(f: AdvancedFilters): number {
  return [
    f.fixVersions.length > 0,
    f.issueTypes.length > 0,
    f.statuses.length > 0,
    f.assignees.length > 0,
    !!f.createdAfter || !!f.createdBefore,
  ].filter(Boolean).length;
}

/* ═══ Panel ═══ */

interface Props {
  projectKey: string;
  filters: AdvancedFilters;
  onChange: (f: AdvancedFilters) => void;
  onClose: () => void;
  tk: KanbanThemeTokens;
}

export function AdvancedFilterPanel({ projectKey, filters, onChange, onClose, tk }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    // Delay to avoid closing immediately from the menu click
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 100);
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', handler); };
  }, [onClose]);

  /* ── Data loaders ── */

  const { data: fixVersionOptions = [] } = useQuery({
    queryKey: ['adv-filter-fix-versions', projectKey],
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_issues')
        .select('fix_versions')
        .eq('project_key', projectKey.toUpperCase())
        .is('deleted_at', null)
        .is('archived_at', null)
        .not('fix_versions', 'is', null);
      const names = new Set<string>();
      (data ?? []).forEach((r: any) => {
        const fv = r.fix_versions;
        if (Array.isArray(fv)) {
          fv.forEach((v: any) => {
            const name = typeof v === 'string' ? v : v?.name;
            if (name) names.add(name);
          });
        }
      });
      return Array.from(names).sort();
    },
    staleTime: 120_000,
  });

  const { data: issueTypeOptions = [] } = useQuery({
    queryKey: ['adv-filter-issue-types', projectKey],
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_issues')
        .select('issue_type')
        .eq('project_key', projectKey.toUpperCase())
        .is('deleted_at', null)
        .is('archived_at', null);
      const types = new Set<string>();
      (data ?? []).forEach((r: any) => { if (r.issue_type) types.add(r.issue_type); });
      return Array.from(types).sort();
    },
    staleTime: 120_000,
  });

  const { data: statusOptions = [] } = useQuery({
    queryKey: ['adv-filter-statuses', projectKey],
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_issues')
        .select('status')
        .eq('project_key', projectKey.toUpperCase())
        .is('deleted_at', null)
        .is('archived_at', null);
      const statuses = new Set<string>();
      (data ?? []).forEach((r: any) => { if (r.status) statuses.add(r.status); });
      return Array.from(statuses).sort();
    },
    staleTime: 120_000,
  });

  const { data: assigneeOptions = [] } = useQuery({
    queryKey: ['adv-filter-assignees', projectKey],
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_issues')
        .select('assignee_display_name')
        .eq('project_key', projectKey.toUpperCase())
        .is('deleted_at', null)
        .is('archived_at', null);
      const names = new Set<string>();
      (data ?? []).forEach((r: any) => {
        if (r.assignee_display_name) names.add(r.assignee_display_name);
      });
      return ['Unassigned', ...Array.from(names).sort()];
    },
    staleTime: 120_000,
  });

  const update = useCallback((partial: Partial<AdvancedFilters>) => {
    onChange({ ...filters, ...partial });
  }, [filters, onChange]);

  const clearAll = useCallback(() => {
    onChange({ ...EMPTY_ADVANCED_FILTERS });
  }, [onChange]);

  const activeCount = countAdvancedFilters(filters);

  return (
    <div
      ref={panelRef}
      style={{
        position: 'absolute', top: '100%', right: 0, marginTop: 4,
        width: 400, background: '#FFFFFF',
        border: '1px solid #DDDEE1', borderRadius: 10,
        boxShadow: '0 12px 36px rgba(9,30,66,0.15), 0 2px 8px rgba(9,30,66,0.08)',
        zIndex: 60, fontFamily: 'var(--ds-font-family-body)',
        maxHeight: 'calc(100vh - 200px)', overflowY: 'auto',
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between" style={{
        padding: '14px 20px', borderBottom: '1px solid #EBECF0',
        background: '#FAFBFC',
        borderTopLeftRadius: 10, borderTopRightRadius: 10,
      }}>
        <div className="flex items-center gap-2">
          <Filter size={15} color="#42526E" />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#172B4D', letterSpacing: '-0.01em' }}>
            Advanced Filters
          </span>
          {activeCount > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 700, color: '#fff',
              background: '#2563EB', borderRadius: 10, padding: '2px 8px',
              lineHeight: '16px',
            }}>{activeCount}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <button onClick={clearAll} style={{
              fontSize: 12, color: '#DC2626', background: 'none', border: 'none',
              cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <Trash2 size={13} /> Clear all
            </button>
          )}
          <button onClick={onClose} style={{
            width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'none', border: 'none', cursor: 'pointer', borderRadius: 4,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <X size={15} color="#42526E" />
          </button>
        </div>
      </div>

      {/* Filter sections */}
      <div style={{ padding: '8px 0' }}>
        <MultiSelectFilterSection
          label="Fix Version"
          options={fixVersionOptions}
          selected={filters.fixVersions}
          onChange={v => update({ fixVersions: v })}
          tk={tk}
          placeholder="Search versions..."
        />
        <MultiSelectFilterSection
          label="Issue Type"
          options={issueTypeOptions}
          selected={filters.issueTypes}
          onChange={v => update({ issueTypes: v })}
          tk={tk}
          placeholder="Search types..."
        />
        <MultiSelectFilterSection
          label="Status"
          options={statusOptions}
          selected={filters.statuses}
          onChange={v => update({ statuses: v })}
          tk={tk}
          placeholder="Search statuses..."
        />
        <MultiSelectFilterSection
          label="Assignee"
          options={assigneeOptions}
          selected={filters.assignees}
          onChange={v => update({ assignees: v })}
          tk={tk}
          placeholder="Search assignees..."
        />
        <DateRangeFilterSection
          label="Created Date"
          after={filters.createdAfter}
          before={filters.createdBefore}
          onChangeAfter={v => update({ createdAfter: v })}
          onChangeBefore={v => update({ createdBefore: v })}
          tk={tk}
        />
      </div>
    </div>
  );
}

/* ═══ Multi-select section ═══ */

function MultiSelectFilterSection({
  label, options, selected, onChange, tk, placeholder,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  tk: KanbanThemeTokens;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(o => o.toLowerCase().includes(q));
  }, [options, search]);

  const toggle = useCallback((val: string) => {
    onChange(
      selected.includes(val)
        ? selected.filter(s => s !== val)
        : [...selected, val]
    );
  }, [selected, onChange]);

  return (
    <div style={{ borderBottom: '1px solid #EBECF0' }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between w-full"
        style={{
          padding: '12px 20px', background: 'transparent', border: 'none',
          cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#172B4D',
          textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <span className="flex items-center gap-2">
          {label}
          {selected.length > 0 && (
            <span style={{
              fontSize: 10, fontWeight: 700, color: '#fff',
              background: '#2563EB', borderRadius: 10, padding: '1px 7px',
              lineHeight: '16px',
            }}>{selected.length}</span>
          )}
        </span>
        <ChevronDown
          size={14} color="#5E6C84"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}
        />
      </button>
      {open && (
        <div style={{ padding: '0 16px 10px' }}>
          {options.length > 5 && (
            <div className="relative" style={{ marginBottom: 8 }}>
              <Search size={13} color="#94A3B8" className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder={placeholder}
                style={{
                  width: '100%', height: 32, paddingLeft: 28, paddingRight: 8,
                  border: '1px solid #DDDEE1', borderRadius: 4,
                  fontSize: 13, color: '#172B4D', background: '#FAFBFC',
                  outline: 'none', fontFamily: 'var(--ds-font-family-body)',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = '#2563EB')}
                onBlur={e => (e.currentTarget.style.borderColor = '#DDDEE1')}
              />
            </div>
          )}
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {filtered.map(opt => {
              const isSelected = selected.includes(opt);
              return (
                <button
                  key={opt}
                  onClick={() => toggle(opt)}
                  className="flex items-center gap-3 w-full"
                  style={{
                    padding: '7px 8px', background: isSelected ? 'rgba(37,99,235,0.06)' : 'transparent',
                    border: 'none', cursor: 'pointer', fontSize: 13.5,
                    color: '#172B4D', textAlign: 'left', borderRadius: 4,
                    fontWeight: isSelected ? 600 : 400,
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#F4F5F7'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{
                    width: 18, height: 18, borderRadius: 3,
                    border: isSelected ? 'none' : '2px solid #C1C7D0',
                    background: isSelected ? '#2563EB' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 150ms',
                  }}>
                    {isSelected && <Check size={12} color="#fff" strokeWidth={3} />}
                  </span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt}</span>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ padding: '10px 4px', fontSize: 13, color: '#5E6C84' }}>No results</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══ Date range section ═══ */

function DateRangeFilterSection({
  label, after, before, onChangeAfter, onChangeBefore, tk,
}: {
  label: string;
  after: string | null;
  before: string | null;
  onChangeAfter: (v: string | null) => void;
  onChangeBefore: (v: string | null) => void;
  tk: KanbanThemeTokens;
}) {
  const [open, setOpen] = useState(false);
  const hasValue = !!after || !!before;

  return (
    <div style={{ borderBottom: '1px solid #EBECF0' }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between w-full"
        style={{
          padding: '12px 20px', background: 'transparent', border: 'none',
          cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#172B4D',
          textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <span className="flex items-center gap-2">
          {label}
          {hasValue && (
            <span style={{
              fontSize: 10, fontWeight: 700, color: '#fff',
              background: '#2563EB', borderRadius: 10, padding: '1px 7px',
              lineHeight: '16px',
            }}>1</span>
          )}
        </span>
        <ChevronDown
          size={14} color="#5E6C84"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}
        />
      </button>
      {open && (
        <div style={{ padding: '0 16px 12px' }}>
          <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
            <DatePickerBtn
              label="After"
              value={after}
              onChange={onChangeAfter}
              tk={tk}
            />
            <span style={{ fontSize: 12, color: '#5E6C84', fontWeight: 500 }}>—</span>
            <DatePickerBtn
              label="Before"
              value={before}
              onChange={onChangeBefore}
              tk={tk}
            />
          </div>
          {hasValue && (
            <button
              onClick={() => { onChangeAfter(null); onChangeBefore(null); }}
              style={{
                fontSize: 12, color: '#DC2626', background: 'none', border: 'none',
                cursor: 'pointer', padding: 0, fontWeight: 500,
              }}
            >Clear dates</button>
          )}
        </div>
      )}
    </div>
  );
}

function DatePickerBtn({
  label, value, onChange, tk,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  tk: KanbanThemeTokens;
}) {
  const dateValue = value ? new Date(value) : undefined;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button style={{
          display: 'flex', alignItems: 'center', gap: 4,
          height: 28, padding: '0 8px', borderRadius: 4,
          border: `1px solid ${tk.inputBorder}`, background: tk.inputBg,
          cursor: 'pointer', fontSize: 11, color: value ? tk.textPrimary : tk.textMuted,
          fontFamily: 'var(--ds-font-family-body)', flex: 1, minWidth: 0,
        }}>
          <CalendarIcon size={12} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {value ? format(new Date(value), 'dd MMM yyyy') : label}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" style={{ zIndex: 100 }}>
        <Calendar
          mode="single"
          selected={dateValue}
          onSelect={(d) => onChange(d ? d.toISOString().split('T')[0] : null)}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}
