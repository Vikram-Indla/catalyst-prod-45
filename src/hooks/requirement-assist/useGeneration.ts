// ============================================================
// USE GENERATION HOOK
// Handles all generation logic including Supabase realtime
// ============================================================

import { useCallback, useEffect, useRef } from 'react';
import { useRequirementAssistStore, type Generation } from '@/stores/requirementAssistStore';
import { supabase } from '@/integrations/supabase/client';
import toast from 'react-hot-toast';

// Helper to transform DB row to store Generation
function dbToGeneration(row: any): Generation {
  return {
    id: row.id,
    displayId: row.display_id || `GEN-${row.generation_number || 1}`,
    title: row.title || row.prd_title,
    inputText: row.input_text,
    inputWordCount: row.input_word_count || 0,
    analysis: {
      actors: [],
      functions: [],
      nfrs: [],
      integrations: [],
      complexity: 'medium',
      warnings: [],
      suggestions: [],
    },
    programId: row.program_id,
    projectId: row.project_id,
    status: row.status || 'draft',
    progress: 0,
    currentStep: null,
    errorMessage: null,
    epicCount: 0,
    featureCount: 0,
    storyCount: 0,
    totalCount: 0,
    createdAt: row.created_at,
    completedAt: row.published_at,
  };
}

export function useGeneration() {
  const store = useRequirementAssistStore();
  const subscriptionsRef = useRef<{ gen?: ReturnType<typeof supabase.channel>; items?: ReturnType<typeof supabase.channel> }>({});

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      if (subscriptionsRef.current.gen) {
        subscriptionsRef.current.gen.unsubscribe();
      }
      if (subscriptionsRef.current.items) {
        subscriptionsRef.current.items.unsubscribe();
      }
    };
  }, []);

  // ==================
  // START GENERATION
  // ==================
  const startGeneration = useCallback(async () => {
    const { 
      inputText, 
      programId, 
      projectId, 
      outputConfig,
      programs,
      projects,
      setGeneration,
      setWorkItems,
      setGenerating,
      setGenerationError,
      addWorkItem,
      expandAll,
    } = store;

    // Validate input
    const wordCount = inputText.trim().split(/\s+/).length;
    if (wordCount < 10) {
      toast.error('Please enter at least 10 words to generate requirements');
      return;
    }

    // Reset state
    setGenerating(true);
    setGenerationError(null);
    setWorkItems([]);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Create generation record in database (let DB generate the id)
      const insertData = {
        input_text: inputText,
        input_word_count: wordCount,
        program_id: programId,
        project_id: projectId,
        status: 'draft' as const,
        user_id: user?.id || null,
        title: 'New Generation',
        output_prd: outputConfig.prd,
        output_epics: outputConfig.epics,
        output_features: outputConfig.features,
        output_stories: outputConfig.stories,
        output_test_cases: outputConfig.testCases,
      };

      const { data: generation, error: createError } = await supabase
        .from('ra_generations')
        .insert(insertData as any)
        .select()
        .single();

      if (createError) {
        throw new Error(`Failed to create generation: ${createError.message}`);
      }

      // Use the DB-generated ID
      const actualGenerationId = generation.id;

      // Transform to store format
      setGeneration(dbToGeneration(generation));

      // 2. Subscribe to generation updates (realtime)
      const genChannel = supabase
        .channel(`generation-${actualGenerationId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'ra_generations',
            filter: `id=eq.${actualGenerationId}`,
          },
          (payload) => {
            const updated = payload.new as any;
            
            // Update store with new values
            store.updateGeneration({
              status: updated.status,
              completedAt: updated.published_at,
            });

            // Handle completion states
            if (updated.status === 'published' || updated.status === 'draft') {
              setGenerating(false);
              expandAll();
              toast.success('Generation completed!');
              genChannel.unsubscribe();
            } else if (updated.status === 'failed') {
              setGenerating(false);
              setGenerationError('Generation failed');
              toast.error('Generation failed');
              genChannel.unsubscribe();
            }
          }
        )
        .subscribe();

      subscriptionsRef.current.gen = genChannel;

      // 3. Subscribe to work items (realtime streaming)
      const itemsChannel = supabase
        .channel(`items-${actualGenerationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'ra_generated_items',
            filter: `generation_id=eq.${actualGenerationId}`,
          },
          (payload) => {
            const item = payload.new as any;
            
            // Transform and add to store
            addWorkItem({
              id: item.id,
              generationId: item.generation_id,
              parentId: item.parent_id,
              itemType: item.item_type,
              level: item.sort_order < 100 ? 0 : item.sort_order < 10000 ? 1 : 2,
              sortOrder: item.sort_order,
              displayId: item.display_id,
              title: item.title,
              description: item.description,
              acceptanceCriteria: item.acceptance_criteria ? item.acceptance_criteria.split('\n').filter(Boolean) : [],
              confidenceScore: item.confidence_score || 0,
              confidenceReason: null,
              isSelected: true,
              isEdited: false,
              isPublished: item.is_published || false,
              publishedAt: item.published_at || null,
            });
          }
        )
        .subscribe();

      subscriptionsRef.current.items = itemsChannel;

      // Get program and project codes for display ID generation
      const selectedProgram = programs.find(p => p.id === programId);
      const selectedProject = projects.find(p => p.id === projectId);
      const programCode = selectedProgram?.code || selectedProgram?.name?.substring(0, 3).toUpperCase() || 'PROG';
      const projectCode = selectedProject?.code || selectedProject?.name?.substring(0, 3).toUpperCase() || 'PROJ';

      // 4. Call edge function to start generation (uses Claude API)
      const { error: invokeError } = await supabase.functions.invoke(
        'generate-requirements',
        {
          body: {
            generationId: actualGenerationId,
            inputText,
            programCode,  // Pass program code for Epic/Feature IDs
            projectCode,  // Pass project code for Story IDs
            outputTypes: {
              prd: false,  // PRD is NOT a publishable item - don't generate
              epics: outputConfig.epics,
              features: outputConfig.features,
              stories: outputConfig.stories,
              testCases: outputConfig.testCases,
              acceptanceCriteria: true,
            },
            compliance: {
              dga: true,
              nca: true,
              babok: true,
            },
            settings: {
              model: 'claude-sonnet-4-20250514',
              temperature: 0.7,
              maxTokens: 8000,
            },
          },
        }
      );

      if (invokeError) {
        throw new Error(`Generation failed: ${invokeError.message}`);
      }

    } catch (error: any) {
      console.error('Generation error:', error);
      setGenerating(false);
      setGenerationError(error.message);
      toast.error(error.message || 'Failed to start generation');

      // Cleanup subscriptions on error
      if (subscriptionsRef.current.gen) {
        subscriptionsRef.current.gen.unsubscribe();
      }
      if (subscriptionsRef.current.items) {
        subscriptionsRef.current.items.unsubscribe();
      }
    }
  }, [store]);

  // ==================
  // CANCEL GENERATION
  // ==================
  const cancelGeneration = useCallback(async () => {
    const { generation, setGenerating } = store;

    if (!generation?.id) return;

    try {
      await supabase
        .from('ra_generations')
        .update({ status: 'draft' })
        .eq('id', generation.id);

      setGenerating(false);
      toast('Generation cancelled');
    } catch (error) {
      console.error('Cancel error:', error);
    }
  }, [store]);

  // ==================
  // LOAD EXISTING GENERATION
  // ==================
  const loadGeneration = useCallback(async (generationId: string) => {
    const { setGeneration, setWorkItems, setGenerating } = store;

    try {
      // Load generation
      const { data: generation, error: genError } = await supabase
        .from('ra_generations')
        .select('*')
        .eq('id', generationId)
        .single();

      if (genError) throw genError;

      setGeneration(dbToGeneration(generation));

      // Set input text
      store.setInputText(generation.input_text);

      // Load work items
      const { data: items, error: itemsError } = await supabase
        .from('ra_generated_items')
        .select('*')
        .eq('generation_id', generationId)
        .order('sort_order');

      if (itemsError) throw itemsError;

      setWorkItems(
        (items || []).map((item: any) => ({
          id: item.id,
          generationId: item.generation_id,
          parentId: item.parent_id,
          itemType: item.item_type,
          level: item.sort_order < 100 ? 0 : item.sort_order < 10000 ? 1 : 2,
          sortOrder: item.sort_order,
          displayId: item.display_id,
          title: item.title,
          description: item.description,
          acceptanceCriteria: item.acceptance_criteria ? item.acceptance_criteria.split('\n').filter(Boolean) : [],
          confidenceScore: item.confidence_score || 0,
          confidenceReason: item.confidence_reason || null,
          isSelected: true,
          isEdited: false,
          isPublished: item.is_published || false,
          publishedAt: item.published_at || null,
        }))
      );

      // If generation is in progress, subscribe to updates
      if (generation.status === 'processing') {
        setGenerating(true);
        // Re-subscribe to realtime updates
        const genChannel = supabase
          .channel(`generation-${generationId}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'ra_generations',
              filter: `id=eq.${generationId}`,
            },
            (payload) => {
              const updated = payload.new as any;
              store.updateGeneration({
                status: updated.status,
                completedAt: updated.published_at,
              });

              if (['published', 'failed'].includes(updated.status)) {
                setGenerating(false);
                genChannel.unsubscribe();
              }
            }
          )
          .subscribe();

        subscriptionsRef.current.gen = genChannel;
      }

    } catch (error: any) {
      console.error('Load generation error:', error);
      toast.error('Failed to load generation');
    }
  }, [store]);

  // ==================
  // REGENERATE ITEM
  // ==================
  const regenerateItem = useCallback(async (itemId: string, feedback?: string) => {
    const { workItems, generation } = store;
    const item = workItems.find(w => w.id === itemId);

    if (!item || !generation) {
      toast.error('Item not found');
      return;
    }

    try {
      toast.loading('Regenerating...', { id: 'regenerate' });

      // Call regeneration endpoint
      const { error } = await supabase.functions.invoke('generate-requirements', {
        body: {
          action: 'regenerate',
          generationId: generation.id,
          itemId,
          feedback,
        },
      });

      if (error) throw error;
      
      toast.success('Item regenerated', { id: 'regenerate' });
    } catch (error: any) {
      toast.error('Failed to regenerate', { id: 'regenerate' });
    }
  }, [store]);

  return {
    startGeneration,
    cancelGeneration,
    loadGeneration,
    regenerateItem,
  };
}
