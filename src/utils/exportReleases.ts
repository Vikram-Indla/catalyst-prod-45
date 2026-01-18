/**
 * Export Releases Utility
 * Handles CSV and Excel export for releases data
 */

import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface ReleaseExportData {
  id: string;
  name: string;
  version?: string;
  status: string;
  target_date?: string | null;
  release_date?: string | null;
  progress?: number;
  owner?: {
    full_name?: string;
  } | null;
}

interface ExportRow {
  Name: string;
  Version: string;
  Status: string;
  'Start Date': string;
  'End Date': string;
  Progress: string;
  Owner: string;
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
    planned: 'Planned',
    active: 'Active',
    in_progress: 'In Progress',
    testing: 'Testing',
    uat: 'UAT',
    staging: 'Staging',
    released: 'Released',
    cancelled: 'Cancelled',
  };
  return statusMap[status] || status;
}

function transformToExportRows(releases: ReleaseExportData[]): ExportRow[] {
  return releases.map((r) => ({
    Name: r.name,
    Version: r.version || 'v1.0',
    Status: formatStatus(r.status),
    'Start Date': formatDate(r.target_date),
    'End Date': formatDate(r.release_date),
    Progress: `${r.progress ?? 0}%`,
    Owner: r.owner?.full_name || '-',
  }));
}

export async function exportReleasesAsCSV(releases: ReleaseExportData[]): Promise<void> {
  const rows = transformToExportRows(releases);
  const csv = Papa.unparse(rows);
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `releases_export_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportReleasesAsExcel(releases: ReleaseExportData[]): Promise<void> {
  const rows = transformToExportRows(releases);
  
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Releases');
  
  // Auto-size columns
  const colWidths = [
    { wch: 30 }, // Name
    { wch: 12 }, // Version
    { wch: 15 }, // Status
    { wch: 12 }, // Start Date
    { wch: 12 }, // End Date
    { wch: 10 }, // Progress
    { wch: 20 }, // Owner
  ];
  worksheet['!cols'] = colWidths;
  
  XLSX.writeFile(workbook, `releases_export_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export async function exportReleases(
  releases: ReleaseExportData[],
  format: 'csv' | 'xlsx'
): Promise<void> {
  if (format === 'csv') {
    return exportReleasesAsCSV(releases);
  } else {
    return exportReleasesAsExcel(releases);
  }
}
