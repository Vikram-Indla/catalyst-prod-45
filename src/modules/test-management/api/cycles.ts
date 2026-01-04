/**
 * Test Cycles API
 */

import tmApiClient, { buildQueryString } from './client';
import type {
  TestCycle,
  CycleScope,
  CreateCycleInput,
  UpdateCycleInput,
  PaginatedResponse,
  PaginationParams,
  CycleStatus,
} from './types';

export interface ListCyclesParams extends PaginationParams {
  project_id: string;
  status?: CycleStatus;
  environment_id?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
}

export const cyclesApi = {
  /**
   * List test cycles with filtering and pagination
   */
  list: async (params: ListCyclesParams): Promise<PaginatedResponse<TestCycle>> => {
    const query = buildQueryString(params);
    const response = await tmApiClient.get(`/tm-cycles?${query}`);
    return response.data;
  },

  /**
   * Get a single test cycle by ID with scope
   */
  get: async (id: string): Promise<TestCycle> => {
    const response = await tmApiClient.get(`/tm-cycles/${id}`);
    return response.data;
  },

  /**
   * Create a new test cycle
   */
  create: async (data: CreateCycleInput): Promise<TestCycle> => {
    const response = await tmApiClient.post('/tm-cycles', data);
    return response.data;
  },

  /**
   * Update a test cycle
   */
  update: async ({ id, ...data }: UpdateCycleInput): Promise<TestCycle> => {
    const response = await tmApiClient.patch(`/tm-cycles/${id}`, data);
    return response.data;
  },

  /**
   * Delete a test cycle
   */
  delete: async (id: string): Promise<void> => {
    await tmApiClient.delete(`/tm-cycles/${id}`);
  },

  /**
   * Add cases to cycle scope
   */
  addCases: async (
    cycleId: string,
    caseIds: string[],
    assignments?: { case_id: string; assigned_to: string }[]
  ): Promise<CycleScope[]> => {
    const response = await tmApiClient.post(`/tm-cycles/${cycleId}/scope`, {
      case_ids: caseIds,
      assignments,
    });
    return response.data;
  },

  /**
   * Remove cases from cycle scope
   */
  removeCases: async (cycleId: string, scopeIds: string[]): Promise<void> => {
    await tmApiClient.delete(`/tm-cycles/${cycleId}/scope`, {
      data: { scope_ids: scopeIds },
    });
  },

  /**
   * Assign tester to scope item
   */
  assignTester: async (cycleId: string, scopeId: string, userId: string): Promise<CycleScope> => {
    const response = await tmApiClient.patch(`/tm-cycles/${cycleId}/scope/${scopeId}/assign`, {
      assigned_to: userId,
    });
    return response.data;
  },

  /**
   * Start a cycle (set status to active)
   */
  start: async (id: string): Promise<TestCycle> => {
    const response = await tmApiClient.post(`/tm-cycles/${id}/start`);
    return response.data;
  },

  /**
   * Complete a cycle
   */
  complete: async (id: string): Promise<TestCycle> => {
    const response = await tmApiClient.post(`/tm-cycles/${id}/complete`);
    return response.data;
  },

  /**
   * Get cycle statistics
   */
  getStats: async (id: string): Promise<TestCycle['statistics']> => {
    const response = await tmApiClient.get(`/tm-cycles/${id}/stats`);
    return response.data;
  },

  /**
   * Duplicate a cycle
   */
  duplicate: async (id: string, newTitle?: string): Promise<TestCycle> => {
    const response = await tmApiClient.post(`/tm-cycles/${id}/duplicate`, {
      title: newTitle,
    });
    return response.data;
  },
};

export default cyclesApi;
