/**
 * AI API for Test Management
 */

import tmApiClient from './client';
import type {
  AIGenerateStepsInput,
  AIGenerateStepsResponse,
  AISuggestCasesInput,
  AISuggestCasesResponse,
} from './types';

export const aiApi = {
  /**
   * Generate test steps from title and description
   */
  generateSteps: async (data: AIGenerateStepsInput): Promise<AIGenerateStepsResponse> => {
    const response = await tmApiClient.post('/tm-ai/generate-steps', data);
    return response.data;
  },

  /**
   * Suggest test cases from requirement
   */
  suggestCases: async (data: AISuggestCasesInput): Promise<AISuggestCasesResponse> => {
    const response = await tmApiClient.post('/tm-ai/suggest-cases', data);
    return response.data;
  },

  /**
   * Enhance test case description
   */
  enhanceDescription: async (
    caseId: string,
    currentDescription: string
  ): Promise<{ enhanced_description: string }> => {
    const response = await tmApiClient.post('/tm-ai/enhance-description', {
      case_id: caseId,
      current_description: currentDescription,
    });
    return response.data;
  },

  /**
   * Generate test data suggestions
   */
  generateTestData: async (
    stepAction: string,
    context?: string
  ): Promise<{ test_data: string[] }> => {
    const response = await tmApiClient.post('/tm-ai/generate-test-data', {
      step_action: stepAction,
      context,
    });
    return response.data;
  },

  /**
   * Analyze failed test and suggest root cause
   */
  analyzeFailure: async (
    runId: string,
    stepId: string
  ): Promise<{ analysis: string; suggestions: string[] }> => {
    const response = await tmApiClient.post('/tm-ai/analyze-failure', {
      run_id: runId,
      step_id: stepId,
    });
    return response.data;
  },
};

export default aiApi;
