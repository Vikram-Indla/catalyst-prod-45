/**
 * NewChannelModal — admin-only ad-hoc channel creation.
 *
 * Creates a free-standing (non-project) channel by name via the
 * chat_create_channel RPC. The creator + all active resource members are
 * auto-joined by the chat_conversations insert trigger. On success the new
 * conversation id is handed back through onCreated so the dock can select it.
 *
 * ADS: @atlaskit/modal-dialog shell, @atlaskit/textfield input,
 * @atlaskit/button actions. Colors via var(--ds-*) tokens only.
 */
import React, { useState } from 'react';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import Textfield from '@atlaskit/textfield';
import Button from '@atlaskit/button/new';
import { useCreateChannel } from '@/hooks/chat/useCreateChannel';

interface NewChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (conversationId: string) => void;
}

export function NewChannelModal({ isOpen, onClose, onCreated }: NewChannelModalProps) {
  const createChannel = useCreateChannel();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const trimmed = name.trim();
  const canCreate = trimmed.length > 0 && !createChannel.isPending;
  const subtlestText = 'var(--ds-text-subtlest, #6B778C)';

  const reset = () => {
    setName('');
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleCreate = async () => {
    if (!canCreate) return;
    setError(null);
    try {
      const id = await createChannel.mutateAsync(trimmed);
      reset();
      onCreated(id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create channel.');
    }
  };

  return (
    <ModalDialog onClose={handleClose} width="small">
      <ModalHeader hasCloseButton>
        <ModalTitle>Create channel</ModalTitle>
      </ModalHeader>

      <ModalBody>
        <label
          htmlFor="new-channel-name"
          style={{
            display: 'block',
            fontSize: 12,
            fontWeight: 600,
            color: subtlestText,
            marginBottom: 4,
          }}
        >
          Channel name
        </label>
        <Textfield
          id="new-channel-name"
          autoFocus
          value={name}
          onChange={(e) => setName((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void handleCreate();
            }
          }}
          placeholder="e.g. release-planning"
          aria-label="Channel name"
        />
        <div style={{ fontSize: 12, color: subtlestText, marginTop: 8 }}>
          All active team members are added to the channel.
        </div>
        {error && (
          <div style={{ fontSize: 12, color: 'var(--ds-text-danger, #AE2A19)', marginTop: 8 }}>
            {error}
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        <Button appearance="subtle" onClick={handleClose}>
          Cancel
        </Button>
        <Button appearance="primary" isDisabled={!canCreate} onClick={() => void handleCreate()}>
          {createChannel.isPending ? 'Creating…' : 'Create channel'}
        </Button>
      </ModalFooter>
    </ModalDialog>
  );
}

export default NewChannelModal;
