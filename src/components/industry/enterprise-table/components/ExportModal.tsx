// ═══════════════════════════════════════════════════════════════════════════
// CATALYST ENTERPRISE TABLE — EXPORT MODAL
// Modal for exporting table data in various formats
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useCallback } from 'react';
import { Download, FileSpreadsheet, FileJson, FileText, File, X, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { CatalystColumn } from '../types';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ExportFormat = 'csv' | 'excel' | 'json' | 'pdf';

interface ExportModalProps<T> {
  isOpen: boolean;
  onClose: () => void;
  data: T[];
  columns: CatalystColumn<T>[];
  selectedRowIds?: string[];
  formats?: ExportFormat[];
  onExport: (format: ExportFormat, options: ExportOptions) => Promise<void>;
  title?: string;
}

interface ExportOptions {
  format: ExportFormat;
  columns: string[];
  includeHeaders: boolean;
  selectedOnly: boolean;
}

interface FormatOption {
  id: ExportFormat;
  label: string;
  description: string;
  icon: React.ReactNode;
}

// ─── Format Options ─────────────────────────────────────────────────────────

const FORMAT_OPTIONS: FormatOption[] = [
  {
    id: 'csv',
    label: 'CSV',
    description: 'Comma-separated values, opens in Excel/Sheets',
    icon: <FileText className="h-5 w-5" />,
  },
  {
    id: 'excel',
    label: 'Excel',
    description: 'Native Excel format with formatting',
    icon: <FileSpreadsheet className="h-5 w-5" />,
  },
  {
    id: 'json',
    label: 'JSON',
    description: 'Structured data format for developers',
    icon: <FileJson className="h-5 w-5" />,
  },
  {
    id: 'pdf',
    label: 'PDF',
    description: 'Print-ready document format',
    icon: <File className="h-5 w-5" />,
  },
];

// ─── Component ──────────────────────────────────────────────────────────────

export function ExportModal<T extends { id: string }>({
  isOpen,
  onClose,
  data,
  columns,
  selectedRowIds = [],
  formats = ['csv', 'excel', 'json'],
  onExport,
  title = 'Export Data',
}: ExportModalProps<T>) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>(formats[0]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    columns.map(c => c.id)
  );
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [selectedOnly, setSelectedOnly] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Available formats
  const availableFormats = FORMAT_OPTIONS.filter(f => formats.includes(f.id));

  // Toggle column selection
  const toggleColumn = (columnId: string) => {
    setSelectedColumns(prev =>
      prev.includes(columnId)
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    );
  };

  // Select all columns
  const selectAllColumns = () => {
    setSelectedColumns(columns.map(c => c.id));
  };

  // Deselect all columns
  const deselectAllColumns = () => {
    setSelectedColumns([]);
  };

  // Handle export
  const handleExport = useCallback(async () => {
    if (selectedColumns.length === 0) return;

    setIsExporting(true);
    try {
      await onExport(selectedFormat, {
        format: selectedFormat,
        columns: selectedColumns,
        includeHeaders,
        selectedOnly,
      });
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  }, [selectedFormat, selectedColumns, includeHeaders, selectedOnly, onExport, onClose]);

  // Get column label
  const getColumnLabel = (column: CatalystColumn<T>): string => {
    if (typeof column.header === 'string') return column.header;
    return column.id;
  };

  // Calculate row count for export
  const exportRowCount = selectedOnly && selectedRowIds.length > 0
    ? selectedRowIds.length
    : data.length;

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Export {exportRowCount} rows to your preferred format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Format</Label>
            <RadioGroup
              value={selectedFormat}
              onValueChange={v => setSelectedFormat(v as ExportFormat)}
              className="grid grid-cols-2 gap-2"
            >
              {availableFormats.map(format => (
                <Label
                  key={format.id}
                  htmlFor={`format-${format.id}`}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border cursor-pointer',
                    'hover:bg-muted/50 transition-colors',
                    selectedFormat === format.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border'
                  )}
                >
                  <RadioGroupItem value={format.id} id={`format-${format.id}`} />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      {format.icon}
                      <span className="font-medium">{format.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format.description}
                    </p>
                  </div>
                </Label>
              ))}
            </RadioGroup>
          </div>

          {/* Column selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Columns ({selectedColumns.length}/{columns.length})
              </Label>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAllColumns}
                  className="h-7 px-2 text-xs"
                >
                  All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={deselectAllColumns}
                  className="h-7 px-2 text-xs"
                >
                  None
                </Button>
              </div>
            </div>
            <ScrollArea className="h-[160px] rounded-md border p-3">
              <div className="space-y-2">
                {columns.map(column => (
                  <div key={column.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`col-${column.id}`}
                      checked={selectedColumns.includes(column.id)}
                      onCheckedChange={() => toggleColumn(column.id)}
                    />
                    <label
                      htmlFor={`col-${column.id}`}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {getColumnLabel(column)}
                    </label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Options</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="include-headers"
                  checked={includeHeaders}
                  onCheckedChange={v => setIncludeHeaders(!!v)}
                />
                <label htmlFor="include-headers" className="text-sm cursor-pointer">
                  Include column headers
                </label>
              </div>
              {selectedRowIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="selected-only"
                    checked={selectedOnly}
                    onCheckedChange={v => setSelectedOnly(!!v)}
                  />
                  <label htmlFor="selected-only" className="text-sm cursor-pointer">
                    Export selected rows only ({selectedRowIds.length})
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={selectedColumns.length === 0 || isExporting}
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export {selectedFormat.toUpperCase()}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Export Utility Functions ───────────────────────────────────────────────

export function downloadFile(content: string, filename: string, mimeType: string) {
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

export function exportToCSV<T>(
  data: T[],
  columns: CatalystColumn<T>[],
  includeHeaders: boolean = true
): string {
  const rows: string[][] = [];

  // Add headers
  if (includeHeaders) {
    rows.push(columns.map(col => {
      if (typeof col.header === 'string') return col.header;
      return col.id;
    }));
  }

  // Add data rows
  data.forEach(row => {
    const values = columns.map(col => {
      const value = typeof col.accessor === 'function'
        ? col.accessor(row)
        : row[col.accessor as keyof T];
      
      // Handle special types
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      
      // Escape CSV special characters
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    rows.push(values);
  });

  return rows.map(row => row.join(',')).join('\n');
}

export function exportToJSON<T>(
  data: T[],
  columns: CatalystColumn<T>[],
  pretty: boolean = true
): string {
  const exportData = data.map(row => {
    const obj: Record<string, any> = {};
    columns.forEach(col => {
      const key = typeof col.header === 'string' ? col.header : col.id;
      obj[key] = typeof col.accessor === 'function'
        ? col.accessor(row)
        : row[col.accessor as keyof T];
    });
    return obj;
  });

  return JSON.stringify(exportData, null, pretty ? 2 : 0);
}
