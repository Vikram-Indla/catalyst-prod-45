import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, ChevronDown, ChevronRight, ArrowUp, ArrowDown, FileText, SearchX } from 'lucide-react';
import type { WorkItemRow } from '@/hooks/usePhWorkItems';
import { WorkItemTableRow, ALL_COLUMNS, ColumnKey } from './WorkItemTableRow';

type SortDir = 'asc' | 'desc';
interface SortCol { field: string; dir: SortDir }

interface GroupedItems { key: string; label: string; items: WorkItemRow[] }

interface Props {
  items: WorkItemRow[];
  onRowClick: (id: string) => void;
  onCreateClick?: () => void;
  grouped: GroupedItems[] | null;
  visibleColumns: Set<ColumnKey>;
  isEmpty: boolean;
  hasFilters: boolean;
  onClearFilters: () => void;
}

function buildTree(items: WorkItemRow[]) {
  const childrenMap = new Map<string, WorkItemRow[]>();
  const roots: WorkItemRow[] = [];
  for (const item of items) {
    if (!item.parent_id || !items.find(i => i.id === item.parent_id)) {
      roots.push(item);
    } else {
      const siblings = childrenMap.get(item.parent_id) || [];
      siblings.push(item);
      childrenMap.set(item.parent_id, siblings);
    }
  }
  return { roots, childrenMap };
}

