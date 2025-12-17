import { DemandFilterState, Demand, MilestoneCondition } from '@/types/product-roadmap';

/**
 * Check milestone condition for a demand
 */
function checkMilestoneCondition(demand: Demand, condition: MilestoneCondition): boolean {
  const milestones = demand.milestones || [];
  
  switch (condition) {
    case 'no-milestones':
      return milestones.length === 0;
    case 'all-complete':
      return milestones.length > 0 && milestones.every(m => m.status === 'complete');
    case 'has-overdue':
      return milestones.some(m => m.status === 'overdue');
    default:
      return true;
  }
}

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
        !demand.ownerName.toLowerCase().includes(q) &&
        !demand.assigneeName.toLowerCase().includes(q)
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
    
    // Assignee filter (OR within, AND with others)
    if (filters.assigneeIds.length > 0 && !filters.assigneeIds.includes(demand.assigneeId) && !filters.assigneeIds.includes(demand.assigneeName)) {
      return false;
    }
    
    // Quarter filter (OR within, AND with others)
    if (filters.quarters.length > 0 && !filters.quarters.includes(demand.plannedQuarter)) {
      return false;
    }
    
    // Priority Tier filter (OR within, AND with others)
    if (filters.priorityTiers.length > 0 && !filters.priorityTiers.includes(demand.priorityTier)) {
      return false;
    }
    
    // Health filter (OR within, AND with others)
    if (filters.health.length > 0 && !filters.health.includes(demand.health)) {
      return false;
    }
    
    // Milestone Condition filter (OR within, AND with others)
    if (filters.milestoneConditions.length > 0) {
      const matchesAny = filters.milestoneConditions.some(
        condition => checkMilestoneCondition(demand, condition as MilestoneCondition)
      );
      if (!matchesAny) return false;
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
