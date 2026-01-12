/**
 * ImportExportDialog - Dialog for importing and exporting test data
 */

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload,
  Download,
  FileSpreadsheet,
  FileJson,
  FileText,
  FileType,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  importFile,
  exportTestCases,
  downloadImportTemplate,
  validateTestCaseImport,
  type ImportResult,
  type ExportOptions,
} from '../../utils/importExport';
import { toast } from 'sonner';

interface ImportExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'import' | 'export';
  entityType: 'cases' | 'cycles' | 'defects';
  data?: any[]; // For export
  onImport?: (data: any[]) => Promise<void>;
}

type ExportFormat = 'csv' | 'xlsx' | 'json' | 'pdf';

export function ImportExportDialog({
  open,
  onOpenChange,
  mode,
  entityType,
  data = [],
  onImport,
}: ImportExportDialogProps) {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>(mode);
  
  // Export state
  const [exportFormat, setExportFormat] = useState<ExportFormat>('xlsx');
  const [includeSteps, setIncludeSteps] = useState(true);
  const [includeHistory, setIncludeHistory] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Import state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [duplicateHandling, setDuplicateHandling] = useState<'skip' | 'update' | 'create_new'>('skip');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
      setImportResult(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/json': ['.json'],
    },
    maxFiles: 1,
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const options: ExportOptions = {
        format: exportFormat,
        filename: `${entityType}_export_${new Date().toISOString().split('T')[0]}`,
        includeAttachments: false,
        includeHistory,
      };

      exportTestCases(data, options);
      toast.success(`Exported ${data.length} ${entityType} successfully`);
      onOpenChange(false);
    } catch (error) {
      toast.error('Export failed');
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleValidate = async () => {
    if (!selectedFile) return;

    setIsImporting(true);
    try {
      const result = await importFile(selectedFile, {
        format: selectedFile.name.split('.').pop() as any,
        duplicateHandling,
        validateOnly: true,
      });

      if (result.data) {
        const validationResult = validateTestCaseImport(result.data);
        setImportResult(validationResult);
      } else {
        setImportResult(result);
      }
    } catch (error) {
      toast.error('Validation failed');
    } finally {
      setIsImporting(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !importResult?.data || !onImport) return;

    setIsImporting(true);
    setImportProgress(0);

    try {
      // Simulate progress
      const interval = setInterval(() => {
        setImportProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      await onImport(importResult.data);

      clearInterval(interval);
      setImportProgress(100);
      toast.success(`Imported ${importResult.imported} items successfully`);
      onOpenChange(false);
    } catch (error) {
      toast.error('Import failed');
      console.error('Import error:', error);
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  };

  const formatIcons: Record<ExportFormat, React.ReactNode> = {
    csv: <FileText className="h-5 w-5" />,
    xlsx: <FileSpreadsheet className="h-5 w-5" />,
    json: <FileJson className="h-5 w-5" />,
    pdf: <FileType className="h-5 w-5" />,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'import' ? (
              <>
                <Upload className="h-5 w-5" />
                Import {entityType}
              </>
            ) : (
              <>
                <Download className="h-5 w-5" />
                Export {entityType}
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === 'import'
              ? 'Upload a file to import test data'
              : `Export ${data.length} ${entityType} to a file`}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="import" className="gap-2">
              <Upload className="h-4 w-4" />
              Import
            </TabsTrigger>
            <TabsTrigger value="export" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="space-y-4 mt-4">
            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                isDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50'
              )}
            >
              <input {...getInputProps()} />
              <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              {isDragActive ? (
                <p className="text-sm text-primary">Drop the file here...</p>
              ) : selectedFile ? (
                <div>
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground">
                    Drag & drop a file here, or click to select
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports CSV, XLSX, JSON
                  </p>
                </div>
              )}
            </div>

            {/* Duplicate Handling */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Duplicate Handling</Label>
              <RadioGroup
                value={duplicateHandling}
                onValueChange={(v) => setDuplicateHandling(v as any)}
                className="flex gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="skip" id="skip" />
                  <Label htmlFor="skip" className="text-sm font-normal">Skip</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="update" id="update" />
                  <Label htmlFor="update" className="text-sm font-normal">Update</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="create_new" id="create_new" />
                  <Label htmlFor="create_new" className="text-sm font-normal">Create New</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Validation Results */}
            {importResult && (
              <Alert variant={importResult.success ? 'default' : 'destructive'}>
                <div className="flex items-start gap-2">
                  {importResult.success ? (
                    <CheckCircle2 className="h-4 w-4 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <AlertDescription>
                      <p className="font-medium mb-1">
                        {importResult.success ? 'Validation Passed' : 'Validation Failed'}
                      </p>
                      <p className="text-xs">
                        Total: {importResult.totalRows} | Valid: {importResult.imported} | 
                        Errors: {importResult.errors.length}
                      </p>
                      {importResult.errors.length > 0 && (
                        <ScrollArea className="h-20 mt-2">
                          <ul className="text-xs space-y-1">
                            {importResult.errors.slice(0, 5).map((error, i) => (
                              <li key={i} className="flex items-start gap-1">
                                <XCircle className="h-3 w-3 mt-0.5 shrink-0" />
                                Row {error.row}: {error.message}
                              </li>
                            ))}
                            {importResult.errors.length > 5 && (
                              <li className="text-muted-foreground">
                                ...and {importResult.errors.length - 5} more errors
                              </li>
                            )}
                          </ul>
                        </ScrollArea>
                      )}
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            )}

            {/* Progress */}
            {isImporting && importProgress > 0 && (
              <Progress value={importProgress} className="h-2" />
            )}

            {/* Download Template */}
            <Button
              variant="link"
              size="sm"
              className="p-0 h-auto"
              onClick={() => downloadImportTemplate()}
            >
              <Download className="h-3 w-3 mr-1" />
              Download import template
            </Button>
          </TabsContent>

          <TabsContent value="export" className="space-y-4 mt-4">
            {/* Format Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Export Format</Label>
              <RadioGroup
                value={exportFormat}
                onValueChange={(v) => setExportFormat(v as ExportFormat)}
                className="grid grid-cols-2 gap-2"
              >
                {(['xlsx', 'csv', 'json', 'pdf'] as ExportFormat[]).map((format) => (
                  <Label
                    key={format}
                    htmlFor={format}
                    className={cn(
                      'flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors',
                      exportFormat === format
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <RadioGroupItem value={format} id={format} className="sr-only" />
                    {formatIcons[format]}
                    <span className="text-sm font-medium uppercase">{format}</span>
                  </Label>
                ))}
              </RadioGroup>
            </div>

            {/* Options */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Options</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="includeSteps"
                    checked={includeSteps}
                    onCheckedChange={(v) => setIncludeSteps(!!v)}
                  />
                  <Label htmlFor="includeSteps" className="text-sm font-normal">
                    Include test steps
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="includeHistory"
                    checked={includeHistory}
                    onCheckedChange={(v) => setIncludeHistory(!!v)}
                  />
                  <Label htmlFor="includeHistory" className="text-sm font-normal">
                    Include execution history
                  </Label>
                </div>
              </div>
            </div>

            {/* Summary */}
            <Alert>
              <AlertDescription className="text-sm">
                {data.length} {entityType} will be exported to {exportFormat.toUpperCase()} format
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {activeTab === 'import' ? (
            <>
              <Button
                variant="secondary"
                onClick={handleValidate}
                disabled={!selectedFile || isImporting}
              >
                {isImporting && !importProgress && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Validate
              </Button>
              <Button
                onClick={handleImport}
                disabled={!importResult?.success || isImporting}
              >
                {isImporting && importProgress > 0 && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Import
              </Button>
            </>
          ) : (
            <Button onClick={handleExport} disabled={isExporting || data.length === 0}>
              {isExporting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Export
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ImportExportDialog;
