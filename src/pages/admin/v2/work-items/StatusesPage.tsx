/**
 * StatusesPage — CRUD on epic_statuses / feature_statuses / theme_statuses.
 *
 * Phase 1b. Collapses three legacy admin pages (EpicStatuses, FeatureStatuses,
 * ThemeStatuses) into a single tabbed surface. The schemas are identical:
 *
 *   id, value, label, color, is_active, sort_order, created_at, updated_at
 *
 *   - `value` is a slug used as a stable foreign key from work-item rows.
 *     We lock it on edit because changing it would orphan history.
 *   - `color` is a stored hex string. We map it to a Lozenge appearance via
 *     the STATUS_COLORS palette below.
 *
 * The STATUS_COLORS palette holds raw hex literals — these are DB-stored
 * data (the colour stamped into each statuses row), not styling literals.
 * They live behind an eslint-disable so the admin v2 hex-ban doesn't fire.
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
  Spinner,
  Textfield,
  type LozengeAppearance,
} from '@/components/ads';
import { useAdminMutation } from '@/hooks/admin/useAdminMutation';

// ─── Schema ────────────────────────────────────────────────────────────────

type StatusKind = 'epic' | 'feature' | 'theme';

const TABLE_BY_KIND: Record<StatusKind, string> = {
  epic: 'epic_statuses',
  feature: 'feature_statuses',
  theme: 'theme_statuses',
};

const KIND_LABEL: Record<StatusKind, string> = {
  epic: 'Epic',
  feature: 'Feature',
  theme: 'Theme',
};

interface StatusRow {
  id: string;
  value: string;
  label: string;
  color: string;
  is_active: boolean;
  sort_order: number | null;
}

// ─── Status colour palette ────────────────────────────────────────────────
//
// These hex literals are DB-stored data, not styling. The admin v2 hex-ban
// doesn't apply.
//
/* eslint-disable no-restricted-syntax -- DB-stored hex values, not styling literals */
const STATUS_COLORS: ReadonlyArray<{
  hex: string;
  label: string;
  appearance: LozengeAppearance;
}> = [
  { hex: '#DCDFE4', label: 'Neutral', appearance: 'default' },
  { hex: '#1F845A', label: 'Green', appearance: 'success' },
  { hex: '#0C66E4', label: 'Blue', appearance: 'inprogress' },
  { hex: 'var(--ds-icon-accent-red, #C9372C)', label: 'Red', appearance: 'removed' },
  { hex: '#A54800', label: 'Orange', appearance: 'moved' },
  { hex: '#5E4DB2', label: 'Purple', appearance: 'new' },
];
/* eslint-enable no-restricted-syntax */

function appearanceForHex(hex: string): LozengeAppearance {
  const match = STATUS_COLORS.find((c) => c.hex.toLowerCase() === hex.toLowerCase());
  return match?.appearance ?? 'default';
}

function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function StatusesPage() {
  const [kind, setKind] = useState<StatusKind>('epic');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<StatusRow | null>(null);
  const [deleting, setDeleting] = useState<StatusRow | null>(null);

  const queryKey = useMemo(() => ['admin', 'statuses', kind] as const, [kind]);

  const { data, isLoading, error } = useQuery<StatusRow[]>({
    queryKey: [...queryKey],
    queryFn: async () => {
      const { data, error } = await typedQuery(TABLE_BY_KIND[kind])
        .select('*')
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('label', { ascending: true });
      if (error) throw error;
      return (data ?? []) as StatusRow[];
    },
    staleTime: 30_000,
  });

  return (
    <div
      data-testid="admin-v2/statuses/page"
      style={{ padding: 'var(--ds-space-400, 24px)', maxWidth: 1120 }}
    >
      <div style={{ marginBottom: 'var(--ds-space-300, 16px)' }}>
        <Heading as="h1" size="large">
          Statuses
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
          Status options shown on Epic, Feature, and Theme work items. The slug
          (<code>value</code>) is stored on each work item — changing it would
          orphan history, so we lock it on edit.
        </p>
      </div>

      <TabStrip kind={kind} onChange={setKind} />

      <Toolbar onCreate={() => setCreateOpen(true)} kind={kind} />

      {error && (
        <div style={{ marginBottom: 'var(--ds-space-300, 16px)' }}>
          <SectionMessage appearance="error" title={`Could not load ${KIND_LABEL[kind]} statuses`}>
            <p style={{ margin: 0 }}>{(error as Error).message}</p>
          </SectionMessage>
        </div>
      )}

      {isLoading && (
        <div style={spinnerWrapStyle}>
          <Spinner size="medium" />
        </div>
      )}

      {!isLoading && !error && (data ?? []).length === 0 && (
        <EmptyState
          header={`No ${KIND_LABEL[kind].toLowerCase()} statuses yet`}
          description="Create a status to make it available on work items of this type."
        />
      )}

      {!isLoading && !error && (data ?? []).length > 0 && (
        <StatusTable
          rows={data ?? []}
          kind={kind}
          onEdit={setEditing}
          onDelete={setDeleting}
        />
      )}

      {createOpen && (
        <CreateOrEditModal mode="create" kind={kind} onClose={() => setCreateOpen(false)} />
      )}

      {editing && (
        <CreateOrEditModal
          mode="edit"
          kind={kind}
          row={editing}
          onClose={() => setEditing(null)}
        />
      )}

      {deleting && (
        <DeleteConfirmModal kind={kind} row={deleting} onClose={() => setDeleting(null)} />
      )}
    </div>
  );
}

