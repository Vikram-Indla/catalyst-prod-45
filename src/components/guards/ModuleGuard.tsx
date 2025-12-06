import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEnabledModules } from '@/hooks/useModules';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Settings, Home } from 'lucide-react';

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
 * ModuleGuard - Protects routes based on module enablement
 * 
 * This component ONLY hides UI navigation and pages.
 * It does NOT affect:
 * - Backend APIs
 * - Database queries
 * - Linking functionality (e.g., linking Epics from Demand module)
 * - Search and lookup operations
 */
export function ModuleGuard({ moduleCode, children, allowLinking = false }: ModuleGuardProps) {
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
  
  // If module is enabled, render children
  if (isModuleEnabled(moduleCode)) {
    return <>{children}</>;
  }
  
  // If allowLinking is true, still render children (for linking/search access)
  if (allowLinking) {
    return <>{children}</>;
  }
  
  // Module is disabled - show appropriate message
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8 bg-background">
      <div className="bg-card border rounded-lg p-8 max-w-md text-center space-y-6 shadow-sm">
        <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
          <AlertTriangle className="h-6 w-6 text-amber-600" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">Module Not Available</h2>
          
          {isAdmin ? (
            <p className="text-muted-foreground text-sm">
              This module is disabled for your organization. Enable it under Administration → Modules & Packages.
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">
              This module is not available for your organization.
            </p>
          )}
        </div>
        
        <div className="flex flex-col gap-3">
          {isAdmin && (
            <Button 
              onClick={() => navigate('/admin/modules-packages')}
              className="w-full bg-brand-gold hover:bg-brand-gold-hover"
            >
              <Settings className="h-4 w-4 mr-2" />
              Go to Modules & Packages
            </Button>
          )}
          
          <Button 
            variant="outline" 
            onClick={() => navigate('/home')}
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
 * Helper hook for checking module status in components
 */
export { useEnabledModules } from '@/hooks/useModules';