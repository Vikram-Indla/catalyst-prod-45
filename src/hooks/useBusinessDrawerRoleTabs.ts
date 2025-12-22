import { useMemo } from 'react';
import { useUserRole } from './useUserRole';

// All possible tabs in the business request drawer
const ALL_TABS = [
  { value: 'demand-details', label: 'Demand Details' },
  { value: 'business-score', label: 'Business Score' },
  { value: 'ea-review', label: 'EA Review' },
  { value: 'budget', label: 'Budget' },
  { value: 'risks', label: 'Risks' },
  { value: 'milestones', label: 'Milestones' },
  { value: 'links', label: 'Links' },
  { value: 'audit-history', label: 'Audit History' },
];

// Base tabs visible to default users and Product Owners
const BASE_TABS = ['demand-details', 'business-score', 'links', 'audit-history'];

// Additional tabs for Project Managers
const PM_TABS = ['budget', 'risks', 'milestones'];

// Additional tabs for Enterprise Architects
const EA_TABS = ['ea-review'];

/**
 * Hook to determine which tabs should be visible based on user's product role
 * 
 * Role visibility matrix:
 * - Default User: Demand Details, Business Score, Links, Audit History
 * - Product Owner: Demand Details, Business Score, Links, Audit History
 * - Project Manager: All tabs + Budget, Risks, Milestones
 * - Enterprise Architect: All tabs + EA Review
 * - Admin roles (super_admin, product_admin, general_manager): All tabs
 */
export function useBusinessDrawerRoleTabs() {
  const { productRoles, isAdmin, isSuperAdmin, isProductAdmin, isGeneralManager, isLoading } = useUserRole();

  const visibleTabs = useMemo(() => {
    // Admin roles see everything
    if (isAdmin || isSuperAdmin || isProductAdmin || isGeneralManager) {
      return ALL_TABS;
    }

    // Determine which tabs to show based on product roles
    const allowedTabValues = new Set(BASE_TABS);

    if (productRoles && productRoles.length > 0) {
      const hasEnterpriseArchitect = productRoles.includes('enterprise_architect' as any);
      const hasProjectManager = productRoles.includes('project_manager' as any);

      // Enterprise Architect sees everything + EA Review
      if (hasEnterpriseArchitect) {
        // Add all tabs for EA
        ALL_TABS.forEach(tab => allowedTabValues.add(tab.value));
      }

      // Project Manager sees everything + Budget, Risks, Milestones
      if (hasProjectManager) {
        // Add all tabs for PM
        ALL_TABS.forEach(tab => allowedTabValues.add(tab.value));
      }
    }

    // Filter ALL_TABS to maintain order
    return ALL_TABS.filter(tab => allowedTabValues.has(tab.value));
  }, [productRoles, isAdmin, isSuperAdmin, isProductAdmin, isGeneralManager]);

  return {
    visibleTabs,
    isLoading,
  };
}
