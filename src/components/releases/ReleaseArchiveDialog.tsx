/**
 * ReleaseArchiveDialog — confirm before archiving a release.
 */
import React from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Release } from '@/types/phase3-releases';
import { catalystFlag } from '@/lib/catalystFlag';

interface Props {
  isOpen: boolean;
  release: Release;
  projectKey: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ReleaseArchiveDialog({ isOpen, release, onClose, onSuccess }: Props) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('ph_releases')
        .update({ status: 'archived' })
        .eq('id', release.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projecthub', 'releases'] });
      queryClient.invalidateQueries({ queryKey: ['projecthub', 'release-progress'] });
      queryClient.invalidateQueries({ queryKey: ['releases', release.project_id] });
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      catalystFlag.error(err?.message || 'Failed to archive release');
    },
  });

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onClose} width="small">
          <ModalHeader hasCloseButton>
            <ModalTitle>Archive release</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--ds-text, #292A2E)' }}>
              Archive <strong>{release.name}</strong>? It will be hidden from active views but kept for reference.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={onClose}>
              Cancel
            </Button>
            <Button
              appearance="primary"
              isLoading={mutation.isPending}
              isDisabled={mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              Archive
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
}
