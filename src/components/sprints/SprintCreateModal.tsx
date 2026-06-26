/**
 * SprintCreateModal — Create or Edit sprint dialog.
 *
 * 2026-06-26: Phase 1 (MVP) clone of ReleaseCreateModal with Project picker
 * instead of Product picker, writes to ph_jira_sprints via generic entity
 * hooks. Same UI / same form / same validation rules.
 *
 * Per CLAUDE.md "ADOPT CANONICAL — DO NOT REIMPLEMENT": this is a focused
 * adapter, not a parallel reimplementation. Reuses ProductSelect (label
 * agnostic), CatalystDatePicker, ADS modal primitives. Only the data
 * source (table, scope) + labels differ from the release modal.
 */
import React, { useState, useMemo, useEffect } from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import { catalystFlag } from '@/lib/catalystFlag';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';
import { ProductSelect, type ProductOption } from '@/components/releases/ReleaseFilters';
import { useCreateSprint, useUpdateSprint } from '@/hooks/workhub/useEntities';

interface SprintRow {
  id: string;
  project_id: string;
  name?: string | null;
  description?: string | null;
  start_date?: string | null;
  release_date?: string | null;
}

interface SprintCreateModalProps {
  isOpen: boolean;
  projectKey: string;
  projectId: string;
  projectOptions: ProductOption[];
  onClose: () => void;
  onSuccess?: (sprint: any) => void;
  editingSprint?: SprintRow | null;
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontWeight: 600,
  fontSize: 12,
  color: 'var(--ds-text, #172B4D)',
  marginBottom: 6,
};

const errStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--ds-text-danger, #AE2A19)',
  marginTop: 4,
};

const asterisk = (
  <span style={{ color: 'var(--ds-text-danger, #AE2A19)', marginLeft: 2 }}>*</span>
);

const todayIso = () => new Date().toISOString().split('T')[0];

function emptyForm(defaultProjectId: string) {
  return {
    name: '',
    description: '',
    start_date: todayIso(),
    release_date: todayIso(),
    project_id: defaultProjectId,
  };
}

/** 2026-06-26: pre-select logic — auto-pick only when EXACTLY 1 option is
 *  available; otherwise leave empty so the user picks explicitly. */
function resolveDefaultProjectId(options: ProductOption[]): string {
  return options.length === 1 ? options[0].id : '';
}

function formFromSprint(s: SprintRow) {
  return {
    name: s.name ?? '',
    description: s.description ?? '',
    start_date: s.start_date ?? '',
    release_date: s.release_date ?? '',
    project_id: s.project_id ?? '',
  };
}

