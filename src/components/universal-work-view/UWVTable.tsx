// @ts-nocheck
/**
 * UWVTable — virtualized grid using react-window FixedSizeList.
 * Renders sticky header + UWVRow children. Triggers fetchMore at 75% scroll.
 */

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { FixedSizeList } from 'react-window';
import Checkbox from '@atlaskit/checkbox';
import EmptyState from '@atlaskit/empty-state';
import Spinner from '@atlaskit/spinner';
import { token } from '@atlaskit/tokens';
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

const HEADER_HEIGHT = 40;

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

  const rowHeight = density === 'compact' ? 32 : JIRA_ROW_HEIGHT;

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
      `36px ${columns.map((c) => `${c.width}px`).join(' ')} 28px`,
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
          background: '#FFFFFF',
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
        background: '#FFFFFF',
        overflow: 'hidden',
      }}
      role="grid"
      aria-rowcount={totalCount}
    >
      {/* Sticky header */}
      <div
        role="row"
        style={{
          display: 'grid',
          gridTemplateColumns: gridTemplate,
          background: '#F4F5F7',
          height: HEADER_HEIGHT,
          borderBottom: '2px solid #DFE1E6',
          position: 'sticky',
          top: 0,
          zIndex: 2,
          flexShrink: 0,
        }}
      >
        <div
          role="columnheader"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Checkbox
            isChecked={allSelected}
            isIndeterminate={someSelected}
            onChange={(e: any) => toggleAll(e?.currentTarget?.checked ?? !allSelected)}
          />
        </div>
        {columns.map((col) => {
          const sf = sort[0];
          const isSorted = sf?.fieldId === col.fieldId;
          return (
            <div
              key={col.fieldId}
              role="columnheader"
              onClick={() => col.sortable && handleSort(col.fieldId)}
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#5E6C84',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                cursor: col.sortable ? 'pointer' : 'default',
                padding: '0 12px',
                userSelect: 'none',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              {col.label}
              {col.sortable && isSorted ? (
                <span style={{ fontSize: 10, color: '#42526E' }}>
                  {sf!.direction === 'asc' ? '▲' : '▼'}
                </span>
              ) : null}
            </div>
          );
        })}
        <div
          role="columnheader"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6B778C',
            fontSize: 14,
          }}
        >
          +
        </div>
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
            borderTop: '1px solid #EBECF0',
            background: '#FAFBFC',
          }}
        >
          <Spinner size="small" />
        </div>
      )}
    </div>
  );
}
