/**
 * Test Executions (Runs) API
 */

import tmApiClient, { buildQueryString } from './client';
import type {
  TestRun,
  StepResult,
  CreateRunInput,
  UpdateStepResultInput,
  BulkUpdateStepsInput,
  CompleteRunInput,
  PaginatedResponse,
  PaginationParams,
  ExecutionStatus,
} from './types';

export interface ListRunsParams extends PaginationParams {
  cycle_id?: string;
  scope_id?: string;
  status?: ExecutionStatus;
  executed_by?: string;
}

export const executionsApi = {
  /**
   * List test runs with filtering
   */
  list: async (params: ListRunsParams): Promise<PaginatedResponse<TestRun>> => {
    const query = buildQueryString(params);
    const response = await tmApiClient.get(`/tm-runs?${query}`);
    return response.data;
  },

  /**
   * Get a single run with step results
   */
  get: async (id: string): Promise<TestRun> => {
    const response = await tmApiClient.get(`/tm-runs/${id}`);
    return response.data;
  },

  /**
   * Create a new test run
   */
  create: async (data: CreateRunInput): Promise<TestRun> => {
    const response = await tmApiClient.post('/tm-runs', data);
    return response.data;
  },

  /**
   * Update a single step result
   */
  updateStep: async (
    runId: string,
    stepId: string,
    data: UpdateStepResultInput
  ): Promise<StepResult> => {
    const response = await tmApiClient.patch(`/tm-runs/${runId}/steps/${stepId}`, data);
    return response.data;
  },

  /**
   * Bulk update step results
   */
  bulkUpdateSteps: async (runId: string, data: BulkUpdateStepsInput): Promise<StepResult[]> => {
    const response = await tmApiClient.patch(`/tm-runs/${runId}/steps/bulk`, data);
    return response.data;
  },

  /**
   * Complete a test run
   */
  complete: async (id: string, data?: CompleteRunInput): Promise<TestRun> => {
    const response = await tmApiClient.post(`/tm-runs/${id}/complete`, data || {});
    return response.data;
  },

  /**
   * Re-run failed tests in a cycle
   */
  rerunFailed: async (
    cycleId: string,
    scopeIds?: string[]
  ): Promise<{ reset_count: number }> => {
    const response = await tmApiClient.post('/tm-runs/rerun-failed', {
      cycle_id: cycleId,
      scope_ids: scopeIds,
    });
    return response.data;
  },

  /**
   * Pass all remaining steps
   */
  passAllSteps: async (runId: string): Promise<TestRun> => {
    const response = await tmApiClient.post(`/tm-runs/${runId}/pass-all`);
    return response.data;
  },

  /**
   * Get run history for a scope
   */
  getHistory: async (scopeId: string): Promise<TestRun[]> => {
    const query = buildQueryString({ scope_id: scopeId });
    const response = await tmApiClient.get(`/tm-runs?${query}`);
    return response.data.data || response.data;
  },
};

export default executionsApi;
