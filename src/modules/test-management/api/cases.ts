/**
 * Test Cases API
 */

import tmApiClient, { buildQueryString } from './client';
import type {
  TestCase,
  TestStep,
  CreateTestCaseInput,
  UpdateTestCaseInput,
  PaginatedResponse,
  PaginationParams,
  CaseStatus,
} from './types';

export interface ListCasesParams extends PaginationParams {
  project_id: string;
  folder_id?: string;
  status?: CaseStatus;
  priority_id?: string;
  type_id?: string;
  owner_id?: string;
  search?: string;
  is_template?: boolean;
  tags?: string[];
}

export const casesApi = {
  /**
   * List test cases with filtering and pagination
   */
  list: async (params: ListCasesParams): Promise<PaginatedResponse<TestCase>> => {
    const query = buildQueryString(params);
    const response = await tmApiClient.get(`/tm-cases?${query}`);
    return response.data;
  },

  /**
   * Get a single test case by ID
   */
  get: async (id: string): Promise<TestCase> => {
    const response = await tmApiClient.get(`/tm-cases/${id}`);
    return response.data;
  },

  /**
   * Create a new test case
   */
  create: async (data: CreateTestCaseInput): Promise<TestCase> => {
    const response = await tmApiClient.post('/tm-cases', data);
    return response.data;
  },

  /**
   * Update a test case
   */
  update: async ({ id, ...data }: UpdateTestCaseInput): Promise<TestCase> => {
    const response = await tmApiClient.patch(`/tm-cases/${id}`, data);
    return response.data;
  },

  /**
   * Delete a test case
   */
  delete: async (id: string): Promise<void> => {
    await tmApiClient.delete(`/tm-cases/${id}`);
  },

  /**
   * Bulk delete test cases
   */
  bulkDelete: async (ids: string[]): Promise<void> => {
    await tmApiClient.post('/tm-cases/bulk-delete', { ids });
  },

  /**
   * Duplicate a test case
   */
  duplicate: async (id: string, targetFolderId?: string): Promise<TestCase> => {
    const response = await tmApiClient.post(`/tm-cases/${id}/duplicate`, {
      target_folder_id: targetFolderId,
    });
    return response.data;
  },

  /**
   * Move test cases to a folder
   */
  move: async (ids: string[], folderId: string | null): Promise<void> => {
    await tmApiClient.post('/tm-cases/move', {
      case_ids: ids,
      folder_id: folderId,
    });
  },

  /**
   * Get test case steps
   */
  getSteps: async (caseId: string): Promise<TestStep[]> => {
    const response = await tmApiClient.get(`/tm-cases/${caseId}/steps`);
    return response.data;
  },

  /**
   * Update test case steps (replace all)
   */
  updateSteps: async (
    caseId: string,
    steps: Omit<TestStep, 'id' | 'case_id' | 'created_at' | 'updated_at'>[]
  ): Promise<TestStep[]> => {
    const response = await tmApiClient.put(`/tm-cases/${caseId}/steps`, { steps });
    return response.data;
  },

  /**
   * Create test case from template
   */
  createFromTemplate: async (
    templateId: string,
    data: Partial<CreateTestCaseInput>
  ): Promise<TestCase> => {
    const response = await tmApiClient.post(`/tm-cases/from-template/${templateId}`, data);
    return response.data;
  },
};

export default casesApi;
