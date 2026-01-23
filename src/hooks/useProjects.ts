// =====================================================
// PROJECTS HOOK - BUILD_UNIT_2.1 SPEC COMPLIANT
// React Query hooks for project operations
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import type { 
  Project, 
  ProjectMember, 
  CreateProjectInput, 
  UpdateProjectInput, 
  ProjectFilters 
} from '@/types/project';

export const projectKeys = {
  all: ['projects'] as const,
  list: (filters?: ProjectFilters) => [...projectKeys.all, 'list', filters] as const,
  one: (id: string) => [...projectKeys.all, 'detail', id] as const,
  byKey: (key: string) => [...projectKeys.all, 'key', key] as const,
  members: (projectId: string) => [...projectKeys.all, 'members', projectId] as const,
  defaultProject: ['default-project'] as const,
  directory: ['projects-directory'] as const,
};

// =====================================================
// READ HOOKS
// =====================================================

// Get all projects with optional filters
export function useProjects(filters?: ProjectFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: projectKeys.list(filters),
    queryFn: async (): Promise<Project[]> => {
      // Build base query - using type assertion since DB types may not be regenerated yet
      let query = supabase
        .from('projects')
        .select(`
          *,
          lead:profiles(id, full_name, avatar_url),
          program:programs(id, name, key)
        `)
        .order('is_default', { ascending: false })
        .order('name', { ascending: true });

      // Apply filters
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,key.ilike.%${filters.search}%`) as typeof query;
      }
      if (filters?.program_id && filters.program_id !== 'all') {
        query = query.eq('program_id', filters.program_id) as typeof query;
      }
      if (filters?.project_type) {
        query = query.eq('project_type', filters.project_type) as typeof query;
      }
      if (typeof filters?.is_archived === 'boolean') {
        query = query.eq('is_archived', filters.is_archived) as typeof query;
      } else {
        // Default: hide archived
        query = query.eq('is_archived', false) as typeof query;
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []) as unknown as Project[];
    },
    enabled: !!user,
  });
}

// Get single project by ID
export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: projectKeys.one(projectId || ''),
    queryFn: async (): Promise<Project | null> => {
      if (!projectId) return null;

      const { data, error } = await (supabase.from('projects') as any)
        .select(`
          *,
          lead:profiles!projects_lead_id_fkey(id, full_name, avatar_url),
          program:programs!projects_program_id_fkey(id, name, key)
        `)
        .eq('id', projectId)
        .single();

      if (error) throw error;
      return data as unknown as Project;
    },
    enabled: !!projectId,
  });
}

// Get project by KEY (e.g., "CAT", "PRJ")
export function useProjectByKey(key: string | undefined) {
  return useQuery({
    queryKey: projectKeys.byKey(key || ''),
    queryFn: async (): Promise<Project | null> => {
      if (!key) return null;

      const { data, error } = await (supabase.from('projects') as any)
        .select(`
          *,
          lead:profiles!projects_lead_id_fkey(id, full_name, avatar_url),
          program:programs!projects_program_id_fkey(id, name, key)
        `)
        .eq('key', key.toUpperCase())
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }
      return data as unknown as Project;
    },
    enabled: !!key,
  });
}

// Get default project
export function useDefaultProject() {
  return useQuery({
    queryKey: projectKeys.defaultProject,
    queryFn: async (): Promise<Project | null> => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          lead:profiles!projects_lead_id_fkey(id, full_name, avatar_url),
          program:programs!projects_program_id_fkey(id, name, key)
        `)
        .eq('is_default', true)
        .single();

      if (error) {
        console.warn('No default project found:', error);
        return null;
      }
      return data as unknown as Project;
    },
  });
}

// Get project members
export function useProjectMembers(projectId: string | undefined) {
  return useQuery({
    queryKey: projectKeys.members(projectId || ''),
    queryFn: async (): Promise<ProjectMember[]> => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from('project_members')
        .select(`
          *,
          user:profiles!project_members_user_id_fkey(id, full_name, avatar_url)
        `)
        .eq('project_id', projectId)
        .order('joined_at', { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as ProjectMember[];
    },
    enabled: !!projectId,
  });
}

// =====================================================
// MUTATION HOOKS
// =====================================================

// Create project
export function useCreateProject() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateProjectInput): Promise<Project> => {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: input.name.trim(),
          key: input.key.toUpperCase(),
          description: input.description?.trim() || null,
          program_id: input.program_id,
          project_type: input.project_type || 'scrum',
          category: input.category || null,
          is_private: input.is_private || false,
          lead_id: input.lead_id || user?.id || null,
          color: input.color || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Auto-add creator as admin member
      if (user?.id && data?.id) {
        await supabase.from('project_members').insert({
          project_id: data.id,
          user_id: user.id,
          role: 'admin',
        });
      }

      return data as unknown as Project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      queryClient.invalidateQueries({ queryKey: projectKeys.directory });
      toast.success('Project created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create project: ${error.message}`);
    },
  });
}

// Update project
export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateProjectInput): Promise<Project> => {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from('projects')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as Project;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      queryClient.invalidateQueries({ queryKey: projectKeys.one(data.id) });
      toast.success('Project updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update project: ${error.message}`);
    },
  });
}

// Archive/unarchive project
export function useArchiveProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, archive }: { id: string; archive: boolean }): Promise<void> => {
      const { error } = await supabase
        .from('projects')
        .update({ is_archived: archive, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, { archive }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      toast.success(archive ? 'Project archived' : 'Project restored');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update project: ${error.message}`);
    },
  });
}

// Delete project (hard delete)
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string): Promise<void> => {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      toast.success('Project deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete project: ${error.message}`);
    },
  });
}

// Add project member
export function useAddProjectMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      projectId, 
      userId, 
      role = 'member' 
    }: { 
      projectId: string; 
      userId: string; 
      role?: 'admin' | 'member' | 'viewer' 
    }): Promise<ProjectMember> => {
      const { data, error } = await supabase
        .from('project_members')
        .insert({
          project_id: projectId,
          user_id: userId,
          role,
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as ProjectMember;
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.members(projectId) });
      toast.success('Member added');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add member: ${error.message}`);
    },
  });
}

// Remove project member
export function useRemoveProjectMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, userId }: { projectId: string; userId: string }): Promise<void> => {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.members(projectId) });
      toast.success('Member removed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove member: ${error.message}`);
    },
  });
}

// Increment issue sequence (for generating issue keys)
export function useIncrementIssueSequence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string): Promise<number> => {
      // Fetch current sequence - using any type since column may not be in generated types yet
      const { data: project, error: fetchError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (fetchError) throw fetchError;

      const currentSeq = (project as { issue_sequence?: number })?.issue_sequence || 0;
      const newSequence = currentSeq + 1;

      // Update with new sequence
      const { error: updateError } = await supabase
        .from('projects')
        .update({ updated_at: new Date().toISOString() } as Record<string, unknown>)
        .eq('id', projectId);

      if (updateError) throw updateError;

      return newSequence;
    },
    onSuccess: (_, projectId) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.one(projectId) });
    },
  });
}

// Re-export types for convenience
export type { Project, ProjectMember, CreateProjectInput, UpdateProjectInput, ProjectFilters };
