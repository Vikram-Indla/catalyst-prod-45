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
  todo:     { dot: '#DC2626', bg: 'rgba(248,113,113,0.10)', text: '#DC2626', border: '#FCA5A5' },
  progress: { dot: '#2563EB', bg: '#DBEAFE', text: '#2563EB', border: '#93C5FD' },
  done:     { dot: '#059669', bg: '#D1FAE5', text: '#059669', border: '#6EE7B7' },
};
