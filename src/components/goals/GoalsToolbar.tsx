/**
 * GoalsToolbar — View switcher, search, filter chips, expand toggle
 * ECLIPSE D8: Dark mode parity
 */
import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, ChevronsUpDown, List, Network, Grid3X3, X } from 'lucide-react';

interface GoalsToolbarProps {
  currentView: 'tree' | 'list' | 'heatmap';
  onViewChange: (view: 'tree' | 'list' | 'heatmap') => void;
  searchQuery: string;
  onSearch: (q: string) => void;
  onExpandAll: () => void;
  isAllExpanded: boolean;
  activeFilters?: Record<string, string[]>;
  onFiltersChange?: (filters: Record<string, string[]>) => void;
  filterOptions?: {
    statuses: string[];
    themes: { id: string; title: string; color: string }[];
    owners: { id: string; name: string }[];
    quarters: string[];
  };
  isDark?: boolean;
}

const DK = {
  t1: 'var(--cp-t1)',
  t2: 'var(--cp-t2)',
  t3: 'var(--cp-t3)',
  border: 'var(--ds-border, #2E2E2E)',
  hover: 'var(--ds-surface-overlay, #1F1F1F)',
  float: 'var(--ds-surface-raised, #1A1A1A)',
};

const viewButtons: { key: 'tree' | 'list' | 'heatmap'; label: string; icon: typeof List }[] = [
  { key: 'tree', label: 'Tree', icon: Network },
  { key: 'list', label: 'List', icon: List },
  { key: 'heatmap', label: 'Heatmap', icon: Grid3X3 },
];

const STATUS_LABELS: Record<string, string> = {
  active: 'Active', at_risk: 'At Risk', off_track: 'Off Track',
  draft: 'Draft', completed: 'Completed', on_track: 'On Track', cancelled: 'Cancelled',
};

