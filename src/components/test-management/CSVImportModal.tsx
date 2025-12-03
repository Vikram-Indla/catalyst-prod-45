import React, { useState } from 'react';
import { Upload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useBulkImportDataRows } from '@/hooks/useTestData';
import { useToast } from '@/hooks/use-toast';
import { parseCSV } from '@/lib/exportUtils';
import type { TestParameter } from '@/types/testData.types';

interface CSVImportModalProps {
  testCaseId: string;
  parameters: TestParameter[];
  isOpen: boolean;
  onClose: () => void;
}

export const CSVImportModal: React.FC<CSVImportModalProps> = ({
  testCaseId,
  parameters,
  isOpen,
  onClose,
}) => {
  const { toast } = useToast();
  const importMutation = useBulkImportDataRows();

  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, any>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast({
        title: 'Error',
        description: 'Please select a CSV file',
        variant: 'destructive',
      });
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'File size must be less than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setFile(selectedFile);

    // Parse CSV
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCSV(text);

      if (parsed.length === 0) {
        toast({
          title: 'Error',
          description: 'CSV file is empty',
          variant: 'destructive',
        });
        return;
      }

      const csvHeaders = parsed[0];
      const dataRows = parsed.slice(1).map(row => {
        const rowData: Record<string, any> = {};
        csvHeaders.forEach((header, idx) => {
          rowData[header] = row[idx] || '';
        });
        return rowData;
      });

      // Validate headers match parameters
      const paramNames = parameters.map(p => p.parameter_name);
      const missingParams = paramNames.filter(name => !csvHeaders.includes(name));

      if (missingParams.length > 0) {
        toast({
          title: 'Warning',
          description: `CSV is missing columns: ${missingParams.join(', ')}`,
        });
      }

      setHeaders(csvHeaders);
      setPreviewData(dataRows.slice(0, 10)); // Preview first 10 rows
    };

    reader.readAsText(selectedFile);
  };

  const handleImport = async () => {
    if (!file || previewData.length === 0) {
      toast({
        title: 'Error',
        description: 'No data to import',
        variant: 'destructive',
      });
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        const parsed = parseCSV(text);
        const csvHeaders = parsed[0];
        const allDataRows = parsed.slice(1).map(row => {
          const rowData: Record<string, any> = {};
          
          // Map CSV columns to parameters, with type conversion
          parameters.forEach(param => {
            const csvIndex = csvHeaders.indexOf(param.parameter_name);
            let value = csvIndex >= 0 ? row[csvIndex] : '';

            // Type conversion
            switch (param.parameter_type) {
              case 'number':
                value = value === '' ? 0 : Number(value);
                break;
              case 'boolean':
                value = value.toLowerCase() === 'true' || value === '1';
                break;
              case 'date':
                // Keep as string in ISO format
                break;
              default:
                value = String(value);
            }

            rowData[param.parameter_name] = value;
          });

          return rowData;
        });

        if (allDataRows.length > 1000) {
          toast({
            title: 'Error',
            description: 'Maximum 1000 data rows allowed per import',
            variant: 'destructive',
          });
          return;
        }

        await importMutation.mutateAsync({
          testCaseId,
          rows: allDataRows,
        });

        toast({
          title: 'Success',
          description: `Imported ${allDataRows.length} data rows successfully`,
        });

        onClose();
      };

      reader.readAsText(file);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to import CSV',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Test Data from CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Select CSV File</label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
              <Upload className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              CSV must have headers matching parameter names. Max file size: 5MB, max rows: 1000
            </p>
          </div>

          {previewData.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground">Preview (first 10 rows)</h4>
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        {headers.map((header, idx) => (
                          <TableHead key={idx}>{header}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                          {headers.map((header, colIdx) => (
                            <TableCell key={colIdx}>
                              {String(row[header] ?? '')}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {previewData.length} of {previewData.length} rows shown (full import will process all rows)
              </p>
            </div>
          )}

          <div className="p-4 bg-muted/50 rounded-lg border border-border">
            <h4 className="text-sm font-medium mb-2">Expected Parameters</h4>
            <div className="flex flex-wrap gap-2">
              {parameters.map(param => (
                <div
                  key={param.id}
                  className="px-2 py-1 bg-background rounded border border-border text-xs"
                >
                  {param.parameter_name}
                  <span className="ml-1 text-muted-foreground">({param.parameter_type})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!file || previewData.length === 0 || importMutation.isPending}
            className="bg-brand-gold text-white hover:bg-brand-gold-hover"
          >
            {importMutation.isPending ? 'Importing...' : `Import ${previewData.length} Row${previewData.length !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
