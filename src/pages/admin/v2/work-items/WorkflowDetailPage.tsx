/**
 * WorkflowDetailPage — statuses + transitions for a single workflow scheme.
 *
 * Routed at /admin/v2/work-items/workflows/:schemeId.
 *
 * The two inner editors operate on:
 *   catalyst_workflow_statuses    (per-scheme columns)
 *   catalyst_workflow_transitions (from→to graph edges)
 *
 * Statuses table edits: name, slug, category, color, position, is_initial, is_final.
 * Optional kanban-side columns (wip_limit, slug_aliases, status-level is_active)
 * are NOT exposed here — those are board-display concerns owned by the
 * kanban-parity migration. We read but never write them so this page works
 * whether or not that migration has run.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
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

// ─── Schema ────────────────────────────────────────────────────────────────

interface WorkflowSchemeRow {
  id: string;
  name: string;
  description: string | null;
  issue_type: string;
  is_active: boolean;
  is_default: boolean;
}

interface WorkflowStatusRow {
  id: string;
  scheme_id: string;
  name: string;
  slug: string;
  category: string;
  color: string;
  position: number;
  is_initial: boolean;
  is_final: boolean;
}

interface WorkflowTransitionRow {
  id: string;
  scheme_id: string;
  name: string | null;
  from_status_id: string | null;
  to_status_id: string;
  is_global: boolean;
  sort_order: number;
}

const CATEGORY_OPTIONS: SelectOption[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

const CATEGORY_APPEARANCE: Record<string, LozengeAppearance> = {
  todo: 'default',
  in_progress: 'inprogress',
  done: 'success',
};

// Status colour palette — DB-stored hex values, not styling literals.
/* eslint-disable no-restricted-syntax -- DB-stored hex values, not styling literals */
const STATUS_COLORS: ReadonlyArray<{ hex: string; label: string; appearance: LozengeAppearance }> = [
  { hex: '#DCDFE4', label: 'Neutral', appearance: 'default' },
  { hex: '#1F845A', label: 'Green', appearance: 'success' },
  { hex: '#0C66E4', label: 'Blue', appearance: 'inprogress' },
  { hex: '#C9372C', label: 'Red', appearance: 'removed' },
  { hex: '#A54800', label: 'Orange', appearance: 'moved' },
  { hex: '#5E4DB2', label: 'Purple', appearance: 'new' },
];
/* eslint-enable no-restricted-syntax */

function appearanceForHex(hex: string): LozengeAppearance {
  return STATUS_COLORS.find((c) => c.hex.toLowerCase() === hex.toLowerCase())?.appearance ?? 'default';
}

