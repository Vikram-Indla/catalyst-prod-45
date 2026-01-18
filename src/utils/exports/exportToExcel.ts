/**
 * Excel Export Utility
 * Export data to XLSX format
 */
import * as XLSX from 'xlsx';
import type { ExportColumn, ExcelExportOptions } from './types';

export const exportToExcel = <T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn<T>[],
  options: ExcelExportOptions
): string => {
  if (data.length === 0) {
    throw new Error('No data to export');
  }

  // Format data according to columns
  const formattedData = data.map(item => {
    const row: Record<string, any> = {};
    columns.forEach(col => {
      const value = item[col.key];
      row[col.header] = col.formatter ? col.formatter(value) : value;
    });
    return row;
  });

  // Create workbook and worksheet
  const ws = XLSX.utils.json_to_sheet(formattedData);
  const wb = XLSX.utils.book_new();

  // Set column widths based on header length
  ws['!cols'] = columns.map(col => ({
    wch: Math.max(col.header.length + 2, 15)
  }));

  XLSX.utils.book_append_sheet(wb, ws, options.sheetName || 'Data');

  // Add summary sheet if title is provided
  if (options.title) {
    const summaryData = [
      [options.title],
      [''],
      ['Export Date', new Date().toLocaleDateString()],
      ['Total Records', data.length],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    summarySheet['!cols'] = [{ wch: 20 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');
  }

  // Generate filename with optional timestamp
  const timestamp = options.includeTimestamp !== false 
    ? `-${new Date().toISOString().split('T')[0]}` 
    : '';
  const filename = `${options.filename}${timestamp}.xlsx`;

  // Write file
  XLSX.writeFile(wb, filename);

  return filename;
};

/**
 * Export multiple sheets to a single Excel file
 */
export const exportMultiSheetExcel = (
  sheets: Array<{
    name: string;
    data: Record<string, any>[];
    columns: ExportColumn<any>[];
  }>,
  options: ExcelExportOptions
): string => {
  if (sheets.length === 0) {
    throw new Error('No sheets to export');
  }

  const wb = XLSX.utils.book_new();

  sheets.forEach(sheet => {
    const formattedData = sheet.data.map(item => {
      const row: Record<string, any> = {};
      sheet.columns.forEach(col => {
        const value = item[col.key as string];
        row[col.header] = col.formatter ? col.formatter(value) : value;
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(formattedData);
    ws['!cols'] = sheet.columns.map(col => ({
      wch: Math.max(col.header.length + 2, 15)
    }));
    
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.substring(0, 31)); // Excel sheet name limit
  });

  const timestamp = options.includeTimestamp !== false 
    ? `-${new Date().toISOString().split('T')[0]}` 
    : '';
  const filename = `${options.filename}${timestamp}.xlsx`;

  XLSX.writeFile(wb, filename);

  return filename;
};
