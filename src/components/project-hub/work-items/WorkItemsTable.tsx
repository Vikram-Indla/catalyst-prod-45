import React, { useState, useMemo } from 'react';
import { Plus, ChevronDown, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';
import type { WorkItemRow } from '@/hooks/useProjectWorkItems';
import type { SortColumn, ColumnDef, GroupedItems } from '@/hooks/useWorkItemListState';
import { WorkItemTableRow } from './WorkItemTableRow';

interface WorkItemsTableProps {
  items: WorkItemRow[];
  onRowClick: (id: string) => void;
  onCreateClick?: () => void;
  sorts: SortColumn[];
  onToggleSort: (field: keyof WorkItemRow, multi: boolean) => void;
  columns: ColumnDef[];
  grouped: GroupedItems[] | null;
}

// Build hierarchy: top-level items (no parent) + their children map
function buildTree(items: WorkItemRow[]) {
  const childrenMap = new Map<string, WorkItemRow[]>();
  const roots: WorkItemRow[] = [];
  for (const item of items) {
    if (!item.parent_id) {
      roots.push(item);
    } else {
      const siblings = childrenMap.get(item.parent_id) || [];
      siblings.push(item);
      childrenMap.set(item.parent_id, siblings);
    }
  }
  return { roots, childrenMap };
}

export function WorkItemsTable({ items, onRowClick, onCreateClick, sorts, onToggleSort, columns, grouped }: WorkItemsTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const visibleCols = columns.filter(c => c.visible);

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const getSortState = (field: keyof WorkItemRow | null) => {
    if (!field) return null;
    return sorts.find(s => s.field === field) ?? null;
  };

  const renderRows = (rowItems: WorkItemRow[]) => {
    const { roots, childrenMap } = buildTree(rowItems);
    const rows: { item: WorkItemRow; depth: number }[] = [];
    function walk(list: WorkItemRow[], depth: number) {
      for (const item of list) {
        rows.push({ item, depth });
        const children = childrenMap.get(item.id);
        if (children && expanded.has(item.id)) walk(children, depth + 1);
      }
    }
    walk(roots, 0);
    return rows.map(({ item, depth }) => (
      <WorkItemTableRow
        key={item.id}
        item={item}
        depth={depth}
        hasChildren={childrenMap.has(item.id)}
        isExpanded={expanded.has(item.id)}
        onToggle={() => toggle(item.id)}
        onClick={() => onRowClick(item.id)}
        visibleColumns={visibleCols}
      />
    ));
  };

  return (
    <div className="border rounded-t-md overflow-hidden" style={{ borderColor: '#E2E8F0', background: '#FFFFFF' }}>
      <table className="w-full border-collapse table-fixed" style={{ fontFamily: 'Inter, sans-serif' }}>
        <thead>
          <tr style={{ height: 34, background: '#F8FAFC' }} className="sticky top-0 z-10">
            {visibleCols.map(col => {
              const sort = getSortState(col.field);
              return (
                <th
                  key={col.key}
                  className="text-left px-1 select-none"
                  style={{
                    width: col.width ?? undefined,
                    fontSize: 9,
                    fontWeight: 600,
                    color: '#94A3B8',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    fontFamily: 'Inter, sans-serif',
                    borderBottom: '1px solid #E2E8F0',
                    cursor: col.sortable ? 'pointer' : 'default',
                  }}
                  onClick={col.sortable && col.field ? (e) => onToggleSort(col.field!, e.shiftKey) : undefined}
                >
                  <div className="flex items-center gap-0.5">
                    {col.label}
                    {sort && (
                      sort.dir === 'asc'
                        ? <ArrowUp size={8} style={{ opacity: 0.6 }} />
                        : <ArrowDown size={8} style={{ opacity: 0.6 }} />
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {grouped ? (
            grouped.map(group => (
              <React.Fragment key={group.key}>
                {/* Group header */}
                <tr>
                  <td colSpan={visibleCols.length}>
                    <button
                      onClick={() => toggleGroup(group.key)}
                      className="w-full flex items-center gap-2 px-3 text-left transition-colors hover:bg-[#EFF6FF]"
                      style={{ height: 32, background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}
                    >
                      {collapsedGroups.has(group.key)
                        ? <ChevronRight size={14} className="text-[#94A3B8]" />
                        : <ChevronDown size={14} className="text-[#94A3B8]" />
                      }
                      <span className="text-[12px] font-semibold" style={{ color: '#0F172A' }}>{group.label}</span>
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                        style={{ background: '#E2E8F0', color: '#64748B' }}
                      >
                        {group.items.length}
                      </span>
                    </button>
                  </td>
                </tr>
                {!collapsedGroups.has(group.key) && renderRows(group.items)}
              </React.Fragment>
            ))
          ) : (
            renderRows(items)
          )}
          {(!grouped && items.length === 0) && (
            <tr>
              <td colSpan={visibleCols.length} className="text-center py-12 text-[#94A3B8] text-sm">
                No work items found
              </td>
            </tr>
          )}
          {onCreateClick && (
            <tr>
              <td colSpan={visibleCols.length}>
                <button
                  onClick={onCreateClick}
                  className="w-full flex items-center gap-2 px-4 py-2 text-[11px] font-medium hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                  style={{ color: '#94A3B8', height: 36, border: 'none', background: 'transparent' }}
                >
                  <Plus size={14} />
                  Create work item
                </button>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
