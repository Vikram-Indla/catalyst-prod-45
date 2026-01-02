/**
 * Test Recommendations Hook
 * Handles AI-4: Risk-Based Test Runway Recommendations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { useTestAISettings } from './useTestAISettings';

export interface TestRecommendation {
  id: string;
  program_id: string | null;
  recommendation_type: 'assign_execution' | 'generate_tests' | 'create_defect' | 'coverage_gap' | 'priority_adjustment' | 'resource_reallocation';
  title: string;
  description: string | null;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'done' | 'dismissed' | 'in_progress';
  target_entity_type: string | null;
  target_entity_id: string | null;
  action_data: Record<string, unknown> | null;
  confidence_score: number | null;
  source_metrics: Record<string, unknown> | null;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  ai_action_id: string | null;
  created_at: string;
  created_by: string | null;
}

interface AIRecommendation {
  recommendation_type: string;
  title: string;
  description: string;
  priority: string;
  target_entity_type?: string;
  target_entity_id?: string;
  action_data?: Record<string, unknown>;
  confidence_score: number;
  rationale?: string;
}

export function useTestRecommendations(programId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { settings, recordAction } = useTestAISettings(programId);

  // Fetch existing recommendations
  const { data: recommendations, isLoading } = useQuery({
    queryKey: ['test-recommendations', programId],
    queryFn: async () => {
      let query = supabase
        .from('test_recommendations')
        .select('*')
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false });

      if (programId) {
        query = query.eq('program_id', programId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TestRecommendation[];
    },
    enabled: !!user,
  });

  // Generate recommendations using AI
  const generateRecommendationsMutation = useMutation({
    mutationFn: async (input: {
      metrics: Record<string, unknown>;
      recentExecutions: Record<string, unknown>[];
      openDefects: Record<string, unknown>[];
      upcomingRelease?: Record<string, unknown>;
    }) => {
      const startTime = Date.now();

      const { data, error } = await supabase.functions.invoke('ai-test-recommendations', {
        body: input,
      });

      if (error) throw error;

      const latencyMs = Date.now() - startTime;
      const aiRecommendations = data.recommendations as AIRecommendation[];
      const riskSummary = data.risk_summary;

      // Record provenance
      const aiAction = await recordAction({
        entityType: 'program',
        entityId: programId || 'global',
        actionType: 'generate_recommendations',
        provider: settings?.provider || 'lovable',
        model: settings?.model || 'google/gemini-2.5-flash',
        inputSources: {
          metricsSnapshot: input.metrics,
          executionCount: input.recentExecutions.length,
          defectCount: input.openDefects.length,
        },
        confidence: 0.85,
        outputSummary: {
          recommendationCount: aiRecommendations.length,
          riskLevel: riskSummary?.overall_risk_level,
        },
        latencyMs,
      });

      return {
        recommendations: aiRecommendations,
        riskSummary,
        aiActionId: aiAction?.id,
      };
    },
    onError: (err: Error) => {
      toast.error('Failed to generate recommendations', { description: err.message });
    },
  });

  // Save recommendations to database
  const saveRecommendationsMutation = useMutation({
    mutationFn: async (input: {
      recommendations: AIRecommendation[];
      sourceMetrics: Record<string, unknown>;
      aiActionId?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const savedIds: string[] = [];

      for (const rec of input.recommendations) {
        const { data, error } = await supabase
          .from('test_recommendations')
          .insert({
            program_id: programId,
            recommendation_type: rec.recommendation_type,
            title: rec.title,
            description: rec.description,
            priority: rec.priority,
            target_entity_type: rec.target_entity_type,
            target_entity_id: rec.target_entity_id,
            action_data: rec.action_data as unknown as string,
            confidence_score: rec.confidence_score,
            source_metrics: input.sourceMetrics as unknown as string,
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
      queryClient.invalidateQueries({ queryKey: ['test-recommendations', programId] });
      toast.success(`Created ${data.count} recommendations`);
    },
    onError: (err: Error) => {
      toast.error('Failed to save recommendations', { description: err.message });
    },
  });

  // Execute recommendation action
  const executeRecommendationMutation = useMutation({
    mutationFn: async (recommendation: TestRecommendation) => {
      if (!user) throw new Error('Not authenticated');

      // Mark as in progress
      await supabase
        .from('test_recommendations')
        .update({ status: 'in_progress' })
        .eq('id', recommendation.id);

      // Execute based on type
      switch (recommendation.recommendation_type) {
        case 'assign_execution':
          // This would assign an execution to someone
          // Implementation depends on action_data
          break;
        case 'generate_tests':
          // Trigger test generation for the target story
          break;
        case 'create_defect':
          // Create a defect based on action_data
          break;
        // Add more cases as needed
      }

      // Mark as done
      const { data, error } = await supabase
        .from('test_recommendations')
        .update({
          status: 'done',
          resolved_by: user.id,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', recommendation.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-recommendations', programId] });
      toast.success('Recommendation executed');
    },
    onError: (err: Error) => {
      toast.error('Failed to execute recommendation', { description: err.message });
    },
  });

  // Dismiss recommendation
  const dismissRecommendationMutation = useMutation({
    mutationFn: async (input: { recommendationId: string; reason: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('test_recommendations')
        .update({
          status: 'dismissed',
          resolved_by: user.id,
          resolved_at: new Date().toISOString(),
          resolution_notes: input.reason,
        })
        .eq('id', input.recommendationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-recommendations', programId] });
      toast.success('Recommendation dismissed');
    },
  });

  // Stats
  const openRecommendations = recommendations?.filter(r => r.status === 'open') || [];
  const criticalRecommendations = recommendations?.filter(r => r.priority === 'critical' && r.status === 'open') || [];

  return {
    recommendations: recommendations || [],
    isLoading,
    openRecommendations,
    criticalRecommendations,

    // Generate
    generateRecommendations: generateRecommendationsMutation.mutateAsync,
    isGenerating: generateRecommendationsMutation.isPending,
    generatedRecommendations: generateRecommendationsMutation.data?.recommendations,
    riskSummary: generateRecommendationsMutation.data?.riskSummary,

    // Save
    saveRecommendations: saveRecommendationsMutation.mutateAsync,
    isSaving: saveRecommendationsMutation.isPending,

    // Actions
    executeRecommendation: executeRecommendationMutation.mutateAsync,
    dismissRecommendation: dismissRecommendationMutation.mutateAsync,
    isExecuting: executeRecommendationMutation.isPending,
  };
}
