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
import { format as formatDateFns, isValid as isValidDate, parse as parseDateFns } from 'date-fns';
import { useProfileNames } from '../hooks/useStrata';
import { useBeforeUnload } from '../hooks/useBeforeUnload';
import { T } from './shared';
import { strategyApi } from '../domain';
import { labelize } from './format';
import type { StrataGateModel, StrataPerspective, StrataStrategyElement, StrataThemeCharter } from '../types';

/** SYSTEM element types (DB CHECK on strata_strategy_elements.element_type). Never includes 'play' — new rows only. */
const ELEMENT_TYPES = ['theme', 'objective'] as const;

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
  /** For kind 'text'/'textarea' — max character length. Enforced by the input and
   * shown as a counter (V6-OPEN-038). Defaults: text 500, textarea 5000. */
  maxLength?: number;
  /** For kind 'select'/'user' — force the clear ("×") control on/off, overriding the
   * default (clearable only when optional). Set true on a REQUIRED field so the user
   * can deliberately empty it and see the required-validation rejection — the missing
   * affordance behind V6-OPEN-027. Submit is still blocked while the value is empty. */
  isClearable?: boolean;
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
        <span style={{ marginLeft: 8, fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>{helper}</span>
      ) : null}
    </div>
  );
}

/**
 * STRATA date display/entry format — day-first, matching the module's own date
 * renderer (`format.ts` fmtDate → `toLocaleDateString('en-GB', …)` → "17 Jul 2026").
 * @atlaskit/datetime-picker otherwise defaults to locale 'en-US' (month-first), under
 * which a day-first entry such as "31/12/2027" is an Invalid Date — the second half of
 * SR-DEF-001. Passing `dateFormat` + `parseInputValue` drives BOTH the picker's parsing
 * and its display label, so entry and rendering agree regardless of browser locale.
 */
/**
 * TWO dialects, deliberately. @atlaskit/datetime-picker's `dateFormat` prop is in
 * MOMENT tokens — it runs them through `convertTokens()` before handing them to
 * date-fns (its own default is 'YYYY/MM/DD'). Passing date-fns tokens there renders
 * garbage: 'dd' is Moment's weekday, so 01/01/2027 displayed as "Fr/01/yyyy".
 * Our own parsing calls date-fns directly and therefore uses date-fns tokens.
 */
const STRATA_DATE_FORMAT_MOMENT = 'DD/MM/YYYY';
const STRATA_DATE_FORMAT_DATE_FNS = 'dd/MM/yyyy';

/** Parse a typed STRATA date. Returns an ISO `yyyy-MM-dd` string, or null when unparseable. */
export function parseStrataDateInput(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  const parsed = parseDateFns(trimmed, STRATA_DATE_FORMAT_DATE_FNS, new Date());
  if (!isValidDate(parsed)) return null;
  // Format in LOCAL time. `toISOString()` would shift local midnight back a day in
  // any negative-offset timezone (a real off-by-one: 01/01/2027 → "2026-12-31").
  return formatDateFns(parsed, 'yyyy-MM-dd');
}

/**
 * Date field for StrataFormModal (SR-DEF-001).
 *
 * @atlaskit/datetime-picker only invokes `onChange` from three paths — clicking a
 * calendar day, pressing Enter with the menu open, and the clear control. Typing a
 * date and then clicking away (the natural flow, and the defect's repro) leaves the
 * typed text in react-select's uncommitted `inputValue` while the form model keeps
 * its seeded null — so the field LOOKS filled but submits as empty.
 *
 * We observe the typed text via the `input` event bubbling to our own wrapper rather
 * than passing `selectProps.onInputChange`: DatePicker spreads `selectProps` AFTER its
 * internal `onInputChange`, so overriding it would suppress the picker's own display
 * state. On blur we commit the parsed value ourselves.
 */
