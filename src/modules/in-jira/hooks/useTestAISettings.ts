/**
 * Test AI Settings Hook
 * Manages AI governance settings and provenance tracking
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export type AIProvider = 'lovable' | 'openai' | 'anthropic';

export interface TestAISettings {
  id: string;
  program_id: string | null;
  provider: AIProvider;
  model: string;
  api_key_ref: string | null;
  confidence_threshold: number;
  auto_approve: boolean;
  prompt_templates_json: Record<string, string>;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export interface TestAIAction {
  id: string;
  program_id: string | null;
  entity_type: string;
  entity_id: string;
  action_type: string;
  provider: string;
  model: string;
  prompt_hash: string | null;
  input_sources: Record<string, unknown> | null;
  confidence: number | null;
  approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
  output_summary_json: Record<string, unknown> | null;
  tokens_used: number | null;
  latency_ms: number | null;
  error_message: string | null;
  created_at: string;
  created_by: string | null;
}

export const AVAILABLE_PROVIDERS: { id: AIProvider; name: string; description: string; requiresKey: boolean }[] = [
  { 
    id: 'lovable', 
    name: 'Lovable AI', 
    description: 'Built-in AI powered by Gemini (no API key required)',
    requiresKey: false
  },
  { 
    id: 'openai', 
    name: 'OpenAI', 
    description: 'GPT-4, GPT-5 models (requires API key)',
    requiresKey: true
  },
  { 
    id: 'anthropic', 
    name: 'Anthropic', 
    description: 'Claude models (requires API key)',
    requiresKey: true
  },
];

export const AVAILABLE_MODELS: Record<AIProvider, { id: string; name: string }[]> = {
  lovable: [
    { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash (Default)' },
    { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
    { id: 'google/gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite (Fast)' },
    { id: 'openai/gpt-5', name: 'GPT-5' },
    { id: 'openai/gpt-5-mini', name: 'GPT-5 Mini' },
  ],
  openai: [
    { id: 'gpt-5', name: 'GPT-5' },
    { id: 'gpt-5-mini', name: 'GPT-5 Mini' },
    { id: 'gpt-4.1', name: 'GPT-4.1' },
  ],
  anthropic: [
    { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5' },
    { id: 'claude-opus-4-5', name: 'Claude Opus 4.5' },
  ],
};

export const DEFAULT_PROMPT_TEMPLATES = {
  generate_test_cases: `Generate comprehensive test cases for the following user story/requirement. Include:
- Positive test scenarios
- Negative test scenarios  
- Edge cases
- Boundary conditions

Format each test case with: Title, Preconditions, Steps, Expected Results`,
  
  generate_test_steps: `Generate detailed test steps for executing this test case. Each step should be:
- Clear and actionable
- Include expected results
- Be reproducible by any tester`,
  
  analyze_coverage: `Analyze the test coverage for this feature/story and identify:
- Coverage gaps
- Missing edge cases
- Risk areas that need additional testing`,
  
  suggest_improvements: `Review this test case and suggest improvements for:
- Clarity and completeness
- Edge case coverage
- Test data considerations`,
};

export function useTestAISettings(programId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch AI settings for the program
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['test-ai-settings', programId],
    queryFn: async () => {
      const query = supabase
        .from('test_ai_settings')
        .select('*');
      
      if (programId) {
        query.eq('program_id', programId);
      } else {
        query.is('program_id', null);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data as TestAISettings | null;
    },
    enabled: !!user,
  });

  // Fetch AI action history
  const { data: actionHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['test-ai-actions', programId],
    queryFn: async () => {
      let query = supabase
        .from('test_ai_actions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (programId) {
        query = query.eq('program_id', programId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TestAIAction[];
    },
    enabled: !!user,
  });

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (input: Partial<TestAISettings>) => {
      if (!user) throw new Error('Not authenticated');

      const payload = {
        ...input,
        program_id: programId,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      };

      if (settings?.id) {
        // Update existing
        const { data, error } = await supabase
          .from('test_ai_settings')
          .update(payload)
          .eq('id', settings.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('test_ai_settings')
          .insert([payload])
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-ai-settings', programId] });
      toast.success('AI settings saved');
    },
    onError: (err: Error) => {
      toast.error('Failed to save settings', { description: err.message });
    },
  });

  // Record AI action (for provenance)
  const recordActionMutation = useMutation({
    mutationFn: async (input: {
      entityType: string;
      entityId: string;
      actionType: string;
      provider: string;
      model: string;
      promptHash?: string;
      inputSources?: Record<string, unknown>;
      confidence?: number;
      outputSummary?: Record<string, unknown>;
      tokensUsed?: number;
      latencyMs?: number;
      errorMessage?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('test_ai_actions')
        .insert([{
          program_id: programId,
          entity_type: input.entityType,
          entity_id: input.entityId,
          action_type: input.actionType,
          provider: input.provider,
          model: input.model,
          prompt_hash: input.promptHash || null,
          input_sources: input.inputSources || null,
          confidence: input.confidence || null,
          output_summary_json: input.outputSummary || null,
          tokens_used: input.tokensUsed || null,
          latency_ms: input.latencyMs || null,
          error_message: input.errorMessage || null,
          created_by: user.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-ai-actions', programId] });
    },
  });

  // Approve AI action
  const approveActionMutation = useMutation({
    mutationFn: async (actionId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('test_ai_actions')
        .update({
          approved: true,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', actionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-ai-actions', programId] });
      toast.success('AI action approved');
    },
    onError: (err: Error) => {
      toast.error('Failed to approve', { description: err.message });
    },
  });

  // Check if AI is configured
  const isAIConfigured = (): boolean => {
    if (!settings) return false;
    if (!settings.is_enabled) return false;
    
    const provider = AVAILABLE_PROVIDERS.find(p => p.id === settings.provider);
    if (!provider) return false;
    
    // Lovable doesn't need an API key
    if (provider.id === 'lovable') return true;
    
    // Other providers need an API key reference
    return !!settings.api_key_ref;
  };

  return {
    settings,
    actionHistory: actionHistory || [],
    isLoading: settingsLoading || historyLoading,
    isAIConfigured: isAIConfigured(),
    saveSettings: saveSettingsMutation.mutateAsync,
    isSaving: saveSettingsMutation.isPending,
    recordAction: recordActionMutation.mutateAsync,
    approveAction: approveActionMutation.mutateAsync,
  };
}
