// ============================================================
// REQUIREMENT ASSIST PAGE (COMPLETE REDESIGN)
// 3-State Flow: INPUT → GENERATING → RESULTS
// Enterprise-grade UI with full interactivity
// ============================================================

import React, { useState, useCallback, useEffect } from 'react';
import { InputState } from './InputState';
import { GeneratingState } from './GeneratingState';
import { ResultsState } from './ResultsState';
import { HistorySlideOver } from './HistorySlideOver';
import { useRequirementAssistStore, type Generation } from '@/stores/requirementAssistStore';
import { useKeyboardShortcuts, usePrograms, useGeneration } from '@/hooks/requirement-assist';
import { useToast } from '@/hooks/use-toast';

type PageState = 'input' | 'generating' | 'results';

export function RequirementAssistPageRedesign() {
  // Initialize hooks
  useKeyboardShortcuts();
  usePrograms();
  
  const { toast } = useToast();
  const { startGeneration: triggerGeneration, cancelGeneration } = useGeneration();

  const [state, setState] = useState<PageState>('input');
  const [showHistory, setShowHistory] = useState(false);
  const [historyGenerations, setHistoryGenerations] = useState<Generation[]>([]);
  
  const { 
    generation, 
    setGeneration,
    workItems,
    setGenerating,
    isGenerating,
    resetGeneration,
    inputText,
    setInputText,
    programId,
    setProgramId,
    projectId,
    setProjectId,
    expandAll,
  } = useRequirementAssistStore();

  // Check if we have a previous generation to restore
  useEffect(() => {
    if (generation && generation.status === 'completed') {
      setState('results');
    }
  }, []);

  // Watch for generation completion
  useEffect(() => {
    // Consider 'draft' as completed when we have work items (edge function sets draft on completion)
    if (generation?.status === 'draft' || generation?.status === 'generating') {
      if (workItems.length > 0 && state === 'generating') {
        setState('results');
        expandAll();
        toast({
          title: "Generation Complete!",
          description: `Created ${workItems.filter(w => w.itemType === 'epic').length} epics, ${workItems.filter(w => w.itemType === 'feature').length} features, and ${workItems.filter(w => w.itemType === 'story').length} stories.`,
        });
      }
    }
  }, [generation?.status, workItems.length, state, expandAll, toast]);

  // Watch for generation errors
  useEffect(() => {
    if (!isGenerating && state === 'generating' && generation?.errorMessage) {
      toast({
        title: "Generation Failed",
        description: generation.errorMessage,
        variant: "destructive"
      });
      setState('input');
    }
  }, [isGenerating, generation?.errorMessage, state, toast]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to go back to input
      if (e.key === 'Escape' && state === 'results') {
        setState('input');
      }
      // Cmd+Shift+N for new session
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'n') {
        e.preventDefault();
        resetGeneration();
        setInputText('');
        setProgramId(null);
        setProjectId(null);
        setState('input');
        toast({
          title: "Session Cleared",
          description: "Ready for new requirements.",
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [state, resetGeneration, setInputText, setProgramId, setProjectId, toast]);

  const startGeneration = useCallback(async (requirements: string, progId: string, projId: string) => {
    // Update store with input values
    setInputText(requirements);
    setProgramId(progId);
    setProjectId(projId);
    
    setState('generating');
    
    // Trigger the real AI generation via edge function
    await triggerGeneration();
  }, [setInputText, setProgramId, setProjectId, triggerGeneration]);

  const handleCancel = useCallback(() => {
    cancelGeneration();
    setGenerating(false);
    setState('input');
  }, [cancelGeneration, setGenerating]);

  const handleComplete = useCallback((gen: Generation) => {
    setGeneration(gen);
    setState('results');
  }, [setGeneration]);

  const handleRegenerate = useCallback(() => {
    if (inputText && programId && projectId) {
      startGeneration(inputText, programId, projectId);
    }
  }, [inputText, programId, projectId, startGeneration]);

  const handleNew = useCallback(() => {
    // Go back to input but keep the text
    setState('input');
  }, []);

  const handleBack = useCallback(() => {
    // Go back to input, keep the text
    setState('input');
  }, []);

  const handleNewSession = useCallback(() => {
    // Clear everything and start fresh
    resetGeneration();
    setInputText('');
    setProgramId(null);
    setProjectId(null);
    setState('input');
    toast({
      title: "Session Cleared",
      description: "Ready for new requirements.",
    });
  }, [resetGeneration, setInputText, setProgramId, setProjectId, toast]);

  const loadGeneration = useCallback((gen: Generation) => {
    setGeneration(gen);
    setState('results');
    setShowHistory(false);
  }, [setGeneration]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">
      {state === 'input' && (
        <InputState 
          onStart={startGeneration} 
          onShowHistory={() => setShowHistory(true)} 
        />
      )}

      {state === 'generating' && (
        <GeneratingState 
          onCancel={handleCancel}
          onComplete={handleComplete}
        />
      )}

      {state === 'results' && generation && (
        <ResultsState 
          generation={generation}
          onRegenerate={handleRegenerate}
          onNew={handleNew}
          onBack={handleBack}
          onNewSession={handleNewSession}
        />
      )}

      <HistorySlideOver
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        onSelect={loadGeneration}
        generations={historyGenerations}
      />
    </div>
  );
}

export default RequirementAssistPageRedesign;
