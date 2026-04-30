/**
 * useAiThemes — For You → AI Theme tab data hook.
 *
 * Wraps `supabase.functions.invoke('ai-digest', { mode: 'themes', ... })`
 * (the routing branch lives in supabase/functions/ai-digest/themes.ts).
 *
 * Scope model
 * ───────────
 *   scope = 'project'  → themes for one project. projectKey is required.
 *   scope = 'personal' → themes for the user's assigned items across all
 *                        projects. projectKey is omitted.
 *
 * The project/personal toggle lives in the panel header (AiThemePanel).
 * When the user flips it we pass the new scope in and the hook keys itself
 * on (scope, projectKey) so React Query caches each toggle position
 * independently.
 *
 * Caching
 * ───────
 *   Two layers stack:
 *     • Server-side (ai_theme_cache table, 10-min TTL,
 *       signature-invalidated on (issue_key, updated_at) drift).
 *     • Client-side (React Query, staleTime 5 min, gcTime 15 min).
 *   staleTime < TTL deliberately — if the server re-runs because the input
 *   issue set changed mid-window, we want the client to pick it up without
 *   waiting out the React Query stale window.
 *
 * Force refresh
 * ─────────────
 *   `refresh()` bypasses both caches by passing forceRefresh=true to the
 *   Edge Function and invalidating the React Query key. Useful for the
 *   "Re-analyze" button in the panel header.
 *
 * Empty / not-enough-data state
 * ─────────────────────────────
 *   The Edge Function returns a typed empty response (themes: []) when
 *   fewer than 5 input issues exist — below that the LLM invents patterns.
 *   Consumers render the "not enough activity to theme yet" state when
 *   `data?.themes.length === 0 && data?.totalIssuesAnalyzed < 5`.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ── Types (mirrors supabase/functions/ai-digest/themes.ts exports) ────────
export type ThemeIntent = 'bug' | 'feature' | 'infra' | 'ux' | 'data' | 'other';

export interface Theme {
  id: string;
  name: string;
  summary: string;
  count: number;
  percentage: number;
  intent: ThemeIntent;
  issueKeys: string[];
}

export interface ThemesResponse {
  themes: Theme[];
  generatedAt: string;
  totalIssuesAnalyzed: number;
  scope: { mode: 'project' | 'personal'; projectKey?: string };
  cached: boolean;
}

export interface ThemesError {
  error: 'rate_limited' | 'credits_exhausted' | 'themes_unavailable' | 'query_failed' | 'project_key_required';
  message?: string;
}

export type UseAiThemesArgs =
  | { scope: 'personal'; projectKey?: undefined; enabled?: boolean }
  | { scope: 'project'; projectKey: string; enabled?: boolean };

const QUERY_ROOT = 'ai-themes' as const;

function buildQueryKey(args: UseAiThemesArgs) {
  return args.scope === 'project'
    ? [QUERY_ROOT, 'project', args.projectKey] as const
    : [QUERY_ROOT, 'personal'] as const;
}

async function invokeThemes(
  args: UseAiThemesArgs,
  opts: { forceRefresh: boolean },
): Promise<ThemesResponse> {
  const { data, error } = await supabase.functions.invoke<ThemesResponse | ThemesError>(
    'ai-digest',
    {
      method: 'POST',
      body: {
        mode: 'themes',
        scope: args.scope,
        projectKey: args.scope === 'project' ? args.projectKey : undefined,
        forceRefresh: opts.forceRefresh,
      },
    },
  );

  if (error) {
    // supabase-js wraps non-2xx responses into a FunctionsHttpError whose
    // .message is often opaque. Re-throw with a marker the UI can
    // pattern-match without inspecting the raw error object.
    const msg = error.message ?? 'themes_unavailable';
    throw new Error(msg);
  }

  // Edge Function may return an error shape with 2xx status (rare but
  // possible for upstream 4xx passthroughs). Treat `error` field as fatal.
  if (data && typeof data === 'object' && 'error' in data) {
    throw new Error((data as ThemesError).error ?? 'themes_unavailable');
  }

  // Defensive shape validation. If the Edge Function isn't deployed yet (or
  // is still serving the legacy digest response), `data.themes` will be
  // undefined and downstream `.length` / `.map` calls crash the tree. Throw
  // with a recognisable error so the panel renders an error state instead
  // of blowing up the whole For You page.
  if (!data || typeof data !== 'object' || !Array.isArray((data as ThemesResponse).themes)) {
    throw new Error('themes_unavailable');
  }

  return data as ThemesResponse;
}

/**
 * Compute milliseconds from `now` until the next 21:00 Asia/Riyadh (AST=UTC+3).
 * Used as React Query `staleTime` so the AI theme analyzer is fetched at most
 * once per day on the client (matches the server-side daily TTL set by
 * supabase/functions/ai-digest/themes.ts and the nightly pg_cron pre-warm).
 */
