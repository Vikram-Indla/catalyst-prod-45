/**
 * Defects API
 */

import tmApiClient, { buildQueryString } from './client';
import type {
  Defect,
  CreateDefectInput,
  UpdateDefectInput,
  PaginatedResponse,
  PaginationParams,
  DefectSeverity,
  DefectStatus,
} from './types';

export interface ListDefectsParams extends PaginationParams {
  project_id: string;
  status?: DefectStatus;
  severity?: DefectSeverity;
  assigned_to?: string;
  reporter_id?: string;
  linked_run_id?: string;
  search?: string;
}

export const defectsApi = {
  /**
   * List defects with filtering and pagination
   */
  list: async (params: ListDefectsParams): Promise<PaginatedResponse<Defect>> => {
    const query = buildQueryString(params);
    const response = await tmApiClient.get(`/tm-defects?${query}`);
    return response.data;
  },

  /**
   * Get a single defect by ID
   */
  get: async (id: string): Promise<Defect> => {
    const response = await tmApiClient.get(`/tm-defects/${id}`);
    return response.data;
  },

  /**
   * Create a new defect
   */
  create: async (data: CreateDefectInput): Promise<Defect> => {
    const response = await tmApiClient.post('/tm-defects', data);
    return response.data;
  },

  /**
   * Update a defect
   */
  update: async ({ id, ...data }: UpdateDefectInput): Promise<Defect> => {
    const response = await tmApiClient.patch(`/tm-defects/${id}`, data);
    return response.data;
  },

  /**
   * Delete a defect
   */
  delete: async (id: string): Promise<void> => {
    await tmApiClient.delete(`/tm-defects/${id}`);
  },

  /**
   * Link defect to a run/step
   */
  linkToRun: async (defectId: string, runId: string, stepId?: string): Promise<Defect> => {
    const response = await tmApiClient.post(`/tm-defects/${defectId}/link`, {
      run_id: runId,
      step_id: stepId,
    });
    return response.data;
  },

  /**
   * Unlink defect from run/step
   */
  unlinkFromRun: async (defectId: string): Promise<Defect> => {
    const response = await tmApiClient.delete(`/tm-defects/${defectId}/link`);
    return response.data;
  },

  /**
   * Get defects for a specific run
   */
  getForRun: async (runId: string): Promise<Defect[]> => {
    const query = buildQueryString({ linked_run_id: runId });
    const response = await tmApiClient.get(`/tm-defects?${query}`);
    return response.data.data || response.data;
  },

  /**
   * Bulk update defect status
   */
  bulkUpdateStatus: async (
    ids: string[],
    status: DefectStatus
  ): Promise<Defect[]> => {
    const response = await tmApiClient.patch('/tm-defects/bulk-status', {
      ids,
      status,
    });
    return response.data;
  },
};

export default defectsApi;
