import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import * as folderService from '@/services/testFolderService';
import type { CreateFolderInput, UpdateFolderInput, FolderTreeNode, TestFolderWithCount } from '@/types/test-folders';
import { buildFolderTree } from '@/types/test-folders';

// ============================================================
// QUERY KEYS
// ============================================================

export const folderKeys = {
  all: ['folders'] as const,
  tree: (projectId: string) => [...folderKeys.all, 'tree', projectId] as const,
  detail: (folderId: string) => [...folderKeys.all, 'detail', folderId] as const,
  unassignedCount: (projectId: string) => [...folderKeys.all, 'unassigned', projectId] as const,
};

// ============================================================
// QUERIES
// ============================================================

/**
 * Hook to fetch folder tree with counts
 * Includes real-time subscription for automatic updates
 */
export function useFolderTree(projectId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: folderKeys.tree(projectId || ''),
    queryFn: async () => {
      if (!projectId) return [];
      console.log('[useFolderTree] Fetching folders for project:', projectId);
      const result = await folderService.getFolderTree(projectId);
      console.log('[useFolderTree] Got folders:', result);
      return result;
    },
    enabled: !!projectId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  // Subscribe to real-time changes
  useEffect(() => {
    if (!projectId) return;

    const unsubscribeFolders = folderService.subscribeFolderChanges(projectId, () => {
      console.log('[useFolderTree] Folder change detected, refetching...');
      queryClient.invalidateQueries({ queryKey: folderKeys.tree(projectId) });
    });

    const unsubscribeTestCases = folderService.subscribeTestCaseFolderChanges(projectId, () => {
      console.log('[useFolderTree] Test case folder change detected, refetching...');
      queryClient.invalidateQueries({ queryKey: folderKeys.tree(projectId) });
      queryClient.invalidateQueries({ queryKey: folderKeys.unassignedCount(projectId) });
    });

    return () => {
      unsubscribeFolders();
      unsubscribeTestCases();
    };
  }, [projectId, queryClient]);

  return query;
}

/**
 * Hook to fetch a single folder by ID
 */
export function useFolder(folderId: string | undefined) {
  return useQuery({
    queryKey: folderKeys.detail(folderId!),
    queryFn: () => folderService.getFolderById(folderId!),
    enabled: !!folderId,
  });
}

/**
 * Hook to get count of unassigned test cases
 */
export function useUnassignedTestCaseCount(projectId: string | undefined) {
  return useQuery({
    queryKey: folderKeys.unassignedCount(projectId!),
    queryFn: () => folderService.getUnassignedTestCaseCount(projectId!),
    enabled: !!projectId,
    staleTime: 30000,
  });
}

// ============================================================
// MUTATIONS
// ============================================================

/**
 * Hook to create a new folder
 */
export function useCreateFolder(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateFolderInput) => folderService.createFolder(input),
    onSuccess: async (data) => {
      console.log('[useCreateFolder] Folder created, invalidating queries...');
      // Force immediate refetch
      await queryClient.invalidateQueries({ queryKey: folderKeys.tree(projectId) });
      await queryClient.refetchQueries({ queryKey: folderKeys.tree(projectId) });
      toast.success(`Folder "${data.name}" created`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create folder: ${error.message}`);
    },
  });
}

/**
 * Hook to update/rename a folder
 */
export function useUpdateFolder(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ folderId, input }: { folderId: string; input: UpdateFolderInput }) =>
      folderService.updateFolder(folderId, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: folderKeys.tree(projectId) });
      queryClient.invalidateQueries({ queryKey: folderKeys.detail(data.id) });
      toast.success(`Folder "${data.name}" updated`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update folder: ${error.message}`);
    },
  });
}

/**
 * Hook to delete a folder
 */
export function useDeleteFolder(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (folderId: string) => folderService.deleteFolder(folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: folderKeys.tree(projectId) });
      queryClient.invalidateQueries({ queryKey: folderKeys.unassignedCount(projectId) });
      queryClient.invalidateQueries({ queryKey: ['testCases'] });
      toast.success('Folder deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete folder: ${error.message}`);
    },
  });
}

/**
 * Hook to move test cases to a folder
 */
export function useMoveTestCases(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ testCaseIds, folderId }: { testCaseIds: string[]; folderId: string | null }) =>
      folderService.moveTestCasesToFolder(testCaseIds, folderId),
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: folderKeys.tree(projectId) });
      queryClient.invalidateQueries({ queryKey: folderKeys.unassignedCount(projectId) });
      queryClient.invalidateQueries({ queryKey: ['testCases'] });
      toast.success(`Moved ${count} test case(s)`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to move test cases: ${error.message}`);
    },
  });
}

// ============================================================
// FOLDER TREE STATE HOOK
// ============================================================

/**
 * Hook to manage folder tree UI state (expansion, selection)
 */
export function useFolderTreeState(folders: TestFolderWithCount[] | undefined) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>('all');

  // Build tree whenever folders or expanded state changes
  const tree: FolderTreeNode[] = folders 
    ? buildFolderTree(folders, expandedIds) 
    : [];

  const toggleExpanded = useCallback((folderId: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    if (folders) {
      setExpandedIds(new Set(folders.map(f => f.id)));
    }
  }, [folders]);

  const collapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  const selectFolder = useCallback((folderId: string | null) => {
    setSelectedFolderId(folderId);
  }, []);

  return {
    tree,
    expandedIds,
    selectedFolderId,
    toggleExpanded,
    expandAll,
    collapseAll,
    selectFolder,
  };
}
