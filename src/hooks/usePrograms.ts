/**
 * usePrograms - Hook for managing programs with React Query
 * Provides program CRUD operations with proper caching and realtime updates
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { generateProgramCodeFromName } from '@/lib/programCodeUtils';
import { DEFAULT_PROGRAM_ID } from '@/lib/programKeyUtils';
import { useEffect } from 'react';

export interface Program {
  id: string;
  name: string;
  key: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

const PROGRAMS_KEY = ['programs'];

/**
 * Fetch all active programs (excluding default)
 */
export function usePrograms() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: PROGRAMS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .neq('id', DEFAULT_PROGRAM_ID)
        .eq('status', 'active')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Program[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('programs-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'programs' },
        () => {
          queryClient.invalidateQueries({ queryKey: PROGRAMS_KEY });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

/**
 * Fetch a single program by ID
 */
export function useProgram(programId: string | null) {
  return useQuery({
    queryKey: ['program', programId],
    queryFn: async () => {
      if (!programId) return null;
      
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('id', programId)
        .single();

      if (error) throw error;
      return data as Program;
    },
    enabled: !!programId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Create a new program with auto-generated code
 */
export function useCreateProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      // First, get all existing program codes
      const { data: existingPrograms, error: fetchError } = await supabase
        .from('programs')
        .select('key');

      if (fetchError) throw fetchError;

      const existingCodes = (existingPrograms || []).map(p => p.key);
      
      // Generate the new code
      const newCode = generateProgramCodeFromName(data.name, existingCodes);

      // Insert the new program
      const { data: newProgram, error } = await supabase
        .from('programs')
        .insert({
          name: data.name,
          key: newCode,
          description: data.description || null,
          status: 'active',
        })
        .select()
        .single();

      if (error) {
        // If unique constraint violation, retry with incremented number
        if (error.code === '23505') {
          const retryCode = generateProgramCodeFromName(data.name, [...existingCodes, newCode]);
          const { data: retryProgram, error: retryError } = await supabase
            .from('programs')
            .insert({
              name: data.name,
              key: retryCode,
              description: data.description || null,
              status: 'active',
            })
            .select()
            .single();

          if (retryError) throw retryError;
          return retryProgram as Program;
        }
        throw error;
      }

      return newProgram as Program;
    },
    onSuccess: (program) => {
      queryClient.invalidateQueries({ queryKey: PROGRAMS_KEY });
      queryClient.invalidateQueries({ queryKey: ['workspace-programs'] });
      toast.success(`Program "${program.name}" created with code ${program.key}`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create program: ${error.message}`);
    },
  });
}

/**
 * Update a program
 */
type ProgramStatus = 'active' | 'archived';

export function useUpdateProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; description?: string; status?: ProgramStatus }) => {
      const { data: updated, error } = await supabase
        .from('programs')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updated as Program;
    },
    onSuccess: (program) => {
      queryClient.invalidateQueries({ queryKey: PROGRAMS_KEY });
      queryClient.invalidateQueries({ queryKey: ['program', program.id] });
      queryClient.invalidateQueries({ queryKey: ['workspace-programs'] });
      toast.success('Program updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update program: ${error.message}`);
    },
  });
}

/**
 * Get the last selected program ID from localStorage
 */
export function getLastProgramId(): string | null {
  try {
    return localStorage.getItem('catalyst:lastProgramId');
  } catch {
    return null;
  }
}

/**
 * Save the last selected program ID to localStorage
 */
export function setLastProgramId(programId: string): void {
  try {
    localStorage.setItem('catalyst:lastProgramId', programId);
  } catch {
    // Ignore localStorage errors
  }
}
