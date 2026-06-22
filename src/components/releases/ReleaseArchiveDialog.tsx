import React, { useState } from 'react';
import Modal, {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Flag from '@atlaskit/flag';
import { Release } from '@/types/phase3-releases';
import { useQueryClient } from '@tanstack/react-query';

interface ReleaseArchiveDialogProps {
  isOpen: boolean;
  release: Release;
  onClose: () => void;
  onSuccess?: (release: Release) => void;
}

export function ReleaseArchiveDialog({
  isOpen,
  release,
  onClose,
  onSuccess,
}: ReleaseArchiveDialogProps) {
  const [flagMessage, setFlagMessage] = useState<{ type: string; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleArchive = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/releases/${release.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.details || `Archive failed: ${res.statusText}`);
      }

      const result = await res.json();
      setFlagMessage({
        type: 'success',
        text: `Version ${release.name} has been archived.`,
      });

      // Invalidate releases list
      queryClient.invalidateQueries({ queryKey: ['releases', release.project_id] });

      onSuccess?.(result);
      onClose();
    } catch (error) {
      setFlagMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to archive release',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Error/Success Flag */}
      {flagMessage && (
        <Flag
          appearance={flagMessage.type as 'success' | 'error'}
          icon={null}
          onDismissed={() => setFlagMessage(null)}
          title=""
          description={flagMessage.text}
          id={`release-archive-flag-${flagMessage.type}`}
        />
      )}

      <Modal isOpen={isOpen} onClose={onClose} width={480}>
        <ModalHeader>
          <ModalTitle>Archive release?</ModalTitle>
        </ModalHeader>

        <ModalBody>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              color: 'var(--ds-text, #172B4D)',
            }}
          >
            <p style={{ margin: 0 }}>
              Archive version <strong>{release.name}</strong>?
            </p>
            <p style={{ margin: 0, color: 'var(--ds-text-subtle, #42526E)' }}>
              Archived versions are hidden from most views but can be restored later.
            </p>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            appearance="danger"
            onClick={handleArchive}
            isLoading={isLoading}
          >
            Archive
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
