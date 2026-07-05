/**
 * STRATA authoring primitives — the canonical create/edit modal used by every
 * write surface in the recovery build (CAT-STRATA-20260705-001, F-STR/F-KPI/
 * F-EXE/F-VAL/F-GOV). ADS wrappers + @atlaskit primitives only; no drawers.
 *
 * Server-side RPCs are the source of truth for validation — every rejection
 * (missing prerequisite, SoD violation, overlap, closed period…) surfaces
 * verbatim in the modal via SectionMessage. Client-side checks cover only
 * required-field presence so users get instant feedback.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Button, Checkbox, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle,
  SectionMessage, Select, Textfield,
} from '@/components/ads';
import type { SelectOption } from '@/components/ads';
import TextArea from '@atlaskit/textarea';
import { DatePicker } from '@atlaskit/datetime-picker';
import { useProfileNames } from '../hooks/useStrata';
import { T } from './shared';

export type StrataFieldKind =
  | 'text' | 'textarea' | 'number' | 'date' | 'select' | 'user' | 'checkbox';

export interface StrataFieldSpec {
  key: string;
  label: string;
  kind: StrataFieldKind;
  required?: boolean;
  placeholder?: string;
  helper?: string;
  /** For kind 'select'. */
  options?: Array<{ value: string; label: string }>;
  /** For kind 'number'. */
  min?: number;
  max?: number;
  step?: number;
  isDisabled?: boolean;
}

export type StrataFormValues = Record<string, string | number | boolean | null>;

function FieldLabel({ label, required, helper }: { label: string; required?: boolean; helper?: string }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtle }}>
        {label}
        {required ? <span style={{ color: 'var(--ds-text-danger)' }}> *</span> : null}
      </span>
      {helper ? (
        <span style={{ marginLeft: 6, fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>{helper}</span>
      ) : null}
    </div>
  );
}

function FieldControl({
  field, value, onChange, userOptions,
}: {
  field: StrataFieldSpec;
  value: string | number | boolean | null;
  onChange: (next: string | number | boolean | null) => void;
  userOptions: SelectOption<string>[];
}) {
  switch (field.kind) {
    case 'textarea':
      return (
        <TextArea
          value={(value as string) ?? ''}
          placeholder={field.placeholder}
          minimumRows={3}
          isDisabled={field.isDisabled}
          onChange={(e) => onChange((e.target as HTMLTextAreaElement).value)}
          aria-label={field.label}
        />
      );
    case 'number':
      return (
        <Textfield
          type="number"
          value={value == null ? '' : String(value)}
          placeholder={field.placeholder}
          isDisabled={field.isDisabled}
          onChange={(e) => {
            const raw = (e.target as HTMLInputElement).value;
            onChange(raw === '' ? null : Number(raw));
          }}
          aria-label={field.label}
        />
      );
    case 'date':
      return (
        <DatePicker
          value={(value as string) ?? ''}
          onChange={(iso) => onChange(iso || null)}
          isDisabled={field.isDisabled}
          shouldShowCalendarButton
          clearControlLabel={`Clear ${field.label}`}
          label={field.label}
        />
      );
    case 'select': {
      const opts: SelectOption<string>[] = (field.options ?? []).map((o) => ({ value: o.value, label: o.label }));
      const selected = opts.find((o) => o.value === value) ?? null;
      return (
        <Select
          options={opts}
          value={selected}
          onChange={(next) => onChange(next?.value ?? null)}
          placeholder={field.placeholder ?? 'Select…'}
          isDisabled={field.isDisabled}
          isClearable={!field.required}
          isSearchable
          usePortal
          aria-label={field.label}
        />
      );
    }
    case 'user': {
      const selected = userOptions.find((o) => o.value === value) ?? null;
      return (
        <Select
          options={userOptions}
          value={selected}
          onChange={(next) => onChange(next?.value ?? null)}
          placeholder={field.placeholder ?? 'Select person…'}
          isDisabled={field.isDisabled}
          isClearable={!field.required}
          isSearchable
          usePortal
          aria-label={field.label}
        />
      );
    }
    case 'checkbox':
      return (
        <Checkbox
          isChecked={Boolean(value)}
          onChange={(e) => onChange((e.target as HTMLInputElement).checked)}
          label={field.placeholder ?? field.label}
          isDisabled={field.isDisabled}
        />
      );
    case 'text':
    default:
      return (
        <Textfield
          value={(value as string) ?? ''}
          placeholder={field.placeholder}
          isDisabled={field.isDisabled}
          onChange={(e) => onChange((e.target as HTMLInputElement).value)}
          aria-label={field.label}
        />
      );
  }
}

export function StrataFormModal({
  open, onClose, title, description, fields, initial, submitLabel = 'Create',
  onSubmit, width = 'medium', testId,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  fields: StrataFieldSpec[];
  initial?: StrataFormValues;
  submitLabel?: string;
  /** Throws on RPC failure — server validation text renders in the modal. */
  onSubmit: (values: StrataFormValues) => Promise<void>;
  width?: 'small' | 'medium' | 'large' | 'x-large';
  testId?: string;
}) {
  const [values, setValues] = useState<StrataFormValues>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: profiles } = useProfileNames();

  useEffect(() => {
    if (open) {
      setValues(initial ?? {});
      setError(null);
      setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const userOptions = useMemo<SelectOption<string>[]>(() => {
    if (!profiles) return [];
    return Array.from(profiles.entries())
      .map(([id, p]) => ({ value: id, label: p.name ?? id }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [profiles]);

  if (!open) return null;

  const missingRequired = fields
    .filter((f) => f.required)
    .filter((f) => {
      const v = values[f.key];
      return v == null || (typeof v === 'string' && v.trim() === '');
    })
    .map((f) => f.label);

  const submit = async () => {
    if (missingRequired.length > 0) {
      setError(`Required: ${missingRequired.join(', ')}`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit(values);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal onClose={busy ? () => {} : onClose} width={width} testId={testId}>
      <ModalHeader><ModalTitle>{title}</ModalTitle></ModalHeader>
      <ModalBody>
        {description ? (
          <p style={{ margin: '0 0 12px', fontSize: 'var(--ds-font-size-200)', color: T.subtle }}>{description}</p>
        ) : null}
        <div style={{ display: 'grid', gap: 12 }}>
          {fields.map((f) => (
            <div key={f.key}>
              {f.kind !== 'checkbox' ? <FieldLabel label={f.label} required={f.required} helper={f.helper} /> : null}
              <FieldControl
                field={f}
                value={values[f.key] ?? null}
                onChange={(next) => setValues((prev) => ({ ...prev, [f.key]: next }))}
                userOptions={userOptions}
              />
            </div>
          ))}
        </div>
        {error ? (
          <div style={{ marginTop: 12 }}>
            <SectionMessage appearance="error" title="Action rejected">
              <p style={{ whiteSpace: 'pre-wrap' }}>{error}</p>
            </SectionMessage>
          </div>
        ) : null}
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose} isDisabled={busy}>Cancel</Button>
        <Button appearance="primary" onClick={submit} isDisabled={busy}>
          {busy ? 'Working…' : submitLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
