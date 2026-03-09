/**
 * HierarchyPage — All Work Items with Tree/Table views, Jira-style inline filter bar
 * Route: /project-hub/:key/hierarchy
 * Nuclear Hotfix: Table default, inline filters, no chips, no refresh/expand/collapse
 */

import { useState, useMemo, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
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

/* ── Jira-style inline filter trigger ── */
function FilterTrigger({ label, values, onClear, onClick, isOpen }: {
  label: string; values: string[]; onClear: () => void; onClick: () => void; isOpen: boolean;
}) {
  const active = values.length > 0;
  return (
    <button
      onClick={onClick}
      style={{
        height: 28, padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 12, fontWeight: 500, fontFamily: "'Inter', sans-serif",
        color: active ? '#2563EB' : '#334155',
        background: active ? '#EFF6FF' : '#FFFFFF',
        border: `1px solid ${active ? '#2563EB' : '#E2E8F0'}`,
        borderRadius: 4, cursor: 'pointer', whiteSpace: 'nowrap',
        transition: 'all 80ms ease',
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
      <ChevronDown size={10} color={active ? '#2563EB' : '#94A3B8'} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 100ms' }} />
    </button>
  );
}

/* ── Filter dropdown with checkboxes ── */
function FilterDropdown({ options, selected, onChange, onClose, searchable = false }: {
  options: string[]; selected: string[]; onChange: (v: string[]) => void; onClose: () => void; searchable?: boolean;
}) {
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!q) return options.sort();
    return options.filter(o => o.toLowerCase().includes(q.toLowerCase())).sort();
  }, [options, q]);

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={onClose} />
      <div ref={ref} style={{
        position: 'absolute', top: '100%', left: 0, marginTop: 4, width: 240,
        background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8,
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 100, maxHeight: 320,
        display: 'flex', flexDirection: 'column',
      }}>
        {searchable && (
          <div style={{ padding: '8px 10px', borderBottom: '1px solid #F1F5F9' }}>
            <input
              value={q} onChange={e => setQ(e.target.value)}
              placeholder="Search..."
              autoFocus
              style={{
                width: '100%', border: 'none', outline: 'none', background: 'transparent',
                fontSize: 12, fontFamily: "'Inter', sans-serif", color: '#0F172A',
              }}
            />
          </div>
        )}
        <div style={{ overflowY: 'auto', flex: 1, padding: '4px 0' }}>
          {filtered.map(opt => (
            <label key={opt} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px',
              cursor: 'pointer', fontSize: 12, color: '#0F172A', fontFamily: "'Inter', sans-serif",
              transition: 'background 80ms',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(15,23,42,0.04)')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            >
              <input type="checkbox" checked={selected.includes(opt)}
                onChange={() => onChange(selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt])}
                style={{ width: 14, height: 14, accentColor: '#2563EB' }}
              />
              {opt}
            </label>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: '12px', fontSize: 12, color: '#94A3B8', textAlign: 'center' }}>No options</div>
          )}
        </div>
      </div>
    </>
  );
}

