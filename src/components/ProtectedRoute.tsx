import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

// ⚠️ AUTH BYPASS — temporary for diagnostics. Remove when done.
const AUTH_BYPASS = true;

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, loading, signOut } = useAuth();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile-approval-status', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('approval_status, role')
        .eq('id', user.id)
        .maybeSingle();
      if (error) {
        console.error('Error fetching profile approval status:', error);
        return null;
      }
      return data;
    },
    enabled: !!user && !AUTH_BYPASS,
    staleTime: 30000,
    retry: 1,
  });

  // Lifecycle lockout: check resource_inventory.is_active for the current user.
  const { data: resourceStatus, isLoading: resourceLoading } = useQuery({
    queryKey: ['resource-active-status', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('resource_inventory')
        .select('is_active')
        .eq('profile_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user && !AUTH_BYPASS,
    staleTime: 60_000,
    retry: 1,
  });

  useEffect(() => {
    if (AUTH_BYPASS) return;
    if (!profileLoading && profile && profile.approval_status !== 'APPROVED') {
      console.log('[ProtectedRoute] User not approved, signing out:', profile.approval_status);
      signOut();
    }
  }, [profile, profileLoading, signOut]);

  // Bypass auth entirely when flag is on
  if (AUTH_BYPASS) {
    return <>{children}</>;
  }

  if (loading || profileLoading || resourceLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-muted-foreground text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!profile || profile.approval_status !== 'APPROVED') {
    return <Navigate to="/auth" replace />;
  }

  // Deactivated by lifecycle-check — redirect to the deactivated holding page.
  if (resourceStatus && resourceStatus.is_active === false) {
    return <Navigate to="/deactivated" replace />;
  }

  if (requireAdmin && !['admin', 'super_admin'].includes(profile.role || '')) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}
