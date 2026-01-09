/**
 * useTestFolders - Folder CRUD & tree management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { TMFolder, TMFolderNode, FolderCreateInput, FolderUpdateInput } from '../types';

// Transform flat list to tree structure
function buildFolderTree(folders: TMFolder[], testCaseCounts: Record<string, number>): TMFolderNode[] {
  const nodeMap = new Map<string, TMFolderNode>();
  const roots: TMFolderNode[] = [];

  // Create nodes
  folders.forEach(folder => {
    nodeMap.set(folder.id, {
      ...folder,
      children: [],
      testCaseCount: testCaseCounts[folder.id] || 0,
      expanded: false,
    });
  });

  // Build tree
  folders.forEach(folder => {
    const node = nodeMap.get(folder.id)!;
    if (folder.parentId && nodeMap.has(folder.parentId)) {
      nodeMap.get(folder.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  // Sort by sortOrder
  const sortNodes = (nodes: TMFolderNode[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder);
    nodes.forEach(node => sortNodes(node.children));
  };
  sortNodes(roots);

  return roots;
}

export function useTestFolders() {
  return useQuery({
    queryKey: ['tm-folders'],
    queryFn: async () => {
      // Fetch folders
      const { data: folders, error: foldersError } = await supabase
        .from('tm_folders')
        .select('id, name, parent_id, sort_order, created_at, updated_at')
        .order('sort_order', { ascending: true });

      if (foldersError) throw foldersError;

      // Fetch test case counts per folder
      const { data: counts, error: countsError } = await supabase
        .from('tm_test_cases')
        .select('folder_id');

      if (countsError) throw countsError;

      // Count per folder
      const testCaseCounts: Record<string, number> = {};
      counts?.forEach(tc => {
        if (tc.folder_id) {
          testCaseCounts[tc.folder_id] = (testCaseCounts[tc.folder_id] || 0) + 1;
        }
      });

      // Transform to typed objects
      const typedFolders: TMFolder[] = (folders || []).map(f => ({
        id: f.id,
        name: f.name,
        parentId: f.parent_id,
        sortOrder: f.sort_order ?? 0,
        createdAt: f.created_at,
        updatedAt: f.updated_at,
      }));

      return buildFolderTree(typedFolders, testCaseCounts);
    },
    staleTime: 30000,
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: FolderCreateInput) => {
      const { data, error } = await supabase
        .from('tm_folders')
        .insert({
          name: input.name,
          parent_id: input.parentId || null,
          project_id: '00000000-0000-0000-0000-000000000000', // Placeholder
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tm-folders'] });
      toast({ title: 'Folder created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create folder', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateFolder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: FolderUpdateInput) => {
      const { data, error } = await supabase
        .from('tm_folders')
        .update({ name: input.name })
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tm-folders'] });
      toast({ title: 'Folder renamed' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to rename folder', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tm_folders')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tm-folders'] });
      queryClient.invalidateQueries({ queryKey: ['tm-test-cases'] });
      toast({ title: 'Folder deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete folder', description: error.message, variant: 'destructive' });
    },
  });
}
