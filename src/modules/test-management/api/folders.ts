/**
 * Folders API
 */

import tmApiClient, { buildQueryString } from './client';
import type { Folder, CreateFolderInput } from './types';

export interface ListFoldersParams {
  project_id: string;
  parent_id?: string | null;
}

export const foldersApi = {
  /**
   * List folders (optionally filtered by parent)
   */
  list: async (params: ListFoldersParams): Promise<Folder[]> => {
    const query = buildQueryString(params);
    const response = await tmApiClient.get(`/tm-cases/folders?${query}`);
    return response.data;
  },

  /**
   * Get folder tree for a project
   */
  getTree: async (projectId: string): Promise<Folder[]> => {
    const response = await tmApiClient.get(`/tm-cases/folders/tree?project_id=${projectId}`);
    return response.data;
  },

  /**
   * Get a single folder by ID
   */
  get: async (id: string): Promise<Folder> => {
    const response = await tmApiClient.get(`/tm-cases/folders/${id}`);
    return response.data;
  },

  /**
   * Create a new folder
   */
  create: async (data: CreateFolderInput): Promise<Folder> => {
    const response = await tmApiClient.post('/tm-cases/folders', data);
    return response.data;
  },

  /**
   * Update a folder
   */
  update: async (
    id: string,
    data: Partial<Omit<CreateFolderInput, 'project_id'>>
  ): Promise<Folder> => {
    const response = await tmApiClient.patch(`/tm-cases/folders/${id}`, data);
    return response.data;
  },

  /**
   * Delete a folder
   */
  delete: async (id: string, moveCasesTo?: string | null): Promise<void> => {
    await tmApiClient.delete(`/tm-cases/folders/${id}`, {
      data: { move_cases_to: moveCasesTo },
    });
  },

  /**
   * Move a folder
   */
  move: async (id: string, newParentId: string | null): Promise<Folder> => {
    const response = await tmApiClient.patch(`/tm-cases/folders/${id}/move`, {
      parent_id: newParentId,
    });
    return response.data;
  },

  /**
   * Reorder folders within a parent
   */
  reorder: async (projectId: string, parentId: string | null, orderedIds: string[]): Promise<void> => {
    await tmApiClient.post('/tm-cases/folders/reorder', {
      project_id: projectId,
      parent_id: parentId,
      ordered_ids: orderedIds,
    });
  },
};

export default foldersApi;
