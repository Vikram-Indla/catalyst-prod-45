// @ts-nocheck
/**
 * UWVTable — pixel-perfect Project Backlog parity.
 *
 * Renders the canonical <JiraTable> with the same cell renderers used on
 * /project-hub/:key/backlog (BacklogPage.atlaskit.tsx). Read-only: no edit
 * affordances, since UWV rows are 100% Jira-synced and any inline mutation
 * would immediately error.
 *
 * Supports group-by (status / priority / parent / assignee / type) and
 * hierarchical depth indent for parent → child nesting.
 */

import React, { useMemo, useState, useCallback } from 'react';
import EmptyState from '@atlaskit/empty-state';
import {
  JiraTable,
  makeKeyCell,
  makeSummaryCell,
  makeStatusCell,
  makeAssigneeCell,
  makePriorityCell,
  makeDateCell,
  makeCommentsCell,
  makeParentCell,
  makeTypeIconCell,
  makeCaretCell,
} from '@/components/shared/JiraTable';
import type { Column, RowGroup } from '@/components/shared/JiraTable';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import {
  classifyType,
  jiraIconType,
  lozengeAppearance,
  buildGroups,
  type UWVGroupBy,
} from './uwv.utils';
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
  groupBy: UWVGroupBy;
}

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
  groupBy,
}: UWVTableProps) {
  // ─── Hierarchy expand/collapse ──────────────────────────────────────────
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const toggleExpanded = useCallback((row: UWVItem) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(row.id)) next.delete(row.id);
      else next.add(row.id);
      return next;
    });
  }, []);

  // ─── Children index (parentKey → rows) ──────────────────────────────────
  const childrenByParentKey = useMemo(() => {
    const m = new Map<string, UWVItem[]>();
    for (const it of items) {
      if (!it.parentKey) continue;
      const arr = m.get(it.parentKey);
      if (arr) arr.push(it);
      else m.set(it.parentKey, [it]);
    }
    return m;
  }, [items]);

  const hasChildren = useCallback(
    (row: UWVItem) => childrenByParentKey.has(row.key),
    [childrenByParentKey],
  );

  // ─── Visible row computation respecting expanded state ─────────────────
  // Top-level rows = those whose parent is NOT in the result set.
  const visibleRows = useMemo(() => {
    const idsByKey = new Map(items.map((i) => [i.key, i]));
    const top = items.filter((i) => !i.parentKey || !idsByKey.has(i.parentKey));
    const out: UWVItem[] = [];
    const walk = (row: UWVItem) => {
      out.push(row);
      if (expandedIds.has(row.id)) {
        const kids = childrenByParentKey.get(row.key) ?? [];
        for (const k of kids) walk(k);
      }
    };
    for (const t of top) walk(t);
    return out;
  }, [items, expandedIds, childrenByParentKey]);

  const getRowDepth = useCallback(
    (row: UWVItem) => {
      // Two-level: anything with a parent in-set sits at depth 1.
      if (!row.parentKey) return 0;
      return items.some((i) => i.key === row.parentKey) ? 1 : 0;
    },
    [items],
  );

  // ─── Group buckets ──────────────────────────────────────────────────────
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const toggleGroup = useCallback((id: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const groups: RowGroup<UWVItem>[] | null = useMemo(() => {
    const built = buildGroups(visibleRows, groupBy);
    if (!built) return null;
    return built.map((g) => ({ id: g.id, label: g.label, rows: g.rows }));
  }, [visibleRows, groupBy]);

  // ─── Visible column set (driven by toolbar prefs) ─────────────────────
  const visibleColumnIds = useMemo(
    () => new Set(columns.filter((c) => c.visible).map((c) => c.fieldId)),
    [columns],
  );

  // ─── Column schema (canonical JiraTable cell renderers, read-only) ─────
  const tableColumns = useMemo<Column<UWVItem>[]>(
    () => [
      {
        id: '__caret',
        label: '',
        width: 3,
        align: 'center',
        alwaysVisible: true,
        cell: makeCaretCell({
          hasChildren,
          isExpanded: (r) => expandedIds.has(r.id),
          toggle: toggleExpanded,
        }),
      },
      {
        id: '__type',
        label: '',
        width: 3,
        align: 'center',
        alwaysVisible: true,
        cell: makeTypeIconCell((r: UWVItem) => (
          <JiraIssueTypeIcon type={jiraIconType(r.issueType)} size={16} />
        )),
      },
      {
        id: 'key',
        label: 'Key',
        width: 9,
        sortable: true,
        defaultVisible: true,
        accessor: (r) => r.key,
        cell: makeKeyCell((r: UWVItem) => r.key),
      },
      {
        id: 'summary',
        label: 'Summary',
        width: 28,
        sortable: true,
        alwaysVisible: true,
        accessor: (r) => r.summary,
        cell: makeSummaryCell((r: UWVItem) => r.summary),
      },
      {
        id: 'status',
        label: 'Status',
        width: 13,
        sortable: true,
        defaultVisible: true,
        accessor: (r) => r.status,
        cell: makeStatusCell(
          (r: UWVItem) => r.status || null,
          (s) => lozengeAppearance('', s ?? ''),
        ),
      },
      {
        id: 'comments',
        label: 'Comments',
        width: 8,
        defaultVisible: false,
        cell: makeCommentsCell((r: UWVItem) => r.commentCount ?? 0),
      },
      {
        id: 'parent',
        label: 'Parent',
        width: 14,
        defaultVisible: true,
        accessor: (r) => r.parentKey,
        cell: makeParentCell((r: UWVItem) =>
          r.parentKey
            ? {
                key: r.parentKey,
                label: '',
                icon: <JiraIssueTypeIcon type="Epic" size={12} />,
              }
            : null,
        ),
      },
      {
        id: 'assignee',
        label: 'Assignee',
        width: 13,
        sortable: true,
        defaultVisible: true,
        accessor: (r) => r.assigneeName,
        cell: makeAssigneeCell((r: UWVItem) =>
          r.assigneeName ? { name: r.assigneeName, avatarUrl: r.assigneeAvatar ?? null } : null,
        ),
      },
      {
        id: 'priority',
        label: 'Priority',
        width: 5,
        sortable: true,
        defaultVisible: true,
        accessor: (r) => r.priority,
        cell: makePriorityCell((r: UWVItem) => r.priority ?? null),
      },
      {
        id: 'updated',
        label: 'Updated',
        width: 7,
        sortable: true,
        defaultVisible: true,
        accessor: (r) => r.updated,
        cell: makeDateCell((r: UWVItem) => r.updated ?? null),
      },
      {
        id: 'created',
        label: 'Created',
        width: 7,
        sortable: true,
        defaultVisible: false,
        accessor: (r) => r.created,
        cell: makeDateCell((r: UWVItem) => r.created ?? null),
      },
      {
        id: 'dueDate',
        label: 'Due date',
        width: 7,
        sortable: true,
        defaultVisible: false,
        accessor: (r) => r.dueDate,
        cell: makeDateCell((r: UWVItem) => r.dueDate ?? null),
      },
    ],
    [hasChildren, expandedIds, toggleExpanded],
  );

  // Sort state translation (uwv.types uses fieldId/asc-desc; JiraTable uses key/ASC-DESC).
  const sf = sort[0];
  const sortKey = sf?.fieldId;
  const sortOrder = sf ? (sf.direction === 'asc' ? 'ASC' : 'DESC') : undefined;

  const handleSortChange = useCallback(
    (k: string, ord: 'ASC' | 'DESC') => {
      onSortChange([{ fieldId: k, direction: ord === 'ASC' ? 'asc' : 'desc' }]);
    },
    [onSortChange],
  );

  // Infinite scroll trigger — lightweight scroll listener on container.
  const containerRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) onLoadMore();
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [onLoadMore]);

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        minHeight: 0,
        overflow: 'auto',
        background: 'var(--ds-surface, var(--ds-surface, #FFFFFF))',
        padding: '4px 16px 16px',
      }}
    >
      <JiraTable<UWVItem>
        columns={tableColumns}
        data={groups ? undefined : visibleRows}
        groups={groups ?? undefined}
        collapsedGroups={collapsedGroups}
        onToggleGroup={toggleGroup}
        columnVisibility={visibleColumnIds}
        getRowId={(r) => r.id}
        getRowDepth={getRowDepth}
        onRowClick={(r) => onItemClick(r.key)}
        selectable
        selection={selectedIds}
        onSelectionChange={onSelectChange}
        sortKey={sortKey}
        sortOrder={sortOrder as any}
        onSortChange={handleSortChange}
        density={density === 'compact' ? 'compact' : 'comfortable'}
        ariaLabel="Universal work view"
        emptyView={
          <EmptyState
            header="No work items"
            description="Adjust filters or scope to see more items."
          />
        }
      />
    </div>
  );
}
