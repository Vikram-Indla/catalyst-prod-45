/**
 * Filter visibility scopes (Vikram-approved 2026-06-12).
 *
 * Replaces the meaningless "Organisation" option. Scopes now map to the RLS
 * enforcement added in migration 20260612130000:
 *   private  -> owner/creator only
 *   project  -> members of project_key (ph_project_members)
 *   product  -> members of product_key (product_members)
 *   everyone -> all authenticated  (was: is_shared = true)
 *   specific -> users in viewers_config.user_ids
 *
 * Pure + framework-free so it is unit-testable without Supabase or React.
 */
export type FilterVisibilityScope = 'private' | 'project' | 'product' | 'everyone' | 'specific';

export interface VisibilityOption {
  value: FilterVisibilityScope;
  label: string;
}

/** Options for the @atlaskit/select. Project/Product appear only when that
 *  context exists on the originating surface (the backlog has a project, not a product).
 *  2026-06-17: Tasks hub uses projectKey='TASKS' sentinel so the standard
 *  project visibility branch covers it — same shape as incident hub
 *  ('INCIDENTS' sentinel). The label is the sentinel itself; admins can
 *  alias it in the UI if desired. */
export function visibilityOptions(ctx: {
  projectKey?: string | null;
  productKey?: string | null;
}): VisibilityOption[] {
  const out: VisibilityOption[] = [{ value: 'private', label: 'Private — only you' }];
  if (ctx.projectKey) out.push({ value: 'project', label: `Project — ${ctx.projectKey} members` });
  if (ctx.productKey) out.push({ value: 'product', label: `Product — ${ctx.productKey} members` });
  out.push({ value: 'everyone', label: 'Everyone — view all' });
  out.push({ value: 'specific', label: 'Specific people…' });
  return out;
}

/** 2026-06-17: hub type recognized by the filters subsystem. Tasks added
 *  alongside project/product/incident so downstream code (sidebar, lists,
 *  saved-filter scoping) can branch consistently. */
export type FilterHubType = 'project' | 'product' | 'incident' | 'tasks';

/** Map a FilterHubType to its sentinel projectKey when no real project key
 *  exists in the URL (incident, tasks hubs). project/product hubs return the
 *  passed-through key. */
export function hubTypeToProjectKey(
  hubType: FilterHubType,
  routeKey: string | undefined,
): string | undefined {
  if (hubType === 'incident') return 'INCIDENTS';
  if (hubType === 'tasks') return 'TASKS';
  return routeKey;
}

export interface VisibilityConfig {
  is_shared: boolean;
  viewers_config: { type: FilterVisibilityScope; user_ids?: string[] };
  project_key: string | null;
  product_key: string | null;
}

/** Selected scope -> the columns written to ph_saved_filters.
 *  project_key / product_key reflect the ORIGINATING hub and are independent
 *  of the visibility scope — a private filter created on /product-hub/INV
 *  still belongs to INV, just with viewers_config={private}. This split
 *  matches Vikram's directive (2026-06-16) that each hub shows only its own
 *  filters; mixing hub identity with visibility produced orphaned filters
 *  (both keys null) when the creator picked Private/Everyone visibility. */
export function scopeToVisibility(
  scope: FilterVisibilityScope,
  ctx: { projectKey?: string | null; productKey?: string | null; userIds?: string[] },
): VisibilityConfig {
  return {
    is_shared: scope !== 'private',
    viewers_config:
      scope === 'specific'
        ? { type: 'specific', user_ids: ctx.userIds ?? [] }
        : { type: scope },
    project_key: ctx.projectKey ?? null,
    product_key: ctx.productKey ?? null,
  };
}

/** Existing row -> scope, for seeding the editor. Legacy/Jira share vocabularies
 *  ('org', 'organization', 'global', …) collapse to 'everyone'. */
export function visibilityToScope(viewers_config?: { type?: string | null } | null): FilterVisibilityScope {
  const t = viewers_config?.type;
  if (t === 'private' || t === 'project' || t === 'product' || t === 'everyone' || t === 'specific') {
    return t;
  }
  if (t === 'org' || t === 'organization' || t === 'global' || t === 'loggedin' || t === 'authenticated') {
    return 'everyone';
  }
  return 'private';
}

/** Short label for list/detail surfaces. */
export function visibilityLabel(scope: FilterVisibilityScope): string {
  switch (scope) {
    case 'private':
      return 'Private';
    case 'project':
      return 'Project members';
    case 'product':
      return 'Product members';
    case 'everyone':
      return 'Everyone';
    case 'specific':
      return 'Specific people';
  }
}
