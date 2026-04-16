/**
 * HierarchyPage — All Work Items with Tree/Table views, Jira-style inline filter bar
 * Route: /project-hub/:key/hierarchy
 * Nuclear Hotfix: Table default, inline filters, no chips, no refresh/expand/collapse
 */

import { useState, useMemo, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import {
  Search, Filter, GitBranch, TableProperties, X, ChevronDown, RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { WorkItem } from '@/types/hierarchy';
import { useJiraHierarchyTree } from '@/hooks/useJiraHierarchy';
import { WorkItemTree } from '@/components/hierarchy/WorkItemTree';
import { WorkItemTable } from '@/components/hierarchy/WorkItemTable';
import { DetailPanel } from '@/components/hierarchy/DetailPanel';
import { TableSkeleton } from '@/components/hierarchy/TableSkeleton';

/* ── helpers ── */
function findItem(items: WorkItem[], id: string): WorkItem | null {
  for (const item of items) {
    if (item.id === id) return item;
    const found = findItem(item.children, id);
    if (found) return found;
  }
  return null;
}

function countAll(items: WorkItem[]): number {
  let c = items.length;
  for (const item of items) c += countAll(item.children);
  return c;
}
function countCompleted(items: WorkItem[]): number {
  let c = 0;
  for (const item of items) { if (item.status.isTerminal) c++; c += countCompleted(item.children); }
  return c;
}

function collectStatuses(items: WorkItem[], set: Set<string> = new Set()): Set<string> {
  for (const item of items) { set.add(item.status.name); collectStatuses(item.children, set); }
  return set;
}
function collectAssignees(items: WorkItem[], map: Map<string, { name: string; avatar?: string }> = new Map()): Map<string, { name: string; avatar?: string }> {
  for (const item of items) {
    if (item.assignee && !map.has(item.assignee.displayName)) {
      map.set(item.assignee.displayName, { name: item.assignee.displayName, avatar: (item.assignee as any).avatar });
    }
    collectAssignees(item.children, map);
  }
  return map;
}
function collectTypes(items: WorkItem[], set: Set<string> = new Set()): Set<string> {
  for (const item of items) { if (item.issueType) set.add(item.issueType); collectTypes(item.children, set); }
  return set;
}
function collectFixVersions(items: WorkItem[], set: Set<string> = new Set()): Set<string> {
  for (const item of items) { if (item.fixVersion) set.add(item.fixVersion.name); collectFixVersions(item.children, set); }
  return set;
}
function collectPriorities(items: WorkItem[], set: Set<string> = new Set()): Set<string> {
  for (const item of items) { if (item.priority) set.add(item.priority.name); collectPriorities(item.children, set); }
  return set;
}

export interface Filters { types: string[]; statuses: string[]; assignees: string[]; priorities: string[]; sprints: string[]; }
const EMPTY_FILTERS: Filters = { types: [], statuses: [], assignees: [], priorities: [], sprints: [] };

function hasActiveFilters(f: Filters): boolean {
  return f.types.length + f.statuses.length + f.assignees.length + f.priorities.length + f.sprints.length > 0;
}

function filterTree(items: WorkItem[], search: string, filters: Filters): WorkItem[] {
  const q = search.toLowerCase();
  return items.reduce<WorkItem[]>((acc, item) => {
    const filteredChildren = filterTree(item.children, search, filters);
    const matchesSearch = !search || item.key?.toLowerCase().includes(q) || item.title?.toLowerCase().includes(q);
    const matchesType = filters.types.length === 0 || (item.issueType && filters.types.includes(item.issueType));
    const matchesStatus = filters.statuses.length === 0 || filters.statuses.includes(item.status.name);
    const matchesAssignee = filters.assignees.length === 0 || (item.assignee && filters.assignees.includes(item.assignee.displayName));
    const matchesPriority = filters.priorities.length === 0 || (item.priority && filters.priorities.includes(item.priority.name));
    const matchesSprint = filters.sprints.length === 0 || (item.fixVersion && filters.sprints.includes(item.fixVersion.name));
    const selfMatches = matchesSearch && matchesType && matchesStatus && matchesAssignee && matchesPriority && matchesSprint;
    if (selfMatches || filteredChildren.length > 0) {
      acc.push({ ...item, children: filteredChildren });
    }
    return acc;
  }, []);
}

/* ── Avatar color palette ── */
const FILTER_AVATAR_COLORS = ['#0D9488','#2563EB','#DC2626','#16A34A','#64748B','#0284C7','#059669','#BE123C','#1D4ED8','#0F766E'];
function getFilterAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return FILTER_AVATAR_COLORS[Math.abs(hash) % FILTER_AVATAR_COLORS.length];
}

/* ── Rich filter trigger ── */
function FilterTrigger({ label, values, onClear, onClick, isOpen }: {
  label: string; values: string[]; onClear: () => void; onClick: () => void; isOpen: boolean;
}) {
  const { isDark } = useTheme();
  const active = values.length > 0;
  return (
    <button
      onClick={onClick}
      style={{
        height: 32, padding: '8px 12px', display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 12, fontWeight: 500, fontFamily: "'Inter', sans-serif",
        color: active ? '#2563EB' : isDark ? '#A1A1A1' : '#334155',
        background: active ? 'rgba(37,99,235,0.06)' : isDark ? '#1A1A1A' : '#FFFFFF',
        border: `1px solid ${active ? 'rgba(37,99,235,0.3)' : isDark ? '#2E2E2E' : '#E2E8F0'}`,
        borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap',
        transition: 'all 80ms ease',
        boxShadow: isOpen ? '0 0 0 3px rgba(37,99,235,0.08)' : 'none',
      }}
    >
      {label}
      {active && (
        <span style={{
          fontSize: 10, fontWeight: 700, background: '#2563EB', color: '#FFFFFF',
          borderRadius: 9999, minWidth: 16, height: 16, display: 'inline-flex',
          alignItems: 'center', justifyContent: 'center', padding: '0 4px',
        }}>{values.length}</span>
      )}
      {active && (
        <span
          onClick={e => { e.stopPropagation(); onClear(); }}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 14, height: 14, borderRadius: 9999, cursor: 'pointer', color: isDark ? '#878787' : '#94A3B8' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#DC2626')}
          onMouseLeave={e => (e.currentTarget.style.color = '#94A3B8')}
        >
          <X size={10} />
        </span>
      )}
      <ChevronDown size={11} color={active ? '#2563EB' : '#94A3B8'} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 100ms' }} />
    </button>
  );
}

/* ── Status color dot ── */
const STATUS_DOT_COLORS: Record<string, string> = {
  'Done': '#16A34A', 'Closed': '#16A34A', 'Resolved': '#16A34A', 'Released': '#16A34A', 'In Production': '#16A34A',
  'In Development': '#2563EB', 'In Progress': '#2563EB', 'In Beta': '#2563EB', 'In QA': '#2563EB', 'UAT Ready': '#2563EB', 'In Review': '#2563EB',
  'Ready for Production': '#0D9488', 'Ready for QA': '#0D9488',
  'Backlog': '#94A3B8', 'To Do': '#94A3B8', 'Open': '#94A3B8',
  'On Hold': '#D97706', 'Awaiting Info': '#D97706', 'Awaiting Information': '#D97706', 'Blocked': '#DC2626',
};
function getStatusDotColor(status: string): string {
  return STATUS_DOT_COLORS[status] || '#94A3B8';
}

/* ── Priority icon (4 bars) ── */
function PriorityIcon({ name }: { name: string }) {
  const { isDark } = useTheme();
  const n = name.toLowerCase();
  let level = 0;
  if (n === 'critical') level = 4;
  else if (n === 'high' || n === 'highest') level = 3;
  else if (n === 'medium') level = 2;
  else if (n === 'low' || n === 'lowest') level = 1;
  const color = level >= 3 ? '#DC2626' : level === 2 ? '#D97706' : '#64748B';
  return (
    <div style={{ display: 'flex', gap: 1.5, alignItems: 'flex-end', height: 14, width: 14 }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{ width: 2.5, height: 3 + i * 2.5, borderRadius: 1, background: i <= level ? color : isDark ? '#2E2E2E' : '#E2E8F0' }} />
      ))}
    </div>
  );
}

