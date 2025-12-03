/**
 * Folder Service - API functions for folder operations
 * Works with existing test_folders table schema
 */

import { supabase } from '@/integrations/supabase/client';
import {
  FolderNode,
  CreateFolderRequest,
  UpdateFolderRequest,
  ReorderFoldersRequest,
  EntityType
} from '@/types/folder';

/**
 * Get all folders for a program and entity type, organized hierarchically
 */
export async function getFolders(
  programId: string,
  entityType: EntityType
): Promise<FolderNode[]> {
  const { data, error } = await supabase
    .from('test_folders')
    .select('*')
    .eq('program_id', programId)
    .eq('entity_type', entityType)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;

  // Build hierarchical tree structure
  const folderMap = new Map<string, FolderNode>();
  const rootFolders: FolderNode[] = [];

  // First pass: create folder nodes with empty children
  (data || []).forEach((folder: any) => {
    folderMap.set(folder.id, {
      id: folder.id,
      name: folder.name,
      parent_id: folder.parent_folder_id,
      program_id: folder.program_id || folder.team_id, // Fallback to team_id
      entity_type: folder.entity_type,
      sort_order: folder.sort_order || 0,
      is_system: folder.is_system || false,
      created_by: folder.created_by,
      created_at: folder.created_at,
      updated_at: folder.updated_at,
      children: [],
      count: 0 // Will be calculated separately
    });
  });

  // Second pass: build tree structure
  (data || []).forEach((folder: any) => {
    const node = folderMap.get(folder.id)!;
    if (!folder.parent_folder_id) {
      rootFolders.push(node);
    } else {
      const parent = folderMap.get(folder.parent_folder_id);
      if (parent) {
        parent.children.push(node);
      }
    }
  });

  return rootFolders;
}

/**
 * Get folder counts including recursive child counts
 */
export async function getFolderCounts(
  programId: string,
  entityType: EntityType
): Promise<Map<string, number>> {
  // Fetch direct counts from tables based on entity type
  const tableName = entityType === 'test_cases' ? 'test_cases' 
    : entityType === 'test_sets' ? 'test_sets' 
    : 'test_cycles';

  const { data: items } = await supabase
    .from(tableName as any)
    .select('folder_id')
    .eq('program_id', programId);

  const countMap = new Map<string, number>();
  items?.forEach((item: any) => {
    const folderId = item.folder_id || 'not_assigned';
    countMap.set(folderId, (countMap.get(folderId) || 0) + 1);
  });

  return countMap;
}

/**
 * Create a new folder
 */
export async function createFolder(
  request: CreateFolderRequest
): Promise<FolderNode> {
  const { data: user } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('test_folders')
    .insert({
      name: request.name.trim(),
      parent_folder_id: request.parent_id,
      program_id: request.program_id,
      entity_type: request.entity_type,
      created_by: user.user?.id,
      sort_order: 0
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('A folder with this name already exists at this level');
    }
    throw error;
  }

  return {
    id: data.id,
    name: data.name,
    parent_id: data.parent_folder_id,
    program_id: data.program_id,
    entity_type: data.entity_type as EntityType,
    sort_order: data.sort_order || 0,
    is_system: data.is_system || false,
    created_by: data.created_by,
    created_at: data.created_at,
    updated_at: data.updated_at,
    children: [],
    count: 0
  };
}

/**
 * Update folder (rename or move)
 */
export async function updateFolder(
  folderId: string,
  request: UpdateFolderRequest
): Promise<FolderNode> {
  const updates: any = {};
  
  if (request.name !== undefined) {
    updates.name = request.name.trim();
  }
  
  if (request.parent_id !== undefined) {
    updates.parent_folder_id = request.parent_id;
  }

  const { data, error } = await supabase
    .from('test_folders')
    .update(updates)
    .eq('id', folderId)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('A folder with this name already exists at this level');
    }
    throw error;
  }

  return {
    id: data.id,
    name: data.name,
    parent_id: data.parent_folder_id,
    program_id: data.program_id,
    entity_type: data.entity_type as EntityType,
    sort_order: data.sort_order || 0,
    is_system: data.is_system || false,
    created_by: data.created_by,
    created_at: data.created_at,
    updated_at: data.updated_at,
    children: [],
    count: 0
  };
}

