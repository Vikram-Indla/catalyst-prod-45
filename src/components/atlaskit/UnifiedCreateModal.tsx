import React from 'react';
import { token } from '@atlaskit/tokens';
import Modal, {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTransition,
} from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import FolderIcon from '@atlaskit/icon/glyph/folder';
import BoardIcon from '@atlaskit/icon/glyph/board';
import BookIcon from '@atlaskit/icon/glyph/book';

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
    Icon: FolderIcon,
    iconColor: token('color.icon.warning', '#FF991F'),
    iconBg: token('color.background.warning', '#FFF0B3'),
  },
  {
    id: 'project' as CreateType,
    label: 'Project',
    description: 'Create a project linked to a program',
    Icon: BoardIcon,
    iconColor: token('color.icon.information', '#00B8D9'),
    iconBg: token('color.background.information', '#B3F5FF'),
  },
  {
    id: 'work-item' as CreateType,
    label: 'Work Item',
    description: 'Create epic, feature, story, defect, etc.',
    Icon: BookIcon,
    iconColor: token('color.icon.discovery', '#6554C0'),
    iconBg: token('color.background.discovery', '#EAE6FF'),
  },
];

export function UnifiedCreateModal({
  isOpen,
  onClose,
  onSelectType,
}: UnifiedCreateModalProps) {
  const handleOptionClick = (type: CreateType) => {
    onSelectType(type);
    setTimeout(() => onClose(), 0);
  };

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onClose} width="medium">
          <ModalHeader>
            <ModalTitle>Create</ModalTitle>
            <Button
              appearance="subtle"
              iconBefore={<CrossIcon label="Close" size="small" />}
              onClick={onClose}
            />
          </ModalHeader>

          <ModalBody>
            <p style={{
              fontSize: '14px',
              color: token('color.text.subtlest', '#6B778C'),
              margin: `0 0 ${token('space.200', '16px')} 0`,
            }}>
              What would you like to create?
            </p>

            <div>
              {createOptions.map((option, index) => {
                const Icon = option.Icon;
                return (
                  <button
                    key={option.id}
                    onClick={() => handleOptionClick(option.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: token('space.200', '16px'),
                      padding: token('space.200', '16px'),
                      background: 'transparent',
                      border: 'none',
                      borderBottom: index === createOptions.length - 1
                        ? 'none'
                        : `1px solid ${token('color.border', '#DFE1E6')}`,
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      transition: 'background 150ms',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = token('color.background.neutral.hovered', '#F4F5F7');
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
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
                        label={option.label}
                        size="medium"
                        primaryColor={option.iconColor}
                      />
                    </div>

                    <div style={{ flex: 1, paddingTop: '2px' }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: token('color.text', '#172B4D'),
                        marginBottom: token('space.050', '4px'),
                      }}>
                        {option.label}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: token('color.text.subtlest', '#6B778C'),
                        lineHeight: '16px',
                      }}>
                        {option.description}
                      </div>
                    </div>
                  </button>
                );
              })}
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
