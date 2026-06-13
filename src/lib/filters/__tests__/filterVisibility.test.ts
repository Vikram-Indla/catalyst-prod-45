import { describe, it, expect } from 'vitest';
import {
  visibilityOptions,
  scopeToVisibility,
  visibilityToScope,
  visibilityLabel,
} from '../filterVisibility';

describe('visibilityOptions', () => {
  it('always offers private, everyone and specific; never "organisation"', () => {
    const vals = visibilityOptions({}).map(o => o.value);
    expect(vals).toEqual(['private', 'everyone', 'specific']);
    expect(JSON.stringify(visibilityOptions({}))).not.toMatch(/organi[sz]ation/i);
  });

  it('adds project only when a projectKey exists, product only when a productKey exists', () => {
    expect(visibilityOptions({ projectKey: 'BAU' }).map(o => o.value)).toEqual([
      'private', 'project', 'everyone', 'specific',
    ]);
    expect(visibilityOptions({ productKey: 'INV' }).map(o => o.value)).toEqual([
      'private', 'product', 'everyone', 'specific',
    ]);
  });
});

describe('scopeToVisibility', () => {
  it('private is not shared and carries no product_key', () => {
    const v = scopeToVisibility('private', { projectKey: 'BAU' });
    expect(v.is_shared).toBe(false);
    expect(v.viewers_config).toEqual({ type: 'private' });
    expect(v.product_key).toBeNull();
  });

  it('project is shared, keeps project_key, no product_key', () => {
    const v = scopeToVisibility('project', { projectKey: 'BAU' });
    expect(v.is_shared).toBe(true);
    expect(v.viewers_config).toEqual({ type: 'project' });
    expect(v.project_key).toBe('BAU');
    expect(v.product_key).toBeNull();
  });

  it('product sets product_key only', () => {
    const v = scopeToVisibility('product', { projectKey: 'BAU', productKey: 'INV' });
    expect(v.product_key).toBe('INV');
    expect(v.viewers_config.type).toBe('product');
  });

  it('specific carries the selected user_ids', () => {
    const v = scopeToVisibility('specific', { projectKey: 'BAU', userIds: ['u1', 'u2'] });
    expect(v.viewers_config).toEqual({ type: 'specific', user_ids: ['u1', 'u2'] });
    expect(v.is_shared).toBe(true);
  });
});

describe('visibilityToScope', () => {
  it('passes through the new scopes', () => {
    expect(visibilityToScope({ type: 'project' })).toBe('project');
    expect(visibilityToScope({ type: 'private' })).toBe('private');
  });

  it('collapses legacy org/global to everyone', () => {
    expect(visibilityToScope({ type: 'org' })).toBe('everyone');
    expect(visibilityToScope({ type: 'organization' })).toBe('everyone');
    expect(visibilityToScope({ type: 'global' })).toBe('everyone');
  });

  it('defaults unknown/null to private', () => {
    expect(visibilityToScope(null)).toBe('private');
    expect(visibilityToScope({ type: 'weird' })).toBe('private');
  });
});

describe('visibilityLabel', () => {
  it('never returns "Organisation"', () => {
    const all = (['private', 'project', 'product', 'everyone', 'specific'] as const).map(visibilityLabel);
    expect(all.join(' ')).not.toMatch(/organi[sz]ation/i);
    expect(visibilityLabel('everyone')).toBe('Everyone');
  });
});
