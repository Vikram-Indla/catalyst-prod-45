import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Department {
  id: string;
  name: string;
  is_active: boolean;
  sort_order: number;
}

export interface BusinessOwner {
  id: string;
  name: string;
  is_active: boolean;
  sort_order: number;
}

export interface DepartmentOwnerMapping {
  department_id: string;
  owner_id: string;
}

// Fetch all active departments sorted by sort_order
export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as Department[];
    },
  });
}

// Fetch all active business owners sorted by sort_order
export function useBusinessOwners() {
  return useQuery({
    queryKey: ['business_owners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_owners')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as BusinessOwner[];
    },
  });
}

// Fetch all department → owner mappings
export function useDepartmentOwnerMappings() {
  return useQuery({
    queryKey: ['department_owner_mappings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('department_owner_mapping')
        .select('department_id, owner_id');
      
      if (error) throw error;
      return data as DepartmentOwnerMapping[];
    },
  });
}

// Get the mapped owner for a given department ID
export function useOwnerForDepartment(departmentId: string | null) {
  const { data: mappings } = useDepartmentOwnerMappings();
  const { data: owners } = useBusinessOwners();
  
  if (!departmentId || !mappings || !owners) return null;
  
  const mapping = mappings.find(m => m.department_id === departmentId);
  if (!mapping) return null;
  
  return owners.find(o => o.id === mapping.owner_id) || null;
}

// Helper hook to get owner ID for a department ID
export function getOwnerIdForDepartment(
  departmentId: string | null,
  mappings: DepartmentOwnerMapping[] | undefined
): string | null {
  if (!departmentId || !mappings) return null;
  const mapping = mappings.find(m => m.department_id === departmentId);
  return mapping?.owner_id || null;
}

// Resolve legacy text values to IDs
export function useDepartmentByName(name: string | null) {
  const { data: departments } = useDepartments();
  if (!name || !departments) return null;
  return departments.find(d => d.name.toLowerCase() === name.toLowerCase()) || null;
}

export function useBusinessOwnerByName(name: string | null) {
  const { data: owners } = useBusinessOwners();
  if (!name || !owners) return null;
  return owners.find(o => o.name.toLowerCase() === name.toLowerCase()) || null;
}
