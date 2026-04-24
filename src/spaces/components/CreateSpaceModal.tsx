// ============================================================================
// src/spaces/components/CreateSpaceModal.tsx
// Atlaskit ModalDialog wrapping the wizard. Mounts the SpaceServiceProvider
// with the SupabaseProjectService so the wizard talks to the existing
// `projects` table out of the box.
// ============================================================================

import Modal, {
  ModalBody,
  ModalHeader,
  ModalTitle,
  ModalTransition,
} from '@atlaskit/modal-dialog';
import { Box } from '@atlaskit/primitives';

import { SpaceServiceProvider } from '../services/SpaceServiceContext';
import { supabaseProjectService } from '../services/SupabaseProjectService';
import type { Space, SpaceService } from '../types';
import { CreateSpaceWizard } from './CreateSpaceWizard';

export interface CreateSpaceModalProps {
  /** Controls modal visibility — parent owns this state. */
  isOpen: boolean;
  /** Fired on cancel, ESC, or backdrop click. */
  onClose: () => void;
  /** Fired after the service successfully creates the space. */
  onCreated?: (space: Space) => void;
  /**
   * Override the SpaceService — defaults to the Supabase adapter.
   * Tests inject a MockSpaceService here.
   */
  service?: SpaceService;
}

export function CreateSpaceModal({
  isOpen,
  onClose,
  onCreated,
  service = supabaseProjectService,
}: CreateSpaceModalProps) {
  const handleCreated = (space: Space) => {
    onCreated?.(space);
    onClose();
  };

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onClose} width="medium" shouldScrollInViewport>
          <ModalHeader>
            <ModalTitle>Create project</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <Box paddingBlockEnd="space.100">
              <SpaceServiceProvider service={service}>
                <CreateSpaceWizard onCancel={onClose} onCreated={handleCreated} />
              </SpaceServiceProvider>
            </Box>
          </ModalBody>
        </Modal>
      )}
    </ModalTransition>
  );
}
