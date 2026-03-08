/**
 * HierarchyPage — All Work Items with Tree/Table views, search, filter
 * Route: /project-hub/:key/hierarchy
 */

import { useState, useMemo, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  ChevronRight, ChevronDown, Plus, RefreshCw, Search, Filter,
  Layers, GitBranch, TableProperties,
} from 'lucide-react';
import type { WorkItem } from '@/types/hierarchy';
import { useJiraHierarchyTree } from '@/hooks/useJiraHierarchy';
import { WorkItemTree, TreeSkeleton } from '@/components/hierarchy/WorkItemTree';
import { WorkItemTable } from '@/components/hierarchy/WorkItemTable';
import { DetailPanel } from '@/components/hierarchy/DetailPanel';
import { toast } from 'sonner';

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
function collectAssignees(items: WorkItem[], set: Set<string> = new Set()): Set<string> {
  for (const item of items) { if (item.assignee) set.add(item.assignee.displayName); collectAssignees(item.children, set); }
  return set;
}
function collectTypes(items: WorkItem[], set: Set<string> = new Set()): Set<string> {
  for (const item of items) { if (item.issueType) set.add(item.issueType); collectTypes(item.children, set); }
  return set;
}

function filterTree(items: WorkItem[], search: string, filters: Filters): WorkItem[] {
  const q = search.toLowerCase();
  return items.reduce<WorkItem[]>((acc, item) => {
    const filteredChildren = filterTree(item.children, search, filters);

    const matchesSearch = !search || item.key?.toLowerCase().includes(q) || item.title?.toLowerCase().includes(q);
    const matchesType = filters.types.length === 0 || (item.issueType && filters.types.includes(item.issueType));
    const matchesStatus = filters.statuses.length === 0 || filters.statuses.includes(item.status.name);
    const matchesAssignee = filters.assignees.length === 0 || (item.assignee && filters.assignees.includes(item.assignee.displayName));

    const selfMatches = matchesSearch && matchesType && matchesStatus && matchesAssignee;

    if (selfMatches || filteredChildren.length > 0) {
      acc.push({ ...item, children: filteredChildren });
    }
    return acc;
  }, []);
}

interface Filters { types: string[]; statuses: string[]; assignees: string[]; }

