/**
 * useComponentConfig — runtime config hook for canonical components.
 *
 * Authored: 2026-05-17 (PR-1 Step 5).
 *
 * Reads the `component_config` table via supabase-js, caches with react-query
 * (5-min staleTime so we don't thrash the DB), and returns the runtime config
 * for a given registry component id. Returns `undefined` when no row exists —
 * the resolver falls back to registry defaults in that case.
 *
 * Bulk-fetch variant `useAllComponentConfigs()` is used by the admin UI so
 * one query feeds the entire Publish + History view.
 *
 * Dev-mode logger:
 *   Outsider council mandate. In `import.meta.env.DEV`, every resolver call
 *   logs `[components] {id} v{version} flags {...}` with the per-flag source
 *   map. Disabled in production to avoid log noise.
 */
import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/integrations/supabase/client';
import { getComponentById } from './components.registry';
import {
  resolveComponentConfig,
  type ResolvedComponentConfig,
  type RuntimeComponentConfig,
} from './resolveComponentConfig';

const COMPONENT_CONFIG_QUERY_KEY = ['component_config'] as const;

/** Bulk fetcher — one query for every row, cached globally. */
async function fetchAllComponentConfigs(): Promise<Record<string, RuntimeComponentConfig>> {
  // The component_config table may not exist yet in test/preview environments
  // (PR-1 migration not applied). Swallow that case and return empty so the
  // resolver falls back to registry defaults cleanly.
  const { data, error } = await (supabase as any)
    .from('component_config')
    .select('component_id, active_version, feature_flags, applied_at, applied_by, notes');
  if (error) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn('[components] useComponentConfig fetch failed:', error.message);
    }
    return {};
  }
  const out: Record<string, RuntimeComponentConfig> = {};
  for (const row of (data ?? []) as Array<RuntimeComponentConfig & { component_id: string }>) {
    out[row.component_id] = {
      active_version: row.active_version,
      feature_flags: row.feature_flags ?? {},
      applied_at: row.applied_at,
      applied_by: row.applied_by,
      notes: row.notes,
    };
  }
  return out;
}

/** Public hook returning the whole config map (for admin UI). */
export function useAllComponentConfigs() {
  return useQuery({
    queryKey: COMPONENT_CONFIG_QUERY_KEY,
    queryFn: fetchAllComponentConfigs,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Single-component hook for canonical components to resolve their config.
 * Returns the resolved config (already merged with props + registry default).
 * If the component_id isn't in the registry, returns registry-default-empty.
 */
export function useComponentConfig(
  componentId: string,
  props: Record<string, unknown> = {},
): ResolvedComponentConfig {
  const { data } = useAllComponentConfigs();
  const entry = getComponentById(componentId);

  if (!entry) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn(`[components] useComponentConfig: id "${componentId}" not in registry`);
    }
    return { activeVersion: '0.0.0', flags: {}, sources: {} };
  }

  const runtime = data?.[componentId];
  const resolved = resolveComponentConfig(entry, runtime, props);

  if (import.meta.env.DEV) {
    const overrides = Object.entries(resolved.sources)
      .filter(([, src]) => src !== 'registry')
      .map(([flag, src]) => `${flag}=${String(resolved.flags[flag])} (${src})`);
    if (overrides.length > 0) {
      // eslint-disable-next-line no-console
      console.log(
        `[components] ${componentId} v${resolved.activeVersion} — overrides: ${overrides.join(', ')}`,
      );
    }
  }

  return resolved;
}

/** Hook key + utilities re-exported for invalidation from the Publish UI. */
export { COMPONENT_CONFIG_QUERY_KEY };
