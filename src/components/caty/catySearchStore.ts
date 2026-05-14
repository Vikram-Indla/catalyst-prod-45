/**
 * catySearchStore — bridges the project-toolbar Ask Caty input (which
 * fires the AI call) and the project-list view (which displays the
 * filtered results). Both surfaces live under different parents in
 * `ProjectAllWorkView`, so a Zustand store decouples them without
 * threading callbacks through 4+ files.
 *
 * Lifecycle (single-active-search by design — we never run two Caty
 * queries in parallel within one project view):
 *
 *   start(query, projectKey, user)
 *      └─ status: 'loading'
 *      └─ POSTs /functions/v1/ai-search-issues
 *      └─ on success → status: 'ready', filter populated
 *      └─ on error   → status: 'errored', errorMessage populated
 *
 *   clear()
 *      └─ status: 'idle', no filter applied
 *
 * The view component subscribes to (status, projectKey, filter) and
 * applies the filter locally via applyCatyFilter when status === 'ready'
 * AND projectKey matches the active project (so navigating to a
 * different project doesn't leak the previous search).
 */
import { create } from 'zustand';
import { fetchFunction } from '@/integrations/supabase/functionsRouter';
import { supabase } from '@/integrations/supabase/client';

export interface CatyFilter {
  // People
  assignee_names?: string[];
  assignee_ids?: string[];
  is_unassigned?: boolean;
  reporter_names?: string[];
  reporter_ids?: string[];

  // Lifecycle
  status_names?: string[];
  status_categories?: Array<'todo' | 'in_progress' | 'done'>;
  priorities?: string[];
  types?: string[];
  is_flagged?: boolean;
  resolution_set?: boolean; // true → has a resolution, false → unresolved

  // Time windows (uses createdAt / updatedAt from WorkItem)
  created_within_days?: number;
  updated_within_days?: number;
  stale_for_days?: number; // not updated in the last N+ days

  // Hierarchy & grouping
  parent_keys?: string[];
  sprint_names?: string[];
  fix_versions?: string[];
  labels?: string[];

  // Engagement / weight
  min_comments?: number;
  story_points_min?: number;
  story_points_max?: number;

  // Free-text — checked against summary AND description
  text_contains?: string;
}

export type CatySearchStatus = 'idle' | 'loading' | 'ready' | 'errored';

interface CatySearchState {
  status: CatySearchStatus;
  projectKey: string | null;
  query: string | null;
  filter: CatyFilter | null;
  reason: string | null;
  errorMessage: string | null;
  submit: (args: {
    query: string;
    projectKey: string;
    currentUser?: { id: string; name: string } | null;
  }) => Promise<void>;
  clear: () => void;
}

export const useCatySearch = create<CatySearchState>((set, get) => ({
  status: 'idle',
  projectKey: null,
  query: null,
  filter: null,
  reason: null,
  errorMessage: null,

  submit: async ({ query, projectKey, currentUser }) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    set({
      status: 'loading',
      projectKey,
      query: trimmed,
      filter: null,
      reason: null,
      errorMessage: null,
    });
    try {
      // Forward the user's session token so the function call hits
      // RLS as the authenticated user (matches the AI-improve pattern).
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token ?? null;

      const res = await fetchFunction('ai-search-issues', {
        method: 'POST',
        accessToken,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: trimmed,
          projectKey,
          current_user: currentUser
            ? { id: currentUser.id, name: currentUser.name }
            : undefined,
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `AI search failed (${res.status})`);
      }
      const json = (await res.json()) as { filters?: CatyFilter; reason?: string };
      // Guard against race — if user cleared / fired another query while
      // this one was in flight, ignore this stale response.
      const cur = get();
      if (cur.query !== trimmed || cur.projectKey !== projectKey) return;
      set({
        status: 'ready',
        filter: json.filters ?? {},
        reason: json.reason ?? null,
        errorMessage: null,
      });
    } catch (err: unknown) {
      const cur = get();
      if (cur.query !== trimmed || cur.projectKey !== projectKey) return;
      set({
        status: 'errored',
        errorMessage:
          err instanceof Error ? err.message : 'Caty search failed',
      });
    }
  },

  clear: () => {
    set({
      status: 'idle',
      projectKey: null,
      query: null,
      filter: null,
      reason: null,
      errorMessage: null,
    });
  },
}));
