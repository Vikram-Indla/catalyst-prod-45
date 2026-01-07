import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export type ArtifactType = 
  | 'evidence' 
  | 'glossary' 
  | 'memo' 
  | 'functional_requirements' 
  | 'compliance_report' 
  | 'justification'
  | 'open_questions' 
  | 'brd' 
  | 'epics'
  | 'summary'
  | 'summary_pdf';

export interface AIAssistArtifact {
  id: string;
  run_id: string;
  draft_id: string;
  artifact_type: ArtifactType;
  artifact_key: string;
  content_json: Json | null;
  content_html: string | null;
  content_hash: string | null;
  version: number;
  is_latest: boolean;
  supersedes_artifact_id: string | null;
  created_at: string;
}

export interface CreateArtifactInput {
  run_id: string;
  artifact_type: ArtifactType;
  artifact_key?: string; // Auto-populated from artifact_type if not provided
  draft_id?: string; // Auto-populated from run if not provided
  content_json?: Json;
  content_html?: string;
  content_hash?: string;
}

// Fetch all artifacts for a run
export function useAIAssistArtifacts(runId: string | undefined) {
  return useQuery({
    queryKey: ['ai-assist-artifacts', runId],
    queryFn: async (): Promise<AIAssistArtifact[]> => {
      if (!runId) return [];

      const { data, error } = await supabase
        .from('ai_assist_artifacts')
        .select('*')
        .eq('run_id', runId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AIAssistArtifact[];
    },
    enabled: !!runId,
  });
}

// Fetch artifacts by type for a run
export function useArtifactByType(runId: string | undefined, artifactType: ArtifactType) {
  return useQuery({
    queryKey: ['ai-assist-artifact', runId, artifactType],
    queryFn: async (): Promise<AIAssistArtifact | null> => {
      if (!runId) return null;

      const { data, error } = await supabase
        .from('ai_assist_artifacts')
        .select('*')
        .eq('run_id', runId)
        .eq('artifact_type', artifactType)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as AIAssistArtifact | null;
    },
    enabled: !!runId,
  });
}

// Fetch latest artifacts across all runs for a draft
export function useLatestArtifactsForDraft(draftId: string | undefined) {
  return useQuery({
    queryKey: ['ai-assist-latest-artifacts', draftId],
    queryFn: async (): Promise<AIAssistArtifact[]> => {
      if (!draftId) return [];

      // Get all runs for this draft
      const { data: runs, error: runsError } = await supabase
        .from('ai_assist_runs')
        .select('id')
        .eq('draft_id', draftId)
        .order('run_number', { ascending: false });

      if (runsError) throw runsError;
      if (!runs || runs.length === 0) return [];

      const runIds = runs.map(r => r.id);

      // Get all artifacts for these runs
      const { data: artifacts, error: artifactsError } = await supabase
        .from('ai_assist_artifacts')
        .select('*')
        .in('run_id', runIds)
        .order('version', { ascending: false });

      if (artifactsError) throw artifactsError;

      // Group by artifact type and return latest version of each
      const latestByType = new Map<string, AIAssistArtifact>();
      for (const artifact of (artifacts || [])) {
        if (!latestByType.has(artifact.artifact_type)) {
          latestByType.set(artifact.artifact_type, artifact as AIAssistArtifact);
        }
      }

      return Array.from(latestByType.values());
    },
    enabled: !!draftId,
  });
}

// Create a new artifact
export function useCreateArtifact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateArtifactInput): Promise<AIAssistArtifact> => {
      // Get the next version number for this artifact type in this run
      const { data: existingArtifacts } = await supabase
        .from('ai_assist_artifacts')
        .select('version')
        .eq('run_id', input.run_id)
        .eq('artifact_type', input.artifact_type)
        .order('version', { ascending: false })
        .limit(1);

      const nextVersion = existingArtifacts && existingArtifacts.length > 0 
        ? existingArtifacts[0].version + 1 
        : 1;

      const { data, error } = await supabase
        .from('ai_assist_artifacts')
        .insert({
          run_id: input.run_id,
          artifact_type: input.artifact_type,
          artifact_key: input.artifact_key || input.artifact_type,
          draft_id: input.draft_id, // Will be auto-populated by trigger if null
          content_json: input.content_json,
          content_html: input.content_html,
          content_hash: input.content_hash,
          version: nextVersion,
        })
        .select()
        .single();

      if (error) throw error;
      return data as AIAssistArtifact;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai-assist-artifacts', data.run_id] });
      queryClient.invalidateQueries({ queryKey: ['ai-assist-artifact', data.run_id, data.artifact_type] });
      queryClient.invalidateQueries({ queryKey: ['ai-assist-latest-artifacts'] });
    },
    onError: (error) => {
      toast.error('Failed to create artifact: ' + error.message);
    },
  });
}
