/**
 * SprintCreateModal — Create or Edit sprint dialog.
 *
 * 2026-07-02 (CAT-SPRINTS-NATIVE-20260702-002 S1.3b): rebuilt around the
 * native naming engine (D-003). Auto|Custom name mode, 1W/2W length, live
 * auto-name preview via src/lib/sprints/autoName.ts, computed read-only end
 * date, Owner (creator) row writing created_by. The server-side
 * a10_sprint_autoname_trigger recomputes name/end_date authoritatively and
 * dedupes with a -2/-3 suffix, so the client preview is a courtesy, not the
 * source of truth.
 *
 * Per CLAUDE.md "ADOPT CANONICAL — DO NOT REIMPLEMENT": ADS primitives only
 * (Modal, Textfield, TextArea, Toggle, Radio, CatalystDatePicker,
 * CatalystAvatar). "Owner", never "Driver" (D-001).
 */
import React, { useState, useEffect } from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import Toggle from '@atlaskit/toggle';
import { RadioGroup } from '@atlaskit/radio';
import { useQuery } from '@tanstack/react-query';
import { catalystFlag } from '@/lib/catalystFlag';
import { supabase } from '@/integrations/supabase/client';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';
import { ProductSelect, type ProductOption } from '@/components/releases/ReleaseFilters';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import { useCreateSprint, useUpdateSprint } from '@/hooks/workhub/useEntities';
import { sprintAutoName, sprintEndDate, type SprintLengthWeeks } from '@/lib/sprints/autoName';

interface SprintRow {
  id: string;
  project_id: string;
  name?: string | null;
  description?: string | null;
  start_date?: string | null;
  release_date?: string | null;
  name_mode?: string | null;
  length_weeks?: number | null;
  release_id?: string | null;
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
  fontSize: 'var(--ds-font-size-200)',
  color: 'var(--ds-text)',
  marginBottom: 4,
};

const errStyle: React.CSSProperties = {
  fontSize: 'var(--ds-font-size-100)',
  color: 'var(--ds-text-danger)',
  marginTop: 4,
};

const asterisk = (
  <span style={{ color: 'var(--ds-text-danger)', marginLeft: 0 }}>*</span>
);

const todayIso = () => new Date().toISOString().split('T')[0];

interface SprintForm {
  name: string;
  nameMode: 'auto' | 'custom';
  lengthWeeks: SprintLengthWeeks;
  description: string;
  start_date: string;
  project_id: string;
  release_id: string | null;
}

function emptyForm(defaultProjectId: string): SprintForm {
  return {
    name: '',
    nameMode: 'auto',
    lengthWeeks: 1,
    description: '',
    start_date: todayIso(),
    project_id: defaultProjectId,
    release_id: null,
  };
}

/** 2026-06-26: pre-select logic — auto-pick only when EXACTLY 1 option is
 *  available; otherwise leave empty so the user picks explicitly. */
function resolveDefaultProjectId(options: ProductOption[]): string {
  return options.length === 1 ? options[0].id : '';
}

