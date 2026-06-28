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
import { type EntityConfig, RELEASE_CONFIG } from '@/lib/entity-hub/config';

interface Props {
  isOpen: boolean;
  release: Release;
  projectKey: string;
  onClose: () => void;
  onSuccess?: () => void;
  /** 2026-06-26: entity-hub config (defaults to RELEASE_CONFIG). */
  config?: EntityConfig;
}

export function ReleaseArchiveDialog({ isOpen, release, onClose, onSuccess, config = RELEASE_CONFIG }: Props) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from(config.table)
        .update({ status: 'archived' })
        .eq('id', release.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [config.queryKeyPrefix] });
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      catalystFlag.error(err?.message || `Failed to archive ${config.label.lowerSingular}`);
    },
  });

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onClose} width={867}>
          <ModalHeader hasCloseButton>
            <ModalTitle>Archive {config.label.lowerSingular}</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <p style={{ margin: 0, fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text, #292A2E)' }}>
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
