import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';

// Update atom fields
export function useUpdateAtom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ atomId, updates }: { atomId: string; updates: Record<string, any> }) => {
      const { error } = await supabase
        .from('efd_atoms')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', atomId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['efd-atoms'] });
    },
  });
}

// Toggle atom selection (using status field)
export function useToggleAtomSelection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ atomId, isExcluded }: { atomId: string; isExcluded: boolean }) => {
      const { error } = await supabase
        .from('efd_atoms')
        .update({ 
          is_excluded: isExcluded,
          status: isExcluded ? 'excluded' : 'unmapped'
        } as any)
        .eq('id', atomId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['efd-atoms'] });
    },
  });
}

// Toggle epic selection for features
export function useToggleEpicSelection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ epicId, isSelected }: { epicId: string; isSelected: boolean }) => {
      const { error } = await supabase
        .from('efd_epics')
        .update({ is_selected_for_features: isSelected })
        .eq('id', epicId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['efd-epics'] });
    },
  });
}

// Update session theme/BR
export function useUpdateSessionConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      sessionId, 
      themeId, 
      businessRequestId 
    }: { 
      sessionId: string; 
      themeId?: string | null; 
      businessRequestId?: string | null;
    }) => {
      const updates: any = { updated_at: new Date().toISOString() };
      if (themeId !== undefined) updates.theme_id = themeId;
      if (businessRequestId !== undefined) updates.business_request_id = businessRequestId;

      const { error } = await supabase
        .from('efd_wizard_sessions')
        .update(updates)
        .eq('id', sessionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['efd-session'] });
      toast.success('Configuration updated');
    },
    onError: () => {
      toast.error('Failed to update configuration');
    },
  });
}

// Map atom to feature
export function useMapAtomToFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      atomId, 
      featureId,
      sessionId 
    }: { 
      atomId: string; 
      featureId: string | null;
      sessionId: string;
    }) => {
      const { error } = await supabase
        .from('efd_atoms')
        .update({ 
          mapped_to_feature_id: featureId,
          status: featureId ? 'mapped' : 'unmapped',
          updated_at: new Date().toISOString()
        })
        .eq('id', atomId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['efd-atoms'] });
      toast.success('Mapping updated');
    },
    onError: () => {
      toast.error('Failed to update mapping');
    },
  });
}

// Submit for approval
export function useSubmitForApproval() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('efd_wizard_sessions')
        .update({ 
          status: 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['efd-session'] });
      toast.success('Submitted for approval');
    },
    onError: () => {
      toast.error('Failed to submit');
    },
  });
}

// Approve session
export function useApproveSession() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('efd_wizard_sessions')
        .update({ 
          is_approved: true,
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['efd-session'] });
      toast.success('Session approved');
    },
    onError: () => {
      toast.error('Failed to approve');
    },
  });
}

// Push to Catalyst - marks session as published (actual integration would sync to external system)
export function usePushToCatalyst() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      // Update session status to published
      const { error: sessionError } = await supabase
        .from('efd_wizard_sessions')
        .update({ 
          is_pushed_to_catalyst: true,
          pushed_at: new Date().toISOString(),
          is_published: true,
          published_at: new Date().toISOString(),
          status: 'published',
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);
      
      if (sessionError) throw sessionError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['efd-session'] });
      toast.success('Successfully pushed to Catalyst!');
    },
    onError: (error) => {
      console.error('Push to Catalyst error:', error);
      toast.error('Failed to push to Catalyst');
    },
  });
}

// Update epic fields
export function useUpdateEpic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ epicId, updates }: { epicId: string; updates: Record<string, any> }) => {
      const { error } = await supabase
        .from('efd_epics')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', epicId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['efd-epics'] });
    },
  });
}

// Update feature fields
export function useUpdateFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ featureId, updates }: { featureId: string; updates: Record<string, any> }) => {
      const { error } = await supabase
        .from('efd_features')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', featureId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['efd-features'] });
    },
  });
}
