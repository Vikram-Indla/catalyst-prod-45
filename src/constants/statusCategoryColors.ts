import { STATUS_CATEGORY_BG } from '@/components/catalyst-detail-views/shared/sections/statusPalette';

/**
 * Admin / category-keyed status colors. DERIVED from the canonical palette
 * (statusPalette.ts) — these are the three LOCKED colors and must never be
 * hand-edited here. To change a status color, change statusPalette.STATUS_BG
 * (and update the hard-lock test). Previously this file hardcoded
 * #64748B/#2563EB/#16A34A which drifted from canonical — locked 2026-06-17.
 */
export const STATUS_CATEGORY_COLORS: Record<'todo' | 'in_progress' | 'done', string> = {
  todo:        STATUS_CATEGORY_BG.todo,        // #DDDEE1 gray
  in_progress: STATUS_CATEGORY_BG.in_progress, // #8FB8F6 blue
  done:        STATUS_CATEGORY_BG.done,         // #94C748 green
};

export type StatusCategory = keyof typeof STATUS_CATEGORY_COLORS;

export const STATUS_CATEGORY_LABELS: Record<StatusCategory, string> = {
  todo:        'To do',
  in_progress: 'In progress',
  done:        'Done',
};
