import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FeatureFlag {
  id: string;
  module_key: string;
  label: string;
  description: string | null;
  group_name: string;
  is_enabled: boolean;
  sort_order: number;
  icon: string | null;
  updated_at: string;
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
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .order('sort_order');

      if (error) {
        console.error('Failed to fetch feature flags:', error);
        // Default all to true on error so app doesn't break
        return;
      }

      const flagMap: Record<string, boolean> = {};
      (data || []).forEach((f: any) => {
        flagMap[f.module_key] = f.is_enabled;
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

  const isModuleEnabled = useCallback(
    (moduleKey: string) => {
      // Default to true if flag not found (graceful degradation)
      return flags[moduleKey] ?? true;
    },
    [flags]
  );

  const toggleFlag = useCallback(
    async (moduleKey: string, enabled: boolean) => {
      // Optimistic update
      setFlags((prev) => ({ ...prev, [moduleKey]: enabled }));
      setAllFlags((prev) =>
        prev.map((f) =>
          f.module_key === moduleKey
            ? { ...f, is_enabled: enabled, updated_at: new Date().toISOString() }
            : f
        )
      );

      const { error } = await supabase
        .from('feature_flags')
        .update({ is_enabled: enabled, updated_at: new Date().toISOString() })
        .eq('module_key', moduleKey);

      if (error) {
        console.error('Failed to toggle flag:', error);
        // Revert on error
        setFlags((prev) => ({ ...prev, [moduleKey]: !enabled }));
        fetchFlags();
      }
    },
    [fetchFlags]
  );

  return (
    <FeatureFlagContext.Provider
      value={{ flags, allFlags, isLoading, isModuleEnabled, toggleFlag, refetch: fetchFlags }}
    >
      {children}
    </FeatureFlagContext.Provider>
  );
}
