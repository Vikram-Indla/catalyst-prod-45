import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface ImportPreviewProps {
  headers: string[];
  rows: string[][];
  mappedFields: Record<string, string>;
  validationErrors?: Array<{ row: number; field: string; message: string }>;
}

export const ImportPreview: React.FC<ImportPreviewProps> = ({
  headers,
  rows,
  mappedFields,
  validationErrors = [],
}) => {
  const previewRows = rows.slice(0, 10);
  const totalRows = rows.length;
  const validRows = totalRows - validationErrors.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
        <div>
          <h3 className="font-semibold text-foreground">Import Preview</h3>
          <p className="text-sm text-muted-foreground">Showing first 10 of {totalRows} rows</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <span className="text-sm font-medium">{validRows} Valid</span>
          </div>
          {validationErrors.length > 0 && (
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <span className="text-sm font-medium text-destructive">
                {validationErrors.length} Errors
              </span>
            </div>
          )}
        </div>
      </div>

      {validationErrors.length > 0 && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <h4 className="font-medium text-destructive mb-2">Validation Errors</h4>
          <ul className="space-y-1 text-sm">
            {validationErrors.slice(0, 5).map((error, idx) => (
              <li key={idx} className="text-destructive">
                Row {error.row}: {error.field} - {error.message}
              </li>
            ))}
            {validationErrors.length > 5 && (
              <li className="text-muted-foreground">
                ...and {validationErrors.length - 5} more errors
              </li>
            )}
          </ul>
        </div>
      )}

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-96">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                {headers.map((header, idx) => (
                  <TableHead key={idx}>
                    <div className="space-y-1">
                      <div className="font-medium">{header}</div>
                      {mappedFields[header] && (
                        <Badge variant="secondary" className="text-xs">
                          → {mappedFields[header]}
                        </Badge>
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewRows.map((row, rowIdx) => {
                const hasError = validationErrors.some(e => e.row === rowIdx + 1);
                return (
                  <TableRow key={rowIdx} className={hasError ? 'bg-destructive/5' : ''}>
                    <TableCell className="text-muted-foreground">{rowIdx + 1}</TableCell>
                    {row.map((cell, cellIdx) => (
                      <TableCell key={cellIdx}>{cell || '-'}</TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="p-4 bg-brand-gold/10 border border-brand-gold/20 rounded-lg">
        <h4 className="font-medium text-foreground mb-2">Import Summary</h4>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>• {validRows} test cases will be imported</li>
          <li>• {validationErrors.length} rows will be skipped due to errors</li>
          <li>• Required fields will be validated before import</li>
        </ul>
      </div>
    </div>
  );
};
