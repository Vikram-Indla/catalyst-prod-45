// @ts-nocheck
/**
 * DynamicTable — Catalyst wrapper over @atlaskit/dynamic-table.
 * Re-exports the stateful Atlaskit DynamicTable for use via the ADS barrel.
 */
import AkDynamicTable from '@atlaskit/dynamic-table';

export const DynamicTable = AkDynamicTable;

export type DynamicTableProps = any;
export type DynamicTableHead = any;
export type DynamicTableRow = any;
export type DynamicTableSortKey = string;
export type DynamicTableSortOrder = 'ASC' | 'DESC';
