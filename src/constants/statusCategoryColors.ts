import { STATUS_CATEGORY_BG } from '@/components/catalyst-detail-views/shared/sections/statusPalette';

/**
 * Admin / category-keyed status colors. DERIVED from the canonical palette
 * (statusPalette.ts) — these are the three LOCKED colors and must never be
 * hand-edited here. To change a status color, change statusPalette.STATUS_BG
 * (and update the hard-lock test). Previously this file hardcoded
 * var(--ds-text-subtlest, #64748B)/var(--ds-link, #2563EB)/var(--ds-background-success-bold, #16A34A) which drifted from canonical — locked 2026-06-17.
 */
export const STATUS_CATEGORY_COLORS: Record<'todo' | 'in_progress' | 'done', string> = {
  todo:        STATUS_CATEGORY_BG.todo,        // var(--ds-border, #DFE1E6) gray
  in_progress: STATUS_CATEGORY_BG.in_progress, // var(--ds-background-information, #E9F2FF) blue
  done:        STATUS_CATEGORY_BG.done,         // var(--ds-background-success-bold, #6A9A23) green
};

export type StatusCategory = keyof typeof STATUS_CATEGORY_COLORS;

export const STATUS_CATEGORY_LABELS: Record<StatusCategory, string> = {
  todo:        'To do',
  in_progress: 'In progress',
  done:        'Done',
};
