// src/hooks/home/useHomeFilters.ts
// Unified filter model for all Home modes (Operations, Delivery, Planner)

import { useSearchParams } from 'react-router-dom';
import { useCallback, useMemo } from 'react';
import { useDebounce } from '@/hooks/useDebounce';

// ============================================
// DOMAIN FILTER TYPE
// ============================================
export type HomeDomain = 'all' | 'operations' | 'delivery' | 'planner';

// ============================================
// UNIFIED FILTER TYPE - Used by ALL modes
// ============================================
export interface HomeFilters {
  search: string;
  scope: 'worked-on' | 'assigned' | 'starred';
  domain: HomeDomain; // NEW: Domain filter for cross-mode filtering
  status: string[];
  priority: string[];
  updatedRange: '24h' | '7d' | '30d' | 'any';
  projectIds: string[];
  types: string[];
  // Mode-specific but exposed uniformly
  decisionRequired: boolean | null;
  readyForSprint: boolean | null;
  plannedDateFrom: string | null;
  plannedDateTo: string | null;
}

export interface HomeSortOptions {
  sort: 'updated' | 'priority' | 'status' | 'planned-date';
}

export interface HomePagination {
  page: number;
  pageSize: number;
}

// ============================================
// DOMAIN OPTIONS
// ============================================
export const DOMAIN_OPTIONS: { value: HomeDomain; label: string }[] = [
  { value: 'all', label: 'All domains' },
  { value: 'operations', label: 'Operations' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'planner', label: 'Planner' },
];

// ============================================
// DEFAULT FILTERS
// ============================================
export function getDefaultHomeFilters(): HomeFilters {
  return {
    search: '',
    scope: 'worked-on',
    domain: 'all', // Default to all domains
    status: [],
    priority: [],
    updatedRange: 'any',
    projectIds: [],
    types: [],
    decisionRequired: null,
    readyForSprint: null,
    plannedDateFrom: null,
    plannedDateTo: null,
  };
}

// ============================================
// MODE-SPECIFIC TYPE DEFAULTS
// ============================================
export const MODE_TYPE_DEFAULTS = {
  operations: ['incident', 'release'],
  delivery: ['epic', 'feature', 'story', 'task'],
  planner: ['task'],
} as const;

// ============================================
// STATUS OPTIONS PER MODE
// ============================================
export const MODE_STATUS_OPTIONS = {
  operations: [
    { value: 'open', label: 'Open' },
    { value: 'triage', label: 'Triage' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'to_committee', label: 'To Committee' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' },
  ],
  delivery: [
    { value: 'Open', label: 'Open' },
    { value: 'In Progress', label: 'In Progress' },
    { value: 'In Review', label: 'In Review' },
    { value: 'Done', label: 'Done' },
    { value: 'Blocked', label: 'Blocked' },
  ],
  planner: [
    { value: 'Backlog', label: 'Backlog' },
    { value: 'Planned', label: 'Planned' },
    { value: 'In Progress', label: 'In Progress' },
    { value: 'On Hold', label: 'On Hold' },
  ],
} as const;

export const PRIORITY_OPTIONS = [
  { value: 'Critical', label: 'Critical' },
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' },
];

export const UPDATED_RANGE_OPTIONS = [
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'any', label: 'Any time' },
];

// ============================================
// SERIALIZE FILTERS TO URL
// ============================================
export function serializeHomeFilters(filters: HomeFilters): Record<string, string> {
  const params: Record<string, string> = {};

  if (filters.search) params.search = filters.search;
  if (filters.scope !== 'worked-on') params.scope = filters.scope;
  if (filters.domain !== 'all') params.domain = filters.domain;
  if (filters.status.length > 0) params.status = filters.status.join(',');
  if (filters.priority.length > 0) params.priority = filters.priority.join(',');
  if (filters.updatedRange !== 'any') params.updatedRange = filters.updatedRange;
  if (filters.projectIds.length > 0) params.projectIds = filters.projectIds.join(',');
  if (filters.types.length > 0) params.types = filters.types.join(',');
  if (filters.decisionRequired !== null) params.decisionRequired = String(filters.decisionRequired);
  if (filters.readyForSprint !== null) params.readyForSprint = String(filters.readyForSprint);
  if (filters.plannedDateFrom) params.plannedDateFrom = filters.plannedDateFrom;
  if (filters.plannedDateTo) params.plannedDateTo = filters.plannedDateTo;

  return params;
}

