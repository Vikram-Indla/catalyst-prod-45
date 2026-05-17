/**
 * resolveComponentConfig contract test (PR-1 Step 4).
 *
 * Resolution order (locked by council, Outsider advisor):
 *   1. Caller-supplied props (highest precedence — explicit consumer intent)
 *   2. Active runtime config from useComponentConfig() (the publish)
 *   3. Registry default (the canonical fallback)
 *
 * The helper is pure — no hook, no react-query. The hook wraps this with
 * the live config fetch.
 */
import { describe, it, expect } from 'vitest';

import {
  resolveComponentConfig,
  type RuntimeComponentConfig,
} from '@/registry/resolveComponentConfig';
import type { ComponentRegistryEntry } from '@/registry/components.registry';

const REGISTRY_ENTRY: ComponentRegistryEntry = {
  id: 'jira-table',
  name: 'JiraTable',
  category: 'organism',
  origin: 'shared',
  status: 'canonical',
  version: '1.4.0',
  feature_flags: [
    { name: 'enableGroupCreateButton', default: false, description: 'x' },
    { name: 'enableStickyCreateFooter', default: false, description: 'x' },
    { name: 'enableBulkSelect', default: true, description: 'x' },
  ],
};

describe('resolveComponentConfig', () => {
  it('falls back to registry defaults when no runtime config + no props', () => {
    const result = resolveComponentConfig(REGISTRY_ENTRY, undefined, {});
    expect(result.activeVersion).toBe('1.4.0');
    expect(result.flags.enableGroupCreateButton).toBe(false);
    expect(result.flags.enableStickyCreateFooter).toBe(false);
    expect(result.flags.enableBulkSelect).toBe(true);
  });

  it('runtime config overrides registry defaults', () => {
    const runtime: RuntimeComponentConfig = {
      active_version: '1.4.0',
      feature_flags: { enableStickyCreateFooter: true },
    };
    const result = resolveComponentConfig(REGISTRY_ENTRY, runtime, {});
    expect(result.flags.enableStickyCreateFooter).toBe(true);
    expect(result.flags.enableBulkSelect).toBe(true); // untouched
  });

  it('caller props override both runtime and registry', () => {
    const runtime: RuntimeComponentConfig = {
      active_version: '1.4.0',
      feature_flags: { enableStickyCreateFooter: true },
    };
    const result = resolveComponentConfig(REGISTRY_ENTRY, runtime, {
      enableStickyCreateFooter: false, // caller wins
    });
    expect(result.flags.enableStickyCreateFooter).toBe(false);
  });

  it('exposes the activeVersion from runtime when available', () => {
    const runtime: RuntimeComponentConfig = {
      active_version: '2.0.0',
      feature_flags: {},
    };
    const result = resolveComponentConfig(REGISTRY_ENTRY, runtime, {});
    expect(result.activeVersion).toBe('2.0.0');
  });

  it('ignores undefined caller props (does not stomp on runtime config)', () => {
    const runtime: RuntimeComponentConfig = {
      active_version: '1.4.0',
      feature_flags: { enableStickyCreateFooter: true },
    };
    const result = resolveComponentConfig(REGISTRY_ENTRY, runtime, {
      enableStickyCreateFooter: undefined as unknown as boolean,
    });
    expect(result.flags.enableStickyCreateFooter).toBe(true);
  });

  it('returns source map showing where each flag was resolved from', () => {
    const runtime: RuntimeComponentConfig = {
      active_version: '1.4.0',
      feature_flags: { enableStickyCreateFooter: true },
    };
    const result = resolveComponentConfig(REGISTRY_ENTRY, runtime, {
      enableGroupCreateButton: true,
    });
    expect(result.sources.enableGroupCreateButton).toBe('prop');
    expect(result.sources.enableStickyCreateFooter).toBe('runtime');
    expect(result.sources.enableBulkSelect).toBe('registry');
  });
});
