import { supabase, typedQuery, typedQuery, typedQuery } from '@/integrations/supabase/client';
import type { TestFolderWithCount, CreateFolderInput, UpdateFolderInput } from '@/types/test-folders';

// ============================================================
// QUERY FUNCTIONS
// ============================================================

/**
 * Get folder tree with test case counts for a project
 * Uses direct query for reliability
 */
export async function getFolderTree(projectId: string): Promise<TestFolderWithCount[]> {
  if (!projectId) {
    console.warn('[FolderService] No projectId provided');
    return [];
  }

  // First, get all folders for this project
  const { data: folders, error: foldersError } = await typedQuery('tm_folders')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true });

  if (foldersError) {
    console.error('[FolderService] Error fetching folders:', foldersError);
    throw new Error(`Failed to fetch folders: ${foldersError.message}`);
  }

  if (!folders || folders.length === 0) {
    return [];
  }

  // Get test case counts per folder
  const { data: counts, error: countsError } = await typedQuery('tm_test_cases')
    .select('folder_id')
    .eq('project_id', projectId)
    .not('folder_id', 'is', null);

  if (countsError) {
    console.error('[FolderService] Error fetching counts:', countsError);
  }

  // Count test cases per folder
  const countMap = new Map<string, number>();
  if (counts) {
    counts.forEach((tc: any) => {
      if (tc.folder_id) {
        countMap.set(tc.folder_id, (countMap.get(tc.folder_id) || 0) + 1);
      }
    });
  }

  // Calculate depth for each folder
  const getDepth = (folder: any, allFolders: any[]): number => {
    let depth = 0;
    let current = folder;
    while (current?.parent_id) {
      depth++;
      current = allFolders.find((f: any) => f.id === current.parent_id);
      if (!current || depth > 10) break; // Prevent infinite loop
    }
    return depth;
  };

  // Transform to expected format
  const result: TestFolderWithCount[] = folders.map((folder: any) => ({
    id: folder.id,
    name: folder.name,
    description: folder.description,
    parentId: folder.parent_id,
    sortOrder: folder.sort_order || 0,
    depth: getDepth(folder, folders),
    count: countMap.get(folder.id) || 0,
    createdBy: folder.created_by,
    createdAt: folder.created_at,
  }));

  return result;
}

/**
 * Get a single folder by ID
 */
export async function getFolderById(folderId: string): Promise<TestFolderWithCount | null> {
  const { data, error } = await typedQuery('tm_folders')
    .select('*')
    .eq('id', folderId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Failed to fetch folder: ${error.message}`);
  }

  return data ? {
    id: data.id,
    name: data.name,
    description: data.description,
    parentId: data.parent_id,
    sortOrder: data.sort_order,
    depth: 0,
    count: 0,
    createdBy: data.created_by,
    createdAt: data.created_at,
  } : null;
}

// ============================================================
// MUTATION FUNCTIONS
// ============================================================

/**
 * Create a new folder
 */
export async function createFolder(input: CreateFolderInput): Promise<TestFolderWithCount> {
  // Get the next sort order for siblings
  const { data: siblings } = await typedQuery('tm_folders')
    .select('sort_order')
    .eq('project_id', input.projectId)
    .is('parent_id', input.parentId ?? null)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextSortOrder = siblings && siblings.length > 0 
    ? (siblings[0].sort_order + 1) 
    : 0;

  const { data, error } = await typedQuery('tm_folders')
    .insert({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      parent_id: input.parentId || null,
      project_id: input.projectId,
      sort_order: nextSortOrder,
    })
    .select()
    .single();

  if (error) {
    console.error('[FolderService] Error creating folder:', error);
    throw new Error(`Failed to create folder: ${error.message}`);
  }

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    parentId: data.parent_id,
    sortOrder: data.sort_order,
    depth: 0,
    count: 0,
    createdBy: data.created_by,
    createdAt: data.created_at,
  };
}

/**
 * Update a folder (rename, change description)
 */
export async function updateFolder(
  folderId: string,
  input: UpdateFolderInput
): Promise<TestFolderWithCount> {
  const updateData: Record<string, unknown> = {};

  if (input.name !== undefined) {
    updateData.name = input.name.trim();
  }
  if (input.description !== undefined) {
    updateData.description = input.description?.trim() || null;
  }

  const { data, error } = await typedQuery('tm_folders')
    .update(updateData)
    .eq('id', folderId)
    .select()
    .single();

  if (error) {
    console.error('[FolderService] Error updating folder:', error);
    throw new Error(`Failed to update folder: ${error.message}`);
  }

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    parentId: data.parent_id,
    sortOrder: data.sort_order,
    depth: 0,
    count: 0,
    createdBy: data.created_by,
    createdAt: data.created_at,
  };
}

/**
 * Delete a folder
 * Test cases in this folder will become unassigned (folder_id = null)
 * Child folders will be cascade deleted
 */
export async function deleteFolder(folderId: string): Promise<void> {
  const { error } = await typedQuery('tm_folders')
    .delete()
    .eq('id', folderId);

  if (error) {
    console.error('[FolderService] Error deleting folder:', error);
    throw new Error(`Failed to delete folder: ${error.message}`);
  }
}

/**
 * Move test cases to a folder (or unassigned if folderId is null)
 */
export async function moveTestCasesToFolder(
  testCaseIds: string[],
  folderId: string | null
): Promise<number> {
  // Filter out any invalid IDs (empty strings, display IDs like "TC-XXXX")
  const validUUIDs = testCaseIds.filter(id => {
    if (!id || id.trim() === '') return false;
    // UUID pattern: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidPattern.test(id);
  });
  
  if (validUUIDs.length === 0) {
    console.warn('[FolderService] No valid UUIDs provided. Original IDs:', testCaseIds);
    return 0;
  }

  const { data, error } = await typedQuery('tm_test_cases')
    .update({ folder_id: folderId })
    .in('id', validUUIDs)
    .select('id');

  if (error) {
    console.error('[FolderService] Error moving test cases:', error);
    throw new Error(`Failed to move test cases: ${error.message}`);
  }

  return data?.length || 0;
}

/**
 * Get count of unassigned test cases (no folder)
 */
export async function getUnassignedTestCaseCount(projectId: string): Promise<number> {
  const { count, error } = await typedQuery('tm_test_cases')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .is('folder_id', null);

  if (error) {
    console.error('[FolderService] Error counting unassigned test cases:', error);
    return 0;
  }

  return count || 0;
}

// ============================================================
// REAL-TIME SUBSCRIPTION
// ============================================================

/**
 * Subscribe to folder changes for real-time updates
 */
export function subscribeFolderChanges(
  projectId: string,
  callback: () => void
) {
  const channel = supabase
    .channel(`test-folders-${projectId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tm_folders',
        filter: `project_id=eq.${projectId}`,
      },
      () => {
        callback();
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to test case folder changes (for updating counts)
 */
export function subscribeTestCaseFolderChanges(
  projectId: string,
  callback: () => void
) {
  const channel = supabase
    .channel(`test-cases-folder-${projectId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'tm_test_cases',
        filter: `project_id=eq.${projectId}`,
      },
      (payload: any) => {
        // Only trigger callback if folder_id changed
        if (payload.old?.folder_id !== payload.new?.folder_id) {
          callback();
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
