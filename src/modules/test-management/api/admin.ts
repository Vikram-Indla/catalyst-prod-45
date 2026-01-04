/**
 * Admin Settings API
 */

import tmApiClient, { buildQueryString } from './client';
import type {
  CasePriority,
  CaseType,
  Environment,
  Label,
  AuditLogEntry,
  PaginatedResponse,
  PaginationParams,
} from './types';

// Generic CRUD for admin entities
const createAdminCrud = <
  T extends { id: string },
  CreateInput extends object,
  UpdateInput extends object
>(
  entityPath: string
) => ({
  list: async (projectId: string): Promise<T[]> => {
    const query = buildQueryString({ project_id: projectId });
    const response = await tmApiClient.get(`/tm-admin/${entityPath}?${query}`);
    return response.data;
  },

  get: async (id: string): Promise<T> => {
    const response = await tmApiClient.get(`/tm-admin/${entityPath}/${id}`);
    return response.data;
  },

  create: async (data: CreateInput): Promise<T> => {
    const response = await tmApiClient.post(`/tm-admin/${entityPath}`, data);
    return response.data;
  },

  update: async (id: string, data: UpdateInput): Promise<T> => {
    const response = await tmApiClient.patch(`/tm-admin/${entityPath}/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await tmApiClient.delete(`/tm-admin/${entityPath}/${id}`);
  },

  reorder: async (projectId: string, orderedIds: string[]): Promise<void> => {
    await tmApiClient.post(`/tm-admin/${entityPath}/reorder`, {
      project_id: projectId,
      ordered_ids: orderedIds,
    });
  },
});

// Priority types
interface CreatePriorityInput {
  project_id: string;
  name: string;
  color: string;
  is_default?: boolean;
}

interface UpdatePriorityInput {
  name?: string;
  color?: string;
  is_default?: boolean;
}

// Type types
interface CreateTypeInput {
  project_id: string;
  name: string;
  icon?: string;
  color: string;
  is_default?: boolean;
}

interface UpdateTypeInput {
  name?: string;
  icon?: string;
  color?: string;
  is_default?: boolean;
}

// Environment types
interface CreateEnvironmentInput {
  project_id: string;
  name: string;
  description?: string;
  url?: string;
  is_default?: boolean;
}

interface UpdateEnvironmentInput {
  name?: string;
  description?: string;
  url?: string;
  is_default?: boolean;
}

// Label types
interface CreateLabelInput {
  project_id: string;
  name: string;
  color: string;
}

interface UpdateLabelInput {
  name?: string;
  color?: string;
}

export const adminApi = {
  priorities: createAdminCrud<CasePriority, CreatePriorityInput, UpdatePriorityInput>('priorities'),
  types: createAdminCrud<CaseType, CreateTypeInput, UpdateTypeInput>('types'),
  environments: createAdminCrud<Environment, CreateEnvironmentInput, UpdateEnvironmentInput>('environments'),
  labels: createAdminCrud<Label, CreateLabelInput, UpdateLabelInput>('labels'),

  /**
   * Get audit log
   */
  getAuditLog: async (
    projectId: string,
    params?: PaginationParams & {
      entity_type?: string;
      entity_id?: string;
      action?: string;
      actor_id?: string;
      date_from?: string;
      date_to?: string;
    }
  ): Promise<PaginatedResponse<AuditLogEntry>> => {
    const query = buildQueryString({ project_id: projectId, ...params });
    const response = await tmApiClient.get(`/tm-admin/audit-log?${query}`);
    return response.data;
  },
};

export default adminApi;
