import React, { useState } from 'react';
import Modal, {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTransition,
} from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button';
import { FileText, Zap, Building2, Layers, Ship, X } from 'lucide-react';

export type CreateType = 'issue' | 'epic' | 'program' | 'project' | 'release';

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
  const handleSelect = (type: CreateType) => {
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

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}>
                <CreateOption
                  icon={FileText}
                  iconColor="#4C9AFF"
                  title="Issue"
                  description="Create a new work item (Story, Task, Bug)"
                  onClick={() => handleSelect('issue')}
                />

                <CreateOption
                  icon={Zap}
                  iconColor="#6554C0"
                  title="Epic"
                  description="Create a large body of work in a program"
                  onClick={() => handleSelect('epic')}
                />

                <CreateOption
                  icon={Building2}
                  iconColor="#FFC400"
                  title="Program"
                  description="Create a program to house epics"
                  onClick={() => handleSelect('program')}
                />

                <CreateOption
                  icon={Layers}
                  iconColor="#00B8D9"
                  title="Project"
                  description="Create a project linked to a program"
                  onClick={() => handleSelect('project')}
                />

                <CreateOption
                  icon={Ship}
                  iconColor="#36B37E"
                  title="Release"
                  description="Create a release for version management"
                  onClick={() => handleSelect('release')}
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

interface CreateOptionProps {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  description: string;
  onClick: () => void;
}

function CreateOption({ icon: Icon, iconColor, title, description, onClick }: CreateOptionProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px',
        background: isHovered ? '#F4F5F7' : 'transparent',
        border: '1px solid',
        borderColor: isHovered ? '#0052CC' : '#DFE1E6',
        borderRadius: '3px',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 150ms, border-color 150ms',
        width: '100%',
      }}
    >
      <div style={{
        width: '40px',
        height: '40px',
        background: isHovered ? `${iconColor}20` : '#F4F5F7',
        borderRadius: '3px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'background 150ms',
      }}>
        <Icon
          size={20}
          color={iconColor}
        />
      </div>

      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#172B4D',
          marginBottom: '2px',
        }}>
          {title}
        </div>
        <div style={{
          fontSize: '12px',
          color: '#5E6C84',
          lineHeight: '16px',
        }}>
          {description}
        </div>
      </div>
    </button>
  );
}
