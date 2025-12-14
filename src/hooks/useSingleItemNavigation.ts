/**
 * Hook to detect if navigation menus have only one active item
 * Used for smart direct navigation when single item exists
 */
import { useMemo } from 'react';
import { useBusinessLines } from '@/hooks/useProductSettings';
import { useWorkspaceAccess } from '@/hooks/useWorkspaceAccess';
import { useUserRole } from '@/hooks/useUserRole';
import { useCatalystContext } from '@/contexts/CatalystContext';

// Route mapping for product lines
const PRODUCT_LINE_ROUTES: Record<string, string> = {
  'Industry': '/industry',
};

export interface SingleItemNavResult {
  hasSingleItem: boolean;
  directPath: string | null;
  isLoading: boolean;
}

export function useSingleItemNavigation() {
  const { data: businessLines = [], isLoading: productLoading } = useBusinessLines();
  const { programs, projects, programsLoading, projectsLoading, isAdmin } = useWorkspaceAccess();
  const { programId } = useCatalystContext();

  // Product: Check for single active product line with a route
  const productNav = useMemo((): SingleItemNavResult => {
    const activeLines = businessLines.filter(line => 
      line.is_active && PRODUCT_LINE_ROUTES[line.name]
    );
    
    if (activeLines.length === 1) {
      return {
        hasSingleItem: true,
        directPath: PRODUCT_LINE_ROUTES[activeLines[0].name],
        isLoading: productLoading,
      };
    }
    
    return { hasSingleItem: false, directPath: null, isLoading: productLoading };
  }, [businessLines, productLoading]);

  // Program: Check for single accessible program (excluding Default)
  const programNav = useMemo((): SingleItemNavResult => {
    const accessiblePrograms = programs.filter(p => p.canAccess);
    
    if (accessiblePrograms.length === 1) {
      return {
        hasSingleItem: true,
        directPath: `/program/${accessiblePrograms[0].id}/epic-backlog`,
        isLoading: programsLoading,
      };
    }
    
    return { hasSingleItem: false, directPath: null, isLoading: programsLoading };
  }, [programs, programsLoading]);

  // Project: Check for single accessible project within current program context
  const projectNav = useMemo((): SingleItemNavResult => {
    // Filter projects by current program if one is selected
    const filteredProjects = programId 
      ? projects.filter(p => p.programId === programId && p.canAccess)
      : projects.filter(p => p.canAccess);
    
    if (filteredProjects.length === 1) {
      return {
        hasSingleItem: true,
        directPath: `/project/${filteredProjects[0].id}/backlog`,
        isLoading: projectsLoading,
      };
    }
    
    return { hasSingleItem: false, directPath: null, isLoading: projectsLoading };
  }, [projects, projectsLoading, programId]);

  // Release: Only show dropdown if admin (has create/manage options)
  // Non-admins with no actions should get direct navigation to versions list
  const releaseNav = useMemo((): SingleItemNavResult => {
    // For non-admins, there are no actions, so navigate directly
    if (!isAdmin) {
      return {
        hasSingleItem: true,
        directPath: '/release/versions',
        isLoading: false,
      };
    }
    
    // Admins have Create and Manage options, so show dropdown
    return { hasSingleItem: false, directPath: null, isLoading: false };
  }, [isAdmin]);

  return {
    product: productNav,
    program: programNav,
    project: projectNav,
    release: releaseNav,
  };
}
