import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BacklogImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemType: string;
}

interface ParsedRow {
  rowIndex: number;
  data: Record<string, string>;
  errors: string[];
}

interface FieldMapping {
  csvColumn: string;
  dbField: string;
}

const DB_FIELDS: Record<string, string[]> = {
  epic: ['name', 'state', 'description', 'points_estimate', 'health', 'owner_id'],
  feature: ['name', 'status', 'description', 'estimate_points', 'health', 'owner_id'],
  capability: ['name', 'state', 'description', 'owner_id'],
};

export function BacklogImportDialog({
  open,
  onOpenChange,
  itemType,
}: BacklogImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: async (data: { items: Record<string, any>[]; tableName: string }) => {
      const { items, tableName } = data;
      const batchSize = 50;
      let imported = 0;

      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const { error } = await supabase.from(tableName as any).insert(batch as any);
        if (error) throw error;
        imported += batch.length;
      }

      return imported;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['backlog-items'] });
      toast.success(`Successfully imported ${count} ${itemType}(s)`);
      handleClose();
    },
    onError: (error: any) => {
      toast.error(`Import failed: ${error.message}`);
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
      toast.error('Please select a valid CSV file');
      return;
    }

    setFile(selectedFile);
    
    // Parse CSV
    const text = await selectedFile.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      toast.error('CSV file must have at least a header row and one data row');
      return;
    }

    // Parse headers
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    setCsvHeaders(headers);

    // Parse data rows
    const rows: ParsedRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const data: Record<string, string> = {};
      headers.forEach((header, index) => {
        data[header] = values[index] || '';
      });
      rows.push({ rowIndex: i, data, errors: [] });
    }

    setParsedRows(rows);
    
    // Auto-detect field mappings
    const dbFields = DB_FIELDS[itemType as keyof typeof DB_FIELDS] || [];
    const autoMappings: FieldMapping[] = dbFields.map((dbField: string) => {
      const matchingHeader = headers.find(h => 
        h.toLowerCase().includes(dbField.toLowerCase()) || 
        dbField.toLowerCase().includes(h.toLowerCase())
      );
      return {
        csvColumn: matchingHeader || '',
        dbField,
      };
    });
    setFieldMappings(autoMappings);
    
    setStep('mapping');
  };

  const validateMappings = () => {
    const errors: string[] = [];
    
    // Check required fields
    const nameMapping = fieldMappings.find(m => m.dbField === 'name');
    if (!nameMapping?.csvColumn) {
      errors.push('Name field is required');
    }

    // Validate data
    const validatedRows = parsedRows.map(row => {
      const rowErrors: string[] = [];
      
      // Check name is not empty
      const nameField = fieldMappings.find(m => m.dbField === 'name');
      if (nameField && !row.data[nameField.csvColumn]) {
        rowErrors.push('Name is required');
      }

      return { ...row, errors: rowErrors };
    });

    const rowsWithErrors = validatedRows.filter(r => r.errors.length > 0);
    if (rowsWithErrors.length > 0) {
      errors.push(`${rowsWithErrors.length} row(s) have validation errors`);
    }

    setValidationErrors(errors);
    setParsedRows(validatedRows);

    if (errors.length === 0) {
      setStep('preview');
    }
  };

  const handleImport = () => {
    const tableName = itemType === 'epic' ? 'epics' : 
                     itemType === 'feature' ? 'features' : 'capabilities';
    
    const items = parsedRows
      .filter(row => row.errors.length === 0)
      .map(row => {
        const item: any = {};
        
        fieldMappings.forEach(mapping => {
          if (mapping.csvColumn && mapping.dbField) {
            const value = row.data[mapping.csvColumn];
            
            // Type conversions
            if (mapping.dbField.includes('points') || mapping.dbField.includes('estimate')) {
              item[mapping.dbField] = value ? parseFloat(value) : null;
            } else {
              item[mapping.dbField] = value || null;
            }
          }
        });
        
        return item;
      });

    importMutation.mutate({ items, tableName });
  };

  const handleClose = () => {
    setFile(null);
    setCsvHeaders([]);
    setParsedRows([]);
    setFieldMappings([]);
    setStep('upload');
    setValidationErrors([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Import {itemType}s from CSV</DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Upload a CSV file to import items'}
            {step === 'mapping' && 'Map CSV columns to database fields'}
            {step === 'preview' && 'Preview and confirm import'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 py-4 pr-4">
            {/* Step 1: Upload */}
            {step === 'upload' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="csv-file">CSV File</Label>
                  <Input
                    id="csv-file"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                  />
                  {file && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      {file.name}
                    </div>
                  )}
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-medium mb-2">CSV Format Requirements:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>First row must contain column headers</li>
                      <li>Required: Name column</li>
                      <li>Optional: State, Description, Points, Health, Owner</li>
                      <li>Example: "Name,State,Description,Points"</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </>
            )}

            {/* Step 2: Field Mapping */}
            {step === 'mapping' && (
              <>
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Found {csvHeaders.length} columns and {parsedRows.length} rows
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <Label>Map CSV Columns to Database Fields</Label>
                  {fieldMappings.map((mapping, index) => (
                    <div key={mapping.dbField} className="flex items-center gap-3">
                      <div className="w-32 text-sm font-medium">
                        {mapping.dbField}
                        {mapping.dbField === 'name' && (
                          <span className="text-destructive ml-1">*</span>
                        )}
                      </div>
                      <Select
                        value={mapping.csvColumn || undefined}
                        onValueChange={(value) => {
                          const newMappings = [...fieldMappings];
                          newMappings[index].csvColumn = value;
                          setFieldMappings(newMappings);
                        }}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select CSV column (optional)" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          {csvHeaders.map(header => (
                            <SelectItem key={header} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>

                {validationErrors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <ul className="list-disc list-inside">
                        {validationErrors.map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}

            {/* Step 3: Preview */}
            {step === 'preview' && (
              <>
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Ready to import {parsedRows.filter(r => r.errors.length === 0).length} valid items
                  </AlertDescription>
                </Alert>

                <div className="border rounded-lg overflow-hidden">
                  <div className="max-h-60 overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          {fieldMappings.filter(m => m.csvColumn).map(m => (
                            <th key={m.dbField} className="px-3 py-2 text-left font-medium">
                              {m.dbField}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {parsedRows.slice(0, 10).map((row, i) => (
                          <tr key={i} className={row.errors.length > 0 ? 'bg-destructive/10' : ''}>
                            {fieldMappings.filter(m => m.csvColumn).map(m => (
                              <td key={m.dbField} className="px-3 py-2">
                                {row.data[m.csvColumn]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {parsedRows.length > 10 && (
                    <div className="px-3 py-2 text-xs text-muted-foreground bg-muted">
                      Showing first 10 of {parsedRows.length} rows
                    </div>
                  )}
                </div>

                {importMutation.isPending && (
                  <div className="space-y-2">
                    <Progress value={50} />
                    <p className="text-sm text-muted-foreground text-center">
                      Importing items...
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={importMutation.isPending}>
            Cancel
          </Button>
          
          {step === 'mapping' && (
            <Button onClick={validateMappings}>
              Next: Preview
            </Button>
          )}
          
          {step === 'preview' && (
            <Button onClick={handleImport} disabled={importMutation.isPending}>
              {importMutation.isPending ? (
                <>Importing...</>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import {parsedRows.filter(r => r.errors.length === 0).length} Items
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
