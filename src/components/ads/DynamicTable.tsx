/**
 * DynamicTable — Catalyst wrapper over @atlaskit/dynamic-table.
 *
 * STATUS (2026-04-26): kept alive for two consumers via ResizableDynamicTable
 * (ProductionIncidentsWidget, QADefectsWidget). All other surfaces have
 * migrated to the canonical JiraTable in @/components/shared/JiraTable.
 * Treat this wrapper as legacy — do NOT add new consumers. The two dashboard
 * widgets will migrate to JiraTable in a follow-up pass.
 *
 * Row-height and typography are LOCKED to CLAUDE.md §4 (36px row max,
 * 8x12 cell padding, uppercase headers, 0.75px divider, no shadow).
 * Callers cannot override these through the wrapper; override requests go
 * to the design system owner, not through props.
 */
import AkDynamicTable from '@atlaskit/dynamic-table';
import { type ReactNode } from 'react';

export type DynamicTableSortKey = string;
export type DynamicTableSortOrder = 'ASC' | 'DESC';

export interface DynamicTableHead {
  cells: Array<{
    key: string;
    content: ReactNode;
    isSortable?: boolean;
    width?: number;
    shouldTruncate?: boolean;
  }>;
}

export interface DynamicTableRow {
  key: string;
  cells: Array<{ key: string; content: ReactNode }>;
  onClick?: () => void;
  testId?: string;
}

export interface DynamicTableProps {
  head: DynamicTableHead;
  rows: DynamicTableRow[];
  /** Empty state — rendered when rows is empty. */
  emptyView?: ReactNode;
  /** Loading state — shows skeleton rows. */
  isLoading?: boolean;
  /** Rows per page — 0 disables pagination. */
  rowsPerPage?: number;
  /** Default page (1-indexed). */
  defaultPage?: number;
  /** Default sort key + order. */
  defaultSortKey?: DynamicTableSortKey;
  defaultSortOrder?: DynamicTableSortOrder;
  onSort?: (args: { key: DynamicTableSortKey; sortOrder: DynamicTableSortOrder }) => void;
  onSetPage?: (page: number) => void;
  testId?: string;
  'aria-label'?: string;
}

export function DynamicTable({
  head,
  rows,
  emptyView,
  isLoading,
  rowsPerPage,
  defaultPage,
  defaultSortKey,
  defaultSortOrder,
  onSort,
  onSetPage,
  testId,
  ...rest
}: DynamicTableProps) {
  // Normalize rowsPerPage — wrapper contract says "0 disables pagination",
  // but @atlaskit/dynamic-table treats rowsPerPage=0 as "slice(0, 0)" and
  // renders an empty table. Convert 0 → undefined so the contract holds.
  const normalizedRowsPerPage =
    rowsPerPage === 0 ? undefined : rowsPerPage;

  return (
    <AkDynamicTable
      head={head}
      rows={rows}
      emptyView={emptyView as React.ReactElement | undefined}
      isLoading={isLoading}
      rowsPerPage={normalizedRowsPerPage}
      defaultPage={defaultPage}
      defaultSortKey={defaultSortKey}
      defaultSortOrder={defaultSortOrder}
      onSort={onSort}
      onSetPage={onSetPage}
      testId={testId}
      label={rest['aria-label']}
    />
  );
}
