/**
 * Import/Export Utilities for Test Management
 */

import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Types
export interface ExportOptions {
  format: 'csv' | 'xlsx' | 'json' | 'pdf';
  filename?: string;
  includeAttachments?: boolean;
  includeHistory?: boolean;
}

export interface ImportOptions {
  format: 'csv' | 'xlsx' | 'json';
  duplicateHandling: 'skip' | 'update' | 'create_new';
  validateOnly?: boolean;
}

export interface ImportResult {
  success: boolean;
  totalRows: number;
  imported: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
  data?: any[];
}

export interface TestCaseExportData {
  id?: string;
  key?: string;
  title: string;
  description?: string;
  preconditions?: string;
  priority: string;
  type: string;
  status: string;
  folderPath?: string;
  tags?: string;
  steps?: Array<{
    stepNumber: number;
    action: string;
    expectedResult: string;
    testData?: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

// CSV Export
export function exportToCSV(data: any[], filename: string): void {
  const csv = Papa.unparse(data, {
    quotes: true,
    quoteChar: '"',
    escapeChar: '"',
    header: true,
  });

  downloadFile(csv, `${filename}.csv`, 'text/csv;charset=utf-8;');
}

// Excel Export
export function exportToExcel(
  data: any[],
  filename: string,
  sheetName = 'Sheet1'
): void {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Auto-size columns
  const colWidths = Object.keys(data[0] || {}).map((key) => {
    const maxLength = Math.max(
      key.length,
      ...data.map((row) => String(row[key] || '').length)
    );
    return { wch: Math.min(maxLength + 2, 50) };
  });
  worksheet['!cols'] = colWidths;

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

// Excel Export with multiple sheets
export function exportToExcelMultiSheet(
  sheets: Array<{ name: string; data: any[] }>,
  filename: string
): void {
  const workbook = XLSX.utils.book_new();

  sheets.forEach(({ name, data }) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, name);
  });

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

// JSON Export
export function exportToJSON(data: any, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  downloadFile(json, `${filename}.json`, 'application/json;charset=utf-8;');
}

// PDF Export
export function exportToPDF(
  data: any[],
  filename: string,
  options: {
    title?: string;
    orientation?: 'portrait' | 'landscape';
    columns?: string[];
  } = {}
): void {
  const { title = 'Export', orientation = 'portrait', columns } = options;
  const doc = new jsPDF(orientation);

  // Add title
  doc.setFontSize(16);
  doc.text(title, 14, 20);

  // Prepare table data
  const headers = columns || Object.keys(data[0] || {});
  const rows = data.map((row) => headers.map((h) => String(row[h] || '')));

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 30,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 130, 246] },
  });

  doc.save(`${filename}.pdf`);
}

// Generic download helper
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// CSV Import
export async function importFromCSV(file: File): Promise<ImportResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, '_'),
      complete: (results) => {
        const errors = results.errors.map((e, i) => ({
          row: e.row || i,
          message: e.message,
        }));

        resolve({
          success: errors.length === 0,
          totalRows: results.data.length,
          imported: results.data.length - errors.length,
          skipped: 0,
          errors,
          data: results.data,
        });
      },
      error: (error) => {
        resolve({
          success: false,
          totalRows: 0,
          imported: 0,
          skipped: 0,
          errors: [{ row: 0, message: error.message }],
        });
      },
    });
  });
}

// Excel Import
export async function importFromExcel(file: File): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, {
          raw: false,
          defval: '',
        });

        // Normalize headers
        const normalizedData = jsonData.map((row: any) => {
          const normalized: any = {};
          Object.keys(row).forEach((key) => {
            const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, '_');
            normalized[normalizedKey] = row[key];
          });
          return normalized;
        });

        resolve({
          success: true,
          totalRows: normalizedData.length,
          imported: normalizedData.length,
          skipped: 0,
          errors: [],
          data: normalizedData,
        });
      } catch (error) {
        resolve({
          success: false,
          totalRows: 0,
          imported: 0,
          skipped: 0,
          errors: [{ row: 0, message: (error as Error).message }],
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        totalRows: 0,
        imported: 0,
        skipped: 0,
        errors: [{ row: 0, message: 'Failed to read file' }],
      });
    };

    reader.readAsArrayBuffer(file);
  });
}

