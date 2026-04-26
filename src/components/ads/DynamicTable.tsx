// @ts-nocheck
/**
 * DynamicTable — Catalyst wrapper over @atlaskit/dynamic-table.
 *
 * Re-exports the stateful Atlaskit DynamicTable plus its key types under
 * Catalyst-friendly names. The package was briefly marked as retired in
 * vite.config.ts, but several dashboard widgets (ResizableDynamicTable,
 * ProductionIncidentsWidget, QADefectsWidget, ThemeIssueList, ThemeCard)
 * still consume it through the ADS barrel — so the wrapper stays.
 */
import AkDynamicTable from '@atlaskit/dynamic-table';
import type {
  StatefulProps,
  HeadType,
  RowType,
  SortOrderType,
} from '@atlaskit/dynamic-table/types';

export const DynamicTable = AkDynamicTable;

export type DynamicTableProps = StatefulProps;
export type DynamicTableHead = HeadType;
export type DynamicTableRow = RowType;
export type DynamicTableSortKey = string;
export type DynamicTableSortOrder = SortOrderType;
