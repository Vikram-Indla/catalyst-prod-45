import React from 'react';
import Modal, {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTransition,
} from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button';
import { X, Folder, LayoutGrid, BookOpen } from 'lucide-react';

export type CreateType = 'program' | 'project' | 'work-item';

interface UnifiedCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (type: CreateType) => void;
}

export function UnifiedCreateModal({
  isOpen,
  onClose,
  onSelectType,
}: UnifiedCreateModalProps) {

  const handleOptionClick = (type: CreateType) => {
    console.log('[UnifiedCreateModal] Option clicked:', type);
    onSelectType(type);
    onClose();
  };

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onClose} width="medium">
          <ModalHeader>
            <ModalTitle>Create</ModalTitle>
            <Button
              appearance="subtle"
              iconBefore={<X size={16} />}
              onClick={onClose}
              aria-label="Close"
            />
          </ModalHeader>

          <ModalBody>
            <div style={{ padding: '8px 0' }}>
              <p style={{
                fontSize: '14px',
                color: '#5E6C84',
                margin: '0 0 16px 0',
              }}>
                What would you like to create?
              </p>

              <div>
                {/* Program Option */}
                <div
                  onClick={() => handleOptionClick('program')}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '16px',
                    padding: '16px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #EBECF0',
                  }}
                  className="hover:bg-gray-100"
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: '#FFF0B3',
                    borderRadius: '3px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Folder size={20} color="#FF991F" />
                  </div>
                  <div style={{ flex: 1, paddingTop: '2px' }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#172B4D',
                      marginBottom: '4px',
                    }}>
                      Program
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#5E6C84',
                      lineHeight: '16px',
                    }}>
                      Create a program to house epics
                    </div>
                  </div>
                </div>

                {/* Project Option */}
                <div
                  onClick={() => handleOptionClick('project')}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '16px',
                    padding: '16px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #EBECF0',
                  }}
                  className="hover:bg-gray-100"
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: '#B3F5FF',
                    borderRadius: '3px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <LayoutGrid size={20} color="#00B8D9" />
                  </div>
                  <div style={{ flex: 1, paddingTop: '2px' }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#172B4D',
                      marginBottom: '4px',
                    }}>
                      Project
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#5E6C84',
                      lineHeight: '16px',
                    }}>
                      Create a project linked to a program
                    </div>
                  </div>
                </div>

                {/* Work Item Option */}
                <div
                  onClick={() => handleOptionClick('work-item')}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '16px',
                    padding: '16px',
                    cursor: 'pointer',
                  }}
                  className="hover:bg-gray-100"
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: '#DEEBFF',
                    borderRadius: '3px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <BookOpen size={20} color="#4C9AFF" />
                  </div>
                  <div style={{ flex: 1, paddingTop: '2px' }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#172B4D',
                      marginBottom: '4px',
                    }}>
                      Work Item
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#5E6C84',
                      lineHeight: '16px',
                    }}>
                      Create epic, feature, story, defect, etc.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ModalBody>

          <ModalFooter>
            <Button appearance="subtle" onClick={onClose}>
              Cancel
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
}
