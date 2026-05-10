import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';

interface RouteRoleGuardProps {
  children: React.ReactNode;
}

export function RouteRoleGuard({ children }: RouteRoleGuardProps) {
  const { canAccessEnterprise, isLoading } = useUserRole();

  if (isLoading) return null;
  if (!canAccessEnterprise) return <Navigate to="/unauthorized" replace />;
  return <>{children}</>;
}
