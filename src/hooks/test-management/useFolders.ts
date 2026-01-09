import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TMFolder } from '@/types/test-management';
import { toast } from '@/components/ui/sonner';
import { z } from 'zod';

const folderNameSchema = z
  .string()
  .trim()
  .min(1, 'Folder name is required')
  .max(100, 'Folder name is too long');

function toLtreeLabel(input: string): string {
  // ltree labels: [A-Za-z0-9_], separated by dots.
  // We store a stable, URL-ish path segment derived from name.
  let slug = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!slug) slug = 'folder';
  if (/^[0-9]/.test(slug)) slug = `f_${slug}`;
  return slug;
}

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

      return (data || []).map((f) => ({
        ...f,
        path: String(f.path || ''),
      })) as TMFolder[];
    },
    enabled: !!projectId,
  });
}

function buildFolderTree(folders: TMFolder[]): TMFolder[] {
  const map = new Map<string, TMFolder>();
  const roots: TMFolder[] = [];

  folders.forEach((folder) => {
    map.set(folder.id, { ...folder, children: [] });
  });

  folders.forEach((folder) => {
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

export function useFolderTree(projectId: string | undefined) {
  const { data: folders, ...rest } = useFolders(projectId);
  const tree = buildFolderTree(folders || []);
  return { data: tree, folders: folders || [], ...rest };
}

export function useFoldersWithCounts(projectId: string | undefined) {
  return useQuery({
    queryKey: ['tm-folders-with-counts', projectId],
    queryFn: async (): Promise<TMFolder[]> => {
      if (!projectId) return [];

      const { data: folders, error: foldersError } = await supabase
        .from('tm_folders')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true });

      if (foldersError) throw foldersError;

      const { data: counts, error: countsError } = await supabase
        .from('tm_test_cases')
        .select('folder_id')
        .eq('project_id', projectId);

      if (countsError) throw countsError;

      const countMap = new Map<string, number>();
      counts?.forEach((c) => {
        const folderId = c.folder_id || 'unfiled';
        countMap.set(folderId, (countMap.get(folderId) || 0) + 1);
      });

      return (folders || []).map((f) => ({
        ...f,
        path: String(f.path || ''),
        case_count: countMap.get(f.id) || 0,
      })) as TMFolder[];
    },
    enabled: !!projectId,
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      project_id: string;
      name: string;
      parent_id?: string | null;
    }): Promise<TMFolder> => {
      const name = folderNameSchema.parse(input.name);
      const label = toLtreeLabel(name);

      let path = label;
      if (input.parent_id) {
        const { data: parent, error: parentError } = await supabase
          .from('tm_folders')
          .select('path')
          .eq('id', input.parent_id)
          .single();

        if (parentError) throw parentError;
        const parentPath = String(parent?.path || '');
        path = parentPath ? `${parentPath}.${label}` : label;
      }

      let existingQuery = supabase
        .from('tm_folders')
        .select('sort_order')
        .eq('project_id', input.project_id);

      existingQuery = input.parent_id
        ? existingQuery.eq('parent_id', input.parent_id)
        : existingQuery.is('parent_id', null);

      const { data: existing, error: existingError } = await existingQuery
        .order('sort_order', { ascending: false })
        .limit(1);

      if (existingError) throw existingError;

      const sortOrder = (existing?.[0]?.sort_order || 0) + 1;

      const { data, error } = await supabase
        .from('tm_folders')
        .insert({
          project_id: input.project_id,
          name,
          parent_id: input.parent_id || null,
          path, // ltree-compatible string (e.g., "authentication.login")
          sort_order: sortOrder,
        })
        .select()
        .single();

      if (error) throw error;
      return {
        ...data,
        path: String(data.path || ''),
      } as TMFolder;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tm-folders', variables.project_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-folders-with-counts', variables.project_id] });
      toast.success('Folder created');
    },
    onError: (error: any) => {
      // Supabase errors often have .message, but keep safe fallback.
      const message = typeof error?.message === 'string' ? error.message : 'Unknown error';
      toast.error(`Failed to create folder: ${message}`);
      console.error('Create folder failed:', error);
    },
  });
}

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
      if (input.name) updates.name = folderNameSchema.parse(input.name);
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

export function useDeleteFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; project_id: string }): Promise<void> => {
      const { error } = await supabase.from('tm_folders').delete().eq('id', input.id);

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

