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
  | 'items' | 'overdue' | 'onhold' | 'workload' | 'activity' | 'scope';

export type DatePreset =
  | 'thisQuarter' | 'thisYear'
  | 'Q1' | 'Q2' | 'Q3' | 'Q4'
  | 'all' | 'custom';

export interface GadgetSettings {
  statusFilter: string[];
  releaseFilter: string[];
  assigneeFilter: string[];
  itemTypeFilter: string[];
  priorityFilter: string[];
  gadgetSpecific: Record<string, any>;
  // Per-gadget date filter
  datePreset: DatePreset;
  dateFrom: string | null;  // ISO 'YYYY-MM-DD'
  dateTo: string | null;
  dateLabel: string;
}

export function resolvePreset(
  preset: DatePreset,
  customFrom?: string,
  customTo?: string,
): { dateFrom: string | null; dateTo: string | null; dateLabel: string } {
  const yr = 2026;
  switch (preset) {
    case 'thisQuarter': {
      const m = new Date().getMonth();
      if (m < 3) return { dateFrom: `${yr}-01-01`, dateTo: `${yr}-03-31`, dateLabel: `This quarter · Q1 ${yr}` };
      if (m < 6) return { dateFrom: `${yr}-04-01`, dateTo: `${yr}-06-30`, dateLabel: `This quarter · Q2 ${yr}` };
      if (m < 9) return { dateFrom: `${yr}-07-01`, dateTo: `${yr}-09-30`, dateLabel: `This quarter · Q3 ${yr}` };
      return { dateFrom: `${yr}-10-01`, dateTo: `${yr}-12-31`, dateLabel: `This quarter · Q4 ${yr}` };
    }
    case 'thisYear': return { dateFrom: `${yr}-01-01`, dateTo: `${yr}-12-31`, dateLabel: `This year · FY${yr}` };
    case 'Q1': return { dateFrom: `${yr}-01-01`, dateTo: `${yr}-03-31`, dateLabel: `Q1 ${yr} · Jan – Mar` };
    case 'Q2': return { dateFrom: `${yr}-04-01`, dateTo: `${yr}-06-30`, dateLabel: `Q2 ${yr} · Apr – Jun` };
    case 'Q3': return { dateFrom: `${yr}-07-01`, dateTo: `${yr}-09-30`, dateLabel: `Q3 ${yr} · Jul – Sep` };
    case 'Q4': return { dateFrom: `${yr}-10-01`, dateTo: `${yr}-12-31`, dateLabel: `Q4 ${yr} · Oct – Dec` };
    case 'all': return { dateFrom: null, dateTo: null, dateLabel: 'All active' };
    case 'custom': return { dateFrom: customFrom ?? null, dateTo: customTo ?? null, dateLabel: `${customFrom} – ${customTo}` };
    default: return { dateFrom: null, dateTo: null, dateLabel: 'All active' };
  }
}

const _initialQuarter = resolvePreset('thisQuarter');

export const DEFAULT_GADGET_SETTINGS: GadgetSettings = {
  statusFilter: [],
  releaseFilter: [],
  assigneeFilter: [],
  itemTypeFilter: [],
  priorityFilter: [],
  gadgetSpecific: {},
  datePreset: 'thisQuarter',
  dateFrom: _initialQuarter.dateFrom,
  dateTo: _initialQuarter.dateTo,
  dateLabel: _initialQuarter.dateLabel,
};

const ALL_GADGET_TYPES: GadgetType[] = [
  'demand', 'release', 'incidents', 'qa',
  'items', 'overdue', 'onhold', 'workload', 'activity',
];

export function broadcastDateToAllGadgets(
  projectKey: string,
  datePreset: DatePreset,
  dateFrom: string | null,
  dateTo: string | null,
  dateLabel: string,
) {
  ALL_GADGET_TYPES.forEach((gadget) => {
    const key = `catalyst_gadget_settings_${projectKey}_${gadget}`;
    try {
      const existing = JSON.parse(localStorage.getItem(key) || '{}');
      const updated = {
        ...DEFAULT_GADGET_SETTINGS,
        ...existing,
        datePreset, dateFrom, dateTo, dateLabel,
      };
      localStorage.setItem(key, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('catalyst-gadget-settings-changed', {
        detail: { projectKey, gadget },
      }));
    } catch { /* ignore */ }
  });
}

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
    Object.keys(s.gadgetSpecific ?? {}).length === 0 &&
    (s.datePreset ?? 'thisQuarter') === 'thisQuarter'
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