/* ── Main Page ── */
export default function HierarchyPage() {
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
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#F8FAFC', fontFamily: "'Inter', sans-serif" }}>
      {/* PAGE HEADER */}
      <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #E2E8F0', background: '#FFFFFF' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.025em', lineHeight: 1.2 }}>
          All Work Items
        </h1>
        <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>
          {projectKey?.toUpperCase() || 'Project'} · {totalItems} items · {completedItems} completed
          <span style={{ marginLeft: 8, fontSize: 11, color: '#94A3B8' }}>Source: Jira Sync</span>
        </p>
      </div>

      {/* TOOLBAR — Search + Filter + Spacer + View Toggle ONLY */}
      <div style={{
        height: 48, padding: '0 24px', borderBottom: '1px solid #E2E8F0', background: '#FFFFFF',
        display: 'flex', alignItems: 'center', gap: 8,
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
      }}>
        {/* Search */}
        <div style={{
          width: 240, height: 36, display: 'flex', alignItems: 'center', gap: 6,
          padding: '0 10px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6,
          transition: 'border-color 80ms, box-shadow 80ms',
        }}
          onFocus={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.08)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <Search size={14} color="#94A3B8" />
          <input
            value={searchInput}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Search work items"
            style={{
              flex: 1, border: 'none', background: 'transparent', outline: 'none',
              fontSize: 13, fontFamily: "'Inter', sans-serif", color: '#0F172A',
            }}
          />
        </div>

        {/* Filter button */}
        <button
          onClick={handleFilterToggle}
          style={{
            height: 36, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 13, fontWeight: 500, fontFamily: "'Inter', sans-serif",
            color: activeFilterCount > 0 ? '#2563EB' : '#334155',
            background: activeFilterCount > 0 ? '#EFF6FF' : '#FFFFFF',
            border: `1px solid ${activeFilterCount > 0 ? '#2563EB' : '#E2E8F0'}`,
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
        <div style={{ display: 'flex', border: '1px solid #E2E8F0', borderRadius: 6, overflow: 'hidden' }}>
          <button onClick={() => setViewMode('table')}
            style={{
              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: viewMode === 'table' ? '#EFF6FF' : '#FFFFFF', border: 'none', cursor: 'pointer',
              transition: 'background 80ms',
            }}>
            <TableProperties size={14} color={viewMode === 'table' ? '#2563EB' : '#64748B'} />
          </button>
          <button onClick={() => setViewMode('tree')}
            style={{
              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: viewMode === 'tree' ? '#EFF6FF' : '#FFFFFF', border: 'none', cursor: 'pointer',
              borderLeft: '1px solid #E2E8F0', transition: 'background 80ms',
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
              overflow: 'visible', background: '#FFFFFF', borderBottom: '1px solid #E2E8F0',
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
                  onClose={() => setOpenDropdown(null)} />
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
                  onClose={() => setOpenDropdown(null)} />
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
                  onClose={() => setOpenDropdown(null)} searchable />
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
                  onClose={() => setOpenDropdown(null)} />
              )}
            </div>

            {/* Sprint / Fix Version */}
            <div style={{ position: 'relative' }}>
              <FilterTrigger label="Sprint" values={filters.sprints}
                onClear={() => setFilters(f => ({ ...f, sprints: [] }))}
                onClick={() => setOpenDropdown(openDropdown === 'sprint' ? null : 'sprint')}
                isOpen={openDropdown === 'sprint'}
              />
              {openDropdown === 'sprint' && (
                <FilterDropdown options={allSprints} selected={filters.sprints}
                  onChange={v => setFilters(f => ({ ...f, sprints: v }))}
                  onClose={() => setOpenDropdown(null)} />
              )}
            </div>

            {/* Clear all ✕ */}
            <button
              onClick={handleClearAllFilters}
              style={{
                marginLeft: 'auto', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'none', border: '1px solid #E2E8F0', borderRadius: 4, cursor: 'pointer',
                color: '#64748B', transition: 'all 80ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#DC2626'; e.currentTarget.style.color = '#DC2626'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#64748B'; }}
              title="Clear all filters"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONTENT GRID */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: gridCols, gap: 16, overflow: 'hidden', minHeight: 0, padding: 24 }}>
        <div style={{ overflowY: 'auto', minHeight: 0 }}>
          {isLoading ? (
            <TableSkeleton rows={10} />
          ) : isError ? (
            <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, background: '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200, gap: 12, padding: 24, textAlign: 'center' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#DC2626', margin: 0 }}>Failed to load work items</p>
              <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>There was an error fetching the work items.</p>
              <button onClick={() => refetch()} style={{ height: 32, padding: '0 14px', fontSize: 13, fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#FFFFFF', background: '#2563EB', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          ) : filteredItems.length === 0 ? (
            <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, background: '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12, textAlign: 'center', padding: 48 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Search size={20} color="#94A3B8" />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', margin: 0 }}>
                {search || activeFilterCount > 0 ? 'No items match your filters' : 'No work items found'}
              </p>
              <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>
                {search || activeFilterCount > 0 ? 'Try adjusting your search or filters.' : `No Jira issues found for ${projectKey?.toUpperCase()}.`}
              </p>
              {(search || activeFilterCount > 0) && (
                <button onClick={handleClearAllFilters} style={{
                  height: 32, padding: '0 14px', fontSize: 12, fontWeight: 500, fontFamily: "'Inter', sans-serif",
                  color: '#334155', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 6, cursor: 'pointer',
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
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{ overflowY: 'auto', minHeight: 0 }}
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
        )}
      </div>
    </div>
  );
}
