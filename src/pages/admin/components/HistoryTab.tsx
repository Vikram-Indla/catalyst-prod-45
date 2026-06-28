/**
 * HistoryTab — audit log + rollback for component_config.
 *
 * Authored: 2026-05-17 (PR-1 Step 9).
 *
 * Reads from component_config_history (auto-populated by the trigger on
 * component_config writes). Each row exposes a Rollback action that opens
 * a dry-run modal showing the diff between the current active config and
 * the historical row about to be restored.
 *
 * Mandates honoured:
 *   - Outsider: dry-run diff before rollback ("turn off X for Y consumers")
 *   - First Principles: rollback = UPSERT component_config back to a
 *     historical row; the trigger writes a new history row with action='rollback'
 *   - @atlaskit/* primitives only (Lozenge, Button, Modal, Select for filter)
 *   - ADS tokens only
 */
import { useMemo, useState } from 'react';
import Heading from '@atlaskit/heading';
import Button from '@atlaskit/button/new';
import Lozenge from '@atlaskit/lozenge';
import Select from '@atlaskit/select';
import Modal, {
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
  ModalTransition,
} from '@atlaskit/modal-dialog';
import { token } from '@atlaskit/tokens';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { catalystToast } from '@/lib/catalystToast';

import { supabase } from '@/integrations/supabase/client';
import {
  componentsRegistry,
  getComponentById,
} from '@/registry/components.registry';
import {
  useAllComponentConfigs,
  COMPONENT_CONFIG_QUERY_KEY,
} from '@/registry/useComponentConfig';
import { getAllConsumersByName } from '@/registry/usage-map.generated';

interface HistoryRow {
  id: string;
  component_id: string;
  route: string;
  version: string;
  feature_flags: Record<string, unknown>;
  action: 'publish' | 'update' | 'rollback' | 'reset' | 'delete';
  applied_at: string;
  applied_by: string | null;
  notes: string | null;
}

const HISTORY_QUERY_KEY = ['component_config_history'] as const;

async function fetchHistory(componentId: string | null): Promise<HistoryRow[]> {
  let query = (supabase as any)
    .from('component_config_history')
    .select('*')
    .order('applied_at', { ascending: false })
    .limit(500);
  if (componentId) query = query.eq('component_id', componentId);
  const { data, error } = await query;
  if (error) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn('[components] history fetch failed:', error.message);
    }
    return [];
  }
  return (data ?? []) as HistoryRow[];
}

function ActionChip({ action }: { action: HistoryRow['action'] }) {
  const map: Record<HistoryRow['action'], { label: string; appearance: 'success' | 'inprogress' | 'moved' | 'removed' | 'default' }> = {
    publish:  { label: 'Publish',  appearance: 'success' },
    update:   { label: 'Update',   appearance: 'inprogress' },
    rollback: { label: 'Rollback', appearance: 'moved' },
    reset:    { label: 'Reset',    appearance: 'default' },
    delete:   { label: 'Delete',   appearance: 'removed' },
  };
  const { label, appearance } = map[action];
  return <Lozenge appearance={appearance}>{label}</Lozenge>;
}

function diffFlags(
  current: Record<string, unknown> | undefined,
  target: Record<string, unknown>,
): Array<{ key: string; from: unknown; to: unknown; change: 'unchanged' | 'changed' | 'added' | 'removed' }> {
  const cur = current ?? {};
  const keys = new Set([...Object.keys(cur), ...Object.keys(target)]);
  const result: Array<{ key: string; from: unknown; to: unknown; change: 'unchanged' | 'changed' | 'added' | 'removed' }> = [];
  for (const k of keys) {
    const inCur = Object.prototype.hasOwnProperty.call(cur, k);
    const inTgt = Object.prototype.hasOwnProperty.call(target, k);
    if (inCur && !inTgt) result.push({ key: k, from: cur[k], to: undefined, change: 'removed' });
    else if (!inCur && inTgt) result.push({ key: k, from: undefined, to: target[k], change: 'added' });
    else if (JSON.stringify(cur[k]) !== JSON.stringify(target[k])) result.push({ key: k, from: cur[k], to: target[k], change: 'changed' });
    else result.push({ key: k, from: cur[k], to: target[k], change: 'unchanged' });
  }
  return result.sort((a, b) => a.key.localeCompare(b.key));
}

