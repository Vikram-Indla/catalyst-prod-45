/**
 * Module 3C-2: Export File Generation Utilities
 */

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { ExportFormat } from '../types/batch-export';

export interface GeneratedFile {
  name: string;
  size: number;
  blob: Blob;
  url?: string;
}

export async function generateExportFile(
  data: Record<string, unknown>[],
  fields: string[],
  format: ExportFormat
): Promise<GeneratedFile> {
  const timestamp = new Date().toISOString().split('T')[0];

  switch (format) {
    case 'csv':
      return generateCSV(data, fields, timestamp);
    case 'xlsx':
      return generateExcel(data, fields, timestamp);
    case 'json':
      return generateJSON(data, timestamp);
    case 'pdf':
      return generatePDF(data, fields, timestamp);
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

function generateCSV(
  data: Record<string, unknown>[],
  fields: string[],
  timestamp: string
): GeneratedFile {
  // Create human-readable headers
  const headerLabels = fields.map(f => 
    f.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  );
  const headers = headerLabels.join(',');
  
  const rows = data.map(row =>
    fields.map(f => {
      const val = row[f] ?? '';
      const strVal = String(val);
      // Escape quotes and wrap in quotes if contains comma or quotes
      if (strVal.includes(',') || strVal.includes('"') || strVal.includes('\n')) {
        return `"${strVal.replace(/"/g, '""')}"`;
      }
      return strVal;
    }).join(',')
  );
  
  const csv = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

  return {
    name: `test-cases-export-${timestamp}.csv`,
    size: blob.size,
    blob,
  };
}

function generateExcel(
  data: Record<string, unknown>[],
  fields: string[],
  timestamp: string
): GeneratedFile {
  // Filter data to only include selected fields
  const filteredData = data.map(row => {
    const filtered: Record<string, unknown> = {};
    fields.forEach(f => {
      filtered[f] = row[f] ?? '';
    });
    return filtered;
  });

  const ws = XLSX.utils.json_to_sheet(filteredData, { header: fields });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Test Cases');
  
  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  return {
    name: `test-cases-export-${timestamp}.xlsx`,
    size: blob.size,
    blob,
  };
}

function generateJSON(
  data: Record<string, unknown>[],
  timestamp: string
): GeneratedFile {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });

  return {
    name: `test-cases-export-${timestamp}.json`,
    size: blob.size,
    blob,
  };
}

function generatePDF(
  data: Record<string, unknown>[],
  fields: string[],
  timestamp: string
): GeneratedFile {
  const doc = new jsPDF();

  // Title
  doc.setFontSize(16);
  doc.text('Test Cases Export', 14, 20);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
  doc.text(`Total Records: ${data.length}`, 14, 34);

  // Create human-readable headers
  const headerLabels = fields.map(f =>
    f.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  );

  // Table data
  const tableBody = data.map(row =>
    fields.map(f => {
      const val = row[f];
      if (val === null || val === undefined) return '';
      if (typeof val === 'object') return JSON.stringify(val);
      return String(val);
    })
  );

  // Use autoTable plugin
  (doc as unknown as { autoTable: (options: unknown) => void }).autoTable({
    head: [headerLabels],
    body: tableBody,
    startY: 42,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [59, 130, 246] }, // Primary blue
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  const blob = doc.output('blob');

  return {
    name: `test-cases-export-${timestamp}.pdf`,
    size: blob.size,
    blob,
  };
}
