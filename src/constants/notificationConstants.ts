export const COMMENT_PREVIEW_TYPES = [
  'mentioned_in_comment',
  'commented_on_work_item',
  'commented',
] as const;

export const DUE_DATE_TYPES = ['due_date_approaching'] as const;

export const SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000';
export const PANEL_WIDTH = 540;
export const TOAST_WIDTH = 360;
export const TOAST_DISMISS_HIGH_MS = 6000;   // assignments, mentions
export const TOAST_DISMISS_LOW_MS = 4000;    // status updates
export const BADGE_DEBOUNCE_MS = 300;
export const DRAWER_WIDTH = 560;             // Catalyst standard drawer
export const AGGREGATION_WINDOW_MS = 30 * 60 * 1000;
export const NOTIFICATIONS_PER_PAGE = 20;
export const COMMENT_PREVIEW_MAX_CHARS = 200;
