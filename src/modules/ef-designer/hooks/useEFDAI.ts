import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export function useParseDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      sessionId, 
      documentContent, 
      documentName 
    }: { 
      sessionId: string; 
      documentContent: string; 
      documentName: string;
    }) => {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/efd-parse-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ sessionId, documentContent, documentName }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to parse document');
      }

      return response.json();
    },
    onSuccess: async (data, variables) => {
      // Save extracted atoms to database
      if (data.atoms && data.atoms.length > 0) {
        const atomsToInsert = data.atoms.map((atom: any, index: number) => ({
          session_id: variables.sessionId,
          atom_key: atom.id,
          text: atom.text,
          type: atom.type,
          source_document_id: null,
          source_text: atom.source_text || null,
          confidence_score: atom.confidence || 0.8,
          tags: atom.tags || [],
          priority: 'medium',
          is_selected: true,
        }));

        const { error } = await supabase
          .from('efd_atoms')
          .insert(atomsToInsert);

        if (error) {
          console.error('Error saving atoms:', error);
          toast.error('Failed to save extracted requirements');
          return;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['efd-atoms', variables.sessionId] });
      toast.success(`Extracted ${data.total_extracted} requirements`);
    },
    onError: (error: Error) => {
      console.error('Parse error:', error);
      toast.error(error.message || 'Failed to parse document');
    },
  });
}

export function useGenerateEpics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      sessionId, 
      atoms,
      config
    }: { 
      sessionId: string; 
      atoms: any[];
      config?: any;
    }) => {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/efd-generate-epics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ sessionId, atoms, config }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate epics');
      }

      return response.json();
    },
    onSuccess: async (data, variables) => {
      // Save generated epics to database
      if (data.epics && data.epics.length > 0) {
        const epicsToInsert = data.epics.map((epic: any) => ({
          session_id: variables.sessionId,
          epic_key: epic.key,
          name: epic.title,
          description: epic.description,
          lbc_hypothesis: epic.hypothesis || null,
          size: epic.estimated_size || null,
          state: 'draft',
          is_selected_for_features: true,
        }));

        const { error } = await supabase
          .from('efd_epics')
          .insert(epicsToInsert);

        if (error) {
          console.error('Error saving epics:', error);
          toast.error('Failed to save generated epics');
          return;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['efd-epics', variables.sessionId] });
      toast.success(`Generated ${data.epics?.length || 0} epics`);
    },
    onError: (error: Error) => {
      console.error('Generate epics error:', error);
      toast.error(error.message || 'Failed to generate epics');
    },
  });
}

export function useGenerateFeatures() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      sessionId, 
      epics,
      atoms,
      config
    }: { 
      sessionId: string; 
      epics: any[];
      atoms?: any[];
      config?: any;
    }) => {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/efd-generate-features`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ sessionId, epics, atoms, config }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate features');
      }

      return response.json();
    },
    onSuccess: async (data, variables) => {
      // Save generated features to database
      if (data.features && data.features.length > 0) {
        // First get epic IDs for parent_epic_key mapping
        const { data: epicsData } = await supabase
          .from('efd_epics')
          .select('id, epic_key')
          .eq('session_id', variables.sessionId);

        const epicKeyToId = (epicsData || []).reduce((acc: any, e: any) => {
          acc[e.epic_key] = e.id;
          return acc;
        }, {});

        const featuresToInsert = data.features.map((feature: any) => ({
          session_id: variables.sessionId,
          feature_key: feature.key,
          name: feature.title,
          description: feature.description,
          benefit_hypothesis: feature.benefit_hypothesis || null,
          acceptance_criteria: feature.acceptance_criteria || [],
          epic_id: epicKeyToId[feature.epic_key] || null,
          state: 'draft',
        }));

        const { error } = await supabase
          .from('efd_features')
          .insert(featuresToInsert);

        if (error) {
          console.error('Error saving features:', error);
          toast.error('Failed to save generated features');
          return;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['efd-features', variables.sessionId] });
      toast.success(`Generated ${data.features?.length || 0} features`);
    },
    onError: (error: Error) => {
      console.error('Generate features error:', error);
      toast.error(error.message || 'Failed to generate features');
    },
  });
}
