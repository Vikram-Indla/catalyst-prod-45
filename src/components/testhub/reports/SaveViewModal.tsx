/**
 * SaveViewModal — name + share toggle for saving a Reports-hub view.
 * Feature: CAT-REPORTS-HUB-20260703-001 Phase 3 (Task C).
 * Canonical @atlaskit/modal-dialog + textfield + toggle only.
 */
import { useState } from 'react';
import Modal, {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTransition,
} from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/standard-button';
import Textfield from '@atlaskit/textfield';
import Toggle from '@atlaskit/toggle';
import SectionMessage from '@atlaskit/section-message';

interface Props {
  isOpen: boolean;
  reportLabel: string;
  isSaving: boolean;
  error?: Error | null;
  onSave: (name: string, isShared: boolean) => void;
  onClose: () => void;
}

/** Field state lives here so it resets every time the modal mounts. */
function SaveViewModalContent({ reportLabel, isSaving, error, onSave, onClose }: Omit<Props, 'isOpen'>) {
  const [name, setName] = useState('');
  const [isShared, setIsShared] = useState(false);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed, isShared);
  };

  return (
    <Modal onClose={isSaving ? undefined : onClose} width="small">
          <ModalHeader>
            <ModalTitle>Save view</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-200)' }}>
              <div>
                <label
                  htmlFor="save-view-name"
                  style={{
                    display: 'block',
                    fontSize: 'var(--ds-font-size-100)',
                    fontWeight: 600,
                    color: 'var(--ds-text-subtle)',
                    marginBottom: 'var(--ds-space-050)',
                  }}
                >
                  Name
                </label>
                <Textfield
                  id="save-view-name"
                  autoFocus
                  value={name}
                  placeholder={`e.g. ${reportLabel} — weekly review`}
                  onChange={(e) => setName((e.target as HTMLInputElement).value)}
                  isDisabled={isSaving}
                />
              </div>
              <label
                htmlFor="save-view-shared"
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-space-100)', cursor: 'pointer' }}
              >
                <Toggle
                  id="save-view-shared"
                  isChecked={isShared}
                  onChange={() => setIsShared((v) => !v)}
                  isDisabled={isSaving}
                />
                <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text)' }}>
                  Share with everyone
                </span>
              </label>
              {error && (
                <SectionMessage appearance="error" title="Could not save this view">
                  {error.message}
                </SectionMessage>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={onClose} isDisabled={isSaving}>
              Cancel
            </Button>
            <Button appearance="primary" onClick={handleSave} isLoading={isSaving} isDisabled={!name.trim()}>
              Save
            </Button>
          </ModalFooter>
    </Modal>
  );
}

export function SaveViewModal({ isOpen, ...rest }: Props) {
  return (
    <ModalTransition>
      {isOpen && <SaveViewModalContent {...rest} />}
    </ModalTransition>
  );
}

export default SaveViewModal;