function FilterDropdown({
  label, options, selected, onToggle, onClear, renderOption, isDark = false,
}: {
  label: string;
  options: { id: string; label: string; color?: string }[];
  selected: string[];
  onToggle: (id: string) => void;
  onClear: () => void;
  renderOption?: (opt: { id: string; label: string; color?: string }) => React.ReactNode;
  isDark?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '5px 10px', fontSize: 12, fontWeight: 500,
          color: selected.length > 0 ? 'var(--ds-text-brand, #2563EB)' : (isDark ? DK.t2 : 'var(--fg-3)'),
          background: selected.length > 0 ? 'rgba(37,99,235,0.06)' : (isDark ? 'transparent' : 'var(--bg-app)'),
          border: `1px solid ${selected.length > 0 ? 'rgba(37,99,235,0.3)' : (isDark ? DK.border : 'var(--divider)')}`,
          borderRadius: 8, cursor: 'pointer',
        }}
      >
        {label}
        {selected.length > 0 && <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--cp-blue)', color: 'var(--ds-surface, #FFF)', borderRadius: 99, padding: '0 5px', lineHeight: '16px' }}>{selected.length}</span>}
        <ChevronDown size={12} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4,
          background: isDark ? DK.float : 'var(--bg-app)',
          border: `1px solid ${isDark ? DK.border : 'var(--divider)'}`, borderRadius: 8,
          boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.3)' : '0 4px 16px rgba(0,0,0,0.08)',
          padding: 6, minWidth: 180, zIndex: 9999, maxHeight: 240, overflowY: 'auto',
        }}>
          {selected.length > 0 && (
            <button onClick={() => { onClear(); }} style={{ fontSize: 11, color: 'var(--sem-danger)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', width: '100%', textAlign: 'left', marginBottom: 4 }}>
              Clear all
            </button>
          )}
          {options.map(opt => {
            const isSelected = selected.includes(opt.id);
            return (
              <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 12, color: isDark ? DK.t1 : 'var(--fg-1)' }}
                onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'var(--ds-border, #292929)' : 'var(--cp-bd-zone)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <input type="checkbox" checked={isSelected} onChange={() => onToggle(opt.id)} style={{ accentColor: 'var(--cp-blue)' }} />
                {renderOption ? renderOption(opt) : (
                  <>
                    {opt.color && <span style={{ width: 8, height: 8, borderRadius: 4, background: opt.color, flexShrink: 0 }} />}
                    {opt.label}
                  </>
                )}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function GoalsToolbar({
  currentView, onViewChange, searchQuery, onSearch,
  onExpandAll, isAllExpanded,
  activeFilters = {}, onFiltersChange, filterOptions,
  isDark = false,
}: GoalsToolbarProps) {
  const toggleFilter = (key: string, id: string) => {
    const current = activeFilters[key] || [];
    const next = current.includes(id) ? current.filter(v => v !== id) : [...current, id];
    onFiltersChange?.({ ...activeFilters, [key]: next });
  };

  const clearFilter = (key: string) => {
    onFiltersChange?.({ ...activeFilters, [key]: [] });
  };

  const hasActiveFilters = Object.values(activeFilters).some(v => v.length > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {/* View Switcher */}
        <div style={{ display: 'inline-flex', background: isDark ? 'var(--ds-surface-overlay, #1F1F1F)' : 'var(--cp-bd-zone)', borderRadius: 8, padding: 3, gap: 2 }}>
          {viewButtons.map(vb => {
            const active = currentView === vb.key;
            return (
              <button key={vb.key} onClick={() => onViewChange(vb.key)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '5px 12px', fontSize: 12,
                fontWeight: active ? 600 : 500,
                color: active ? (isDark ? 'var(--bg-app)' : 'var(--fg-1)') : (isDark ? 'var(--fg-4)' : 'var(--fg-3)'),
                background: active ? (isDark ? 'var(--ds-border, #2E2E2E)' : 'var(--bg-app)') : 'transparent',
                border: 'none', borderRadius: 6, cursor: 'pointer',
                boxShadow: active && !isDark ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 150ms',
              }}>
                <vb.icon size={13} />
                {vb.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: isDark ? 'transparent' : 'var(--bg-app)', border: `1px solid ${isDark ? DK.border : 'var(--divider)'}`, borderRadius: 8, padding: '5px 10px', minWidth: 220 }}>
          <Search size={14} color={'var(--cp-text-muted, #94A3B8)'} />
          <input
            type="text" placeholder="Search goals or KRs..."
            value={searchQuery} onChange={e => onSearch(e.target.value)}
            style={{ border: 'none', outline: 'none', fontSize: 12, color: isDark ? 'var(--cp-t1)' : 'var(--fg-1)', background: 'transparent', width: '100%' }}
          />
          {searchQuery && (
            <button onClick={() => onSearch('')} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
              <X size={12} color={'var(--cp-text-muted, #94A3B8)'} />
            </button>
          )}
        </div>

        {/* Filter Chips */}
        {filterOptions && (
          <>
            <FilterDropdown label="Status" options={filterOptions.statuses.map(s => ({ id: s, label: STATUS_LABELS[s] || s }))} selected={activeFilters.status || []} onToggle={id => toggleFilter('status', id)} onClear={() => clearFilter('status')} isDark={isDark} />
            <FilterDropdown label="Theme" options={filterOptions.themes.map(t => ({ id: t.id, label: t.title, color: t.color }))} selected={activeFilters.theme || []} onToggle={id => toggleFilter('theme', id)} onClear={() => clearFilter('theme')} isDark={isDark} />
            <FilterDropdown label="Owner" options={filterOptions.owners.map(o => ({ id: o.id, label: o.name }))} selected={activeFilters.owner || []} onToggle={id => toggleFilter('owner', id)} onClear={() => clearFilter('owner')} isDark={isDark} />
            <FilterDropdown label="Quarter" options={filterOptions.quarters.map(q => ({ id: q, label: q }))} selected={activeFilters.quarter || []} onToggle={id => toggleFilter('quarter', id)} onClear={() => clearFilter('quarter')} isDark={isDark} />
          </>
        )}

        <div style={{ flex: 1 }} />

        {hasActiveFilters && (
          <button
            onClick={() => onFiltersChange?.({})}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', fontSize: 11, fontWeight: 500, color: 'var(--sem-danger)', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, cursor: 'pointer' }}
          >
            <X size={11} /> Clear all
          </button>
        )}

        {currentView === 'tree' && (
          <button onClick={onExpandAll} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '5px 12px', fontSize: 12, fontWeight: 500,
            color: isDark ? DK.t2 : 'var(--fg-3)',
            background: isDark ? 'transparent' : 'var(--bg-app)',
            border: `1px solid ${isDark ? DK.border : 'var(--divider)'}`, borderRadius: 8, cursor: 'pointer',
          }}>
            <ChevronsUpDown size={13} />
            {isAllExpanded ? 'Collapse All' : 'Expand All'}
          </button>
        )}
      </div>
    </div>
  );
}
