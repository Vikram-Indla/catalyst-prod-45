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
import { useStore, type Generation } from '@/stores/requirementAssistStore';
import { useKeyboardShortcuts, usePrograms } from '@/hooks/requirement-assist';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';

type PageState = 'input' | 'generating' | 'results';

// Mock generation function - replace with actual API call
async function mockGenerateRequirements(
  requirements: string,
  programId: string,
  projectId: string,
  onProgress?: (progress: number, step: number) => void
): Promise<Generation> {
  const id = uuidv4();
  const wordCount = requirements.trim().split(/\s+/).filter(Boolean).length;
  
  // Simulate progress updates
  for (let i = 0; i <= 100; i += 5) {
    await new Promise(resolve => setTimeout(resolve, 100));
    const step = i < 25 ? 1 : i < 50 ? 2 : i < 75 ? 3 : 4;
    onProgress?.(i, step);
  }
  
  const complexity = wordCount / 30;
  const epicCount = Math.max(1, Math.floor(complexity)) + 1;
  const featureCount = Math.max(2, Math.floor(complexity * 2)) + 2;
  const storyCount = Math.max(4, Math.floor(complexity * 4)) + 4;
  
  return {
    id,
    displayId: `RA-${Date.now().toString(36).toUpperCase()}`,
    title: null,
    inputText: requirements,
    inputWordCount: wordCount,
    analysis: {
      actors: [],
      functions: [],
      nfrs: [],
      integrations: [],
      complexity: 'medium',
      warnings: [],
      suggestions: [],
    },
    programId,
    projectId,
    status: 'completed',
    progress: 100,
    currentStep: null,
    errorMessage: null,
    epicCount,
    featureCount,
    storyCount,
    totalCount: epicCount + featureCount + storyCount,
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  };
}

// Mock work items generator
function generateMockWorkItems(generation: Generation) {
  const items: any[] = [];
  const { epicCount, featureCount, storyCount } = generation;
  
  // Generate epics
  for (let e = 0; e < epicCount; e++) {
    const epicId = uuidv4();
    items.push({
      id: epicId,
      generationId: generation.id,
      parentId: null,
      itemType: 'epic',
      level: 0,
      sortOrder: e,
      displayId: `EPIC-${e + 1}`,
      title: `Epic ${e + 1}: System capability from requirements`,
      description: 'Auto-generated epic based on input requirements. This epic encompasses the core functionality described in the input.',
      acceptanceCriteria: [],
      confidenceScore: 0.85 + Math.random() * 0.1,
      confidenceReason: null,
      isSelected: true,
      isEdited: false,
      isPublished: false,
      publishedAt: null,
    });
    
    // Generate features for each epic
    const featuresPerEpic = Math.ceil(featureCount / epicCount);
    for (let f = 0; f < featuresPerEpic; f++) {
      const featureId = uuidv4();
      items.push({
        id: featureId,
        generationId: generation.id,
        parentId: epicId,
        itemType: 'feature',
        level: 1,
        sortOrder: f,
        displayId: `FEAT-${e * featuresPerEpic + f + 1}`,
        title: `Feature ${f + 1}: Supporting capability`,
        description: 'Auto-generated feature that supports the parent epic functionality.',
        acceptanceCriteria: [],
        confidenceScore: 0.80 + Math.random() * 0.1,
        confidenceReason: null,
        isSelected: true,
        isEdited: false,
        isPublished: false,
        publishedAt: null,
      });
      
      // Generate stories for each feature
      const storiesPerFeature = Math.ceil(storyCount / featureCount);
      for (let s = 0; s < storiesPerFeature && s < 3; s++) {
        items.push({
          id: uuidv4(),
          generationId: generation.id,
          parentId: featureId,
          itemType: 'story',
          level: 2,
          sortOrder: s,
          displayId: `STORY-${(e * featuresPerEpic + f) * storiesPerFeature + s + 1}`,
          title: `User Story ${s + 1}: As a user, I want to perform an action`,
          description: 'Auto-generated user story with clear acceptance criteria.',
          acceptanceCriteria: [
            'Given a precondition is met',
            'When the user performs an action',
            'Then the expected outcome occurs'
          ],
          confidenceScore: 0.75 + Math.random() * 0.15,
          confidenceReason: null,
          isSelected: true,
          isEdited: false,
          isPublished: false,
          publishedAt: null,
        });
      }
    }
  }
  
  return items;
}

export function RequirementAssistPageRedesign() {
  // Initialize hooks
  useKeyboardShortcuts();
  usePrograms();
  
  const { toast } = useToast();

  const [state, setState] = useState<PageState>('input');
  const [showHistory, setShowHistory] = useState(false);
  const [historyGenerations, setHistoryGenerations] = useState<Generation[]>([]);
  
  const { 
    generation, 
    setGeneration, 
    setWorkItems,
    setGenerating,
    resetGeneration,
    inputText,
    programId,
    projectId,
    expandAll,
  } = useStore();

  // Check if we have a previous generation to restore
  useEffect(() => {
    if (generation && generation.status === 'completed') {
      setState('results');
    }
  }, []);

  const startGeneration = useCallback(async (requirements: string, progId: string, projId: string) => {
    setState('generating');
    setGenerating(true);
    
    try {
      const result = await mockGenerateRequirements(requirements, progId, projId);
      setGeneration(result);
      
      // Generate mock work items
      const workItems = generateMockWorkItems(result);
      setWorkItems(workItems);
      
      // Update generation with total count
      result.totalCount = workItems.length;
      setGeneration(result);
      
      // Expand all items by default
      expandAll();
      
      setState('results');
      
      toast({
        title: "Generation Complete!",
        description: `Created ${result.epicCount} epics, ${result.featureCount} features, and ${result.storyCount} stories.`,
      });
    } catch (error) {
      console.error('Generation failed:', error);
      toast({
        title: "Generation Failed",
        description: "An error occurred during generation. Please try again.",
        variant: "destructive"
      });
      setState('input');
    } finally {
      setGenerating(false);
    }
  }, [setGeneration, setWorkItems, setGenerating, expandAll, toast]);

  const handleCancel = useCallback(() => {
    setGenerating(false);
    setState('input');
  }, [setGenerating]);

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
    resetGeneration();
    setState('input');
  }, [resetGeneration]);

  const loadGeneration = useCallback((gen: Generation) => {
    setGeneration(gen);
    setState('results');
    setShowHistory(false);
  }, [setGeneration]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-50">
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
