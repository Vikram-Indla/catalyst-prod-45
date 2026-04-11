/**
 * Hook to check user access to Programs and Projects
 * Admin users have access to all workspaces
 * Non-admin users need explicit membership
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useUserRole } from './useUserRole';
import { 
  DEFAULT_PROGRAM_ID, 
  getCanonicalProgramKeyWithSource,
  getCanonicalProjectKeyWithSource,
  isDefaultProgram,
  logProgramKeyBinding,
  logProjectKeyBinding
} from '@/lib/programKeyUtils';

interface ProgramWithAccess {
  id: string;
  key: string;
  name: string;
  description: string | null;
  canAccess: boolean;
  sourceField?: string;
  needsMigration?: boolean;
}

interface ProjectWithAccess {
  id: string;
  key: string;
  name: string;
  description: string | null;
  programId: string | null;
  programName: string | null;
  canAccess: boolean;
  sourceField?: string;
  needsMigration?: boolean;
}

export function useWorkspaceAccess() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const userId = user?.id;

  // Fetch all data in parallel - don't wait for memberships to complete
  // Fetch user's program/project memberships
  const { data: memberships } = useQuery({
    queryKey: ['user-memberships', userId],
    queryFn: async () => {
      if (!userId) return { programIds: [], projectIds: [] };
      const { data, error } = await supabase
        .from('program_members')
        .select('program_id')
        .eq('user_id', userId);
      if (error) throw error;
      const programIds = data?.map(m => m.program_id) || [];
      return { programIds, projectIds: programIds }; // Projects use same table currently
    },
    enabled: !!userId && !isAdmin,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const programMemberships = memberships?.programIds || [];
  const projectMemberships = memberships?.projectIds || [];

  // Fetch all programs - NO dependency on memberships (calculate access after)
  const { data: rawPrograms, isLoading: programsLoading } = useQuery({
    queryKey: ['workspace-programs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('id, key, name, description, status')
        .eq('status', 'active')
        .neq('id', DEFAULT_PROGRAM_ID)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 1000, // Cache for 10 seconds for quicker refresh
    refetchOnWindowFocus: true,
  });

  // Fetch all projects - NO dependency on memberships (calculate access after)
  const { data: rawProjects, isLoading: projectsLoading } = useQuery({
    queryKey: ['workspace-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id, 
          key, 
          name, 
          description,
          program_id,
          programs (id, key, name)
        `)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Derive programs with access info (computed, not queried)
  const programs: ProgramWithAccess[] = (rawPrograms || [])
    .filter(p => !isDefaultProgram(p))
    .map(p => {
      logProgramKeyBinding(p);
      const keyResult = getCanonicalProgramKeyWithSource(p);
      return {
        id: p.id,
        key: keyResult.key || '',
        name: p.name,
        description: p.description,
        canAccess: isAdmin || programMemberships.includes(p.id),
        sourceField: keyResult.sourceField,
        needsMigration: !keyResult.isValid,
      };
    });

  // Derive projects with access info (computed, not queried)
  const projects: ProjectWithAccess[] = (rawProjects || []).map(p => {
    logProjectKeyBinding({
      ...p,
      programs: p.programs as { id?: string; name?: string; key?: string | null } | null
    });

    const hasDirectAccess = projectMemberships.includes(p.id);
    const hasInheritedAccess = p.program_id && programMemberships.includes(p.program_id);
    const keyResult = getCanonicalProjectKeyWithSource(p);

    return {
      id: p.id,
      key: keyResult.key || p.key || '',
      name: p.name,
      description: p.description,
      programId: p.program_id,
      programName: p.programs?.name || null,
      canAccess: isAdmin || hasDirectAccess || hasInheritedAccess,
      sourceField: keyResult.sourceField,
      needsMigration: !keyResult.isValid,
    };
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