export function WorkItemsTable({
  items, onRowClick, onCreateClick, grouped, visibleColumns,
  isEmpty, hasFilters, onClearFilters,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    // Auto-expand epics/features
    const set = new Set<string>();
    for (const item of items) {
      if (item.type_name === 'Epic' || item.type_name === 'Feature') set.add(item.id);
    }
    return set;
  });
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const [sorts, setSorts] = useState<SortCol[]>([]);

  const toggle = (id: string) => setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleGroup = (key: string) => setCollapsedGroups(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  const allFlatRows = useMemo(() => {
    const result: WorkItemRow[] = [];
    const addItems = (list: WorkItemRow[]) => {
      const { roots, childrenMap } = buildTree(list);
      const walk = (items: WorkItemRow[]) => {
        for (const item of items) {
          result.push(item);
          if (expanded.has(item.id)) {
            const children = childrenMap.get(item.id);
            if (children) walk(children);
          }
        }
      };
      walk(roots);
    };
    if (grouped) {
      for (const g of grouped) {
        if (!collapsedGroups.has(g.key)) addItems(g.items);
      }
    } else addItems(items);
    return result;
  }, [items, grouped, expanded, collapsedGroups]);

  const handleSelect = (item: WorkItemRow, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(item.id) ? next.delete(item.id) : next.add(item.id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === allFlatRows.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(allFlatRows.map(r => r.id)));
  };

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedIdx(i => Math.min(i + 1, allFlatRows.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedIdx(i => Math.max(i - 1, 0)); }
      if (e.key === 'Enter' && highlightedIdx >= 0) { onRowClick(allFlatRows[highlightedIdx].id); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [highlightedIdx, allFlatRows, onRowClick]);

  const toggleSort = (field: string) => {
    setSorts(prev => {
      const idx = prev.findIndex(s => s.field === field);
      if (idx === -1) return [{ field, dir: 'asc' }];
      if (prev[idx].dir === 'asc') return [{ field, dir: 'desc' }];
      return [];
    });
  };

  const visibleColDefs = ALL_COLUMNS.filter(c => visibleColumns.has(c.key));
  const isAllSelected = allFlatRows.length > 0 && selectedIds.size === allFlatRows.length;

  const renderRows = (rowItems: WorkItemRow[]) => {
    const { roots, childrenMap } = buildTree(rowItems);
    const rows: { item: WorkItemRow; depth: number }[] = [];
    function walk(list: WorkItemRow[], depth: number) {
      for (const item of list) {
        rows.push({ item, depth });
        if (expanded.has(item.id)) {
          const children = childrenMap.get(item.id);
          if (children) walk(children, depth + 1);
        }
      }
    }
    walk(roots, 0);
    return rows.map(({ item, depth }) => {
      const flatIdx = allFlatRows.findIndex(r => r.id === item.id);
      const { childrenMap: cm } = buildTree(rowItems);
      return (
        <WorkItemTableRow
          key={item.id}
          item={item}
          depth={depth}
          hasChildren={cm.has(item.id)}
          isExpanded={expanded.has(item.id)}
          onToggle={() => toggle(item.id)}
          onClick={() => { console.log(item.id); onRowClick(item.id); }}
          isSelected={selectedIds.has(item.id)}
          isHighlighted={flatIdx === highlightedIdx}
          onSelect={(e) => handleSelect(item, e)}
          onContextMenu={(e) => e.preventDefault()}
          visibleColumns={visibleColumns}
        />
      );
    });
  };

  return (
    <div className="border rounded-lg overflow-hidden" style={{ borderColor: '#E2E8F0' }}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ fontFamily: 'Inter, sans-serif', minWidth: 1600 }}>
          <thead>
            <tr style={{ height: 34, background: '#F8FAFC' }} className="sticky top-0 z-10">
              {visibleColDefs.map(col => {
                const isSticky = col.key === 'checkbox' || col.key === 'type' || col.key === 'key' || col.key === 'summary';
                const stickyLeft = col.key === 'checkbox' ? 0 : col.key === 'type' ? 36 : col.key === 'key' ? 66 : col.key === 'summary' ? 131 : undefined;
                const sort = sorts.find(s => s.field === col.key);
                return (
                  <th
                    key={col.key}
                    className="text-left px-1 select-none"
                    style={{
                      width: col.w || undefined, minWidth: col.key === 'summary' ? 200 : col.w || undefined,
                      fontSize: 9, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.06em',
                      textTransform: 'uppercase', borderBottom: '1px solid #E2E8F0',
                      cursor: col.key !== 'checkbox' ? 'pointer' : 'default',
                      ...(isSticky ? { position: 'sticky', left: stickyLeft, zIndex: 11, background: '#F8FAFC' } : {}),
                    }}
                    onClick={col.key === 'checkbox' ? selectAll : () => toggleSort(col.key)}
                  >
                    {col.key === 'checkbox' ? (
                      <div className="flex justify-center">
                        <input type="checkbox" checked={isAllSelected} onChange={selectAll} className="w-3.5 h-3.5 rounded accent-[#2563EB]" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-0.5">
                        {col.label}
                        {sort && (sort.dir === 'asc' ? <ArrowUp size={8} style={{ opacity: 0.6 }} /> : <ArrowDown size={8} style={{ opacity: 0.6 }} />)}
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {grouped ? (
              grouped.map(group => (
                <React.Fragment key={group.key}>
                  <tr>
                    <td colSpan={visibleColDefs.length}>
                      <button onClick={() => toggleGroup(group.key)}
                        className="w-full flex items-center gap-2 px-3 text-left hover:bg-[#EFF6FF]"
                        style={{ height: 32, background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                        {collapsedGroups.has(group.key) ? <ChevronRight size={14} className="text-[#94A3B8]" /> : <ChevronDown size={14} className="text-[#94A3B8]" />}
                        <span className="text-[12px] font-semibold" style={{ color: '#0F172A' }}>{group.label}</span>
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: '#E2E8F0', color: '#64748B' }}>{group.items.length}</span>
                      </button>
                    </td>
                  </tr>
                  {!collapsedGroups.has(group.key) && renderRows(group.items)}
                </React.Fragment>
              ))
            ) : isEmpty ? (
              <tr>
                <td colSpan={visibleColDefs.length}>
                  {hasFilters ? (
                    <div className="flex flex-col items-center justify-center py-16">
                      <SearchX size={40} className="text-[#CBD5E1] mb-3" />
                      <p className="text-[14px] font-medium mb-1" style={{ color: '#64748B' }}>No items match your filters</p>
                      <button onClick={onClearFilters} className="text-[12px] font-medium hover:underline" style={{ color: '#2563EB' }}>Clear filters</button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3" style={{ background: '#F1F5F9' }}>
                        <FileText size={28} className="text-[#94A3B8]" />
                      </div>
                      <p className="text-[14px] font-semibold mb-1" style={{ color: '#334155' }}>No work items yet</p>
                      <p className="text-[12px] mb-3" style={{ color: '#94A3B8' }}>Create your first work item to get started</p>
                      {onCreateClick && (
                        <button onClick={onCreateClick} className="px-4 py-1.5 text-[12px] font-semibold rounded text-white" style={{ background: '#2563EB' }}>
                          Create work item
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ) : renderRows(items)}
            {!isEmpty && onCreateClick && (
              <tr>
                <td colSpan={visibleColDefs.length}>
                  <button onClick={onCreateClick}
                    className="w-full flex items-center gap-2 px-4 py-2 text-[11px] font-medium hover:bg-[#F8FAFC] cursor-pointer"
                    style={{ color: '#94A3B8', height: 36 }}>
                    <Plus size={14} /> Create work item
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