function slugify(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64);
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function WorkflowDetailPage() {
  const { schemeId } = useParams<{ schemeId: string }>();
  const safeSchemeId = schemeId ?? '';

  const { data: scheme, isLoading: schemeLoading, error: schemeError } = useQuery<WorkflowSchemeRow | null>({
    queryKey: ['admin', 'workflows', 'scheme', safeSchemeId],
    queryFn: async () => {
      if (!safeSchemeId) return null;
      const { data, error } = await typedQuery('catalyst_workflow_schemes')
        .select('*')
        .eq('id', safeSchemeId)
        .maybeSingle();
      if (error) throw error;
      return data as WorkflowSchemeRow | null;
    },
    enabled: !!safeSchemeId,
    staleTime: 30_000,
  });

  if (!safeSchemeId) {
    return (
      <div style={{ padding: 'var(--ds-space-400, 24px)' }}>
        <SectionMessage appearance="error" title="Missing scheme id">
          <p style={{ margin: 0 }}>This route requires a scheme id.</p>
        </SectionMessage>
      </div>
    );
  }

  return (
    <div
      data-testid="admin-v2/workflow-detail/page"
      style={{ padding: 'var(--ds-space-400, 24px)', maxWidth: 1280 }}
    >
      <BackLink />

      {schemeError && (
        <SectionMessage appearance="error" title="Could not load scheme">
          <p style={{ margin: 0 }}>{(schemeError as Error).message}</p>
        </SectionMessage>
      )}

      {schemeLoading && (
        <div style={spinnerWrapStyle}>
          <Spinner size="medium" />
        </div>
      )}

      {!schemeLoading && !schemeError && !scheme && (
        <EmptyState
          header="Scheme not found"
          description="The scheme may have been deleted. Return to Workflows and pick another."
        />
      )}

      {scheme && (
        <>
          <SchemeHeader scheme={scheme} />
          <StatusesSection schemeId={safeSchemeId} />
          <TransitionsSection schemeId={safeSchemeId} />
        </>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <div style={{ marginBottom: 'var(--ds-space-200, 12px)' }}>
      <Link
        to="/admin/v2/work-items/workflows"
        style={{
          fontSize: 13,
          color: 'var(--ds-text-selected, #0C66E4)',
          textDecoration: 'none',
        }}
      >
        ← Back to Workflows
      </Link>
    </div>
  );
}

function SchemeHeader({ scheme }: { scheme: WorkflowSchemeRow }) {
  return (
    <div style={{ marginBottom: 'var(--ds-space-400, 24px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-space-200, 12px)', flexWrap: 'wrap' }}>
        <Heading as="h1" size="large">
          {scheme.name}
        </Heading>
        <Lozenge appearance="default">{scheme.issue_type}</Lozenge>
        {scheme.is_default && <Lozenge appearance="success">default</Lozenge>}
        <Lozenge appearance={scheme.is_active ? 'success' : 'default'}>
          {scheme.is_active ? 'active' : 'inactive'}
        </Lozenge>
      </div>
      {scheme.description && (
        <p
          style={{
            margin: 'var(--ds-space-100, 8px) 0 0',
            color: 'var(--ds-text-subtle, #44546F)',
            fontSize: 14,
            lineHeight: 1.5,
            maxWidth: 640,
          }}
        >
          {scheme.description}
        </p>
      )}
    </div>
  );
}

// ─── Statuses section ─────────────────────────────────────────────────────

function StatusesSection({ schemeId }: { schemeId: string }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<WorkflowStatusRow | null>(null);
  const [deleting, setDeleting] = useState<WorkflowStatusRow | null>(null);

  const queryKey = ['admin', 'workflows', 'statuses', schemeId] as const;

  const { data, isLoading, error } = useQuery<WorkflowStatusRow[]>({
    queryKey: [...queryKey],
    queryFn: async () => {
      const { data, error } = await typedQuery('catalyst_workflow_statuses')
        .select('*')
        .eq('scheme_id', schemeId)
        .order('position', { ascending: true });
      if (error) throw error;
      return (data ?? []) as WorkflowStatusRow[];
    },
    staleTime: 30_000,
  });

  return (
    <section
      style={{
        background: 'var(--ds-surface, #FFFFFF)',
        border: '1px solid var(--ds-border, #DCDFE4)',
        borderRadius: 'var(--ds-border-radius-100, 4px)',
        marginBottom: 'var(--ds-space-300, 16px)',
        overflow: 'hidden',
      }}
    >
      <SectionHeader
        title="Statuses"
        hint="Each status is a column on the board for this issue type."
        onCreate={() => setCreateOpen(true)}
        createLabel="Add status"
      />

      {error && (
        <div style={{ padding: 'var(--ds-space-300, 16px)' }}>
          <SectionMessage appearance="error" title="Could not load statuses">
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
        <div style={{ padding: 'var(--ds-space-400, 24px)' }}>
          <EmptyState
            header="No statuses yet"
            description="Add at least one status to make this scheme usable."
          />
        </div>
      )}

      {!isLoading && !error && (data ?? []).length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr
              style={{
                background: 'var(--ds-background-neutral-subtle, #F7F8F9)',
                borderBottom: '1px solid var(--ds-border, #DCDFE4)',
              }}
            >
              <th style={{ ...thStyle, width: 80 }}>Position</th>
              <th style={{ ...thStyle, width: 140 }}>Preview</th>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Slug</th>
              <th style={thStyle}>Category</th>
              <th style={{ ...thStyle, width: 90 }}>Initial</th>
              <th style={{ ...thStyle, width: 90 }}>Final</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((row) => (
              <StatusRowItem
                key={row.id}
                row={row}
                onEdit={setEditing}
                onDelete={setDeleting}
              />
            ))}
          </tbody>
        </table>
      )}

      {createOpen && (
        <StatusModal
          mode="create"
          schemeId={schemeId}
          onClose={() => setCreateOpen(false)}
        />
      )}
      {editing && (
        <StatusModal
          mode="edit"
          schemeId={schemeId}
          row={editing}
          onClose={() => setEditing(null)}
        />
      )}
      {deleting && (
        <StatusDeleteModal
          schemeId={schemeId}
          row={deleting}
          onClose={() => setDeleting(null)}
        />
      )}
    </section>
  );
}

