import React, { useState } from 'react';
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

const createOptions = [
  {
    id: 'program' as CreateType,
    label: 'Program',
    description: 'Create a program to house epics',
    Icon: Folder,
    iconColor: '#FF991F',
    iconBg: '#FFF0B3',
  },
  {
    id: 'project' as CreateType,
    label: 'Project',
    description: 'Create a project linked to a program',
    Icon: LayoutGrid,
    iconColor: '#00B8D9',
    iconBg: '#B3F5FF',
  },
  {
    id: 'work-item' as CreateType,
    label: 'Work Item',
    description: 'Create epic, feature, story, defect, etc.',
    Icon: BookOpen,
    iconColor: '#4C9AFF',
    iconBg: '#DEEBFF',
  },
];

export function UnifiedCreateModal({
  isOpen,
  onClose,
  onSelectType,
}: UnifiedCreateModalProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleSelect = (type: CreateType) => {
    onClose();
    setTimeout(() => {
      onSelectType(type);
    }, 0);
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
                {createOptions.map((option, index) => {
                  const Icon = option.Icon;
                  const isHovered = hoveredId === option.id;
                  
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleSelect(option.id)}
                      onMouseEnter={() => setHoveredId(option.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '16px',
                        padding: '16px',
                        background: isHovered ? '#F4F5F7' : 'transparent',
                        border: 'none',
                        borderBottom: index === createOptions.length - 1 ? 'none' : '1px solid #EBECF0',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                        transition: 'background 150ms',
                      }}
                    >
                      <div style={{
                        width: '40px',
                        height: '40px',
                        background: option.iconBg,
                        borderRadius: '3px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Icon
                          size={20}
                          color={option.iconColor}
                        />
                      </div>

                      <div style={{ flex: 1, paddingTop: '2px' }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          color: '#172B4D',
                          marginBottom: '4px',
                        }}>
                          {option.label}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: '#5E6C84',
                          lineHeight: '16px',
                        }}>
                          {option.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
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
