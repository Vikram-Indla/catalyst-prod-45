import { useState, useCallback } from 'react';
import Button, { IconButton } from '@atlaskit/button/new';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { loadXLSX } from '@/lib/exportLoaders';
import AlertIcon from '@atlaskit/icon/core/alert';
import FileIcon from '@atlaskit/icon/core/file';
import UploadIcon from '@atlaskit/icon/core/upload';
import CrossIcon from '@atlaskit/icon/glyph/cross';

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
        reader.onload = async (e) => {
          try {
            const XLSX = await loadXLSX();
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
            <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>
              Source File <span style={{ color: 'var(--ds-text-danger, #AE2A19)' }}>*</span>
            </label>
          </div>
          
          {!file ? (
            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                isDragActive ? 'border-brand-primary bg-brand-primary/5' : 'border-muted-foreground/25 hover:border-brand-primary/50',
                isProcessing && 'pointer-events-none opacity-50'
              )}
            >
              <input {...getInputProps()} />
              <UploadIcon label="" size="small" />
              {isDragActive ? (
                <p className="text-sm text-brand-primary font-medium">Drop the file here</p>
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
              <FileIcon label="" size="small" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <IconButton
                appearance="subtle"
                onClick={(e) => {
                  e.stopPropagation();
                  onClearFile();
                  setError(null);
                }}
                icon={CrossIcon}
              label="" />
            </div>
          )}
          
          <p className="text-xs text-muted-foreground">
            The maximum file upload size is 20 MB.
          </p>
        </div>
        
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertIcon label="" size="small" />
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
            <label htmlFor="use-existing" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))', cursor: 'pointer' }}>
              Use an existing configuration file
            </label>
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
