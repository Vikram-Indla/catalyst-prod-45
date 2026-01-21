/**
 * Module 3C-2: Main Batch Export Wizard
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, Download, X } from 'lucide-react';
import { useBatchExport } from '../../hooks/useBatchExport';
import { StepIndicator } from './StepIndicator';
import { FormatSelector } from './FormatSelector';
import { FieldSelector } from './FieldSelector';
import { ExportProgress } from './ExportProgress';
import { ExportResults } from './ExportResults';

interface BatchExportProps {
  projectId: string;
  onClose?: () => void;
}

export function BatchExport({ projectId, onClose }: BatchExportProps) {
  const export_ = useBatchExport(projectId);

  const renderStepContent = () => {
    switch (export_.currentStep) {
      case 1:
        return (
          <FormatSelector
            selectedFormat={export_.format}
            onSelect={export_.selectFormat}
          />
        );
      case 2:
        return (
          <FieldSelector
            fields={export_.fields}
            onToggle={export_.toggleField}
            onSelectAll={export_.selectAllFields}
            onSelectRequired={export_.selectRequiredOnly}
          />
        );
      case 3:
        if (export_.status === 'completed' && export_.result) {
          return (
            <ExportResults
              result={export_.result}
              onDownload={export_.downloadResult}
              onNewExport={export_.reset}
            />
          );
        }
        return (
          <ExportProgress
            status={export_.status}
            progress={export_.progress}
            format={export_.format}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Export Test Cases</CardTitle>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </CardHeader>

      <CardContent>
        <StepIndicator
          currentStep={export_.currentStep}
          onStepClick={export_.status !== 'processing' ? export_.goToStep : undefined}
        />
        {renderStepContent()}
      </CardContent>

      <CardFooter className="flex justify-between">
        {export_.currentStep > 1 && export_.status !== 'processing' && export_.status !== 'completed' ? (
          <Button variant="outline" onClick={export_.prevStep}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        ) : (
          <div />
        )}

        {export_.currentStep < 3 && (
          <Button onClick={export_.currentStep === 2 ? export_.executeExport : export_.nextStep} disabled={!export_.canProceed}>
            {export_.currentStep === 2 ? (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export
              </>
            ) : (
              <>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