// ============================================
// DESERIALIZE FILTERS FROM URL
// ============================================
export function deserializeHomeFilters(params: URLSearchParams): HomeFilters {
  return {
    search: params.get('search') || '',
    scope: (params.get('scope') as HomeFilters['scope']) || 'worked-on',
    domain: (params.get('domain') as HomeDomain) || 'all',
    status: params.get('status')?.split(',').filter(Boolean) || [],
    priority: params.get('priority')?.split(',').filter(Boolean) || [],
    updatedRange: (params.get('updatedRange') as HomeFilters['updatedRange']) || 'any',
    projectIds: params.get('projectIds')?.split(',').filter(Boolean) || [],
    types: params.get('types')?.split(',').filter(Boolean) || [],
    decisionRequired: params.has('decisionRequired') 
      ? params.get('decisionRequired') === 'true' 
      : null,
    readyForSprint: params.has('readyForSprint') 
      ? params.get('readyForSprint') === 'true' 
      : null,
    plannedDateFrom: params.get('plannedDateFrom') || null,
    plannedDateTo: params.get('plannedDateTo') || null,
  };
}

// ============================================
// CHECK IF FILTERS ARE ACTIVE
// ============================================
export function hasActiveHomeFilters(filters: HomeFilters): boolean {
  return (
    filters.domain !== 'all' ||
    filters.status.length > 0 ||
    filters.priority.length > 0 ||
    filters.updatedRange !== 'any' ||
    filters.projectIds.length > 0 ||
    filters.types.length > 0 ||
    filters.decisionRequired !== null ||
    filters.readyForSprint !== null ||
    filters.plannedDateFrom !== null ||
    filters.plannedDateTo !== null
  );
}

// ============================================
// COUNT ACTIVE FILTERS
// ============================================
export function countActiveHomeFilters(filters: HomeFilters): number {
  let count = 0;
  if (filters.domain !== 'all') count++;
  if (filters.status.length > 0) count++;
  if (filters.priority.length > 0) count++;
  if (filters.updatedRange !== 'any') count++;
  if (filters.projectIds.length > 0) count++;
  if (filters.types.length > 0) count++;
  if (filters.decisionRequired !== null) count++;
  if (filters.readyForSprint !== null) count++;
  if (filters.plannedDateFrom || filters.plannedDateTo) count++;
  return count;
}

// ============================================
// UNIFIED HOME FILTERS HOOK
// ============================================
export type HomeRoleMode = 'operations' | 'delivery' | 'planner';

export function useHomeFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse state from URL
  const mode = (searchParams.get('mode') as HomeRoleMode) || 'delivery';
  const filters = useMemo(() => deserializeHomeFilters(searchParams), [searchParams]);
  const sort = (searchParams.get('sort') as HomeSortOptions['sort']) || 'updated';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = 20;

  // Debounced search for API calls
  const debouncedSearch = useDebounce(filters.search, 300);

  // Update URL with new params
  const updateUrl = useCallback((updates: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // Mode change
  const setMode = useCallback((newMode: HomeRoleMode) => {
    const newParams = new URLSearchParams();
    newParams.set('mode', newMode);
    setSearchParams(newParams, { replace: true });
  }, [setSearchParams]);

  // Scope/tab change
  const setScope = useCallback((scope: HomeFilters['scope']) => {
    updateUrl({ scope: scope === 'worked-on' ? null : scope, page: null });
  }, [updateUrl]);

  // Search change
  const setSearch = useCallback((search: string) => {
    updateUrl({ search: search || null, page: null });
  }, [updateUrl]);

  // Sort change
  const setSort = useCallback((newSort: HomeSortOptions['sort']) => {
    updateUrl({ sort: newSort === 'updated' ? null : newSort });
  }, [updateUrl]);

  // Filters change
  const setFilters = useCallback((newFilters: Partial<HomeFilters>) => {
    const merged = { ...filters, ...newFilters };
    const serialized = serializeHomeFilters(merged);
    
    // Clear old filter params then set new ones
    const newParams = new URLSearchParams(searchParams);
    ['domain', 'status', 'priority', 'updatedRange', 'projectIds', 'types', 'decisionRequired', 'readyForSprint', 'plannedDateFrom', 'plannedDateTo']
      .forEach(k => newParams.delete(k));
    newParams.delete('page');
    
    Object.entries(serialized).forEach(([k, v]) => {
      if (k !== 'search' && k !== 'scope') {
        newParams.set(k, v);
      }
    });
    
    setSearchParams(newParams, { replace: true });
  }, [filters, searchParams, setSearchParams]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    const newParams = new URLSearchParams(searchParams);
    ['domain', 'status', 'priority', 'updatedRange', 'projectIds', 'types', 'decisionRequired', 'readyForSprint', 'plannedDateFrom', 'plannedDateTo', 'page']
      .forEach(k => newParams.delete(k));
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // Page change
  const setPage = useCallback((newPage: number) => {
    updateUrl({ page: newPage === 1 ? null : String(newPage) });
  }, [updateUrl]);

  const activeFilterCount = countActiveHomeFilters(filters);
  const hasFilters = hasActiveHomeFilters(filters);

  return {
    mode,
    filters,
    debouncedSearch,
    sort,
    page,
    pageSize,
    activeFilterCount,
    hasFilters,
    setMode,
    setScope,
    setSearch,
    setSort,
    setFilters,
    clearFilters,
    setPage,
  };
}
