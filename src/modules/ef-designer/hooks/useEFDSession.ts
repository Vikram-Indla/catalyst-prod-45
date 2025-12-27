import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEFDStore } from '../stores/useEFDStore';
import { EFDSession } from '../types/efd.types';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export function useEFDSession(sessionId: string | null) {
  const queryClient = useQueryClient();
  const { setIsSaving, setLastSaved } = useEFDStore();

  return useQuery({
    queryKey: ['efd-session', sessionId],
    queryFn: async () => {
      if (!sessionId) return null;
      const { data, error } = await supabase
        .from('efd_wizard_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
      
      if (error) throw error;
      return data as EFDSession;
    },
    enabled: !!sessionId,
  });
}

export function useCreateEFDSession() {
  const queryClient = useQueryClient();
  const { setCurrentSessionId } = useEFDStore();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('efd_wizard_sessions')
        .insert({
          created_by: user.id,
          status: 'draft',
          current_step: 0,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as EFDSession;
    },
    onSuccess: (data) => {
      setCurrentSessionId(data.id);
      queryClient.invalidateQueries({ queryKey: ['efd-sessions'] });
      toast.success('New session created');
    },
    onError: (error) => {
      toast.error('Failed to create session');
      console.error(error);
    },
  });
}

export function useUpdateEFDSession() {
  const queryClient = useQueryClient();
  const { setIsSaving, setLastSaved } = useEFDStore();

  return useMutation({
    mutationFn: async ({ sessionId, updates }: { sessionId: string; updates: Partial<EFDSession> }) => {
      setIsSaving(true);
      const { data, error } = await supabase
        .from('efd_wizard_sessions')
        .update({ ...updates, last_saved_at: new Date().toISOString() })
        .eq('id', sessionId)
        .select()
        .single();
      
      if (error) throw error;
      return data as EFDSession;
    },
    onSuccess: (data) => {
      setIsSaving(false);
      setLastSaved(new Date());
      queryClient.invalidateQueries({ queryKey: ['efd-session', data.id] });
    },
    onError: (error) => {
      setIsSaving(false);
      toast.error('Failed to save changes');
      console.error(error);
    },
  });
}

export function useEFDAtoms(sessionId: string | null) {
  return useQuery({
    queryKey: ['efd-atoms', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      const { data, error } = await supabase
        .from('efd_atoms')
        .select('*')
        .eq('session_id', sessionId)
        .order('atom_key', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!sessionId,
  });
}

export function useEFDEpics(sessionId: string | null) {
  return useQuery({
    queryKey: ['efd-epics', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      const { data, error } = await supabase
        .from('efd_epics')
        .select('*')
        .eq('session_id', sessionId)
        .order('epic_key', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!sessionId,
  });
}

export function useEFDFeatures(sessionId: string | null) {
  return useQuery({
    queryKey: ['efd-features', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      const { data, error } = await supabase
        .from('efd_features')
        .select('*')
        .eq('session_id', sessionId)
        .order('feature_key', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!sessionId,
  });
}

export function useEFDDocuments(sessionId: string | null) {
  return useQuery({
    queryKey: ['efd-documents', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      const { data, error } = await supabase
        .from('efd_documents')
        .select('*')
        .eq('session_id', sessionId)
        .order('upload_order', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!sessionId,
  });
}
