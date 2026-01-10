import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Save, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useWizardState } from './hooks/useWizardState';
import { WizardProgress } from './components/WizardProgress';
import { InputStep } from './components/InputStep';
import { ConfigureStep } from './components/ConfigureStep';
import { GenerateStep } from './components/GenerateStep';
import { ReviewStep } from './components/ReviewStep';
import { PublishStep } from './components/PublishStep';

export default function RequirementAssistWizard() {
  const navigate = useNavigate();
  const {
    state,
    setCurrentStep,
    setInputContent,
    setUploadedFile,
    toggleOutput,
    setSelectedProgram,
    setSelectedProject,
    setSelectedTheme,
    setGeneratedItems,
    reset,
  } = useWizardState();

  const handleStepClick = (step: number) => {
    if (step < state.currentStep) setCurrentStep(step);
  };

  const handleNext = () => {
    if (state.currentStep === 2 && (!state.selectedProgram || !state.selectedProject)) {
      toast.error('Please select a Program and Project');
      return;
    }
    if (state.currentStep < 5) setCurrentStep(state.currentStep + 1);
  };

  const handleBack = () => {
    if (state.currentStep > 1) setCurrentStep(state.currentStep - 1);
  };

  const handleSaveDraft = () => {
    toast.success('Draft saved successfully');
  };

  const handleGenerateComplete = () => {
    setCurrentStep(4);
  };

  const handlePublish = () => {
    setCurrentStep(5);
    toast.success('Published successfully!');
  };

  const handleUndo = () => {
    setCurrentStep(4);
    toast.success('Publish undone');
  };

  return (
    <div className="flex flex-col h-full">
      <WizardProgress
        currentStep={state.currentStep}
        onStepClick={handleStepClick}
        draftSaved={state.inputContent.length > 0}
      />

      <div className="flex-1 overflow-auto px-6 pb-6">
        {state.currentStep === 1 && (
          <InputStep
            content={state.inputContent}
            onContentChange={setInputContent}
            uploadedFile={state.uploadedFile}
            onFileUpload={setUploadedFile}
            selectedOutputs={state.selectedOutputs}
            onToggleOutput={toggleOutput}
          />
        )}

        {state.currentStep === 2 && (
          <ConfigureStep
            selectedProgram={state.selectedProgram}
            onProgramChange={setSelectedProgram}
            selectedProject={state.selectedProject}
            onProjectChange={setSelectedProject}
            selectedTheme={state.selectedTheme}
            onThemeChange={setSelectedTheme}
          />
        )}

        {state.currentStep === 3 && (
          <GenerateStep
            onComplete={handleGenerateComplete}
            onCancel={() => setCurrentStep(1)}
          />
        )}

        {state.currentStep === 4 && (
          <ReviewStep
            items={state.generatedItems}
            onUpdateItem={(id, updates) => {
              setGeneratedItems(state.generatedItems.map(item =>
                item.id === id ? { ...item, ...updates } : item
              ));
            }}
            onRemoveItem={(id) => {
              setGeneratedItems(state.generatedItems.filter(item => item.id !== id));
            }}
          />
        )}

        {state.currentStep === 5 && (
          <PublishStep
            onCreateAnother={reset}
            onOpenInCatalyst={() => toast.success('Opening in Catalyst...')}
            onUndo={handleUndo}
          />
        )}
      </div>

      {state.currentStep !== 3 && state.currentStep !== 5 && (
        <div className="flex justify-between items-center px-6 py-4 bg-card border-t sticky bottom-0">
          <div>
            {state.currentStep > 1 && (
              <Button variant="ghost" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleSaveDraft}>
              <Save className="w-4 h-4 mr-2" /> Save Draft
            </Button>
            <Button onClick={state.currentStep === 4 ? handlePublish : handleNext}>
              {state.currentStep === 4 ? (
                <><Rocket className="w-4 h-4 mr-2" /> Publish</>
              ) : (
                <>Continue <ArrowRight className="w-4 h-4 ml-2" /></>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