/* ── Filter Panel ── */
function FilterPanel({ filters, setFilters, types, statuses, assignees, onClose }: {
  filters: Filters; setFilters: (f: Filters) => void;
  types: string[]; statuses: string[]; assignees: string[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div ref={ref} style={{
      position: 'absolute', top: '100%', left: 0, marginTop: 4, width: 280,
      background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 6,
      boxShadow: '0 4px 16px rgba(0,0,0,0.10)', zIndex: 100, maxHeight: 400, overflowY: 'auto', padding: 12,
    }}>
      <FilterGroup label="Type" options={types} selected={filters.types}
        onChange={v => setFilters({ ...filters, types: v })} />
      <FilterGroup label="Status" options={statuses} selected={filters.statuses}
        onChange={v => setFilters({ ...filters, statuses: v })} />
      <FilterGroup label="Assignee" options={assignees} selected={filters.assignees}
        onChange={v => setFilters({ ...filters, assignees: v })} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        <button onClick={() => setFilters({ types: [], statuses: [], assignees: [] })}
          style={{ fontSize: 11, color: '#64748B', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
          Clear all
        </button>
        <button onClick={onClose}
          style={{ fontSize: 11, fontWeight: 600, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
          Done
        </button>
      </div>
    </div>
  );
}

function FilterGroup({ label, options, selected, onChange }: {
  label: string; options: string[]; selected: string[]; onChange: (v: string[]) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.06em', marginBottom: 4, fontFamily: "'Inter', sans-serif" }}>
        {label}
      </div>
      {options.sort().map(opt => (
        <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', cursor: 'pointer', fontSize: 12, color: '#0F172A', fontFamily: "'Inter', sans-serif" }}>
          <input type="checkbox" checked={selected.includes(opt)}
            onChange={() => {
              onChange(selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt]);
            }}
            style={{ width: 14, height: 14 }}
          />
          {opt}
        </label>
      ))}
    </div>
  );
}

/* ── Toolbar button ── */
function ToolbarBtn({ children, onClick, active }: { children: React.ReactNode; onClick?: () => void; active?: boolean }) {
  return (
    <button onClick={onClick}
      style={{
        height: 32, padding: '0 12px', fontSize: 12, fontWeight: 500,
        fontFamily: "'Inter', sans-serif",
        color: active ? '#2563EB' : '#334155',
        background: active ? '#EFF6FF' : '#FFFFFF',
        border: '1px solid #E2E8F0', borderRadius: 6, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
      {children}
    </button>
  );
}

/* ── Main Page ── */
export default function HierarchyPage() {
  const { key: projectKey } = useParams<{ key: string }>();
  const { data: treeItems = [], isLoading, isError, refetch } = useJiraHierarchyTree(projectKey);

  const [allExpanded, setAllExpanded] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);
  const [viewMode, setViewMode] = useState<'tree' | 'table'>('tree');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filters>({ types: [], statuses: [], assignees: [] });
  const [filterOpen, setFilterOpen] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();
  const [searchInput, setSearchInput] = useState('');

  const totalItems = useMemo(() => countAll(treeItems), [treeItems]);
  const completedItems = useMemo(() => countCompleted(treeItems), [treeItems]);

  const allStatuses = useMemo(() => Array.from(collectStatuses(treeItems)), [treeItems]);
  const allAssignees = useMemo(() => Array.from(collectAssignees(treeItems)), [treeItems]);
  const allTypes = useMemo(() => Array.from(collectTypes(treeItems)), [treeItems]);

  const filteredItems = useMemo(() => filterTree(treeItems, search, filters), [treeItems, search, filters]);

  const activeFilterCount = filters.types.length + filters.statuses.length + filters.assignees.length;

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setSearch(value), 300);
  }, []);

  const handleSelect = useCallback((item: WorkItem) => setSelectedItem(item), []);
  const handleDeselect = useCallback(() => setSelectedItem(null), []);

  const gridCols = selectedItem ? '2fr 1fr' : '1fr';

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

      {/* TOOLBAR */}
      <div style={{ height: 48, padding: '0 24px', borderBottom: '1px solid #E2E8F0', background: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Search */}
        <div style={{
          width: 200, height: 32, display: 'flex', alignItems: 'center', gap: 6,
          padding: '0 8px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6,
        }}>
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

        <ToolbarBtn onClick={() => setAllExpanded(true)}>
          <ChevronDown size={14} /> Expand All
        </ToolbarBtn>
        <ToolbarBtn onClick={() => setAllExpanded(false)}>
          <ChevronRight size={14} /> Collapse All
        </ToolbarBtn>

        {/* Filter */}
        <div style={{ position: 'relative' }}>
          <ToolbarBtn onClick={() => setFilterOpen(o => !o)} active={activeFilterCount > 0}>
            <Filter size={14} /> Filter{activeFilterCount > 0 && ` (${activeFilterCount})`}
          </ToolbarBtn>
          {filterOpen && (
            <FilterPanel
              filters={filters}
              setFilters={setFilters}
              types={allTypes}
              statuses={allStatuses}
              assignees={allAssignees}
              onClose={() => setFilterOpen(false)}
            />
          )}
        </div>

        <div style={{ flex: 1 }} />

        {/* View toggle */}
        <div style={{ display: 'flex', border: '1px solid #E2E8F0', borderRadius: 6, overflow: 'hidden' }}>
          <button onClick={() => setViewMode('tree')}
            style={{
              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: viewMode === 'tree' ? '#EFF6FF' : '#FFFFFF', border: 'none', cursor: 'pointer',
            }}>
            <GitBranch size={14} color={viewMode === 'tree' ? '#2563EB' : '#64748B'} />
          </button>
          <button onClick={() => setViewMode('table')}
            style={{
              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: viewMode === 'table' ? '#EFF6FF' : '#FFFFFF', border: 'none', cursor: 'pointer',
              borderLeft: '1px solid #E2E8F0',
            }}>
            <TableProperties size={14} color={viewMode === 'table' ? '#2563EB' : '#64748B'} />
          </button>
        </div>

        <ToolbarBtn onClick={() => refetch()}>
          <RefreshCw size={14} /> Refresh
        </ToolbarBtn>
      </div>

      {/* CONTENT GRID */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: gridCols, gap: 16, overflow: 'hidden', minHeight: 0, padding: 24 }}>
        <div style={{ overflowY: 'auto', minHeight: 0 }}>
          {isLoading ? (
            <TreeSkeleton rows={5} />
          ) : isError ? (
            <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, background: '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200, gap: 12, padding: 24, textAlign: 'center' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#DC2626', margin: 0 }}>Failed to load hierarchy</p>
              <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>There was an error fetching the work items.</p>
              <button onClick={() => refetch()} style={{ height: 32, padding: '0 14px', fontSize: 13, fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#FFFFFF', background: '#2563EB', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          ) : filteredItems.length === 0 ? (
            <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, background: '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 16, textAlign: 'center', padding: 24 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', margin: 0 }}>
                {search || activeFilterCount > 0 ? 'No matching items' : 'No work items found'}
              </p>
              <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 0' }}>
                {search || activeFilterCount > 0 ? 'Try adjusting your search or filters.' : `No Jira issues found for ${projectKey?.toUpperCase()}.`}
              </p>
            </div>
          ) : viewMode === 'tree' ? (
            <WorkItemTree
              items={filteredItems}
              selectedId={selectedItem?.id || null}
              onSelect={handleSelect}
              onDeselect={handleDeselect}
              allExpanded={allExpanded}
            />
          ) : (
            <WorkItemTable
              items={filteredItems}
              search={search}
              onSelect={handleSelect}
              selectedId={selectedItem?.id || null}
              projectKey={projectKey || ''}
              allStatuses={allStatuses}
              onRefresh={() => refetch()}
            />
          )}
        </div>

        {selectedItem && (
          <div style={{ overflowY: 'auto', minHeight: 0 }}>
            <DetailPanel
              item={selectedItem}
              allItems={treeItems}
              onClose={handleDeselect}
              onSelectItem={handleSelect}
              projectKey={projectKey}
              allStatuses={allStatuses}
            />
          </div>
        )}
      </div>
    </div>
  );
}
