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

export default function PublishTab() {
  const queryClient = useQueryClient();
  const { data: configs, isLoading } = useAllComponentConfigs();

  const auditable = useMemo(
    () => componentsRegistry.filter(e => e.status === 'canonical'),
    [],
  );
  const [selectedId, setSelectedId] = useState<string>(auditable[0]?.id ?? '');
  const entry = auditable.find(e => e.id === selectedId);
  const liveConfig = entry ? configs?.[entry.id] : undefined;

  const [versionDraft, setVersionDraft] = useState('');
  const [flagsDraft, setFlagsDraft] = useState<FlagDraft>({});
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Sync local draft state when selection or live config changes.
  useEffect(() => {
    if (!entry) return;
    setVersionDraft(liveConfig?.active_version ?? entry.version);
    setFlagsDraft({ ...flagDefaults(entry), ...(liveConfig?.feature_flags ?? {}) });
    setNotes('');
  }, [entry?.id, liveConfig?.applied_at]); // eslint-disable-line react-hooks/exhaustive-deps

  const componentOptions = auditable.map(e => ({
    label: `${e.name} (registry v${e.version})`,
    value: e.id,
  }));

  function toggleFlag(name: string, value: boolean) {
    setFlagsDraft(prev => ({ ...prev, [name]: value }));
  }

  async function publish() {
    if (!entry) return;
    setSubmitting(true);
    try {
      const { error } = await (supabase as any)
        .from('component_config')
        .upsert({
          component_id: entry.id,
          active_version: versionDraft || entry.version,
          feature_flags: flagsDraft,
          applied_at: new Date().toISOString(),
          notes: notes || null,
        });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: COMPONENT_CONFIG_QUERY_KEY });
      toast.success(`Published ${entry.name} v${versionDraft || entry.version}`);
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
      const { error } = await (supabase as any)
        .from('component_config')
        .delete()
        .eq('component_id', entry.id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: COMPONENT_CONFIG_QUERY_KEY });
      toast.success(`Reset ${entry.name} to registry default`);
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
            color: token('color.text.subtle', '#44546F'),
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

      <SectionMessage appearance="information" title="Global publish only in v2">
        Per-route scoping ("enable on /backlog but not /allwork") is on the v3
        roadmap. Today every published change applies platform-wide.
      </SectionMessage>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '320px 1fr',
          gap: token('space.300', '24px'),
          alignItems: 'start',
        }}
      >
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
              {liveConfig ? (
                <Lozenge appearance="inprogress">
                  Published v{liveConfig.active_version}
                </Lozenge>
              ) : (
                <Lozenge>Registry default</Lozenge>
              )}
              <span style={{ fontSize: 12, color: token('color.text.subtle', '#44546F') }}>
                {liveConfig?.applied_at
                  ? `Applied ${new Date(liveConfig.applied_at).toLocaleString()}`
                  : 'No runtime override active'}
              </span>
            </div>

            <div style={{ marginTop: token('space.200', '16px') }}>
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
                Active version
              </label>
              <Textfield
                value={versionDraft}
                onChange={e => setVersionDraft((e.target as HTMLInputElement).value)}
                placeholder={entry.version}
                isDisabled={submitting || isLoading}
              />
              <div style={{ marginTop: token('space.050', '4px'), fontSize: 11, color: token('color.text.subtle', '#44546F') }}>
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
                            color: token('color.text', '#172B4D'),
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
                        <span style={{ fontSize: 12, color: token('color.text.subtle', '#44546F') }}>
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
                  color: token('color.text.subtle', '#44546F'),
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
                  color: token('color.text.subtle', '#44546F'),
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
                Publish v{versionDraft || entry.version}
              </Button>
              <Button
                appearance="warning"
                onClick={reset}
                isDisabled={submitting || !liveConfig}
              >
                Reset to registry default
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