function formFromSprint(s: SprintRow): SprintForm {
  return {
    name: s.name ?? '',
    nameMode: s.name_mode === 'custom' ? 'custom' : 'auto',
    lengthWeeks: s.length_weeks === 2 ? 2 : 1,
    description: s.description ?? '',
    start_date: s.start_date ?? '',
    project_id: s.project_id ?? '',
    release_id: s.release_id ?? null,
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

  const [formData, setFormData] = useState<SprintForm>(() =>
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

  // Owner row: the creator. Writes created_by on create (D-001: "Owner").
  const { data: currentUser } = useQuery({
    queryKey: ['sprint-modal-current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      return data ?? { id: user.id, full_name: null, avatar_url: null };
    },
    enabled: isOpen,
    staleTime: 5 * 60_000,
  });

  // Release options: scoped to the selected project (S1.4). Optional link,
  // one release per sprint (no many-to-many — approved 2026-07-02).
  const { data: releaseOptions } = useQuery({
    queryKey: ['sprint-modal-release-options', formData.project_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_releases')
        .select('id, name')
        .eq('project_id', formData.project_id)
        .order('name');
      if (error) throw new Error(error.message);
      return (data ?? []).map((r: any) => ({ id: r.id, name: r.name }));
    },
    enabled: isOpen && !!formData.project_id,
    staleTime: 5 * 60_000,
  });

  const createMutation = useCreateSprint();
  const updateMutation = useUpdateSprint();
  const pending = isEdit ? updateMutation.isPending : createMutation.isPending;

  const isAuto = formData.nameMode === 'auto';
  const selectedProjectTag =
    projectOptions.find((o) => o.id === formData.project_id)?.tag ?? null;

  // Live preview — recomputes on project/start/length change (D-003). The
  // server trigger is authoritative; this mirrors it for the read-only field.
  const autoNamePreview =
    isAuto && selectedProjectTag && formData.start_date
      ? sprintAutoName(selectedProjectTag, formData.start_date, formData.lengthWeeks)
      : '';

  const endDateIso = formData.start_date
    ? sprintEndDate(formData.start_date, formData.lengthWeeks)
    : '';

  const effectiveName = isAuto ? autoNamePreview : formData.name.trim();

  const validate = (): boolean => {
    const next: Record<string, string> = {};

    if (!formData.project_id) next.project_id = 'Project is required';

    if (isAuto) {
      if (!formData.start_date) next.start_date = 'Start date is required for automatic naming';
    } else {
      const trimmedName = formData.name.trim();
      if (!trimmedName) next.name = 'Sprint name is required';
      else if (trimmedName.length > 255) next.name = 'Sprint name must not exceed 255 characters';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = () => {
    setSubmitted(true);
    if (!validate()) return;

    const basePayload: Record<string, any> = {
      name: effectiveName,
      title: effectiveName,
      name_mode: formData.nameMode,
      length_weeks: formData.lengthWeeks,
      project_id: formData.project_id,
      start_date: formData.start_date || null,
      // end_date is server-derived (start + 4d/11d); release_date/target_date
      // mirror it so the legacy list columns keep rendering until S1.1a.
      end_date: endDateIso || null,
      release_date: endDateIso || null,
      target_date: endDateIso || todayIso(),
      description: formData.description.trim() || null,
      release_id: formData.release_id || null,
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

    createMutation.mutate(
      { ...basePayload, status: 'planning', created_by: currentUser?.id ?? null },
      {
        onSuccess: (result: any) => { onSuccess?.(result); handleClose(); },
        onError: (err: any) => catalystFlag.error(err?.message || 'Failed to create sprint'),
      },
    );
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
              <div style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtle)' }}>
                Required fields are marked with an asterisk
                <span style={{ color: 'var(--ds-text-danger)', marginLeft: 0 }}>*</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                  <Toggle
                    id="sprint-name-mode"
                    isChecked={isAuto}
                    onChange={() =>
                      setFormData((p) => ({
                        ...p,
                        nameMode: p.nameMode === 'auto' ? 'custom' : 'auto',
                      }))
                    }
                  />
                  <span style={{ fontWeight: 600, fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text)' }}>
                    Automatic name
                  </span>
                </label>

                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text)' }}>
                    Length
                  </span>
                  <RadioGroup
                    options={[
                      { name: 'sprint-length', value: '1', label: '1 week' },
                      { name: 'sprint-length', value: '2', label: '2 weeks' },
                    ]}
                    value={String(formData.lengthWeeks)}
                    onChange={(e) => {
                      // read before setState — currentTarget is nulled by the
                      // time the functional updater runs
                      const weeks = (e.currentTarget.value === '2' ? 2 : 1) as SprintLengthWeeks;
                      setFormData((p) => ({ ...p, lengthWeeks: weeks }));
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle} htmlFor="sprint-name">
                  Sprint name{isAuto ? null : asterisk}
                </label>
                <Textfield
                  id="sprint-name"
                  value={isAuto ? autoNamePreview : formData.name}
                  isReadOnly={isAuto}
                  placeholder={
                    isAuto
                      ? 'Select a project and start date to generate the name'
                      : undefined
                  }
                  onChange={(e) => {
                    if (isAuto) return;
                    const v = (e.currentTarget as HTMLInputElement).value;
                    setFormData((p) => ({ ...p, name: v }));
                    if (errors.name) setErrors((p) => ({ ...p, name: '' }));
                  }}
                  maxLength={255}
                  autoFocus={!isAuto}
                  isInvalid={submitted && !!errors.name}
                  aria-invalid={submitted && !!errors.name}
                />
                {submitted && errors.name && (
                  <div role="alert" style={errStyle}>{errors.name}</div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Start date{isAuto ? asterisk : null}</label>
                  <CatalystDatePicker
                    value={formData.start_date ? new Date(formData.start_date) : null}
                    onChange={(date) => {
                      setFormData((p) => ({
                        ...p,
                        start_date: date ? date.toISOString().split('T')[0] : '',
                      }));
                      if (errors.start_date) setErrors((p) => ({ ...p, start_date: '' }));
                    }}
                    placeholder="Start date"
                  />
                  {submitted && errors.start_date && (
                    <div role="alert" style={errStyle}>{errors.start_date}</div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>End date</label>
                  <Textfield
                    value={endDateIso ? new Date(`${endDateIso}T00:00:00`).toLocaleDateString() : ''}
                    isReadOnly
                    placeholder="Derived from start date and length"
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Project{asterisk}</label>
                <ProductSelect
                  options={projectOptions}
                  value={formData.project_id || null}
                  onChange={(id) => {
                    setFormData((p) => ({ ...p, project_id: id ?? '', release_id: null }));
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
                <label style={labelStyle}>Release</label>
                <ProductSelect
                  options={releaseOptions ?? []}
                  value={formData.release_id}
                  onChange={(id) => setFormData((p) => ({ ...p, release_id: id }))}
                  placeholder={formData.project_id ? 'Select a release (optional)' : 'Select a project first'}
                  searchPlaceholder="Search releases"
                  disabled={!formData.project_id}
                />
              </div>

              {!isEdit && (
                <div>
                  <label style={labelStyle}>Owner</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CatalystAvatar
                      size="small"
                      name={currentUser?.full_name || undefined}
                      src={currentUser?.avatar_url || undefined}
                    />
                    <span style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text)' }}>
                      {currentUser?.full_name ?? '—'}
                    </span>
                  </div>
                </div>
              )}

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