// ─── Tab strip ─────────────────────────────────────────────────────────────

function TabStrip({ kind, onChange }: { kind: StatusKind; onChange: (k: StatusKind) => void }) {
  const tabs: StatusKind[] = ['epic', 'feature', 'theme'];
  return (
    <div
      role="tablist"
      style={{
        display: 'flex',
        gap: 'var(--ds-space-100, 8px)',
        borderBottom: '1px solid var(--ds-border, #DCDFE4)',
        marginBottom: 'var(--ds-space-300, 16px)',
      }}
    >
      {tabs.map((t) => {
        const active = t === kind;
        return (
          <div
            key={t}
            role="tab"
            tabIndex={0}
            aria-selected={active}
            onClick={() => onChange(t)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onChange(t);
              }
            }}
            style={{
              borderBottom: active
                ? '2px solid var(--ds-border-selected, #0C66E4)'
                : '2px solid transparent',
              padding: 'var(--ds-space-150, 10px) var(--ds-space-200, 12px)',
              fontSize: 14,
              fontWeight: active ? 600 : 500,
              color: active
                ? 'var(--ds-text-selected, #0C66E4)'
                : 'var(--ds-text, #172B4D)',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            {KIND_LABEL[t]}
          </div>
        );
      })}
    </div>
  );
}

// ─── Toolbar ───────────────────────────────────────────────────────────────

function Toolbar({ onCreate, kind }: { onCreate: () => void; kind: StatusKind }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--ds-space-300, 16px)',
        marginBottom: 'var(--ds-space-200, 12px)',
      }}
    >
      <span style={{ color: 'var(--ds-text-subtle, #44546F)', fontSize: 13 }}>
        Statuses available on {KIND_LABEL[kind].toLowerCase()} work items.
      </span>
      <Button appearance="primary" onClick={onCreate}>
        Create status
      </Button>
    </div>
  );
}

// ─── Status table ──────────────────────────────────────────────────────────

