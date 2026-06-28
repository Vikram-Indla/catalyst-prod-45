/**
 * ReleaseMergeDialog — merge a release into another.
 *
 * Jira parity:
 *   - Title: orange warning icon + "Merge {release.name}"
 *   - Subtitle: "Required fields are marked with an asterisk *"
 *   - Body: "You can merge this release into another in your space. You can't undo this."
 *   - Single-select dropdown (excludes self + archived releases)
 *   - Footer: Cancel + Merge (yellow); Merge disabled until a target is picked
 *
 * Merge semantics (Phase 1):
 *   - Source release archived (status='archived')
 *   - TODO: re-point ph_issues.sprint_release entries from source -> target
 */
import React, { useMemo, useState } from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import WarningIcon from '@atlaskit/icon/glyph/warning';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Release } from '@/types/phase3-releases';
import { catalystFlag } from '@/lib/catalystFlag';
import { ProductSelect, type ProductOption } from './ReleaseFilters';
import { type EntityConfig, RELEASE_CONFIG } from '@/lib/entity-hub/config';

interface Props {
  isOpen: boolean;
  release: Release;
  projectKey: string;
  onClose: () => void;
  onSuccess?: (release: Release) => void;
  /** 2026-06-26: entity-hub config (defaults to RELEASE_CONFIG). */
  config?: EntityConfig;
}

export function ReleaseMergeDialog({ isOpen, release, onClose, onSuccess, config = RELEASE_CONFIG }: Props) {
  const [targetId, setTargetId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: candidates } = useQuery({
    queryKey: [config.queryKeyPrefix, 'merge-candidates', release.project_id, release.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(config.table)
        .select('id, name, title, status, project_id')
        .eq('project_id', release.project_id)
        .neq('id', release.id)
        .neq('status', 'archived')
        .order('name');
      if (error) throw new Error(error.message);
      return (data ?? []) as Array<{ id: string; name: string | null; title: string | null; status: string; project_id: string }>;
    },
    enabled: isOpen,
    staleTime: 30_000,
  });

  const options: ProductOption[] = useMemo(
    () => (candidates ?? []).map((c) => ({ id: c.id, name: c.name || c.title || c.id })),
    [candidates],
  );

  const mutation = useMutation({
    mutationFn: async () => {
      if (!targetId) throw new Error(`Pick a target ${config.label.lowerSingular}`);
      const sourceName = release.name ?? '';
      const target = options.find((o) => o.id === targetId);
      const targetName = target?.name ?? null;
      if (!targetName) throw new Error('Target name resolution failed');

      // 2026-06-26: Phase 2b — re-point every ph_issues.sprint_release
      // entry from source -> target (regardless of status_category, unlike
      // the Release-confirmation modal which only moves unresolved items).
      // Idempotent: duplicates dropped via Set on names.
      if (sourceName) {
        const { data: rows, error: scanErr } = await supabase
          .from('ph_issues')
          .select('id, sprint_release')
          .not('sprint_release', 'is', null);
        if (scanErr) throw new Error(scanErr.message);

        for (const row of rows ?? []) {
          const arr: any[] = Array.isArray((row as any).sprint_release) ? (row as any).sprint_release : [];
          const hasSource = arr.some((el: any) => el && el.name === sourceName);
          if (!hasSource) continue;
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

      // Now archive the source entity.
      const { error } = await (supabase as any)
        .from(config.table)
        .update({ status: 'archived' })
        .eq('id', release.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [config.queryKeyPrefix] });
      queryClient.refetchQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) &&
          (q.queryKey[0] === 'ph_release_items'
            || q.queryKey[0] === 'ph_entity_items'
            || q.queryKey[0] === 'ph_release_contributors'),
      });
      queryClient.invalidateQueries({ queryKey: ['projecthub', 'release-progress'] });
      queryClient.invalidateQueries({ queryKey: ['projecthub-sprints'] });
      queryClient.invalidateQueries({ queryKey: ['projecthub-releases'] });
      const target = options.find((o) => o.id === targetId);
      catalystFlag.success(`Merged "${release.name}" into "${target?.name ?? 'target'}".`);
      onSuccess?.(release);
      handleClose();
    },
    onError: (err: any) => {
      catalystFlag.error(err?.message || `Failed to merge ${config.label.lowerSingular}`);
    },
  });

  const handleClose = () => {
    setTargetId(null);
    onClose();
  };

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={handleClose} width={867}>
          <ModalHeader hasCloseButton>
            <ModalTitle>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--ds-icon-warning)', display: 'inline-flex' }}>
                  <WarningIcon label="" primaryColor="var(--ds-icon-warning)" size="medium" />
                </span>
                <span>Merge {release.name}</span>
              </span>
            </ModalTitle>
          </ModalHeader>
          <ModalBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtle)' }}>
                Required fields are marked with an asterisk
                <span style={{ color: 'var(--ds-text-danger)', marginLeft: 2 }}>*</span>
              </div>
              <p style={{ margin: 0, fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text)' }}>
                You can merge this {config.label.lowerSingular} into another in your space. You can't undo this.
              </p>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontWeight: 600,
                    fontSize: 'var(--ds-font-size-200)',
                    color: 'var(--ds-text)',
                    marginBottom: 6,
                  }}
                >
                  Merge {release.name} into
                  <span style={{ color: 'var(--ds-text-danger)', marginLeft: 2 }}>*</span>
                </label>
                <ProductSelect
                  options={options}
                  value={targetId}
                  onChange={setTargetId}
                  placeholder={`Select ${config.label.lowerSingular}`}
                  searchPlaceholder={`Search ${config.label.lowerPlural}`}
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              appearance="warning"
              isDisabled={!targetId || mutation.isPending}
              isLoading={mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              Merge
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
}
