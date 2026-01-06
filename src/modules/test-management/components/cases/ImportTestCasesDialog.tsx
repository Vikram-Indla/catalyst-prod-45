/**
 * Import Test Cases Dialog
 * CSV import with preview
 */

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useCreateTestCase } from '../../hooks';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, AlertCircle, X, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

interface ImportTestCasesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  folderId?: string | null;
  onSuccess?: () => void;
}

interface ParsedCase {
  title: string;
  description?: string;
  priority?: string;
  status?: string;
  objective?: string;
  preconditions?: string;
}

export function ImportTestCasesDialog({
  open,
  onOpenChange,
  projectId,
  folderId,
  onSuccess
}: ImportTestCasesDialogProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedCase[]>([]);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  
  const createCase = useCreateTestCase();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseFile(selectedFile);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    maxFiles: 1
  });

  const parseFile = async (file: File) => {
    try {
      const text = await file.text();
      const rows = text.split('\n');
      const headers = rows[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
      
      const cases: ParsedCase[] = [];
      
      for (let i = 1; i < rows.length; i++) {
        if (!rows[i].trim()) continue;
        
        // Handle CSV values (basic parsing)
        const values = rows[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        
        const titleIndex = headers.findIndex(h => h === 'title' || h === 'name' || h === 'test case');
        const descIndex = headers.findIndex(h => h === 'description' || h === 'desc');
        const objectiveIndex = headers.findIndex(h => h === 'objective');
        const preconditionsIndex = headers.findIndex(h => h === 'preconditions' || h === 'precondition');
        
        const caseData: ParsedCase = {
          title: titleIndex >= 0 ? values[titleIndex] : `Imported Case ${i}`,
          description: descIndex >= 0 ? values[descIndex] : '',
          objective: objectiveIndex >= 0 ? values[objectiveIndex] : '',
          preconditions: preconditionsIndex >= 0 ? values[preconditionsIndex] : '',
        };
        
        if (caseData.title && caseData.title.trim()) {
          cases.push(caseData);
        }
      }
      
      if (cases.length === 0) {
        toast.error('No valid test cases found in file');
        return;
      }
      
      setParsedData(cases);
      setStep('preview');
    } catch (error) {
      toast.error('Failed to parse file');
      setErrors(['Failed to parse file. Please check the format.']);
    }
  };

  const handleImport = async () => {
    setStep('importing');
    setProgress(0);
    setErrors([]);
    setIsImporting(true);
    
    try {
      const total = parsedData.length;
      let imported = 0;
      const newErrors: string[] = [];
      
      for (const caseData of parsedData) {
        try {
          await new Promise<void>((resolve, reject) => {
            createCase.mutate(
              {
                project_id: projectId,
                folder_id: folderId || undefined,
                title: caseData.title,
                description: caseData.description || undefined,
                preconditions: caseData.preconditions || undefined,
                status: 'draft',
              },
              {
                onSuccess: () => {
                  imported++;
                  resolve();
                },
                onError: (error) => {
                  newErrors.push(`Failed to import: ${caseData.title}`);
                  resolve(); // Continue even on error
                },
              }
            );
          });
        } catch (e) {
          newErrors.push(`Failed to import: ${caseData.title}`);
        }
        
        setProgress(Math.round(((imported + newErrors.length) / total) * 100));
      }
      
      setErrors(newErrors);
      
      if (imported > 0) {
        toast.success(`Imported ${imported} of ${total} test cases`);
        onSuccess?.();
      }
      
      if (newErrors.length === 0) {
        handleClose();
      }
    } catch (error) {
      toast.error('Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setStep('upload');
    setFile(null);
    setParsedData([]);
    setProgress(0);
    setErrors([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Import Test Cases
          </DialogTitle>
          <DialogDescription>
            Import test cases from a CSV file
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
            `}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">
              {isDragActive ? 'Drop the file here' : 'Drag & drop a file here'}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              Supported format: CSV (.csv)
            </p>
            <div className="mt-4 p-3 bg-muted rounded-lg text-xs text-left">
              <p className="font-medium mb-1">Expected columns:</p>
              <p className="text-muted-foreground">title, description, objective, preconditions</p>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <FileText className="h-5 w-5" />
              <span className="font-medium">{file?.name}</span>
              <span className="text-muted-foreground">
                ({parsedData.length} test cases)
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto"
                onClick={() => setStep('upload')}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="max-h-64 overflow-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-medium">#</th>
                    <th className="text-left p-2 font-medium">Title</th>
                    <th className="text-left p-2 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.slice(0, 10).map((c, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2 text-muted-foreground">{i + 1}</td>
                      <td className="p-2">{c.title}</td>
                      <td className="p-2 truncate max-w-48">{c.description || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedData.length > 10 && (
                <p className="p-2 text-center text-muted-foreground text-sm">
                  ... and {parsedData.length - 10} more
                </p>
              )}
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="space-y-4 py-4">
            <div className="text-center">
              <p className="text-lg font-medium mb-2">Importing...</p>
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground mt-2">
                {progress}% complete
              </p>
            </div>
            
            {errors.length > 0 && (
              <div className="max-h-32 overflow-auto space-y-1">
                {errors.map((err, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {err}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isImporting}>
            Cancel
          </Button>
          {step === 'preview' && (
            <Button onClick={handleImport}>
              Import {parsedData.length} Cases
            </Button>
          )}
          {step === 'importing' && progress === 100 && errors.length > 0 && (
            <Button onClick={handleClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
