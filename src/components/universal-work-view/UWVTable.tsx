// @ts-nocheck
/**
 * UWVTable — virtualized grid using react-window FixedSizeList.
 *
 * Brought to PARITY with AllWorkTable.tsx (Project Backlog table):
 *   - 40px rows (JIRA_ROW_HEIGHT)
 *   - Header: 12px / 600 / #6B778C / 2px #C1C7D0 border / #F7F8F9 bg
 *   - Atlaskit checkbox icon-only (label visually hidden)
 *   - Column resize via right-edge drag handle (per-column, persisted in local state)
 *   - Width=0 sentinel → '1fr' (Summary)
 */

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { FixedSizeList } from 'react-window';
import { ArrowUp, ArrowDown } from 'lucide-react';
import Checkbox from '@atlaskit/checkbox';
import EmptyState from '@atlaskit/empty-state';
import Spinner from '@atlaskit/spinner';
import { UWVRow } from './UWVRow';
import { JIRA_ROW_HEIGHT } from './uwv.utils';
import type { UWVColumn, UWVItem, UWVSort } from './uwv.types';

interface UWVTableProps {
  columns: UWVColumn[];
  items: UWVItem[];
  sort: UWVSort[];
  onSortChange: (sort: UWVSort[]) => void;
  selectedIds: Set<string>;
  onSelectChange: (ids: Set<string>) => void;
  onItemClick: (key: string) => void;
  onLoadMore: () => void;
  density: 'comfortable' | 'compact';
  isLoadingMore: boolean;
  totalCount: number;
}

const HEADER_HEIGHT = 44;

