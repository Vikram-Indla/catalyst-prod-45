import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Lock, Settings, Home, Eye } from 'lucide-react';

interface ModuleGuardProps {
  moduleCode: string;
  children: ReactNode;
  /**
   * If true, still renders children even when module is disabled.
   * Use for routes that need to remain accessible for linking/search.
   */
  allowLinking?: boolean;
}

/**
 * ModuleGuard - Protects routes based on module enablement AND role-based access
 * 
 * Access Levels:
 * - Full: Can see nav + access content (renders children)
 * - View: Can see nav + NO content access (shows restricted message)
 * - Hidden: Cannot see nav or access content
 * 
 * This component ONLY controls UI access.
 * It does NOT affect backend APIs, database queries, or linking functionality.
 */
export function ModuleGuard({ moduleCode, children, allowLinking = false }: ModuleGuardProps) {
  const navigate = useNavigate();
  const { getModuleAccess, hasFullAccess, isLoading } = useModuleAccess();
  const { isAdmin, isSuperAdmin } = useUserRole();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const accessLevel = getModuleAccess(moduleCode);
  
  // Full access - render children
  if (hasFullAccess(moduleCode)) {
    return <>{children}</>;
  }
  
  // If allowLinking is true, still render children (for linking/search access)
  if (allowLinking) {
    return <>{children}</>;
  }

  // View access - can see nav labels but NOT content
  if (accessLevel === 'view') {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8 bg-background">
        <div className="bg-card border rounded-lg p-8 max-w-md text-center space-y-6 shadow-sm">
          <div className="mx-auto w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Eye className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">View Only Access</h2>
            <p className="text-muted-foreground text-sm">
              You can see this module in navigation, but you don't have permission to access its content.
            </p>
            <p className="text-muted-foreground text-xs mt-2">
              Contact your administrator to request full access.
            </p>
          </div>
          
          <div className="flex flex-col gap-3">
            <Button 
              variant="outline" 
              onClick={() => navigate('/for-you')}
              className="w-full"
            >
              <Home className="h-4 w-4 mr-2" />
              Return to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  // Hidden access - show appropriate message based on role
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8 bg-background">
      <div className="bg-card border rounded-lg p-8 max-w-md text-center space-y-6 shadow-sm">
        <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <Lock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">Access Restricted</h2>
          
          {isAdmin || isSuperAdmin ? (
            <p className="text-muted-foreground text-sm">
              This module is not enabled for your role. Configure access in Administration → Module Access Matrix.
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">
              You don't have permission to access this module. Contact your administrator for access.
            </p>
          )}
        </div>
        
        <div className="flex flex-col gap-3">
          {(isAdmin || isSuperAdmin) && (
            <Button 
              onClick={() => navigate('/admin/module-matrix')}
              className="w-full bg-brand-primary hover:bg-brand-primary-hover"
            >
              <Settings className="h-4 w-4 mr-2" />
              Go to Module Access Matrix
            </Button>
          )}
          
          <Button 
            variant="outline" 
            onClick={() => navigate('/for-you')}
            className="w-full"
          >
            <Home className="h-4 w-4 mr-2" />
            Return to Home
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Re-export the module access hook for convenience
 */
export { useModuleAccess } from '@/hooks/useModuleAccess';
