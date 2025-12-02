import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ImportStep1Upload } from './ImportStep1Upload';
import { ImportStep2Mapping } from './ImportStep2Mapping';
import { ImportStep3Validation } from './ImportStep3Validation';
import { ImportStep4Options } from './ImportStep4Options';
import { ImportStep5Progress } from './ImportStep5Progress';
import { ImportStep6Summary } from './ImportStep6Summary';
import {
  ImportPreview,
  ColumnMapping,
  ValidationResult,
  ImportOptions,
  ImportResult,
} from '@/services/importService';

interface ImportFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programId: string;
}

export function ImportFlow({ open, onOpenChange, programId }: ImportFlowProps) {
  const [step, setStep] = useState(1);
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
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleClose = () => {
    setStep(1);
    setFile(null);
    setPreview(null);
    setMapping({});
    setValidation(null);
    setImportResult(null);
    onOpenChange(false);
  };

  const getStepTitle = () => {
    switch (step) {
      case 1: return 'Step 1 of 6: Upload File';
      case 2: return 'Step 2 of 6: Column Mapping';
      case 3: return 'Step 3 of 6: Validation Preview';
      case 4: return 'Step 4 of 6: Import Options';
      case 5: return 'Step 5 of 6: Import Progress';
      case 6: return 'Import Complete';
      default: return 'Import Test Cases';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getStepTitle()}</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <ImportStep1Upload
            onFileSelected={(file, preview) => {
              setFile(file);
              setPreview(preview);
              setStep(2);
            }}
            onCancel={handleClose}
          />
        )}

        {step === 2 && preview && (
          <ImportStep2Mapping
            preview={preview}
            mapping={mapping}
            onMappingChange={setMapping}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
            onCancel={handleClose}
          />
        )}

        {step === 3 && file && (
          <ImportStep3Validation
            file={file}
            mapping={mapping}
            onValidationComplete={(validation) => {
              setValidation(validation);
              setStep(4);
            }}
            onBack={() => setStep(2)}
            onCancel={handleClose}
          />
        )}

        {step === 4 && (
          <ImportStep4Options
            options={options}
            onOptionsChange={setOptions}
            onBack={() => setStep(3)}
            onNext={() => setStep(5)}
            onCancel={handleClose}
          />
        )}

        {step === 5 && file && (
          <ImportStep5Progress
            file={file}
            mapping={mapping}
            options={options}
            programId={programId}
            onComplete={(result) => {
              setImportResult(result);
              setStep(6);
            }}
            onCancel={handleClose}
          />
        )}

        {step === 6 && importResult && (
          <ImportStep6Summary
            result={importResult}
            onClose={handleClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
