import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEnabledModules } from '@/hooks/useModules';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Settings } from 'lucide-react';

interface ModuleGuardProps {
  moduleCode: string;
  children: ReactNode;
}

export function ModuleGuard({ moduleCode, children }: ModuleGuardProps) {
  const navigate = useNavigate();
  const { isModuleEnabled, isLoading } = useEnabledModules();
  const { isAdmin } = useUserRole();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }
  
  if (!isModuleEnabled(moduleCode)) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8">
        <div className="bg-card border rounded-lg p-8 max-w-md text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
          <h2 className="text-xl font-semibold">Module Not Available</h2>
          
          {isAdmin ? (
            <>
              <p className="text-muted-foreground">
                This module is disabled for your organization. Enable it under Administration → Modules & Packages.
              </p>
              <Button 
                onClick={() => navigate('/admin/modules-packages')}
                className="bg-brand-gold hover:bg-brand-gold-hover"
              >
                <Settings className="h-4 w-4 mr-2" />
                Go to Modules & Packages
              </Button>
            </>
          ) : (
            <p className="text-muted-foreground">
              You do not have access to this module. It has been disabled for your organization.
            </p>
          )}
          
          <Button 
            variant="outline" 
            onClick={() => navigate('/home')}
          >
            Return to Home
          </Button>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
}
