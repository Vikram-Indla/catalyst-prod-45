import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProjectInfo {
  id: string;
  name: string;
  status: string | null;
}

export interface VendorInfo {
  id: string;
  name: string;
}

export type AssignmentStatus = 'yet_to_start' | 'on_hold' | 'in_progress' | 'completed';
export type PaymentStatus = 'not_applicable' | 'unpaid' | 'on_track' | 'paid' | 'closed';

export interface ResourceAssignment {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  assignment_type: string | null;
  project_id: string | null;
  vendor_id: string | null;
  budget: number | null;
  assignment_status: AssignmentStatus | null;
  end_date: string | null;
  payment_status: PaymentStatus | null;
  project?: ProjectInfo | null;
  vendor?: VendorInfo | null;
  created_at: string;
  updated_at: string;
}

export function useResourceAssignments() {
  const queryClient = useQueryClient();

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['resource-assignments'],
    queryFn: async () => {
      // Fetch assignments without project join first (avoids RLS recursion issue)
      const { data, error } = await (supabase as any)
        .from('resource_assignments')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      
      // Fetch project data separately if there are project_ids
      const projectIds = (data || []).map((a: any) => a.project_id).filter(Boolean);
      const vendorIds = (data || []).map((a: any) => a.vendor_id).filter(Boolean);
      let projectsMap: Record<string, ProjectInfo> = {};
      let vendorsMap: Record<string, VendorInfo> = {};
      
      if (projectIds.length > 0) {
        const { data: projects } = await (supabase as any)
          .from('projects')
          .select('id, name, status')
          .in('id', projectIds);
        
        if (projects) {
          projects.forEach((p: ProjectInfo) => {
            projectsMap[p.id] = p;
          });
        }
      }

      if (vendorIds.length > 0) {
        const { data: vendors } = await (supabase as any)
          .from('resource_vendors')
          .select('id, name')
          .in('id', vendorIds);
        
        if (vendors) {
          vendors.forEach((v: VendorInfo) => {
            vendorsMap[v.id] = v;
          });
        }
      }
      
      // Map assignments with project and vendor data
      return (data || []).map((a: any) => ({
        ...a,
        project: a.project_id ? projectsMap[a.project_id] || null : null,
        vendor: a.vendor_id ? vendorsMap[a.vendor_id] || null : null,
      })) as ResourceAssignment[];
    },
  });

  const { data: allAssignments = [], isLoading: isLoadingAll } = useQuery({
    queryKey: ['resource-assignments-all'],
    queryFn: async () => {
      // Fetch assignments without project join first (avoids RLS recursion issue)
      const { data, error } = await (supabase as any)
        .from('resource_assignments')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      
      // Fetch project data separately if there are project_ids
      const projectIds = (data || []).map((a: any) => a.project_id).filter(Boolean);
      const vendorIds = (data || []).map((a: any) => a.vendor_id).filter(Boolean);
      let projectsMap: Record<string, ProjectInfo> = {};
      let vendorsMap: Record<string, VendorInfo> = {};
      
      if (projectIds.length > 0) {
        const { data: projects } = await (supabase as any)
          .from('projects')
          .select('id, name, status')
          .in('id', projectIds);
        
        if (projects) {
          projects.forEach((p: ProjectInfo) => {
            projectsMap[p.id] = p;
          });
        }
      }

      if (vendorIds.length > 0) {
        const { data: vendors } = await (supabase as any)
          .from('resource_vendors')
          .select('id, name')
          .in('id', vendorIds);
        
        if (vendors) {
          vendors.forEach((v: VendorInfo) => {
            vendorsMap[v.id] = v;
          });
        }
      }
      
      // Map assignments with project and vendor data
      return (data || []).map((a: any) => ({
        ...a,
        project: a.project_id ? projectsMap[a.project_id] || null : null,
        vendor: a.vendor_id ? vendorsMap[a.vendor_id] || null : null,
      })) as ResourceAssignment[];
    },
  });

  const createAssignment = useMutation({
    mutationFn: async (input: { name: string; description?: string; assignment_type?: string | null }) => {
      // Get max sort order
      const { data: maxData } = await supabase
        .from('resource_assignments')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1)
        .single();

      const nextOrder = (maxData?.sort_order || 0) + 1;

      const { data, error } = await supabase
        .from('resource_assignments')
        .insert({
          name: input.name,
          description: input.description || null,
          assignment_type: input.assignment_type || null,
          sort_order: nextOrder,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['resource-assignments-all'] });
      toast.success('Assignment created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create assignment: ${error.message}`);
    },
  });

  const updateAssignment = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ResourceAssignment> }) => {
      const { data, error } = await supabase
        .from('resource_assignments')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['resource-assignments-all'] });
      toast.success('Assignment updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update assignment: ${error.message}`);
    },
  });

  const deleteAssignment = useMutation({
    mutationFn: async (id: string) => {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('resource_assignments')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['resource-assignments-all'] });
      toast.success('Assignment deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete assignment: ${error.message}`);
    },
  });

  return {
    assignments,
    allAssignments,
    isLoading,
    isLoadingAll,
    createAssignment,
    updateAssignment,
    deleteAssignment,
  };
}
