import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase, typedQuery } from '@/integrations/supabase/client';

export interface FeatureFlag {
  id: string;
  module_key: string;
  label: string;
  module_name: string;
  description: string | null;
  group_name: string;
  is_enabled: boolean;
  enabled: boolean;
  sort_order: number;
  icon: string | null;
  updated_at: string;
}

/**
 * Mapping from legacy org_modules / route keys → feature_flags.module_key
 * This bridges the old module system to the new feature_flags table.
 */
const MODULE_KEY_ALIASES: Record<string, string> = {
  // Route-level MG keys → feature_flags.module_key
  producthub: 'product_hub',
  strategyhub: 'strategy_hub',
  testhub: 'test_hub',
  workhub: 'work_hub',
  planner: 'task_hub',
  planhub: 'plan_hub',
  wiki: 'wiki_hub',
  operations: 'incident_hub',
  releases: 'release_hub',
  // CatalystHeader nav moduleKeys (from org_modules) → feature_flags.module_key
  enterprise: 'strategy_hub',
  product: 'product_hub',
  // Direct matches (no alias needed, but listed for completeness)
  strategy_hub: 'strategy_hub',
  product_hub: 'product_hub',
  project_hub: 'project_hub',
  work_hub: 'work_hub',
  test_hub: 'test_hub',
  release_hub: 'release_hub',
  incident_hub: 'incident_hub',
  task_hub: 'task_hub',
  plan_hub: 'plan_hub',
  wiki_hub: 'wiki_hub',
  capacity_hub: 'capacity_hub',
  analytics_hub: 'analytics_hub',
  budget_hub: 'budget_hub',
};

/** Resolve any module key (legacy or canonical) to the feature_flags.module_key */
function resolveModuleKey(key: string): string {
  return MODULE_KEY_ALIASES[key] ?? key;
}

interface FeatureFlagContextType {
  flags: Record<string, boolean>;
  allFlags: FeatureFlag[];
  isLoading: boolean;
  isModuleEnabled: (moduleKey: string) => boolean;
  toggleFlag: (moduleKey: string, enabled: boolean) => Promise<void>;
  refetch: () => Promise<void>;
}

const FeatureFlagContext = createContext<FeatureFlagContextType>({
  flags: {},
  allFlags: [],
  isLoading: true,
  isModuleEnabled: () => true,
  toggleFlag: async () => {},
  refetch: async () => {},
});

export const useFeatureFlags = () => useContext(FeatureFlagContext);

export const useModuleEnabled = (moduleKey: string): boolean => {
  const { isModuleEnabled } = useFeatureFlags();
  return isModuleEnabled(moduleKey);
};

export function FeatureFlagProvider({ children }: { children: React.ReactNode }) {
  const [allFlags, setAllFlags] = useState<FeatureFlag[]>([]);
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchFlags = useCallback(async () => {
    try {
      const { data, error } = await typedQuery('feature_flags')
        .select('*')
        .order('sort_order');

      if (error) {
        console.error('Failed to fetch feature flags:', error);
        return;
      }

      const flagMap: Record<string, boolean> = {};
      (data || []).forEach((f: any) => {
        // Use 'enabled' column (canonical from admin page), fallback to is_enabled
        const isOn = f.enabled ?? f.is_enabled ?? true;
        flagMap[f.module_key] = isOn;
      });

      setAllFlags(data as FeatureFlag[]);
      setFlags(flagMap);
    } catch (err) {
      console.error('Feature flag fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  // Auto-refresh every 5 minutes (feature flags rarely change)
  useEffect(() => {
    const interval = setInterval(fetchFlags, 5 * 60_000);
    return () => clearInterval(interval);
  }, [fetchFlags]);

  const isModuleEnabled = useCallback(
    (moduleKey: string) => {
      // During loading, default to enabled (don't flash content away)
      if (isLoading) return true;
      // Resolve aliases (e.g., 'producthub' → 'product_hub')
      const canonical = resolveModuleKey(moduleKey);
      // Default to true if flag not found (graceful degradation)
      return flags[canonical] ?? true;
    },
    [flags, isLoading]
  );

  const toggleFlag = useCallback(
    async (moduleKey: string, enabled: boolean) => {
      const canonical = resolveModuleKey(moduleKey);

      // Optimistic update
      setFlags((prev) => ({ ...prev, [canonical]: enabled }));
      setAllFlags((prev) =>
        prev.map((f) =>
          f.module_key === canonical
            ? { ...f, enabled, is_enabled: enabled, updated_at: new Date().toISOString() }
            : f
        )
      );

      const { error } = await typedQuery('feature_flags')
        .update({
          enabled,
          is_enabled: enabled,
          status: enabled ? 'live' : 'draft',
          updated_at: new Date().toISOString(),
        })
        .eq('module_key', canonical);

      if (error) {
        console.error('Failed to toggle flag:', error);
        setFlags((prev) => ({ ...prev, [canonical]: !enabled }));
        fetchFlags();
      }
    },
    [fetchFlags]
  );

  const value = useMemo(() => ({
    flags, allFlags, isLoading, isModuleEnabled, toggleFlag, refetch: fetchFlags,
  }), [flags, allFlags, isLoading, isModuleEnabled, toggleFlag, fetchFlags]);

  return (
    <FeatureFlagContext.Provider value={value}>
      {children}
    </FeatureFlagContext.Provider>
  );
}