export function SprintCreateModal({
  isOpen,
  projectId,
  projectOptions,
  onClose,
  onSuccess,
  editingSprint = null,
}: SprintCreateModalProps) {
  const isEdit = !!editingSprint;
  const defaultProjectId = resolveDefaultProjectId(projectOptions);

  const [formData, setFormData] = useState(() =>
    editingSprint ? formFromSprint(editingSprint) : emptyForm(defaultProjectId),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setFormData(editingSprint ? formFromSprint(editingSprint) : emptyForm(defaultProjectId));
    setErrors({});
    setSubmitted(false);
  }, [isOpen, editingSprint, defaultProjectId]);

  const createMutation = useCreateSprint();
  const updateMutation = useUpdateSprint();
  const pending = isEdit ? updateMutation.isPending : createMutation.isPending;

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    const trimmedName = formData.name.trim();

    if (!trimmedName) next.name = 'Sprint name is required';
    else if (trimmedName.length > 255) next.name = 'Sprint name must not exceed 255 characters';

    if (!formData.project_id) next.project_id = 'Project is required';

    if (formData.start_date && formData.release_date) {
      const s = new Date(formData.start_date);
      const r = new Date(formData.release_date);
      if (s > r) next.release_date = 'Release date must be on or after start date';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = () => {
    setSubmitted(true);
    if (!validate()) return;

    const targetDate = formData.release_date || todayIso();
    const basePayload: Record<string, any> = {
      name: formData.name.trim(),
      title: formData.name.trim(),
      project_id: formData.project_id,
      target_date: targetDate,
      start_date: formData.start_date || null,
      release_date: formData.release_date || null,
      description: formData.description.trim() || null,
    };

    if (isEdit && editingSprint) {
      updateMutation.mutate(
        { id: editingSprint.id, updates: basePayload },
        {
          onSuccess: () => { onSuccess?.({ ...editingSprint, ...basePayload }); handleClose(); },
          onError: (err: any) => catalystFlag.error(err?.message || 'Failed to update sprint'),
        },
      );
      return;
    }

    createMutation.mutate(basePayload, {
      onSuccess: (result: any) => { onSuccess?.(result); handleClose(); },
      onError: (err: any) => catalystFlag.error(err?.message || 'Failed to create sprint'),
    });
  };

  const handleClose = () => {
    setFormData(emptyForm(projectId));
    setErrors({});
    setSubmitted(false);
    onClose();
  };

  const title = isEdit ? 'Edit sprint' : 'Create sprint';
  const ctaLabel = isEdit ? 'Save changes' : 'Save';

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={handleClose} width={867}>
          <ModalHeader hasCloseButton>
            <ModalTitle>{title}</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 13, color: 'var(--ds-text-subtle, #505258)' }}>
                Required fields are marked with an asterisk
                <span style={{ color: 'var(--ds-text-danger, #AE2A19)', marginLeft: 2 }}>*</span>
              </div>

              <div>
                <label style={labelStyle} htmlFor="sprint-name">
                  Sprint name{asterisk}
                </label>
                <Textfield
                  id="sprint-name"
                  value={formData.name}
                  onChange={(e) => {
                    const v = (e.currentTarget as HTMLInputElement).value;
                    setFormData((p) => ({ ...p, name: v }));
                    if (errors.name) setErrors((p) => ({ ...p, name: '' }));
                  }}
                  maxLength={255}
                  autoFocus
                  isInvalid={submitted && !!errors.name}
                  aria-required="true"
                  aria-invalid={submitted && !!errors.name}
                />
                {submitted && errors.name && (
                  <div role="alert" style={errStyle}>{errors.name}</div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Start date</label>
                  <CatalystDatePicker
                    value={formData.start_date ? new Date(formData.start_date) : null}
                    onChange={(date) => setFormData((p) => ({
                      ...p,
                      start_date: date ? date.toISOString().split('T')[0] : '',
                    }))}
                    placeholder="Start date"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Release date</label>
                  <CatalystDatePicker
                    value={formData.release_date ? new Date(formData.release_date) : null}
                    onChange={(date) => {
                      setFormData((p) => ({
                        ...p,
                        release_date: date ? date.toISOString().split('T')[0] : '',
                      }));
                      if (errors.release_date) setErrors((p) => ({ ...p, release_date: '' }));
                    }}
                    placeholder="Release date"
                  />
                  {submitted && errors.release_date && (
                    <div role="alert" style={errStyle}>{errors.release_date}</div>
                  )}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Project{asterisk}</label>
                <ProductSelect
                  options={projectOptions}
                  value={formData.project_id || null}
                  onChange={(id) => {
                    setFormData((p) => ({ ...p, project_id: id ?? '' }));
                    if (errors.project_id) setErrors((p) => ({ ...p, project_id: '' }));
                  }}
                  placeholder="Select a project"
                  searchPlaceholder="Search projects"
                  hasError={submitted && !!errors.project_id}
                />
                {submitted && errors.project_id && (
                  <div role="alert" style={errStyle}>{errors.project_id}</div>
                )}
              </div>

              <div>
                <label style={labelStyle} htmlFor="sprint-description">Description</label>
                <TextArea
                  id="sprint-description"
                  placeholder="Optional sprint notes"
                  value={formData.description}
                  onChange={(e) => {
                    const v = (e.target as HTMLTextAreaElement).value;
                    setFormData((p) => ({ ...p, description: v }));
                  }}
                  minimumRows={3}
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={handleClose}>Cancel</Button>
            <Button
              appearance="primary"
              isLoading={pending}
              isDisabled={pending}
              onClick={handleSubmit}
            >
              {ctaLabel}
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
}
