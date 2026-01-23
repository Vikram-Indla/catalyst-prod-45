import { supabase } from '@/integrations/supabase/client';
import type { TestFolderWithCount, CreateFolderInput, UpdateFolderInput } from '@/types/test-folders';

// ============================================================
// QUERY FUNCTIONS
// ============================================================

/**
 * Get folder tree with test case counts for a project
 * Uses the get_folder_tree database function
 */
export async function getFolderTree(projectId: string): Promise<TestFolderWithCount[]> {
  const { data, error } = await (supabase as any).rpc('get_folder_tree', {
    p_project_id: projectId,
  });

  if (error) {
    console.error('Error fetching folder tree:', error);
    throw new Error(`Failed to fetch folders: ${error.message}`);
  }

  // Map database response to TypeScript interface
  return ((data as any[]) || []).map((folder: any) => ({
    id: folder.id,
    name: folder.name,
    description: folder.description,
    parentId: folder.parentId,
    sortOrder: folder.sortOrder,
    depth: folder.depth,
    count: folder.count,
    createdBy: folder.createdBy,
    createdAt: folder.createdAt,
  }));
}

/**
 * Get a single folder by ID
 */
export async function getFolderById(folderId: string): Promise<TestFolderWithCount | null> {
  const { data, error } = await (supabase as any)
    .from('test_folders')
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
  const { data: siblings } = await (supabase as any)
    .from('test_folders')
    .select('sort_order')
    .eq('project_id', input.projectId)
    .is('parent_id', input.parentId ?? null)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextSortOrder = siblings && siblings.length > 0 
    ? (siblings[0].sort_order + 1) 
    : 0;

  const { data, error } = await (supabase as any)
    .from('test_folders')
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
    console.error('Error creating folder:', error);
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

  const { data, error } = await (supabase as any)
    .from('test_folders')
    .update(updateData)
    .eq('id', folderId)
    .select()
    .single();

  if (error) {
    console.error('Error updating folder:', error);
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
  const { error } = await (supabase as any)
    .from('test_folders')
    .delete()
    .eq('id', folderId);

  if (error) {
    console.error('Error deleting folder:', error);
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
  const { data, error } = await (supabase as any)
    .from('test_cases')
    .update({ folder_id: folderId })
    .in('id', testCaseIds)
    .select('id');

  if (error) {
    console.error('Error moving test cases:', error);
    throw new Error(`Failed to move test cases: ${error.message}`);
  }

  return data?.length || 0;
}

/**
 * Get count of unassigned test cases (no folder)
 */
export async function getUnassignedTestCaseCount(projectId: string): Promise<number> {
  const { count, error } = await (supabase as any)
    .from('test_cases')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .is('folder_id', null);

  if (error) {
    console.error('Error counting unassigned test cases:', error);
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
        table: 'test_folders',
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
        table: 'test_cases',
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
