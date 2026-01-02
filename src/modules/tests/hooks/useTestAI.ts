import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types
export interface AITestCase {
  title: string;
  description: string;
  steps: Array<{
    action: string;
    expectedResult: string;
  }>;
  priority: 'critical' | 'high' | 'medium' | 'low';
  testType: 'manual' | 'automated';
}

export interface AITraceabilityGap {
  finding_type: 'missing_tests' | 'orphan_tests' | 'coverage_gap' | 'stale_mapping';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  source_entity_type?: string;
  source_entity_id?: string;
  affected_items?: Array<{ id: string; type: string; title: string }>;
  recommended_action: string;
}

export interface AIFailureCluster {
  id: string;
  cluster_name: string;
  pattern_description: string;
  root_cause_hypothesis: string;
  execution_ids: string[];
  failure_count: number;
  impact_score: number;
  confidence_score: number;
  is_acknowledged: boolean;
}

export interface AICycleRiskPrediction {
  id: string;
  cycle_id: string;
  overall_risk_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_factors: Array<{
    factor: string;
    impact: number;
    description: string;
  }>;
  predicted_pass_rate: number;
  predicted_completion_date: string;
  predicted_blocker_count: number;
  recommendations: Array<{
    priority: string;
    action: string;
    rationale: string;
  }>;
}

export interface AIDraft {
  id: string;
  audit_log_id: string;
  program_id: string;
  draft_type: string;
  draft_data: Record<string, any>;
  status: 'pending' | 'accepted' | 'rejected' | 'modified';
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  modifications: Record<string, any> | null;
  created_at: string;
}

// Generate test cases from story
export function useGenerateTestCases() {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  
  const generateMutation = useMutation({
    mutationFn: async (params: {
      storyId: string;
      storyTitle: string;
      storyDescription?: string;
      acceptanceCriteria?: string;
      programId: string;
    }) => {
      setIsGenerating(true);
      const startTime = Date.now();
      
      try {
        // Call AI edge function
        const { data, error } = await supabase.functions.invoke('generate-test-cases', {
          body: {
            storyTitle: params.storyTitle,
            storyDescription: params.storyDescription,
            acceptanceCriteria: params.acceptanceCriteria,
          },
        });
        
        if (error) throw error;
        
        const responseTime = Date.now() - startTime;
        const generatedTestCases = data.testCases as AITestCase[];
        
        // Log AI action
        const { data: { user } } = await supabase.auth.getUser();
        const { data: auditLog } = await supabase
          .from('test_ai_audit_log')
          .insert({
            program_id: params.programId,
            user_id: user?.id || '',
            action_type: 'generate_test_cases',
            input_data: { story_id: params.storyId, story_title: params.storyTitle },
            output_data: { test_cases: generatedTestCases },
            status: 'completed',
            response_time_ms: responseTime,
            model_used: 'google/gemini-2.5-flash',
          })
          .select()
          .single();
        
        return { testCases: generatedTestCases, auditLogId: auditLog?.id };
      } finally {
        setIsGenerating(false);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai-drafts'] });
      queryClient.invalidateQueries({ queryKey: ['ai-audit-log'] });
      toast.success(`Generated ${data.testCases.length} test case drafts`);
    },
    onError: (error: any) => {
      if (error.message?.includes('Rate limit')) {
        toast.error('Rate limit exceeded. Please try again later.');
      } else if (error.message?.includes('Payment required')) {
        toast.error('AI credits exhausted. Please add funds.');
      } else {
        toast.error('Failed to generate test cases');
      }
      console.error(error);
    },
  });
  
  return {
    generate: generateMutation.mutate,
    isGenerating,
  };
}

// Generate steps from acceptance criteria
export function useGenerateSteps() {
  const [isGenerating, setIsGenerating] = useState(false);
  
  return useMutation({
    mutationFn: async (params: {
      acceptanceCriteria: string[];
      testCaseTitle: string;
      programId: string;
    }) => {
      setIsGenerating(true);
      
      try {
        const { data, error } = await supabase.functions.invoke('generate-test-cases', {
          body: {
            storyTitle: params.testCaseTitle,
            acceptanceCriteria: params.acceptanceCriteria.join('\n'),
          },
        });
        
        if (error) throw error;
        
        // Extract steps from first generated test case
        const steps = data.testCases?.[0]?.steps || [];
        
        // Log AI action
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('test_ai_audit_log').insert({
          program_id: params.programId,
          user_id: user?.id,
          action_type: 'generate_steps',
          action_subtype: 'from_acceptance_criteria',
          input_data: {
            acceptance_criteria: params.acceptanceCriteria,
            test_case_title: params.testCaseTitle,
          },
          output_data: { steps },
          status: 'completed',
          model_used: 'google/gemini-2.5-flash',
        });
        
        return steps;
      } finally {
        setIsGenerating(false);
      }
    },
    onSuccess: (steps) => {
      toast.success(`Generated ${steps.length} test steps`);
    },
    onError: () => {
      toast.error('Failed to generate steps');
    },
  });
}

// Analyze coverage gaps
export function useAnalyzeCoverageGaps() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: {
      programId: string;
      stories: Array<{ id: string; title: string; priority?: string }>;
      testCases: Array<{ id: string; title: string; story_id?: string }>;
      mappings: Record<string, string[]>;
    }) => {
      const startTime = Date.now();
      
      const { data, error } = await supabase.functions.invoke('ai-traceability-gaps', {
        body: {
          stories: params.stories,
          testCases: params.testCases,
          mappings: params.mappings,
        },
      });
      
      if (error) throw error;
      
      const responseTime = Date.now() - startTime;
      const findings = data.findings as AITraceabilityGap[];
      
      // Log AI action
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('test_ai_audit_log').insert({
        program_id: params.programId,
        user_id: user?.id,
        action_type: 'analyze_coverage_gaps',
        input_data: {
          story_count: params.stories.length,
          test_case_count: params.testCases.length,
        },
        output_data: {
          findings_count: findings.length,
          summary: data.summary,
        },
        status: 'completed',
        response_time_ms: responseTime,
        model_used: 'google/gemini-2.5-flash',
      });
      
      return { findings, summary: data.summary };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai-audit-log'] });
      toast.success(`Found ${data.findings.length} coverage issues`);
    },
    onError: () => {
      toast.error('Failed to analyze coverage gaps');
    },
  });
}

