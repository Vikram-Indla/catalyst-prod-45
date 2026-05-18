/**
 * PublishTab — apply runtime config changes for a canonical component.
 *
 * Authored: 2026-05-17 (PR-1 Step 7).
 *
 * Flow:
 *   1. Pick a canonical component from the dropdown
 *   2. See its registry default vs current runtime config (if any)
 *   3. Toggle feature flags; optionally bump the active version
 *   4. Add notes (audit trail)
 *   5. Click "Publish" → UPSERT into component_config; the DB trigger writes
 *      a history row automatically; react-query cache is invalidated so
 *      every canonical component re-renders with the new config
 *   6. Click "Reset to registry default" → DELETE the component_config row
 *
 * Council mandates honoured:
 *   - Global publish only (v2 scope; per-route v3 banner shown)
 *   - @atlaskit/* primitives only (Select, Toggle, Textfield, Button)
 *   - ADS tokens only
 *   - Outsider: rollback dry-run lives in HistoryTab, not here
 *   - Contrarian: dev-mode console log already wired in useComponentConfig
 */
import { useEffect, useMemo, useState } from 'react';
import Heading from '@atlaskit/heading';
import Select from '@atlaskit/select';
import Button from '@atlaskit/button/new';
import Toggle from '@atlaskit/toggle';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import Lozenge from '@atlaskit/lozenge';
import SectionMessage from '@atlaskit/section-message';
import { token } from '@atlaskit/tokens';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/integrations/supabase/client';
import {
  componentsRegistry,
  type ComponentRegistryEntry,
} from '@/registry/components.registry';
import {
  useAllComponentConfigs,
  COMPONENT_CONFIG_QUERY_KEY,
} from '@/registry/useComponentConfig';

interface FlagDraft {
  [name: string]: unknown;
}

function flagDefaults(entry: ComponentRegistryEntry): FlagDraft {
  const out: FlagDraft = {};
  for (const flag of entry.feature_flags ?? []) out[flag.name] = flag.default;
  return out;
}

// ─── Hub quick-select presets ─────────────────────────────────────────────────

const HUB_PRESETS: Array<{ label: string; route: string; color: string }> = [
  { label: 'Projects',  route: '/project-hub', color: '#0C66E4' },
  { label: 'Products',  route: '/product-hub',  color: '#6E5DC6' },
  { label: 'Home',      route: '/for-you',      color: '#1F845A' },
  { label: 'Incidents', route: '/incidents',    color: '#AE2A19' },
  { label: 'Admin',     route: '/admin',        color: '#626F86' },
  { label: 'Global (all routes)', route: '', color: '#44546F' },
];

// ─── PublishTab ───────────────────────────────────────────────────────────────

export interface PublishTabProps {
  /**
   * Pre-filled draft set by "Publish to [Hub] tab →" in HubBreakdownPanel.
   * When non-null, the tab switches its form to match componentId + route.
   */
  initialDraft?: { componentId: string; route: string } | null;
  /** Called after the draft has been consumed so the parent can clear it. */
  onDraftConsumed?: () => void;
}

