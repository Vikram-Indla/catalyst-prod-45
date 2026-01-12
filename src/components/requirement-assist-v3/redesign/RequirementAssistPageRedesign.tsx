// ============================================================
// REQUIREMENT ASSIST PAGE (REDESIGN)
// 3-State Flow: INPUT → GENERATING → RESULTS
// ============================================================

import React, { useState, useCallback, useEffect } from 'react';
import { InputState } from './InputState';
import { GeneratingState } from './GeneratingState';
import { ResultsState } from './ResultsState';
import { HistorySlideOver } from './HistorySlideOver';
import { useStore, type Generation } from '@/stores/requirementAssistStore';
import { useKeyboardShortcuts, usePrograms } from '@/hooks/requirement-assist';
import { v4 as uuidv4 } from 'uuid';

type PageState = 'input' | 'generating' | 'results';

// Mock generation function - replace with actual API call
async function mockGenerateRequirements(
  requirements: string,
  programId: string,
  projectId: string
): Promise<Generation> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const id = uuidv4();
  const wordCount = requirements.trim().split(/\s+/).filter(Boolean).length;
  
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
    epicCount: Math.max(1, Math.floor(wordCount / 100)),
    featureCount: Math.max(1, Math.floor(wordCount / 40)),
    storyCount: Math.max(1, Math.floor(wordCount / 15)),
    totalCount: 0,
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
      title: `Epic ${e + 1}: Generated from requirements`,
      description: 'Auto-generated epic based on input requirements',
      acceptanceCriteria: [],
      confidenceScore: 0.85,
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
        description: 'Auto-generated feature',
        acceptanceCriteria: [],
        confidenceScore: 0.8,
        confidenceReason: null,
        isSelected: true,
        isEdited: false,
        isPublished: false,
        publishedAt: null,
      });
      
      // Generate stories for each feature
      const storiesPerFeature = Math.ceil(storyCount / featureCount);
      for (let s = 0; s < storiesPerFeature; s++) {
        items.push({
          id: uuidv4(),
          generationId: generation.id,
          parentId: featureId,
          itemType: 'story',
          level: 2,
          sortOrder: s,
          displayId: `STORY-${(e * featuresPerEpic + f) * storiesPerFeature + s + 1}`,
          title: `User Story ${s + 1}: As a user, I want...`,
          description: 'Auto-generated user story',
          acceptanceCriteria: ['Given...', 'When...', 'Then...'],
          confidenceScore: 0.75,
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
      
      setState('results');
    } catch (error) {
      console.error('Generation failed:', error);
      setState('input');
    } finally {
      setGenerating(false);
    }
  }, [setGeneration, setWorkItems, setGenerating]);

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
    <div className="h-screen flex flex-col overflow-hidden">
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
