// @ts-nocheck
/**
 * UWVTable — virtualized grid using react-window FixedSizeList.
 *
 * Brought to PARITY with AllWorkTable.tsx header & grid:
 *   - 44px rows (JIRA_ROW_HEIGHT)
 *   - Theme tokens (var(--bg-app), var(--fg-3), var(--bd-default))
 *   - Native checkbox in header
 *   - Inter font, uppercase 10.5px header labels
 *   - Lucide ArrowUp / ArrowDown sort indicators
 *   - Column width=0 → '1fr' (used for Summary column)
 *   - No trailing "+" placeholder cell
 */

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { FixedSizeList } from 'react-window';
import { ArrowUp, ArrowDown } from 'lucide-react';
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

  const rowHeight = density === 'compact' ? 32 : 36;

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
        .map((c) => (c.width === 0 ? '1fr' : `${c.width}px`))
        .join(' ')}`,
    [columns],
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
      {/* Sticky header — matches AllWorkTable header style */}
      <div
        role="row"
        style={{
          display: 'grid',
          gridTemplateColumns: gridTemplate,
          background: 'var(--bg-app)',
          height: HEADER_HEIGHT,
          maxHeight: HEADER_HEIGHT,
          borderBottom: '1px solid var(--bd-default, #2E2E2E)',
          position: 'sticky',
          top: 0,
          zIndex: 2,
          flexShrink: 0,
          alignItems: 'center',
        }}
      >
        <div
          role="columnheader"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = someSelected;
            }}
            onChange={(e) => toggleAll(e.currentTarget.checked)}
            className="w-4 h-4 rounded cursor-pointer"
            style={{ accentColor: 'var(--cp-blue)' }}
            aria-label="Select all items"
          />
        </div>
        {columns.map((col) => {
          const sf = sort[0];
          const isSorted = sf?.fieldId === col.fieldId;
          return (
            <button
              key={col.fieldId}
              role="columnheader"
              aria-sort={
                col.sortable && isSorted
                  ? sf!.direction === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : undefined
              }
              onClick={() => col.sortable && handleSort(col.fieldId)}
              style={{
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
                color: 'var(--fg-3)',
                fontFamily: 'Inter, sans-serif',
                cursor: col.sortable ? 'pointer' : 'default',
                textAlign: 'left',
                userSelect: 'none',
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
