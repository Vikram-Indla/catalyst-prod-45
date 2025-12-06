import { ReactNode } from 'react';
import { useIsSuperAdmin } from '@/hooks/useUsers';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield } from 'lucide-react';

interface SuperAdminGuardProps {
  children: ReactNode;
}

export function SuperAdminGuard({ children }: SuperAdminGuardProps) {
  const { data: isSuperAdmin, isLoading } = useIsSuperAdmin();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold"></div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You do not have permission to manage users. Contact your system administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}
