import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button';
import { token } from '@atlaskit/tokens';
import WarningIcon from '@atlaskit/icon/glyph/warning';

interface BulkDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  selectedCount: number;
}

export function BulkDeleteModal({ isOpen, onClose, onConfirm, selectedCount }: BulkDeleteModalProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onClose}>
          <ModalHeader>
            <ModalTitle appearance="danger">Delete Requests</ModalTitle>
          </ModalHeader>
          
          <ModalBody>
            <div style={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              gap: token('space.200', '16px'),
            }}>
              <div style={{
                padding: token('space.100', '8px'),
                background: token('color.background.danger', '#FFEBE6'),
                borderRadius: '50%',
                flexShrink: 0,
              }}>
                <WarningIcon label="Warning" primaryColor={token('color.icon.danger', '#DE350B')} />
              </div>
              <div>
                <p style={{ 
                  margin: 0,
                  marginBottom: token('space.100', '8px'),
                  color: token('color.text', '#172B4D'),
                  fontSize: '14px',
                  fontWeight: 500,
                }}>
                  Are you sure you want to delete {selectedCount} request{selectedCount > 1 ? 's' : ''}?
                </p>
                <p style={{ 
                  margin: 0,
                  color: token('color.text.subtle', '#6B778C'),
                  fontSize: '14px',
                }}>
                  This action cannot be undone. All associated data, comments, and attachments will be permanently removed.
                </p>
              </div>
            </div>
          </ModalBody>
          
          <ModalFooter>
            <Button appearance="subtle" onClick={onClose}>
              Cancel
            </Button>
            <Button appearance="danger" onClick={handleConfirm}>
              Delete {selectedCount} Request{selectedCount > 1 ? 's' : ''}
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
}

export default BulkDeleteModal;
