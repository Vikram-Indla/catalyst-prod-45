/**
 * Traceability Findings Hook
 * Handles AI-2: Traceability Autopilot (gap findings)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { useTestAISettings } from './useTestAISettings';

export interface TraceabilityFinding {
  id: string;
  program_id: string | null;
  finding_type: 'missing_tests' | 'orphan_tests' | 'coverage_gap' | 'stale_mapping';
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'assigned' | 'resolved' | 'dismissed';
  title: string;
  description: string | null;
  source_entity_type: string | null;
  source_entity_id: string | null;
  affected_items: Record<string, unknown>[] | null;
  recommended_action: string | null;
  owner_id: string | null;
  due_date: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  linked_defect_id: string | null;
  linked_task_id: string | null;
  ai_action_id: string | null;
  created_at: string;
  created_by: string | null;
}

interface GapFindingInput {
  finding_type: string;
  severity: string;
  title: string;
  description: string;
  source_entity_type?: string;
  source_entity_id?: string;
  affected_items?: Record<string, unknown>[];
  recommended_action?: string;
}

export function useTraceabilityFindings(programId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { settings, recordAction } = useTestAISettings(programId);

  // Fetch existing findings
  const { data: findings, isLoading } = useQuery({
    queryKey: ['traceability-findings', programId],
    queryFn: async () => {
      let query = supabase
        .from('traceability_findings')
        .select('*')
        .order('created_at', { ascending: false });

      if (programId) {
        query = query.eq('program_id', programId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TraceabilityFinding[];
    },
    enabled: !!user,
  });

  // Run AI gap detection
  const runGapDetectionMutation = useMutation({
    mutationFn: async (input: {
      stories: { id: string; title: string; priority?: string }[];
      testCases: { id: string; title: string; status?: string }[];
      mappings: Record<string, string[]>;
    }) => {
      const startTime = Date.now();

      const { data, error } = await supabase.functions.invoke('ai-traceability-gaps', {
        body: {
          stories: input.stories,
          testCases: input.testCases,
          mappings: input.mappings,
        },
      });

      if (error) throw error;

      const latencyMs = Date.now() - startTime;
      const generatedFindings = data.findings as GapFindingInput[];

      // Record provenance
      const aiAction = await recordAction({
        entityType: 'program',
        entityId: programId || 'global',
        actionType: 'traceability_gap_detection',
        provider: settings?.provider || 'lovable',
        model: settings?.model || 'google/gemini-2.5-flash',
        inputSources: { 
          storyCount: input.stories.length, 
          testCaseCount: input.testCases.length 
        },
        confidence: 0.85,
        outputSummary: { 
          findingsCount: generatedFindings.length,
          summary: data.summary 
        },
        latencyMs,
      });

      return { 
        findings: generatedFindings, 
        summary: data.summary,
        aiActionId: aiAction?.id 
      };
    },
    onError: (err: Error) => {
      toast.error('Gap detection failed', { description: err.message });
    },
  });

  // Save findings to database
  const saveFindingsMutation = useMutation({
    mutationFn: async (input: {
      findings: GapFindingInput[];
      aiActionId?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const savedIds: string[] = [];

      for (const finding of input.findings) {
        const { data, error } = await supabase
          .from('traceability_findings')
          .insert({
            program_id: programId,
            finding_type: finding.finding_type,
            severity: finding.severity,
            title: finding.title,
            description: finding.description,
            source_entity_type: finding.source_entity_type,
            source_entity_id: finding.source_entity_id,
            affected_items: finding.affected_items as unknown as string,
            recommended_action: finding.recommended_action,
            ai_action_id: input.aiActionId,
            created_by: user.id,
          })
          .select('id')
          .single();

        if (error) throw error;
        savedIds.push(data.id);
      }

      return { savedIds, count: savedIds.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['traceability-findings', programId] });
      toast.success(`Created ${data.count} findings`);
    },
    onError: (err: Error) => {
      toast.error('Failed to save findings', { description: err.message });
    },
  });

  // Update finding (assign owner, set due date, etc.)
  const updateFindingMutation = useMutation({
    mutationFn: async (input: {
      findingId: string;
      updates: Record<string, unknown>;
    }) => {
      const { data, error } = await (supabase as any)
        .from('traceability_findings')
        .update(input.updates)
        .eq('id', input.findingId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traceability-findings', programId] });
      toast.success('Finding updated');
    },
    onError: (err: Error) => {
      toast.error('Failed to update finding', { description: err.message });
    },
  });

  // Resolve finding
  const resolveFindingMutation = useMutation({
    mutationFn: async (input: {
      findingId: string;
      resolutionNotes: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('traceability_findings')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
          resolution_notes: input.resolutionNotes,
        })
        .eq('id', input.findingId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traceability-findings', programId] });
      toast.success('Finding resolved');
    },
    onError: (err: Error) => {
      toast.error('Failed to resolve finding', { description: err.message });
    },
  });

  // Dismiss finding
  const dismissFindingMutation = useMutation({
    mutationFn: async (input: { findingId: string; reason: string }) => {
      const { data, error } = await supabase
        .from('traceability_findings')
        .update({
          status: 'dismissed',
          resolution_notes: input.reason,
        })
        .eq('id', input.findingId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traceability-findings', programId] });
      toast.success('Finding dismissed');
    },
  });

  // Create defect from finding
  const createDefectFromFindingMutation = useMutation({
    mutationFn: async (input: { finding: TraceabilityFinding }) => {
      if (!user) throw new Error('Not authenticated');

      const { data: defect, error } = await (supabase.from('defects') as any)
        .insert([{
          title: `Coverage Gap: ${input.finding.title}`,
          description: input.finding.description,
          expected_result: 'Adequate test coverage',
          actual_result: input.finding.recommended_action || 'Missing or insufficient tests',
          severity: input.finding.severity === 'critical' ? 'critical' : 'major',
          priority: input.finding.severity,
          workflow_status: 'new',
          reporter_id: user.id,
        }])
        .select()
        .single();

      if (error) throw error;

      // Link defect to finding
      await supabase
        .from('traceability_findings')
        .update({ linked_defect_id: defect.id })
        .eq('id', input.finding.id);

      return defect;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traceability-findings', programId] });
      queryClient.invalidateQueries({ queryKey: ['defects'] });
      toast.success('Defect created from finding');
    },
    onError: (err: Error) => {
      toast.error('Failed to create defect', { description: err.message });
    },
  });

  // Stats
  const openFindings = findings?.filter(f => f.status === 'open') || [];
  const criticalFindings = findings?.filter(f => f.severity === 'critical' && f.status === 'open') || [];

  return {
    findings: findings || [],
    isLoading,
    openFindings,
    criticalFindings,
    
    // AI gap detection
    runGapDetection: runGapDetectionMutation.mutateAsync,
    isDetectingGaps: runGapDetectionMutation.isPending,
    detectedFindings: runGapDetectionMutation.data?.findings,
    
    // Save findings
    saveFindings: saveFindingsMutation.mutateAsync,
    isSavingFindings: saveFindingsMutation.isPending,
    
    // Actions
    updateFinding: updateFindingMutation.mutateAsync,
    resolveFinding: resolveFindingMutation.mutateAsync,
    dismissFinding: dismissFindingMutation.mutateAsync,
    createDefectFromFinding: createDefectFromFindingMutation.mutateAsync,
  };
}
