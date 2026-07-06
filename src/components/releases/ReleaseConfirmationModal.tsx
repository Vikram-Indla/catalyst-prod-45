/**
 * ReleaseConfirmationModal — confirm releasing a release.
 *
 * Jira parity:
 *   - Title: orange warning icon + "Release {release.name}"
 *   - "This release contains N unresolved work items."
 *   - Radio: Move unresolved work items to <dropdown>  OR  Ignore unresolved work items
 *   - Release date picker (defaults to release.release_date or today)
 *   - Footer: Release (yellow, enabled once choice + date valid) + Cancel
 *   - No "Create release notes" checkbox (out of scope).
 *
 * Phase 1 backend:
 *   - Update source.status='released', actual_date=releaseDate, release_date=releaseDate
 *   - TODO: re-point unresolved ph_issues.sprint_release entries when actionType='move'
 */
import React, { useEffect, useMemo, useState } from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import WarningIcon from '@atlaskit/icon/glyph/warning';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Release } from '@/types/phase3-releases';
import { catalystFlag } from '@/lib/catalystFlag';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';
import { ProductSelect, type ProductOption } from './ReleaseFilters';
import { type EntityConfig, RELEASE_CONFIG } from '@/lib/entity-hub/config';
import { checkReasonRequired, recordAdvisoryStatusChange } from '@/lib/workflow/canonical/runtime';
import { ReasonCaptureModal } from '@/components/catalyst-detail-views/shared/workflow/ReasonCaptureModal';

interface Props {
  isOpen: boolean;
  release: Release;
  projectKey: string;
  onClose: () => void;
  onSuccess?: (release: Release) => void;
  /** 2026-06-26: entity-hub config (defaults to RELEASE_CONFIG). */
  config?: EntityConfig;
}

type Action = 'move' | 'ignore' | null;

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontWeight: 600,
  fontSize: 'var(--ds-font-size-200)',
  color: 'var(--ds-text)',
  marginBottom: 4,
};

const radioRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  cursor: 'pointer',
  fontSize: 'var(--ds-font-size-400)',
  color: 'var(--ds-text)',
  userSelect: 'none',
};

const todayIso = () => new Date().toISOString().split('T')[0];

