/**
 * Dependency Analytics Computation Helpers
 * Pure functions for computing dependency analytics for a selected program
 */

import type { DependencyStatus, RiskLevel } from './types';
import { extractProgramIdsFromDep, resolveDependencyWorkItems, type WorkItemMaps } from './resolveWorkItem';

export type DependencyDirection = 'outgoing' | 'incoming' | 'internal' | null;

export type WorkItemMode = 'epics' | 'features' | 'all';

export interface DrawerFilters {
  quarter?: string | 'all';
  workItemMode: WorkItemMode;
}

/**
 * Classify a dependency's direction relative to a program
 * - Outgoing: We (programId) are requesting something from others
 * - Incoming: Others are requesting something from us (programId)
 * - Internal: Both source and target are within the same program
 */
export function classifyDirection(
  dep: any,
  programId: string,
  workItemMaps: WorkItemMaps
): DependencyDirection {
  const { sourceProgramId, targetProgramId } = extractProgramIdsFromDep(dep, workItemMaps);

  if (!sourceProgramId && !targetProgramId) return null;

  const sourceMatches = sourceProgramId === programId;
  const targetMatches = targetProgramId === programId;

  if (sourceMatches && targetMatches) {
    return 'internal';
  }
  if (sourceMatches && !targetMatches) {
    return 'outgoing';
  }
  if (!sourceMatches && targetMatches) {
    return 'incoming';
  }

  return null;
}

/**
 * Apply drawer-specific filters to dependencies
 * Work item mode uses BOTH source and target types for accurate classification:
 * - Epics: requesting_work_item_type === 'epic' AND depends_on_work_item_type === 'epic'
 * - Features: requesting_work_item_type === 'feature' AND depends_on_work_item_type === 'feature'
 * - All: no restriction
 */
export function applyDrawerFilters(
  deps: any[],
  filters: DrawerFilters,
  workItemMaps: WorkItemMaps
): any[] {
  return deps.filter(dep => {
    // Quarter filter
    if (filters.quarter && filters.quarter !== 'all') {
      if (dep.quarter !== filters.quarter) return false;
    }

    // Work item mode filter - check BOTH source and target types
    if (filters.workItemMode !== 'all') {
      const sourceType = dep.requesting_work_item_type || 'feature';
      const targetType = dep.depends_on_work_item_type || 'feature';
      
      if (filters.workItemMode === 'epics') {
        // Both must be epic for epic-level dependencies
        if (sourceType !== 'epic' || targetType !== 'epic') return false;
      }
      if (filters.workItemMode === 'features') {
        // Both must be feature for feature-level dependencies
        if (sourceType !== 'feature' || targetType !== 'feature') return false;
      }
    }

    return true;
  });
}

export interface DependencySummary {
  total: number;
  outgoing: number;
  incoming: number;
  internal: number;
}

/**
 * Compute summary counts for a program
 */
export function computeSummary(
  deps: any[],
  programId: string,
  workItemMaps: WorkItemMaps
): DependencySummary {
  let outgoing = 0;
  let incoming = 0;
  let internal = 0;

  deps.forEach(dep => {
    const direction = classifyDirection(dep, programId, workItemMaps);
    if (direction === 'outgoing') outgoing++;
    else if (direction === 'incoming') incoming++;
    else if (direction === 'internal') internal++;
  });

  return {
    total: outgoing + incoming + internal,
    outgoing,
    incoming,
    internal,
  };
}

export interface AttentionItems {
  overdue: number;
  highRisk: number;
  awaitingResponse: number;
  overdueList: any[];
  highRiskList: any[];
  awaitingList: any[];
}

const TERMINAL_STATUSES: DependencyStatus[] = ['delivered', 'done', 'cancelled', 'rejected', 'not_required', 'no_work_done'];
const AWAITING_STATUSES: DependencyStatus[] = ['pending_commit', 'negotiation'];

/**
 * Compute attention items (overdue, high risk, awaiting response)
 */
export function computeAttention(
  deps: any[],
  programId: string,
  workItemMaps: WorkItemMaps
): AttentionItems {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueList: any[] = [];
  const highRiskList: any[] = [];
  const awaitingList: any[] = [];

  deps.forEach(dep => {
    const direction = classifyDirection(dep, programId, workItemMaps);
    if (!direction) return;

    const status = dep.status as DependencyStatus;
    const isTerminal = TERMINAL_STATUSES.includes(status);

    // Overdue: needed_by_date < today AND not in terminal status
    if (dep.needed_by_date && !isTerminal) {
      const neededBy = new Date(dep.needed_by_date);
      neededBy.setHours(0, 0, 0, 0);
      if (neededBy < today) {
        overdueList.push({ ...dep, direction });
      }
    }

    // High risk
    if (dep.risk_level === 'high' && !isTerminal) {
      highRiskList.push({ ...dep, direction });
    }

    // Awaiting response
    if (AWAITING_STATUSES.includes(status)) {
      awaitingList.push({ ...dep, direction });
    }
  });

  return {
    overdue: overdueList.length,
    highRisk: highRiskList.length,
    awaitingResponse: awaitingList.length,
    overdueList,
    highRiskList,
    awaitingList,
  };
}

