import { useMemo } from 'react';
import { useUserRole } from './useUserRole';
import { useProductPermissions } from './useProductPermissions';

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

// Base tabs visible to all users
const BASE_TABS = ['demand-details', 'business-score', 'audit-history'];

/**
 * Maps tab values to their corresponding permission keys
 */
const TAB_PERMISSION_MAP: Record<string, string | null> = {
  'demand-details': 'View Demands',
  'business-score': 'View Demands',
  'ea-review': null, // Special handling for EA Review
  'budget': 'Budget Tab',
  'risks': 'Risks Tab',
  'milestones': 'Milestones Tab',
  'links': 'Links Tab',
  'audit-history': null, // Always visible
};

/**
 * Hook to determine which tabs should be visible based on user's product role permissions
 * 
 * Permission-based visibility:
 * - Budget tab: Visible if 'Budget Tab' permission is not 'None'
 * - Risks tab: Visible if 'Risks Tab' permission is not 'None'
 * - Milestones tab: Visible if 'Milestones Tab' permission is not 'None'
 * - Links tab: Visible if 'Links Tab' permission is not 'None'
 * - EA Review: Visible only for Enterprise Architects or Admin roles
 * - Admin/Super Admin: All tabs visible
 */
export function useBusinessDrawerRoleTabs() {
  const { productRoles, isAdmin, isSuperAdmin, isLoading: roleLoading } = useUserRole();
  const { canView, isLoading: permLoading, isSuperAdmin: permSuperAdmin } = useProductPermissions();

  const isLoading = roleLoading || permLoading;

  const visibleTabs = useMemo(() => {
    // Admin roles see everything
    if (isAdmin || isSuperAdmin || permSuperAdmin) {
      return ALL_TABS;
    }

    // Determine which tabs to show based on product role permissions
    const allowedTabValues = new Set(BASE_TABS);

    // Check each tab against the permission matrix
    ALL_TABS.forEach(tab => {
      const permissionKey = TAB_PERMISSION_MAP[tab.value];
      
      if (permissionKey === null) {
        // Special handling for tabs without direct permission mapping
        if (tab.value === 'ea-review') {
          // EA Review only for Enterprise Architects
          if (productRoles && productRoles.includes('enterprise_architect' as any)) {
            allowedTabValues.add(tab.value);
          }
        } else if (tab.value === 'audit-history') {
          // Audit history always visible
          allowedTabValues.add(tab.value);
        }
      } else {
        // Check permission from the matrix
        if (canView(permissionKey as any)) {
          allowedTabValues.add(tab.value);
        }
      }
    });

    // Filter ALL_TABS to maintain order
    return ALL_TABS.filter(tab => allowedTabValues.has(tab.value));
  }, [productRoles, isAdmin, isSuperAdmin, permSuperAdmin, canView]);

  return {
    visibleTabs,
    isLoading,
  };
}
