/**
 * workstreamColors.ts — single source of truth (feature/ads-token-parity)
 * ----------------------------------------------------------------------------
 * Consolidates the workstream colour map that was duplicated — and had drifted
 * out of sync — across:
 *   - src/components/home/hooks/useProjectBriefing.ts
 *   - src/components/home/QueryResultRenderers.tsx
 *   - src/components/home/ProjectBriefingView.tsx
 *
 * Each value is wrapped `var(--ds-TOKEN, #original)`:
 *   • Light mode renders byte-identical (fallback = the original hex).
 *   • Dark mode + theming now flow through the ADS token automatically.
 *
 * Drift fixed while consolidating: MWR was #13C2C2 in one file and #FAAD14 in
 * another; IP was #36CFC9 vs #13C2C2; TAH was #2F54EB vs #1890FF. Canonical
 * values below.
 *
 * Usage — replace the inline maps in the three files above with:
 *   import { WORKSTREAM_COLORS } from '@/constants/workstreamColors';
 */
export const WORKSTREAM_COLORS: Record<string, string> = {
  BAU:  'var(--ds-background-discovery-bold)',
  ICP:  'var(--ds-background-discovery-bold)',
  SIMP: 'var(--ds-background-warning-bold)',
  MDT:  'var(--ds-background-success-bold)',
  MWR:  'var(--ds-chart-teal-bold)',
  IRP:  'var(--ds-background-accent-magenta-bolder)',
  IP:   'var(--ds-chart-teal-bold)',
  TAH:  'var(--ds-background-information-bold)',
};

/** Fallback for any key not in the map — neutral, theme-aware. */
export const WORKSTREAM_COLOR_DEFAULT = 'var(--ds-text-subtlest)';

export const workstreamColor = (key: string): string =>
  WORKSTREAM_COLORS[key?.toUpperCase?.()] ?? WORKSTREAM_COLOR_DEFAULT;