export type HealthStatus = 'healthy' | 'at-risk' | 'critical';

/**
 * Compute health banner status
 */
export function computeHealth(attention: AttentionItems): HealthStatus {
  // Critical if any overdue or multiple high risk
  if (attention.overdue > 0 || attention.highRisk > 2) {
    return 'critical';
  }

  // At risk if awaiting response or has some high risk
  if (attention.awaitingResponse > 0 || attention.highRisk > 0) {
    return 'at-risk';
  }

  return 'healthy';
}

export interface StatusDistribution {
  status: DependencyStatus;
  count: number;
  label: string;
}

const STATUS_ORDER: DependencyStatus[] = [
  'delivered', 'done', 'in_progress', 'committed', 'pending_commit', 
  'negotiation', 'draft', 'cancelled', 'rejected', 'not_required', 'no_work_done', 'open'
];

/**
 * Compute status distribution for dependencies
 */
export function computeStatusDistribution(deps: any[]): StatusDistribution[] {
  const counts = new Map<DependencyStatus, number>();

  deps.forEach(dep => {
    const status = (dep.status || 'draft') as DependencyStatus;
    counts.set(status, (counts.get(status) || 0) + 1);
  });

  const distribution: StatusDistribution[] = [];
  STATUS_ORDER.forEach(status => {
    const count = counts.get(status);
    if (count && count > 0) {
      distribution.push({
        status,
        count,
        label: formatStatusLabel(status),
      });
    }
  });

  return distribution;
}

function formatStatusLabel(status: DependencyStatus): string {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

export interface TopPartner {
  programId: string;
  programName: string;
  count: number;
}

/**
 * Compute top partners (blockers for outgoing, dependents for incoming)
 */
export function computeTopPartners(
  deps: any[],
  direction: DependencyDirection,
  programId: string,
  workItemMaps: WorkItemMaps,
  programs: Array<{ id: string; name: string }>
): TopPartner[] {
  if (direction === 'internal') return [];

  const partnerCounts = new Map<string, number>();
  const programMap = new Map(programs.map(p => [p.id, p.name]));

  deps.forEach(dep => {
    const depDirection = classifyDirection(dep, programId, workItemMaps);
    if (depDirection !== direction) return;

    const { sourceProgramId, targetProgramId } = extractProgramIdsFromDep(dep, workItemMaps);

    // For outgoing: partner is the target program (who we depend on)
    // For incoming: partner is the source program (who depends on us)
    const partnerId = direction === 'outgoing' ? targetProgramId : sourceProgramId;

    if (partnerId && partnerId !== programId) {
      partnerCounts.set(partnerId, (partnerCounts.get(partnerId) || 0) + 1);
    }
  });

  const partners: TopPartner[] = [];
  partnerCounts.forEach((count, id) => {
    partners.push({
      programId: id,
      programName: programMap.get(id) || 'Unknown Program',
      count,
    });
  });

  // Sort by count descending, take top 5
  return partners.sort((a, b) => b.count - a.count).slice(0, 5);
}

/**
 * Filter dependencies by direction and optional partner program
 */
export function filterByDirection(
  deps: any[],
  direction: DependencyDirection,
  programId: string,
  workItemMaps: WorkItemMaps,
  partnerProgramId?: string
): any[] {
  return deps.filter(dep => {
    const depDirection = classifyDirection(dep, programId, workItemMaps);
    if (depDirection !== direction) return false;

    if (partnerProgramId) {
      const { sourceProgramId, targetProgramId } = extractProgramIdsFromDep(dep, workItemMaps);
      const partnerId = direction === 'outgoing' ? targetProgramId : sourceProgramId;
      if (partnerId !== partnerProgramId) return false;
    }

    return true;
  });
}

/**
 * Calculate days overdue for a dependency
 */
export function getDaysOverdue(dep: any): number | null {
  if (!dep.needed_by_date) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const neededBy = new Date(dep.needed_by_date);
  neededBy.setHours(0, 0, 0, 0);

  const diff = Math.floor((today.getTime() - neededBy.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : null;
}
