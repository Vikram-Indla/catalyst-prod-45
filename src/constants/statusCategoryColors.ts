export const STATUS_CATEGORY_COLORS = {
  todo:        '#64748B',
  in_progress: '#2563EB',
  done:        '#16A34A',
} as const;

export type StatusCategory = keyof typeof STATUS_CATEGORY_COLORS;

export const STATUS_CATEGORY_LABELS: Record<StatusCategory, string> = {
  todo:        'To do',
  in_progress: 'In progress',
  done:        'Done',
};
