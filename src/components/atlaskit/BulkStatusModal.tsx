import { useState } from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import { Radio } from '@atlaskit/radio';
import Button from '@atlaskit/button';
import { token } from '@atlaskit/tokens';
import { PROCESS_STEPS } from '@/types/business-request';

interface BulkStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (status: string) => void;
  selectedCount: number;
}

export function BulkStatusModal({ isOpen, onClose, onConfirm, selectedCount }: BulkStatusModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  const handleConfirm = () => {
    if (selectedStatus) {
      onConfirm(selectedStatus);
      onClose();
    }
  };

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onClose}>
          <ModalHeader>
            <ModalTitle>Update Status</ModalTitle>
          </ModalHeader>
          
          <ModalBody>
            <p style={{ 
              marginBottom: token('space.200', '16px'),
              color: token('color.text.subtle', '#6B778C'),
              fontSize: '14px',
            }}>
              Change status for {selectedCount} selected request{selectedCount > 1 ? 's' : ''}
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: token('space.150', '12px') }}>
              {PROCESS_STEPS.map((step) => (
                <Radio
                  key={step.value}
                  value={step.value}
                  label={step.label}
                  name="bulk-status"
                  isChecked={selectedStatus === step.value}
                  onChange={() => setSelectedStatus(step.value)}
                />
              ))}
            </div>
          </ModalBody>
          
          <ModalFooter>
            <Button appearance="subtle" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              appearance="primary" 
              onClick={handleConfirm}
              isDisabled={!selectedStatus}
            >
              Update {selectedCount} Request{selectedCount > 1 ? 's' : ''}
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
}

export default BulkStatusModal;