/**
 * Delete a folder (must be empty)
 */
export async function deleteFolder(folderId: string): Promise<void> {
  // Check if folder has children
  const { data: children } = await supabase
    .from('test_folders')
    .select('id')
    .eq('parent_folder_id', folderId)
    .limit(1);

  if (children && children.length > 0) {
    throw new Error('Cannot delete folder with subfolders');
  }

  // Check if folder has items
  const folderData = await supabase
    .from('test_folders')
    .select('entity_type')
    .eq('id', folderId)
    .single();

  if (folderData.data && folderData.data.entity_type) {
    const entityType = folderData.data.entity_type;
    const tableName = entityType === 'test_cases' ? 'test_cases'
      : entityType === 'test_sets' ? 'test_sets'
      : 'test_cycles';

    const { count } = await supabase
      .from(tableName as any)
      .select('id', { count: 'exact', head: true })
      .eq('folder_id', folderId);

    if (count && count > 0) {
      throw new Error(`Cannot delete folder. It contains ${count} items.`);
    }
  }

  const { error } = await supabase
    .from('test_folders')
    .delete()
    .eq('id', folderId);

  if (error) throw error;
}

/**
 * Reorder folders (batch update)
 */
export async function reorderFolders(
  request: ReorderFoldersRequest
): Promise<void> {
  // Update each folder's sort_order
  const promises = request.folder_orders.map(({ id, sort_order }) =>
    supabase
      .from('test_folders')
      .update({ sort_order })
      .eq('id', id)
  );

  const results = await Promise.all(promises);
  
  const errors = results.filter(r => r.error);
  if (errors.length > 0) {
    throw new Error('Failed to reorder folders');
  }
}

/**
 * Check if folder name is valid
 */
export function validateFolderName(name: string): { valid: boolean; error?: string } {
  const trimmed = name.trim();
  
  if (!trimmed) {
    return { valid: false, error: 'Folder name is required' };
  }
  
  if (trimmed.length > 100) {
    return { valid: false, error: 'Folder name must be 100 characters or less' };
  }
  
  // Check for invalid characters
  const invalidChars = /[\/\\:*?"<>|]/;
  if (invalidChars.test(trimmed)) {
    return { valid: false, error: 'Folder name contains invalid characters: / \\ : * ? " < > |' };
  }
  
  return { valid: true };
}

/**
 * Move folder to new parent
 */
export async function moveFolder(
  folderId: string,
  newParentId: string | null
): Promise<void> {
  // Check for circular reference
  const isCircular = await checkCircularReference(folderId, newParentId);
  if (isCircular) {
    throw new Error('Cannot move folder: would create circular reference');
  }

  const { error } = await supabase
    .from('test_folders')
    .update({ parent_folder_id: newParentId })
    .eq('id', folderId);

  if (error) throw error;
}

/**
 * Check if moving folder would create circular reference
 */
export async function checkCircularReference(
  folderId: string,
  targetParentId: string | null
): Promise<boolean> {
  if (!targetParentId) return false;
  if (folderId === targetParentId) return true;

  // Check if target is a descendant of source
  let currentId: string | null = targetParentId;
  const visited = new Set<string>();

  while (currentId) {
    if (currentId === folderId) return true;
    if (visited.has(currentId)) break; // Prevent infinite loop
    visited.add(currentId);

    const { data } = await supabase
      .from('test_folders')
      .select('parent_folder_id')
      .eq('id', currentId)
      .single();

    currentId = data?.parent_folder_id || null;
  }

  return false;
}