function StatusRowItem({
  row,
  onEdit,
  onDelete,
}: {
  row: WorkflowStatusRow;
  onEdit: (r: WorkflowStatusRow) => void;
  onDelete: (r: WorkflowStatusRow) => void;
}) {
  return (
    <tr style={{ borderBottom: '1px solid var(--ds-border, #DCDFE4)' }}>
      <td style={tdStyle}>{row.position}</td>
      <td style={tdStyle}>
        <Lozenge appearance={appearanceForHex(row.color)}>{row.name}</Lozenge>
      </td>
      <td style={tdStyle}>
        <span style={{ fontWeight: 500 }}>{row.name}</span>
      </td>
      <td style={{ ...tdStyle, fontFamily: 'var(--ds-font-family-code, ui-monospace, SF Mono, Menlo, Consolas)', color: 'var(--ds-text-subtle, #44546F)' }}>
        {row.slug}
      </td>
      <td style={tdStyle}>
        <Lozenge appearance={CATEGORY_APPEARANCE[row.category] ?? 'default'}>
          {row.category}
        </Lozenge>
      </td>
      <td style={tdStyle}>{row.is_initial ? 'Yes' : '—'}</td>
      <td style={tdStyle}>{row.is_final ? 'Yes' : '—'}</td>
      <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
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

interface StatusFormState {
  name: string;
  slug: string;
  slugTouched: boolean;
  category: string;
  color: string;
  position: string;
  is_initial: boolean;
  is_final: boolean;
  reason: string;
}

function emptyStatusForm(nextPosition: number): StatusFormState {
  return {
    name: '',
    slug: '',
    slugTouched: false,
    category: 'todo',
    color: STATUS_COLORS[0].hex,
    position: String(nextPosition),
    is_initial: false,
    is_final: false,
    reason: '',
  };
}

function statusRowToForm(row: WorkflowStatusRow): StatusFormState {
  return {
    name: row.name,
    slug: row.slug,
    slugTouched: true,
    category: row.category,
    color: row.color,
    position: String(row.position),
    is_initial: row.is_initial,
    is_final: row.is_final,
    reason: '',
  };
}

function StatusModal({
  mode,
  schemeId,
  row,
  onClose,
}: {
  mode: 'create' | 'edit';
  schemeId: string;
  row?: WorkflowStatusRow;
  onClose: () => void;
}) {
  // Compute the next position for new rows by looking at the cache (cheap read).
  const { data: existing } = useQuery<WorkflowStatusRow[]>({
    queryKey: ['admin', 'workflows', 'statuses', schemeId],
    queryFn: async () => {
      const { data, error } = await typedQuery('catalyst_workflow_statuses')
        .select('*')
        .eq('scheme_id', schemeId)
        .order('position', { ascending: true });
      if (error) throw error;
      return (data ?? []) as WorkflowStatusRow[];
    },
    enabled: mode === 'create',
  });
  const nextPosition = (existing?.length ?? 0) * 10 + 10;

  const [form, setForm] = useState<StatusFormState>(() =>
    row ? statusRowToForm(row) : emptyStatusForm(nextPosition),
  );

  const save = useAdminMutation<StatusFormState, WorkflowStatusRow>(
    {
      action: mode === 'create' ? 'create' : 'update',
      table: 'catalyst_workflow_statuses',
      rowId: row?.id ?? null,
      reason: form.reason,
      skipBeforeSnapshot: mode === 'create',
      invalidate: [['admin', 'workflows', 'statuses', schemeId]],
    },
    async (vars) => {
      const slugFinal = vars.slugTouched ? vars.slug.trim() : slugify(vars.name);
      const positionFinal = vars.position.trim() === '' ? 0 : Number(vars.position);
      const payload = {
        name: vars.name.trim(),
        category: vars.category,
        color: vars.color,
        position: Number.isFinite(positionFinal) ? positionFinal : 0,
        is_initial: vars.is_initial,
        is_final: vars.is_final,
      };
      if (mode === 'create') {
        const { data, error } = await typedQuery('catalyst_workflow_statuses')
          .insert({ ...payload, scheme_id: schemeId, slug: slugFinal })
          .select('*')
          .single();
        if (error) throw error;
        return data as WorkflowStatusRow;
      }
      const { data, error } = await typedQuery('catalyst_workflow_statuses')
        .update(payload)
        .eq('id', row!.id)
        .select('*')
        .single();
      if (error) throw error;
      return data as WorkflowStatusRow;
    },
    { onSuccess: onClose },
  );

  const categoryValue = CATEGORY_OPTIONS.find((o) => o.value === form.category) ?? CATEGORY_OPTIONS[0];
  const effectiveSlug = form.slugTouched ? form.slug : slugify(form.name);
  const canSubmit =
    form.name.trim().length > 0 && effectiveSlug.length > 0 && !save.isPending;

  return (
    <Modal isOpen onClose={onClose} width="medium">
      <ModalHeader>
        <ModalTitle>{mode === 'create' ? 'Add status' : `Edit ${row?.name ?? 'status'}`}</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <FormGrid>
          <FieldRowLabel label="Name">
            <Textfield
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. In review"
              autoFocus
            />
          </FieldRowLabel>

          <FieldRowLabel
            label="Slug"
            hint={
              mode === 'edit'
                ? 'Locked on edit — issues stamped with this slug would orphan.'
                : 'Auto-derived from the name until you edit it.'
            }
          >
            <Textfield
              value={effectiveSlug}
              onChange={(e) => setForm({ ...form, slug: e.target.value, slugTouched: true })}
              isDisabled={mode === 'edit'}
            />
          </FieldRowLabel>

          <FieldRowLabel label="Category" hint="Drives board grouping (To Do / In Progress / Done).">
            <Select
              options={CATEGORY_OPTIONS}
              value={categoryValue}
              onChange={(next) => next && setForm({ ...form, category: String(next.value) })}
            />
          </FieldRowLabel>

          <FieldRowLabel label="Color">
            <ColorSwatchGrid value={form.color} onChange={(hex) => setForm({ ...form, color: hex })} />
          </FieldRowLabel>

          <FieldRowLabel label="Position" hint="Lower numbers appear first on the board.">
            <Textfield
              type="number"
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
            />
          </FieldRowLabel>

          <FieldRowLabel label="Initial">
            <Checkbox
              isChecked={form.is_initial}
              onChange={(e) => setForm({ ...form, is_initial: e.target.checked })}
              label="New issues default to this status"
            />
          </FieldRowLabel>

          <FieldRowLabel label="Final">
            <Checkbox
              isChecked={form.is_final}
              onChange={(e) => setForm({ ...form, is_final: e.target.checked })}
              label="Issues in this status are considered closed"
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
          {mode === 'create' ? 'Add status' : 'Save changes'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

function StatusDeleteModal({
  schemeId,
  row,
  onClose,
}: {
  schemeId: string;
  row: WorkflowStatusRow;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');

  const del = useAdminMutation<void, void>(
    {
      action: 'delete',
      table: 'catalyst_workflow_statuses',
      rowId: row.id,
      reason,
      invalidate: [
        ['admin', 'workflows', 'statuses', schemeId],
        ['admin', 'workflows', 'transitions', schemeId],
      ],
    },
    async () => {
      // Drop any transitions that point at this status first; PostgREST
      // returns a clearer error than a deferred FK trigger.
      await typedQuery('catalyst_workflow_transitions')
        .delete()
        .or(`from_status_id.eq.${row.id},to_status_id.eq.${row.id}`);
      const { error } = await typedQuery('catalyst_workflow_statuses').delete().eq('id', row.id);
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
        <SectionMessage appearance="warning" title="Transitions referencing this status are removed">
          <p style={{ margin: 0, lineHeight: 1.5 }}>
            Any transition with this status as its from or to is dropped
            with it. Issues currently in this status keep the slug{' '}
            <code>{row.slug}</code> stamped on their row but the status
            won&apos;t be selectable for new work.
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

// ─── Transitions section ──────────────────────────────────────────────────

function TransitionsSection({ schemeId }: { schemeId: string }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<WorkflowTransitionRow | null>(null);
  const [deleting, setDeleting] = useState<WorkflowTransitionRow | null>(null);

  const queryKey = ['admin', 'workflows', 'transitions', schemeId] as const;

  const { data: transitions, isLoading, error } = useQuery<WorkflowTransitionRow[]>({
    queryKey: [...queryKey],
    queryFn: async () => {
      const { data, error } = await typedQuery('catalyst_workflow_transitions')
        .select('*')
        .eq('scheme_id', schemeId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as WorkflowTransitionRow[];
    },
    staleTime: 30_000,
  });

  // Statuses for the from/to picker — read-only join.
  const { data: statuses } = useQuery<WorkflowStatusRow[]>({
    queryKey: ['admin', 'workflows', 'statuses', schemeId],
    queryFn: async () => {
      const { data, error } = await typedQuery('catalyst_workflow_statuses')
        .select('*')
        .eq('scheme_id', schemeId)
        .order('position', { ascending: true });
      if (error) throw error;
      return (data ?? []) as WorkflowStatusRow[];
    },
    staleTime: 30_000,
  });

  const statusById = useMemo(() => {
    const m = new Map<string, WorkflowStatusRow>();
    (statuses ?? []).forEach((s) => m.set(s.id, s));
    return m;
  }, [statuses]);

  return (
    <section
      style={{
        background: 'var(--ds-surface, #FFFFFF)',
        border: '1px solid var(--ds-border, #DCDFE4)',
        borderRadius: 'var(--ds-border-radius-100, 4px)',
        overflow: 'hidden',
      }}
    >
      <SectionHeader
        title="Transitions"
        hint="Allowed status moves. A transition with no From applies to every status."
        onCreate={() => setCreateOpen(true)}
        createLabel="Add transition"
      />

      {error && (
        <div style={{ padding: 'var(--ds-space-300, 16px)' }}>
          <SectionMessage appearance="error" title="Could not load transitions">
            <p style={{ margin: 0 }}>{(error as Error).message}</p>
          </SectionMessage>
        </div>
      )}

      {isLoading && (
        <div style={spinnerWrapStyle}>
          <Spinner size="medium" />
        </div>
      )}

      {!isLoading && !error && (transitions ?? []).length === 0 && (
        <div style={{ padding: 'var(--ds-space-400, 24px)' }}>
          <EmptyState
            header="No transitions yet"
            description="Add a transition to allow issues to move between statuses."
          />
        </div>
      )}

      {!isLoading && !error && (transitions ?? []).length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr
              style={{
                background: 'var(--ds-background-neutral-subtle, #F7F8F9)',
                borderBottom: '1px solid var(--ds-border, #DCDFE4)',
              }}
            >
              <th style={{ ...thStyle, width: 80 }}>Order</th>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>From</th>
              <th style={thStyle}>To</th>
              <th style={{ ...thStyle, width: 100 }}>Global</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(transitions ?? []).map((t) => (
              <TransitionRowItem
                key={t.id}
                row={t}
                statusById={statusById}
                onEdit={setEditing}
                onDelete={setDeleting}
              />
            ))}
          </tbody>
        </table>
      )}

      {createOpen && statuses && (
        <TransitionModal
          mode="create"
          schemeId={schemeId}
          statuses={statuses}
          onClose={() => setCreateOpen(false)}
        />
      )}
      {editing && statuses && (
        <TransitionModal
          mode="edit"
          schemeId={schemeId}
          statuses={statuses}
          row={editing}
          onClose={() => setEditing(null)}
        />
      )}
      {deleting && (
        <TransitionDeleteModal
          schemeId={schemeId}
          row={deleting}
          onClose={() => setDeleting(null)}
        />
      )}
    </section>
  );
}

function TransitionRowItem({
  row,
  statusById,
  onEdit,
  onDelete,
}: {
  row: WorkflowTransitionRow;
  statusById: Map<string, WorkflowStatusRow>;
  onEdit: (r: WorkflowTransitionRow) => void;
  onDelete: (r: WorkflowTransitionRow) => void;
}) {
  const fromStatus = row.from_status_id ? statusById.get(row.from_status_id) : null;
  const toStatus = statusById.get(row.to_status_id);
  return (
    <tr style={{ borderBottom: '1px solid var(--ds-border, #DCDFE4)' }}>
      <td style={tdStyle}>{row.sort_order}</td>
      <td style={tdStyle}>
        {row.name ? <span style={{ fontWeight: 500 }}>{row.name}</span> : <span style={{ color: 'var(--ds-text-subtlest, #626F86)' }}>—</span>}
      </td>
      <td style={tdStyle}>
        {row.is_global || !fromStatus ? (
          <span style={{ color: 'var(--ds-text-subtlest, #626F86)', fontStyle: 'italic' }}>any</span>
        ) : (
          <Lozenge appearance={appearanceForHex(fromStatus.color)}>{fromStatus.name}</Lozenge>
        )}
      </td>
      <td style={tdStyle}>
        {toStatus ? (
          <Lozenge appearance={appearanceForHex(toStatus.color)}>{toStatus.name}</Lozenge>
        ) : (
          <span style={{ color: 'var(--ds-text-subtlest, #626F86)' }}>—</span>
        )}
      </td>
      <td style={tdStyle}>
        <Lozenge appearance={row.is_global ? 'inprogress' : 'default'}>
          {row.is_global ? 'global' : 'scoped'}
        </Lozenge>
      </td>
      <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
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

interface TransitionFormState {
  name: string;
  from_status_id: string; // empty string when global / any
  to_status_id: string;
  is_global: boolean;
  sort_order: string;
  reason: string;
}

function emptyTransitionForm(nextSort: number): TransitionFormState {
  return {
    name: '',
    from_status_id: '',
    to_status_id: '',
    is_global: false,
    sort_order: String(nextSort),
    reason: '',
  };
}

function transitionRowToForm(row: WorkflowTransitionRow): TransitionFormState {
  return {
    name: row.name ?? '',
    from_status_id: row.from_status_id ?? '',
    to_status_id: row.to_status_id,
    is_global: row.is_global,
    sort_order: String(row.sort_order),
    reason: '',
  };
}

function TransitionModal({
  mode,
  schemeId,
  statuses,
  row,
  onClose,
}: {
  mode: 'create' | 'edit';
  schemeId: string;
  statuses: WorkflowStatusRow[];
  row?: WorkflowTransitionRow;
  onClose: () => void;
}) {
  const nextSort = mode === 'create' ? (statuses.length + 1) * 10 : 0;
  const [form, setForm] = useState<TransitionFormState>(() =>
    row ? transitionRowToForm(row) : emptyTransitionForm(nextSort),
  );

  const fromOptions: SelectOption[] = [
    { value: '', label: '(any — applies to every status)' },
    ...statuses.map((s) => ({ value: s.id, label: s.name })),
  ];
  const toOptions: SelectOption[] = statuses.map((s) => ({ value: s.id, label: s.name }));
  const fromValue = fromOptions.find((o) => o.value === form.from_status_id) ?? fromOptions[0];
  const toValue = toOptions.find((o) => o.value === form.to_status_id) ?? null;

  const save = useAdminMutation<TransitionFormState, WorkflowTransitionRow>(
    {
      action: mode === 'create' ? 'create' : 'update',
      table: 'catalyst_workflow_transitions',
      rowId: row?.id ?? null,
      reason: form.reason,
      skipBeforeSnapshot: mode === 'create',
      invalidate: [['admin', 'workflows', 'transitions', schemeId]],
    },
    async (vars) => {
      const sortFinal = vars.sort_order.trim() === '' ? 0 : Number(vars.sort_order);
      const isGlobalEffective = vars.is_global || vars.from_status_id === '';
      const payload = {
        name: vars.name.trim() || null,
        from_status_id: isGlobalEffective ? null : vars.from_status_id,
        to_status_id: vars.to_status_id,
        is_global: isGlobalEffective,
        sort_order: Number.isFinite(sortFinal) ? sortFinal : 0,
      };
      if (mode === 'create') {
        const { data, error } = await typedQuery('catalyst_workflow_transitions')
          .insert({ ...payload, scheme_id: schemeId })
          .select('*')
          .single();
        if (error) throw error;
        return data as WorkflowTransitionRow;
      }
      const { data, error } = await typedQuery('catalyst_workflow_transitions')
        .update(payload)
        .eq('id', row!.id)
        .select('*')
        .single();
      if (error) throw error;
      return data as WorkflowTransitionRow;
    },
    { onSuccess: onClose },
  );

  const canSubmit = form.to_status_id !== '' && !save.isPending;

  return (
    <Modal isOpen onClose={onClose} width="medium">
      <ModalHeader>
        <ModalTitle>{mode === 'create' ? 'Add transition' : 'Edit transition'}</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <FormGrid>
          <FieldRowLabel label="Name" hint="Optional label shown on the board (e.g. 'Reopen').">
            <Textfield
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Optional"
            />
          </FieldRowLabel>

          <FieldRowLabel label="From">
            <Select
              options={fromOptions}
              value={fromValue}
              onChange={(next) => setForm({ ...form, from_status_id: next ? String(next.value) : '' })}
            />
          </FieldRowLabel>

          <FieldRowLabel label="To">
            <Select
              options={toOptions}
              value={toValue}
              placeholder="Pick a status"
              onChange={(next) => setForm({ ...form, to_status_id: next ? String(next.value) : '' })}
            />
          </FieldRowLabel>

          <FieldRowLabel label="Global">
            <Checkbox
              isChecked={form.is_global || form.from_status_id === ''}
              isDisabled={form.from_status_id === ''}
              onChange={(e) => setForm({ ...form, is_global: e.target.checked })}
              label="Available from any status (forced when From = any)"
            />
          </FieldRowLabel>

          <FieldRowLabel label="Sort order" hint="Lower numbers appear first.">
            <Textfield
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
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
          {mode === 'create' ? 'Add transition' : 'Save changes'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

function TransitionDeleteModal({
  schemeId,
  row,
  onClose,
}: {
  schemeId: string;
  row: WorkflowTransitionRow;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');

  const del = useAdminMutation<void, void>(
    {
      action: 'delete',
      table: 'catalyst_workflow_transitions',
      rowId: row.id,
      reason,
      invalidate: [['admin', 'workflows', 'transitions', schemeId]],
    },
    async () => {
      const { error } = await typedQuery('catalyst_workflow_transitions').delete().eq('id', row.id);
      if (error) throw error;
    },
    { onSuccess: onClose },
  );

  return (
    <Modal isOpen onClose={onClose} width="small">
      <ModalHeader>
        <ModalTitle>Delete this transition?</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <p style={{ margin: 0, lineHeight: 1.5 }}>
          Removing a transition only affects what statuses are reachable from
          others — issues already moved keep their current status.
        </p>
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
          Delete transition
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

// ─── Section header / form helpers ────────────────────────────────────────

function SectionHeader({
  title,
  hint,
  onCreate,
  createLabel,
}: {
  title: string;
  hint: string;
  onCreate: () => void;
  createLabel: string;
}) {
  return (
    <header
      style={{
        padding: 'var(--ds-space-200, 12px) var(--ds-space-300, 16px)',
        borderBottom: '1px solid var(--ds-border, #DCDFE4)',
        background: 'var(--ds-background-neutral-subtle, #F7F8F9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--ds-space-200, 12px)',
      }}
    >
      <div>
        <div style={{ fontWeight: 600, color: 'var(--ds-text, #172B4D)', fontSize: 14 }}>
          {title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--ds-text-subtle, #44546F)' }}>{hint}</div>
      </div>
      <Button appearance="primary" spacing="compact" onClick={onCreate}>
        {createLabel}
      </Button>
    </header>
  );
}

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
