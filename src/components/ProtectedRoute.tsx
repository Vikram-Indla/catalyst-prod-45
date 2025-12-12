import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, loading, signOut } = useAuth();

  // Check approval status from profiles
  const { data: profile, isLoading: profileLoading, error } = useQuery({
    queryKey: ['profile-approval-status', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('approval_status, role')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('Error fetching profile approval status:', error);
        return null;
      }
      
      return data;
    },
    enabled: !!user,
    staleTime: 30000, // Cache for 30 seconds
    retry: 1,
  });

  // If user is not approved, sign them out
  useEffect(() => {
    if (!profileLoading && profile && profile.approval_status !== 'APPROVED') {
      console.log('[ProtectedRoute] User not approved, signing out:', profile.approval_status);
      signOut();
    }
  }, [profile, profileLoading, signOut]);

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
          <span className="text-muted-foreground text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  // No user - redirect to auth
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // No profile or not approved - redirect to auth
  if (!profile || profile.approval_status !== 'APPROVED') {
    return <Navigate to="/auth" replace />;
  }

  // Admin route but user is not admin
  if (requireAdmin && !['admin', 'super_admin'].includes(profile.role || '')) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}
