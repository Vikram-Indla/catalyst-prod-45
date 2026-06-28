/**
 * ReleaseDeleteDialog — type "delete" to confirm permanent removal.
 */
import React, { useState, useEffect } from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
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

const CONFIRM_WORD = 'delete';

export function ReleaseDeleteDialog({ isOpen, release, onClose, onSuccess, config = RELEASE_CONFIG }: Props) {
  const [typed, setTyped] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isOpen) setTyped('');
  }, [isOpen]);

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from(config.table).delete().eq('id', release.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [config.queryKeyPrefix] });
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      catalystFlag.error(err?.message || `Failed to delete ${config.label.lowerSingular}`);
    },
  });

  const canDelete = typed.trim().toLowerCase() === CONFIRM_WORD;

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onClose} width={867}>
          <ModalHeader hasCloseButton>
            <ModalTitle>Delete {config.label.lowerSingular}</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ margin: 0, fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text)' }}>
                You are about to permanently delete <strong>{release.name}</strong>. This action cannot be undone.
              </p>
              <p style={{ margin: 0, fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtle)' }}>
                Type <strong>delete</strong> below to confirm.
              </p>
              <Textfield
                autoFocus
                value={typed}
                onChange={(e) => setTyped((e.currentTarget as HTMLInputElement).value)}
                placeholder="Type delete"
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={onClose}>
              Cancel
            </Button>
            <Button
              appearance="primary"
              isDisabled={!canDelete || mutation.isPending}
              isLoading={mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              Delete
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
}
