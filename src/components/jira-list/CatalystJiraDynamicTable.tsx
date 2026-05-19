/**
 * CatalystJiraDynamicTable — wraps @atlaskit/dynamic-table for Jira-like BAU list view.
 *
 * Uses the PUBLIC @atlaskit/dynamic-table package (v18.4.x) which provides built-in
 * pagination (50/page), column sorting, and loading spinner.
 * Do NOT copy private Jira product CSS — all theming uses var(--ds-*) ADS tokens.
 */
import React, { useMemo, useState, useCallback } from 'react';
import DynamicTable from '@atlaskit/dynamic-table';
import type { HeadType, RowType, SortOrderType } from '@atlaskit/dynamic-table/types';
import Checkbox from '@atlaskit/checkbox';
import { WorkCell } from './WorkCell';
import { ParentCell } from './ParentCell';
import { StatusDropdownCell } from './StatusDropdownCell';
import { ColumnConfigPopup } from './ColumnConfigPopup';
import type { CatalystJiraDynamicTableProps, JiraIssue, VisibleColumnKey } from './jira-list.types';
// ads-scanner:ignore-next-line — scoped component CSS uses var(--ds-*) tokens only; CSS-in-JS not used in this module
import './jira-list.css';

const ROWS_PER_PAGE = 50;

const DEFAULT_VISIBLE: VisibleColumnKey[] = ['checkbox', 'work', 'parent', 'status', 'columnConfig'];

function buildHead(
  visibleColumns: VisibleColumnKey[],
  allChecked: boolean,
  someChecked: boolean,
  onToggleAll: () => void,
  visibleCols: VisibleColumnKey[],
  onColsChange: (cols: VisibleColumnKey[]) => void,
): HeadType {
  const cells: HeadType['cells'] = [];

  if (visibleColumns.includes('checkbox')) {
    cells.push({
      key: 'checkbox',
      content: (
        <Checkbox
          isChecked={allChecked}
          isIndeterminate={!allChecked && someChecked}
          onChange={onToggleAll}
          label="Select all rows"
          aria-label="Select all rows"
        />
      ),
      width: 4,
      isSortable: false,
      shouldTruncate: false,
    });
  }

  if (visibleColumns.includes('work')) {
    cells.push({
      key: 'work',
      content: 'Work',
      width: 52,
      isSortable: true,
      shouldTruncate: false,
    });
  }

  if (visibleColumns.includes('parent')) {
    cells.push({
      key: 'parent',
      content: 'Parent',
      width: 20,
      isSortable: false,
      shouldTruncate: true,
    });
  }

  if (visibleColumns.includes('status')) {
    cells.push({
      key: 'status',
      content: 'Status',
      width: 16,
      isSortable: true,
      shouldTruncate: false,
    });
  }

  if (visibleColumns.includes('columnConfig')) {
    cells.push({
      key: 'columnConfig',
      content: (
        <ColumnConfigPopup visibleColumns={visibleCols} onChange={onColsChange} />
      ),
      width: 8,
      isSortable: false,
      shouldTruncate: false,
    });
  }

  return { cells };
}

function buildRows(
  issues: JiraIssue[],
  selectedKeys: Set<string>,
  onToggleRow: (key: string) => void,
  onOpen: (key: string) => void,
  onStatusChange: (issueKey: string, newStatusId: string) => void,
  availableStatuses: any[],
  visibleColumns: VisibleColumnKey[],
): RowType[] {
  return issues.map((issue) => {
    const isSelected = selectedKeys.has(issue.key);
    const cells: RowType['cells'] = [];

    if (visibleColumns.includes('checkbox')) {
      cells.push({
        key: 'checkbox',
        content: (
          <Checkbox
            isChecked={isSelected}
            onChange={() => onToggleRow(issue.key)}
            label={`Select issue ${issue.key}`}
            aria-label={`Select issue ${issue.key}`}
          />
        ),
      });
    }

    if (visibleColumns.includes('work')) {
      cells.push({
        key: 'work',
        content: <WorkCell issue={issue} onOpen={onOpen} />,
      });
    }

    if (visibleColumns.includes('parent')) {
      cells.push({
        key: 'parent',
        content: <ParentCell issue={issue} onOpen={onOpen} />,
      });
    }

    if (visibleColumns.includes('status')) {
      cells.push({
        key: 'status',
        content: (
          <StatusDropdownCell
            issue={issue}
            onStatusChange={onStatusChange}
            availableStatuses={availableStatuses}
          />
        ),
      });
    }

    if (visibleColumns.includes('columnConfig')) {
      cells.push({ key: 'columnConfig', content: null });
    }

    return {
      key: issue.key,
      cells,
      isHighlighted: isSelected,
      testId: `jira-list-row-${issue.key}`,
    };
  });
}

export function CatalystJiraDynamicTable({
  issues,
  currentPage,
  isLoading,
  sortKey,
  sortOrder,
  onSort,
  onSetPage,
  onOpen = () => {},
  onStatusChange = () => {},
  availableStatuses = [],
}: CatalystJiraDynamicTableProps) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [visibleColumns, setVisibleColumns] = useState<VisibleColumnKey[]>(DEFAULT_VISIBLE);

  const allChecked = issues.length > 0 && selectedKeys.size === issues.length;
  const someChecked = selectedKeys.size > 0 && !allChecked;

  const toggleAll = useCallback(() => {
    if (allChecked || someChecked) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(issues.map((i) => i.key)));
    }
  }, [allChecked, someChecked, issues]);

  const toggleRow = useCallback((key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const head = useMemo(
    () => buildHead(visibleColumns, allChecked, someChecked, toggleAll, visibleColumns, setVisibleColumns),
    [visibleColumns, allChecked, someChecked, toggleAll]
  );

  const rows = useMemo(
    () => buildRows(issues, selectedKeys, toggleRow, onOpen, onStatusChange, availableStatuses, visibleColumns),
    [issues, selectedKeys, toggleRow, onOpen, onStatusChange, availableStatuses, visibleColumns]
  );

  const handleSort = useCallback(
    ({ key, sortOrder: order }: { key: string; sortOrder: SortOrderType }) => {
      onSort({ key, sortOrder: order });
    },
    [onSort]
  );

  return (
    <div className="catalyst-jira-list-view">
      <div className="catalyst-jira-list-table">
        <DynamicTable
          head={head}
          rows={rows}
          rowsPerPage={ROWS_PER_PAGE}
          defaultPage={1}
          page={currentPage}
          isFixedSize={false}
          isLoading={isLoading}
          isRankable={false}
          sortKey={sortKey}
          sortOrder={sortOrder as SortOrderType}
          defaultSortKey="created"
          defaultSortOrder="DESC"
          loadingSpinnerSize="large"
          onSort={handleSort}
          onSetPage={onSetPage}
          highlightedRowIndex={[]}
          label="Senaei BAU issue list"
          emptyView={
            <div className="catalyst-jira-list-empty">
              <div className="catalyst-jira-list-empty__heading">No issues found</div>
              <div>Adjust your filters or create a new issue.</div>
            </div>
          }
        />
      </div>
    </div>
  );
}