// Get failure clusters
export function useFailureClusters(cycleId?: string) {
  return useQuery({
    queryKey: ['failure-clusters', cycleId],
    queryFn: async () => {
      let query = supabase
        .from('test_failure_clusters')
        .select('*')
        .order('impact_score', { ascending: false });
      
      if (cycleId) {
        query = query.eq('cycle_id', cycleId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      return data as AIFailureCluster[];
    },
    enabled: !!cycleId,
  });
}

// Generate failure clusters
export function useGenerateFailureClusters() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: {
      cycleId: string;
      programId: string;
      failedExecutions: Array<{
        id: string;
        test_case_title: string;
        failure_reason?: string;
        error_message?: string;
      }>;
    }) => {
      const { data, error } = await supabase.functions.invoke('ai-fail-to-defect', {
        body: {
          executions: params.failedExecutions,
          analysisType: 'cluster',
        },
      });
      
      if (error) throw error;
      
      // Save clusters to database
      const clusters = data.clusters || [];
      if (clusters.length > 0) {
        const { error: insertError } = await supabase
          .from('test_failure_clusters')
          .insert(clusters.map((c: any) => ({
            program_id: params.programId,
            cycle_id: params.cycleId,
            cluster_name: c.name,
            pattern_description: c.pattern,
            root_cause_hypothesis: c.rootCause,
            execution_ids: c.executionIds,
            failure_count: c.executionIds.length,
            impact_score: c.impactScore,
            confidence_score: c.confidence,
            ai_generated: true,
            model_used: 'google/gemini-2.5-flash',
          })));
        
        if (insertError) throw insertError;
      }
      
      // Log AI action
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('test_ai_audit_log').insert({
        program_id: params.programId,
        user_id: user?.id,
        action_type: 'generate_failure_clusters',
        input_data: {
          cycle_id: params.cycleId,
          execution_count: params.failedExecutions.length,
        },
        output_data: { cluster_count: clusters.length },
        status: 'completed',
        model_used: 'google/gemini-2.5-flash',
      });
      
      return clusters;
    },
    onSuccess: (clusters) => {
      queryClient.invalidateQueries({ queryKey: ['failure-clusters'] });
      toast.success(`Identified ${clusters.length} failure patterns`);
    },
    onError: () => {
      toast.error('Failed to analyze failures');
    },
  });
}

