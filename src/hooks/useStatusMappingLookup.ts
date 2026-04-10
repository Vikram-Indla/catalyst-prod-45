import { useQuery } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';

export type CatalystCategory = 'To Do' | 'In Progress' | 'Blocked' | 'In Review' | 'Done';
export type StatusBucket = 'todo' | 'progress' | 'done';

/**
 * Complete default mapping of every known Jira status → Catalyst category.
 * Covers: Story, Task, Sub-task, Production Incident, QA Bug workflows.
 */
export const FULL_DEFAULT_MAPPING: Record<CatalystCategory, string[]> = {
  'To Do': [
    'Open', 'To Do', 'Backlog', 'New', 'Todo', 'Re-Open', 'Reopened',
    'Awaiting Info', 'On Hold', 'Reported', 'In Requirements',
    'Ready for Dev', 'Ready for Test',
  ],
  'In Progress': [
    'In Progress', 'In Development', 'Active', 'Under Implementation',
    'In Design', 'In Entity Integration', 'In Beta', 'In Production',
    'Deferred for Int', 'In Investigation', 'In Fix', 'In Execution',
    'Fix in Progress', 'Ready for Development',
  ],
  'Blocked': [
    'Blocked', 'Impediment', 'Rejected',
  ],
  'In Review': [
    'In Review', 'Code Review', 'In QA', 'Ready for QA', 'Retest',
    'In UAT', 'UAT Ready', 'Technical Validation', 'End to End Testing',
    'In Testing', 'QA Pass', 'QA Fail',
  ],
  'Done': [
    'Done', 'Closed', 'Resolved', 'Complete', 'Completed',
    'Ready for Production', 'Beta Ready', 'Production Ready',
    'Monitor', 'Released', 'Verified', 'Approved',
  ],
};

/** Maps a 5-category Catalyst category to the 3-bucket model used by R360 */
const CATEGORY_TO_BUCKET: Record<CatalystCategory, StatusBucket> = {
  'To Do': 'todo',
  'In Progress': 'progress',
  'Blocked': 'todo', // blocked renders as stalled/todo
  'In Review': 'progress',
  'Done': 'done',
};

/** Build a reverse lookup: lowercase status name → CatalystCategory */
function buildLookup(mapping: Record<string, string[]>): Record<string, CatalystCategory> {
  const lookup: Record<string, CatalystCategory> = {};
  for (const [category, statuses] of Object.entries(mapping)) {
    for (const status of statuses) {
      lookup[status.toLowerCase().trim()] = category as CatalystCategory;
    }
  }
  return lookup;
}

/**
 * Fetches the admin-managed status mapping from wh_config and
 * provides lookup functions for any component that needs status resolution.
 */
export function useStatusMappingLookup() {
  const { data: mapping } = useQuery({
    queryKey: ['wh', 'config', 'status_mapping'],
    queryFn: async () => {
      const { data, error } = await typedQuery('wh_config')
        .select('value')
        .eq('key', 'status_mapping')
        .single();
      if (error || !data?.value) return FULL_DEFAULT_MAPPING;
      try {
        const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        // Validate it has at least some keys
        if (Object.keys(parsed).length > 0) return parsed;
        return FULL_DEFAULT_MAPPING;
      } catch {
        return FULL_DEFAULT_MAPPING;
      }
    },
    staleTime: 120_000, // cache for 2 minutes
  });

  const effectiveMapping = mapping || FULL_DEFAULT_MAPPING;
  const lookup = buildLookup(effectiveMapping);

  /**
   * Resolve a raw Jira status to a CatalystCategory (5 categories).
   * Prioritises status_category from Jira, then falls back to admin mapping.
   */
  function resolveCategory(statusName: string, statusCategory?: string): CatalystCategory {
    // 1. Try admin mapping by raw status name first (most specific)
    const key = statusName.toLowerCase().trim();
    if (lookup[key]) return lookup[key];

    // 2. Fall back to Jira status_category
    if (statusCategory) {
      const cat = statusCategory.toLowerCase().trim();
      if (cat === 'done' || cat === 'complete') return 'Done';
      if (cat === 'in progress' || cat === 'indeterminate') return 'In Progress';
      if (cat === 'new' || cat === 'to do') return 'To Do';
    }

    return 'To Do';
  }

  /** Resolve to 3-bucket model (todo/progress/done) */
  function resolveBucket(statusName: string, statusCategory?: string): StatusBucket {
    const cat = resolveCategory(statusName, statusCategory);
    return CATEGORY_TO_BUCKET[cat];
  }

  return { resolveCategory, resolveBucket, mapping: effectiveMapping, lookup };
}

/**
 * Standalone (non-hook) function for use outside React components.
 * Uses the default mapping only (no DB fetch).
 */
const DEFAULT_LOOKUP = buildLookup(FULL_DEFAULT_MAPPING);

export function resolveStatusCategoryStatic(statusName: string, statusCategory?: string): CatalystCategory {
  const key = statusName.toLowerCase().trim();
  if (DEFAULT_LOOKUP[key]) return DEFAULT_LOOKUP[key];
  if (statusCategory) {
    const cat = statusCategory.toLowerCase().trim();
    if (cat === 'done' || cat === 'complete') return 'Done';
    if (cat === 'in progress' || cat === 'indeterminate') return 'In Progress';
    if (cat === 'new' || cat === 'to do') return 'To Do';
  }
  return 'To Do';
}

export function resolveStatusBucketStatic(statusName: string, statusCategory?: string): StatusBucket {
  return CATEGORY_TO_BUCKET[resolveStatusCategoryStatic(statusName, statusCategory)];
}