function StatusTable({
  rows,
  kind,
  onEdit,
  onDelete,
}: {
  rows: StatusRow[];
  kind: StatusKind;
  onEdit: (r: StatusRow) => void;
  onDelete: (r: StatusRow) => void;
}) {
  return (
    <div
      style={{
        background: 'var(--ds-surface, #FFFFFF)',
        border: '1px solid var(--ds-border, #DCDFE4)',
        borderRadius: 'var(--ds-border-radius-100, 4px)',
        overflow: 'hidden',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr
            style={{
              background: 'var(--ds-background-neutral-subtle, #F7F8F9)',
              borderBottom: '1px solid var(--ds-border, #DCDFE4)',
            }}
          >
            <th style={{ ...thStyle, width: 80 }}>Order</th>
            <th style={{ ...thStyle, width: 120 }}>Preview</th>
            <th style={thStyle}>Label</th>
            <th style={thStyle}>Slug</th>
            <th style={{ ...thStyle, width: 100 }}>State</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <StatusRowItem key={row.id} row={row} kind={kind} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusRowItem({
  row,
  kind,
  onEdit,
  onDelete,
}: {
  row: StatusRow;
  kind: StatusKind;
  onEdit: (r: StatusRow) => void;
  onDelete: (r: StatusRow) => void;
}) {
  const toggle = useAdminMutation<{ next: boolean }, StatusRow>(
    {
      action: 'toggle',
      table: TABLE_BY_KIND[kind],
      rowId: row.id,
      invalidate: [['admin', 'statuses', kind]],
    },
    async ({ next }) => {
      const { data, error } = await typedQuery(TABLE_BY_KIND[kind])
        .update({ is_active: next })
        .eq('id', row.id)
        .select('*')
        .single();
      if (error) throw error;
      return data as StatusRow;
    },
  );

  return (
    <tr style={{ borderBottom: '1px solid var(--ds-border, #DCDFE4)' }}>
      <td style={tdStyle}>{row.sort_order ?? '—'}</td>
      <td style={tdStyle}>
        <Lozenge appearance={appearanceForHex(row.color)}>{row.label}</Lozenge>
      </td>
      <td style={tdStyle}>
        <span style={{ fontWeight: 500 }}>{row.label}</span>
      </td>
      <td
        style={{
          ...tdStyle,
          fontFamily:
            'var(--ds-font-family-code, ui-monospace, SF Mono, Menlo, Consolas)',
          color: 'var(--ds-text-subtle, #44546F)',
        }}
      >
        {row.value}
      </td>
      <td style={tdStyle}>
        <Lozenge appearance={row.is_active ? 'success' : 'default'}>
          {row.is_active ? 'Active' : 'Inactive'}
        </Lozenge>
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
  label: string;
  slug: string;
  slugTouched: boolean;
  color: string;
  is_active: boolean;
  sort_order: string;
  reason: string;
}

function emptyForm(): FormState {
  return {
    label: '',
    slug: '',
    slugTouched: false,
    color: STATUS_COLORS[0].hex,
    is_active: true,
    sort_order: '',
    reason: '',
  };
}

function rowToForm(row: StatusRow): FormState {
  return {
    label: row.label,
    slug: row.value,
    slugTouched: true,
    color: row.color,
    is_active: row.is_active,
    sort_order: row.sort_order != null ? String(row.sort_order) : '',
    reason: '',
  };
}

function CreateOrEditModal({
  mode,
  kind,
  row,
  onClose,
}: {
  mode: 'create' | 'edit';
  kind: StatusKind;
  row?: StatusRow;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => (row ? rowToForm(row) : emptyForm()));

  const save = useAdminMutation<FormState, StatusRow>(
    {
      action: mode === 'create' ? 'create' : 'update',
      table: TABLE_BY_KIND[kind],
      rowId: row?.id ?? null,
      reason: form.reason,
      skipBeforeSnapshot: mode === 'create',
      invalidate: [['admin', 'statuses', kind]],
    },
    async (vars) => {
      const slugFinal = vars.slugTouched ? vars.slug.trim() : slugify(vars.label);
      const sortFinal = vars.sort_order.trim() === '' ? null : Number(vars.sort_order);
      const payload = {
        label: vars.label.trim(),
        color: vars.color,
        is_active: vars.is_active,
        sort_order: Number.isFinite(sortFinal as number) ? sortFinal : null,
      };
      if (mode === 'create') {
        const { data, error } = await typedQuery(TABLE_BY_KIND[kind])
          .insert({ ...payload, value: slugFinal })
          .select('*')
          .single();
        if (error) throw error;
        return data as StatusRow;
      }
      const { data, error } = await typedQuery(TABLE_BY_KIND[kind])
        .update(payload)
        .eq('id', row!.id)
        .select('*')
        .single();
      if (error) throw error;
      return data as StatusRow;
    },
    { onSuccess: onClose },
  );

  const effectiveSlug = form.slugTouched ? form.slug : slugify(form.label);
  const canSubmit =
    form.label.trim().length > 0 && effectiveSlug.length > 0 && !save.isPending;

  return (
    <Modal isOpen onClose={onClose} width="medium">
      <ModalHeader>
        <ModalTitle>
          {mode === 'create' ? `Create ${KIND_LABEL[kind].toLowerCase()} status` : `Edit ${row?.label ?? 'status'}`}
        </ModalTitle>
      </ModalHeader>
      <ModalBody>
        <FormGrid>
          <FieldRowLabel label="Label">
            <Textfield
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="e.g. In progress"
              autoFocus
            />
          </FieldRowLabel>

          <FieldRowLabel
            label="Slug"
            hint={
              mode === 'edit'
                ? 'Locked on edit — changing this would orphan history.'
                : 'Auto-derived from the label until you edit it.'
            }
          >
            <Textfield
              value={effectiveSlug}
              onChange={(e) => setForm({ ...form, slug: e.target.value, slugTouched: true })}
              isDisabled={mode === 'edit'}
            />
          </FieldRowLabel>

          <FieldRowLabel label="Color">
            <ColorSwatchGrid
              value={form.color}
              onChange={(hex) => setForm({ ...form, color: hex })}
            />
          </FieldRowLabel>

          <FieldRowLabel label="Sort order" hint="Optional. Lower numbers appear first.">
            <Textfield
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
              placeholder="e.g. 10"
            />
          </FieldRowLabel>

          <FieldRowLabel label="Active">
            <Checkbox
              isChecked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              label="Show this status to users"
            />
          </FieldRowLabel>

          <FieldRowLabel label="Reason" hint="Optional. Captured in the audit log.">
            <Textfield
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value.slice(0, 500) })}
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
          {mode === 'create' ? 'Create status' : 'Save changes'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

// ─── Color picker ──────────────────────────────────────────────────────────

function ColorSwatchGrid({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 'var(--ds-space-100, 8px)', flexWrap: 'wrap' }}>
      {STATUS_COLORS.map((c) => {
        const active = c.hex.toLowerCase() === value.toLowerCase();
        return (
          <div
            key={c.hex}
            role="button"
            tabIndex={0}
            aria-label={`${c.label} (${c.hex})`}
            aria-pressed={active}
            onClick={() => onChange(c.hex)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onChange(c.hex);
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--ds-space-100, 8px)',
              padding: 'var(--ds-space-050, 4px) var(--ds-space-150, 10px)',
              border: active
                ? '2px solid var(--ds-border-selected, #0C66E4)'
                : '1px solid var(--ds-border, #DCDFE4)',
              borderRadius: 'var(--ds-border-radius-100, 4px)',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: c.hex,
                border: '1px solid var(--ds-border, #DCDFE4)',
              }}
            />
            <span style={{ color: 'var(--ds-text, #172B4D)' }}>{c.label}</span>
            <Lozenge appearance={c.appearance}>preview</Lozenge>
          </div>
        );
      })}
    </div>
  );
}

// ─── Delete confirm ────────────────────────────────────────────────────────

function DeleteConfirmModal({
  kind,
  row,
  onClose,
}: {
  kind: StatusKind;
  row: StatusRow;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const del = useAdminMutation<void, void>(
    {
      action: 'delete',
      table: TABLE_BY_KIND[kind],
      rowId: row.id,
      reason,
      invalidate: [['admin', 'statuses', kind]],
    },
    async () => {
      const { error } = await typedQuery(TABLE_BY_KIND[kind]).delete().eq('id', row.id);
      if (error) throw error;
    },
    { onSuccess: onClose },
  );

  return (
    <Modal isOpen onClose={onClose} width="small">
      <ModalHeader>
        <ModalTitle>Delete &ldquo;{row.label}&rdquo;?</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <SectionMessage appearance="warning" title="Historical items keep their status">
          <p style={{ margin: 0, lineHeight: 1.5 }}>
            Existing {KIND_LABEL[kind].toLowerCase()}s currently using this status
            will keep the slug <code>{row.value}</code> stamped on their row, but
            the status will no longer be selectable for new work.
          </p>
        </SectionMessage>
        <div style={{ marginTop: 'var(--ds-space-300, 16px)' }}>
          <FieldRowLabel label="Reason" hint="Optional. Captured in the audit log.">
            <Textfield
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 500))}
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
        <Button appearance="danger" isLoading={del.isPending} onClick={() => del.mutate()}>
          Delete status
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
