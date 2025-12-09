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

interface OptionProps {
  type: CreateType;
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  description: string;
  onSelect: (type: CreateType) => void;
  hasBorder?: boolean;
}

function OptionButton({ type, icon, iconBg, label, description, onSelect, hasBorder = true }: OptionProps) {
  const handleClick = () => {
    console.log('[OptionButton] handleClick called for:', type);
    onSelect(type);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      style={{
        display: 'block',
        width: '100%',
        padding: 0,
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '16px',
          padding: '16px',
          width: '100%',
          borderBottom: hasBorder ? '1px solid #EBECF0' : 'none',
        }}
      >
        <div style={{
          width: '40px',
          height: '40px',
          background: iconBg,
          borderRadius: '3px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          {icon}
        </div>
        <div style={{ flex: 1, paddingTop: '2px' }}>
          <div style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#172B4D',
            marginBottom: '4px',
          }}>
            {label}
          </div>
          <div style={{
            fontSize: '12px',
            color: '#5E6C84',
            lineHeight: '16px',
            fontWeight: 400,
          }}>
            {description}
          </div>
        </div>
      </div>
    </button>
  );
}

export function UnifiedCreateModal({
  isOpen,
  onClose,
  onSelectType,
}: UnifiedCreateModalProps) {

  const handleSelect = (type: CreateType) => {
    console.log('[UnifiedCreateModal] handleSelect:', type);
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
                <OptionButton
                  type="program"
                  icon={<Folder size={20} color="#FF991F" />}
                  iconBg="#FFF0B3"
                  label="Program"
                  description="Create a program to house epics"
                  onSelect={handleSelect}
                />
                <OptionButton
                  type="project"
                  icon={<LayoutGrid size={20} color="#00B8D9" />}
                  iconBg="#B3F5FF"
                  label="Project"
                  description="Create a project linked to a program"
                  onSelect={handleSelect}
                />
                <OptionButton
                  type="work-item"
                  icon={<BookOpen size={20} color="#4C9AFF" />}
                  iconBg="#DEEBFF"
                  label="Work Item"
                  description="Create epic, feature, story, defect, etc."
                  onSelect={handleSelect}
                  hasBorder={false}
                />
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
