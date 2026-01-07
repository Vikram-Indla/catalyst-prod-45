import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useImportUsers, UserImportRow } from '@/hooks/useImportUsers';
import Papa from 'papaparse';

interface UsersImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type ImportStep = 'upload' | 'preview' | 'result';

interface ParsedData {
  headers: string[];
  rows: Record<string, string>[];
  mappedRows: UserImportRow[];
}

// Expected CSV columns
const EXPECTED_COLUMNS = [
  { key: 'full_name', label: 'Full Name', required: true },
  { key: 'email', label: 'Email', required: true },
  { key: 'vendor', label: 'Vendor', required: false },
  { key: 'contract_start_date', label: 'Start Date', required: false },
  { key: 'contract_end_date', label: 'End Date', required: false },
  { key: 'location', label: 'Location', required: false },
  { key: 'country', label: 'Country', required: false },
  { key: 'country_code', label: 'Country Code', required: false },
  { key: 'approval_status', label: 'Status', required: false },
];

// Try to map CSV header to our expected column
function mapHeader(header: string): string | null {
  const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, '_');
  
  const mappings: Record<string, string> = {
    'full_name': 'full_name',
    'name': 'full_name',
    'fullname': 'full_name',
    'user_name': 'full_name',
    'username': 'full_name',
    'email': 'email',
    'email_address': 'email',
    'vendor': 'vendor',
    'vendor_name': 'vendor',
    'company': 'vendor',
    'contract_start_date': 'contract_start_date',
    'start_date': 'contract_start_date',
    'startdate': 'contract_start_date',
    'contract_end_date': 'contract_end_date',
    'end_date': 'contract_end_date',
    'enddate': 'contract_end_date',
    'location': 'location',
    'work_location': 'location',
    'country': 'country',
    'country_name': 'country',
    'country_code': 'country_code',
    'countrycode': 'country_code',
    'approval_status': 'approval_status',
    'status': 'approval_status',
    'user_status': 'approval_status',
  };

  return mappings[normalized] || null;
}

