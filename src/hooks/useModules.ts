import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Module {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  is_default_enabled: boolean;
  display_order: number;
}

export interface OrgModule {
  id: string;
  module_code: string;
  is_enabled: boolean;
}

export interface ModulePackage {
  id: string;
  code: string;
  name: string;
  description: string | null;
  display_order: number;
}

export interface ActivePackage {
  id: string;
  package_code: string | null;
  is_custom: boolean;
}

export function useModules() {
  return useQuery({
    queryKey: ['modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('modules')
        .select('*')
        .order('display_order');
      
      if (error) throw error;
      return data as Module[];
    },
  });
}

export function useOrgModules() {
  return useQuery({
    queryKey: ['org-modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('org_modules')
        .select('*');
      
      if (error) throw error;
      return data as OrgModule[];
    },
  });
}

export function useModulePackages() {
  return useQuery({
    queryKey: ['module-packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('module_packages')
        .select('*')
        .order('display_order');
      
      if (error) throw error;
      return data as ModulePackage[];
    },
  });
}

export function usePackageModules(packageCode: string | null) {
  return useQuery({
    queryKey: ['package-modules', packageCode],
    queryFn: async () => {
      if (!packageCode || packageCode === 'CUSTOM') return [];
      
      const { data, error } = await supabase
        .from('package_modules')
        .select('module_code')
        .eq('package_code', packageCode);
      
      if (error) throw error;
      return data.map(pm => pm.module_code);
    },
    enabled: !!packageCode && packageCode !== 'CUSTOM',
  });
}

export function useActivePackage() {
  return useQuery({
    queryKey: ['active-package'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('active_package')
        .select('*')
        .limit(1)
        .single();
      
      if (error) throw error;
      return data as ActivePackage;
    },
  });
}

export function useUpdateModuleSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      moduleSettings, 
      packageCode,
      isCustom 
    }: { 
      moduleSettings: Record<string, boolean>;
      packageCode: string;
      isCustom: boolean;
    }) => {
      // Update org_modules
      for (const [moduleCode, isEnabled] of Object.entries(moduleSettings)) {
        const { error } = await supabase
          .from('org_modules')
          .update({ is_enabled: isEnabled, updated_at: new Date().toISOString() })
          .eq('module_code', moduleCode);
        
        if (error) throw error;
      }
      
      // Update active_package
      const { error: packageError } = await supabase
        .from('active_package')
        .update({ 
          package_code: packageCode === 'CUSTOM' ? null : packageCode,
          is_custom: isCustom,
          updated_at: new Date().toISOString()
        })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all rows
      
      if (packageError) throw packageError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-modules'] });
      queryClient.invalidateQueries({ queryKey: ['active-package'] });
      toast.success('Module settings saved');
    },
    onError: (error) => {
      console.error('Error updating module settings:', error);
      toast.error('Failed to save module settings');
    },
  });
}

export function useIsModuleEnabled(moduleCode: string) {
  const { data: orgModules } = useOrgModules();
  
  if (!orgModules) return true; // Default to enabled while loading
  
  const module = orgModules.find(m => m.module_code === moduleCode);
  return module?.is_enabled ?? false;
}

export function useEnabledModules() {
  const { data: orgModules, isLoading } = useOrgModules();
  
  const enabledModules = orgModules?.filter(m => m.is_enabled).map(m => m.module_code) ?? [];
  
  return {
    enabledModules,
    isLoading,
    isModuleEnabled: (code: string) => enabledModules.includes(code),
  };
}
