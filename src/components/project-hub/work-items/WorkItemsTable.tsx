import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Plus, ChevronDown, ChevronRight, ArrowUp, ArrowDown, FileText, SearchX, Link2 } from 'lucide-react';
import type { WorkItemRow } from '@/hooks/useProjectWorkItems';
import type { SortColumn, ColumnDef, GroupedItems } from '@/hooks/useWorkItemListState';
import { WorkItemTableRow } from './WorkItemTableRow';
import { BulkActionsBar } from './BulkActionsBar';
import { TableContextMenu } from './TableContextMenu';
import { toast } from 'sonner';

interface WorkItemsTableProps {
  items: WorkItemRow[];
  onRowClick: (id: string) => void;
  onCreateClick?: () => void;
  sorts: SortColumn[];
  onToggleSort: (field: keyof WorkItemRow, multi: boolean) => void;
  columns: ColumnDef[];
  grouped: GroupedItems[] | null;
  // Inline editing + bulk
  onInlineUpdate: (id: string, changes: Record<string, any>) => void;
  onBulkUpdate: (ids: string[], changes: Record<string, any>) => void;
  onBulkDelete: (ids: string[]) => void;
  onCloneItem: (id: string) => void;
  statuses: { id: string; name: string; category: string }[];
  profiles: { id: string; name: string }[];
  hasSearchOrFilter: boolean;
  onClearFilters: () => void;
  sourceFilter?: 'all' | 'catalyst' | 'jira';
}

function buildTree(items: WorkItemRow[]) {
  const childrenMap = new Map<string, WorkItemRow[]>();
  const roots: WorkItemRow[] = [];
  for (const item of items) {
    if (!item.parent_id) roots.push(item);
    else {
      const siblings = childrenMap.get(item.parent_id) || [];
      siblings.push(item);
      childrenMap.set(item.parent_id, siblings);
    }
  }
  return { roots, childrenMap };
}

