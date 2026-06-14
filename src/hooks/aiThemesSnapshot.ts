/**
 * aiThemesSnapshot — synchronous localStorage store for the last successful
 * AI Themes response, keyed by scope.
 *
 * Purpose: enables stale-while-revalidate on cold mount of AiThemePanel.
 * React Query's cache is in-memory only, so a fresh page load / tab switch
 * has nothing to show and falls into the blank `isLoading` takeover spinner
 * while the server cache is read asynchronously inside queryFn. Seeding the
 * query's `placeholderData` from this synchronous snapshot lets the last
 * themed cards render immediately, with a thin "Refreshing…" banner while
 * the network revalidates underneath.
 *
 * A snapshot is always considered stale, so reads flag `cached: true`.
 */
import type { ThemesResponse, UseAiThemesArgs } from '@/hooks/useAiThemes';

const PREFIX = 'for-you:ai-theme:snapshot';

export function snapshotKey(args: UseAiThemesArgs): string {
  return args.scope === 'project'
    ? `${PREFIX}:project:${args.projectKey}`
    : `${PREFIX}:personal`;
}

export function readSnapshot(args: UseAiThemesArgs): ThemesResponse | undefined {
  try {
    const raw = localStorage.getItem(snapshotKey(args));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as ThemesResponse;
    if (!Array.isArray(parsed?.themes)) return undefined;
    // A snapshot is by definition stale data — always flag it cached.
    return { ...parsed, cached: true };
  } catch {
    return undefined;
  }
}

export function writeSnapshot(args: UseAiThemesArgs, data: ThemesResponse): void {
  try {
    if (!data || !Array.isArray(data.themes)) return;
    localStorage.setItem(snapshotKey(args), JSON.stringify(data));
  } catch {
    /* quota / privacy-mode — snapshot is best-effort, never throw */
  }
}