export function ReleaseConfirmationModal({ isOpen, release, onClose, onSuccess, config = RELEASE_CONFIG }: Props) {
  const [action, setAction] = useState<Action>('move');
  const [targetId, setTargetId] = useState<string | null>(null);
  const [releaseDate, setReleaseDate] = useState<string>(release.release_date || todayIso());
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isOpen) return;
    setAction('move');
    setTargetId(null);
    setReleaseDate(release.release_date || todayIso());
  }, [isOpen, release.id, release.release_date]);

  // Unresolved work-item count: ph_issues whose sprint_release.name matches this release
  // AND whose status_category is not 'done'.
  // Sprint branch (S0.2b/S0.3): membership is the sprint_id FK.
  const { data: unresolvedCount = 0 } = useQuery({
    queryKey: ['unresolved-items', release.id, release.name, config.kind],
    queryFn: async () => {
      if (config.kind === 'sprint') {
        const { data, error } = await supabase
          .from('ph_issues')
          .select('id, status_category')
          .eq('sprint_id', release.id);
        if (error) throw new Error(error.message);
        return (data ?? []).filter(
          (row: any) => String(row.status_category ?? '').toLowerCase() !== 'done',
        ).length;
      }
      const releaseName = release.name;
      if (!releaseName) return 0;
      const { data, error } = await supabase
        .from('ph_issues')
        .select('id, status_category, sprint_release')
        .not('sprint_release', 'is', null);
      if (error) throw new Error(error.message);
      let n = 0;
      for (const row of data ?? []) {
        const arr = (row as any).sprint_release;
        if (!Array.isArray(arr)) continue;
        const matches = arr.some((el: any) => el && el.name === releaseName);
        if (!matches) continue;
        const sc = String((row as any).status_category ?? '').toLowerCase();
        if (sc !== 'done') n++;
      }
      return n;
    },
    enabled: isOpen,
    staleTime: 30_000,
  });

  // Other non-archived, non-released targets in the same project — for "Move to" picker
  const { data: candidates } = useQuery({
    queryKey: [config.queryKeyPrefix, 'release-confirm-candidates', release.project_id, release.id],
    queryFn: async () => {
      let builder = (supabase as any)
        .from(config.table)
        .select('id, name, title, status, project_id')
        .eq('project_id', release.project_id)
        .neq('id', release.id);
      // S0.3: sprint vocabulary has three terminal states; releases keep the
      // legacy pair. Both mean "exclude targets you can't move items into".
      builder = config.kind === 'sprint'
        ? builder.not('status', 'in', '(archived,completed,canceled)')
        : builder.neq('status', 'archived').neq('status', 'released');
      const { data, error } = await builder.order('name');
      if (error) throw new Error(error.message);
      return (data ?? []) as Array<{ id: string; name: string | null; title: string | null; status: string }>;
    },
    enabled: isOpen,
    staleTime: 30_000,
  });

  const options: ProductOption[] = useMemo(
    () => (candidates ?? []).map((c) => ({ id: c.id, name: c.name || c.title || c.id })),
    [candidates],
  );

  const hasUnresolved = unresolvedCount > 0;

  const canSubmit =
    !!releaseDate &&
    (!hasUnresolved || action === 'ignore' || (action === 'move' && !!targetId));

  // F3: workflow-gated completion — collect a reason and retry.
  const [pendingReason, setPendingReason] = useState<{ from: string | null; to: string } | null>(null);

  const mutation = useMutation({
    mutationFn: async (reason?: { code: string | null; text: string | null }) => {
      const sourceName = release.name ?? '';
      const entityKey = config.kind === 'sprint' ? ('sprint' as const) : ('release' as const);
      const toStatus = config.kind === 'sprint' ? 'completed' : 'released';
      const fromStatus = ((release as any).status as string | undefined) ?? null;

      // F3: reason preflight BEFORE any write.
      if (fromStatus !== toStatus && !reason) {
        const preflight = await checkReasonRequired(entityKey, null, fromStatus, toStatus);
        if (preflight.reasonRequired) {
          const err = new Error('This transition requires a reason.');
          (err as any).code = 'WF_REASON_REQUIRED';
          (err as any).ctx = { from: fromStatus, to: toStatus };
          throw err;
        }
      }
      const recordAdvisory = () => {
        if (fromStatus === toStatus) return;
        recordAdvisoryStatusChange({
          entityKey, entityId: release.id, projectKey: null,
          fromStatusRaw: fromStatus, toStatusRaw: toStatus,
          sourceSurface: config.kind === 'sprint' ? 'sprint_confirm_modal' : 'release_confirm_modal',
          reasonCode: reason?.code ?? null, reasonText: reason?.text ?? null,
        }).catch(() => {/* advisory — non-blocking */});
      };

      // 2026-06-26: Phase 2b — when user picks "Move unresolved work items to
      // <target>", actually re-point each unresolved issue's sprint_release
      // JSONB entry from source -> target (idempotent: skip if entry with
      // target name already exists). When "Ignore" is picked, leave items
      // untouched. This is required for both release + sprint surfaces.
      // Sprint branch (S0.2b/S0.3): move unresolved members via the sprint_id
      // FK, then complete the sprint with the new vocabulary value. The
      // membership changelog rows come from the DB trigger (D-018).
      if (config.kind === 'sprint') {
        if (hasUnresolved && action === 'move' && targetId) {
          const { data: rows, error: scanErr } = await supabase
            .from('ph_issues')
            .select('id, status_category')
            .eq('sprint_id', release.id);
          if (scanErr) throw new Error(scanErr.message);
          for (const row of rows ?? []) {
            if (String((row as any).status_category ?? '').toLowerCase() === 'done') continue;
            const { error: upErr } = await supabase
              .from('ph_issues')
              .update({ sprint_id: targetId })
              .eq('id', (row as any).id);
            if (upErr) throw new Error(upErr.message);
          }
        }
        const { error } = await (supabase as any)
          .from(config.table)
          .update({
            status: 'completed',
            actual_date: releaseDate,
            release_date: releaseDate,
            target_date: releaseDate,
          })
          .eq('id', release.id);
        if (error) throw new Error(error.message);
        recordAdvisory();
        return;
      }

      if (hasUnresolved && action === 'move' && targetId && sourceName) {
        const target = options.find((o) => o.id === targetId);
        const targetName = target?.name ?? null;
        if (!targetName) throw new Error('Target name resolution failed');

        const { data: rows, error: scanErr } = await supabase
          .from('ph_issues')
          .select('id, status_category, sprint_release')
          .not('sprint_release', 'is', null);
        if (scanErr) throw new Error(scanErr.message);

        for (const row of rows ?? []) {
          const arr: any[] = Array.isArray((row as any).sprint_release) ? (row as any).sprint_release : [];
          const hasSource = arr.some((el: any) => el && el.name === sourceName);
          const sc = String((row as any).status_category ?? '').toLowerCase();
          if (!hasSource || sc === 'done') continue;
          // Replace source entry with target (idempotent — drop duplicates).
          const next: any[] = [];
          const seenNames = new Set<string>();
          for (const el of arr) {
            const name = el?.name === sourceName ? targetName : el?.name;
            if (!name || seenNames.has(name)) continue;
            seenNames.add(name);
            next.push(el?.name === sourceName ? { id: '', name: targetName, releaseDate: '' } : el);
          }
          if (!seenNames.has(targetName)) {
            next.push({ id: '', name: targetName, releaseDate: '' });
          }
          const { error: upErr } = await supabase
            .from('ph_issues')
            .update({ sprint_release: next })
            .eq('id', (row as any).id);
          if (upErr) throw new Error(upErr.message);
        }
      }

      const { error } = await (supabase as any)
        .from(config.table)
        .update({
          status: 'released',
          actual_date: releaseDate,
          release_date: releaseDate,
          target_date: releaseDate,
        })
        .eq('id', release.id);
      if (error) throw new Error(error.message);
      recordAdvisory();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [config.queryKeyPrefix] });
      // Refetch all work-item list caches so source list empties +
      // target list picks the moved items up.
      queryClient.refetchQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) &&
          (q.queryKey[0] === 'ph_release_items'
            || q.queryKey[0] === 'ph_entity_items'
            || q.queryKey[0] === 'ph_release_contributors'),
      });
      queryClient.invalidateQueries({ queryKey: ['projecthub', 'release-progress'] });
      queryClient.invalidateQueries({ queryKey: ['projecthub', 'releases'] });
      queryClient.invalidateQueries({ queryKey: ['projecthub-sprints'] });
      queryClient.invalidateQueries({ queryKey: ['projecthub-releases'] });
      onSuccess?.(release);
      onClose();
    },
    onError: (err: any) => {
      // F3: workflow refused pending a reason — collect it, keep this modal open.
      if (err?.code === 'WF_REASON_REQUIRED') {
        setPendingReason(err.ctx ?? { from: null, to: config.kind === 'sprint' ? 'completed' : 'released' });
        return;
      }
      catalystFlag.error(err?.message || `Failed to release ${config.label.lowerSingular}`);
    },
  });

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onClose} width={867}>
          <ModalHeader hasCloseButton>
            <ModalTitle>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--ds-icon-warning)', display: 'inline-flex' }}>
                  <WarningIcon label="" primaryColor="var(--ds-icon-warning)" size="medium" />
                </span>
                <span>Release {release.name}</span>
              </span>
            </ModalTitle>
          </ModalHeader>
          <ModalBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ margin: 0, fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text)' }}>
                This {config.label.lowerSingular} contains{' '}
                <span style={{ color: 'var(--ds-link)', fontWeight: 500 }}>
                  {unresolvedCount} unresolved work item{unresolvedCount === 1 ? '' : 's'}
                </span>
                .
              </p>

              {hasUnresolved && (
                <div>
                  <div style={labelStyle}>
                    Unresolved work items
                    <span style={{ color: 'var(--ds-text-danger)', marginLeft: 0 }}>*</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={radioRow}>
                      <input
                        style={{ accentColor: 'var(--ds-border-selected)' }}
                        type="radio"
                        name="release-action"
                        checked={action === 'move'}
                        onChange={() => setAction('move')}
                      />
                      <span>Move unresolved work items to</span>
                    </label>
                    <div style={{ marginLeft: 24 }}>
                      <ProductSelect
                        options={options}
                        value={targetId}
                        onChange={setTargetId}
                        placeholder={`Select ${config.label.lowerSingular}`}
                        searchPlaceholder={`Search ${config.label.lowerPlural}`}
                        disabled={action !== 'move'}
                      />
                    </div>
                    <label style={radioRow}>
                      <input
                        style={{ accentColor: 'var(--ds-border-selected)' }}
                        type="radio"
                        name="release-action"
                        checked={action === 'ignore'}
                        onChange={() => { setAction('ignore'); setTargetId(null); }}
                      />
                      <span>Ignore unresolved work items</span>
                    </label>
                  </div>
                </div>
              )}

              <div>
                <div style={labelStyle}>Release date</div>
                <CatalystDatePicker
                  value={releaseDate ? new Date(releaseDate) : null}
                  onChange={(date) =>
                    setReleaseDate(date ? date.toISOString().split('T')[0] : '')
                  }
                  placeholder="Release date"
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={onClose}>
              Cancel
            </Button>
            <Button
              appearance="warning"
              isDisabled={!canSubmit || mutation.isPending}
              isLoading={mutation.isPending}
              onClick={() => mutation.mutate(undefined)}
            >
              Release
            </Button>
          </ModalFooter>

          {/* F3: workflow-gated completion — reason capture stacked over
              this modal, then the same mutation retries with the reason. */}
          {pendingReason && (
            <ReasonCaptureModal
              entityType={config.kind === 'sprint' ? 'Sprint' : 'Release'}
              itemTitle={release.name}
              fromStatus={pendingReason.from}
              toStatus={pendingReason.to}
              onSubmit={(reason) => {
                setPendingReason(null);
                mutation.mutate(reason);
              }}
              onCancel={() => setPendingReason(null)}
            />
          )}
        </Modal>
      )}
    </ModalTransition>
  );
}