// Get cycle risk prediction
export function useCycleRiskPrediction(cycleId?: string) {
  return useQuery({
    queryKey: ['cycle-risk-prediction', cycleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_cycle_risk_predictions')
        .select('*')
        .eq('cycle_id', cycleId!)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) return null;
      
      return {
        id: data.id,
        cycle_id: data.cycle_id!,
        overall_risk_score: Number(data.overall_risk_score) || 0,
        risk_level: (data.risk_level as AICycleRiskPrediction['risk_level']) || 'medium',
        risk_factors: (data.risk_factors || []) as AICycleRiskPrediction['risk_factors'],
        predicted_pass_rate: Number(data.predicted_pass_rate) || 0,
        predicted_completion_date: data.predicted_completion_date || '',
        predicted_blocker_count: data.predicted_blocker_count || 0,
        recommendations: (data.recommendations || []) as AICycleRiskPrediction['recommendations'],
      };
    },
    enabled: !!cycleId,
  });
}

// Generate risk prediction
export function useGenerateRiskPrediction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: {
      cycleId: string;
      programId: string;
      cycleData: {
        name: string;
        start_date: string;
        end_date: string;
        total_cases: number;
        executed_count: number;
        pass_count: number;
        fail_count: number;
        blocked_count: number;
        historical_pass_rates?: number[];
      };
    }) => {
      const { data, error } = await supabase.functions.invoke('ai-test-recommendations', {
        body: {
          analysisType: 'risk_prediction',
          cycleData: params.cycleData,
        },
      });
      
      if (error) throw error;
      
      const prediction = data.prediction;
      
      // Save prediction
      const { error: insertError } = await supabase
        .from('test_cycle_risk_predictions')
        .upsert({
          cycle_id: params.cycleId,
          program_id: params.programId,
          overall_risk_score: prediction.riskScore,
          risk_level: prediction.riskLevel,
          risk_factors: prediction.factors,
          predicted_pass_rate: prediction.predictedPassRate,
          predicted_completion_date: prediction.predictedCompletion,
          predicted_blocker_count: prediction.predictedBlockers,
          recommendations: prediction.recommendations,
          model_used: 'google/gemini-2.5-flash',
          confidence_score: prediction.confidence,
        }, {
          onConflict: 'cycle_id',
        });
      
      if (insertError) throw insertError;
      
      // Log AI action
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('test_ai_audit_log').insert({
        program_id: params.programId,
        user_id: user?.id,
        action_type: 'generate_risk_prediction',
        input_data: { cycle_id: params.cycleId },
        output_data: prediction,
        status: 'completed',
        model_used: 'google/gemini-2.5-flash',
      });
      
      return prediction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycle-risk-prediction'] });
      toast.success('Risk prediction generated');
    },
    onError: () => {
      toast.error('Failed to generate risk prediction');
    },
  });
}

// AI Drafts management
export function useAIDrafts(programId?: string, status?: string) {
  const queryClient = useQueryClient();
  
  const { data: drafts = [], isLoading } = useQuery({
    queryKey: ['ai-drafts', programId, status],
    queryFn: async () => {
      let query = supabase
        .from('test_ai_drafts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (programId) query = query.eq('program_id', programId);
      if (status) query = query.eq('status', status);
      
      const { data, error } = await query;
      if (error) throw error;
      
      return data as AIDraft[];
    },
  });
  
  const acceptDraft = useMutation({
    mutationFn: async (params: { draftId: string; modifications?: Record<string, any> }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('test_ai_drafts')
        .update({
          status: params.modifications ? 'modified' : 'accepted',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          modifications: params.modifications || null,
        })
        .eq('id', params.draftId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-drafts'] });
      toast.success('Draft accepted');
    },
  });
  
  const rejectDraft = useMutation({
    mutationFn: async (params: { draftId: string; reason?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('test_ai_drafts')
        .update({
          status: 'rejected',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          review_notes: params.reason,
        })
        .eq('id', params.draftId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-drafts'] });
      toast.success('Draft rejected');
    },
  });
  
  return {
    drafts,
    isLoading,
    acceptDraft: acceptDraft.mutate,
    rejectDraft: rejectDraft.mutate,
  };
}

// AI Audit Log
export function useAIAuditLog(programId?: string) {
  return useQuery({
    queryKey: ['ai-audit-log', programId],
    queryFn: async () => {
      let query = supabase
        .from('test_ai_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (programId) query = query.eq('program_id', programId);
      
      const { data, error } = await query;
      if (error) throw error;
      
      return data;
    },
  });
}
