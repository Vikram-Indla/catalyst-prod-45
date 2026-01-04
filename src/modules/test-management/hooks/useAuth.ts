/**
 * Auth Hook for Test Management
 * Wraps Supabase auth with TM-specific functionality
 */

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '../stores/authStore';

// Query Keys
export const authKeys = {
  user: ['tm-auth', 'user'] as const,
  session: ['tm-auth', 'session'] as const,
  permissions: (userId: string) => ['tm-auth', 'permissions', userId] as const,
};

/**
 * Get current authenticated user
 */
export function useCurrentUser() {
  const { setUser, setSession, setLoading } = useAuthStore();

  const query = useQuery({
    queryKey: authKeys.user,
    queryFn: async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return user;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  // Sync with store
  useEffect(() => {
    setUser(query.data || null);
    setLoading(query.isLoading);
  }, [query.data, query.isLoading, setUser, setLoading]);

  return query;
}

/**
 * Get current session
 */
export function useSession() {
  const { setSession, setLoading } = useAuthStore();

  const query = useQuery({
    queryKey: authKeys.session,
    queryFn: async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      return session;
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // Sync with store
  useEffect(() => {
    setSession(query.data || null);
    setLoading(query.isLoading);
  }, [query.data, query.isLoading, setSession, setLoading]);

  return query;
}

/**
 * Setup auth state listener
 */
export function useAuthListener() {
  const queryClient = useQueryClient();
  const { setUser, setSession, setLoading } = useAuthStore();

  useEffect(() => {
    setLoading(true);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user || null);
        setLoading(false);

        // Invalidate queries on auth change
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          queryClient.invalidateQueries({ queryKey: authKeys.user });
          queryClient.invalidateQueries({ queryKey: authKeys.session });
        }

        if (event === 'SIGNED_OUT') {
          queryClient.clear();
        }
      }
    );

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user || null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient, setUser, setSession, setLoading]);
}

/**
 * Sign in with email/password
 */
export function useSignIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.user });
      queryClient.invalidateQueries({ queryKey: authKeys.session });
    },
  });
}

/**
 * Sign out
 */
export function useSignOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

/**
 * Get user's TM permissions (for future RBAC)
 */
export function useUserPermissions(userId: string | null) {
  return useQuery({
    queryKey: authKeys.permissions(userId || ''),
    queryFn: async () => {
      if (!userId) return null;

      // For now, return basic permissions
      // This can be expanded for role-based access
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      return {
        isAdmin: data?.role === 'admin',
        canCreateCases: true,
        canCreateCycles: true,
        canExecute: true,
        canManageSettings: data?.role === 'admin',
      };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
