import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  validateImportData,
  ColumnMapping,
  ValidationResult,
  downloadErrorReport,
} from '@/services/importService';
import { ChevronLeft, ChevronRight, Download, AlertTriangle } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface ImportStep3ValidationProps {
  file: File;
  mapping: ColumnMapping;
  onValidationComplete: (validation: ValidationResult) => void;
  onBack: () => void;
  onCancel: () => void;
}

export function ImportStep3Validation({
  file,
  mapping,
  onValidationComplete,
  onBack,
  onCancel,
}: ImportStep3ValidationProps) {
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [importMode, setImportMode] = useState<'create' | 'update' | 'hybrid'>('create');
  const [isValidating, setIsValidating] = useState(true);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    performValidation();
  }, []);

  const performValidation = async () => {
    setIsValidating(true);
    const result = await validateImportData(file, mapping);
    setValidation(result);
    setIsValidating(false);
  };

  const handleNext = () => {
    if (validation) {
      onValidationComplete(validation);
    }
  };

  if (isValidating) {
    return (
      <div className="py-12 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c69c6d] mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">Validating data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-4">Validation Results</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-green-600">
            <span>✓</span>
            <span>{validation?.validCount || 0} rows valid</span>
          </div>
          {(validation?.warningCount || 0) > 0 && (
            <div className="flex items-center gap-2 text-orange-600">
              <span>⚠</span>
              <span>{validation?.warningCount} rows have warnings</span>
            </div>
          )}
          {(validation?.errorCount || 0) > 0 && (
            <div className="flex items-center gap-2 text-red-600">
              <span>✗</span>
              <span>{validation?.errorCount} rows have errors (will be skipped)</span>
            </div>
          )}
        </div>
      </div>

      {validation && validation.errors.length > 0 && (
        <div className="space-y-2">
          <Collapsible open={showErrors} onOpenChange={setShowErrors}>
            <div className="flex items-center justify-between">
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  {showErrors ? 'Hide' : 'View'} Errors
                </Button>
              </CollapsibleTrigger>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadErrorReport(validation.errors)}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Error Report
              </Button>
            </div>
            <CollapsibleContent className="mt-2">
              <div className="max-h-40 overflow-y-auto rounded border p-2 text-sm">
                {validation.errors.slice(0, 10).map((error, index) => (
                  <div key={index} className="py-1 text-xs">
                    Row {error.row}: {error.field} - {error.message}
                  </div>
                ))}
                {validation.errors.length > 10 && (
                  <div className="py-1 text-xs text-muted-foreground">
                    ... and {validation.errors.length - 10} more errors
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      <div className="space-y-3">
        <Label>Import Mode</Label>
        <RadioGroup value={importMode} onValueChange={(v: any) => setImportMode(v)}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="create" id="create" />
            <Label htmlFor="create" className="font-normal">
              Create new cases
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="update" id="update" />
            <Label htmlFor="update" className="font-normal">
              Update existing (match by Key)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="hybrid" id="hybrid" />
            <Label htmlFor="hybrid" className="font-normal">
              Hybrid (create or update)
            </Label>
          </div>
        </RadioGroup>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleNext}
            className="bg-[#c69c6d] text-[#1a1a1a] hover:bg-[#b8905f]"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