function StrataDateField({
  field, value, onChange, onValidityChange,
}: {
  field: StrataFieldSpec;
  value: string | null;
  onChange: (next: string | null) => void;
  onValidityChange: (invalid: boolean) => void;
}) {
  // null = never typed in this field; a string = latest uncommitted text.
  const typedRef = React.useRef<string | null>(null);
  const [invalid, setInvalid] = React.useState(false);

  const markInvalid = (next: boolean) => {
    setInvalid(next);
    onValidityChange(next);
  };

  // Committed via calendar select / Enter / clear — the picker's own paths already
  // carry an ISO value, so drop any stale typed text.
  const handlePickerChange = (iso: string) => {
    typedRef.current = null;
    markInvalid(false);
    onChange(iso || null);
  };

  const handleBlur = () => {
    const typed = typedRef.current;
    if (typed === null) return; // untouched — never clobber the seeded value
    if (typed.trim() === '') {
      // Text deliberately emptied: clear the model so required-validation catches it.
      typedRef.current = null;
      markInvalid(false);
      onChange(null);
      return;
    }
    const iso = parseStrataDateInput(typed);
    // Zero-assumption: an unparseable date commits null and is flagged — never a guess.
    markInvalid(iso === null);
    onChange(iso);
    if (iso !== null) typedRef.current = null;
  };

  return (
    <div
      onInput={(e) => { typedRef.current = (e.target as HTMLInputElement).value; }}
      data-testid={`strata-date-field-${field.key}`}
    >
      <DatePicker
        value={value ?? ''}
        onChange={handlePickerChange}
        onBlur={handleBlur}
        isDisabled={field.isDisabled}
        isInvalid={invalid}
        shouldShowCalendarButton
        clearControlLabel={`Clear ${field.label}`}
        label={field.label}
        dateFormat={STRATA_DATE_FORMAT_MOMENT}
        // Overrides the picker's locale-based parsing so typed entry matches the
        // displayed day-first format. Receives raw text; date-fns tokens apply here.
        parseInputValue={(date) => parseDateFns(date, STRATA_DATE_FORMAT_DATE_FNS, new Date())}
        // @atlaskit/datetime-picker falls back to its built-in placeholder
        // (`new Date(1993, 1, 18)` → "2/18/1993") whenever no `placeholder`
        // is supplied — an empty string is also treated as absent. Pass a
        // real hint so empty optional date fields never show the 1993 value.
        placeholder={field.placeholder ?? 'dd/mm/yyyy'}
      />
      {invalid ? (
        <div style={{ marginTop: 4, fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-danger)' }}>
          Enter a date as dd/mm/yyyy.
        </div>
      ) : null}
    </div>
  );
}

function FieldControl({
  field, value, onChange, userOptions, onDateValidityChange, invalid, errorId,
}: {
  field: StrataFieldSpec;
  value: string | number | boolean | null;
  onChange: (next: string | number | boolean | null) => void;
  userOptions: SelectOption<string>[];
  onDateValidityChange: (invalid: boolean) => void;
  /** CFG-007: submission was attempted and this required field is still empty. */
  invalid?: boolean;
  /** CFG-007: id of the visible validation message, wired via aria-describedby. */
  errorId?: string;
}) {
  // CFG-007: required state carried in the accessible name so screen readers
  // announce it even where a component drops the required attribute.
  const a11yName = field.required ? `${field.label} (required)` : field.label;
  const a11y = {
    'aria-label': a11yName,
    'aria-required': field.required ? true : undefined,
    'aria-invalid': invalid ? true : undefined,
    'aria-describedby': invalid ? errorId : undefined,
  } as const;
  switch (field.kind) {
    case 'textarea': {
      const max = field.maxLength ?? 5000;
      const len = ((value as string) ?? '').length;
      return (
        <>
          <TextArea
            value={(value as string) ?? ''}
            placeholder={field.placeholder}
            minimumRows={3}
            maxLength={max}
            isDisabled={field.isDisabled}
            onChange={(e) => onChange((e.target as HTMLTextAreaElement).value)}
            {...a11y}
          />
          <div style={{ marginTop: 4, textAlign: 'right', fontSize: 'var(--ds-font-size-100)', color: len >= max ? 'var(--ds-text-danger)' : T.subtlest }}>
            {len}/{max}
          </div>
        </>
      );
    }
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
          {...a11y}
        />
      );
    case 'date':
      return (
        <StrataDateField
          field={field}
          value={(value as string) ?? null}
          onChange={onChange}
          onValidityChange={onDateValidityChange}
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
          isClearable={field.isClearable ?? !field.required}
          isSearchable
          usePortal
          aria-label={a11yName}
          aria-required={field.required || undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? errorId : undefined}
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
          isClearable={field.isClearable ?? !field.required}
          isSearchable
          usePortal
          aria-label={a11yName}
          aria-required={field.required || undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? errorId : undefined}
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
    default: {
      const max = field.maxLength ?? 500;
      const len = ((value as string) ?? '').length;
      return (
        <>
          <Textfield
            value={(value as string) ?? ''}
            placeholder={field.placeholder}
            maxLength={max}
            isDisabled={field.isDisabled}
            onChange={(e) => onChange((e.target as HTMLInputElement).value)}
            {...a11y}
          />
          {len > max * 0.8 ? (
            <div style={{ marginTop: 4, textAlign: 'right', fontSize: 'var(--ds-font-size-100)', color: len >= max ? 'var(--ds-text-danger)' : T.subtlest }}>
              {len}/{max}
            </div>
          ) : null}
        </>
      );
    }
  }
}

export function StrataFormModal({
  open, onClose, title, description, fields, initial, submitLabel = 'Create',
  onSubmit, validate, width = 'medium', testId,
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
  /**
   * Optional cross-field check run after required/format validation and before
   * submit. Return a message to block, or null to allow. The server remains the
   * source of truth — this only spares the user a round-trip.
   */
  validate?: (values: StrataFormValues) => string | null;
  width?: 'small' | 'medium' | 'large' | 'x-large';
  testId?: string;
}) {
  const [values, setValues] = useState<StrataFormValues>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  /**
   * RD-DEF-011: true once the server has REJECTED a submission. After a rejection the user has
   * seen the outcome — Cancel/Close must dismiss immediately, not detour through the
   * "Discard unsaved changes?" confirm (which is what left the modal apparently stuck and
   * forced a page reload). The rejection message itself stays on screen until then.
   */
  const [rejected, setRejected] = useState(false);
  // CFG-007: a submit was attempted (e.g. Enter) while required fields were
  // empty — per-field messages render and focus moves to the first invalid.
  const [attempted, setAttempted] = useState(false);
  // Date fields whose typed text could not be parsed (SR-DEF-001). Keyed by field key.
  const [invalidDates, setInvalidDates] = useState<Record<string, boolean>>({});
  const { data: profiles } = useProfileNames();

  useEffect(() => {
    if (open) {
      // Reopen is CLEAN: values reseeded, stale error/busy/rejection state cleared.
      setValues(initial ?? {});
      setError(null);
      setBusy(false);
      setConfirmDiscard(false);
      setRejected(false);
      setAttempted(false);
      setInvalidDates({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Dirty = any field differs from its seed value. Normalise null/undefined/''
  // so an untouched form (or one edited back to its original) is NOT dirty.
  const initialValues = initial ?? {};
  const normalize = (v: string | number | boolean | null | undefined) =>
    v == null || v === '' ? '' : v;
  const isDirty = Array.from(
    new Set([...Object.keys(initialValues), ...Object.keys(values)]),
  ).some((k) => normalize(values[k]) !== normalize(initialValues[k]));

  // Native "Leave site?" prompt on refresh / tab-close / hard-nav while dirty.
  // (SPA browser Back/Forward is NOT intercepted here — the app is on BrowserRouter,
  // where react-router's useBlocker is unavailable. A history-sentinel workaround was
  // trialled and rejected as too fragile (V5-OPEN-022 / D-3); the correct fix is a
  // data-router migration, tracked separately. Sidebar/in-app link nav is guarded via
  // handleRequestClose below; refresh/close via useBeforeUnload.)
  useBeforeUnload(open && isDirty && !busy);

  // User-initiated close (Modal onClose / backdrop / Cancel). Confirms discard
  // when dirty; the post-submit onClose() path bypasses this entirely.
  // RD-DEF-011: after a REJECTED submission, close directly — the user has seen the server's
  // verdict, and stacking a discard-confirm on top is what made Cancel appear dead.
  const handleRequestClose = () => {
    if (isDirty && !busy && !rejected) setConfirmDiscard(true);
    else onClose();
  };

  const userOptions = useMemo<SelectOption<string>[]>(() => {
    if (!profiles) return [];
    return Array.from(profiles.entries())
      .map(([id, p]) => ({ value: id, label: p.name ?? id }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [profiles]);

  if (!open) return null;

  const missingRequiredFields = fields
    .filter((f) => f.required)
    .filter((f) => {
      const v = values[f.key];
      return v == null || (typeof v === 'string' && v.trim() === '');
    });
  const missingRequired = missingRequiredFields.map((f) => f.label);
  const isMissing = (key: string) => missingRequiredFields.some((f) => f.key === key);
  // CFG-007 vs SR-DEF-001: date pickers commit on blur, and clicking Submit IS
  // the blur — a button disabled on "date still empty" would swallow that very
  // click. Dates therefore never drive the disabled state; submit()'s guard
  // (message + focus) still blocks them after the blur has flushed.
  const missingRequiredBlocking = missingRequiredFields.filter((f) => f.kind !== 'date');

  // CFG-007: move keyboard focus to the first invalid field's control.
  const focusFirstInvalid = () => {
    const first = missingRequiredFields[0];
    if (!first) return;
    const host = document.getElementById(`strata-field-${first.key}`);
    (host?.querySelector('input, textarea, [tabindex]') as HTMLElement | null)?.focus();
  };

  // Unparseable date text blocks with a field-specific message of its own — reporting
  // it as "Required" would misdescribe a field the user demonstrably filled in.
  const invalidDateLabels = fields
    .filter((f) => f.kind === 'date' && invalidDates[f.key])
    .map((f) => f.label);

  const submit = async () => {
    if (invalidDateLabels.length > 0) {
      setError(`Enter a valid date (dd/mm/yyyy) for: ${invalidDateLabels.join(', ')}`);
      return;
    }
    if (missingRequired.length > 0) {
      // CFG-007: per-field messages + focus, alongside the summary banner.
      setAttempted(true);
      setError(`Required: ${missingRequired.join(', ')}`);
      focusFirstInvalid();
      return;
    }
    const crossFieldError = validate?.(values) ?? null;
    if (crossFieldError) {
      setError(crossFieldError);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit(values);
      onClose();
    } catch (e) {
      // Verbatim server message preserved (RD-DEF-011 keeps the enforcement text intact) —
      // and the rejection unlocks direct Cancel/Close above.
      setError(e instanceof Error ? e.message : String(e));
      setRejected(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
    <Modal isOpen onClose={busy ? () => {} : handleRequestClose} width={width} testId={testId}>
      <ModalHeader><ModalTitle>{title}</ModalTitle></ModalHeader>
      <ModalBody>
        {description ? (
          <p style={{ margin: '0 0 12px', fontSize: 'var(--ds-font-size-200)', color: T.subtle }}>{description}</p>
        ) : null}
        <div style={{ display: 'grid', gap: 12 }}>
          {fields.map((f) => {
            const fieldInvalid = attempted && isMissing(f.key);
            return (
            <div key={f.key} id={`strata-field-${f.key}`}>
              {f.kind !== 'checkbox' ? <FieldLabel label={f.label} required={f.required} helper={f.helper} /> : null}
              <FieldControl
                field={f}
                value={values[f.key] ?? null}
                onChange={(next) => setValues((prev) => ({ ...prev, [f.key]: next }))}
                userOptions={userOptions}
                onDateValidityChange={(isInvalid) =>
                  setInvalidDates((prev) => (prev[f.key] === isInvalid ? prev : { ...prev, [f.key]: isInvalid }))
                }
                invalid={fieldInvalid}
                errorId={`strata-field-err-${f.key}`}
              />
              {fieldInvalid ? (
                <div
                  id={`strata-field-err-${f.key}`}
                  style={{ marginTop: 4, fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-danger)' }}
                >
                  {f.label} is required.
                </div>
              ) : null}
            </div>
            );
          })}
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
        <Button appearance="subtle" onClick={handleRequestClose} isDisabled={busy}>Cancel</Button>
        {/* CFG-007: primary action stays disabled until every mandatory input is
            valid. submit() keeps its guards for any other invocation path, and
            the server remains the enforcement boundary either way. */}
        <Button
          appearance="primary"
          onClick={submit}
          isDisabled={busy || missingRequiredBlocking.length > 0 || invalidDateLabels.length > 0}
          testId={testId ? `${testId}-submit` : undefined}
        >
          {busy ? 'Working…' : submitLabel}
        </Button>
      </ModalFooter>
    </Modal>
    {confirmDiscard ? (
      <Modal isOpen onClose={() => setConfirmDiscard(false)} width="small" testId="strata-discard-confirm">
        <ModalHeader><ModalTitle>Discard unsaved changes?</ModalTitle></ModalHeader>
        <ModalBody>
          <p style={{ margin: 0, fontSize: 'var(--ds-font-size-200)', color: T.subtle }}>
            You have unsaved edits. If you leave now, your changes will be lost.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button appearance="subtle" onClick={() => setConfirmDiscard(false)}>Stay</Button>
          <Button appearance="danger" onClick={() => { setConfirmDiscard(false); onClose(); }}>Discard</Button>
        </ModalFooter>
      </Modal>
    ) : null}
    </>
  );
}

/** Form value → trimmed RPC string arg; empty/non-string → undefined (no-op param). */
export const str = (v: string | number | boolean | null | undefined): string | undefined => {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t === '' ? undefined : t;
};

/** Approved-only perspective options, current value kept selectable even if not approved. */
export function perspectiveSelectOptions(
  perspectives: StrataPerspective[],
  currentId?: string | null,
): SelectOption[] {
  const approved = perspectives.filter((p) => p.status === 'approved');
  const opts = approved.map((p) => ({ value: p.id, label: p.name }));
  if (currentId && !approved.some((p) => p.id === currentId)) {
    const current = perspectives.find((p) => p.id === currentId);
    opts.push({ value: currentId, label: current?.name ?? '—' });
  }
  return opts;
}

/** Approved-only gate model options, current value kept selectable even if not approved. */
export function gateModelSelectOptions(
  models: StrataGateModel[],
  currentId?: string | null,
): SelectOption[] {
  const approved = models.filter((m) => m.status === 'approved');
  const opts = approved.map((m) => ({ value: m.id, label: m.name }));
  if (currentId && !approved.some((m) => m.id === currentId)) {
    opts.push({ value: currentId, label: models.find((m) => m.id === currentId)?.name ?? '—' });
  }
  return opts;
}

/** Objective's only valid parent is a Theme (2-tier hierarchy, enforced server-side too). */
export function themeParentOptions(elements: StrataStrategyElement[], excludeId?: string): SelectOption[] {
  return elements
    .filter((e) => e.id !== excludeId && e.element_type === 'theme')
    .map((e) => ({ value: e.id, label: e.name }));
}

/**
 * Edit a Theme or Objective — the single canonical edit surface, shared by the
 * Strategy Room row menu and the Theme/Objective detail pages. One definition,
 * two call sites, same `strategyApi.updateElement` mutation.
 */
export function EditElementModal({
  element, perspectiveOptions, parentOptions, onClose, onSaved,
}: {
  element: StrataStrategyElement;
  perspectiveOptions: SelectOption[];
  /** Only consulted when element.element_type === 'objective'. */
  parentOptions: SelectOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <StrataFormModal
      open
      onClose={onClose}
      title={`Edit ${labelize(element.element_type)}`}
      description={element.element_type === 'theme' ? 'Themes are root-level — no parent to edit.' : undefined}
      fields={[
        { key: 'name', label: 'Name', kind: 'text', required: true },
        { key: 'description', label: 'Description', kind: 'textarea' },
        { key: 'ownerId', label: 'Owner', kind: 'user' },
        { key: 'perspectiveId', label: 'Perspective', kind: 'select', options: perspectiveOptions },
        ...(element.element_type === 'objective'
          ? [{ key: 'parentId', label: 'Parent (Theme)', kind: 'select' as const, required: true, options: parentOptions }]
          : []),
        { key: 'stage', label: 'Stage', kind: 'text' },
      ]}
      initial={{
        name: element.name, description: element.description, ownerId: element.owner_id,
        perspectiveId: element.perspective_id, parentId: element.parent_id, stage: element.stage,
      }}
      submitLabel="Save"
      testId="strata-edit-element-modal"
      onSubmit={async (v) => {
        await strategyApi.updateElement(element.id, {
          name: str(v.name), description: str(v.description),
          ownerId: str(v.ownerId), perspectiveId: str(v.perspectiveId),
          parentId: str(v.parentId), stage: str(v.stage),
          clearOwner: !str(v.ownerId) && !!element.owner_id,
          clearParent: !str(v.parentId) && !!element.parent_id,
        });
        onSaved();
      }}
    />
  );
}

/**
 * New element — Type-reactive (Theme has no parent field at all; Objective's
 * parent is required and restricted to Themes). StrataFormModal's field spec
 * is static per render and can't react to a value chosen inside the same
 * modal session, so this composes ads primitives directly with local state
 * instead (CAT-STRATA-HIERARCHY-20260706-001, approved 2-tier hierarchy).
 *
 * `lockElementType`/`lockParentId` (CAT-STRATA-THEME-DETAIL-20260710-001
 * Slice 2) let a caller open this pre-scoped to "Objective, parented to this
 * Theme" — hides the Type/Parent selectors and shows static text instead.
 * Strategy Room's own "New element" call site passes neither prop.
 */
export function NewElementModal({
  cycleId, cycleName, themeOptions, perspectiveOptions, onClose, onCreated,
  lockElementType, lockParentId,
}: {
  cycleId: string;
  cycleName: string;
  themeOptions: SelectOption<string>[];
  perspectiveOptions: SelectOption<string>[];
  onClose: () => void;
  onCreated: () => void;
  lockElementType?: 'theme' | 'objective';
  lockParentId?: string;
}) {
  const [elementType, setElementType] = useState<'theme' | 'objective' | null>(lockElementType ?? null);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string | null>(lockParentId ?? null);
  const [perspectiveId, setPerspectiveId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const typeOptions: SelectOption<string>[] = ELEMENT_TYPES.map((t) => ({ value: t, label: labelize(t) }));
  const lockParentName = lockParentId ? (themeOptions.find((o) => o.value === lockParentId)?.label ?? null) : null;

  const submit = async () => {
    if (!elementType) { setError('Required: Type'); return; }
    if (!name.trim()) { setError('Required: Name'); return; }
    if (elementType === 'objective' && !parentId) {
      setError('Required: Parent — an Objective must be parented to a Theme');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await strategyApi.createElement({
        cycleId, elementType, name: name.trim(),
        parentId: elementType === 'objective' ? (parentId ?? undefined) : undefined,
        perspectiveId: perspectiveId ?? undefined,
      });
      onCreated();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={busy ? () => {} : onClose} width="medium" testId="strata-create-element-modal">
      <ModalHeader><ModalTitle>{lockElementType ? `New ${labelize(lockElementType)}` : 'New element'}</ModalTitle></ModalHeader>
      <ModalBody>
        <p style={{ margin: '0 0 12px', fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>
          Created as a draft in <strong>{cycleName}</strong>.
        </p>
        <div style={{ display: 'grid', gap: 12 }}>
          {!lockElementType ? (
            <div>
              <FieldLabel label="Type" />
              <Select
                options={typeOptions}
                value={typeOptions.find((o) => o.value === elementType) ?? null}
                onChange={(next) => { setElementType((next?.value as 'theme' | 'objective') ?? null); setParentId(null); }}
                placeholder="Select type…"
                usePortal
                aria-label="Type"
              />
            </div>
          ) : null}
          <div>
            <FieldLabel label="Name" />
            <Textfield value={name} onChange={(e) => setName(e.currentTarget.value)} aria-label="Name" />
          </div>
          {lockParentId ? (
            <p style={{ margin: 0, fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>
              Parent: <strong>{lockParentName ?? '—'}</strong>
            </p>
          ) : elementType === 'objective' ? (
            <div>
              <FieldLabel label="Parent (Theme)" />
              <Select
                options={themeOptions}
                value={themeOptions.find((o) => o.value === parentId) ?? null}
                onChange={(next) => setParentId(next?.value ?? null)}
                placeholder="Select the Theme this Objective belongs to…"
                isSearchable
                usePortal
                aria-label="Parent"
              />
            </div>
          ) : elementType === 'theme' ? (
            <p style={{ margin: 0, fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>
              Themes are root-level — no parent to select.
            </p>
          ) : null}
          <div>
            <FieldLabel label="Perspective" />
            <Select
              options={perspectiveOptions}
              value={perspectiveOptions.find((o) => o.value === perspectiveId) ?? null}
              onChange={(next) => setPerspectiveId(next?.value ?? null)}
              placeholder="Select perspective…"
              isClearable
              usePortal
              aria-label="Perspective"
            />
          </div>
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
          {busy ? 'Working…' : 'Create element'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

/**
 * Author/edit a Theme's charter — the single canonical charter surface,
 * shared by the Strategy Room row menu and the Theme detail page. One
 * definition, two call sites, same `strategyApi.upsertCharter` mutation.
 */
export function ThemeCharterModal({
  element, charter, gateModelOptions, onClose, onSaved,
}: {
  element: StrataStrategyElement;
  charter?: StrataThemeCharter;
  gateModelOptions: SelectOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <StrataFormModal
      open
      onClose={onClose}
      title="Theme charter"
      description={<>Charter for <strong>{element.name}</strong> — completeness is derived server-side.</>}
      fields={[
        { key: 'hypothesis', label: 'Hypothesis', kind: 'textarea' },
        { key: 'scope', label: 'Scope', kind: 'textarea' },
        { key: 'valueThesis', label: 'Value thesis', kind: 'textarea' },
        { key: 'gateModelId', label: 'Gate model', kind: 'select', options: gateModelOptions },
        { key: 'ownerId', label: 'Owner', kind: 'user' },
      ]}
      initial={{
        hypothesis: charter?.hypothesis ?? null, scope: charter?.scope ?? null,
        valueThesis: charter?.value_thesis ?? null,
        gateModelId: charter?.gate_model_id ?? null, ownerId: charter?.owner_id ?? null,
      }}
      submitLabel="Save charter"
      testId="strata-charter-modal"
      onSubmit={async (v) => {
        await strategyApi.upsertCharter({
          elementId: element.id, hypothesis: str(v.hypothesis), scope: str(v.scope),
          valueThesis: str(v.valueThesis), gateModelId: str(v.gateModelId), ownerId: str(v.ownerId),
        });
        onSaved();
      }}
    />
  );
}
