/**
 * ReportTable — Wrapper around CatalystTable for reports
 * 
 * Maintains backward compatibility with existing report pages
 * while using the unified CatalystTable component underneath.
 */

import { CatalystTable, type CatalystColumnDef } from '@/components/ui/catalyst-table';
import type { ReactNode } from 'react';

// Re-export column type for backward compatibility
export interface ReportColumn<T> {
  key: string;
  label: string;
  minWidth?: number;
  width?: number;
  canGrow?: boolean;
  centered?: boolean;
  render: (item: T) => ReactNode;
}

// Default min widths for common columns
const DEFAULT_MIN_WIDTHS: Record<string, number> = {
  key: 100,
  summary: 280,
  severity: 70,
  sev: 70,
  priority: 80,
  status: 120,
  assignee: 140,
  age: 70,
  slaState: 100,
  release: 100,
  ageBucket: 90,
  major: 60,
  progress: 80,
  approvers: 100,
  lastAction: 120,
  outcome: 90,
  decidedBy: 130,
  decisionTime: 100,
  decidedAt: 110,
  converted: 85,
  targetType: 90,
  linkedItem: 100,
  convertedAt: 100,
  timeToConvert: 80,
  triageFlag: 80,
  breachAmount: 110,
};

function getColumnMinWidth<T>(col: ReportColumn<T>): number {
  if (col.minWidth) return col.minWidth;
  if (col.width) return col.width;
  return DEFAULT_MIN_WIDTHS[col.key] || 80;
}

interface ReportTableProps<T> {
  data: T[];
  columns: ReportColumn<T>[];
  isLoading?: boolean;
  getRowId: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
}

export function ReportTable<T>({ 
  data, 
  columns, 
  isLoading, 
  getRowId, 
  onRowClick,
  emptyMessage = "No data found"
}: ReportTableProps<T>) {
  // Transform ReportColumn to CatalystColumnDef
  const catalystColumns: CatalystColumnDef<T>[] = columns.map(col => ({
    key: col.key,
    label: col.label,
    minWidth: getColumnMinWidth(col),
    canGrow: col.canGrow,
    align: col.centered ? 'center' : 'left',
    render: col.render,
  }));

  return (
    <CatalystTable
      data={data}
      columns={catalystColumns}
      getRowId={getRowId}
      onRowClick={onRowClick}
      isLoading={isLoading}
      emptyMessage={emptyMessage}
    />
  );
}
