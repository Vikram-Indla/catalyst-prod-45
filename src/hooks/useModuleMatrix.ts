import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface ModuleMatrixEntry {
  module_key: string;
  module_label: string;
  module_description: string | null;
  parent_key: string | null;
  sort_order: number;
  role_code: string;
  role_name: string;
  access_level: 'none' | 'view' | 'full';
}

export interface NavModule {
  id: string;
  key: string;
  label: string;
  description: string | null;
  icon_name: string | null;
  route_path: string | null;
  parent_key: string | null;
  sort_order: number;
  is_active: boolean;
}

export function useModuleMatrix() {
  const queryClient = useQueryClient();

  // Fetch the full matrix
  const { data: matrix, isLoading, error } = useQuery({
    queryKey: ['module-matrix'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_module_matrix');
      if (error) throw new Error(error.message);
      return data as ModuleMatrixEntry[];
    },
  });

  // Fetch navigation modules for reference
  const { data: modules } = useQuery({
    queryKey: ['nav-modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_nav_modules')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw new Error(error.message);
      return data as NavModule[];
    },
  });

  // Update permission mutation
  const updatePermission = useMutation({
    mutationFn: async ({
      roleCode,
      moduleKey,
      accessLevel,
    }: {
      roleCode: string;
      moduleKey: string;
      accessLevel: 'none' | 'view' | 'full';
    }) => {
      const { data, error } = await supabase.rpc('update_module_permission', {
        p_role_code: roleCode,
        p_module_key: moduleKey,
        p_access_level: accessLevel,
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['module-matrix'] });
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('module-matrix-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_role_module_permissions',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['module-matrix'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Transform matrix into a structured format for the UI
  const getMatrixByModule = () => {
    if (!matrix) return {};
    
    const byModule: Record<string, Record<string, 'none' | 'view' | 'full'>> = {};
    
    matrix.forEach((entry) => {
      if (!byModule[entry.module_key]) {
        byModule[entry.module_key] = {};
      }
      byModule[entry.module_key][entry.role_code] = entry.access_level;
    });
    
    return byModule;
  };

  // Get unique roles from matrix
  const getRoles = () => {
    if (!matrix) return [];
    const rolesMap = new Map<string, string>();
    matrix.forEach((entry) => {
      rolesMap.set(entry.role_code, entry.role_name);
    });
    return Array.from(rolesMap.entries()).map(([code, name]) => ({ code, name }));
  };

  // Get unique modules from matrix
  const getModules = () => {
    if (!matrix) return [];
    const modulesMap = new Map<string, { key: string; label: string; description: string | null; sortOrder: number }>();
    matrix.forEach((entry) => {
      if (!modulesMap.has(entry.module_key)) {
        modulesMap.set(entry.module_key, {
          key: entry.module_key,
          label: entry.module_label,
          description: entry.module_description,
          sortOrder: entry.sort_order,
        });
      }
    });
    return Array.from(modulesMap.values()).sort((a, b) => a.sortOrder - b.sortOrder);
  };

  return {
    matrix,
    modules,
    isLoading,
    error,
    updatePermission,
    getMatrixByModule,
    getRoles,
    getModules,
  };
}

// Hook to check current user's module access
export function useModuleAccess(moduleKey: string, requiredLevel: 'view' | 'full' = 'view') {
  const { data: hasAccess, isLoading } = useQuery({
    queryKey: ['module-access', moduleKey, requiredLevel],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase.rpc('check_module_access', {
        p_user_id: user.id,
        p_module_key: moduleKey,
        p_required_level: requiredLevel,
      });
      if (error) {
        console.error('Module access check error:', error);
        return false;
      }
      return data ?? false;
    },
  });

  return { hasAccess: hasAccess ?? false, isLoading };
}
