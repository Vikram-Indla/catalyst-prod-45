import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';
import { WorkItemType } from '@/config/workItemConfig';

export interface CreateMenuVisibility {
  id: string;
  role_code: string;
  work_item_type: string;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export function useCreateMenuVisibility() {
  const { productRoles, isSuperAdmin } = useUserRole();
  const queryClient = useQueryClient();

  // Fetch all visibility settings
  const { data: allSettings, isLoading: isLoadingAll } = useQuery({
    queryKey: ['create-menu-visibility-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('create_menu_visibility')
        .select('*')
        .order('role_code')
        .order('work_item_type');

      if (error) throw error;
      return data as CreateMenuVisibility[];
    },
  });

  // Get visible work items for the current user based on their roles
  const visibleWorkItems = useQuery({
    queryKey: ['create-menu-visibility-user', productRoles],
    queryFn: async () => {
      // Super admin sees everything
      if (isSuperAdmin) {
        return null; // null means show all
      }

      if (!productRoles || productRoles.length === 0) {
        // No roles - show nothing
        return [] as string[];
      }

      const { data, error } = await supabase
        .from('create_menu_visibility')
        .select('work_item_type')
        .in('role_code', productRoles)
        .eq('is_visible', true);

      if (error) throw error;
      
      // Combine all visible items from all roles
      const visibleItems = [...new Set(data.map(d => d.work_item_type))];
      return visibleItems;
    },
    enabled: productRoles !== undefined,
  });

  // Mutation to update visibility
  const updateVisibility = useMutation({
    mutationFn: async ({ 
      roleCode, 
      workItemType, 
      isVisible 
    }: { 
      roleCode: string; 
      workItemType: string; 
      isVisible: boolean;
    }) => {
      const { data, error } = await supabase
        .from('create_menu_visibility')
        .upsert({
          role_code: roleCode,
          work_item_type: workItemType,
          is_visible: isVisible,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'role_code,work_item_type',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['create-menu-visibility-all'] });
      queryClient.invalidateQueries({ queryKey: ['create-menu-visibility-user'] });
    },
  });

  // Batch update for saving all changes at once
  const batchUpdateVisibility = useMutation({
    mutationFn: async (updates: { roleCode: string; workItemType: string; isVisible: boolean }[]) => {
      const upsertData = updates.map(u => ({
        role_code: u.roleCode,
        work_item_type: u.workItemType,
        is_visible: u.isVisible,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('create_menu_visibility')
        .upsert(upsertData, {
          onConflict: 'role_code,work_item_type',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['create-menu-visibility-all'] });
      queryClient.invalidateQueries({ queryKey: ['create-menu-visibility-user'] });
    },
  });

  // Check if a work item should be visible for the current user
  const isWorkItemVisible = (workItemType: WorkItemType): boolean => {
    // If still loading, show all (will update when loaded)
    if (visibleWorkItems.isLoading) return true;
    
    // Super admin or null means show all
    if (visibleWorkItems.data === null) return true;
    
    // Check if this work item is in the visible list
    return visibleWorkItems.data?.includes(workItemType) ?? false;
  };

  return {
    allSettings,
    isLoadingAll,
    visibleWorkItems: visibleWorkItems.data,
    isLoadingVisible: visibleWorkItems.isLoading,
    updateVisibility,
    batchUpdateVisibility,
    isWorkItemVisible,
  };
}

// Hook for fetching all product roles
export function useProductRoles() {
  return useQuery({
    queryKey: ['product-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_roles')
        .select('id, code, name, description')
        .order('name');

      if (error) throw error;
      return data;
    },
  });
}
