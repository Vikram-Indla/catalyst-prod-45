import React from 'react';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';

interface UnsavedChangesModalProps {
  isOpen: boolean;
  onDiscard: () => void;
  onCancel: () => void;
  message?: string;
}

export function UnsavedChangesModal({
  isOpen,
  onDiscard,
  onCancel,
  message = 'You have unsaved changes. Discard them?',
}: UnsavedChangesModalProps) {
  if (!isOpen) return null;

  return (
    <ModalDialog onClose={onCancel} width="small">
      <ModalHeader hasCloseButton>
        <ModalTitle appearance="warning">Unsaved changes</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <p style={{ margin: 0, fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text)' }}>
          {message}
        </p>
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onCancel}>Keep editing</Button>
        <Button appearance="warning" onClick={onDiscard}>Discard changes</Button>
      </ModalFooter>
    </ModalDialog>
  );
}
