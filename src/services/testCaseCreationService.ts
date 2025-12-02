/**
 * CATALYST TESTS - Test Case Creation Service
 * API service for comprehensive test case creation
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  CreateTestCaseRequest,
  TestCaseStep,
  TestCaseParameter,
  TestCaseDataset,
  WorkItemLink,
  AIGenerateStepsRequest,
  AIGenerateStepsResponse,
} from '@/types/testCaseCreation';

export const testCaseCreationService = {
  /**
   * Create a new test case with all related data
   */
  async createTestCase(
    request: CreateTestCaseRequest,
    steps: TestCaseStep[],
    parameters: TestCaseParameter[],
    datasets: TestCaseDataset[],
    workItemLinks: WorkItemLink[],
    userId: string
  ) {
    // Create the test case
    const { data: testCase, error: caseError } = await supabase
      .from('test_cases')
      .insert([{
        ...request,
        version: 1,
        created_by: userId,
      } as any]) // Use any to bypass type check until types regenerate
      .select()
      .single();

    if (caseError) throw caseError;

    // Create steps
    if (steps.length > 0) {
      const stepsData = steps.map(step => ({
        ...step,
        case_id: testCase.id,
        case_version: 1,
      }));

      const { error: stepsError } = await supabase
        .from('test_case_steps' as any)
        .insert(stepsData as any);

      if (stepsError) throw stepsError;
    }

    // Create parameters
    if (parameters.length > 0) {
      const paramsData = parameters.map(param => ({
        ...param,
        case_id: testCase.id,
      }));

      const { error: paramsError } = await supabase
        .from('test_case_parameters' as any)
        .insert(paramsData as any);

      if (paramsError) throw paramsError;
    }

    // Create datasets
    if (datasets.length > 0) {
      const datasetsData = datasets.map(dataset => ({
        ...dataset,
        case_id: testCase.id,
      }));

      const { error: datasetsError } = await supabase
        .from('test_case_datasets' as any)
        .insert(datasetsData as any);

      if (datasetsError) throw datasetsError;
    }

    // Create work item links
    if (workItemLinks.length > 0) {
      const linksData = workItemLinks.map(link => ({
        case_id: testCase.id,
        work_item_id: link.work_item_id,
        work_item_type: link.work_item_type,
      }));

      const { error: linksError } = await supabase
        .from('test_case_work_item_links' as any)
        .insert(linksData as any);

      if (linksError) throw linksError;
    }

    // Create initial version record
    const { error: versionError} = await supabase
      .from('test_case_versions' as any)
      .insert([{
        case_id: testCase.id,
        version: 1,
        title: request.title,
        objective: request.objective,
        preconditions: request.preconditions,
        change_summary: 'Initial version',
        created_by: userId,
      } as any]);

    if (versionError) throw versionError;

    return testCase;
  },

  /**
   * AI-powered step generation
   */
  async generateSteps(request: AIGenerateStepsRequest): Promise<AIGenerateStepsResponse> {
    const { data, error } = await supabase.functions.invoke('ai-generate-test-steps', {
      body: request,
    });

    if (error) throw error;
    return data;
  },

  /**
   * Search work items for linking
   */
  async searchWorkItems(query: string, projectId?: string) {
    const { data, error } = await supabase
      .from('stories')
      .select('id, title, description, status')
      .ilike('title', `%${query}%`)
      .limit(20);

    if (error) throw error;

    return (data || []).map(item => ({
      id: item.id,
      key: item.id.substring(0, 8).toUpperCase(),
      title: item.title,
      type: 'story',
      status: item.status,
    }));
  },

  /**
   * Get test case with all related data
   */
  async getTestCaseComplete(caseId: string, version?: number) {
    const versionFilter = version || 1;

    const [caseData, stepsData, paramsData, datasetsData, linksData] = await Promise.all([
      supabase.from('test_cases').select('*').eq('id', caseId).single(),
      supabase.from('test_case_steps' as any).select('*').eq('case_id', caseId).eq('case_version', versionFilter).order('step_number'),
      supabase.from('test_case_parameters' as any).select('*').eq('case_id', caseId),
      supabase.from('test_case_datasets' as any).select('*').eq('case_id', caseId),
      supabase.from('test_case_work_item_links' as any).select('*').eq('case_id', caseId),
    ]);

    if (caseData.error) throw caseData.error;

    return {
      testCase: caseData.data,
      steps: stepsData.data || [],
      parameters: paramsData.data || [],
      datasets: datasetsData.data || [],
      workItemLinks: linksData.data || [],
    };
  },

  /**
   * Get available components for a program
   */
  async getComponents(programId: string) {
    // This would typically come from program configuration
    // For now, return common components
    return [
      'Authentication',
      'Authorization',
      'User Management',
      'API',
      'UI/UX',
      'Database',
      'Integration',
      'Performance',
      'Security',
    ];
  },

  /**
   * Get available releases for a program
   */
  async getReleases(programId: string) {
    const { data, error } = await supabase
      .from('program_increments')
      .select('id, name, start_date, end_date')
      .order('start_date', { ascending: false })
      .limit(10);

    if (error) throw error;

    return (data || []).map(pi => ({
      id: pi.id,
      name: pi.name,
      version: pi.name,
      release_date: pi.end_date,
    }));
  },

  /**
   * Generate automation key from title
   */
  generateAutomationKey(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  },
};
