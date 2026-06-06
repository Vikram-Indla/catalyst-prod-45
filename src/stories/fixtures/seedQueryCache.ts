/**
 * Storybook utility — seeds the QueryClient cache so real production
 * components render without hitting Supabase.
 *
 * Usage in a story:
 *   import { seedIssueCache } from '../fixtures/seedQueryCache';
 *   import { ISSUES } from '../fixtures/production-data';
 *
 *   // In a decorator or render function:
 *   seedIssueCache(queryClient, 'BAU-5972', ISSUES.qaBug);
 */
import type { QueryClient } from '@tanstack/react-query';

/**
 * Seed the cv-issue-detail cache so CatalystViewStory / useCatalystIssue
 * finds data immediately without a Supabase fetch.
 */
export function seedIssueCache(
  qc: QueryClient,
  issueKey: string,
  data: Record<string, unknown>,
) {
  qc.setQueryData(['cv-issue-detail', issueKey], {
    id: data.id ?? issueKey,
    issue_key: issueKey,
    ...data,
    // Ensure required fields have defaults
    deleted_at: data.deleted_at ?? null,
    project_key: data.project_key ?? 'BAU',
    description_adf: data.description_adf ?? null,
  });
}

/**
 * Seed watchers cache (WatchersChip reads from this).
 */
export function seedWatchersCache(
  qc: QueryClient,
  issueKey: string,
  watchers: Array<{ user_id: string; display_name: string }> = [],
) {
  qc.setQueryData(['cv-watchers', issueKey], watchers);
}

/**
 * Seed activity cache (CatalystActivitySection reads from this).
 */
export function seedActivityCache(
  qc: QueryClient,
  itemId: string,
  activities: Array<Record<string, unknown>> = [],
) {
  qc.setQueryData(['cv-activity', itemId], activities);
}

/**
 * Seed comments cache (CommentsSection reads from this).
 */
export function seedCommentsCache(
  qc: QueryClient,
  itemId: string,
  comments: Array<Record<string, unknown>> = [],
) {
  qc.setQueryData(['cv-comments', itemId], comments);
}

/**
 * Seed subtasks cache (SubtasksPanel reads from this).
 */
export function seedSubtasksCache(
  qc: QueryClient,
  parentKey: string,
  subtasks: Array<Record<string, unknown>> = [],
) {
  qc.setQueryData(['subtasks', parentKey], subtasks);
}
