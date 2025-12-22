/**
 * Grouping utility functions for roadmap items
 */

import type { RoadmapDemand, RoadmapGroup, GroupingField, Product } from '../types/roadmap';
import { getProductColor } from '../lib/design-tokens';

/**
 * Group demands by a specific field
 */
export function groupDemands(
  demands: RoadmapDemand[],
  groupingField: GroupingField,
  products: Product[] = []
): RoadmapGroup[] {
  if (!groupingField) {
    // No grouping - return single group with all items
    return [
      {
        key: 'all',
        label: 'All Demands',
        items: demands,
        isExpanded: true,
      },
    ];
  }

  const groupMap = new Map<string, RoadmapDemand[]>();

  demands.forEach((demand) => {
    let groupKey: string;
    
    switch (groupingField) {
      case 'product':
        groupKey = demand.product_id || 'unassigned';
        break;
      case 'status':
        groupKey = demand.process_step || 'unknown';
        break;
      case 'priority':
        groupKey = demand.priority_tier || 'unassigned';
        break;
      case 'assignee':
        groupKey = demand.assignee || 'unassigned';
        break;
      default:
        groupKey = 'all';
    }

    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, []);
    }
    groupMap.get(groupKey)!.push(demand);
  });

  // Convert map to array of groups with labels
  const groups: RoadmapGroup[] = [];

  groupMap.forEach((items, key) => {
    let label: string;
    let color: string | undefined;

    switch (groupingField) {
      case 'product':
        if (key === 'unassigned') {
          label = 'Unassigned';
          color = '#c8ccd0';
        } else {
          const product = products.find((p) => p.id === key);
          label = product?.name || 'Unknown Product';
          color = product?.color || getProductColor(product?.code || null);
        }
        break;
      case 'status':
        label = formatStatusLabel(key);
        break;
      case 'priority':
        label = formatPriorityLabel(key);
        break;
      case 'assignee':
        label = key === 'unassigned' ? 'Unassigned' : key;
        break;
      default:
        label = 'All Demands';
    }

    groups.push({
      key,
      label,
      color,
      items: items.sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999)),
      isExpanded: true,
    });
  });

  // Sort groups
  return sortGroups(groups, groupingField);
}

/**
 * Sort groups based on grouping field
 */
function sortGroups(groups: RoadmapGroup[], groupingField: GroupingField): RoadmapGroup[] {
  const sortOrder: Record<string, Record<string, number>> = {
    status: {
      NEW: 1,
      ANALYSE: 2,
      APPROVED: 3,
      IMPLEMENT: 4,
      CLOSED: 5,
      unknown: 99,
    },
    priority: {
      P0: 1,
      P1: 2,
      P2: 3,
      P3: 4,
      P4: 5,
      unassigned: 99,
    },
  };

  if (groupingField === 'status' || groupingField === 'priority') {
    const order = sortOrder[groupingField] || {};
    return groups.sort((a, b) => {
      const orderA = order[a.key] ?? 50;
      const orderB = order[b.key] ?? 50;
      return orderA - orderB;
    });
  }

  // Default alphabetical sort
  return groups.sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Format status label for display
 */
function formatStatusLabel(status: string): string {
  const statusLabels: Record<string, string> = {
    NEW: 'New Request',
    ANALYSE: 'Analyse',
    APPROVED: 'Approved',
    IMPLEMENT: 'Implement',
    CLOSED: 'Closed',
    unknown: 'Unknown',
  };
  return statusLabels[status] || status;
}

/**
 * Format priority label for display
 */
function formatPriorityLabel(priority: string): string {
  const priorityLabels: Record<string, string> = {
    P0: 'P0 - Critical',
    P1: 'P1 - High',
    P2: 'P2 - Medium',
    P3: 'P3 - Low',
    P4: 'P4 - Minimal',
    unassigned: 'Unassigned',
  };
  return priorityLabels[priority] || priority;
}

/**
 * Toggle expansion state of a group
 */
export function toggleGroupExpansion(
  groups: RoadmapGroup[],
  groupKey: string
): RoadmapGroup[] {
  return groups.map((group) =>
    group.key === groupKey
      ? { ...group, isExpanded: !group.isExpanded }
      : group
  );
}

/**
 * Expand all groups
 */
export function expandAllGroups(groups: RoadmapGroup[]): RoadmapGroup[] {
  return groups.map((group) => ({ ...group, isExpanded: true }));
}

/**
 * Collapse all groups
 */
export function collapseAllGroups(groups: RoadmapGroup[]): RoadmapGroup[] {
  return groups.map((group) => ({ ...group, isExpanded: false }));
}
