import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Save, Rocket, Search, Settings, ChevronRight, Loader2 } from 'lucide-react';
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
import { 
  useCreateRAGeneration, 
  useUpdateRAGeneration,
  usePublishRAGeneration,
  useRAGeneration,
} from '@/hooks/requirement-assist';
import { 
  useRAGeneratedItems,
  useBulkCreateRAGeneratedItems,
  useUpdateRAGeneratedItem,
  useDeleteRAGeneratedItem,
} from '@/hooks/requirement-assist';
import { useRAAISettings } from '@/hooks/requirement-assist';
import { supabase } from '@/integrations/supabase/client';
import type { CreateRAGeneratedItem, ItemType } from '@/types/requirement-assist';

interface LocationState {
  generationId?: string;
}

export default function RequirementAssistWizard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isCreatingGeneration, setIsCreatingGeneration] = useState(false);
  
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
    setGenerationId,
    setProcessingMetrics,
    reset,
  } = useWizardState();

  // Mutations
  const createGeneration = useCreateRAGeneration();
  const updateGeneration = useUpdateRAGeneration();
  const publishGeneration = usePublishRAGeneration();
  const bulkCreateItems = useBulkCreateRAGeneratedItems();
  const updateItem = useUpdateRAGeneratedItem();
  const deleteItem = useDeleteRAGeneratedItem();
  
  // Fetch AI settings for defaults
  const { data: aiSettings } = useRAAISettings();
  
  // Load existing generation if ID provided
  const { data: existingGeneration } = useRAGeneration(loadedGenerationId);
  const { data: existingItems } = useRAGeneratedItems(loadedGenerationId);

  // Load generation data if ID is provided
  useEffect(() => {
    if (existingGeneration && loadedGenerationId) {
      setGenerationId(existingGeneration.id, existingGeneration.display_id);
      setInputContent(existingGeneration.input_text || '');
      
      if (existingGeneration.program_id) {
        // Would need to fetch program details - simplified for now
        setSelectedProgram({ 
          id: existingGeneration.program_id, 
          name: 'Loaded Program',
          nextEpic: 'EPIC-001',
          nextFeat: 'FEAT-001',
        });
      }
      
      if (existingGeneration.project_id) {
        setSelectedProject({
          id: existingGeneration.project_id,
          name: 'Loaded Project',
          nextStory: 'US-001',
        });
      }
      
      // Go to review step if generation exists with items
      if (existingItems && existingItems.length > 0) {
        // Map database items to local format
        const mappedItems = existingItems.map(item => ({
          id: item.id,
          type: item.item_type as 'epic' | 'feature' | 'story' | 'prd',
          key: item.display_id,
          title: item.title,
          description: item.description || '',
          confidence: item.confidence_score || 0,
          confidenceBreakdown: item.confidence_breakdown as any,
        }));
        setGeneratedItems(mappedItems);
        setCurrentStep(4);
      }
      
      toast.info(`Loaded generation ${existingGeneration.display_id}`);
    }
  }, [existingGeneration, existingItems, loadedGenerationId]);

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
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [state.generationId]);

  const handleStepClick = (step: number) => {
    // Don't allow clicking on step 3 (Generate) or step 5 (Success)
    if (step === 3 || step === 5) return;
    // Don't allow clicking on future steps
    if (step > state.currentStep) return;
    setCurrentStep(step);
  };

  // Create generation record when moving from Step 2 to Step 3
  const handleStartGeneration = async () => {
    if (!state.selectedProgram || !state.selectedProject) {
      toast.error('Please select a Program and Project');
      return;
    }

    setIsCreatingGeneration(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create generation record with status='processing'
      const newGeneration = await createGeneration.mutateAsync({
        title: state.inputContent.slice(0, 100) || 'New Generation',
        status: 'processing',
        program_id: state.selectedProgram.id,
        project_id: state.selectedProject.id,
        user_id: user?.id,
        input_text: state.inputContent,
        input_word_count: state.inputContent.split(/\s+/).filter(Boolean).length,
        ai_model: aiSettings?.ai_model || 'claude-3.5-sonnet',
        temperature: aiSettings?.temperature || 0.7,
        max_tokens: aiSettings?.max_tokens || 4000,
        tokens_used: 0,
        output_prd: false,
        output_epics: state.selectedOutputs.epics,
        output_features: state.selectedOutputs.features,
        output_stories: state.selectedOutputs.stories,
        output_test_cases: state.selectedOutputs.tests,
        output_acceptance_criteria: true,
        compliance_dga: true,
        compliance_nca: true,
        compliance_babok: true,
      });

      setGenerationId(newGeneration.id, newGeneration.display_id);
      setCurrentStep(3);
    } catch (error) {
      console.error('Failed to create generation:', error);
      toast.error('Failed to start generation');
    } finally {
      setIsCreatingGeneration(false);
    }
  };

  const handleNext = () => {
    if (state.currentStep === 2) {
      // Moving from Configure to Generate - create generation record
      handleStartGeneration();
      return;
    }
    
    if (state.currentStep < 5) setCurrentStep(state.currentStep + 1);
  };

  const handleBack = () => {
    if (state.currentStep > 1) setCurrentStep(state.currentStep - 1);
  };

  const handleSaveDraft = async () => {
    if (state.generationId) {
      // Update existing generation
      await updateGeneration.mutateAsync({
        id: state.generationId,
        input_text: state.inputContent,
        input_word_count: state.inputContent.split(/\s+/).filter(Boolean).length,
      });
    }
    toast.success('Draft saved successfully');
  };

  // Called when GenerateStep completes - save generated items
  const handleGenerateComplete = async (
    items: Array<{
      type: ItemType;
      title: string;
      description: string;
      confidence: number;
      confidenceBreakdown?: Record<string, number>;
      parentId?: string;
    }>,
    metrics: { tokensUsed: number; processingTimeMs: number }
  ) => {
    if (!state.generationId) {
      toast.error('No generation ID found');
      return;
    }

    try {
      // Create items in database
      const itemsToCreate: CreateRAGeneratedItem[] = items.map((item, index) => ({
        generation_id: state.generationId!,
        item_type: item.type,
        title: item.title,
        description: item.description,
        sort_order: index,
        confidence_score: item.confidence,
        confidence_breakdown: item.confidenceBreakdown,
        parent_id: item.parentId,
        is_published: false,
        is_linked: false,
      }));

      const createdItems = await bulkCreateItems.mutateAsync(itemsToCreate);

      // Map to local format for display
      const mappedItems = createdItems.map(item => ({
        id: item.id,
        type: item.item_type as 'epic' | 'feature' | 'story' | 'prd',
        key: item.display_id,
        title: item.title,
        description: item.description || '',
        confidence: item.confidence_score || 0,
        confidenceBreakdown: item.confidence_breakdown as any,
      }));

      setGeneratedItems(mappedItems);
      setProcessingMetrics(metrics.tokensUsed, metrics.processingTimeMs);

      // Update generation status to 'draft' and save metrics
      await updateGeneration.mutateAsync({
        id: state.generationId,
        status: 'draft',
        tokens_used: metrics.tokensUsed,
        processing_time_ms: metrics.processingTimeMs,
      });

      setCurrentStep(4);
    } catch (error) {
      console.error('Failed to save generated items:', error);
      toast.error('Failed to save generated items');
      
      // Update generation status to 'failed'
      if (state.generationId) {
        await updateGeneration.mutateAsync({
          id: state.generationId,
          status: 'failed',
        });
      }
    }
  };

  // Handle item updates in Review step
  const handleUpdateItem = async (id: string, updates: { title?: string; description?: string }) => {
    // Update local state first for immediate feedback
    setGeneratedItems(state.generatedItems.map(item =>
      item.id === id ? { ...item, ...updates } : item
    ));

    // Persist to database
    try {
      await updateItem.mutateAsync({ id, ...updates });
    } catch (error) {
      console.error('Failed to update item:', error);
      toast.error('Failed to save changes');
    }
  };

  // Handle item removal in Review step
  const handleRemoveItem = async (id: string) => {
    if (!state.generationId) return;

    // Update local state
    setGeneratedItems(state.generatedItems.filter(item => item.id !== id));

    // Delete from database
    try {
      await deleteItem.mutateAsync({ id, generationId: state.generationId });
    } catch (error) {
      console.error('Failed to delete item:', error);
      toast.error('Failed to remove item');
    }
  };

  const handlePublish = async () => {
    if (!state.generationId) {
      toast.error('No generation to publish');
      return;
    }

    try {
      await publishGeneration.mutateAsync(state.generationId);
      setCurrentStep(5);
    } catch (error) {
      console.error('Failed to publish:', error);
      toast.error('Failed to publish generation');
    }
  };

  const handleUndo = async () => {
    if (state.generationId) {
      // Revert to draft status
      await updateGeneration.mutateAsync({
        id: state.generationId,
        status: 'draft',
        published_at: undefined,
      });
    }
    setCurrentStep(4);
  };

  const handleReset = () => {
    reset();
    setCurrentStep(1);
  };

  const handleViewHistory = () => {
    navigate('/product/requirement-assist/history');
  };

  const isProcessing = isCreatingGeneration || createGeneration.isPending;

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-[#e2e8f0] px-6 py-3">
        <div className="flex items-center gap-2 text-[13px]">
          <span className="text-[#94a3b8]">Product</span>
          <ChevronRight className="w-3.5 h-3.5 text-[#94a3b8]" />
          <span className="font-semibold text-[#0f172a]">Requirement Assist™</span>
          {state.generationDisplayId && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-[#94a3b8]" />
              <span className="text-primary font-medium">{state.generationDisplayId}</span>
            </>
          )}
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
            generationId={state.generationId}
            inputText={state.inputContent}
            selectedOutputs={state.selectedOutputs}
            settings={{
              model: aiSettings?.ai_model,
              temperature: aiSettings?.temperature,
              maxTokens: aiSettings?.max_tokens,
              systemPrompt: aiSettings?.system_prompt,
            }}
            onComplete={handleGenerateComplete}
            onCancel={() => setCurrentStep(1)}
          />
        )}

        {state.currentStep === 4 && (
          <ReviewStep
            items={state.generatedItems}
            generationId={state.generationId}
            onUpdateItem={(id, updates) => handleUpdateItem(id, updates)}
            onRemoveItem={handleRemoveItem}
          />
        )}

        {state.currentStep === 5 && (
          <PublishStep
            generationDisplayId={state.generationDisplayId}
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
              <Button variant="ghost" onClick={handleBack} disabled={isProcessing}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleSaveDraft} disabled={isProcessing}>
              <Save className="w-4 h-4 mr-2" /> Save Draft
            </Button>
            <Button 
              onClick={state.currentStep === 4 ? handlePublish : handleNext}
              disabled={isProcessing || publishGeneration.isPending}
            >
              {isProcessing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
              ) : state.currentStep === 4 ? (
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
