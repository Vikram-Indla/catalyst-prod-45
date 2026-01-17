/**
 * Repository Data Hook
 * Bridges Supabase folder data to TreeNode format for Test Repository UI
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TMFolder } from '@/types/test-management';
import type { TreeNode } from '@/types/test-repository';

interface RepositoryData {
  tree: TreeNode[];
  folders: TMFolder[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  totalTestCount: number;
}

/**
 * Converts TMFolder[] to TreeNode[] structure
 */
function buildTreeFromFolders(folders: TMFolder[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  // Create nodes
  folders.forEach((folder) => {
    map.set(folder.id, {
      id: folder.id,
      name: folder.name,
      type: 'folder',
      parentId: folder.parent_id || null,
      sortOrder: folder.sort_order || 0,
      testCount: folder.case_count || 0,
      children: [],
    });
  });

  // Build tree structure
  folders.forEach((folder) => {
    const node = map.get(folder.id)!;
    if (folder.parent_id && map.has(folder.parent_id)) {
      map.get(folder.parent_id)!.children!.push(node);
    } else if (!folder.parent_id) {
      roots.push(node);
    }
  });

  // Sort children recursively (folders first, then by sort_order)
  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.sortOrder - b.sortOrder;
    });
    nodes.forEach((n) => n.children && sortNodes(n.children));
  };

  sortNodes(roots);
  return roots;
}

/**
 * Main hook for fetching repository tree data from Supabase
 */
export function useRepositoryData(projectId: string | undefined): RepositoryData {
  const {
    data: folders,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['repository-tree', projectId],
    queryFn: async (): Promise<TMFolder[]> => {
      if (!projectId) return [];

      // Fetch folders
      const { data: foldersData, error: foldersError } = await supabase
        .from('tm_folders')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true });

      if (foldersError) throw foldersError;

      // Fetch test case counts per folder
      const { data: counts, error: countsError } = await supabase
        .from('tm_test_cases')
        .select('folder_id')
        .eq('project_id', projectId);

      if (countsError) throw countsError;

      // Build count map
      const countMap = new Map<string, number>();
      counts?.forEach((c) => {
        const folderId = c.folder_id || 'unfiled';
        countMap.set(folderId, (countMap.get(folderId) || 0) + 1);
      });

      // Merge counts into folders
      return (foldersData || []).map((f) => ({
        ...f,
        path: String(f.path || ''),
        case_count: countMap.get(f.id) || 0,
      })) as TMFolder[];
    },
    enabled: !!projectId,
    staleTime: 30000,
  });

  const tree = buildTreeFromFolders(folders || []);
  
  // Calculate total test count
  const totalTestCount = (folders || []).reduce((sum, f) => sum + (f.case_count || 0), 0);

  return {
    tree,
    folders: folders || [],
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
    totalTestCount,
  };
}

/**
 * Hook to invalidate repository cache after mutations
 */
export function useInvalidateRepositoryData() {
  const queryClient = useQueryClient();
  
  return (projectId: string) => {
    queryClient.invalidateQueries({ queryKey: ['repository-tree', projectId] });
    queryClient.invalidateQueries({ queryKey: ['tm-folders', projectId] });
    queryClient.invalidateQueries({ queryKey: ['tm-folders-with-counts', projectId] });
  };
}
