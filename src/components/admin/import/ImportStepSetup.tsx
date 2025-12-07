import { useState, useCallback } from 'react';
import { Upload, FileText, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface ImportStepSetupProps {
  file: File | null;
  parsedData: Record<string, string>[];
  headers: string[];
  useExistingConfig: boolean;
  onFileSelect: (file: File, data: Record<string, string>[], headers: string[]) => void;
  onClearFile: () => void;
  onUseExistingConfigChange: (value: boolean) => void;
}

export function ImportStepSetup({
  file,
  useExistingConfig,
  onFileSelect,
  onClearFile,
  onUseExistingConfigChange,
}: ImportStepSetupProps) {
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const processFile = useCallback(async (acceptedFile: File) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const extension = acceptedFile.name.split('.').pop()?.toLowerCase();
      
      if (extension === 'csv') {
        // Parse CSV
        Papa.parse(acceptedFile, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.errors.length > 0) {
              setError(`CSV parsing error: ${results.errors[0].message}`);
              setIsProcessing(false);
              return;
            }
            
            const headers = results.meta.fields || [];
            const data = results.data as Record<string, string>[];
            
            if (headers.length === 0) {
              setError('CSV file has no headers');
              setIsProcessing(false);
              return;
            }
            
            if (data.length === 0) {
              setError('CSV file has no data rows');
              setIsProcessing(false);
              return;
            }
            
            onFileSelect(acceptedFile, data, headers);
            setIsProcessing(false);
          },
          error: (err) => {
            setError(`Failed to parse CSV: ${err.message}`);
            setIsProcessing(false);
          },
        });
      } else if (extension === 'xlsx' || extension === 'xls') {
        // Parse Excel
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(firstSheet, { 
              header: 1,
              defval: '',
            });
            
            if (jsonData.length < 2) {
              setError('Excel file must have a header row and at least one data row');
              setIsProcessing(false);
              return;
            }
            
            const headers = (jsonData[0] as unknown as string[]).map(h => String(h).trim());
            const rows = jsonData.slice(1).map(row => {
              const obj: Record<string, string> = {};
              headers.forEach((header, idx) => {
                obj[header] = String((row as unknown as string[])[idx] || '').trim();
              });
              return obj;
            });
            
            onFileSelect(acceptedFile, rows, headers);
            setIsProcessing(false);
          } catch (err) {
            setError(`Failed to parse Excel file: ${err instanceof Error ? err.message : 'Unknown error'}`);
            setIsProcessing(false);
          }
        };
        reader.readAsArrayBuffer(acceptedFile);
      } else {
        setError('Unsupported file type. Please upload a CSV or XLSX file.');
        setIsProcessing(false);
      }
    } catch (err) {
      setError(`Error processing file: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsProcessing(false);
    }
  }, [onFileSelect]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        processFile(acceptedFiles[0]);
      }
    },
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024, // 20MB
  });
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Setup</h2>
        <p className="text-sm text-muted-foreground">
          To import issues in bulk, you need to provide the data in a CSV or XLSX file format.
        </p>
      </div>
      
      <div className="border-t pt-6">
        {/* File Upload */}
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">
              Source File <span className="text-destructive">*</span>
            </Label>
          </div>
          
          {!file ? (
            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                isDragActive ? 'border-brand-gold bg-brand-gold/5' : 'border-muted-foreground/25 hover:border-brand-gold/50',
                isProcessing && 'pointer-events-none opacity-50'
              )}
            >
              <input {...getInputProps()} />
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              {isDragActive ? (
                <p className="text-sm text-brand-gold font-medium">Drop the file here</p>
              ) : (
                <>
                  <p className="text-sm font-medium text-foreground mb-1">
                    {isProcessing ? 'Processing file...' : 'Drop file here or click to upload'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    CSV or XLSX files, max 20 MB
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg border">
              <FileText className="h-8 w-8 text-brand-gold flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onClearFile();
                  setError(null);
                }}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          <p className="text-xs text-muted-foreground">
            The maximum file upload size is 20 MB.
          </p>
        </div>
        
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {/* Use existing config */}
        <div className="flex items-start gap-3 mt-6 p-4 bg-muted/30 rounded-lg">
          <Checkbox
            id="use-existing"
            checked={useExistingConfig}
            onCheckedChange={(checked) => onUseExistingConfigChange(checked === true)}
          />
          <div className="space-y-1">
            <Label htmlFor="use-existing" className="text-sm font-medium cursor-pointer">
              Use an existing configuration file
            </Label>
            <p className="text-xs text-muted-foreground">
              If you have used this importer before, you may have saved the configuration you used.
              You can use that configuration again to save time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
