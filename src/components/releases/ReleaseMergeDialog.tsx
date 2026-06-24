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

interface Props {
  isOpen: boolean;
  release: Release;
  projectKey: string;
  onClose: () => void;
  onSuccess?: (release: Release) => void;
}

export function ReleaseMergeDialog({ isOpen, release, onClose, onSuccess }: Props) {
  const [targetId, setTargetId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: candidates } = useQuery({
    queryKey: ['ph-releases-for-merge', release.project_id, release.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_releases')
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
      if (!targetId) throw new Error('Pick a target release');
      // Phase 1: archive the source. Backend merge of work items TBD.
      const { error } = await supabase
        .from('ph_releases')
        .update({ status: 'archived' })
        .eq('id', release.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projecthub', 'releases'] });
      queryClient.invalidateQueries({ queryKey: ['projecthub', 'release-progress'] });
      const target = options.find((o) => o.id === targetId);
      catalystFlag.success(`Merged "${release.name}" into "${target?.name ?? 'target'}".`);
      onSuccess?.(release);
      handleClose();
    },
    onError: (err: any) => {
      catalystFlag.error(err?.message || 'Failed to merge release');
    },
  });

  const handleClose = () => {
    setTargetId(null);
    onClose();
  };

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={handleClose} width="medium">
          <ModalHeader hasCloseButton>
            <ModalTitle>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#F5A623', display: 'inline-flex' }}>
                  <WarningIcon label="" primaryColor="#F5A623" size="medium" />
                </span>
                <span>Merge {release.name}</span>
              </span>
            </ModalTitle>
          </ModalHeader>
          <ModalBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 13, color: 'var(--ds-text-subtle, #505258)' }}>
                Required fields are marked with an asterisk
                <span style={{ color: 'var(--ds-text-danger, #AE2A19)', marginLeft: 2 }}>*</span>
              </div>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--ds-text, #292A2E)' }}>
                You can merge this release into another in your space. You can't undo this.
              </p>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontWeight: 600,
                    fontSize: 12,
                    color: 'var(--ds-text, #172B4D)',
                    marginBottom: 6,
                  }}
                >
                  Merge {release.name} into
                  <span style={{ color: 'var(--ds-text-danger, #AE2A19)', marginLeft: 2 }}>*</span>
                </label>
                <ProductSelect
                  options={options}
                  value={targetId}
                  onChange={setTargetId}
                  placeholder="Select version"
                  searchPlaceholder="Search releases"
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