function msUntilNext9pmRiyadh(now: Date = new Date()): number {
  // 21:00 AST == 18:00 UTC.
  const target = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 18, 0, 0, 0,
  ));
  if (target.getTime() <= now.getTime()) {
    target.setUTCDate(target.getUTCDate() + 1);
  }
  return Math.max(60_000, target.getTime() - now.getTime());
}

/**
 * Primary hook — suspense-off, TanStack Query cached.
 */
export function useAiThemes(args: UseAiThemesArgs) {
  const queryClient = useQueryClient();
  const queryKey = buildQueryKey(args);
  const enabled = args.enabled ?? true;

  // Daily-refresh policy (2026-04-30): the AI theme analyzer is regenerated
  // ONCE per day at 21:00 AST by a pg_cron pre-warm. We mirror that on the
  // client so React Query never re-invokes the Edge Function within the
  // window — page loads always serve the cached result. Manual `refresh()`
  // is the only intra-day path to a fresh LLM run.
  const dailyStaleMs = msUntilNext9pmRiyadh();

  const query = useQuery<ThemesResponse, Error>({
    queryKey,
    queryFn: () => invokeThemes(args, { forceRefresh: false }),
    enabled: enabled && (args.scope === 'personal' || Boolean(args.projectKey)),
    staleTime: dailyStaleMs,
    gcTime: dailyStaleMs + 60 * 60 * 1000, // keep an hour past the boundary
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: (failureCount, err) => {
      // Never retry on rate limit or credits — they won't resolve quickly.
      const msg = err?.message ?? '';
      if (msg.includes('rate_limited') || msg.includes('credits_exhausted')) return false;
      return failureCount < 2;
    },
  });

  // Mutation-style refresh. Bypasses both server cache AND React Query.
  // We fetch fresh via the Edge Function's forceRefresh path, then write the
  // result back into the React Query cache under the same key so any
  // existing observers update immediately without a waterfall.
  const refresh = useMutation<ThemesResponse, Error>({
    mutationFn: () => invokeThemes(args, { forceRefresh: true }),
    onSuccess: (fresh) => {
      queryClient.setQueryData(queryKey, fresh);
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refresh: () => refresh.mutate(),
    isRefreshing: refresh.isPending,
    refreshError: refresh.error,
    /**
     * True when the response came back with fewer than 5 issues analysed —
     * the Edge Function's min-dataset guard. UI should render the
     * "not enough activity to theme yet" empty state.
     *
     * Defensive: if the server response is malformed and `themes` is
     * somehow missing (we also reject this earlier in invokeThemes, but
     * belt-and-suspenders), fall back to `false` so we don't crash the
     * tree trying to read `.length` off undefined.
     */
    isBelowMinimumDataset:
      query.data !== undefined &&
      Array.isArray(query.data.themes) &&
      query.data.themes.length === 0 &&
      (query.data.totalIssuesAnalyzed ?? 0) < 5,
  };
}
