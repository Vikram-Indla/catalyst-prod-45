import React, { useState, useEffect, useRef } from 'react';
import Modal, {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import TextField from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import { DatePicker as AkDatePicker } from '@atlaskit/datetime-picker';
import Flag from '@atlaskit/flag';
import { useUpdateRelease } from '@/hooks/releases/useUpdateRelease';
import { useReleases } from '@/hooks/releases/useReleases';
import { Release, UpdateReleasePayload } from '@/types/phase3-releases';
import { SprintLinker } from './SprintLinker';

interface ReleaseEditModalProps {
  isOpen: boolean;
  release: Release;
  projectKey: string;
  onClose: () => void;
  onSuccess?: (release: Release) => void;
}

export function ReleaseEditModal({
  isOpen,
  release,
  projectKey,
  onClose,
  onSuccess,
}: ReleaseEditModalProps) {
  const nameFieldRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: release.name,
    description: release.description || '',
    start_date: release.start_date || '',
    release_date: release.release_date || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [flagMessage, setFlagMessage] = useState<{ type: string; text: string } | null>(null);

  const { data: releasesData } = useReleases(projectKey);
  const updateMutation = useUpdateRelease(release.id);

  // Auto-focus name field on modal open
  useEffect(() => {
    if (isOpen && nameFieldRef.current) {
      setTimeout(() => nameFieldRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset form when release prop changes
  useEffect(() => {
    setFormData({
      name: release.name,
      description: release.description || '',
      start_date: release.start_date || '',
      release_date: release.release_date || '',
    });
    setErrors({});
  }, [release, isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    const trimmedName = formData.name.trim();

    // Name: required
    if (!trimmedName) {
      newErrors.name = 'You must specify a version name';
    }
    // Name: max 255 chars
    else if (trimmedName.length > 255) {
      newErrors.name = 'The version name must not exceed 255 characters';
    }
    // Name: uniqueness (excluding self)
    else if (
      releasesData?.data?.some(
        (r) => r.name === trimmedName && r.id !== release.id && r.status !== 'archived'
      )
    ) {
      newErrors.name = 'A version with this name already exists in this project.';
    }

    // Date range: start_date <= release_date
    if (formData.start_date && formData.release_date) {
      const startDate = new Date(formData.start_date);
      const releaseDate = new Date(formData.release_date);
      if (startDate > releaseDate) {
        newErrors.release_date = 'The release date must be after the start date.';
      }
    }

    // Date format: ISO 8601 (basic check)
    if (formData.start_date && !/^\d{4}-\d{2}-\d{2}$/.test(formData.start_date)) {
      newErrors.start_date = 'The date you entered is not valid.';
    }
    if (formData.release_date && !/^\d{4}-\d{2}-\d{2}$/.test(formData.release_date)) {
      newErrors.release_date = 'The date you entered is not valid.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload: UpdateReleasePayload = {
      name: formData.name.trim(),
      ...(formData.description.trim() && { description: formData.description.trim() }),
      ...(formData.start_date && { start_date: formData.start_date }),
      ...(formData.release_date && { release_date: formData.release_date }),
    };

    updateMutation.mutate(payload, {
      onSuccess: (result) => {
        setFlagMessage({
          type: 'success',
          text: `Release "${result.name}" has been updated.`,
        });
        onSuccess?.(result);
        onClose();
      },
      onError: (error) => {
        setFlagMessage({
          type: 'error',
          text: error.message || 'Failed to update release',
        });
      },
    });
  };

  const handleClose = () => {
    // Reset form
    setFormData({
      name: release.name,
      description: release.description || '',
      start_date: release.start_date || '',
      release_date: release.release_date || '',
    });
    setErrors({});
    onClose();
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
          id={`release-edit-modal-flag-${flagMessage.type}`}
        />
      )}

      <Modal isOpen={isOpen} onClose={handleClose} width={867}>
        <ModalHeader>
          <ModalTitle>Edit release</ModalTitle>
        </ModalHeader>

        <ModalBody>
          <form
            onSubmit={handleSubmit}
            aria-label="Edit release form"
            noValidate
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            {/* Version Name Field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label
                htmlFor="version-name"
                style={{
                  fontWeight: 500,
                  color: 'var(--ds-text, #172B4D)',
                }}
              >
                Name
                <span
                  aria-label="required"
                  style={{
                    color: 'var(--ds-text-danger, #AE2A19)',
                    marginLeft: '4px',
                  }}
                >
                  *
                </span>
              </label>
              <TextField
                ref={nameFieldRef}
                id="version-name"
                placeholder="e.g., v2.1.0"
                value={formData.name}
                onChange={(e) => {
                  setFormData((p) => ({ ...p, name: e.currentTarget.value }));
                  // Clear error on change
                  if (errors.name) setErrors((p) => ({ ...p, name: '' }));
                }}
                isInvalid={!!errors.name}
                maxLength={255}
                required
                aria-required="true"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'name-error' : undefined}
              />
              {errors.name && (
                <div
                  id="name-error"
                  role="alert"
                  aria-live="assertive"
                  style={{
                    color: 'var(--ds-text-danger, #AE2A19)',
                    marginTop: '4px',
                  }}
                >
                  {errors.name}
                </div>
              )}
            </div>

            {/* Description Field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label
                htmlFor="version-description"
                style={{
                  fontWeight: 500,
                  color: 'var(--ds-text, #172B4D)',
                }}
              >
                Description
              </label>
              <TextArea
                id="version-description"
                placeholder="Optional description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, description: e.currentTarget.value }))
                }
                rows={3}
              />
            </div>

            {/* Sprints Linker */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label
                style={{
                  fontWeight: 500,
                  color: 'var(--ds-text, #172B4D)',
                }}
              >
                Sprints
              </label>
              <SprintLinker
                releaseId={release.id}
                projectKey={projectKey}
              />
            </div>

            {/* Start Date Field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label
                htmlFor="version-start-date"
                style={{
                  fontWeight: 500,
                  color: 'var(--ds-text, #172B4D)',
                }}
              >
                Start date
              </label>
              <AkDatePicker
                id="version-start-date"
                value={formData.start_date}
                onChange={(e) => {
                  setFormData((p) => ({ ...p, start_date: e.iso || '' }));
                  if (errors.start_date) setErrors((p) => ({ ...p, start_date: '' }));
                }}
                formatDisplayLabel={(value) => value || 'Select start date'}
              />
              {errors.start_date && (
                <div
                  role="alert"
                  aria-live="assertive"
                  style={{
                    color: 'var(--ds-text-danger, #AE2A19)',
                    marginTop: '4px',
                  }}
                >
                  {errors.start_date}
                </div>
              )}
            </div>

            {/* Release Date Field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label
                htmlFor="version-release-date"
                style={{
                  fontWeight: 500,
                  color: 'var(--ds-text, #172B4D)',
                }}
              >
                Release date
              </label>
              <AkDatePicker
                id="version-release-date"
                value={formData.release_date}
                onChange={(e) => {
                  setFormData((p) => ({ ...p, release_date: e.iso || '' }));
                  if (errors.release_date) setErrors((p) => ({ ...p, release_date: '' }));
                }}
                formatDisplayLabel={(value) => value || 'Select release date'}
              />
              {errors.release_date && (
                <div
                  role="alert"
                  aria-live="assertive"
                  style={{
                    color: 'var(--ds-text-danger, #AE2A19)',
                    marginTop: '4px',
                  }}
                >
                  {errors.release_date}
                </div>
              )}
            </div>
          </form>
        </ModalBody>

        <ModalFooter>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            appearance="primary"
            onClick={handleSubmit}
            isLoading={updateMutation.isPending}
          >
            Update release
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
