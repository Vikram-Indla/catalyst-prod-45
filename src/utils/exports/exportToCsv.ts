/**
 * CSV Export Utility
 * Export data to CSV format using papaparse
 */
import Papa from 'papaparse';
import type { ExportColumn, CsvExportOptions } from './types';

export const exportToCsv = <T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn<T>[],
  options: CsvExportOptions
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

  // Generate CSV using papaparse
  const csv = Papa.unparse(formattedData, {
    columns: columns.map(col => col.header),
  });

  // Create and download file
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const timestamp = options.includeTimestamp !== false 
    ? `-${new Date().toISOString().split('T')[0]}` 
    : '';
  const filename = `${options.filename}${timestamp}.csv`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return filename;
};
