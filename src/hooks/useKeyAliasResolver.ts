/**
 * Hook to resolve old program/project keys to current keys
 * Used for backward-compatibility redirects after key migration
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface KeyResolution {
  isAlias: boolean;
  currentKey: string | null;
  entityId: string | null;
  isLoading: boolean;
}

export function useProgramKeyResolver(key: string | undefined): KeyResolution {
  const { data, isLoading } = useQuery({
    queryKey: ['program-key-resolve', key],
    queryFn: async () => {
      if (!key) return null;

      // First check if key exists as current key
      const { data: program } = await supabase
        .from('programs')
        .select('id, key')
        .eq('key', key)
        .maybeSingle();

      if (program) {
        return { isAlias: false, currentKey: program.key, entityId: program.id };
      }

      // Check if it's an alias
      const { data: alias } = await supabase
        .from('program_key_aliases')
        .select('program_id, programs(id, key)')
        .eq('old_key', key)
        .maybeSingle();

      if (alias?.programs) {
        return { 
          isAlias: true, 
          currentKey: (alias.programs as any).key, 
          entityId: (alias.programs as any).id 
        };
      }

      return null;
    },
    enabled: !!key,
  });

  return {
    isAlias: data?.isAlias ?? false,
    currentKey: data?.currentKey ?? null,
    entityId: data?.entityId ?? null,
    isLoading,
  };
}

export function useProjectKeyResolver(key: string | undefined): KeyResolution {
  const { data, isLoading } = useQuery({
    queryKey: ['project-key-resolve', key],
    queryFn: async () => {
      if (!key) return null;

      // First check if key exists as current key
      const { data: project } = await supabase
        .from('projects')
        .select('id, key')
        .eq('key', key)
        .maybeSingle();

      if (project) {
        return { isAlias: false, currentKey: project.key, entityId: project.id };
      }

      // Check if it's an alias
      const { data: alias } = await supabase
        .from('project_key_aliases')
        .select('project_id, projects(id, key)')
        .eq('old_key', key)
        .maybeSingle();

      if (alias?.projects) {
        return { 
          isAlias: true, 
          currentKey: (alias.projects as any).key, 
          entityId: (alias.projects as any).id 
        };
      }

      return null;
    },
    enabled: !!key,
  });

  return {
    isAlias: data?.isAlias ?? false,
    currentKey: data?.currentKey ?? null,
    entityId: data?.entityId ?? null,
    isLoading,
  };
}
