import React, { useState, useMemo } from 'react';
import Modal, {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Select from '@atlaskit/select';
import Flag from '@atlaskit/flag';
import { useReleases } from '@/hooks/releases/useReleases';
import { Release } from '@/types/phase3-releases';
import { useQueryClient } from '@tanstack/react-query';

interface ReleaseDeleteDialogProps {
  isOpen: boolean;
  release: Release;
  projectKey: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ReleaseDeleteDialog({
  isOpen,
  release,
  projectKey,
  onClose,
  onSuccess,
}: ReleaseDeleteDialogProps) {
  const [fixVersionAction, setFixVersionAction] = useState<'move' | 'remove' | null>(null);
  const [affectedVersionAction, setAffectedVersionAction] = useState<'move' | 'remove' | null>(null);
  const [moveToFixVersionId, setMoveToFixVersionId] = useState<string | null>(null);
  const [moveToAffectedVersionId, setMoveToAffectedVersionId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [flagMessage, setFlagMessage] = useState<{ type: string; text: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: releasesData } = useReleases(projectKey);
  const queryClient = useQueryClient();

  // Filter to non-archived versions, exclude self
  const targetVersionOptions = useMemo(() => {
    return (releasesData?.data || [])
      .filter((r) => r.status !== 'archived' && r.id !== release.id)
      .map((r) => ({ label: r.name, value: r.id }));
  }, [releasesData, release.id]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Must select action for fix_version
    if (!fixVersionAction) {
      newErrors.fixVersionAction = 'You must select action for fix version.';
    }
    if (fixVersionAction === 'move' && !moveToFixVersionId) {
      newErrors.moveToFixVersion = 'You must select target version.';
    }

    // Must select action for affected_version
    if (!affectedVersionAction) {
      newErrors.affectedVersionAction = 'You must select action for affected version.';
    }
    if (affectedVersionAction === 'move' && !moveToAffectedVersionId) {
      newErrors.moveToAffectedVersion = 'You must select target version.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsDeleting(true);
    try {
      const payload: any = {
        fix_version_action: fixVersionAction,
        affected_version_action: affectedVersionAction,
      };

      if (fixVersionAction === 'move') {
        payload.move_to_fix_version_id = moveToFixVersionId;
      }
      if (affectedVersionAction === 'move') {
        payload.move_to_affected_version_id = moveToAffectedVersionId;
      }

      const res = await fetch(`/api/releases/${release.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.details || 'Failed to delete release');
      }

      setFlagMessage({
        type: 'success',
        text: `Version ${release.name} has been deleted.`,
      });

      queryClient.invalidateQueries({ queryKey: ['releases', projectKey] });
      onSuccess?.();
      setTimeout(() => onClose(), 600);
    } catch (error) {
      setFlagMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to delete version',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setFixVersionAction(null);
    setAffectedVersionAction(null);
    setMoveToFixVersionId(null);
    setMoveToAffectedVersionId(null);
    setErrors({});
    onClose();
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} width={600}>
        <ModalHeader>
          <ModalTitle>Delete version: {release.name}</ModalTitle>
        </ModalHeader>

        <ModalBody>
          <div style={{ marginBottom: '24px' }}>
            <p style={{ color: 'var(--ds-text, #172B4D)', fontSize: '14px', margin: '0 0 16px 0' }}>
              Any issues with a fix version or affected version of {release.name} will be updated.
            </p>

            {/* Fix Version Radio Group */}
            <div style={{ marginBottom: '24px' }}>
              <h3
                style={{
                  color: 'var(--ds-text, #172B4D)',
                  fontSize: '14px',
                  fontWeight: 500,
                  marginBottom: '12px',
                }}
              >
                Fix version
              </h3>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                  <input
                    type="radio"
                    name="fix-version-action"
                    value="move"
                    checked={fixVersionAction === 'move'}
                    onChange={(e) => setFixVersionAction(e.target.value as 'move')}
                    style={{ marginRight: '8px' }}
                  />
                  <span style={{ color: 'var(--ds-text, #172B4D)', fontSize: '14px' }}>
                    Move to:
                  </span>
                </label>

                {fixVersionAction === 'move' && (
                  <div style={{ marginLeft: '24px', marginBottom: '12px' }}>
                    <Select
                      options={targetVersionOptions}
                      value={
                        targetVersionOptions.find((opt) => opt.value === moveToFixVersionId) || null
                      }
                      onChange={(opt) => setMoveToFixVersionId(opt?.value || null)}
                      placeholder="Select version..."
                      isClearable={false}
                    />
                    {errors.moveToFixVersion && (
                      <div
                        style={{
                          color: 'var(--ds-text-danger, #AE2A19)',
                          fontSize: '12px',
                          marginTop: '4px',
                        }}
                        role="alert"
                      >
                        {errors.moveToFixVersion}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <label style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="radio"
                  name="fix-version-action"
                  value="remove"
                  checked={fixVersionAction === 'remove'}
                  onChange={(e) => setFixVersionAction(e.target.value as 'remove')}
                  style={{ marginRight: '8px' }}
                />
                <span style={{ color: 'var(--ds-text, #172B4D)', fontSize: '14px' }}>
                  Remove from all issues
                </span>
              </label>

              {errors.fixVersionAction && (
                <div
                  style={{
                    color: 'var(--ds-text-danger, #AE2A19)',
                    fontSize: '12px',
                    marginTop: '8px',
                  }}
                  role="alert"
                >
                  {errors.fixVersionAction}
                </div>
              )}
            </div>

            {/* Affected Version Radio Group */}
            <div style={{ marginBottom: '24px' }}>
              <h3
                style={{
                  color: 'var(--ds-text, #172B4D)',
                  fontSize: '14px',
                  fontWeight: 500,
                  marginBottom: '12px',
                }}
              >
                Affected version
              </h3>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                  <input
                    type="radio"
                    name="affected-version-action"
                    value="move"
                    checked={affectedVersionAction === 'move'}
                    onChange={(e) => setAffectedVersionAction(e.target.value as 'move')}
                    style={{ marginRight: '8px' }}
                  />
                  <span style={{ color: 'var(--ds-text, #172B4D)', fontSize: '14px' }}>
                    Move to:
                  </span>
                </label>

                {affectedVersionAction === 'move' && (
                  <div style={{ marginLeft: '24px', marginBottom: '12px' }}>
                    <Select
                      options={targetVersionOptions}
                      value={
                        targetVersionOptions.find(
                          (opt) => opt.value === moveToAffectedVersionId
                        ) || null
                      }
                      onChange={(opt) => setMoveToAffectedVersionId(opt?.value || null)}
                      placeholder="Select version..."
                      isClearable={false}
                    />
                    {errors.moveToAffectedVersion && (
                      <div
                        style={{
                          color: 'var(--ds-text-danger, #AE2A19)',
                          fontSize: '12px',
                          marginTop: '4px',
                        }}
                        role="alert"
                      >
                        {errors.moveToAffectedVersion}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <label style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="radio"
                  name="affected-version-action"
                  value="remove"
                  checked={affectedVersionAction === 'remove'}
                  onChange={(e) => setAffectedVersionAction(e.target.value as 'remove')}
                  style={{ marginRight: '8px' }}
                />
                <span style={{ color: 'var(--ds-text, #172B4D)', fontSize: '14px' }}>
                  Remove from all issues
                </span>
              </label>

              {errors.affectedVersionAction && (
                <div
                  style={{
                    color: 'var(--ds-text-danger, #AE2A19)',
                    fontSize: '12px',
                    marginTop: '8px',
                  }}
                  role="alert"
                >
                  {errors.affectedVersionAction}
                </div>
              )}
            </div>

            {/* Warning */}
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: 'var(--ds-background-danger-subtle, #FFEBE6)',
                border: '1px solid var(--ds-border-danger, #F87462)',
                borderRadius: '3px',
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: 'var(--ds-text-danger, #AE2A19)',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                This action cannot be undone.
              </p>
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button appearance="subtle" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            appearance="danger"
            onClick={handleSubmit}
            isLoading={isDeleting}
          >
            Delete
          </Button>
        </ModalFooter>
      </Modal>

      {flagMessage && (
        <Flag
          id={`flag-${Date.now()}`}
          icon={flagMessage.type === 'success' ? undefined : undefined}
          title={flagMessage.text}
          isDismissed={false}
          onDismissed={() => setFlagMessage(null)}
          appearance={flagMessage.type as any}
        />
      )}
    </>
  );
}
