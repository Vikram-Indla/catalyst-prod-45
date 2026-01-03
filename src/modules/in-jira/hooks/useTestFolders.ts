/**
 * Test Folders Hook
 * CRUD operations for hierarchical test folders with drag-drop reorder
 */

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { logAuditEntry } from '@/lib/auditLogger';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export type FolderEntityType = 'test_cases' | 'test_sets' | 'test_cycles';

export interface TestFolder {
  id: string;
  name: string;
  parent_folder_id: string | null;
  program_id: string | null;
  team_id: string | null;
  entity_type: FolderEntityType | null;
  sort_order: number | null;
  is_system: boolean | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Computed for tree
  children?: TestFolder[];
  depth?: number;
}

export interface CreateFolderInput {
  name: string;
  parent_folder_id?: string | null;
  program_id: string;
  entity_type: FolderEntityType;
}

export interface UpdateFolderInput {
  id: string;
  name?: string;
  parent_folder_id?: string | null;
  sort_order?: number;
}

export interface MoveFolderInput {
  id: string;
  newParentId: string | null;
  newSortOrder: number;
}

export interface ReorderFoldersInput {
  folderId: string;
  newSortOrder: number;
}[]

async function logFolderActivity(
  userId: string | undefined,
  activityType: string,
  entityId: string,
  entityTitle: string,
  programId: string | null,
  description?: string
) {
  try {
    await supabase.from('test_activity_log').insert({
      user_id: userId,
      activity_type: activityType,
      entity_type: 'test_folder',
      entity_id: entityId,
      entity_title: entityTitle,
      program_id: programId,
      description: description || null,
    });
  } catch (err) {
    console.error('Failed to log folder activity:', err);
  }
}

// Build tree from flat list
function buildFolderTree(folders: TestFolder[], parentId: string | null = null, depth = 0): TestFolder[] {
  return folders
    .filter(f => f.parent_folder_id === parentId)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map(folder => ({
      ...folder,
      depth,
      children: buildFolderTree(folders, folder.id, depth + 1),
    }));
}

// Flatten tree back to list (for display)
function flattenTree(folders: TestFolder[]): TestFolder[] {
  const result: TestFolder[] = [];
  for (const folder of folders) {
    result.push(folder);
    if (folder.children && folder.children.length > 0) {
      result.push(...flattenTree(folder.children));
    }
  }
  return result;
}

// Get all descendant IDs
function getAllDescendantIds(folder: TestFolder): string[] {
  const ids: string[] = [];
  if (folder.children) {
    for (const child of folder.children) {
      ids.push(child.id);
      ids.push(...getAllDescendantIds(child));
    }
  }
  return ids;
}

