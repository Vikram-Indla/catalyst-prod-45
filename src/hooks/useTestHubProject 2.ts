/**
 * TestHub Project Context
 * Centralizes the default project ID resolution for TestHub pages.
 * When multi-project support is added, this hook will query the user's
 * active project from URL params or user preferences.
 */

import { useProjectContext } from '@/hooks/useProjectContext';

/** Canonical default project — exists in the projects table */
export const TESTHUB_DEFAULT_PROJECT_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Returns the active TestHub project ID.
 * Falls back to the default project when no project context is available
 * (e.g., when the URL doesn't contain a :projectId param).
 */
export function useTestHubProject(): string {
  const { projectId } = useProjectContext();
  return projectId || TESTHUB_DEFAULT_PROJECT_ID;
}