export function WorkItemsTable({
  items, onRowClick, onCreateClick, sorts, onToggleSort, columns, grouped,
  onInlineUpdate, onBulkUpdate, onBulkDelete, onCloneItem,
  statuses, profiles, hasSearchOrFilter, onClearFilters, sourceFilter,
}: WorkItemsTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastClickedId, setLastClickedId] = useState<string | null>(null);
  const [highlightedIdx, setHighlightedIdx] = useState<number>(-1);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: WorkItemRow } | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const visibleCols = columns.filter(c => c.visible);

  // All flat visible rows for keyboard nav
  const allFlatRows = useMemo(() => {
    const result: WorkItemRow[] = [];
    const addItems = (list: WorkItemRow[]) => {
      const { roots, childrenMap } = buildTree(list);
      const walk = (items: WorkItemRow[]) => {
        for (const item of items) {
          result.push(item);
          const children = childrenMap.get(item.id);
          if (children && expanded.has(item.id)) walk(children);
        }
      };
      walk(roots);
    };
    if (grouped) {
      for (const g of grouped) {
        if (!collapsedGroups.has(g.key)) addItems(g.items);
      }
    } else {
      addItems(items);
    }
    return result;
  }, [items, grouped, expanded, collapsedGroups]);

  const toggle = (id: string) => {
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  };

  // Selection
  const handleSelect = (item: WorkItemRow, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (e.shiftKey && lastClickedId) {
        // Range select
        const ids = allFlatRows.map(r => r.id);
        const fromIdx = ids.indexOf(lastClickedId);
        const toIdx = ids.indexOf(item.id);
        if (fromIdx !== -1 && toIdx !== -1) {
          const [start, end] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
          for (let i = start; i <= end; i++) next.add(ids[i]);
        }
      } else {
        if (next.has(item.id)) next.delete(item.id); else next.add(item.id);
      }
      return next;
    });
    setLastClickedId(item.id);
  };

  const selectAll = () => {
    if (selectedIds.size === allFlatRows.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(allFlatRows.map(r => r.id)));
  };

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>('input[placeholder="Search list"]');
        searchInput?.focus();
        return;
      }

      if (e.key === 'Escape') {
        setContextMenu(null);
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toast.info('Coming in AI Assist phase');
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIdx(prev => Math.min(prev + 1, allFlatRows.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIdx(prev => Math.max(prev - 1, 0));
      }
      if (e.key === 'Enter' && highlightedIdx >= 0 && highlightedIdx < allFlatRows.length) {
        onRowClick(allFlatRows[highlightedIdx].id);
      }
      if (e.key === ' ' && highlightedIdx >= 0 && highlightedIdx < allFlatRows.length) {
        e.preventDefault();
        const id = allFlatRows[highlightedIdx].id;
        setSelectedIds(prev => {
          const next = new Set(prev);
          next.has(id) ? next.delete(id) : next.add(id);
          return next;
        });
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [highlightedIdx, allFlatRows, onRowClick]);

  // Context menu
  const handleContextMenu = (item: WorkItemRow, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, item });
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
    return rows.map(({ item, depth }) => {
      const flatIdx = allFlatRows.findIndex(r => r.id === item.id);
      return (
        <WorkItemTableRow
          key={item.id}
          item={item}
          depth={depth}
          hasChildren={childrenMap.has(item.id)}
          isExpanded={expanded.has(item.id)}
          onToggle={() => toggle(item.id)}
          onClick={() => onRowClick(item.id)}
          visibleColumns={visibleCols}
          isSelected={selectedIds.has(item.id)}
          isHighlighted={flatIdx === highlightedIdx}
          onSelect={(e) => handleSelect(item, e)}
          onContextMenu={(e) => handleContextMenu(item, e)}
          onInlineUpdate={onInlineUpdate}
          statuses={statuses}
          profiles={profiles}
          source={item.source || 'catalyst'}
          syncStatus={item.sync_status as any}
          lastSyncedAt={item.last_synced_at}
          releaseLabel={item.release_name || undefined}
        />
      );
    });
  };

  const isAllSelected = allFlatRows.length > 0 && selectedIds.size === allFlatRows.length;

  // Empty state
  const isEmpty = items.length === 0 && !grouped;
  const isGroupEmpty = grouped && grouped.every(g => g.items.length === 0);

  return (
    <div ref={tableRef}>
      {/* Bulk actions bar */}
      <BulkActionsBar
        selectedCount={selectedIds.size}
        onClear={() => setSelectedIds(new Set())}
        onSetStatus={(statusId) => { onBulkUpdate([...selectedIds], { status_id: statusId }); setSelectedIds(new Set()); }}
        onSetPriority={(p) => { onBulkUpdate([...selectedIds], { priority: p }); setSelectedIds(new Set()); }}
        onFlag={() => { onBulkUpdate([...selectedIds], { is_flagged: true }); setSelectedIds(new Set()); }}
        onDelete={() => { onBulkDelete([...selectedIds]); setSelectedIds(new Set()); }}
        statuses={statuses}
      />

      <div className="border rounded-t-md overflow-hidden bg-[var(--cp-float)]" style={{
        borderColor: 'var(--divider)',
        borderTopLeftRadius: selectedIds.size > 0 ? 0 : undefined,
        borderTopRightRadius: selectedIds.size > 0 ? 0 : undefined,
      }}>
        <table className="w-full border-collapse table-fixed" style={{ fontFamily: 'Geist, -apple-system, sans-serif' }}>
          <thead>
            <tr style={{ height: 34 }} className="sticky top-0 z-10 bg-[var(--bg-1)]">
              {visibleCols.map(col => {
                const sort = getSortState(col.field);
                return (
                  <th
                    key={col.key}
                    className="text-left px-1 select-none"
                    style={{
                      width: col.width ?? undefined,
                      fontSize: 11, fontWeight: 700, color: 'var(--fg-4)', letterSpacing: '0.06em',
                      textTransform: 'uppercase', fontFamily: 'Geist, -apple-system, sans-serif',
                      borderBottom: '1px solid var(--divider)',
                      cursor: col.sortable ? 'pointer' : 'default',
                    }}
                    onClick={col.key === 'checkbox'
                      ? selectAll
                      : col.sortable && col.field ? (e) => onToggleSort(col.field!, e.shiftKey) : undefined}
                  >
                    {col.key === 'checkbox' ? (
                      <div className="flex justify-center">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={selectAll}
                          className="w-3.5 h-3.5 rounded accent-[#2563EB]"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-0.5">
                        {col.label}
                        {sort && (sort.dir === 'asc'
                          ? <ArrowUp size={8} style={{ opacity: 0.6 }} />
                          : <ArrowDown size={8} style={{ opacity: 0.6 }} />
                        )}
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
                    <td colSpan={visibleCols.length}>
                      <button
                        onClick={() => toggleGroup(group.key)}
                        className="w-full flex items-center gap-2 px-3 text-left transition-colors hover:bg-[rgba(59,130,246,0.06)] bg-[var(--bg-1)]"
                        style={{ height: 32, borderBottom: '1px solid var(--divider)' }}
                      >
                        {collapsedGroups.has(group.key)
                          ? <ChevronRight size={14} className="text-[rgba(237,237,237,0.40)]" />
                          : <ChevronDown size={14} className="text-[rgba(237,237,237,0.40)]" />
                        }
                        <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-1)' }}>{group.label}</span>
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--divider)]" style={{ color: 'var(--fg-3)' }}>
                          {group.items.length}
                        </span>
                      </button>
                    </td>
                  </tr>
                  {!collapsedGroups.has(group.key) && (
                    group.items.length > 0 ? renderRows(group.items) : (
                      <tr>
                        <td colSpan={visibleCols.length} className="text-center py-4">
                          <span className="text-[12px] italic" style={{ color: 'var(--fg-4)' }}>No items</span>
                        </td>
                      </tr>
                    )
                  )}
                </React.Fragment>
              ))
            ) : isEmpty ? (
              <tr>
                <td colSpan={visibleCols.length}>
                  {hasSearchOrFilter ? (
                    /* No search results */
                    <div className="flex flex-col items-center justify-center py-16">
                      <SearchX size={32} style={{ color: 'var(--divider)', marginBottom: 8 }} />
                      <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg-3)', marginBottom: 4 }}>No items match your search</p>
                      <button
                        onClick={onClearFilters}
                        style={{ fontSize: 12, fontWeight: 500, color: 'var(--cp-blue)', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        Clear filters
                      </button>
                    </div>
                  ) : sourceFilter === 'jira' ? (
                    /* Jira filter with no Jira items */
                    <div className="flex flex-col items-center justify-center py-16">
                      <Link2 size={32} style={{ color: 'var(--divider)', marginBottom: 8 }} />
                      <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg-3)', marginBottom: 4 }}>No Jira-sourced items in this project</p>
                      <p style={{ fontSize: 12, color: 'var(--fg-4)' }}>Connect Jira to start syncing.</p>
                    </div>
                  ) : sourceFilter === 'catalyst' ? (
                    /* Catalyst filter with no Catalyst items */
                    <div className="flex flex-col items-center justify-center py-16">
                      <FileText size={32} style={{ color: 'var(--divider)', marginBottom: 8 }} />
                      <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg-3)', marginBottom: 4 }}>All items in this project come from Jira.</p>
                    </div>
                  ) : (
                    /* No items at all */
                    <div className="flex flex-col items-center justify-center py-16">
                      <div className="flex items-center justify-center mb-3 bg-[var(--cp-bd-zone)]" style={{ width: 56, height: 56, borderRadius: '50%' }}>
                        <FileText size={28} style={{ color: 'var(--fg-4)' }} />
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 4 }}>No work items yet</p>
                      <p style={{ fontSize: 12, color: 'var(--fg-4)', marginBottom: 12 }}>Create your first work item to get started</p>
                      {onCreateClick && (
                        <button
                          onClick={onCreateClick}
                          className="bg-[var(--cp-blue)]"
                          style={{ padding: '6px 16px', fontSize: 12, fontWeight: 600, borderRadius: 4, color: '#FFFFFF', border: 'none', cursor: 'pointer' }}
                        >
                          Create work item
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              renderRows(items)
            )}
            {!isEmpty && onCreateClick && (
              <tr>
                <td colSpan={visibleCols.length}>
                  <button
                    onClick={onCreateClick}
                    className="w-full flex items-center gap-2 px-4 py-2 text-[11px] font-medium hover:bg-[#1A1A1A] transition-colors cursor-pointer"
                    style={{ color: 'var(--fg-4)', height: 50, border: 'none', background: 'transparent' }}
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

      {/* Context menu */}
      {contextMenu && (
        <TableContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          itemKey={contextMenu.item.item_key}
          isFlagged={contextMenu.item.is_flagged}
          onClose={() => setContextMenu(null)}
          onOpenDetail={() => onRowClick(contextMenu.item.id)}
          onCopyKey={() => { navigator.clipboard.writeText(contextMenu.item.item_key); toast.success(`Copied ${contextMenu.item.item_key}`); }}
          onClone={() => onCloneItem(contextMenu.item.id)}
          onToggleFlag={() => onInlineUpdate(contextMenu.item.id, { is_flagged: !contextMenu.item.is_flagged })}
          onDelete={() => onBulkDelete([contextMenu.item.id])}
        />
      )}
    </div>
  );
}
