// =====================================================
// GHERKIN/BDD HOOKS
// Hooks for managing Gherkin scenarios and step definitions
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type GherkinKeyword = 'Given' | 'When' | 'Then' | 'And' | 'But';

export interface GherkinStep {
  id?: string;
  step_number: number;
  keyword: GherkinKeyword;
  step_text: string;
  data_table?: Record<string, unknown>[] | null;
  doc_string?: string | null;
  definition_id?: string | null;
}

export interface GherkinScenario {
  feature: string | null;
  scenario: string | null;
  format: 'classic' | 'bdd';
  steps: GherkinStep[];
}

export interface StepDefinition {
  id: string;
  keyword: GherkinKeyword;
  pattern: string;
  description: string | null;
  usage_count: number;
}

// Hook to get Gherkin scenario for a test case
export function useGherkinScenario(caseId: string | null) {
  return useQuery({
    queryKey: ['gherkin-scenario', caseId],
    queryFn: async (): Promise<GherkinScenario> => {
      if (!caseId) throw new Error('Case ID required');

      const { data, error } = await supabase.rpc('tm_get_gherkin_scenario', {
        p_case_id: caseId,
      });

      if (error) throw error;
      return data as unknown as GherkinScenario;
    },
    enabled: !!caseId,
  });
}

// Hook to save Gherkin scenario
export function useSaveGherkinScenario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      caseId,
      feature,
      scenario,
      steps,
    }: {
      caseId: string;
      feature: string;
      scenario: string;
      steps: Omit<GherkinStep, 'id' | 'step_number'>[];
    }) => {
      const { data, error } = await supabase.rpc('tm_save_gherkin_scenario', {
        p_case_id: caseId,
        p_feature: feature,
        p_scenario: scenario,
        p_steps: JSON.parse(JSON.stringify(steps)),
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['gherkin-scenario', variables.caseId] });
      queryClient.invalidateQueries({ queryKey: ['test-case', variables.caseId] });
    },
  });
}

// Hook to convert classic steps to BDD
export function useConvertToBdd() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (caseId: string) => {
      const { data, error } = await supabase.rpc('tm_convert_to_bdd', {
        p_case_id: caseId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, caseId) => {
      queryClient.invalidateQueries({ queryKey: ['gherkin-scenario', caseId] });
      queryClient.invalidateQueries({ queryKey: ['test-case', caseId] });
      queryClient.invalidateQueries({ queryKey: ['case-steps', caseId] });
    },
  });
}

// Hook to get step suggestions
export function useStepSuggestions(projectId: string | null, keyword?: GherkinKeyword, partialText?: string) {
  return useQuery({
    queryKey: ['step-suggestions', projectId, keyword, partialText],
    queryFn: async (): Promise<StepDefinition[]> => {
      if (!projectId) return [];

      const { data, error } = await supabase.rpc('tm_get_step_suggestions', {
        p_project_id: projectId,
        p_keyword: keyword || null,
        p_partial_text: partialText || '',
      });

      if (error) throw error;
      return (data || []) as StepDefinition[];
    },
    enabled: !!projectId,
  });
}

// Hook to manage step definitions
export function useStepDefinitions(projectId: string | null) {
  return useQuery({
    queryKey: ['step-definitions', projectId],
    queryFn: async (): Promise<StepDefinition[]> => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from('tm_step_definitions')
        .select('id, keyword, pattern, description, usage_count')
        .eq('project_id', projectId)
        .order('usage_count', { ascending: false });

      if (error) throw error;
      return (data || []) as StepDefinition[];
    },
    enabled: !!projectId,
  });
}

// Hook to create step definition
export function useCreateStepDefinition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      keyword,
      pattern,
      description,
    }: {
      projectId: string;
      keyword: GherkinKeyword;
      pattern: string;
      description?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('tm_step_definitions')
        .insert({
          project_id: projectId,
          keyword,
          pattern,
          description: description || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['step-definitions', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['step-suggestions'] });
    },
  });
}

// Utility to parse Gherkin text
export function parseGherkinText(text: string): { feature: string; scenario: string; steps: Omit<GherkinStep, 'id' | 'step_number'>[] } {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  let feature = '';
  let scenario = '';
  const steps: Omit<GherkinStep, 'id' | 'step_number'>[] = [];

  for (const line of lines) {
    if (line.startsWith('Feature:')) {
      feature = line.replace('Feature:', '').trim();
    } else if (line.startsWith('Scenario:') || line.startsWith('Scenario Outline:')) {
      scenario = line.replace(/Scenario( Outline)?:/, '').trim();
    } else {
      const keywordMatch = line.match(/^(Given|When|Then|And|But)\s+(.+)$/i);
      if (keywordMatch) {
        const keyword = keywordMatch[1] as GherkinKeyword;
        const stepText = keywordMatch[2];
        steps.push({ keyword, step_text: stepText });
      }
    }
  }

  return { feature, scenario, steps };
}

// Utility to format Gherkin scenario as text
export function formatGherkinText(scenario: GherkinScenario): string {
  const lines: string[] = [];

  if (scenario.feature) {
    lines.push(`Feature: ${scenario.feature}`);
    lines.push('');
  }

  if (scenario.scenario) {
    lines.push(`  Scenario: ${scenario.scenario}`);
  }

  for (const step of scenario.steps) {
    lines.push(`    ${step.keyword} ${step.step_text}`);
    if (step.doc_string) {
      lines.push('      """');
      lines.push(`      ${step.doc_string}`);
      lines.push('      """');
    }
  }

  return lines.join('\n');
}
