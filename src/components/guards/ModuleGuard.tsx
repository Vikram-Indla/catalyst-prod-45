import { ReactNode, createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useModuleAccess, ModuleAccessLevel } from '@/hooks/useModuleAccess';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Lock, Settings, Home } from 'lucide-react';

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
 * Context to provide module access level to child components
 * Components can use this to conditionally hide edit buttons, forms, etc.
 */
interface ModuleAccessContextValue {
  moduleCode: string;
  accessLevel: ModuleAccessLevel;
  isReadOnly: boolean;
  hasFullAccess: boolean;
}

const ModuleAccessContext = createContext<ModuleAccessContextValue | null>(null);

/**
 * Hook to check if current module is read-only
 * Use this in components to hide edit buttons, disable forms, etc.
 */
export function useModuleReadOnly() {
  const context = useContext(ModuleAccessContext);
  return {
    isReadOnly: context?.isReadOnly ?? false,
    hasFullAccess: context?.hasFullAccess ?? true,
    accessLevel: context?.accessLevel ?? 'full',
  };
}

/**
 * ModuleGuard - Protects routes based on module enablement AND role-based access
 * 
 * Access Levels:
 * - Full: Can see nav + access content + can edit/modify
 * - View: Can see nav + access content (READ-ONLY, no edit)
 * - Hidden: Cannot see nav or access content
 * 
 * This component ONLY controls UI access.
 * It does NOT affect backend APIs, database queries, or linking functionality.
 */
export function ModuleGuard({ moduleCode, children, allowLinking = false }: ModuleGuardProps) {
  const navigate = useNavigate();
  const { getModuleAccess, canAccessContent, hasFullAccess, isReadOnly, isLoading } = useModuleAccess();
  const { isAdmin, isSuperAdmin } = useUserRole();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const accessLevel = getModuleAccess(moduleCode);
  const canAccess = canAccessContent(moduleCode);
  const readOnly = isReadOnly(moduleCode);
  const fullAccess = hasFullAccess(moduleCode);
  
  // If allowLinking is true, still render children (for linking/search access)
  if (allowLinking) {
    return <>{children}</>;
  }

  // Full or View access - render children with context
  // View access users see content but in read-only mode
  if (canAccess) {
    return (
      <ModuleAccessContext.Provider value={{ 
        moduleCode, 
        accessLevel, 
        isReadOnly: readOnly, 
        hasFullAccess: fullAccess 
      }}>
        {children}
      </ModuleAccessContext.Provider>
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
