/**
 * Work Item Route Utility
 * 
 * Centralized helper to generate correct routes for work items.
 * Ensures consistency across all navigation points (Home, Starred, Search, etc.)
 * 
 * IMPORTANT: All routes must map to actual routes defined in App.tsx.
 * The primary deep-link resolver is /browse/:key which handles resolution.
 */

import { toast } from 'sonner';

export interface WorkItemRouteInput {
  id?: string;
  key?: string;
  type: string;
}

/**
 * Returns the correct detail route for a work item.
 * 
 * Route mapping (based on actual App.tsx routes):
 * - epic: /browse/${key} -> resolved by BrowsePage to /items/epics?selected=${id}
 * - feature: /browse/${key} -> resolved by BrowsePage to /items/features?selected=${id}
 * - story: /browse/${key} -> resolved by BrowsePage to /items/stories?selected=${id}
 * - task: /work-manager/tasks/${id} (direct route exists)
 * - defect/incident: /release/incidents/${id} (direct route exists)
 * - release: /release/versions/${id} (direct route exists)
 * - demand: /industry?selected=${id}
 * 
 * Uses /browse/:key for types that need resolution via BrowsePage.
 */
export function getWorkItemRoute(item: WorkItemRouteInput): string | null {
  const { id, key, type } = item;
  
  // Validate we have at least one identifier
  if (!id && !key) {
    return null;
  }
  
  // Normalize type for comparison
  const normalizedType = (type || '').toLowerCase();
  
  // Route by type - prefer using /browse/:key for items that go through resolver
  switch (normalizedType) {
    case 'epic':
      // Use browse resolver with key for proper epic resolution
      if (key) return `/browse/${key}`;
      // Fallback to items page with selection
      return id ? `/items/epics?selected=${id}` : null;
      
    case 'feature':
      // Use browse resolver with key
      if (key) return `/browse/${key}`;
      // Fallback to items page with selection
      return id ? `/items/features?selected=${id}` : null;
      
    case 'story':
      // Use browse resolver with key for stories
      if (key) return `/browse/${key}`;
      return id ? `/items/stories?selected=${id}` : null;
      
    case 'task':
      // Tasks open in WorkManager with drawer - use taskId query param
      return id ? `/taskhub/tasks?taskId=${id}` : null;
      
    case 'defect':
    case 'incident':
      // Incidents/defects have direct route
      return id ? `/release/incidents/${id}` : null;
      
    case 'release':
      // Releases have direct route to version detail
      return id ? `/release/versions/${id}` : null;
      
    case 'demand':
    case 'business_request':
      // Demand items use selection param
      return id ? `/industry?selected=${id}` : null;
      
    default:
      // For unknown types, try browse with key (safest option)
      if (key) return `/browse/${key}`;
      // If no key, can't safely navigate
      return null;
  }
}

/**
 * Gets the route and validates it, returning null and showing toast if invalid.
 */
export function getValidatedWorkItemRoute(item: WorkItemRouteInput): string | null {
  const route = getWorkItemRoute(item);
  
  if (!route) {
    toast.error('Cannot open work item', {
      description: 'Missing identifier - this item cannot be opened.',
    });
    return null;
  }
  
  return route;
}

/**
 * Safely navigates to a work item, showing a toast if navigation is not possible.
 * Returns true if navigation should proceed, false if blocked.
 */
export function canNavigateToWorkItem(item: WorkItemRouteInput): boolean {
  const route = getWorkItemRoute(item);
  
  if (!route) {
    toast.error('Cannot open work item', {
      description: 'Missing identifier - this item cannot be opened.',
    });
    return false;
  }
  
  return true;
}