export default function HistoryTab() {
  const queryClient = useQueryClient();
  const [filterId, setFilterId] = useState<string | null>(null);
  const [rollbackTarget, setRollbackTarget] = useState<HistoryRow | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: configs } = useAllComponentConfigs();
  const { data: history, isLoading } = useQuery({
    queryKey: [...HISTORY_QUERY_KEY, filterId],
    queryFn: () => fetchHistory(filterId),
    refetchOnWindowFocus: false,
  });

  const componentOptions = useMemo(() => {
    const all = [
      { label: 'All components', value: '' },
      ...componentsRegistry
        .filter(e => e.status === 'canonical')
        .map(e => ({ label: e.name, value: e.id })),
    ];
    return all;
  }, []);

  async function executeRollback() {
    if (!rollbackTarget) return;
    setSubmitting(true);
    try {
      // v3: rollback restores into the historical row's OWN route scope.
      // Rolling back a `/backlog` history row writes back the `/backlog` row,
      // not the global row.
      const targetRoute = rollbackTarget.route ?? '';
      const { error } = await (supabase as any)
        .from('component_config')
        .upsert(
          {
            component_id: rollbackTarget.component_id,
            route: targetRoute,
            active_version: rollbackTarget.version,
            feature_flags: rollbackTarget.feature_flags,
            applied_at: new Date().toISOString(),
            notes: `Rolled back to history ${rollbackTarget.id} (was applied ${new Date(rollbackTarget.applied_at).toLocaleString()})`,
          },
          { onConflict: 'component_id,route' },
        );
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: COMPONENT_CONFIG_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: HISTORY_QUERY_KEY });
      const scope = targetRoute === '' ? 'global' : targetRoute;
      catalystToast.success(`Rolled back ${rollbackTarget.component_id} (${scope}) to v${rollbackTarget.version}`);
      setRollbackTarget(null);
    } catch (e: unknown) {
      catalystToast.error(`Rollback failed: ${(e as Error).message ?? 'unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  }

  const rollbackEntry = rollbackTarget ? getComponentById(rollbackTarget.component_id) : undefined;
  // v3: drill into the per-route map by the history row's own `route`, so the
  // dry-run diff compares apples to apples (the same scope being rolled back).
  const rollbackCurrent = rollbackTarget
    ? configs?.[rollbackTarget.component_id]?.[rollbackTarget.route ?? '']
    : undefined;
  const rollbackDiff = rollbackTarget ? diffFlags(rollbackCurrent?.feature_flags, rollbackTarget.feature_flags) : [];
  const rollbackChangedCount = rollbackDiff.filter(d => d.change !== 'unchanged').length;
  const rollbackConsumerCount = rollbackEntry ? getAllConsumersByName(rollbackEntry.name).length : 0;
  const rollbackScopeLabel = (rollbackTarget?.route ?? '') === '' ? 'global' : (rollbackTarget?.route ?? '');

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
        <Heading size="medium">History</Heading>
        <p
          style={{
            marginTop: token('space.075', '6px'),
            marginBottom: 0,
            fontSize: 13,
            color: token('color.text.subtle', 'var(--cp-text-secondary, var(--cp-text-secondary))'),
            maxWidth: 760,
          }}
        >
          Every publish, update, rollback, and reset on{' '}
          <code>component_config</code> is appended here by a database trigger.
          Click any row's Rollback to restore that historical state — you'll
          see a dry-run diff first.
        </p>
      </div>

      <div style={{ width: 320 }}>
        <Select
          inputId="history-filter-component"
          options={componentOptions}
          value={componentOptions.find(o => o.value === (filterId ?? '')) ?? componentOptions[0]}
          onChange={opt => setFilterId(((opt as { value: string }).value || null))}
          placeholder="Filter by component"
        />
      </div>

      {isLoading ? (
        <div style={{ color: token('color.text.subtle', 'var(--cp-text-secondary, var(--cp-text-secondary))'), fontSize: 13 }}>Loading…</div>
      ) : !history || history.length === 0 ? (
        <div
          style={{
            padding: token('space.300', '24px'),
            border: `1px solid ${token('color.border', 'var(--ds-border-disabled)')}`,
            borderRadius: 6,
            background: token('color.background.neutral.subtle', 'var(--ds-surface-sunken)'),
            color: token('color.text.subtle', 'var(--cp-text-secondary, var(--cp-text-secondary))'),
            fontSize: 13,
          }}
        >
          No history yet. Publish a component from the Publish tab to see entries here.
        </div>
      ) : (
        <div
          style={{
            border: `1px solid ${token('color.border', 'var(--ds-border-disabled)')}`,
            borderRadius: 6,
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: token('color.background.neutral.subtle', 'var(--ds-surface-sunken)') }}>
                <th style={{ padding: token('space.100', '8px'), textAlign: 'left' }}>When</th>
                <th style={{ padding: token('space.100', '8px'), textAlign: 'left' }}>Component</th>
                <th style={{ padding: token('space.100', '8px'), textAlign: 'left' }}>Route</th>
                <th style={{ padding: token('space.100', '8px'), textAlign: 'left' }}>Action</th>
                <th style={{ padding: token('space.100', '8px'), textAlign: 'left' }}>Version</th>
                <th style={{ padding: token('space.100', '8px'), textAlign: 'left' }}>Notes</th>
                <th style={{ padding: token('space.100', '8px'), textAlign: 'right' }}>Rollback</th>
              </tr>
            </thead>
            <tbody>
              {history.map(row => (
                <tr key={row.id} style={{ borderTop: `1px solid ${token('color.border', 'var(--ds-border-disabled)')}` }}>
                  <td style={{ padding: token('space.100', '8px'), verticalAlign: 'top', whiteSpace: 'nowrap', fontSize: 12, color: token('color.text.subtle', 'var(--cp-text-secondary, var(--cp-text-secondary))') }}>
                    {new Date(row.applied_at).toLocaleString()}
                  </td>
                  <td style={{ padding: token('space.100', '8px'), verticalAlign: 'top', fontFamily: 'var(--ds-font-family-code)', fontSize: 12 }}>
                    {row.component_id}
                  </td>
                  <td style={{ padding: token('space.100', '8px'), verticalAlign: 'top' }}>
                    {(row.route ?? '') === '' ? (
                      <Lozenge>global</Lozenge>
                    ) : (
                      <span
                        style={{
                          fontFamily: 'var(--ds-font-family-code)',
                          fontSize: 12,
                          color: token('color.text', 'var(--cp-text-primary, var(--cp-text-inverse))'),
                        }}
                      >
                        {row.route}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: token('space.100', '8px'), verticalAlign: 'top' }}>
                    <ActionChip action={row.action} />
                  </td>
                  <td style={{ padding: token('space.100', '8px'), verticalAlign: 'top', fontFamily: 'var(--ds-font-family-code)', fontSize: 12 }}>
                    v{row.version}
                  </td>
                  <td style={{ padding: token('space.100', '8px'), verticalAlign: 'top', maxWidth: 320, color: token('color.text', 'var(--cp-text-primary, var(--cp-text-inverse))') }}>
                    {row.notes ?? ''}
                  </td>
                  <td style={{ padding: token('space.100', '8px'), verticalAlign: 'top', textAlign: 'right' }}>
                    <Button
                      appearance="subtle"
                      spacing="compact"
                      onClick={() => setRollbackTarget(row)}
                    >
                      Rollback
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ModalTransition>
        {rollbackTarget && (
          <Modal onClose={() => setRollbackTarget(null)}>
            <ModalHeader>
              <ModalTitle>
                Dry-run: rollback {rollbackTarget.component_id} ({rollbackScopeLabel}) to v{rollbackTarget.version}
              </ModalTitle>
            </ModalHeader>
            <ModalBody>
              <div style={{ fontSize: 13, color: token('color.text', 'var(--cp-text-primary, var(--cp-text-inverse))'), marginBottom: token('space.200', '16px') }}>
                This will affect <strong>{rollbackConsumerCount} consumer files</strong> that import{' '}
                <code>{rollbackEntry?.name ?? rollbackTarget.component_id}</code>{' '}
                at the <strong>{rollbackScopeLabel}</strong> scope. {rollbackChangedCount}{' '}
                {rollbackChangedCount === 1 ? 'flag' : 'flags'} will change.
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: token('color.background.neutral.subtle', 'var(--ds-surface-sunken)') }}>
                    <th style={{ padding: 8, textAlign: 'left' }}>Flag</th>
                    <th style={{ padding: 8, textAlign: 'left' }}>Current</th>
                    <th style={{ padding: 8, textAlign: 'left' }}>After rollback</th>
                    <th style={{ padding: 8, textAlign: 'left' }}>Change</th>
                  </tr>
                </thead>
                <tbody>
                  {rollbackDiff.map(d => (
                    <tr key={d.key} style={{ borderTop: `1px solid ${token('color.border', 'var(--ds-border-disabled)')}` }}>
                      <td style={{ padding: 8, fontFamily: 'var(--ds-font-family-code)' }}>{d.key}</td>
                      <td style={{ padding: 8 }}>{String(d.from ?? '—')}</td>
                      <td style={{ padding: 8 }}>{String(d.to ?? '—')}</td>
                      <td style={{ padding: 8 }}>
                        {d.change === 'changed' && <Lozenge appearance="moved">changed</Lozenge>}
                        {d.change === 'added' && <Lozenge appearance="success">added</Lozenge>}
                        {d.change === 'removed' && <Lozenge appearance="removed">removed</Lozenge>}
                        {d.change === 'unchanged' && <span style={{ color: token('color.text.subtle', 'var(--cp-text-secondary, var(--cp-text-secondary))') }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ModalBody>
            <ModalFooter>
              <Button appearance="subtle" onClick={() => setRollbackTarget(null)} isDisabled={submitting}>
                Cancel
              </Button>
              <Button appearance="warning" onClick={executeRollback} isDisabled={submitting}>
                Confirm rollback
              </Button>
            </ModalFooter>
          </Modal>
        )}
      </ModalTransition>
    </div>
  );
}
