/**
 * resolveComponentConfig — single resolver for "props → runtime config → registry default".
 *
 * Authored: 2026-05-17 (PR-1 Step 5, council Outsider mandate).
 *
 * Every canonical component imports this and calls it once per render. No
 * scattered ternaries — one resolver, one precedence order, one source map
 * for the dev-mode logger.
 *
 * Resolution order (lock):
 *   1. props[flagName]    if defined and not undefined → source='prop'
 *   2. runtime?.feature_flags[flagName] if defined    → source='runtime'
 *   3. registry default                                → source='registry'
 */
import type { ComponentRegistryEntry, ComponentFeatureFlag } from './components.registry';

export interface RuntimeComponentConfig {
  active_version: string;
  feature_flags: Record<string, unknown>;
  applied_at?: string;
  applied_by?: string | null;
  notes?: string | null;
}

export type FlagSource = 'prop' | 'runtime' | 'registry';

export interface ResolvedComponentConfig {
  /** The version the runtime config pins, or the registry default. */
  activeVersion: string;
  /** Resolved flags by name. */
  flags: Record<string, unknown>;
  /** Per-flag origin — used by dev-mode logger + admin UI. */
  sources: Record<string, FlagSource>;
}

export function resolveComponentConfig(
  entry: ComponentRegistryEntry,
  runtime: RuntimeComponentConfig | undefined,
  props: Record<string, unknown>,
): ResolvedComponentConfig {
  const flags: Record<string, unknown> = {};
  const sources: Record<string, FlagSource> = {};

  const declared: ComponentFeatureFlag[] = entry.feature_flags ?? [];
  for (const flag of declared) {
    const propValue = props[flag.name];
    if (propValue !== undefined) {
      flags[flag.name] = propValue;
      sources[flag.name] = 'prop';
      continue;
    }
    if (runtime && Object.prototype.hasOwnProperty.call(runtime.feature_flags, flag.name)) {
      flags[flag.name] = runtime.feature_flags[flag.name];
      sources[flag.name] = 'runtime';
      continue;
    }
    flags[flag.name] = flag.default;
    sources[flag.name] = 'registry';
  }

  return {
    activeVersion: runtime?.active_version ?? entry.version,
    flags,
    sources,
  };
}
