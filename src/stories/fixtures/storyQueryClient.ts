/**
 * Shared QueryClient for Storybook — the SAME instance used by .storybook/preview.tsx.
 *
 * Import this in any story that needs to pre-seed cache data.
 * Call seedForIssue() INSIDE the render function BEFORE returning JSX.
 *
 * WHY: useCatalystIssue has staleTime: 30_000 which overrides preview's Infinity.
 * If cache is empty at first render, the hook fires a Supabase query that fails
 * silently in Storybook. Seeding via useEffect is TOO LATE — the query fires
 * before the effect runs. Seeding synchronously in the render function works
 * because React Query checks cache BEFORE scheduling the queryFn.
 */
import { QueryClient } from '@tanstack/react-query';

// This is the SAME instance referenced by .storybook/preview.tsx.
// preview.tsx imports it and passes it to QueryClientProvider.
export const storyQueryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false, staleTime: Infinity },
  },
});

/**
 * Pre-seed all caches needed for a CatalystView* component to render
 * without hitting Supabase. Call this SYNCHRONOUSLY in render(), before
 * returning JSX.
 */
export function seedForIssue(issueKey: string, issueData: Record<string, unknown>) {
  const data = {
    id: issueData.id ?? issueKey,
    issue_key: issueKey,
    ...issueData,
    deleted_at: issueData.deleted_at ?? null,
    project_key: issueData.project_key ?? 'BAU',
    description_adf: issueData.description_adf ?? null,
  };

  storyQueryClient.setQueryData(['cv-issue-detail', issueKey], data);
  storyQueryClient.setQueryData(['cv-watchers', issueKey], []);
  storyQueryClient.setQueryData(['cv-activity', issueKey], []);
  storyQueryClient.setQueryData(['cv-comments', issueKey], []);
  storyQueryClient.setQueryData(['subtasks', issueKey], []);

  // Prevent React Query from refetching — mark data as fresh
  storyQueryClient.setQueryDefaults(['cv-issue-detail', issueKey], { staleTime: Infinity });
}
