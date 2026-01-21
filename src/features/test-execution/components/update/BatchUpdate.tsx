/**
 * Module 3C-3: Main Batch Update Wizard
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, ArrowRight, RefreshCw, X, AlertTriangle } from 'lucide-react';
import { useBatchUpdate } from '../../hooks/useBatchUpdate';
import { UpdateStepIndicator } from './UpdateStepIndicator';
import { FieldUpdateCard } from './FieldUpdateCard';
import { UpdateSummary } from './UpdateSummary';
import { ChangePreviewTable } from './ChangePreviewTable';
import { UpdateProgress } from './UpdateProgress';
import { UpdateResults } from './UpdateResults';
import { UPDATABLE_FIELDS } from '../../types/batch-update';

interface BatchUpdateProps {
  projectId: string;
  selectedTestCaseIds?: string[];
  onClose?: () => void;
}

export function BatchUpdate({ projectId, selectedTestCaseIds = [], onClose }: BatchUpdateProps) {
  const update = useBatchUpdate(projectId);

  // Initialize with pre-selected test cases if provided
  React.useEffect(() => {
    if (selectedTestCaseIds.length > 0 && update.selectedTestCases.length === 0) {
      update.setSelectedTestCases(selectedTestCaseIds);
    }
  }, [selectedTestCaseIds]);

  const handleNext = async () => {
    if (update.currentStep === 2) {
      await update.generatePreview();
    } else if (update.currentStep === 3) {
      await update.executeUpdate();
    } else {
      update.nextStep();
    }
  };

  const renderStepContent = () => {
    switch (update.currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Select Test Cases</h3>
              <p className="text-sm text-muted-foreground">
                Choose the test cases you want to update in bulk
              </p>
            </div>

            {update.selectedTestCases.length > 0 ? (
              <Alert>
                <AlertDescription>
                  {update.selectedTestCases.length} test case{update.selectedTestCases.length !== 1 ? 's' : ''} selected for update.
                  Click "Next" to configure the fields to update.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>No test cases selected</AlertTitle>
                <AlertDescription>
                  Please select at least one test case to proceed with the batch update.
                </AlertDescription>
              </Alert>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold">Configure Updates</h3>
              <p className="text-sm text-muted-foreground">
                Select the fields you want to update and set their new values
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {UPDATABLE_FIELDS.map(field => (
                <FieldUpdateCard
                  key={field.key}
                  field={field}
                  value={update.fieldsToUpdate[field.key]}
                  onValueChange={value => update.setFieldValue(field.key, value)}
                  onRemove={() => update.removeFieldUpdate(field.key)}
                />
              ))}
            </div>

            <UpdateSummary
              selectedCount={update.selectedTestCases.length}
              fieldsToUpdate={update.fieldsToUpdate}
            />
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold">Review Changes</h3>
              <p className="text-sm text-muted-foreground">
                Review the changes before applying them
              </p>
            </div>

            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertTitle className="text-yellow-800">Confirm Changes</AlertTitle>
              <AlertDescription className="text-yellow-700">
                You are about to update {update.preview.length} test case{update.preview.length !== 1 ? 's' : ''}.
                This action cannot be easily undone.
              </AlertDescription>
            </Alert>

            <ChangePreviewTable previews={update.preview} />
          </div>
        );

      case 4:
        if (update.status === 'completed' && update.result) {
          return (
            <UpdateResults
              result={update.result}
              onNewUpdate={update.reset}
            />
          );
        }
        return (
          <UpdateProgress
            status={update.status}
            progress={update.progress}
            totalRecords={update.selectedTestCases.length}
          />
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (update.currentStep) {
      case 1:
        return update.selectedTestCases.length > 0;
      case 2:
        return Object.keys(update.fieldsToUpdate).length > 0;
      case 3:
        return update.preview.length > 0;
      default:
        return false;
    }
  };

  const getNextButtonText = () => {
    switch (update.currentStep) {
      case 2:
        return update.isProcessing ? 'Generating...' : 'Preview Changes';
      case 3:
        return update.isProcessing ? 'Applying...' : 'Apply Changes';
      default:
        return 'Next';
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Batch Update Test Cases</CardTitle>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </CardHeader>

      <CardContent>
        <UpdateStepIndicator
          currentStep={update.currentStep}
          onStepClick={
            update.status !== 'executing' && update.status !== 'validating'
              ? update.goToStep
              : undefined
          }
        />
        {renderStepContent()}
      </CardContent>

      <CardFooter className="flex justify-between">
        {update.currentStep > 1 && update.currentStep < 4 && update.status === 'pending' ? (
          <Button variant="outline" onClick={update.prevStep} disabled={update.isProcessing}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        ) : (
          <div />
        )}

        {update.currentStep < 4 && (
          <Button
            onClick={handleNext}
            disabled={!canProceed() || update.isProcessing}
          >
            {update.isProcessing && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
            {getNextButtonText()}
            {update.currentStep < 3 && !update.isProcessing && (
              <ArrowRight className="w-4 h-4 ml-2" />
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
