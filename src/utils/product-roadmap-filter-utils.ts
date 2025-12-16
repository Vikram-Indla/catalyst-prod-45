import { DemandFilterState, Demand } from '@/types/product-roadmap';

/**
 * Filter demands using canonical filter rules:
 * - OR within each filter group
 * - AND across filter groups
 * - Empty array = no filter (all pass)
 */
export function filterDemandsCanonical(
  demands: Demand[],
  filters: DemandFilterState,
  searchQuery: string = ''
): Demand[] {
  return demands.filter(demand => {
    // Search filter (always AND with other filters)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !demand.title.toLowerCase().includes(q) &&
        !demand.key.toLowerCase().includes(q) &&
        !demand.ownerName.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    
    // Status filter (OR within, AND with others)
    if (filters.status.length > 0 && !filters.status.includes(demand.status)) {
      return false;
    }
    
    // Owner filter (OR within, AND with others)
    if (filters.ownerIds.length > 0 && !filters.ownerIds.includes(demand.ownerId) && !filters.ownerIds.includes(demand.ownerName)) {
      return false;
    }
    
    // Platform filter (OR within, AND with others)
    if (filters.platforms.length > 0 && !filters.platforms.includes(demand.platform)) {
      return false;
    }
    
    return true;
  });
}

/**
 * Count matching demands for draft preview
 */
export function countMatchingDemands(
  demands: Demand[],
  filters: DemandFilterState,
  searchQuery: string = ''
): number {
  return filterDemandsCanonical(demands, filters, searchQuery).length;
}

/**
 * Filter by viewport overlap (items must overlap viewport range)
 */
export function filterByViewportOverlap<T extends { startDate: Date; endDate: Date }>(
  items: T[],
  viewportStart: Date,
  viewportEnd: Date
): T[] {
  return items.filter(item => {
    const itemStart = item.startDate.getTime();
    const itemEnd = item.endDate.getTime();
    const viewStart = viewportStart.getTime();
    const viewEnd = viewportEnd.getTime();
    
    // Item overlaps if: itemStart <= viewport.end AND itemEnd >= viewport.start
    return itemStart <= viewEnd && itemEnd >= viewStart;
  });
}
