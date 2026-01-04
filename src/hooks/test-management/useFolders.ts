// ============================================================================
// HOOK: useFolders
// File: /hooks/test-management/useFolders.ts
// ============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TMFolder } from '@/types/test-management';
import { toast } from 'sonner';

// Fetch folder tree for a project
export function useFolders(projectId: string | undefined) {
  return useQuery({
    queryKey: ['tm-folders', projectId],
    queryFn: async (): Promise<TMFolder[]> => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from('tm_folders')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching folders:', error);
        throw error;
      }

      return (data || []).map(f => ({
        ...f,
        path: String(f.path || ''),
        parent_id: f.parent_id || null,
      })) as TMFolder[];
    },
    enabled: !!projectId,
  });
}

// Build hierarchical folder tree from flat list
export function useFolderTree(projectId: string | undefined) {
  const { data: folders, ...rest } = useFolders(projectId);

  const tree = buildFolderTree(folders || []);

  return { data: tree, folders: folders || [], ...rest };
}

function buildFolderTree(folders: TMFolder[]): TMFolder[] {
  const map = new Map<string, TMFolder>();
  const roots: TMFolder[] = [];

  // First pass: create map
  folders.forEach(folder => {
    map.set(folder.id, { ...folder, children: [] });
  });

  // Second pass: build tree
  folders.forEach(folder => {
    const node = map.get(folder.id)!;
    if (folder.parent_id) {
      const parent = map.get(folder.parent_id);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(node);
      }
    } else {
      roots.push(node);
    }
  });

  return roots;
}

// Fetch folder with case count
export function useFoldersWithCounts(projectId: string | undefined) {
  return useQuery({
    queryKey: ['tm-folders-with-counts', projectId],
    queryFn: async (): Promise<TMFolder[]> => {
      if (!projectId) return [];

      // Get folders
      const { data: folders, error: foldersError } = await supabase
        .from('tm_folders')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true });

      if (foldersError) throw foldersError;

      // Get case counts per folder
      const { data: counts, error: countsError } = await supabase
        .from('tm_test_cases')
        .select('folder_id')
        .eq('project_id', projectId);

      if (countsError) throw countsError;

      // Calculate counts
      const countMap = new Map<string, number>();
      counts?.forEach(c => {
        const folderId = c.folder_id || 'unfiled';
        countMap.set(folderId, (countMap.get(folderId) || 0) + 1);
      });

      return (folders || []).map(f => ({
        ...f,
        path: String(f.path || ''),
        parent_id: f.parent_id || null,
        case_count: countMap.get(f.id) || 0,
      })) as TMFolder[];
    },
    enabled: !!projectId,
  });
}

// Create folder
export function useCreateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      project_id: string;
      name: string;
      parent_id?: string | null;
    }): Promise<TMFolder> => {
      // Calculate path
      let path = `/${input.name}`;
      if (input.parent_id) {
        const { data: parent } = await supabase
          .from('tm_folders')
          .select('path')
          .eq('id', input.parent_id)
          .single();
        
        if (parent) {
          path = `${parent.path}/${input.name}`;
        }
      }

      // Get next sort order
      const { data: existing } = await supabase
        .from('tm_folders')
        .select('sort_order')
        .eq('project_id', input.project_id)
        .eq('parent_id', input.parent_id || null)
        .order('sort_order', { ascending: false })
        .limit(1);

      const sortOrder = (existing?.[0]?.sort_order || 0) + 1;

      const { data, error } = await supabase
        .from('tm_folders')
        .insert({
          project_id: input.project_id,
          name: input.name,
          parent_id: input.parent_id || null,
          path,
          sort_order: sortOrder,
        })
        .select()
        .single();

      if (error) throw error;
      return {
        ...data,
        path: String(data.path || ''),
        parent_id: data.parent_id || null,
      } as TMFolder;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tm-folders', variables.project_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-folders-with-counts', variables.project_id] });
      toast.success('Folder created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create folder: ${error.message}`);
    },
  });
}

// Update folder
export function useUpdateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      project_id: string;
      name?: string;
      parent_id?: string | null;
    }): Promise<TMFolder> => {
      const updates: Record<string, any> = {};
      if (input.name) updates.name = input.name;
      if (input.parent_id !== undefined) updates.parent_id = input.parent_id;

      const { data, error } = await supabase
        .from('tm_folders')
        .update(updates)
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw error;
      return {
        ...data,
        path: String(data.path || ''),
        parent_id: data.parent_id || null,
      } as TMFolder;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tm-folders', variables.project_id] });
      toast.success('Folder updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update folder: ${error.message}`);
    },
  });
}

// Delete folder
export function useDeleteFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; project_id: string }): Promise<void> => {
      const { error } = await supabase
        .from('tm_folders')
        .delete()
        .eq('id', input.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tm-folders', variables.project_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-folders-with-counts', variables.project_id] });
      toast.success('Folder deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete folder: ${error.message}`);
    },
  });
}
