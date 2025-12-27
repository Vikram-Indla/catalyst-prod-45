import React from 'react';
import { EFDSession, EFD_STEPS } from '../types/efd.types';
import { useUpdateEFDSession } from '../hooks/useEFDSession';
import { EFDStepProgress } from './EFDStepProgress';
import { EFDSidebar } from './EFDSidebar';
import { SetupStep } from './steps/SetupStep';
import { ParseStep } from './steps/ParseStep';
import { ConfigureStep } from './steps/ConfigureStep';
import { GenerateEpicsStep } from './steps/GenerateEpicsStep';
import { SelectEpicsStep } from './steps/SelectEpicsStep';
import { GenerateFeaturesStep } from './steps/GenerateFeaturesStep';
import { MappingStep } from './steps/MappingStep';
import { RTMStep } from './steps/RTMStep';
import { QAGatesStep } from './steps/QAGatesStep';
import { ApprovalStep } from './steps/ApprovalStep';
import { PublishStep } from './steps/PublishStep';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface EFDWizardProps {
  session: EFDSession;
}

export const EFDWizard: React.FC<EFDWizardProps> = ({ session }) => {
  const updateSession = useUpdateEFDSession();
  const currentStep = session.current_step;
  
  // Steps 8-10 are full width (no sidebar)
  const showSidebar = currentStep < 8;

  const goToStep = (step: number) => {
    if (step >= 0 && step <= 10) {
      updateSession.mutate({ sessionId: session.id, updates: { current_step: step } });
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <SetupStep session={session} />;
      case 1:
        return <ParseStep session={session} />;
      case 2:
        return <ConfigureStep session={session} />;
      case 3:
        return <GenerateEpicsStep session={session} />;
      case 4:
        return <SelectEpicsStep session={session} />;
      case 5:
        return <GenerateFeaturesStep session={session} />;
      case 6:
        return <MappingStep session={session} />;
      case 7:
        return <RTMStep session={session} />;
      case 8:
        return <QAGatesStep session={session} />;
      case 9:
        return <ApprovalStep session={session} />;
      case 10:
        return <PublishStep session={session} />;
      default:
        return <SetupStep session={session} />;
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Progress Bar */}
      <EFDStepProgress currentStep={currentStep} onStepClick={goToStep} />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Step Content */}
        <div className={`flex-1 overflow-auto p-6 ${showSidebar ? '' : ''}`}>
          {renderStep()}
        </div>

        {/* Sidebar */}
        {showSidebar && (
          <div className="w-80 border-l bg-muted/30 overflow-auto">
            <EFDSidebar session={session} />
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="border-t bg-background px-6 py-3 flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => goToStep(currentStep - 1)}
          disabled={currentStep === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>

        <span className="text-sm text-muted-foreground">
          Step {currentStep + 1} of {EFD_STEPS.length}
        </span>

        <Button
          onClick={() => goToStep(currentStep + 1)}
          disabled={currentStep === 10}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};
