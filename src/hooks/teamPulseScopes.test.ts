/**
 * aggregateSharedScopes — groups shared_user_scopes() rows by user.
 *
 * Contract:
 *   - Returns distinct shared user ids in first-seen order.
 *   - Returns a scopeMap: userId → SharedScope[] (deduped by type+key, order preserved).
 *   - Empty input → empty ids + empty map.
 */
import { describe, it, expect } from 'vitest';
import { aggregateSharedScopes } from './teamPulseScopes';

describe('aggregateSharedScopes', () => {
  it('returns empty ids and map for no rows', () => {
    const { ids, scopeMap } = aggregateSharedScopes([]);
    expect(ids).toEqual([]);
    expect(scopeMap.size).toBe(0);
  });

  it('groups multiple scope rows under one user', () => {
    const { ids, scopeMap } = aggregateSharedScopes([
      { shared_id: 'u1', scope_type: 'project', scope_key: 'BAU' },
      { shared_id: 'u1', scope_type: 'project', scope_key: 'INV' },
      { shared_id: 'u1', scope_type: 'product', scope_key: 'MWR' },
    ]);
    expect(ids).toEqual(['u1']);
    expect(scopeMap.get('u1')).toEqual([
      { scope_type: 'project', scope_key: 'BAU' },
      { scope_type: 'project', scope_key: 'INV' },
      { scope_type: 'product', scope_key: 'MWR' },
    ]);
  });

  it('dedupes identical type+key pairs for a user', () => {
    const { scopeMap } = aggregateSharedScopes([
      { shared_id: 'u1', scope_type: 'project', scope_key: 'BAU' },
      { shared_id: 'u1', scope_type: 'project', scope_key: 'BAU' },
    ]);
    expect(scopeMap.get('u1')).toEqual([{ scope_type: 'project', scope_key: 'BAU' }]);
  });

  it('keeps distinct users in first-seen order', () => {
    const { ids } = aggregateSharedScopes([
      { shared_id: 'u2', scope_type: 'project', scope_key: 'BAU' },
      { shared_id: 'u1', scope_type: 'product', scope_key: 'MWR' },
      { shared_id: 'u2', scope_type: 'project', scope_key: 'INV' },
    ]);
    expect(ids).toEqual(['u2', 'u1']);
  });
});