export default function PublishTab({ initialDraft, onDraftConsumed }: PublishTabProps) {
  const queryClient = useQueryClient();
  const { data: configs, isLoading } = useAllComponentConfigs();

  const auditable = useMemo(
    () => componentsRegistry.filter(e => e.status === 'canonical'),
    [],
  );
  const [selectedId, setSelectedId] = useState<string>(auditable[0]?.id ?? '');
  const [routeDraft, setRouteDraft] = useState<string>('');
  const entry = auditable.find(e => e.id === selectedId);
  // v3: configs is keyed by (component_id → route → config). Drill in by
  // the route the admin is editing right now (defaults to '' = global).
  const liveConfig = entry ? configs?.[entry.id]?.[routeDraft] : undefined;

  const [versionDraft, setVersionDraft] = useState('');
  const [flagsDraft, setFlagsDraft] = useState<FlagDraft>({});
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Sync local draft state when selection, route, or live config changes.
  // The route is part of the dependency tuple because switching from
  // "Global" to "/backlog" should reload the form against the new row.
  useEffect(() => {
    if (!entry) return;
    setVersionDraft(liveConfig?.active_version ?? entry.version);
    setFlagsDraft({ ...flagDefaults(entry), ...(liveConfig?.feature_flags ?? {}) });
    setNotes('');
  }, [entry?.id, routeDraft, liveConfig?.applied_at]); // eslint-disable-line react-hooks/exhaustive-deps

  // Consume an initialDraft injected by "Publish to [Hub] tab →" in HubBreakdownPanel.
  // Runs whenever the parent passes a fresh draft object; calls onDraftConsumed so
  // the parent can null it out and avoid re-triggering on subsequent renders.
  useEffect(() => {
    if (!initialDraft) return;
    const match = auditable.find(e => e.id === initialDraft.componentId);
    if (match) setSelectedId(match.id);
    setRouteDraft(initialDraft.route);
    setRouteIsCustom(false);
    onDraftConsumed?.();
  }, [initialDraft]); // eslint-disable-line react-hooks/exhaustive-deps

  const componentOptions = auditable.map(e => ({
    label: `${e.name} (registry v${e.version})`,
    value: e.id,
  }));

  /**
   * Curated route options. Substring matches against `window.location.pathname`
   * at runtime — `'/backlog'` matches `/project-hub/BAU/backlog`,
   * `/project-hub/INV/backlog/BAU-5717`, etc. Empty string is the global
   * fallback. "Custom..." switches the picker to a free-text Textfield.
   */
  const PREDEFINED_ROUTES: Array<{ label: string; value: string }> = [
    { label: 'Global (all routes)', value: '' },
    { label: '/backlog (all project backlogs)', value: '/backlog' },
    { label: '/allwork (all-work tables)', value: '/allwork' },
    { label: '/board (kanban boards)', value: '/board' },
    { label: '/dashboard (project dashboards)', value: '/dashboard' },
    { label: '/for-you (For You home)', value: '/for-you' },
    { label: '/incidents (incident list)', value: '/incidents' },
    { label: '/admin/ (admin pages)', value: '/admin/' },
    { label: '/project-hub/ (any project)', value: '/project-hub/' },
  ];
  const routeIsPredefined = PREDEFINED_ROUTES.some(r => r.value === routeDraft);
  const [routeIsCustom, setRouteIsCustom] = useState(false);

  // Surface ALL existing route scopes for the selected component so an
  // admin can quickly jump back to one that's already published, even if
  // it's not in the predefined list above.
  const existingRoutesForEntry = entry ? Object.keys(configs?.[entry.id] ?? {}) : [];
  const existingRouteOptions = existingRoutesForEntry
    .filter(r => !PREDEFINED_ROUTES.some(p => p.value === r))
    .map(r => ({ label: `${r} (published)`, value: r }));

  const routeOptions = [
    ...PREDEFINED_ROUTES,
    ...existingRouteOptions,
    { label: 'Custom…', value: '__custom__' },
  ];

  function toggleFlag(name: string, value: boolean) {
    setFlagsDraft(prev => ({ ...prev, [name]: value }));
  }

  function routeLabel(route: string): string {
    if (route === '') return 'global';
    return route;
  }

  async function publish() {
    if (!entry) return;
    setSubmitting(true);
    try {
      const { error } = await (supabase as any)
        .from('component_config')
        .upsert(
          {
            component_id: entry.id,
            route: routeDraft,
            active_version: versionDraft || entry.version,
            feature_flags: flagsDraft,
            applied_at: new Date().toISOString(),
            notes: notes || null,
          },
          { onConflict: 'component_id,route' },
        );
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: COMPONENT_CONFIG_QUERY_KEY });
      toast.success(
        `Published ${entry.name} v${versionDraft || entry.version} (${routeLabel(routeDraft)})`,
      );
      setNotes('');
    } catch (e: unknown) {
      toast.error(`Publish failed: ${(e as Error).message ?? 'unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function reset() {
    if (!entry) return;
    setSubmitting(true);
    try {
      // v3: reset only the route the admin is currently editing. Other route
      // scopes for this component stay published. To wipe every scope, the
      // admin resets each one in turn.
      const { error } = await (supabase as any)
        .from('component_config')
        .delete()
        .eq('component_id', entry.id)
        .eq('route', routeDraft);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: COMPONENT_CONFIG_QUERY_KEY });
      toast.success(`Reset ${entry.name} (${routeLabel(routeDraft)}) to registry default`);
    } catch (e: unknown) {
      toast.error(`Reset failed: ${(e as Error).message ?? 'unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        marginTop: token('space.200', '16px'),
        display: 'flex',
        flexDirection: 'column',
        gap: token('space.200', '16px'),
      }}
    >
      <div>
        <Heading size="medium">Publish</Heading>
        <p
          style={{
            marginTop: token('space.075', '6px'),
            marginBottom: 0,
            fontSize: 13,
            color: token('color.text.subtle', 'var(--cp-text-secondary, var(--cp-text-secondary, #44546F))'),
            maxWidth: 760,
          }}
        >
          Apply a new active version or feature-flag override to a canonical
          component. The change propagates to every consumer that reads via
          <code> useComponentConfig() </code> on next render. Use the Reset
          button to fall back to the registry default. Every action is
          auditable in the History tab.
        </p>
      </div>

      <SectionMessage appearance="information" title="Per-route scoping (v3)">
        Routes are substring patterns matched against{' '}
        <code>window.location.pathname</code> at runtime. Empty (Global) is the
        fallback when no specific route matches. The longest matching route
        wins per (component, pathname). For example, publishing on{' '}
        <code>/backlog</code> applies to every backlog under{' '}
        <code>/project-hub/*/backlog</code> but leaves <code>/allwork</code>{' '}
        untouched.
      </SectionMessage>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '320px 1fr',
          gap: token('space.300', '24px'),
          alignItems: 'start',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: token('space.200', '16px') }}>
          <div>
            <label
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: token('color.text.subtle', 'var(--cp-text-secondary, var(--cp-text-secondary, #44546F))'),
                display: 'block',
                marginBottom: token('space.075', '6px'),
              }}
            >
              Component
            </label>
            <Select
              inputId="publish-component-picker"
              options={componentOptions}
              value={componentOptions.find(o => o.value === selectedId) ?? null}
              onChange={opt => opt && setSelectedId((opt as { value: string }).value)}
              isDisabled={submitting}
            />
          </div>

          {/* ── Hub quick-select ────────────────────────────────────────── */}
          <div>
            <label
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: token('color.text.subtle', '#44546F'),
                display: 'block',
                marginBottom: token('space.075', '6px'),
              }}
            >
              Hub target
            </label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {HUB_PRESETS.map(hub => {
                const isActive = routeDraft === hub.route && !routeIsCustom;
                return (
                  <button
                    key={hub.route || '__global__'}
                    onClick={() => { setRouteDraft(hub.route); setRouteIsCustom(false); }}
                    disabled={submitting}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 3,
                      background: isActive ? hub.color : `${hub.color}22`,
                      color: isActive ? '#fff' : hub.color,
                      border: 'none',
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {hub.label}
                  </button>
                );
              })}
            </div>
            <div
              style={{
                marginTop: token('space.050', '4px'),
                fontSize: 11,
                color: token('color.text.subtle', '#44546F'),
              }}
            >
              Click a hub to pre-fill the route scope below. Or use the
              route picker for a more specific path.
            </div>
          </div>

          <div>
            <label
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: token('color.text.subtle', 'var(--cp-text-secondary, var(--cp-text-secondary, #44546F))'),
                display: 'block',
                marginBottom: token('space.075', '6px'),
              }}
            >
              Route scope
            </label>
            {routeIsCustom || (!routeIsPredefined && routeDraft !== '') ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: token('space.075', '6px') }}>
                <Textfield
                  value={routeDraft}
                  onChange={e => setRouteDraft((e.target as HTMLInputElement).value)}
                  placeholder="/your/path or empty for global"
                  isDisabled={submitting}
                />
                <Button
                  appearance="subtle"
                  spacing="compact"
                  onClick={() => {
                    setRouteIsCustom(false);
                    setRouteDraft('');
                  }}
                  isDisabled={submitting}
                >
                  Back to predefined routes
                </Button>
              </div>
            ) : (
              <Select
                inputId="publish-route-picker"
                options={routeOptions}
                value={routeOptions.find(o => o.value === routeDraft) ?? routeOptions[0]}
                onChange={opt => {
                  const v = (opt as { value: string } | null)?.value ?? '';
                  if (v === '__custom__') {
                    setRouteIsCustom(true);
                    setRouteDraft('');
                  } else {
                    setRouteIsCustom(false);
                    setRouteDraft(v);
                  }
                }}
                isDisabled={submitting}
              />
            )}
            <div
              style={{
                marginTop: token('space.050', '4px'),
                fontSize: 11,
                color: token('color.text.subtle', 'var(--cp-text-secondary, var(--cp-text-secondary, #44546F))'),
              }}
            >
              {routeDraft === ''
                ? 'Global — applies whenever no more-specific route matches.'
                : `Applies whenever pathname contains "${routeDraft}".`}
            </div>
          </div>
        </div>

        {entry && (
          <div
            style={{
              border: `1px solid ${token('color.border', '#DCDFE4')}`,
              borderRadius: 6,
              padding: token('space.200', '16px'),
              background: token('elevation.surface', '#FFFFFF'),
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: token('space.150', '12px'), flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, fontSize: 16 }}>{entry.name}</span>
              <Lozenge appearance={routeDraft === '' ? 'default' : 'inprogress'}>
                {routeDraft === '' ? 'Global scope' : `Scope: ${routeDraft}`}
              </Lozenge>
              {liveConfig ? (
                <Lozenge appearance="success">
                  Published v{liveConfig.active_version}
                </Lozenge>
              ) : (
                <Lozenge>Registry default</Lozenge>
              )}
              <span style={{ fontSize: 12, color: token('color.text.subtle', 'var(--cp-text-secondary, var(--cp-text-secondary, #44546F))') }}>
                {liveConfig?.applied_at
                  ? `Applied ${new Date(liveConfig.applied_at).toLocaleString()}`
                  : 'No runtime override at this scope'}
              </span>
            </div>

            <div style={{ marginTop: token('space.200', '16px') }}>
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: token('color.text.subtle', 'var(--cp-text-secondary, var(--cp-text-secondary, #44546F))'),
                  display: 'block',
                  marginBottom: token('space.075', '6px'),
                }}
              >
                Active version
              </label>
              <Textfield
                value={versionDraft}
                onChange={e => setVersionDraft((e.target as HTMLInputElement).value)}
                placeholder={entry.version}
                isDisabled={submitting || isLoading}
              />
              <div style={{ marginTop: token('space.050', '4px'), fontSize: 11, color: token('color.text.subtle', 'var(--cp-text-secondary, var(--cp-text-secondary, #44546F))') }}>
                Semver string. Registry default: v{entry.version}.
              </div>
            </div>

            {entry.feature_flags && entry.feature_flags.length > 0 ? (
              <div style={{ marginTop: token('space.300', '24px') }}>
                <Heading size="xsmall">Feature flag overrides</Heading>
                <div
                  style={{
                    marginTop: token('space.100', '8px'),
                    display: 'flex',
                    flexDirection: 'column',
                    gap: token('space.100', '8px'),
                  }}
                >
                  {entry.feature_flags.map(flag => {
                    const current = flagsDraft[flag.name];
                    const isBoolean = typeof flag.default === 'boolean';
                    const overridden = liveConfig
                      ? Object.prototype.hasOwnProperty.call(liveConfig.feature_flags, flag.name)
                      : false;
                    return (
                      <div
                        key={flag.name}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '180px 80px 1fr',
                          alignItems: 'center',
                          gap: token('space.150', '12px'),
                          padding: '8px 12px',
                          border: `1px solid ${token('color.border', '#DCDFE4')}`,
                          borderRadius: 4,
                          background: overridden
                            ? token('color.background.information', '#E9F2FF')
                            : token('color.background.neutral.subtle', '#F7F8F9'),
                        }}
                      >
                        <span
                          style={{
                            fontFamily: 'ui-monospace, SFMono-Regular, "Menlo", "Roboto Mono", monospace',
                            fontSize: 12,
                            color: token('color.text', 'var(--cp-text-primary, var(--cp-text-inverse, #172B4D))'),
                          }}
                        >
                          {flag.name}
                        </span>
                        {isBoolean ? (
                          <Toggle
                            isChecked={Boolean(current)}
                            onChange={e => toggleFlag(flag.name, (e.target as HTMLInputElement).checked)}
                            isDisabled={submitting}
                          />
                        ) : (
                          <Textfield
                            value={String(current ?? '')}
                            onChange={e =>
                              setFlagsDraft(prev => ({
                                ...prev,
                                [flag.name]: (e.target as HTMLInputElement).value,
                              }))
                            }
                            isDisabled={submitting}
                          />
                        )}
                        <span style={{ fontSize: 12, color: token('color.text.subtle', 'var(--cp-text-secondary, var(--cp-text-secondary, #44546F))') }}>
                          {flag.description} (default: <code>{String(flag.default)}</code>)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div
                style={{
                  marginTop: token('space.200', '16px'),
                  padding: token('space.150', '12px'),
                  borderRadius: 4,
                  background: token('color.background.neutral.subtle', '#F7F8F9'),
                  color: token('color.text.subtle', 'var(--cp-text-secondary, var(--cp-text-secondary, #44546F))'),
                  fontSize: 13,
                }}
              >
                This component does not declare any feature flags. You can still publish a version pin.
              </div>
            )}

            <div style={{ marginTop: token('space.300', '24px') }}>
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: token('color.text.subtle', 'var(--cp-text-secondary, var(--cp-text-secondary, #44546F))'),
                  display: 'block',
                  marginBottom: token('space.075', '6px'),
                }}
              >
                Notes (audit trail)
              </label>
              <TextArea
                value={notes}
                onChange={e => setNotes((e.target as HTMLTextAreaElement).value)}
                minimumRows={2}
                placeholder="Why are we publishing this? Linked Jira issue, intent, rollout plan..."
                isDisabled={submitting}
              />
            </div>

            <div
              style={{
                marginTop: token('space.300', '24px'),
                display: 'flex',
                gap: token('space.100', '8px'),
              }}
            >
              <Button
                appearance="primary"
                onClick={publish}
                isDisabled={submitting || isLoading || !versionDraft}
              >
                Publish v{versionDraft || entry.version} ({routeLabel(routeDraft)})
              </Button>
              <Button
                appearance="warning"
                onClick={reset}
                isDisabled={submitting || !liveConfig}
              >
                Reset {routeLabel(routeDraft)} to registry default
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
