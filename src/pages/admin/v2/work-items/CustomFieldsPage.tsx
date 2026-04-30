/**
 * CustomFieldsPage — CRUD on `custom_field_defs`.
 *
 * Phase 1a of the admin overhaul. Replaces the legacy DetailsPanels page
 * (graveyarded) with a typed, audited CRUD surface.
 *
 * Schema (custom_field_defs):
 *   id, name, entity_type, field_type, required, description,
 *   display_order, is_active, options_json, default_value, placeholder
 *
 * Entity types and field types are project-defined strings — we render a
 * locked Select on edit so a field can't be silently retyped (would orphan
 * `custom_field_values`).
 *
 * Every write routes through `useAdminMutation` so the audit log captures
 * the before-state, the actor, and the optional reason.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { typedQuery } from '@/integrations/supabase/client';
import {
  Button,
  Checkbox,
  EmptyState,
  Heading,
  Lozenge,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  SectionMessage,
  Select,
  Spinner,
  Textfield,
  type LozengeAppearance,
  type SelectOption,
} from '@/components/ads';
import { useAdminMutation } from '@/hooks/admin/useAdminMutation';

// ─── Schema ───────────────────────────────────────────────────────────────

type FieldType = 'text' | 'number' | 'date' | 'select' | 'multi_select' | 'boolean';

interface CustomFieldRow {
  id: string;
  name: string;
  entity_type: string;
  field_type: FieldType;
  required: boolean;
  description: string | null;
  display_order: number | null;
  is_active: boolean;
  options_json: string[] | null;
  default_value: string | null;
  placeholder: string | null;
}

const ENTITY_OPTIONS: SelectOption[] = [
  { value: 'story', label: 'Story' },
  { value: 'epic', label: 'Epic' },
  { value: 'feature', label: 'Feature' },
  { value: 'task', label: 'Task' },
  { value: 'subtask', label: 'Subtask' },
  { value: 'qa_bug', label: 'QA Bug / Defect' },
  { value: 'production_incident', label: 'Production Incident' },
  { value: 'business_request', label: 'Business Request' },
];

const FIELD_TYPE_OPTIONS: SelectOption<FieldType>[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Select' },
  { value: 'multi_select', label: 'Multi-select' },
  { value: 'boolean', label: 'Boolean' },
];

const TYPE_APPEARANCE: Record<FieldType, LozengeAppearance> = {
  text: 'default',
  number: 'inprogress',
  date: 'new',
  select: 'success',
  multi_select: 'success',
  boolean: 'moved',
};

// ─── Page ─────────────────────────────────────────────────────────────────

type FilterValue = 'ALL' | string;

export default function CustomFieldsPage() {
  const [entityFilter, setEntityFilter] = useState<FilterValue>('ALL');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<CustomFieldRow | null>(null);
  const [deleting, setDeleting] = useState<CustomFieldRow | null>(null);

  const queryKey = useMemo(
    () => ['admin', 'custom-field-defs', entityFilter] as const,
    [entityFilter],
  );

  const { data, isLoading, error } = useQuery<CustomFieldRow[]>({
    queryKey: [...queryKey],
    queryFn: async () => {
      let q = typedQuery('custom_field_defs').select('*');
      if (entityFilter !== 'ALL') q = q.eq('entity_type', entityFilter);
      const { data, error } = await q.order('entity_type', { ascending: true })
        .order('display_order', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as CustomFieldRow[];
    },
    staleTime: 30_000,
  });

  const grouped = useMemo(() => {
    const out = new Map<string, CustomFieldRow[]>();
    for (const row of data ?? []) {
      const list = out.get(row.entity_type) ?? [];
      list.push(row);
      out.set(row.entity_type, list);
    }
    return out;
  }, [data]);

  return (
    <div
      data-testid="admin-v2/custom-fields/page"
      style={{ padding: 'var(--ds-space-400, 24px)', maxWidth: 1280 }}
    >
      <Header
        entityFilter={entityFilter}
        onChangeFilter={setEntityFilter}
        onCreate={() => setCreateOpen(true)}
      />

      {error && (
        <div style={{ marginBottom: 'var(--ds-space-300, 16px)' }}>
          <SectionMessage appearance="error" title="Could not load custom fields">
            <p style={{ margin: 0 }}>{(error as Error).message}</p>
          </SectionMessage>
        </div>
      )}

      {isLoading && (
        <div style={spinnerWrapStyle}>
          <Spinner size="medium" />
        </div>
      )}

      {!isLoading && !error && grouped.size === 0 && (
        <EmptyState
          header="No custom fields yet"
          description={
            entityFilter === 'ALL'
              ? 'Create a field to capture project-specific data on work items.'
              : 'No custom fields for this work type yet. Use Create field to add one.'
          }
        />
      )}

      {!isLoading && !error && grouped.size > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-300, 16px)' }}>
          {[...grouped.entries()].map(([entityType, rows]) => (
            <FieldGroup
              key={entityType}
              entityType={entityType}
              rows={rows}
              onEdit={setEditing}
              onDelete={setDeleting}
            />
          ))}
        </div>
      )}

      {createOpen && (
        <CreateOrEditModal
          mode="create"
          onClose={() => setCreateOpen(false)}
          queryInvalidate={['admin', 'custom-field-defs', entityFilter]}
        />
      )}

      {editing && (
        <CreateOrEditModal
          mode="edit"
          row={editing}
          onClose={() => setEditing(null)}
          queryInvalidate={['admin', 'custom-field-defs', entityFilter]}
        />
      )}

      {deleting && (
        <DeleteConfirmModal
          row={deleting}
          onClose={() => setDeleting(null)}
          queryInvalidate={['admin', 'custom-field-defs', entityFilter]}
        />
      )}
    </div>
  );
}

// ─── Header ────────────────────────────────────────────────────────────────

function Header({
  entityFilter,
  onChangeFilter,
  onCreate,
}: {
  entityFilter: FilterValue;
  onChangeFilter: (v: FilterValue) => void;
  onCreate: () => void;
}) {
  const filterOptions: SelectOption[] = [
    { value: 'ALL', label: 'All work types' },
    ...ENTITY_OPTIONS,
  ];
  const value = filterOptions.find((o) => o.value === entityFilter) ?? filterOptions[0];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 'var(--ds-space-300, 16px)',
        marginBottom: 'var(--ds-space-400, 24px)',
        flexWrap: 'wrap',
      }}
    >
      <div>
        <Heading as="h1" size="large">
          Custom fields
        </Heading>
        <p
          style={{
            margin: 'var(--ds-space-100, 8px) 0 0',
            color: 'var(--ds-text-subtle, #44546F)',
            fontSize: 14,
            lineHeight: 1.5,
            maxWidth: 640,
          }}
        >
          Project-specific fields attached to work items. Filter by work type
          to see fields for that surface only.
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-space-200, 12px)' }}>
        <div style={{ minWidth: 220 }}>
          <Select
            options={filterOptions}
            value={value}
            onChange={(next) => onChangeFilter((next?.value as FilterValue) ?? 'ALL')}
            aria-label="Filter by work type"
          />
        </div>
        <Button appearance="primary" onClick={onCreate}>
          Create field
        </Button>
      </div>
    </div>
  );
}

// ─── Group + table ─────────────────────────────────────────────────────────

function FieldGroup({
  entityType,
  rows,
  onEdit,
  onDelete,
}: {
  entityType: string;
  rows: CustomFieldRow[];
  onEdit: (r: CustomFieldRow) => void;
  onDelete: (r: CustomFieldRow) => void;
}) {
  const label = ENTITY_OPTIONS.find((o) => o.value === entityType)?.label ?? entityType;
  return (
    <section
      style={{
        background: 'var(--ds-surface, #FFFFFF)',
        border: '1px solid var(--ds-border, #DCDFE4)',
        borderRadius: 'var(--ds-border-radius-100, 4px)',
        overflow: 'hidden',
      }}
    >
      <header
        style={{
          padding: 'var(--ds-space-200, 12px) var(--ds-space-300, 16px)',
          borderBottom: '1px solid var(--ds-border, #DCDFE4)',
          background: 'var(--ds-background-neutral-subtle, #F7F8F9)',
          fontWeight: 600,
          fontSize: 13,
          color: 'var(--ds-text, #172B4D)',
        }}
      >
        {label as string}{' '}
        <span style={{ color: 'var(--ds-text-subtlest, #626F86)', fontWeight: 400 }}>
          · {rows.length}
        </span>
      </header>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: 'var(--ds-surface, #FFFFFF)', borderBottom: '1px solid var(--ds-border, #DCDFE4)' }}>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Required</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Description</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <FieldRow key={row.id} row={row} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </tbody>
      </table>
    </section>
  );
}

function FieldRow({
  row,
  onEdit,
  onDelete,
}: {
  row: CustomFieldRow;
  onEdit: (r: CustomFieldRow) => void;
  onDelete: (r: CustomFieldRow) => void;
}) {
  const toggle = useAdminMutation<{ next: boolean }, CustomFieldRow>(
    {
      action: 'toggle',
      table: 'custom_field_defs',
      rowId: row.id,
      invalidate: [['admin', 'custom-field-defs', row.entity_type], ['admin', 'custom-field-defs', 'ALL']],
    },
    async ({ next }) => {
      const { data, error } = await typedQuery('custom_field_defs')
        .update({ is_active: next })
        .eq('id', row.id)
        .select('*')
        .single();
      if (error) throw error;
      return data as CustomFieldRow;
    },
  );

  return (
    <tr style={{ borderBottom: '1px solid var(--ds-border, #DCDFE4)' }}>
      <td style={tdStyle}>
        <div style={{ fontWeight: 500, color: 'var(--ds-text, #172B4D)' }}>{row.name}</div>
        {row.placeholder && (
          <div style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #626F86)' }}>
            placeholder: {row.placeholder}
          </div>
        )}
      </td>
      <td style={tdStyle}>
        <Lozenge appearance={TYPE_APPEARANCE[row.field_type]}>{row.field_type}</Lozenge>
      </td>
      <td style={tdStyle}>{row.required ? 'Yes' : 'No'}</td>
      <td style={tdStyle}>
        <Lozenge appearance={row.is_active ? 'success' : 'default'}>
          {row.is_active ? 'active' : 'inactive'}
        </Lozenge>
      </td>
      <td style={{ ...tdStyle, color: 'var(--ds-text-subtle, #44546F)' }}>
        {row.description ?? '—'}
      </td>
      <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
        <Button
          appearance="subtle"
          spacing="compact"
          isDisabled={toggle.isPending}
          onClick={() => toggle.mutate({ next: !row.is_active })}
        >
          {row.is_active ? 'Deactivate' : 'Activate'}
        </Button>{' '}
        <Button appearance="subtle" spacing="compact" onClick={() => onEdit(row)}>
          Edit
        </Button>{' '}
        <Button appearance="subtle" spacing="compact" onClick={() => onDelete(row)}>
          Delete
        </Button>
      </td>
    </tr>
  );
}

// ─── Create / Edit modal ───────────────────────────────────────────────────

interface FormState {
  name: string;
  entity_type: string;
  field_type: FieldType;
  required: boolean;
  placeholder: string;
  description: string;
  options: string;
  reason: string;
}

function emptyForm(): FormState {
  return {
    name: '',
    entity_type: 'story',
    field_type: 'text',
    required: false,
    placeholder: '',
    description: '',
    options: '',
    reason: '',
  };
}

function rowToForm(row: CustomFieldRow): FormState {
  return {
    name: row.name,
    entity_type: row.entity_type,
    field_type: row.field_type,
    required: !!row.required,
    placeholder: row.placeholder ?? '',
    description: row.description ?? '',
    options: (row.options_json ?? []).join('\n'),
    reason: '',
  };
}

function CreateOrEditModal({
  mode,
  row,
  onClose,
  queryInvalidate,
}: {
  mode: 'create' | 'edit';
  row?: CustomFieldRow;
  onClose: () => void;
  queryInvalidate: readonly [string, string, string];
}) {
  const [form, setForm] = useState<FormState>(() => (row ? rowToForm(row) : emptyForm()));
  const isOptionsType = form.field_type === 'select' || form.field_type === 'multi_select';

  const save = useAdminMutation<FormState, CustomFieldRow>(
    {
      action: mode === 'create' ? 'create' : 'update',
      table: 'custom_field_defs',
      rowId: row?.id ?? null,
      reason: form.reason,
      skipBeforeSnapshot: mode === 'create',
      invalidate: [queryInvalidate, ['admin', 'custom-field-defs', 'ALL']],
    },
    async (vars) => {
      const optionsJson = isOptionsType
        ? vars.options.split('\n').map((s) => s.trim()).filter(Boolean)
        : null;
      const payload = {
        name: vars.name.trim(),
        entity_type: vars.entity_type,
        field_type: vars.field_type,
        required: vars.required,
        placeholder: vars.placeholder.trim() || null,
        description: vars.description.trim() || null,
        options_json: optionsJson,
      };
      if (mode === 'create') {
        const { data, error } = await typedQuery('custom_field_defs')
          .insert({ ...payload, is_active: true })
          .select('*')
          .single();
        if (error) throw error;
        return data as CustomFieldRow;
      }
      const { data, error } = await typedQuery('custom_field_defs')
        .update(payload)
        .eq('id', row!.id)
        .select('*')
        .single();
      if (error) throw error;
      return data as CustomFieldRow;
    },
    { onSuccess: onClose },
  );

  const canSubmit = form.name.trim().length > 0 && !save.isPending;
  const entityValue =
    ENTITY_OPTIONS.find((o) => o.value === form.entity_type) ?? ENTITY_OPTIONS[0];
  const typeValue =
    FIELD_TYPE_OPTIONS.find((o) => o.value === form.field_type) ?? FIELD_TYPE_OPTIONS[0];

  return (
    <Modal isOpen onClose={onClose} width="medium">
      <ModalHeader>
        <ModalTitle>
          {mode === 'create' ? 'Create custom field' : `Edit ${row?.name ?? 'field'}`}
        </ModalTitle>
      </ModalHeader>
      <ModalBody>
        <FormGrid>
          <FieldRowLabel label="Name">
            <Textfield
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Customer-facing impact"
              autoFocus
            />
          </FieldRowLabel>

          <FieldRowLabel label="Work type" hint={mode === 'edit' ? 'Locked on edit — changing would orphan stored values.' : undefined}>
            <Select
              options={ENTITY_OPTIONS}
              value={entityValue}
              isDisabled={mode === 'edit'}
              onChange={(next) => next && setForm({ ...form, entity_type: String(next.value) })}
            />
          </FieldRowLabel>

          <FieldRowLabel label="Field type" hint={mode === 'edit' ? 'Locked on edit — changing would invalidate stored values.' : undefined}>
            <Select<FieldType>
              options={FIELD_TYPE_OPTIONS}
              value={typeValue}
              isDisabled={mode === 'edit'}
              onChange={(next) => next && setForm({ ...form, field_type: next.value })}
            />
          </FieldRowLabel>

          <FieldRowLabel label="Required">
            <Checkbox
              isChecked={form.required}
              onChange={(e) => setForm({ ...form, required: e.target.checked })}
              label="Users must fill this field on create"
            />
          </FieldRowLabel>

          <FieldRowLabel label="Placeholder">
            <Textfield
              value={form.placeholder}
              onChange={(e) => setForm({ ...form, placeholder: e.target.value })}
              placeholder="Shown when the field is empty"
            />
          </FieldRowLabel>

          <FieldRowLabel label="Description">
            <Textfield
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Help text shown next to the field"
            />
          </FieldRowLabel>

          {isOptionsType && (
            <FieldRowLabel label="Options" hint="One per line.">
              <textarea
                value={form.options}
                onChange={(e) => setForm({ ...form, options: e.target.value })}
                rows={4}
                style={textareaStyle}
                placeholder={'Option A\nOption B\nOption C'}
              />
            </FieldRowLabel>
          )}

          <FieldRowLabel label="Reason" hint="Optional. Captured in the audit log.">
            <Textfield
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value.slice(0, 500) })}
              placeholder="e.g. Adding for Q2 BR intake"
              maxLength={500}
            />
          </FieldRowLabel>
        </FormGrid>

        {save.error && (
          <div style={{ marginTop: 'var(--ds-space-300, 16px)' }}>
            <SectionMessage appearance="error" title="Save failed">
              <p style={{ margin: 0 }}>{(save.error as Error).message}</p>
            </SectionMessage>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose}>
          Cancel
        </Button>
        <Button
          appearance="primary"
          isLoading={save.isPending}
          isDisabled={!canSubmit}
          onClick={() => save.mutate(form)}
        >
          {mode === 'create' ? 'Create field' : 'Save changes'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

// ─── Delete confirm ────────────────────────────────────────────────────────

function DeleteConfirmModal({
  row,
  onClose,
  queryInvalidate,
}: {
  row: CustomFieldRow;
  onClose: () => void;
  queryInvalidate: readonly [string, string, string];
}) {
  const [reason, setReason] = useState('');

  const del = useAdminMutation<void, void>(
    {
      action: 'delete',
      table: 'custom_field_defs',
      rowId: row.id,
      reason,
      invalidate: [queryInvalidate, ['admin', 'custom-field-defs', 'ALL']],
    },
    async () => {
      const { error } = await typedQuery('custom_field_defs').delete().eq('id', row.id);
      if (error) throw error;
    },
    { onSuccess: onClose },
  );

  return (
    <Modal isOpen onClose={onClose} width="small">
      <ModalHeader>
        <ModalTitle>Delete &ldquo;{row.name}&rdquo;?</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <SectionMessage appearance="warning" title="Stored values are preserved">
          <p style={{ margin: 0, lineHeight: 1.5 }}>
            Field values stored in <code>custom_field_values</code> are not
            deleted. They become unreachable but remain in the database for
            recovery.
          </p>
        </SectionMessage>
        <div style={{ marginTop: 'var(--ds-space-300, 16px)' }}>
          <FieldRowLabel label="Reason" hint="Optional. Captured in the audit log.">
            <Textfield
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 500))}
              placeholder="e.g. Field was added by mistake"
              maxLength={500}
            />
          </FieldRowLabel>
        </div>
        {del.error && (
          <div style={{ marginTop: 'var(--ds-space-300, 16px)' }}>
            <SectionMessage appearance="error" title="Delete failed">
              <p style={{ margin: 0 }}>{(del.error as Error).message}</p>
            </SectionMessage>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose}>
          Cancel
        </Button>
        <Button
          appearance="danger"
          isLoading={del.isPending}
          onClick={() => del.mutate()}
        >
          Delete field
        </Button>
      </ModalFooter>
    </Modal>
  );
}

// ─── Form helpers ──────────────────────────────────────────────────────────

function FormGrid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-200, 12px)' }}>
      {children}
    </div>
  );
}

function FieldRowLabel({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-050, 4px)' }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text, #172B4D)' }}>{label}</span>
      {children}
      {hint && (
        <span style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #626F86)' }}>{hint}</span>
      )}
    </label>
  );
}

// ─── Style atoms ───────────────────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: 'var(--ds-space-150, 10px) var(--ds-space-200, 12px)',
  fontWeight: 600,
  color: 'var(--ds-text-subtle, #44546F)',
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: 0.4,
};

const tdStyle: React.CSSProperties = {
  padding: 'var(--ds-space-150, 10px) var(--ds-space-200, 12px)',
  verticalAlign: 'top',
  color: 'var(--ds-text, #172B4D)',
};

const spinnerWrapStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 'var(--ds-space-600, 48px)',
};

// DOM textarea is unavoidable until ADS Textarea ships — only the
// styling object lives here, the JSX <textarea> renders inline above.
const textareaStyle: React.CSSProperties = {
  width: '100%',
  padding: 'var(--ds-space-100, 8px)',
  border: '1px solid var(--ds-border, #DCDFE4)',
  borderRadius: 'var(--ds-border-radius-100, 4px)',
  fontFamily: 'inherit',
  fontSize: 14,
  lineHeight: 1.4,
  resize: 'vertical',
};
