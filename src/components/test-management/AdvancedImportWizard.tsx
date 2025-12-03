/**
 * Advanced Import Wizard - Multi-step import with validation and preview
 */

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Upload,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import {
  parseFile,
  autoDetectMapping,
  validateImportData,
  executeImport,
  downloadErrorReport,
  type ImportPreview,
  type ColumnMapping,
  type ValidationResult,
  type ImportOptions,
  type ImportResult,
} from '@/services/importService';
import { downloadTemplate } from '@/services/exportService';

interface AdvancedImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  programId: string;
  onImportComplete?: (result: ImportResult) => void;
}

type Step = 'upload' | 'mapping' | 'validation' | 'options' | 'progress' | 'complete';

const SYSTEM_FIELDS = [
  { value: 'title', label: 'Title (Required)' },
  { value: 'objective', label: 'Objective' },
  { value: 'preconditions', label: 'Preconditions' },
  { value: 'priority', label: 'Priority' },
  { value: 'status', label: 'Status' },
  { value: 'type', label: 'Type' },
  { value: 'estimated_effort', label: 'Estimated Effort' },
  { value: 'component', label: 'Component' },
  { value: 'release', label: 'Release' },
  { value: 'labels', label: 'Labels' },
  { value: 'skip', label: '— Skip this column —' },
];

