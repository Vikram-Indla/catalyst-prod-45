import { FilterState, ProgressRange, KRCondition, PROGRESS_RANGE_CONFIG } from '@/types/canonical-roadmap-filters';
import { Objective, KeyResult } from '@/types/objective-roadmap';

// ─────────────────────────────────────────────────────────────────────────────────
// KR Condition Evaluators (Derived filters - computed, not simple DB fields)
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * HAS_OVERDUE_KRS: Objective has ≥1 KR where kr.end_date < today AND KR is not complete
 */
export function hasOverdueKRs(keyResults: KeyResult[]): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return keyResults.some(kr => {
    const dueDate = new Date(kr.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today && kr.status !== 'complete';
  });
}

/**
 * ALL_KRS_COMPLETE: Objective has ≥1 KR AND all linked KRs are complete
 */
export function hasAllKRsComplete(keyResults: KeyResult[]): boolean {
  return keyResults.length > 0 && keyResults.every(kr => kr.status === 'complete');
}

/**
 * NO_KRS: Objective has zero linked KRs
 */
export function hasNoKRs(keyResults: KeyResult[]): boolean {
  return keyResults.length === 0;
}

// ─────────────────────────────────────────────────────────────────────────────────
// Progress Range Matching
// ─────────────────────────────────────────────────────────────────────────────────

function progressMatchesRange(progress: number, range: ProgressRange): boolean {
  const config = PROGRESS_RANGE_CONFIG.find(r => r.key === range);
  if (!config) return false;
  
  // Handle edge cases: 0-25 includes 0, 75-100 includes 100
  if (range === '0_25') return progress >= 0 && progress < 25;
  if (range === '25_50') return progress >= 25 && progress < 50;
  if (range === '50_75') return progress >= 50 && progress < 75;
  if (range === '75_100') return progress >= 75 && progress <= 100;
  
  return progress >= config.min && progress <= config.max;
}

function progressMatchesAnyRange(progress: number, ranges: ProgressRange[]): boolean {
  if (ranges.length === 0) return true; // No filter = all pass
  return ranges.some(range => progressMatchesRange(progress, range));
}

// ─────────────────────────────────────────────────────────────────────────────────
// Main Filter Function
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Canonical filter function for Objective Roadmap.
 * 
 * Rules:
 * - OR within each filter group (e.g., status: ['on-track', 'at-risk'] = on-track OR at-risk)
 * - AND across filter groups (status AND theme AND owner AND progress AND krConditions)
 * - Empty array = no filter applied (all pass)
 */
export function filterObjectivesCanonical(
  objectives: Objective[],
  filters: FilterState,
  searchQuery: string = ''
): Objective[] {
  return objectives.filter(obj => {
    // Search filter (always AND with other filters)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!obj.name.toLowerCase().includes(q) && !obj.id.toLowerCase().includes(q)) {
        return false;
      }
    }
    
    // Status filter (OR within, AND with others)
    if (filters.status.length > 0 && !filters.status.includes(obj.status)) {
      return false;
    }
    
    // Theme filter (OR within, AND with others)
    if (filters.themeIds.length > 0 && !filters.themeIds.includes(obj.themeId)) {
      return false;
    }
    
    // Owner filter (OR within, AND with others)
    if (filters.ownerIds.length > 0 && !filters.ownerIds.includes(obj.ownerId)) {
      return false;
    }
    
    // Progress filter (OR within ranges, AND with others)
    if (!progressMatchesAnyRange(obj.progress, filters.progressRanges)) {
      return false;
    }
    
    // KR Conditions filter (OR within, AND with others)
    if (filters.krConditions.length > 0) {
      let matchesAny = false;
      
      if (filters.krConditions.includes('HAS_OVERDUE_KRS') && hasOverdueKRs(obj.keyResults)) {
        matchesAny = true;
      }
      if (filters.krConditions.includes('ALL_KRS_COMPLETE') && hasAllKRsComplete(obj.keyResults)) {
        matchesAny = true;
      }
      if (filters.krConditions.includes('NO_KRS') && hasNoKRs(obj.keyResults)) {
        matchesAny = true;
      }
      
      if (!matchesAny) return false;
    }
    
    return true;
  });
}

// ─────────────────────────────────────────────────────────────────────────────────
// Matching Count Calculator (for draft preview)
// ─────────────────────────────────────────────────────────────────────────────────

export function countMatchingObjectives(
  objectives: Objective[],
  filters: FilterState,
  searchQuery: string = ''
): number {
  return filterObjectivesCanonical(objectives, filters, searchQuery).length;
}
