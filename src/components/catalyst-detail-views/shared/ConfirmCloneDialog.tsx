/**
 * ConfirmCloneDialog — ADS-compliant clone confirmation.
 *
 * Mirrors ConfirmArchiveDialog pattern exactly.
 * Renders a simple confirm modal before triggering the cloneIssue call.
 * The caller owns the async clone logic and passes it via onConfirm.
 *
 * Pattern: if (!isOpen) return null, then render ModalDialog directly.
 * ModalTransition causes portal containerInfo=null in v14 when always-mounted.
 */
import React from 'react';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';

interface ConfirmCloneDialogProps {
  isOpen: boolean;
  onClose: () => void;
  issueKey: string | null | undefined;
  issueSummary: string | null | undefined;
  onConfirm: () => void;
}

export function ConfirmCloneDialog({
  isOpen,
  onClose,
  issueKey,
  issueSummary,
  onConfirm,
}: ConfirmCloneDialogProps) {
  if (!isOpen) return null;

  const truncated = issueSummary
    ? `${issueSummary.slice(0, 80)}${issueSummary.length > 80 ? '…' : ''}`
    : null;

  return (
    <ModalDialog onClose={onClose} width="small">
      <ModalHeader>
        <ModalTitle>Clone issue</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <p style={{ margin: '0 0 8px', fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text)' }}>
          {issueKey ? (
            <>Clone <strong>{issueKey}</strong>{truncated ? ` — ${truncated}` : ''}?</>
          ) : (
            'Clone this issue?'
          )}
        </p>
        <p style={{ margin: 0, fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtle)' }}>
          A copy will be created with the same fields. You can open it immediately after.
        </p>
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose}>
          Cancel
        </Button>
        <Button appearance="primary" onClick={() => { onConfirm(); onClose(); }}>
          Clone
        </Button>
      </ModalFooter>
    </ModalDialog>
  );
}
