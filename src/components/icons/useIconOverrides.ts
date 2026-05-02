/**
 * useIconOverrides — runtime asset overrides from /admin/icons.
 *
 * Reads the `catalyst_icon_overrides` Supabase table and exposes a
 * resolver that the WorkItemTypeIcon / PriorityIcon / ProjectAvatar
 * components consult before falling back to their bundled compile-time URLs.
 *
 * Design:
 *   - Cached via React Query (staleTime 5 min) so widgets don't re-fetch.
 *   - SSR-safe: components must not crash if the hook returns no data yet
 *     — they fall back to bundled URLs.
 *   - Override row shape: { category, key, override_url } where:
 *       category ∈ 'work-type' | 'priority' | 'project-avatar'
 *       key      = WorkItemType | PriorityLevel | ProjectKey | StockAvatarId
 *
 * Companion files:
 *   src/pages/admin/icons/AdminIconsPage.tsx — upload UI
 *   supabase/migrations/<ts>_create_catalyst_icon_overrides.sql
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type IconCategory = 'work-type' | 'priority' | 'project-avatar';

export interface IconOverride {
  category: IconCategory;
  key: string;
  override_url: string;
  variant: 'light' | 'dark';
  updated_at: string;
}

interface OverrideMaps {
  workType: Record<string, { light?: string; dark?: string }>;
  priority: Record<string, { light?: string; dark?: string }>;
  projectAvatar: Record<string, string>;
}

const EMPTY_MAPS: OverrideMaps = {
  workType: {},
  priority: {},
  projectAvatar: {},
};

async function fetchOverrides(): Promise<OverrideMaps> {
  // Defensive: Supabase types may not include this table yet on first
  // deploy. We `as any` the from() call so the hook compiles before the
  // migration runs — at runtime the request returns 404 and we return the
  // empty maps, which is the correct fallback.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from as any)('catalyst_icon_overrides')
    .select('category, key, override_url, variant, updated_at');

  if (error || !Array.isArray(data)) {
    return EMPTY_MAPS;
  }

  const maps: OverrideMaps = {
    workType: {},
    priority: {},
    projectAvatar: {},
  };

  for (const row of data as IconOverride[]) {
    if (!row.override_url || !row.key) continue;
    if (row.category === 'work-type') {
      maps.workType[row.key] ??= {};
      maps.workType[row.key][row.variant] = row.override_url;
    } else if (row.category === 'priority') {
      maps.priority[row.key] ??= {};
      maps.priority[row.key][row.variant] = row.override_url;
    } else if (row.category === 'project-avatar') {
      maps.projectAvatar[row.key] = row.override_url;
    }
  }

  return maps;
}

/**
 * Returns the current icon-override maps. Components consult this and fall
 * back to bundled URLs when no override exists for the requested key.
 */
export function useIconOverrides() {
  return useQuery({
    queryKey: ['icon-overrides'],
    queryFn: fetchOverrides,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: false,
    placeholderData: EMPTY_MAPS,
  });
}
