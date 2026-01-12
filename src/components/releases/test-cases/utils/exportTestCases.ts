/**
 * Export utilities for Test Cases
 * Supports CSV, JSON, and XLSX formats
 */

import { TestCase } from '@/data/testCasesData';
import * as XLSX from 'xlsx';

export type ExportFormat = 'csv' | 'json' | 'xlsx';

interface ExportOptions {
  format: ExportFormat;
  selectedFields: string[];
  filename?: string;
}

const fieldLabels: Record<string, string> = {
  id: 'Test Case ID',
  title: 'Title',
  description: 'Description',
  type: 'Type',
  priority: 'Priority',
  status: 'Status',
  assignee: 'Assignee',
  folder: 'Folder',
  tags: 'Tags',
  release: 'Release',
  lastRun: 'Last Run Status',
  stepsCount: 'Steps Count',
  createdAt: 'Created Date',
  updatedAt: 'Updated Date',
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function testCaseToRow(testCase: TestCase, fields: string[]): Record<string, string> {
  const row: Record<string, string> = {};
  const tcRecord = testCase as unknown as Record<string, unknown>;
  
  for (const field of fields) {
    const label = fieldLabels[field] || field;
    const value = tcRecord[field];
    row[label] = formatValue(value);
  }
  
  return row;
}

export function exportToCSV(testCases: TestCase[], fields: string[]): string {
  const headers = fields.map(f => fieldLabels[f] || f);
  const rows = testCases.map(tc => testCaseToRow(tc, fields));
  
  // Escape CSV values
  const escapeCSV = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };
  
  const csvRows = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => headers.map(h => escapeCSV(row[h] || '')).join(','))
  ];
  
  return csvRows.join('\n');
}

export function exportToJSON(testCases: TestCase[], fields: string[]): string {
  const data = testCases.map(tc => {
    const filtered: Record<string, unknown> = {};
    const tcRecord = tc as unknown as Record<string, unknown>;
    for (const field of fields) {
      filtered[field] = tcRecord[field];
    }
    return filtered;
  });
  
  return JSON.stringify(data, null, 2);
}

export function exportToXLSX(testCases: TestCase[], fields: string[]): Blob {
  const headers = fields.map(f => fieldLabels[f] || f);
  const rows = testCases.map(tc => testCaseToRow(tc, fields));
  
  const data = [
    headers,
    ...rows.map(row => headers.map(h => row[h] || ''))
  ];
  
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Test Cases');
  
  // Auto-size columns
  const colWidths = headers.map((h, i) => {
    const maxLen = Math.max(
      h.length,
      ...rows.map(r => (r[h] || '').length)
    );
    return { wch: Math.min(50, Math.max(10, maxLen + 2)) };
  });
  ws['!cols'] = colWidths;
  
  const xlsxBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([xlsxBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function downloadFile(content: string | Blob, filename: string, mimeType?: string) {
  const blob = content instanceof Blob 
    ? content 
    : new Blob([content], { type: mimeType || 'text/plain' });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportTestCases(
  testCases: TestCase[],
  options: ExportOptions
): void {
  const { format, selectedFields, filename } = options;
  const timestamp = new Date().toISOString().split('T')[0];
  const baseFilename = filename || `test-cases-export-${timestamp}`;
  
  switch (format) {
    case 'csv': {
      const csv = exportToCSV(testCases, selectedFields);
      downloadFile(csv, `${baseFilename}.csv`, 'text/csv');
      break;
    }
    case 'json': {
      const json = exportToJSON(testCases, selectedFields);
      downloadFile(json, `${baseFilename}.json`, 'application/json');
      break;
    }
    case 'xlsx': {
      const xlsx = exportToXLSX(testCases, selectedFields);
      downloadFile(xlsx, `${baseFilename}.xlsx`);
      break;
    }
  }
}
