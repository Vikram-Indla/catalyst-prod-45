export type SharedScopeType = 'project' | 'product';

export interface SharedScope {
  scope_type: SharedScopeType;
  scope_key: string;
}

export interface SharedScopeRow {
  shared_id: string;
  scope_type: string;
  scope_key: string;
}

/**
 * Groups shared_user_scopes() rows by user.
 * Returns distinct ids in first-seen order and a per-user, deduped scope list.
 */
export function aggregateSharedScopes(rows: SharedScopeRow[]): {
  ids: string[];
  scopeMap: Map<string, SharedScope[]>;
} {
  const ids: string[] = [];
  const scopeMap = new Map<string, SharedScope[]>();
  const seen = new Set<string>();

  for (const row of rows) {
    if (!scopeMap.has(row.shared_id)) {
      scopeMap.set(row.shared_id, []);
      ids.push(row.shared_id);
    }
    const dedupeKey = `${row.shared_id}|${row.scope_type}|${row.scope_key}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    scopeMap.get(row.shared_id)!.push({
      scope_type: row.scope_type as SharedScopeType,
      scope_key: row.scope_key,
    });
  }

  return { ids, scopeMap };
}
