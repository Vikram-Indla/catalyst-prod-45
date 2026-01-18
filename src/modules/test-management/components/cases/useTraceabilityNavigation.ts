/**
 * Traceability Navigation Hook
 * Provides navigation to linked work items from test cases
 */

import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import { LinkedItem } from './TraceabilityCell';

/**
 * Route mapping for linked item types
 */
const ITEM_TYPE_ROUTES: Record<LinkedItem['type'], string> = {
  story: '/stories',
  feature: '/features',
  epic: '/items/epics',
  defect: '/tests/defects',
  incident: '/release/incidents',
};

export function useTraceabilityNavigation() {
  const navigate = useNavigate();

  const navigateToItem = useCallback((item: LinkedItem) => {
    const basePath = ITEM_TYPE_ROUTES[item.type];
    if (!basePath) {
      console.warn(`Unknown item type: ${item.type}`);
      return;
    }

    // Navigate to the item detail page
    // For most types, append the ID to the base path
    const targetPath = `${basePath}/${item.id}`;
    navigate(targetPath);
  }, [navigate]);

  return { navigateToItem };
}
