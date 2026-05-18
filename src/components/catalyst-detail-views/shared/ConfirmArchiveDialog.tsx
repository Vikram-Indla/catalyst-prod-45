/**
 * ConfirmArchiveDialog — ADS-compliant archive confirmation.
 *
 * Replaces the native confirm dialog across all CatalystView* components.
 * Mirrors MoveIssueDialog structure: @atlaskit/modal-dialog + @atlaskit/button/new.
 * The caller owns the async archive logic and passes it via onConfirm.
 */
import React from 'react';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';

interface ConfirmArchiveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  issueSummary: string | null | undefined;
  onConfirm: () => void;
}

export function ConfirmArchiveDialog({
  isOpen,
  onClose,
  issueSummary,
  onConfirm,
}: ConfirmArchiveDialogProps) {
  if (!isOpen) return null;

  return (
    <ModalDialog onClose={onClose} width="small">
      <ModalHeader>
        <ModalTitle appearance="warning">Archive issue</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <p style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--ds-text, var(--cp-text-primary, #172B4D))' }}>
          {issueSummary ? (
            <>Archive <strong>{issueSummary.slice(0, 80)}{issueSummary.length > 80 ? '…' : ''}</strong>?</>
          ) : (
            'Archive this issue?'
          )}
        </p>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--ds-text-subtle, var(--cp-text-secondary, #44546F))' }}>
          Archived items can be restored later.
        </p>
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose}>
          Cancel
        </Button>
        <Button appearance="warning" onClick={() => { onConfirm(); onClose(); }}>
          Archive
        </Button>
      </ModalFooter>
    </ModalDialog>
  );
}
