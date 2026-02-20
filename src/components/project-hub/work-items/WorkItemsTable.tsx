import React, { useState, useMemo } from 'react';
import type { WorkItemRow } from '@/hooks/useProjectWorkItems';
import { WorkItemTableRow } from './WorkItemTableRow';

interface WorkItemsTableProps {
  items: WorkItemRow[];
  onRowClick: (id: string) => void;
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

const HEADER_COLS = [
  { label: '', width: 34 },   // checkbox
  { label: 'TYPE', width: 46 },
  { label: 'KEY', width: 70 },
  { label: 'SUMMARY', width: undefined }, // flex
  { label: 'STATUS', width: 102 },
  { label: 'COMMENTS', width: 60 },
  { label: 'ASSIGNEE', width: 136 },
  { label: 'DUE DATE', width: 100 },
  { label: 'PRIORITY', width: 84 },
  { label: 'LABELS', width: 74 },
];

export function WorkItemsTable({ items, onRowClick }: WorkItemsTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const { roots, childrenMap } = useMemo(() => buildTree(items), [items]);

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Flatten visible rows
  const rows: { item: WorkItemRow; depth: number }[] = [];
  function walk(list: WorkItemRow[], depth: number) {
    for (const item of list) {
      rows.push({ item, depth });
      const children = childrenMap.get(item.id);
      if (children && expanded.has(item.id)) {
        walk(children, depth + 1);
      }
    }
  }
  walk(roots, 0);

  return (
    <div className="border rounded-t-md overflow-hidden" style={{ borderColor: '#E2E8F0', background: '#FFFFFF' }}>
      <table className="w-full border-collapse table-fixed" style={{ fontFamily: 'Inter, sans-serif' }}>
        <thead>
          <tr style={{ height: 34, background: '#F8FAFC' }} className="sticky top-0 z-10">
            {HEADER_COLS.map((col, i) => (
              <th
                key={i}
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
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ item, depth }) => (
            <WorkItemTableRow
              key={item.id}
              item={item}
              depth={depth}
              hasChildren={childrenMap.has(item.id)}
              isExpanded={expanded.has(item.id)}
              onToggle={() => toggle(item.id)}
              onClick={() => onRowClick(item.id)}
            />
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={HEADER_COLS.length} className="text-center py-12 text-[#94A3B8] text-sm">
                No work items found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
