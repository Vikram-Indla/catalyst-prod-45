/**
 * ConfirmDeleteDialog — ADS-compliant destructive-action confirmation.
 *
 * Mirrors ConfirmArchiveDialog structure: @atlaskit/modal-dialog + @atlaskit/button/new.
 * Uses appearance="danger" to signal irreversibility — Jira's canonical delete modal
 * pattern (probed against digital-transformation.atlassian.net delete flow).
 *
 * Pattern: if (!isOpen) return null, then render ModalDialog directly — matches the
 * working MoveIssueDialog pattern. ModalTransition causes portal containerInfo=null
 * in v14 when the component is always-mounted.
 *
 * The caller owns the async delete logic via onConfirm. Dialog closes itself after
 * calling onConfirm so the mutation's onSuccess (toast + query invalidation) takes over.
 */
import React from 'react';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';

interface ConfirmDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** e.g. "BAU-5962" — shown in bold in the dialog body */
  issueKey: string | null | undefined;
  /** Shown truncated after the key */
  issueSummary: string | null | undefined;
  /** e.g. "story" | "epic" | "task" — used in the modal title */
  typeLabel: string;
  /** Called when the user confirms. Dialog closes immediately after calling this. */
  onConfirm: () => void;
}

export function ConfirmDeleteDialog({
  isOpen,
  onClose,
  issueKey,
  issueSummary,
  typeLabel,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  if (!isOpen) return null;

  const truncated = issueSummary
    ? `${issueSummary.slice(0, 80)}${issueSummary.length > 80 ? '…' : ''}`
    : null;

  return (
    <ModalDialog onClose={onClose} width="small">
      <ModalHeader>
        <ModalTitle appearance="danger">Delete {typeLabel}</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <p style={{ margin: '0 0 8px', fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text)' }}>
          {issueKey ? (
            <>
              Delete <strong>{issueKey}</strong>
              {truncated ? ` — ${truncated}` : ''}?
            </>
          ) : (
            `Delete this ${typeLabel}?`
          )}
        </p>
        <p style={{ margin: 0, fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtle)' }}>
          This action can't be undone.
        </p>
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose}>
          Cancel
        </Button>
        <Button
          appearance="danger"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          Delete
        </Button>
      </ModalFooter>
    </ModalDialog>
  );
}
