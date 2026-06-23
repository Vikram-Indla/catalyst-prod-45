import React, { useState, useEffect, useRef } from 'react';
import Button from '@atlaskit/button/new';
import TextField from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import { DatePicker } from '@atlaskit/datetime-picker';
import Flag from '@atlaskit/flag';
import { useCreateRelease } from '@/hooks/releases/useCreateRelease';
import { useReleases } from '@/hooks/releases/useReleases';
import { Release, CreateReleasePayload } from '@/types/phase3-releases';

interface ReleaseCreateModalProps {
  isOpen: boolean;
  projectKey: string;
  projectId: string;
  onClose: () => void;
  onSuccess?: (release: Release) => void;
}

export function ReleaseCreateModal({
  isOpen,
  projectKey,
  projectId,
  onClose,
  onSuccess,
}: ReleaseCreateModalProps) {
  const nameFieldRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    release_date: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [flagMessage, setFlagMessage] = useState<{ type: string; text: string } | null>(null);

  const { data: releasesData } = useReleases(projectKey);
  const createMutation = useCreateRelease();

  // Auto-focus name field on modal open
  useEffect(() => {
    if (isOpen && nameFieldRef.current) {
      setTimeout(() => nameFieldRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, [isOpen]);

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
    // Name: uniqueness (case-sensitive per spec)
    else if (
      releasesData?.data?.some(
        (r) => r.name === trimmedName && r.status !== 'archived'
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

    const payload: CreateReleasePayload = {
      project_id: projectId,
      name: formData.name.trim(),
      ...(formData.description.trim() && { description: formData.description.trim() }),
      ...(formData.start_date && { start_date: formData.start_date }),
      ...(formData.release_date && { release_date: formData.release_date }),
    };

    createMutation.mutate(payload, {
      onSuccess: (result) => {
        setFlagMessage({
          type: 'success',
          text: `Release "${result.name}" has been created.`,
        });
        onSuccess?.(result);
        handleClose();
      },
      onError: (error) => {
        setFlagMessage({
          type: 'error',
          text: error.message || 'Failed to create release',
        });
      },
    });
  };

  const handleClose = () => {
    setFormData({ name: '', description: '', start_date: '', release_date: '' });
    setErrors({});
    setFlagMessage(null);
    onClose(); // Call parent's setState(false)
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(9, 30, 66, 0.52)',
          zIndex: 2147483000,
          display: isOpen ? 'flex' : 'none',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={handleClose}
      >
        {/* Modal Container */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'relative',
            width: 480,
            maxHeight: '90vh',
            backgroundColor: 'var(--ds-surface, #FFFFFF)',
            borderRadius: 3,
            boxShadow: '0 20px 32px rgba(9, 30, 66, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 24px',
              borderBottom: '1px solid var(--ds-border, #DFE1E6)',
              flex: '0 0 auto',
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 600,
                color: 'var(--ds-text, #172B4D)',
              }}
            >
              Create release
            </h2>
          </div>

          {/* Body */}
          <div
            style={{
              padding: '24px',
              flex: '1 1 auto',
              overflowY: 'auto',
            }}
          >
            {/* Error/Success Flag */}
            {flagMessage && (
              <Flag
                appearance={flagMessage.type as 'success' | 'error'}
                icon={null}
                onDismissed={() => setFlagMessage(null)}
                title=""
                description={flagMessage.text}
                id={`release-modal-flag-${flagMessage.type}`}
              />
            )}

            <form
              id="release-form"
              onSubmit={handleSubmit}
              aria-label="Create release form"
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
                <DatePicker
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
                <DatePicker
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
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--ds-border, #DFE1E6)',
              display: 'flex',
              gap: '8px',
              justifyContent: 'flex-end',
              flex: '0 0 auto',
            }}
          >
            <Button onClick={handleClose}>Cancel</Button>
            <Button
              appearance="primary"
              isLoading={createMutation.isPending}
              onClick={(e: any) => {
                e.preventDefault();
                const form = document.querySelector('form[id="release-form"]');
                if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
              }}
            >
              Create release
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
