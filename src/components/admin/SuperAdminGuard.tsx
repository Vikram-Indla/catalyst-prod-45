import { ReactNode } from 'react';
import { useIsSuperAdmin } from '@/hooks/useUsers';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ShieldIcon from '@atlaskit/icon/core/shield';
interface SuperAdminGuardProps {
  children: ReactNode;
}

export function SuperAdminGuard({ children }: SuperAdminGuardProps) {
  const { data: isSuperAdmin, isLoading } = useIsSuperAdmin();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <ShieldIcon label="" size="small" />
          <AlertDescription>
            You do not have permission to manage users. Contact your system administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}