export function UsersImportDialog({ isOpen, onClose }: UsersImportDialogProps) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const importUsers = useImportUsers();

  const handleReset = useCallback(() => {
    setStep('upload');
    setParsedData(null);
    setParseError(null);
    importUsers.reset();
  }, [importUsers]);

  const handleClose = useCallback(() => {
    handleReset();
    onClose();
  }, [handleReset, onClose]);

  const parseFile = useCallback((file: File) => {
    setParseError(null);
    
    if (!file.name.endsWith('.csv')) {
      setParseError('Please upload a CSV file');
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setParseError(`Parse error: ${results.errors[0].message}`);
          return;
        }

        const rows = results.data as Record<string, string>[];
        if (rows.length === 0) {
          setParseError('CSV file is empty');
          return;
        }

        const headers = Object.keys(rows[0]);
        
        // Map headers to our expected columns
        const headerMapping: Record<string, string> = {};
        headers.forEach(h => {
          const mapped = mapHeader(h);
          if (mapped) {
            headerMapping[h] = mapped;
          }
        });

        // Check required columns
        const mappedColumns = Object.values(headerMapping);
        const missingRequired = EXPECTED_COLUMNS
          .filter(c => c.required && !mappedColumns.includes(c.key))
          .map(c => c.label);

        if (missingRequired.length > 0) {
          setParseError(`Missing required columns: ${missingRequired.join(', ')}`);
          return;
        }

        // Map rows to our format
        const mappedRows: UserImportRow[] = rows.map(row => {
          const mapped: Record<string, string> = {};
          Object.entries(row).forEach(([key, value]) => {
            const mappedKey = headerMapping[key];
            if (mappedKey) {
              mapped[mappedKey] = value;
            }
          });
          return mapped as unknown as UserImportRow;
        });

        setParsedData({ headers, rows, mappedRows });
        setStep('preview');
      },
      error: (error) => {
        setParseError(`Failed to parse CSV: ${error.message}`);
      },
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      parseFile(file);
    }
  }, [parseFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      parseFile(file);
    }
  }, [parseFile]);

  const handleImport = useCallback(() => {
    if (!parsedData) return;
    
    importUsers.mutate(parsedData.mappedRows, {
      onSuccess: () => {
        setStep('result');
      },
    });
  }, [parsedData, importUsers]);

  const downloadTemplate = useCallback(() => {
    const headers = EXPECTED_COLUMNS.map(c => c.key).join(',');
    const sampleRow = 'John Doe,john@example.com,Thiqah,2024-01-01,2025-12-31,On-Site,Saudi Arabia,SA,APPROVED';
    const csv = `${headers}\n${sampleRow}`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Users from CSV
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to import or update users in bulk. Changes will sync in real-time.
          </DialogDescription>
        </DialogHeader>

        {/* Upload Step */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
                'hover:border-primary/50'
              )}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
            >
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm font-medium mb-1">
                Drag and drop your CSV file here
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                or click to browse
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload">
                <Button variant="outline" asChild>
                  <span>Select CSV File</span>
                </Button>
              </label>
            </div>

            {parseError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <XCircle className="h-4 w-4 shrink-0" />
                {parseError}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t">
              <Button variant="ghost" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
              <div className="text-xs text-muted-foreground">
                Required: Full Name, Email
              </div>
            </div>
          </div>
        )}

        {/* Preview Step */}
        {step === 'preview' && parsedData && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
              <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">{parsedData.rows.length} users to import</p>
                <p className="text-xs text-muted-foreground">
                  Columns: {EXPECTED_COLUMNS.filter(c => 
                    parsedData.mappedRows[0] && (parsedData.mappedRows[0] as unknown as Record<string, string>)[c.key]
                  ).map(c => c.label).join(', ')}
                </p>
              </div>
            </div>

            <ScrollArea className="h-[300px] border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-medium">#</th>
                    <th className="text-left p-2 font-medium">Name</th>
                    <th className="text-left p-2 font-medium">Email</th>
                    <th className="text-left p-2 font-medium">Vendor</th>
                    <th className="text-left p-2 font-medium">Location</th>
                    <th className="text-left p-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.mappedRows.slice(0, 50).map((row, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="p-2 text-muted-foreground">{idx + 1}</td>
                      <td className="p-2">{row.full_name || '-'}</td>
                      <td className="p-2">{row.email || '-'}</td>
                      <td className="p-2">{row.vendor || '-'}</td>
                      <td className="p-2">{row.location || '-'}</td>
                      <td className="p-2">
                        <Badge variant="outline" className="text-xs">
                          {row.approval_status || 'PENDING'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedData.mappedRows.length > 50 && (
                <div className="p-2 text-center text-xs text-muted-foreground border-t">
                  Showing first 50 of {parsedData.mappedRows.length} rows
                </div>
              )}
            </ScrollArea>

            <DialogFooter className="flex items-center justify-between sm:justify-between">
              <Button variant="ghost" onClick={handleReset}>
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={importUsers.isPending}
                className="bg-brand-primary hover:bg-brand-primary-hover"
              >
                {importUsers.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import {parsedData.mappedRows.length} Users
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Result Step */}
        {step === 'result' && importUsers.data && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-semibold mb-1">Import Complete</h3>
              <p className="text-muted-foreground">
                Your users have been imported and synced across all pages.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950 text-center">
                <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {importUsers.data.created}
                </div>
                <div className="text-xs text-muted-foreground">Created</div>
              </div>
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950 text-center">
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {importUsers.data.updated}
                </div>
                <div className="text-xs text-muted-foreground">Updated</div>
              </div>
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950 text-center">
                <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                  {importUsers.data.errors.length}
                </div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
            </div>

            {importUsers.data.errors.length > 0 && (
              <ScrollArea className="h-[150px] border rounded-lg">
                <div className="p-2 space-y-1">
                  {importUsers.data.errors.map((err, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm p-2 rounded bg-destructive/10">
                      <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                      <span className="text-muted-foreground">Row {err.row}:</span>
                      <span className="font-medium">{err.name}</span>
                      <span className="text-destructive">{err.error}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            <DialogFooter>
              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
