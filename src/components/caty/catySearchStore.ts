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
  assignee_names?: string[];
  assignee_ids?: string[];
  is_unassigned?: boolean;
  status_names?: string[];
  status_categories?: Array<'todo' | 'in_progress' | 'done'>;
  priorities?: string[];
  types?: string[];
  text_contains?: string;
  created_within_days?: number;
  labels?: string[];
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
