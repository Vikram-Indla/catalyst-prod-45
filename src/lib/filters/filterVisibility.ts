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
 *  context exists on the originating surface (the backlog has a project, not a product). */
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

export interface VisibilityConfig {
  is_shared: boolean;
  viewers_config: { type: FilterVisibilityScope; user_ids?: string[] };
  project_key: string | null;
  product_key: string | null;
}

/** Selected scope -> the columns written to ph_saved_filters. project_key always
 *  reflects the originating project (so the row shows on that project's board);
 *  product_key is set only when the scope is 'product'. */
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
    product_key: scope === 'product' ? (ctx.productKey ?? null) : null,
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
