/**
 * Export Test Cycles Utility
 * Handles CSV and Excel export for test cycles data
 */

import Papa from 'papaparse';
const loadXLSX = () => import('xlsx');

export interface TestCycleExportData {
  id: string;
  name: string;
  status: string;
  progress?: number;
  passed?: number;
  failed?: number;
  blocked?: number;
  startDate?: string | null;
  endDate?: string | null;
  environment?: string | null;
}

interface ExportRow {
  'Cycle Name': string;
  Status: string;
  'Progress %': string;
  Passed: number;
  Failed: number;
  Blocked: number;
  'Start Date': string;
  'End Date': string;
  Environment: string;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return '-';
  }
}

function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    draft: 'Draft',
    planned: 'Planned',
    active: 'Active',
    in_progress: 'In Progress',
    paused: 'Paused',
    completed: 'Completed',
  };
  return statusMap[status] || status;
}

function transformToExportRows(cycles: TestCycleExportData[]): ExportRow[] {
  return cycles.map((c) => ({
    'Cycle Name': c.name,
    Status: formatStatus(c.status),
    'Progress %': `${c.progress ?? 0}%`,
    Passed: c.passed ?? 0,
    Failed: c.failed ?? 0,
    Blocked: c.blocked ?? 0,
    'Start Date': formatDate(c.startDate),
    'End Date': formatDate(c.endDate),
    Environment: c.environment || '-',
  }));
}

export async function exportTestCyclesAsCSV(cycles: TestCycleExportData[]): Promise<void> {
  const rows = transformToExportRows(cycles);
  const csv = Papa.unparse(rows);
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `test_cycles_export_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportTestCyclesAsExcel(cycles: TestCycleExportData[]): Promise<void> {
  const XLSX = await loadXLSX();
  const rows = transformToExportRows(cycles);
  
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Test Cycles');
  
  const colWidths = [
    { wch: 30 },
    { wch: 15 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
    { wch: 15 },
  ];
  worksheet['!cols'] = colWidths;
  
  XLSX.writeFile(workbook, `test_cycles_export_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export async function exportTestCycles(
  cycles: TestCycleExportData[],
  format: 'csv' | 'xlsx'
): Promise<void> {
  if (format === 'csv') {
    return exportTestCyclesAsCSV(cycles);
  } else {
    return exportTestCyclesAsExcel(cycles);
  }
}
