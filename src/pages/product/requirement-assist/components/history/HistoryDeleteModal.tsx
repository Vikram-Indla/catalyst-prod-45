import React, { useCallback } from 'react';
import Modal, {
  ModalTransition,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button';

interface HistoryDeleteModalProps {
  isOpen: boolean;
  title: string;
  isBulk?: boolean;
  count?: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function HistoryDeleteModal({
  isOpen,
  title,
  isBulk = false,
  count = 1,
  onConfirm,
  onCancel,
}: HistoryDeleteModalProps) {
  const handleClose = useCallback(() => {
    onCancel();
  }, [onCancel]);

  const truncatedTitle = title.length > 40 ? title.substring(0, 40) + '...' : title;

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={handleClose} width="small">
          <ModalHeader>
            <ModalTitle appearance="danger">
              {isBulk ? 'Delete Generations' : 'Delete Generation'}
            </ModalTitle>
          </ModalHeader>
          <ModalBody>
            <p>
              {isBulk ? (
                <>
                  Are you sure you want to delete <strong>{count} generations</strong>? This action
                  cannot be undone.
                </>
              ) : (
                <>
                  Are you sure you want to delete "<strong>{truncatedTitle}</strong>"? This action cannot be
                  undone.
                </>
              )}
            </p>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={handleClose}>
              Cancel
            </Button>
            <Button appearance="danger" onClick={onConfirm}>
              Delete
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
}
