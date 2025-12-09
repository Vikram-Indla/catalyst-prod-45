import { useState } from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import { Radio } from '@atlaskit/radio';
import Button from '@atlaskit/button';
import { token } from '@atlaskit/tokens';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport?: (format: 'csv' | 'excel' | 'pdf') => void;
}

export function ExportModal({ isOpen, onClose, onExport }: ExportModalProps) {
  const [format, setFormat] = useState<'csv' | 'excel' | 'pdf'>('csv');

  const handleExport = () => {
    onExport?.(format);
    onClose();
  };

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onClose}>
          <ModalHeader>
            <ModalTitle>Export Requests</ModalTitle>
          </ModalHeader>
          
          <ModalBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: token('space.200', '16px') }}>
              <Radio
                value="csv"
                label="CSV (.csv)"
                name="export-format"
                isChecked={format === 'csv'}
                onChange={() => setFormat('csv')}
              />
              <Radio
                value="excel"
                label="Excel (.xlsx)"
                name="export-format"
                isChecked={format === 'excel'}
                onChange={() => setFormat('excel')}
              />
              <Radio
                value="pdf"
                label="PDF (.pdf)"
                name="export-format"
                isChecked={format === 'pdf'}
                onChange={() => setFormat('pdf')}
              />
            </div>
            
            <div style={{
              marginTop: token('space.300', '24px'),
              padding: token('space.200', '16px'),
              background: token('color.background.information', '#DEEBFF'),
              borderRadius: '3px',
              fontSize: '12px',
              color: token('color.text.information', '#0747A6'),
              display: 'flex',
              alignItems: 'flex-start',
              gap: token('space.100', '8px'),
            }}>
              <span>ℹ️</span>
              <span>Export will include all visible columns and filtered data.</span>
            </div>
          </ModalBody>
          
          <ModalFooter>
            <Button appearance="subtle" onClick={onClose}>
              Cancel
            </Button>
            <Button appearance="primary" onClick={handleExport}>
              Export
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
}

export default ExportModal;
