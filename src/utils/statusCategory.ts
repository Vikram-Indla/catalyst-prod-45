// src/utils/statusCategory.ts — Normalizes any raw status string → 3-bucket category
// Now delegates to the shared default mapping for consistency with admin panel.
import { resolveStatusBucketStatic } from '@/hooks/useStatusMappingLookup';

export type StatusCategory = 'todo' | 'progress' | 'done';

/**
 * Maps a raw Jira status_category ("To Do", "In Progress", "Done")
 * or a raw status string to our 3-bucket model.
 * Uses the same mapping as the admin Status Mapping panel.
 */
export function getStatusCategory(statusOrCategory: string | null | undefined): StatusCategory {
  if (!statusOrCategory) return 'progress';
  return resolveStatusBucketStatic(statusOrCategory, undefined);
}

export const SC_COLORS = {
  todo:     { dot: 'var(--cp-danger)', bg: 'var(--ds-background-danger)', text: 'var(--cp-danger)', border: 'var(--ds-background-danger)' },
  progress: { dot: 'var(--ds-link)', bg: 'var(--ds-background-information)', text: 'var(--ds-link)', border: 'var(--ds-background-information-bold)' },
  done:     { dot: 'var(--quality-high)', bg: 'var(--ds-background-success)', text: 'var(--quality-high)', border: 'var(--ds-background-success)' },
};
