/**
 * ReleaseCreateModal — Project Work Hub (route /project-hub/:key/releases)
 *
 * Rebuilt 2026-06-23 on @atlaskit/modal-dialog + @atlaskit/textarea +
 * @atlaskit/datetime-picker (was a custom overlay + <input type="date">).
 * Captures basic release fields: name, description, start_date, release_date.
 */
import React, { useState, useEffect } from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import { DatePicker } from '@atlaskit/datetime-picker';
import { useCreateRelease } from '@/hooks/releases/useCreateRelease';
import { Release, CreateReleasePayload } from '@/types/phase3-releases';
import { catalystToast } from '@/lib/catalystToast';

interface ReleaseCreateModalProps {
  isOpen: boolean;
  projectKey: string;
  projectId: string;
  onClose: () => void;
  onSuccess?: (release: Release) => void;
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontWeight: 500,
  fontSize: 12,
  color: 'var(--ds-text, #172B4D)',
  marginBottom: 6,
};

const errStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--ds-text-danger, #AE2A19)',
  marginTop: 4,
};

export function ReleaseCreateModal({
  isOpen,
  projectKey,
  projectId,
  onClose,
  onSuccess,
}: ReleaseCreateModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    release_date: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const createMutation = useCreateRelease();

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    const trimmedName = formData.name.trim();

    // Name: required
    if (!trimmedName) {
      newErrors.name = 'Release name is required';
    } else if (trimmedName.length > 255) {
      newErrors.name = 'Release name must not exceed 255 characters';
    }

    // Release date: required
    if (!formData.release_date) {
      newErrors.release_date = 'Release date is required';
    }

    // Date range: start_date <= release_date
    if (formData.start_date && formData.release_date) {
      const startDate = new Date(formData.start_date);
      const releaseDate = new Date(formData.release_date);
      if (startDate > releaseDate) {
        newErrors.release_date = 'Release date must be on or after start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    setSubmitted(true);
    if (!validate()) return;

    const payload: CreateReleasePayload = {
      project_id: projectId,
      name: formData.name.trim(),
      ...(formData.description.trim() && { description: formData.description.trim() }),
      ...(formData.start_date && { start_date: formData.start_date }),
      ...(formData.release_date && { release_date: formData.release_date }),
    };

    createMutation.mutate(payload, {
      onSuccess: (result) => {
        catalystToast.success(`Release "${result.name}" created`);
        onSuccess?.(result);
        handleClose();
      },
      onError: (error: any) => {
        catalystToast.error(error?.message || 'Failed to create release');
      },
    });
  };

  const handleClose = () => {
    setFormData({ name: '', description: '', start_date: '', release_date: '' });
    setErrors({});
    setSubmitted(false);
    onClose();
  };

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={handleClose} width="medium">
          <ModalHeader hasCloseButton>
            <ModalTitle>Create release</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Release Name */}
              <div>
                <label style={labelStyle} htmlFor="release-name">
                  Name <span style={{ color: 'var(--ds-text-danger, #AE2A19)' }}>*</span>
                </label>
                <Textfield
                  id="release-name"
                  placeholder="e.g., v2.1.0"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData((p) => ({ ...p, name: e.currentTarget.value }));
                    if (errors.name) setErrors((p) => ({ ...p, name: '' }));
                  }}
                  maxLength={255}
                  autoFocus
                  required
                  aria-required="true"
                  aria-invalid={submitted && !!errors.name}
                  aria-describedby={submitted && errors.name ? 'name-error' : undefined}
                />
                {submitted && errors.name && (
                  <div id="name-error" role="alert" style={errStyle}>
                    {errors.name}
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label style={labelStyle} htmlFor="release-description">
                  Description
                </label>
                <TextArea
                  id="release-description"
                  placeholder="Optional release notes"
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.currentTarget.value }))}
                  rows={3}
                />
              </div>

              {/* Start Date */}
              <div>
                <label style={labelStyle} htmlFor="release-start-date">
                  Start date
                </label>
                <DatePicker
                  id="release-start-date"
                  value={formData.start_date}
                  onChange={(isoDate: string) => setFormData((p) => ({ ...p, start_date: isoDate }))}
                  formatDisplayLabel="yyyy-MM-dd"
                />
              </div>

              {/* Release Date */}
              <div>
                <label style={labelStyle} htmlFor="release-date">
                  Release date <span style={{ color: 'var(--ds-text-danger, #AE2A19)' }}>*</span>
                </label>
                <DatePicker
                  id="release-date"
                  value={formData.release_date}
                  onChange={(isoDate: string) => {
                    setFormData((p) => ({ ...p, release_date: isoDate }));
                    if (errors.release_date) setErrors((p) => ({ ...p, release_date: '' }));
                  }}
                  formatDisplayLabel="yyyy-MM-dd"
                />
                {submitted && errors.release_date && (
                  <div id="release-date-error" role="alert" style={errStyle}>
                    {errors.release_date}
                  </div>
                )}
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              appearance="primary"
              isLoading={createMutation.isPending}
              isDisabled={createMutation.isPending}
              onClick={handleSubmit}
            >
              Create release
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
}
