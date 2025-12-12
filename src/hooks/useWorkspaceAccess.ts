/**
 * Hook to check user access to Programs and Projects
 * Admin users have access to all workspaces
 * Non-admin users need explicit membership
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useUserRole } from './useUserRole';

interface ProgramWithAccess {
  id: string;
  key: string;
  name: string;
  description: string | null;
  canAccess: boolean;
}

interface ProjectWithAccess {
  id: string;
  key: string;
  name: string;
  description: string | null;
  programId: string | null;
  programName: string | null;
  canAccess: boolean;
}

export function useWorkspaceAccess() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const userId = user?.id;

  // Fetch user's program memberships
  const { data: programMemberships } = useQuery({
    queryKey: ['program-memberships', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('program_members')
        .select('program_id')
        .eq('user_id', userId);
      if (error) throw error;
      return data?.map(m => m.program_id) || [];
    },
    enabled: !!userId && !isAdmin,
  });

  // Fetch user's project memberships
  const { data: projectMemberships } = useQuery({
    queryKey: ['project-memberships', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('program_members')
        .select('program_id')
        .eq('user_id', userId);
      if (error) throw error;
      return data?.map(m => m.program_id) || [];
    },
    enabled: !!userId && !isAdmin,
  });

  // Fetch all programs with access info (now 'programs' table)
  const { data: programs, isLoading: programsLoading } = useQuery({
    queryKey: ['workspace-programs', userId, isAdmin, programMemberships],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('id, key, name, description')
        .order('name');
      if (error) throw error;

      return (data || []).map(p => ({
        id: p.id,
        key: p.key || '',
        name: p.name,
        description: p.description,
        canAccess: isAdmin || (programMemberships?.includes(p.id) ?? false),
      })) as ProgramWithAccess[];
    },
    enabled: !!userId,
  });

  // Fetch all projects with access info (now 'projects' table)
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['workspace-projects', userId, isAdmin, projectMemberships, programMemberships],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id, 
          key, 
          name, 
          description,
          program_id,
          programs (id, name)
        `)
        .order('name');
      if (error) throw error;

      return (data || []).map(p => {
        // Project is accessible if:
        // 1. User is admin, OR
        // 2. User is a direct project member, OR
        // 3. User is a member of the parent program (inheritance)
        const hasDirectAccess = projectMemberships?.includes(p.id) ?? false;
        const hasInheritedAccess = p.program_id && (programMemberships?.includes(p.program_id) ?? false);
        
        return {
          id: p.id,
          key: p.key || '',
          name: p.name,
          description: p.description,
          programId: p.program_id,
          programName: p.programs?.name || null,
          canAccess: isAdmin || hasDirectAccess || hasInheritedAccess,
        };
      }) as ProjectWithAccess[];
    },
    enabled: !!userId,
  });

  // Check if user can access a specific program
  const canAccessProgram = (programId: string): boolean => {
    if (isAdmin) return true;
    return programMemberships?.includes(programId) ?? false;
  };

  // Check if user can access a specific project
  const canAccessProject = (projectId: string, parentProgramId?: string | null): boolean => {
    if (isAdmin) return true;
    if (projectMemberships?.includes(projectId)) return true;
    if (parentProgramId && programMemberships?.includes(parentProgramId)) return true;
    return false;
  };

  return {
    programs: programs || [],
    projects: projects || [],
    programsLoading,
    projectsLoading,
    canAccessProgram,
    canAccessProject,
    isAdmin,
  };
}
