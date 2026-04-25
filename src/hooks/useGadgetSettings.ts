/**
 * useGadgetSettings — Per-gadget (Layer 2) filter persistence in localStorage.
 *
 * Storage key: catalyst_gadget_settings_{projectKey}_{gadgetType}
 * Returns settings + setter + isDefault flag (drives the blue dot indicator
 * on the gear icon).
 */
import { useCallback, useEffect, useState } from 'react';

export type GadgetType =
  | 'demand' | 'release' | 'incidents' | 'qa'
  | 'items' | 'overdue' | 'onhold' | 'workload' | 'activity';

export interface GadgetSettings {
  statusFilter: string[];
  releaseFilter: string[];
  assigneeFilter: string[];
  itemTypeFilter: string[];
  priorityFilter: string[];
  gadgetSpecific: Record<string, any>;
}

export const DEFAULT_GADGET_SETTINGS: GadgetSettings = {
  statusFilter: [],
  releaseFilter: [],
  assigneeFilter: [],
  itemTypeFilter: [],
  priorityFilter: [],
  gadgetSpecific: {},
};

const storageKey = (projectKey: string, gadget: GadgetType) =>
  `catalyst_gadget_settings_${projectKey}_${gadget}`;

function readFromStorage(projectKey: string, gadget: GadgetType): GadgetSettings {
  if (typeof window === 'undefined') return DEFAULT_GADGET_SETTINGS;
  try {
    const raw = window.localStorage.getItem(storageKey(projectKey, gadget));
    if (!raw) return DEFAULT_GADGET_SETTINGS;
    return { ...DEFAULT_GADGET_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_GADGET_SETTINGS;
  }
}

export function isDefaultSettings(s: GadgetSettings): boolean {
  return (
    s.statusFilter.length === 0 &&
    s.releaseFilter.length === 0 &&
    s.assigneeFilter.length === 0 &&
    s.itemTypeFilter.length === 0 &&
    s.priorityFilter.length === 0 &&
    Object.keys(s.gadgetSpecific ?? {}).length === 0
  );
}

export function useGadgetSettings(gadget: GadgetType, projectKey: string) {
  const [settings, setSettings] = useState<GadgetSettings>(() =>
    readFromStorage(projectKey, gadget),
  );

  // Re-read if projectKey/gadget changes
  useEffect(() => {
    setSettings(readFromStorage(projectKey, gadget));
  }, [projectKey, gadget]);

  const save = useCallback(
    (next: GadgetSettings) => {
      setSettings(next);
      try {
        window.localStorage.setItem(storageKey(projectKey, gadget), JSON.stringify(next));
        // Notify same-tab listeners (storage event only fires cross-tab).
        window.dispatchEvent(
          new CustomEvent('catalyst-gadget-settings-changed', {
            detail: { projectKey, gadget },
          }),
        );
      } catch {
        // ignore quota errors
      }
    },
    [projectKey, gadget],
  );

  const clear = useCallback(() => save(DEFAULT_GADGET_SETTINGS), [save]);

  // Listen for same-tab and cross-tab updates so two gadgets reading the
  // same key stay in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === storageKey(projectKey, gadget)) {
        setSettings(readFromStorage(projectKey, gadget));
      }
    };
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.projectKey === projectKey && detail?.gadget === gadget) {
        setSettings(readFromStorage(projectKey, gadget));
      }
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('catalyst-gadget-settings-changed', onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('catalyst-gadget-settings-changed', onCustom);
    };
  }, [projectKey, gadget]);

  return {
    settings,
    save,
    clear,
    isDefault: isDefaultSettings(settings),
  };
}
