import { useState, useCallback } from 'react';
import { WizardState, GeneratedItem } from '../types';

const initialState: WizardState = {
  currentStep: 1,
  inputContent: '',
  uploadedFile: null,
  selectedOutputs: {
    epics: true,
    features: true,
    stories: true,
    tests: false,
  },
  selectedProgram: null,
  selectedProject: null,
  selectedTheme: null,
  generatedItems: [],
  // Database integration fields
  generationId: null,
  generationDisplayId: null,
  tokensUsed: 0,
  processingTimeMs: 0,
};

export function useWizardState() {
  const [state, setState] = useState<WizardState>(initialState);

  const setCurrentStep = useCallback((step: number) => {
    setState(prev => ({ ...prev, currentStep: step }));
  }, []);

  const setInputContent = useCallback((content: string) => {
    setState(prev => ({ ...prev, inputContent: content }));
  }, []);

  const setUploadedFile = useCallback((file: File | null) => {
    setState(prev => ({ ...prev, uploadedFile: file }));
  }, []);

  const toggleOutput = useCallback((output: keyof WizardState['selectedOutputs']) => {
    setState(prev => ({
      ...prev,
      selectedOutputs: {
        ...prev.selectedOutputs,
        [output]: !prev.selectedOutputs[output],
      },
    }));
  }, []);

  const setSelectedProgram = useCallback((program: WizardState['selectedProgram']) => {
    setState(prev => ({ ...prev, selectedProgram: program }));
  }, []);

  const setSelectedProject = useCallback((project: WizardState['selectedProject']) => {
    setState(prev => ({ ...prev, selectedProject: project }));
  }, []);

  const setSelectedTheme = useCallback((theme: string | null) => {
    setState(prev => ({ ...prev, selectedTheme: theme }));
  }, []);

  const setGeneratedItems = useCallback((items: GeneratedItem[]) => {
    setState(prev => ({ ...prev, generatedItems: items }));
  }, []);

  // New: Set generation ID after creating in database
  const setGenerationId = useCallback((id: string | null, displayId?: string | null) => {
    setState(prev => ({ 
      ...prev, 
      generationId: id,
      generationDisplayId: displayId ?? null,
    }));
  }, []);

  // New: Set processing metrics
  const setProcessingMetrics = useCallback((tokensUsed: number, processingTimeMs: number) => {
    setState(prev => ({ ...prev, tokensUsed, processingTimeMs }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    state,
    setCurrentStep,
    setInputContent,
    setUploadedFile,
    toggleOutput,
    setSelectedProgram,
    setSelectedProject,
    setSelectedTheme,
    setGeneratedItems,
    setGenerationId,
    setProcessingMetrics,
    reset,
  };
}