/* ── Rich filter dropdown with checkboxes ── */
function FilterDropdown({ options, selected, onChange, onClose, searchable = false, variant = 'default', assigneeMap }: {
  options: string[]; selected: string[]; onChange: (v: string[]) => void; onClose: () => void;
  searchable?: boolean; variant?: 'default' | 'status' | 'priority' | 'assignee' | 'release';
  assigneeMap?: Map<string, { name: string; avatar?: string }>;
}) {
  const { isDark } = useTheme();
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const sorted = [...options].sort((a, b) => a.localeCompare(b));
    if (!q) return sorted;
    return sorted.filter(o => o.toLowerCase().includes(q.toLowerCase()));
  }, [options, q]);

  const selectAll = () => onChange([...options]);
  const clearAll = () => onChange([]);

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={onClose} />
      <div ref={ref} style={{
        position: 'absolute', top: 'calc(100% + 6px)', left: 0, width: variant === 'assignee' ? 280 : 260,
        background: isDark ? '#1A1A1A' : '#FFFFFF', border: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, borderRadius: 12,
        boxShadow: isDark ? '0 12px 40px rgba(0,0,0,0.40), 0 2px 8px rgba(0,0,0,0.20)' : '0 12px 40px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.04)', zIndex: 100, maxHeight: 360,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Search */}
        {searchable && (
          <div style={{ padding: '10px 12px', borderBottom: `1px solid ${isDark ? '#292929' : '#F1F5F9'}` }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '0 8px',
              height: 32, background: isDark ? '#0A0A0A' : '#F8FAFC', borderRadius: 6, border: '1px solid transparent',
              transition: 'border-color 80ms',
            }}>
              <Search size={13} color="#94A3B8" />
              <input
                value={q} onChange={e => setQ(e.target.value)}
                placeholder="Search..."
                autoFocus
                style={{
                  flex: 1, border: 'none', outline: 'none', background: 'transparent',
                  fontSize: 12, fontFamily: "'Inter', sans-serif", color: isDark ? '#EDEDED' : '#0F172A',
                }}
              />
            </div>
          </div>
        )}

        {/* Select all / Clear */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', borderBottom: `1px solid ${isDark ? '#292929' : '#F1F5F9'}` }}>
          <button onClick={selectAll} style={{ fontSize: 11, fontWeight: 500, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Select all</button>
          <button onClick={clearAll} style={{ fontSize: 11, fontWeight: 500, color: isDark ? '#878787' : '#94A3B8', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Clear</button>
        </div>

        {/* Options */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '4px 0' }}>
          {filtered.map(opt => {
            const isSelected = selected.includes(opt);
            return (
              <label
                key={opt}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px',
                  cursor: 'pointer', fontSize: 13, color: isDark ? '#EDEDED' : '#0F172A', fontFamily: "'Inter', sans-serif",
                  transition: 'background 80ms', borderRadius: 0,
                  background: isSelected ? 'rgba(37,99,235,0.04)' : 'transparent',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = isSelected ? 'rgba(37,99,235,0.08)' : isDark ? '#1F1F1F' : 'rgba(15,23,42,0.04)')}
                onMouseLeave={e => (e.currentTarget.style.background = isSelected ? 'rgba(37,99,235,0.04)' : 'transparent')}
              >
                <div style={{
                  width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${isSelected ? '#2563EB' : '#CBD5E1'}`,
                  background: isSelected ? '#2563EB' : isDark ? '#1A1A1A' : '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, transition: 'all 80ms',
                }}>
                  {isSelected && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5L4.2 7.5L8 3" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  )}
                </div>
                <input type="checkbox" checked={isSelected}
                  onChange={() => onChange(isSelected ? selected.filter(s => s !== opt) : [...selected, opt])}
                  style={{ display: 'none' }}
                />

                {/* Variant-specific rendering */}
                {variant === 'assignee' && (() => {
                  const info = assigneeMap?.get(opt);
                  const avatarUrl = info?.avatar;
                  const initials = opt.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                  const bgColor = getFilterAvatarColor(opt);
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={opt} style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: 9, fontWeight: 700, color: '#FFFFFF' }}>{initials}</span>
                        </div>
                      )}
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt}</span>
                    </div>
                  );
                })()}

                {variant === 'status' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 9999, background: getStatusDotColor(opt), flexShrink: 0 }} />
                    <span>{opt}</span>
                  </div>
                )}

                {variant === 'priority' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                    <PriorityIcon name={opt} />
                    <span>{opt}</span>
                  </div>
                )}

                {variant === 'release' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                    <div style={{ width: 6, height: 6, borderRadius: 4, background: '#0D9488', flexShrink: 0 }} />
                    <span style={{ fontSize: 12 }}>{opt}</span>
                  </div>
                )}

                {variant === 'default' && <span>{opt}</span>}
              </label>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ padding: '16px 12px', fontSize: 12, color: isDark ? '#878787' : '#94A3B8', textAlign: 'center' }}>No results found</div>
          )}
        </div>

        {/* Footer: count */}
        <div style={{ padding: '6px 12px', borderTop: `1px solid ${isDark ? '#292929' : '#F1F5F9'}`, fontSize: 11, color: isDark ? '#878787' : '#94A3B8', textAlign: 'center' }}>
          {selected.length} of {options.length} selected
        </div>
      </div>
    </>
  );
}

/* ── Main Page ── */
export default function HierarchyPage() {
  const { isDark } = useTheme();
  const { key: projectKey } = useParams<{ key: string }>();
  const { data: treeItems = [], isLoading, isError, refetch } = useJiraHierarchyTree(projectKey);

  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);
  const [viewMode, setViewMode] = useState<'tree' | 'table'>('table');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [filterBarOpen, setFilterBarOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();
  const [searchInput, setSearchInput] = useState('');

  const totalItems = useMemo(() => countAll(treeItems), [treeItems]);
  const completedItems = useMemo(() => countCompleted(treeItems), [treeItems]);

  const allStatuses = useMemo(() => Array.from(collectStatuses(treeItems)), [treeItems]);
  const allAssigneeMap = useMemo(() => collectAssignees(treeItems), [treeItems]);
  const allAssigneeNames = useMemo(() => Array.from(allAssigneeMap.keys()), [allAssigneeMap]);
  const allTypes = useMemo(() => Array.from(collectTypes(treeItems)), [treeItems]);
  const allPriorities = useMemo(() => Array.from(collectPriorities(treeItems)), [treeItems]);
  const allSprints = useMemo(() => Array.from(collectFixVersions(treeItems)), [treeItems]);

  const filteredItems = useMemo(() => filterTree(treeItems, search, filters), [treeItems, search, filters]);
  const activeFilterCount = filters.types.length + filters.statuses.length + filters.assignees.length + filters.priorities.length + filters.sprints.length;

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setSearch(value), 300);
  }, []);

  const handleSelect = useCallback((item: WorkItem) => setSelectedItem(item), []);
  const handleDeselect = useCallback(() => setSelectedItem(null), []);

  const handleFilterToggle = useCallback(() => {
    if (filterBarOpen) {
      setFilterBarOpen(false);
      setOpenDropdown(null);
    } else {
      setFilterBarOpen(true);
    }
  }, [filterBarOpen]);

  const handleClearAllFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setFilterBarOpen(false);
    setOpenDropdown(null);
  }, []);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: isDark ? '#0A0A0A' : '#F8FAFC', fontFamily: "'Inter', sans-serif" }}>
      {/* PAGE HEADER */}
      <CatalystPageHeader title="All Work Items" />

      {/* TOOLBAR — Search + Filter + Spacer + View Toggle ONLY */}
      <div style={{
        height: 48, padding: '0 24px', borderBottom: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, background: isDark ? '#1A1A1A' : '#FFFFFF',
        display: 'flex', alignItems: 'center', gap: 8,
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
      }}>
        {/* Search */}
        <div style={{
          width: 240, height: 34, display: 'flex', alignItems: 'center', gap: 6,
          padding: '0 10px', background: isDark ? '#0A0A0A' : '#F8FAFC', border: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, borderRadius: 6,
          transition: 'border-color 80ms, box-shadow 80ms',
        }}
          onFocus={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.08)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = isDark ? '#2E2E2E' : '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <Search size={14} color="#94A3B8" style={{ flexShrink: 0 }} />
          <input
            value={searchInput}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Search work items"
            className="!bg-transparent !border-0 !p-0 !outline-none !shadow-none !ring-0 focus:!outline-none focus:!shadow-none focus:!ring-0"
            style={{
              flex: 1, border: 'none', background: 'transparent', outline: 'none',
              fontSize: 13, fontFamily: "'Inter', sans-serif", color: isDark ? '#EDEDED' : '#0F172A',
              WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none',
              WebkitBoxShadow: '0 0 0 1000px transparent inset',
            } as React.CSSProperties}
          />
        </div>

        {/* Filter button */}
        <button
          onClick={handleFilterToggle}
          style={{
            height: 34, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 13, fontWeight: 500, fontFamily: "'Inter', sans-serif",
            color: activeFilterCount > 0 ? '#2563EB' : isDark ? '#A1A1A1' : '#334155',
            background: activeFilterCount > 0 ? (isDark ? 'rgba(37,99,235,0.10)' : '#EFF6FF') : isDark ? '#1A1A1A' : '#FFFFFF',
            border: `1px solid ${activeFilterCount > 0 ? '#2563EB' : isDark ? '#2E2E2E' : '#E2E8F0'}`,
            borderRadius: 6, cursor: 'pointer', transition: 'all 80ms ease',
          }}
        >
          <Filter size={14} />
          Filter
          {activeFilterCount > 0 && (
            <span style={{
              fontSize: 10, fontWeight: 700, background: '#2563EB', color: '#FFFFFF',
              borderRadius: 9999, minWidth: 18, height: 18, display: 'inline-flex',
              alignItems: 'center', justifyContent: 'center', padding: '0 5px',
            }}>{activeFilterCount}</span>
          )}
        </button>

        <div style={{ flex: 1 }} />

        {/* View toggle */}
        <div style={{ display: 'flex', border: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, borderRadius: 6, overflow: 'hidden' }}>
          <button onClick={() => setViewMode('table')}
            style={{
              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: viewMode === 'table' ? (isDark ? 'rgba(37,99,235,0.10)' : '#EFF6FF') : (isDark ? '#1A1A1A' : '#FFFFFF'), border: 'none', cursor: 'pointer',
              transition: 'background 80ms',
            }}>
            <TableProperties size={14} color={viewMode === 'table' ? '#2563EB' : '#64748B'} />
          </button>
          <button onClick={() => setViewMode('tree')}
            style={{
              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: viewMode === 'tree' ? (isDark ? 'rgba(37,99,235,0.10)' : '#EFF6FF') : (isDark ? '#1A1A1A' : '#FFFFFF'), border: 'none', cursor: 'pointer',
              borderLeft: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, transition: 'background 80ms',
            }}>
            <GitBranch size={14} color={viewMode === 'tree' ? '#2563EB' : '#64748B'} />
          </button>
        </div>
      </div>

      {/* INLINE FILTER BAR — Jira style */}
      <AnimatePresence>
        {filterBarOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 44, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{
              overflow: 'visible', background: isDark ? '#1A1A1A' : '#FFFFFF', borderBottom: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`,
              display: 'flex', alignItems: 'center', gap: 8, padding: '0 24px',
              position: 'relative', zIndex: 50,
            }}
          >
            {/* Type */}
            <div style={{ position: 'relative' }}>
              <FilterTrigger label="Type" values={filters.types}
                onClear={() => setFilters(f => ({ ...f, types: [] }))}
                onClick={() => setOpenDropdown(openDropdown === 'type' ? null : 'type')}
                isOpen={openDropdown === 'type'}
              />
              {openDropdown === 'type' && (
                <FilterDropdown options={allTypes} selected={filters.types}
                  onChange={v => setFilters(f => ({ ...f, types: v }))}
                  onClose={() => setOpenDropdown(null)} variant="default" />
              )}
            </div>

            {/* Status */}
            <div style={{ position: 'relative' }}>
              <FilterTrigger label="Status" values={filters.statuses}
                onClear={() => setFilters(f => ({ ...f, statuses: [] }))}
                onClick={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
                isOpen={openDropdown === 'status'}
              />
              {openDropdown === 'status' && (
                <FilterDropdown options={allStatuses} selected={filters.statuses}
                  onChange={v => setFilters(f => ({ ...f, statuses: v }))}
                  onClose={() => setOpenDropdown(null)} variant="status" />
              )}
            </div>

            {/* Assignee */}
            <div style={{ position: 'relative' }}>
              <FilterTrigger label="Assignee" values={filters.assignees}
                onClear={() => setFilters(f => ({ ...f, assignees: [] }))}
                onClick={() => setOpenDropdown(openDropdown === 'assignee' ? null : 'assignee')}
                isOpen={openDropdown === 'assignee'}
              />
              {openDropdown === 'assignee' && (
                <FilterDropdown options={allAssigneeNames} selected={filters.assignees}
                  onChange={v => setFilters(f => ({ ...f, assignees: v }))}
                  onClose={() => setOpenDropdown(null)} searchable variant="assignee" assigneeMap={allAssigneeMap} />
              )}
            </div>

            {/* Priority */}
            <div style={{ position: 'relative' }}>
              <FilterTrigger label="Priority" values={filters.priorities}
                onClear={() => setFilters(f => ({ ...f, priorities: [] }))}
                onClick={() => setOpenDropdown(openDropdown === 'priority' ? null : 'priority')}
                isOpen={openDropdown === 'priority'}
              />
              {openDropdown === 'priority' && (
                <FilterDropdown options={allPriorities.length > 0 ? allPriorities : ['Critical', 'High', 'Medium', 'Low']} selected={filters.priorities}
                  onChange={v => setFilters(f => ({ ...f, priorities: v }))}
                  onClose={() => setOpenDropdown(null)} variant="priority" />
              )}
            </div>

            {/* Release (Fix Version) */}
            <div style={{ position: 'relative' }}>
              <FilterTrigger label="Release" values={filters.sprints}
                onClear={() => setFilters(f => ({ ...f, sprints: [] }))}
                onClick={() => setOpenDropdown(openDropdown === 'sprint' ? null : 'sprint')}
                isOpen={openDropdown === 'sprint'}
              />
              {openDropdown === 'sprint' && (
                <FilterDropdown options={allSprints} selected={filters.sprints}
                  onChange={v => setFilters(f => ({ ...f, sprints: v }))}
                  onClose={() => setOpenDropdown(null)} variant="release" />
              )}
            </div>

            {/* Clear all ✕ */}
            <button
              onClick={handleClearAllFilters}
              style={{
                marginLeft: 'auto', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'none', border: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, borderRadius: 4, cursor: 'pointer',
                color: isDark ? '#878787' : '#64748B', transition: 'all 80ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#DC2626'; e.currentTarget.style.color = '#DC2626'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = isDark ? '#2E2E2E' : '#E2E8F0'; e.currentTarget.style.color = '#64748B'; }}
              title="Clear all filters"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONTENT GRID */}
      <div style={{ flex: 1, display: 'block', overflow: 'hidden', minHeight: 0, padding: 24 }}>
        <div style={{ overflowY: 'auto', minHeight: 0, height: '100%' }}>
          {isLoading ? (
            <TableSkeleton rows={10} />
          ) : isError ? (
            <div style={{ border: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, borderRadius: 8, background: isDark ? '#1A1A1A' : '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200, gap: 12, padding: 24, textAlign: 'center' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#DC2626', margin: 0 }}>Failed to load work items</p>
              <p style={{ fontSize: 12, color: isDark ? '#878787' : '#64748B', margin: 0 }}>There was an error fetching the work items.</p>
              <button onClick={() => refetch()} style={{ height: 32, padding: '0 14px', fontSize: 13, fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#FFFFFF', background: '#2563EB', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          ) : filteredItems.length === 0 ? (
            <div style={{ border: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, borderRadius: 8, background: isDark ? '#1A1A1A' : '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12, textAlign: 'center', padding: 48 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: isDark ? '#1F1F1F' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Search size={20} color="#94A3B8" />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: isDark ? '#EDEDED' : '#0F172A', margin: 0 }}>
                {search || activeFilterCount > 0 ? 'No items match your filters' : 'No work items found'}
              </p>
              <p style={{ fontSize: 12, color: isDark ? '#878787' : '#94A3B8', margin: 0 }}>
                {search || activeFilterCount > 0 ? 'Try adjusting your search or filters.' : `No Jira issues found for ${projectKey?.toUpperCase()}.`}
              </p>
              {(search || activeFilterCount > 0) && (
                <button onClick={handleClearAllFilters} style={{
                  height: 32, padding: '0 14px', fontSize: 12, fontWeight: 500, fontFamily: "'Inter', sans-serif",
                  color: isDark ? '#A1A1A1' : '#334155', background: isDark ? '#1A1A1A' : '#FFFFFF', border: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, borderRadius: 6, cursor: 'pointer',
                }}>
                  Clear filters
                </button>
              )}
            </div>
          ) : viewMode === 'tree' ? (
            <WorkItemTree
              items={filteredItems}
              selectedId={selectedItem?.id || null}
              onSelect={handleSelect}
              onDeselect={handleDeselect}
              allExpanded={false}
            />
          ) : (
            <WorkItemTable
              items={filteredItems}
              search={search}
              onSelect={handleSelect}
              selectedId={selectedItem?.id || null}
              projectKey={projectKey || ''}
              allStatuses={allStatuses}
            />
          )}
        </div>

        {selectedItem && (
          <AnimatePresence>
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                onClick={handleDeselect}
                style={{ position: 'fixed', inset: 0, background: isDark ? 'rgba(0, 0, 0, 0.40)' : 'rgba(15, 23, 42, 0.16)', zIndex: 60 }}
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ duration: 0.24, ease: 'easeOut' }}
                style={{
                  position: 'fixed',
                  top: 0,
                  right: 0,
                  height: '100vh',
                  width: 'min(62vw, 920px)',
                  minWidth: 480,
                  background: isDark ? '#1A1A1A' : '#FFFFFF',
                  borderLeft: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`,
                  zIndex: 61,
                  padding: 16,
                  overflowY: 'auto',
                }}
              >
                <DetailPanel
                  item={selectedItem}
                  allItems={treeItems}
                  onClose={handleDeselect}
                  onSelectItem={handleSelect}
                  projectKey={projectKey}
                  allStatuses={allStatuses}
                />
              </motion.div>
            </>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
