import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Upload, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileUploadZone } from './FileUploadZone';
import { ImportPreview } from './ImportPreview';
import { useImportTestCases, parseImportFile } from '@/hooks/useImportExport';
import { useToast } from '@/hooks/use-toast';

interface ImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

const FIELD_MAPPINGS = {
  title: 'Title',
  description: 'Description',
  test_type: 'Test Type',
  priority: 'Priority',
  status: 'Status',
  folder: 'Folder',
  steps: 'Steps',
};

export const ImportWizard: React.FC<ImportWizardProps> = ({ isOpen, onClose }) => {
  const { toast } = useToast();
  const importMutation = useImportTestCases();

  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mappedFields, setMappedFields] = useState<Record<string, string>>({});

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    try {
      const parsed = await parseImportFile(selectedFile);
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      
      // Auto-map columns
      const autoMapped: Record<string, string> = {};
      parsed.headers.forEach(header => {
        const lowerHeader = header.toLowerCase();
        Object.entries(FIELD_MAPPINGS).forEach(([key, value]) => {
          if (lowerHeader.includes(key) || lowerHeader.includes(value.toLowerCase())) {
            autoMapped[header] = key;
          }
        });
      });
      setMappedFields(autoMapped);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to parse file',
        variant: 'destructive',
      });
    }
  };

  const handleImport = async () => {
    if (!file || rows.length === 0) return;

    try {
      // Convert rows to test cases
      const testCases = rows.map(row => {
        const testCase: any = {};
        headers.forEach((header, idx) => {
          const field = mappedFields[header];
          if (field) {
            testCase[field] = row[idx];
          }
        });
        return testCase;
      }).filter(tc => tc.title); // Only include rows with titles

      const fileType = file.name.endsWith('.csv') ? 'csv' : 'excel';
      const result = await importMutation.mutateAsync({
        testCases,
        fileName: file.name,
        fileType,
      });

      toast({
        title: 'Import Complete',
        description: `Successfully imported ${result.imported_count} of ${result.imported_count + result.failed_count} test cases`,
      });

      handleClose();
    } catch (error: any) {
      toast({
        title: 'Import Failed',
        description: error.message || 'Failed to import test cases',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    setStep(1);
    setFile(null);
    setHeaders([]);
    setRows([]);
    setMappedFields({});
    onClose();
  };

  const canProceed = () => {
    if (step === 1) return file !== null;
    if (step === 2) return Object.keys(mappedFields).length > 0 && mappedFields[Object.keys(mappedFields).find(k => mappedFields[k] === 'title') || ''] === 'title';
    if (step === 3) return true;
    return false;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Test Cases</DialogTitle>
          <div className="flex items-center gap-2 mt-4">
            {[1, 2, 3].map((s) => (
              <React.Fragment key={s}>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  s < step ? 'bg-brand-gold border-brand-gold text-white' :
                  s === step ? 'border-brand-gold text-brand-gold' :
                  'border-border text-muted-foreground'
                }`}>
                  {s < step ? <Check className="h-4 w-4" /> : s}
                </div>
                {s < 3 && <div className={`flex-1 h-0.5 ${s < step ? 'bg-brand-gold' : 'bg-border'}`} />}
              </React.Fragment>
            ))}
          </div>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Step 1: Upload File</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Select an Excel (.xlsx, .xls) or CSV file containing your test cases
                </p>
              </div>
              <FileUploadZone
                onFileSelect={handleFileSelect}
                selectedFile={file}
                onClear={() => setFile(null)}
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Step 2: Map Columns</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Map your file columns to Catalyst test case fields
                </p>
              </div>
              <div className="space-y-3">
                {headers.map((header, idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <div className="flex-1 p-2 bg-muted rounded border border-border">
                      <span className="font-medium text-sm">{header}</span>
                    </div>
                    <span className="text-muted-foreground">→</span>
                    <div className="flex-1">
                      <Select
                        value={mappedFields[header] || ''}
                        onValueChange={(value) => setMappedFields(prev => ({ ...prev, [header]: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select field" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="skip">Skip</SelectItem>
                          {Object.entries(FIELD_MAPPINGS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
              {!mappedFields[Object.keys(mappedFields).find(k => mappedFields[k] === 'title') || ''] && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
                  ⚠️ Title field is required. Please map at least one column to "Title"
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Step 3: Preview & Import</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Review the data before importing
                </p>
              </div>
              <ImportPreview
                headers={headers}
                rows={rows}
                mappedFields={mappedFields}
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Step {step} of 3
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={importMutation.isPending}
            >
              Cancel
            </Button>
            {step > 1 && (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                disabled={importMutation.isPending}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
            {step < 3 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="bg-brand-gold text-white hover:bg-brand-gold-hover"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleImport}
                disabled={importMutation.isPending || !canProceed()}
                className="bg-brand-gold text-white hover:bg-brand-gold-hover"
              >
                {importMutation.isPending ? (
                  <>
                    <Upload className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import {rows.length} Test Cases
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