// JSON Import
export async function importFromJSON(file: File): Promise<ImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        const items = Array.isArray(data) ? data : [data];

        resolve({
          success: true,
          totalRows: items.length,
          imported: items.length,
          skipped: 0,
          errors: [],
          data: items,
        });
      } catch (error) {
        resolve({
          success: false,
          totalRows: 0,
          imported: 0,
          skipped: 0,
          errors: [{ row: 0, message: 'Invalid JSON format' }],
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        totalRows: 0,
        imported: 0,
        skipped: 0,
        errors: [{ row: 0, message: 'Failed to read file' }],
      });
    };

    reader.readAsText(file);
  });
}

// Unified import function
export async function importFile(
  file: File,
  options: ImportOptions
): Promise<ImportResult> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  let result: ImportResult;

  switch (extension) {
    case 'csv':
      result = await importFromCSV(file);
      break;
    case 'xlsx':
    case 'xls':
      result = await importFromExcel(file);
      break;
    case 'json':
      result = await importFromJSON(file);
      break;
    default:
      return {
        success: false,
        totalRows: 0,
        imported: 0,
        skipped: 0,
        errors: [{ row: 0, message: `Unsupported file format: ${extension}` }],
      };
  }

  return result;
}

// Test case specific export
export function exportTestCases(
  cases: TestCaseExportData[],
  options: ExportOptions
): void {
  const filename = options.filename || `test_cases_${Date.now()}`;

  // Flatten steps for tabular formats
  const flattenedCases = cases.map((tc) => ({
    key: tc.key || '',
    title: tc.title,
    description: tc.description || '',
    preconditions: tc.preconditions || '',
    priority: tc.priority,
    type: tc.type,
    status: tc.status,
    folder_path: tc.folderPath || '',
    tags: tc.tags || '',
    steps_count: tc.steps?.length || 0,
    created_at: tc.createdAt || '',
    updated_at: tc.updatedAt || '',
  }));

  switch (options.format) {
    case 'csv':
      exportToCSV(flattenedCases, filename);
      break;
    case 'xlsx':
      // For Excel, include steps as separate sheet
      if (cases.some((c) => c.steps?.length)) {
        const stepsData = cases.flatMap((tc) =>
          (tc.steps || []).map((step) => ({
            test_case_key: tc.key,
            step_number: step.stepNumber,
            action: step.action,
            expected_result: step.expectedResult,
            test_data: step.testData || '',
          }))
        );
        exportToExcelMultiSheet(
          [
            { name: 'Test Cases', data: flattenedCases },
            { name: 'Steps', data: stepsData },
          ],
          filename
        );
      } else {
        exportToExcel(flattenedCases, filename);
      }
      break;
    case 'json':
      exportToJSON(cases, filename);
      break;
    case 'pdf':
      exportToPDF(flattenedCases, filename, {
        title: 'Test Cases Export',
        orientation: 'landscape',
      });
      break;
  }
}

// Validation helpers
export function validateTestCaseImport(data: any[]): ImportResult {
  const errors: Array<{ row: number; message: string }> = [];
  const requiredFields = ['title'];

  data.forEach((row, index) => {
    requiredFields.forEach((field) => {
      if (!row[field]?.trim()) {
        errors.push({ row: index + 1, message: `Missing required field: ${field}` });
      }
    });

    // Validate priority if present
    const validPriorities = ['critical', 'high', 'medium', 'low'];
    if (row.priority && !validPriorities.includes(row.priority.toLowerCase())) {
      errors.push({
        row: index + 1,
        message: `Invalid priority: ${row.priority}. Must be one of: ${validPriorities.join(', ')}`,
      });
    }

    // Validate type if present
    const validTypes = ['functional', 'regression', 'smoke', 'integration', 'performance', 'security', 'usability', 'other'];
    if (row.type && !validTypes.includes(row.type.toLowerCase())) {
      errors.push({
        row: index + 1,
        message: `Invalid type: ${row.type}`,
      });
    }
  });

  return {
    success: errors.length === 0,
    totalRows: data.length,
    imported: data.length - errors.length,
    skipped: errors.length,
    errors,
    data,
  };
}

// Template for test case import
export function getImportTemplate(): any[] {
  return [
    {
      title: 'Example Test Case',
      description: 'Description of the test case',
      preconditions: 'Preconditions required',
      priority: 'high',
      type: 'functional',
      status: 'draft',
      folder_path: '/Folder/Subfolder',
      tags: 'tag1, tag2',
    },
  ];
}

export function downloadImportTemplate(): void {
  exportToExcel(getImportTemplate(), 'test_case_import_template', 'Template');
}