export function UWVTable({
  columns,
  items,
  sort,
  onSortChange,
  selectedIds,
  onSelectChange,
  onItemClick,
  onLoadMore,
  density,
  isLoadingMore,
  totalCount,
}: UWVTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const rowHeight = density === 'compact' ? 36 : JIRA_ROW_HEIGHT;

  // ─── Column width state (resizable) ──────────────────────────────────
  // Seeded from columns[].width. Width 0 = fluid (treated as '1fr').
  const [colWidths, setColWidths] = useState<Record<string, number>>(() =>
    Object.fromEntries(columns.map((c) => [c.fieldId, c.width])),
  );

  // Reseed when the visible column set changes (e.g., column picker toggle).
  useEffect(() => {
    setColWidths((prev) => {
      const next: Record<string, number> = { ...prev };
      for (const c of columns) {
        if (next[c.fieldId] == null) next[c.fieldId] = c.width;
      }
      return next;
    });
  }, [columns]);

  const startResize = useCallback(
    (e: React.MouseEvent, fieldId: string) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startWidth = colWidths[fieldId] ?? 120;
      // If column was fluid (width=0), use measured size as the starting point.
      const effectiveStart = startWidth === 0 ? 240 : startWidth;
      const onMove = (mv: MouseEvent) => {
        const diff = mv.clientX - startX;
        setColWidths((w) => ({
          ...w,
          [fieldId]: Math.max(48, effectiveStart + diff),
        }));
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [colWidths],
  );

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight - HEADER_HEIGHT);
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const gridTemplate = useMemo(
    () =>
      `40px ${columns
        .map((c) => {
          const w = colWidths[c.fieldId] ?? c.width;
          return w === 0 ? '1fr' : `${w}px`;
        })
        .join(' ')}`,
    [columns, colWidths],
  );

  const handleSort = useCallback(
    (fieldId: string) => {
      const current = sort[0];
      if (current?.fieldId === fieldId) {
        onSortChange([{ fieldId, direction: current.direction === 'asc' ? 'desc' : 'asc' }]);
      } else {
        onSortChange([{ fieldId, direction: 'asc' }]);
      }
    },
    [sort, onSortChange],
  );

  const allSelected = items.length > 0 && items.every((i) => selectedIds.has(i.id));
  const someSelected = !allSelected && items.some((i) => selectedIds.has(i.id));

  const toggleAll = (checked: boolean) => {
    if (checked) onSelectChange(new Set(items.map((i) => i.id)));
    else onSelectChange(new Set());
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectChange(next);
  };

  const toggleExpand = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  };

  const onScroll = useCallback(
    ({ scrollOffset }: { scrollOffset: number }) => {
      if (!items.length) return;
      const totalHeight = items.length * rowHeight;
      const visibleEnd = scrollOffset + containerHeight;
      if (visibleEnd / totalHeight >= 0.75) {
        onLoadMore();
      }
    },
    [items.length, rowHeight, containerHeight, onLoadMore],
  );

  if (items.length === 0) {
    return (
      <div
        ref={containerRef}
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-app)',
        }}
      >
        <EmptyState
          header="No work items"
          description="Adjust filters or scope to see more items."
        />
      </div>
    );
  }

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = items[index];
    if (!item) return null;
    const hasChildren = items.some((i) => i.parentKey === item.key);
    return (
      <div style={style}>
        <UWVRow
          item={item}
          columns={columns}
          gridTemplate={gridTemplate}
          isSelected={selectedIds.has(item.id)}
          isExpanded={expanded.has(item.id)}
          hasChildren={hasChildren}
          onToggleSelect={() => toggleSelect(item.id)}
          onToggleExpand={() => toggleExpand(item.id)}
          onClick={() => onItemClick(item.key)}
        />
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-app)',
        overflow: 'hidden',
      }}
      role="grid"
      aria-rowcount={totalCount}
    >
      {/* Sticky header — matches JiraTable header style */}
      <div
        role="row"
        style={{
          display: 'grid',
          gridTemplateColumns: gridTemplate,
          background: '#F7F8F9',
          height: HEADER_HEIGHT,
          maxHeight: HEADER_HEIGHT,
          borderBottom: '2px solid #C1C7D0',
          position: 'sticky',
          top: 0,
          zIndex: 2,
          flexShrink: 0,
          alignItems: 'center',
        }}
      >
        <div
          role="columnheader"
          aria-label="Select all"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Checkbox
            isChecked={allSelected}
            isIndeterminate={someSelected && !allSelected}
            onChange={(e: any) => toggleAll(e.currentTarget.checked)}
            label=""
          />
        </div>
        {columns.map((col) => {
          const sf = sort[0];
          const isSorted = sf?.fieldId === col.fieldId;
          return (
            <div
              key={col.fieldId}
              role="columnheader"
              aria-sort={
                col.sortable && isSorted
                  ? sf!.direction === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : undefined
              }
              style={{
                position: 'relative',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <button
                type="button"
                onClick={() => col.sortable && handleSort(col.fieldId)}
                style={{
                  flex: 1,
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  background: 'transparent',
                  border: 'none',
                  padding: '0 8px',
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: '#6B778C',
                  cursor: col.sortable ? 'pointer' : 'default',
                  textAlign: 'left',
                  userSelect: 'none',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {col.label}
                {col.sortable && isSorted ? (
                  sf!.direction === 'asc' ? (
                    <ArrowUp size={12} />
                  ) : (
                    <ArrowDown size={12} />
                  )
                ) : null}
              </button>
              {/* Resize handle — right edge */}
              <div
                role="separator"
                aria-orientation="vertical"
                aria-label={`Resize ${col.label}`}
                onMouseDown={(e) => startResize(e, col.fieldId)}
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: 6,
                  height: '100%',
                  cursor: 'col-resize',
                  zIndex: 3,
                  userSelect: 'none',
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Virtualized rows */}
      {containerHeight > 0 && (
        <FixedSizeList
          height={containerHeight}
          width="100%"
          itemCount={items.length}
          itemSize={rowHeight}
          onScroll={onScroll}
          overscanCount={6}
        >
          {Row}
        </FixedSizeList>
      )}

      {isLoadingMore && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 12,
            borderTop: '1px solid var(--bd-subtle, #292929)',
            background: 'var(--bg-1)',
          }}
        >
          <Spinner size="small" />
        </div>
      )}
    </div>
  );
}