export function useTestFolders(programId: string | null, entityType: FolderEntityType) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch folders for program and entity type
  const {
    data: folders,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['test-folders', programId, entityType],
    queryFn: async () => {
      if (!programId) return [];

      const { data, error } = await supabase
        .from('test_folders')
        .select('*')
        .eq('program_id', programId)
        .eq('entity_type', entityType)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as TestFolder[];
    },
    enabled: !!programId && !!user,
  });

  // Build tree structure
  const folderTree = useMemo(() => {
    if (!folders) return [];
    return buildFolderTree(folders);
  }, [folders]);

  // Flat list with depth info
  const flatFolders = useMemo(() => {
    return flattenTree(folderTree);
  }, [folderTree]);

  // Create folder
  const createMutation = useMutation({
    mutationFn: async (input: CreateFolderInput) => {
      if (!user) throw new Error('Not authenticated');

      // Get max sort order for siblings
      const { data: siblings } = await supabase
        .from('test_folders')
        .select('sort_order')
        .eq('program_id', input.program_id)
        .eq('entity_type', input.entity_type)
        .eq('parent_folder_id', input.parent_folder_id ?? null)
        .order('sort_order', { ascending: false })
        .limit(1);

      const maxOrder = siblings?.[0]?.sort_order ?? 0;

      const { data, error } = await supabase
        .from('test_folders')
        .insert([{
          name: input.name,
          parent_folder_id: input.parent_folder_id || null,
          program_id: input.program_id,
          entity_type: input.entity_type,
          sort_order: maxOrder + 1,
          created_by: user.id,
        }])
        .select()
        .single();

      if (error) throw error;

      await logAuditEntry({
        entityType: 'test_folders',
        entityId: data.id,
        action: 'created',
        afterData: data,
      });

      await logFolderActivity(
        user.id,
        'folder_created',
        data.id,
        data.name,
        input.program_id,
        `Created folder "${data.name}"`
      );

      return data as TestFolder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-folders'] });
      toast.success('Folder created');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Rename folder
  const renameMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { data: before } = await supabase
        .from('test_folders')
        .select('*')
        .eq('id', id)
        .single();

      const { data, error } = await supabase
        .from('test_folders')
        .update({ name })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await logAuditEntry({
        entityType: 'test_folders',
        entityId: id,
        action: 'updated',
        beforeData: before,
        afterData: data,
      });

      return data as TestFolder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-folders'] });
      toast.success('Folder renamed');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Move folder (change parent and/or order)
  const moveMutation = useMutation({
    mutationFn: async (input: MoveFolderInput) => {
      if (!user) throw new Error('Not authenticated');

      const { data: before } = await supabase
        .from('test_folders')
        .select('*')
        .eq('id', input.id)
        .single();

      // Check for circular reference
      if (input.newParentId) {
        const folder = folders?.find(f => f.id === input.id);
        if (folder) {
          const tree = buildFolderTree(folders || [], input.id);
          const descendantIds = tree.length > 0 ? getAllDescendantIds({ ...folder, children: tree }) : [];
          if (descendantIds.includes(input.newParentId)) {
            throw new Error('Cannot move folder into its own subfolder');
          }
        }
      }

      const { data, error } = await supabase
        .from('test_folders')
        .update({
          parent_folder_id: input.newParentId,
          sort_order: input.newSortOrder,
        })
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw error;

      await logAuditEntry({
        entityType: 'test_folders',
        entityId: input.id,
        action: 'updated',
        beforeData: before,
        afterData: data,
      });

      return data as TestFolder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-folders'] });
      toast.success('Folder moved');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Reorder folders (batch update sort orders)
  const reorderMutation = useMutation({
    mutationFn: async (reorders: { folderId: string; newSortOrder: number }[]) => {
      if (!user) throw new Error('Not authenticated');

      for (const { folderId, newSortOrder } of reorders) {
        await supabase
          .from('test_folders')
          .update({ sort_order: newSortOrder })
          .eq('id', folderId);
      }

      return reorders;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-folders'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete folder (soft - reassign children to parent)
  const deleteMutation = useMutation({
    mutationFn: async (folderId: string) => {
      if (!user) throw new Error('Not authenticated');

      const folder = folders?.find(f => f.id === folderId);
      if (!folder) throw new Error('Folder not found');

      if (folder.is_system) {
        throw new Error('Cannot delete system folder');
      }

      // Reassign children to parent
      const { error: childError } = await supabase
        .from('test_folders')
        .update({ parent_folder_id: folder.parent_folder_id })
        .eq('parent_folder_id', folderId);

      if (childError) throw childError;

      // Reassign test cases in this folder to parent
      await supabase
        .from('test_cases')
        .update({ folder_id: folder.parent_folder_id })
        .eq('folder_id', folderId);

      // Reassign test sets in this folder to parent
      await supabase
        .from('test_sets')
        .update({ folder_id: folder.parent_folder_id })
        .eq('folder_id', folderId);

      // Reassign test cycles in this folder to parent
      await supabase
        .from('test_cycles')
        .update({ folder_id: folder.parent_folder_id })
        .eq('folder_id', folderId);

      // Delete the folder
      const { error } = await supabase
        .from('test_folders')
        .delete()
        .eq('id', folderId);

      if (error) throw error;

      await logAuditEntry({
        entityType: 'test_folders',
        entityId: folderId,
        action: 'deleted',
        beforeData: folder,
      });

      await logFolderActivity(
        user.id,
        'folder_deleted',
        folderId,
        folder.name,
        folder.program_id,
        `Deleted folder "${folder.name}"`
      );

      return folderId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-folders'] });
      queryClient.invalidateQueries({ queryKey: ['test-cases'] });
      queryClient.invalidateQueries({ queryKey: ['test-sets'] });
      queryClient.invalidateQueries({ queryKey: ['test-cycles'] });
      toast.success('Folder deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    folders: folders || [],
    folderTree,
    flatFolders,
    isLoading,
    error,
    refetch,
    createFolder: createMutation.mutateAsync,
    renameFolder: renameMutation.mutateAsync,
    moveFolder: moveMutation.mutateAsync,
    reorderFolders: reorderMutation.mutateAsync,
    deleteFolder: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isRenaming: renameMutation.isPending,
    isMoving: moveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

// Hook for persisting expanded folder state per user
export function useFolderExpandedState(programId: string | null, entityType: FolderEntityType) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const scope = `test_folders_expanded_${entityType}`;

  const { data: expandedIds, isLoading } = useQuery({
    queryKey: ['folder-expanded-state', programId, entityType, user?.id],
    queryFn: async () => {
      if (!user?.id || !programId) return new Set<string>();

      const { data } = await supabase
        .from('user_preferences')
        .select('value')
        .eq('user_id', user.id)
        .eq('scope', `${scope}_${programId}`)
        .single();

      if (data?.value && Array.isArray(data.value)) {
        return new Set<string>(data.value as string[]);
      }
      return new Set<string>();
    },
    enabled: !!user?.id && !!programId,
  });

  const saveExpandedState = useMutation({
    mutationFn: async (ids: Set<string>) => {
      if (!user?.id || !programId) return;

      const idsArray = Array.from(ids);
      const scopeKey = `${scope}_${programId}`;

      // Check if record exists
      const { data: existing } = await supabase
        .from('user_preferences')
        .select('id')
        .eq('user_id', user.id)
        .eq('scope', scopeKey)
        .single();

      if (existing) {
        // Update existing
        await supabase
          .from('user_preferences')
          .update({ value: idsArray as unknown as Json })
          .eq('id', existing.id);
      } else {
        // Insert new
        await supabase
          .from('user_preferences')
          .insert({
            user_id: user.id,
            scope: scopeKey,
            value: idsArray as unknown as Json,
          });
      }

      return ids;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folder-expanded-state'] });
    },
  });

  const toggleExpanded = (folderId: string) => {
    const current = expandedIds || new Set<string>();
    const updated = new Set(current);
    if (updated.has(folderId)) {
      updated.delete(folderId);
    } else {
      updated.add(folderId);
    }
    saveExpandedState.mutate(updated);
    return updated;
  };

  const expandAll = (folderIds: string[]) => {
    const updated = new Set<string>(folderIds);
    saveExpandedState.mutate(updated);
    return updated;
  };

  const collapseAll = () => {
    const updated = new Set<string>();
    saveExpandedState.mutate(updated);
    return updated;
  };

  return {
    expandedIds: expandedIds || new Set<string>(),
    isLoading,
    toggleExpanded,
    expandAll,
    collapseAll,
    isExpanded: (id: string) => expandedIds?.has(id) ?? false,
  };
}

// Helper hook to get folder path (breadcrumb)
export function useFolderPath(folders: TestFolder[], folderId: string | null): TestFolder[] {
  if (!folderId || !folders.length) return [];

  const path: TestFolder[] = [];
  let current = folders.find(f => f.id === folderId);

  while (current) {
    path.unshift(current);
    current = current.parent_folder_id
      ? folders.find(f => f.id === current!.parent_folder_id)
      : undefined;
  }

  return path;
}
