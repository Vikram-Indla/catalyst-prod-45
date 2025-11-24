import { ReactNode } from 'react';
import { useUserRole, UserRole } from '@/hooks/useUserRole';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock } from 'lucide-react';

interface PermissionGuardProps {
  children: ReactNode;
  requiredRole?: UserRole;
  fallback?: ReactNode;
  showMessage?: boolean;
}

export function PermissionGuard({
  children,
  requiredRole = 'user',
  fallback,
  showMessage = true,
}: PermissionGuardProps) {
  const { hasRole, isLoading } = useUserRole();

  if (isLoading) {
    return null;
  }

  if (!hasRole(requiredRole)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showMessage) {
      return (
        <Alert variant="destructive" className="my-4">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access this feature. Required role: {requiredRole}
          </AlertDescription>
        </Alert>
      );
    }

    return null;
  }

  return <>{children}</>;
}
