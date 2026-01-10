import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Save, Rocket, Search, Settings, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useWizardState } from './hooks/useWizardState';
import { WizardProgress } from './components/WizardProgress';
import { InputStep } from './components/InputStep';
import { ConfigureStep } from './components/ConfigureStep';
import { GenerateStep } from './components/GenerateStep';
import { ReviewStep } from './components/ReviewStep';
import { PublishStep } from './components/PublishStep';
import { SettingsModal } from './components/SettingsModal';
import { SearchModal } from './components/SearchModal';
import { RANavigationTabs } from './components/RANavigationTabs';

interface LocationState {
  generationId?: string;
}

export default function RequirementAssistWizard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  
  // Check for generation ID passed from History page
  const locationState = location.state as LocationState | null;
  const loadedGenerationId = locationState?.generationId;
  
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

  // Load generation data if ID is provided
  useEffect(() => {
    if (loadedGenerationId) {
      toast.info(`Loading generation ${loadedGenerationId}...`);
      // In a real implementation, fetch the generation data here
      // For now, just show a toast
    }
  }, [loadedGenerationId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘K or Ctrl+K to open search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      
      // ⌘S or Ctrl+S to save draft
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSaveDraft();
      }
      
      // Escape to close modals (handled in modal components)
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleStepClick = (step: number) => {
    // Don't allow clicking on step 3 (Generate) or step 5 (Success)
    if (step === 3 || step === 5) return;
    // Don't allow clicking on future steps
    if (step > state.currentStep) return;
    setCurrentStep(step);
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
  };

  const handleReset = () => {
    reset();
    setCurrentStep(1);
  };

  const handleViewHistory = () => {
    navigate('/operations/requirement-assist/history');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-[#e2e8f0] px-6 py-3">
        <div className="flex items-center gap-2 text-[13px]">
          <span className="text-[#94a3b8]">Operations</span>
          <ChevronRight className="w-3.5 h-3.5 text-[#94a3b8]" />
          <span className="font-semibold text-[#0f172a]">Requirement Assist™</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <RANavigationTabs />

      {/* Header with search */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-card">
        <WizardProgress
          currentStep={state.currentStep}
          onStepClick={handleStepClick}
          draftSaved={state.inputContent.length > 0}
        />
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-2 bg-muted border rounded-lg text-sm text-muted-foreground hover:border-primary transition-colors"
          >
            <Search className="w-4 h-4" />
            <span>Search...</span>
            <kbd className="ml-2 px-1.5 py-0.5 text-[10px] bg-background border rounded">⌘K</kbd>
          </button>
          
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            aria-label="Open settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 pb-6 pt-4">
        {state.currentStep === 1 && (
          <InputStep
            content={state.inputContent}
            onContentChange={setInputContent}
            uploadedFile={state.uploadedFile}
            onFileUpload={setUploadedFile}
            selectedOutputs={state.selectedOutputs}
            onToggleOutput={toggleOutput}
            onOpenSettings={() => setSettingsOpen(true)}
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
            onCreateAnother={handleReset}
            onOpenInCatalyst={() => toast.success('Opening in Catalyst...')}
            onUndo={handleUndo}
            onViewHistory={handleViewHistory}
          />
        )}
      </div>

      {/* Footer - hide during Generate and Publish steps */}
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

      {/* Modals */}
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
