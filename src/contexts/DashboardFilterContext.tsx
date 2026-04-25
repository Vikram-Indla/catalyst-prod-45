/**
 * DashboardFilterContext — Page-level filter state shared across all
 * project dashboard widgets.
 *
 * Layer 1 of the hybrid filter system: date range only.
 * Layer 2 (status / release / assignee / type / priority) lives per-gadget
 * via GadgetSettingsPanel + localStorage.
 *
 * Defaults to Q2 2026 (Apr 1 – Jun 30 2026) per spec.
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { subDays, subMonths, format } from 'date-fns';

export type DashboardPreset =
  | 'Q1' | 'Q2' | 'Q3' | 'Q4'
  | 'last30' | 'last90' | 'last12m'
  | 'all' | 'custom';

export interface DashboardFilterState {
  quarter: string;                    // e.g. "Q2-2026"
  dateFrom: string | null;            // ISO date "2026-04-01" or null = no filter
  dateTo: string | null;              // ISO date "2026-06-30" or null = no filter
  preset: DashboardPreset;
  label: string;                      // "Q2 2026 · Apr – Jun"
}

interface DashboardFilterContextValue {
  filter: DashboardFilterState;
  setFilter: (f: DashboardFilterState) => void;
}

const today = () => new Date();
const iso = (d: Date) => format(d, 'yyyy-MM-dd');

export const QUARTER_PRESETS: Record<'Q1' | 'Q2' | 'Q3' | 'Q4', Omit<DashboardFilterState, 'preset'>> = {
  Q1: { quarter: 'Q1-2026', dateFrom: '2026-01-01', dateTo: '2026-03-31', label: 'Q1 2026 · Jan – Mar' },
  Q2: { quarter: 'Q2-2026', dateFrom: '2026-04-01', dateTo: '2026-06-30', label: 'Q2 2026 · Apr – Jun' },
  Q3: { quarter: 'Q3-2026', dateFrom: '2026-07-01', dateTo: '2026-09-30', label: 'Q3 2026 · Jul – Sep' },
  Q4: { quarter: 'Q4-2026', dateFrom: '2026-10-01', dateTo: '2026-12-31', label: 'Q4 2026 · Oct – Dec' },
};

export function buildPreset(preset: DashboardPreset): DashboardFilterState {
  if (preset === 'Q1' || preset === 'Q2' || preset === 'Q3' || preset === 'Q4') {
    return { ...QUARTER_PRESETS[preset], preset };
  }
  const t = today();
  if (preset === 'last30') {
    return { quarter: '', dateFrom: iso(subDays(t, 30)), dateTo: iso(t), label: 'Last 30 days', preset };
  }
  if (preset === 'last90') {
    return { quarter: '', dateFrom: iso(subDays(t, 90)), dateTo: iso(t), label: 'Last 90 days', preset };
  }
  if (preset === 'last12m') {
    return { quarter: '', dateFrom: iso(subMonths(t, 12)), dateTo: iso(t), label: 'Last 12 months', preset };
  }
  if (preset === 'all') {
    return { quarter: '', dateFrom: null, dateTo: null, label: 'All active', preset };
  }
  // custom — caller must override dateFrom/dateTo/label
  return { quarter: '', dateFrom: iso(t), dateTo: iso(t), label: 'Custom range', preset: 'custom' };
}

const DEFAULT_FILTER: DashboardFilterState = buildPreset('Q2');

const Ctx = createContext<DashboardFilterContextValue | null>(null);

export function DashboardFilterProvider({ children }: { children: ReactNode }) {
  const [filter, setFilter] = useState<DashboardFilterState>(DEFAULT_FILTER);
  const value = useMemo(() => ({ filter, setFilter }), [filter]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDashboardFilter(): DashboardFilterContextValue {
  const v = useContext(Ctx);
  if (!v) {
    // Safe fallback so widgets used outside the dashboard route don't crash.
    return { filter: DEFAULT_FILTER, setFilter: () => {} };
  }
  return v;
}
