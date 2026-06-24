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
  todo:     { dot: 'var(--cp-danger, #DC2626)', bg: 'var(--ds-background-danger, #FFECEB)', text: 'var(--cp-danger, #DC2626)', border: 'var(--ds-background-danger, #FFECEB)' },
  progress: { dot: 'var(--ds-link, #2563eb)', bg: 'var(--ds-background-information, #E9F2FF)', text: 'var(--ds-link, #2563eb)', border: 'var(--ds-background-information-bold, #0C66E4)' },
  done:     { dot: 'var(--quality-high, #059669)', bg: 'var(--ds-background-success, #DFFCF0)', text: 'var(--quality-high, #059669)', border: 'var(--ds-background-success, #DFFCF0)' },
};
