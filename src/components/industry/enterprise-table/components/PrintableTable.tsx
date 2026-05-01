// ═══════════════════════════════════════════════════════════════════════════
// CATALYST ENTERPRISE TABLE — PRINTABLE TABLE
// Print-optimized version of the table with proper page breaks
// ═══════════════════════════════════════════════════════════════════════════

import React, { useRef, useCallback } from 'react';
import { Printer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { CatalystColumn } from '../types';

// ─── Types ──────────────────────────────────────────────────────────────────

interface PrintableTableProps<T> {
  data: T[];
  columns: CatalystColumn<T>[];
  title?: string;
  subtitle?: string;
  showFooter?: boolean;
  footerText?: string;
  pageSize?: 'A4' | 'Letter' | 'Legal';
  orientation?: 'portrait' | 'landscape';
  className?: string;
}

interface PrintButtonProps {
  onPrint: () => void;
  disabled?: boolean;
  className?: string;
}

// ─── Print Button ───────────────────────────────────────────────────────────

export function PrintButton({ onPrint, disabled, className }: PrintButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onPrint}
      disabled={disabled}
      className={cn('gap-2', className)}
    >
      <Printer className="h-4 w-4" />
      Print
    </Button>
  );
}

// ─── Printable Table ────────────────────────────────────────────────────────

export function PrintableTable<T extends { id: string }>({
  data,
  columns,
  title,
  subtitle,
  showFooter = true,
  footerText,
  pageSize = 'A4',
  orientation = 'portrait',
  className,
}: PrintableTableProps<T>) {
  const printRef = useRef<HTMLDivElement>(null);

  // Get cell value from row
  const getCellValue = (row: T, column: CatalystColumn<T>): any => {
    if (typeof column.accessor === 'function') {
      return column.accessor(row);
    }
    return row[column.accessor as keyof T];
  };

  // Format cell value for display
  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (value instanceof Date) return value.toLocaleDateString();
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  // Get column header text
  const getHeaderText = (column: CatalystColumn<T>): string => {
    if (typeof column.header === 'string') return column.header;
    return column.id;
  };

  // Handle print
  const handlePrint = useCallback(() => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title || 'Table Export'}</title>
          <style>
            @page {
              size: ${pageSize} ${orientation};
              margin: 1cm;
            }
            
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-size: 10pt;
              line-height: 1.4;
              color: var(--ds-surface-raised, #1a1a1a);
            }
            
            .print-header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 2px solid #e5e5e5;
              padding-bottom: 16px;
            }
            
            .print-title {
              font-size: 16pt;
              font-weight: 600;
              margin-bottom: 4px;
            }
            
            .print-subtitle {
              font-size: 10pt;
              color: #666;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              page-break-inside: auto;
            }
            
            thead {
              display: table-header-group;
            }
            
            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
            
            th, td {
              border: 1px solid #d4d4d4;
              padding: 6px 8px;
              text-align: left;
              vertical-align: top;
            }
            
            th {
              background: #f5f5f5;
              font-weight: 600;
              font-size: 9pt;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            
            tr:nth-child(even) td {
              background: #fafafa;
            }
            
            .text-right {
              text-align: right;
            }
            
            .text-center {
              text-align: center;
            }
            
            .print-footer {
              margin-top: 20px;
              padding-top: 12px;
              border-top: 1px solid #e5e5e5;
              font-size: 9pt;
              color: #666;
              display: flex;
              justify-content: space-between;
            }
            
            @media print {
              body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  }, [title, pageSize, orientation]);

  return (
    <>
      {/* Print button */}
      <PrintButton onPrint={handlePrint} />

      {/* Hidden printable content */}
      <div
        ref={printRef}
        className={cn('hidden print:block', className)}
        aria-hidden="true"
      >
        {/* Header */}
        {(title || subtitle) && (
          <div className="print-header">
            {title && <h1 className="print-title">{title}</h1>}
            {subtitle && <p className="print-subtitle">{subtitle}</p>}
          </div>
        )}

        {/* Table */}
        <table>
          <thead>
            <tr>
              {columns.map(column => (
                <th
                  key={column.id}
                  className={cn(
                    column.align === 'right' && 'text-right',
                    column.align === 'center' && 'text-center'
                  )}
                  style={{ 
                    width: typeof column.width === 'number' 
                      ? `${column.width}px` 
                      : column.width 
                  }}
                >
                  {getHeaderText(column)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map(row => (
              <tr key={row.id}>
                {columns.map(column => {
                  const value = getCellValue(row, column);
                  return (
                    <td
                      key={column.id}
                      className={cn(
                        column.align === 'right' && 'text-right',
                        column.align === 'center' && 'text-center'
                      )}
                    >
                      {formatCellValue(value)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer */}
        {showFooter && (
          <div className="print-footer">
            <span>{footerText || `Total: ${data.length} rows`}</span>
            <span>Printed on {new Date().toLocaleString()}</span>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Print Preview Modal ────────────────────────────────────────────────────

interface PrintPreviewProps<T> {
  isOpen: boolean;
  onClose: () => void;
  data: T[];
  columns: CatalystColumn<T>[];
  title?: string;
}

export function PrintPreview<T extends { id: string }>({
  isOpen,
  onClose,
  data,
  columns,
  title,
}: PrintPreviewProps<T>) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-8">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
        {/* Preview header */}
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <h2 className="font-semibold">Print Preview</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <PrintableTable
              data={data}
              columns={columns}
              title={title}
            />
          </div>
        </div>

        {/* Preview content */}
        <div className="p-8 bg-gray-100">
          <div className="bg-white shadow-lg mx-auto max-w-[210mm] p-8">
            {title && (
              <h1 className="text-xl font-semibold text-center mb-4">{title}</h1>
            )}
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  {columns.map(column => (
                    <th
                      key={column.id}
                      className="border border-gray-300 bg-gray-100 p-2 text-left font-semibold"
                    >
                      {typeof column.header === 'string' ? column.header : column.id}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 20).map(row => (
                  <tr key={row.id}>
                    {columns.map(column => {
                      const value = typeof column.accessor === 'function'
                        ? column.accessor(row)
                        : row[column.accessor as keyof T];
                      return (
                        <td key={column.id} className="border border-gray-300 p-2">
                          {value === null || value === undefined ? '—' : String(value)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {data.length > 20 && (
              <p className="text-center text-gray-500 mt-4 text-sm">
                ... and {data.length - 20} more rows
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
