/**
 * MoveToVersionModal — single-select dropdown to move a work item to a release.
 *
 * Triggered from the work-item row ⋯ menu under "View all versions".
 */
import React, { useEffect, useMemo, useState } from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { catalystFlag } from '@/lib/catalystFlag';
import { ProductSelect, type ProductOption } from '@/components/releases/ReleaseFilters';

interface Props {
  isOpen: boolean;
  workItemId: string;
  currentReleaseName: string;
  projectId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function MoveToVersionModal({
  isOpen, workItemId, currentReleaseName, projectId, onClose, onSuccess,
}: Props) {
  const [targetId, setTargetId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => { if (!isOpen) setTargetId(null); }, [isOpen]);

  const { data: rows } = useQuery({
    queryKey: ['ph-releases-for-move', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_releases')
        .select('id, name, title, status')
        .eq('project_id', projectId)
        .neq('status', 'archived')
        .order('name');
      if (error) throw new Error(error.message);
      return (data ?? []) as Array<{ id: string; name: string | null; title: string | null; status: string }>;
    },
    enabled: isOpen,
    staleTime: 30_000,
  });

  const options: ProductOption[] = useMemo(
    () => (rows ?? []).map((r) => ({ id: r.id, name: r.name || r.title || r.id })),
    [rows],
  );

  const mutation = useMutation({
    mutationFn: async () => {
      const target = (rows ?? []).find((r) => r.id === targetId);
      if (!target) throw new Error('No target selected');
      const { data: row, error: readErr } = await supabase
        .from('ph_issues')
        .select('sprint_release')
        .eq('id', workItemId)
        .single();
      if (readErr) throw new Error(readErr.message);
      const current: any[] = Array.isArray((row as any)?.sprint_release) ? (row as any).sprint_release : [];
      const filtered = current.filter((el) => el && el.name !== currentReleaseName);
      const next = [...filtered, { id: '', name: target.name || target.title, releaseDate: '' }];
      const { error: upErr } = await supabase
        .from('ph_issues')
        .update({ sprint_release: next })
        .eq('id', workItemId);
      if (upErr) throw new Error(upErr.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projecthub', 'release-progress'] });
      queryClient.invalidateQueries({ queryKey: ['release-work-items'] });
      catalystFlag.success('Work item moved.');
      onSuccess?.();
      onClose();
    },
    onError: (e: any) => catalystFlag.error(e?.message || 'Failed to move work item'),
  });

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onClose} width="small">
          <ModalHeader hasCloseButton>
            <ModalTitle>Move to version</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <ProductSelect
              options={options}
              value={targetId}
              onChange={setTargetId}
              placeholder="Select version"
              searchPlaceholder="Search releases"
            />
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={onClose}>Cancel</Button>
            <Button
              appearance="primary"
              isDisabled={!targetId || mutation.isPending}
              isLoading={mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              Add to version
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
}