export const AdvancedImportWizard: React.FC<AdvancedImportWizardProps> = ({
  isOpen,
  onClose,
  programId,
  onImportComplete,
}) => {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [options, setOptions] = useState<ImportOptions>({
    mode: 'create',
    folderId: null,
    duplicateHandling: 'skip',
    onlyUpdateEmpty: false,
    createActivityLog: true,
  });
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const uploadedFile = acceptedFiles[0];
    if (!uploadedFile) return;

    try {
      setFile(uploadedFile);
      const previewData = await parseFile(uploadedFile);
      setPreview(previewData);
      const autoMapping = autoDetectMapping(previewData.headers);
      setMapping(autoMapping);
      setStep('mapping');
    } catch (error) {
      toast.error('Failed to parse file');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
  });

  const handleValidate = async () => {
    if (!file) return;
    try {
      const validationResult = await validateImportData(file, mapping);
      setValidation(validationResult);
      setStep('validation');
    } catch (error) {
      toast.error('Validation failed');
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setStep('progress');
    setProgress(0);

    try {
      const importResult = await executeImport(
        file,
        mapping,
        options,
        programId,
        (p) => setProgress(p)
      );
      setResult(importResult);
      setStep('complete');
      onImportComplete?.(importResult);
    } catch (error) {
      toast.error('Import failed');
      setStep('options');
    }
  };

  const handleClose = () => {
    setStep('upload');
    setFile(null);
    setPreview(null);
    setMapping({});
    setValidation(null);
    setResult(null);
    setProgress(0);
    onClose();
  };

  const renderStep = () => {
    switch (step) {
      case 'upload':
        return (
          <div className="space-y-4">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-brand-gold bg-brand-gold/5' : 'border-border hover:border-brand-gold/50'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium">
                {isDragActive ? 'Drop the file here' : 'Drag & drop a file here, or click to select'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports CSV, Excel (.xlsx, .xls)
              </p>
            </div>
            <Button variant="outline" onClick={() => downloadTemplate()} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Download Import Template
            </Button>
          </div>
        );

      case 'mapping':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <FileSpreadsheet className="h-5 w-5 text-brand-gold" />
              <div>
                <p className="font-medium text-sm">{file?.name}</p>
                <p className="text-xs text-muted-foreground">{preview?.totalRows} rows detected</p>
              </div>
            </div>

            <ScrollArea className="h-64">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File Column</TableHead>
                    <TableHead>Map To</TableHead>
                    <TableHead>Preview</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview?.headers.map((header, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{header}</TableCell>
                      <TableCell>
                        <Select
                          value={mapping[header] || 'skip'}
                          onValueChange={(value) =>
                            setMapping({ ...mapping, [header]: value })
                          }
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SYSTEM_FIELDS.map((field) => (
                              <SelectItem key={field.value} value={field.value}>
                                {field.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-32">
                        {preview?.rows[0]?.[idx] || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        );

      case 'validation':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-green-500/10 text-center">
                <CheckCircle2 className="h-5 w-5 mx-auto text-green-500 mb-1" />
                <p className="text-lg font-semibold text-green-600">{validation?.validCount}</p>
                <p className="text-xs text-muted-foreground">Valid</p>
              </div>
              <div className="p-3 rounded-lg bg-yellow-500/10 text-center">
                <AlertTriangle className="h-5 w-5 mx-auto text-yellow-500 mb-1" />
                <p className="text-lg font-semibold text-yellow-600">{validation?.warningCount}</p>
                <p className="text-xs text-muted-foreground">Warnings</p>
              </div>
              <div className="p-3 rounded-lg bg-red-500/10 text-center">
                <XCircle className="h-5 w-5 mx-auto text-red-500 mb-1" />
                <p className="text-lg font-semibold text-red-600">{validation?.errorCount}</p>
                <p className="text-xs text-muted-foreground">Errors</p>
              </div>
            </div>

            {validation && validation.errors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Validation Errors</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadErrorReport(validation.errors)}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Download Report
                  </Button>
                </div>
                <ScrollArea className="h-40 rounded border border-border">
                  <div className="p-2 space-y-1">
                    {validation.errors.slice(0, 10).map((error, idx) => (
                      <div key={idx} className="text-xs p-2 bg-red-500/5 rounded">
                        <span className="font-medium">Row {error.row}</span>
                        <span className="mx-1">•</span>
                        <span>{error.field}: {error.message}</span>
                      </div>
                    ))}
                    {validation.errors.length > 10 && (
                      <p className="text-xs text-muted-foreground p-2">
                        +{validation.errors.length - 10} more errors...
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        );

      case 'options':
        return (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Import Mode</Label>
                <Select
                  value={options.mode}
                  onValueChange={(v) => setOptions({ ...options, mode: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="create">Create new cases only</SelectItem>
                    <SelectItem value="update">Update existing only</SelectItem>
                    <SelectItem value="hybrid">Create & Update</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Duplicate Handling</Label>
                <Select
                  value={options.duplicateHandling}
                  onValueChange={(v) => setOptions({ ...options, duplicateHandling: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skip">Skip duplicates</SelectItem>
                    <SelectItem value="overwrite">Overwrite</SelectItem>
                    <SelectItem value="version">Create new version</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="activityLog"
                  checked={options.createActivityLog}
                  onCheckedChange={(checked) =>
                    setOptions({ ...options, createActivityLog: checked === true })
                  }
                />
                <Label htmlFor="activityLog" className="text-sm font-normal">
                  Create activity log entries
                </Label>
              </div>
            </div>
          </div>
        );

      case 'progress':
        return (
          <div className="space-y-4 py-8">
            <div className="flex justify-center">
              <div className="animate-spin h-8 w-8 border-2 border-brand-gold border-t-transparent rounded-full" />
            </div>
            <p className="text-center text-sm">Importing test cases...</p>
            <Progress value={progress} className="h-2" />
            <p className="text-center text-xs text-muted-foreground">{Math.round(progress)}%</p>
          </div>
        );

      case 'complete':
        return (
          <div className="space-y-4 py-4">
            <div className="flex justify-center">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            </div>
            <p className="text-center font-medium">Import Complete!</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-green-500/10 text-center">
                <p className="text-lg font-semibold text-green-600">{result?.createdCount}</p>
                <p className="text-xs text-muted-foreground">Created</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10 text-center">
                <p className="text-lg font-semibold text-blue-600">{result?.updatedCount}</p>
                <p className="text-xs text-muted-foreground">Updated</p>
              </div>
              <div className="p-3 rounded-lg bg-gray-500/10 text-center">
                <p className="text-lg font-semibold text-gray-600">{result?.skippedCount}</p>
                <p className="text-xs text-muted-foreground">Skipped</p>
              </div>
              <div className="p-3 rounded-lg bg-red-500/10 text-center">
                <p className="text-lg font-semibold text-red-600">{result?.errorCount}</p>
                <p className="text-xs text-muted-foreground">Errors</p>
              </div>
            </div>
          </div>
        );
    }
  };

  const getStepIndex = (s: Step) => {
    const steps: Step[] = ['upload', 'mapping', 'validation', 'options', 'progress', 'complete'];
    return steps.indexOf(s);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Test Cases</DialogTitle>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center gap-1 mb-4">
          {['Upload', 'Map', 'Validate', 'Options', 'Import'].map((label, idx) => (
            <div key={idx} className="flex items-center flex-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  getStepIndex(step) >= idx
                    ? 'bg-brand-gold text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {idx + 1}
              </div>
              {idx < 4 && (
                <div
                  className={`flex-1 h-0.5 ${
                    getStepIndex(step) > idx ? 'bg-brand-gold' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {renderStep()}

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t border-border">
          {step !== 'upload' && step !== 'progress' && step !== 'complete' && (
            <Button
              variant="outline"
              onClick={() => {
                const prev: Record<Step, Step> = {
                  mapping: 'upload',
                  validation: 'mapping',
                  options: 'validation',
                  upload: 'upload',
                  progress: 'options',
                  complete: 'complete',
                };
                setStep(prev[step]);
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}
          {step === 'upload' && <div />}
          
          {step === 'mapping' && (
            <Button onClick={handleValidate} className="bg-brand-gold hover:bg-brand-gold-hover text-white">
              Validate
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          {step === 'validation' && (
            <Button
              onClick={() => setStep('options')}
              disabled={(validation?.errorCount || 0) > 0}
              className="bg-brand-gold hover:bg-brand-gold-hover text-white"
            >
              Continue
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          {step === 'options' && (
            <Button onClick={handleImport} className="bg-brand-gold hover:bg-brand-gold-hover text-white">
              Start Import
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          {step === 'complete' && (
            <Button onClick={handleClose} className="ml-auto">
              Done
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
