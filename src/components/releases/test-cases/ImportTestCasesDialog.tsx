/**
 * Import Test Cases Dialog — Upload and map test cases
 */

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileSpreadsheet,
  FileJson,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  ArrowRight,
  Download,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ImportTestCasesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport?: (count: number) => void;
}

interface UploadedFile {
  file: File;
  type: 'xlsx' | 'csv' | 'json';
  status: 'pending' | 'parsing' | 'ready' | 'error';
  rowCount?: number;
  error?: string;
}

interface FieldMapping {
  sourceField: string;
  targetField: string;
}

const targetFields = [
  { value: 'title', label: 'Title', required: true },
  { value: 'description', label: 'Description' },
  { value: 'type', label: 'Type' },
  { value: 'priority', label: 'Priority' },
  { value: 'status', label: 'Status' },
  { value: 'folder', label: 'Folder' },
  { value: 'tags', label: 'Tags' },
  { value: 'preconditions', label: 'Preconditions' },
  { value: 'steps', label: 'Test Steps' },
  { value: 'skip', label: '— Skip this field —' },
];

const sampleSourceFields = [
  'Test Case Name',
  'Description',
  'Category',
  'Priority Level',
  'Current Status',
  'Folder Path',
  'Labels',
  'Prerequisites',
  'Steps to Reproduce',
];

export function ImportTestCasesDialog({ 
  open, 
  onOpenChange,
  onImport,
}: ImportTestCasesDialogProps) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'importing'>('upload');
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [importProgress, setImportProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    const type = ext === 'xlsx' ? 'xlsx' : ext === 'csv' ? 'csv' : ext === 'json' ? 'json' : null;
    
    if (!type) {
      toast.error('Unsupported file format. Please use .xlsx, .csv, or .json');
      return;
    }

    setUploadedFile({
      file,
      type,
      status: 'parsing',
    });

    // Simulate parsing
    setTimeout(() => {
      setUploadedFile(prev => prev ? {
        ...prev,
        status: 'ready',
        rowCount: Math.floor(Math.random() * 50) + 10,
      } : null);
      
      // Set initial mappings
      setMappings(sampleSourceFields.map((sourceField, index) => ({
        sourceField,
        targetField: targetFields[index]?.value || 'skip',
      })));
    }, 1500);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
      'application/json': ['.json'],
    },
    maxFiles: 1,
  });

  const updateMapping = (sourceField: string, targetField: string) => {
    setMappings(prev => prev.map(m => 
      m.sourceField === sourceField ? { ...m, targetField } : m
    ));
  };

  const handleImport = async () => {
    setStep('importing');
    setImportProgress(0);

    // Simulate import progress
    for (let i = 0; i <= 100; i += 5) {
      await new Promise(resolve => setTimeout(resolve, 100));
      setImportProgress(i);
    }

    const count = uploadedFile?.rowCount || 0;
    onImport?.(count);
    onOpenChange(false);
    toast.success(`Imported ${count} test cases successfully`);
    
    // Reset state
    setStep('upload');
    setUploadedFile(null);
    setMappings([]);
  };

  const handleClose = () => {
    onOpenChange(false);
    setStep('upload');
    setUploadedFile(null);
    setMappings([]);
  };

  const downloadTemplate = () => {
    toast.success('Template downloaded');
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'xlsx': return FileSpreadsheet;
      case 'csv': return FileText;
      case 'json': return FileJson;
      default: return FileText;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import Test Cases
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Upload a file to import test cases'}
            {step === 'mapping' && 'Map your columns to test case fields'}
            {step === 'importing' && 'Importing test cases...'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              {/* Dropzone */}
              <div
                {...getRootProps()}
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all",
                  isDragActive 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50"
                )}
              >
                <input {...getInputProps()} />
                <Upload className={cn(
                  "w-10 h-10 mx-auto mb-3",
                  isDragActive ? "text-primary" : "text-muted-foreground"
                )} />
                {isDragActive ? (
                  <p className="text-primary font-medium">Drop the file here...</p>
                ) : (
                  <>
                    <p className="text-foreground font-medium mb-1">
                      Drag & drop your file here
                    </p>
                    <p className="text-sm text-muted-foreground">
                      or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Supports .xlsx, .csv, .json
                    </p>
                  </>
                )}
              </div>

              {/* Uploaded File */}
              <AnimatePresence>
                {uploadedFile && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border",
                      uploadedFile.status === 'ready' ? "border-green-200 bg-green-50" :
                      uploadedFile.status === 'error' ? "border-red-200 bg-red-50" :
                      "border-border bg-muted/50"
                    )}
                  >
                    {(() => {
                      const Icon = getFileIcon(uploadedFile.type);
                      return <Icon className="w-8 h-8 text-muted-foreground" />;
                    })()}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{uploadedFile.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {uploadedFile.status === 'parsing' && 'Parsing file...'}
                        {uploadedFile.status === 'ready' && `${uploadedFile.rowCount} rows detected`}
                        {uploadedFile.status === 'error' && uploadedFile.error}
                      </p>
                    </div>
                    {uploadedFile.status === 'parsing' && (
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    )}
                    {uploadedFile.status === 'ready' && (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    )}
                    {uploadedFile.status === 'error' && (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadedFile(null);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Download Template */}
              <div className="flex items-center justify-center pt-2">
                <Button variant="link" size="sm" onClick={downloadTemplate}>
                  <Download className="w-4 h-4 mr-1.5" />
                  Download import template
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Field Mapping */}
          {step === 'mapping' && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground mb-4">
                Map your file columns to test case fields
              </div>
              
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {mappings.map((mapping) => (
                  <div key={mapping.sourceField} className="flex items-center gap-3">
                    <div className="flex-1 p-2 bg-muted/50 rounded text-sm truncate">
                      {mapping.sourceField}
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <Select
                      value={mapping.targetField}
                      onValueChange={(value) => updateMapping(mapping.sourceField, value)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {targetFields.map((field) => (
                          <SelectItem key={field.value} value={field.value}>
                            {field.label}
                            {field.required && (
                              <span className="text-xs text-muted-foreground ml-1">*</span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <AlertCircle className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Fields marked with * are required
                </span>
              </div>
            </div>
          )}

          {/* Step 3: Importing */}
          {step === 'importing' && (
            <div className="space-y-4 py-4">
              <div className="text-center">
                <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary mb-4" />
                <p className="font-medium">Importing {uploadedFile?.rowCount} test cases...</p>
                <p className="text-sm text-muted-foreground">This may take a moment</p>
              </div>
              <Progress value={importProgress} className="h-2" />
              <div className="text-center text-sm text-muted-foreground">
                {importProgress}% complete
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === 'upload' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={() => setStep('mapping')} 
                disabled={!uploadedFile || uploadedFile.status !== 'ready'}
              >
                Continue to Mapping
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </>
          )}
          {step === 'mapping' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button onClick={handleImport}>
                Import {uploadedFile?.rowCount} Test Cases
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
