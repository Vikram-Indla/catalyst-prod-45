/**
 * WorkflowsPage — list + CRUD on `catalyst_workflow_schemes`.
 *
 * Phase 2a. Each scheme is owned by an issue_type and contains a graph of
 * statuses + transitions. This page handles the scheme itself; the detail
 * surface at /admin/v2/work-items/workflows/:schemeId edits the inner
 * statuses + transitions.
 *
 * Schema (catalyst_workflow_schemes):
 *   id, name, description, issue_type, is_active, is_default,
 *   created_at, updated_at
 *
 * Convention: only one scheme per issue_type can be `is_default = true` at
 * a time, but the database doesn't enforce that. We surface a "Set default"
 * action that flips the chosen scheme's flag and clears it on every other
 * scheme of the same issue_type — done in a single mutation.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
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
  created_at: string;
  updated_at: string;
}

interface SchemeWithCounts extends WorkflowSchemeRow {
  status_count: number;
  transition_count: number;
}

const ISSUE_TYPE_OPTIONS: SelectOption[] = [
  { value: 'Story', label: 'Story' },
  { value: 'Epic', label: 'Epic' },
  { value: 'Feature', label: 'Feature' },
  { value: 'Task', label: 'Task' },
  { value: 'Subtask', label: 'Subtask' },
  { value: 'QA Bug', label: 'QA Bug / Defect' },
  { value: 'Production Incident', label: 'Production Incident' },
  { value: 'Business Request', label: 'Business Request' },
];

const ISSUE_TYPE_APPEARANCE: Record<string, LozengeAppearance> = {
  Story: 'success',
  Epic: 'new',
  Feature: 'inprogress',
  Task: 'default',
  Subtask: 'default',
  'QA Bug': 'removed',
  'Production Incident': 'removed',
  'Business Request': 'moved',
};

function appearanceForIssueType(issueType: string): LozengeAppearance {
  return ISSUE_TYPE_APPEARANCE[issueType] ?? 'default';
}

// ─── Page ─────────────────────────────────────────────────────────────────

type FilterValue = 'ALL' | string;

export default function WorkflowsPage() {
  const [issueFilter, setIssueFilter] = useState<FilterValue>('ALL');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<WorkflowSchemeRow | null>(null);
  const [deleting, setDeleting] = useState<WorkflowSchemeRow | null>(null);

  const queryKey = useMemo(
    () => ['admin', 'workflows', 'schemes', issueFilter] as const,
    [issueFilter],
  );

  const { data, isLoading, error } = useQuery<SchemeWithCounts[]>({
    queryKey: [...queryKey],
    queryFn: async () => {
      let q = typedQuery('catalyst_workflow_schemes').select('*');
      if (issueFilter !== 'ALL') q = q.eq('issue_type', issueFilter);
      const { data: schemes, error } = await q
        .order('issue_type', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      const rows = (schemes ?? []) as WorkflowSchemeRow[];
      // Cheap join — fetch status + transition counts per scheme in two extra round trips.
      // Counts could be moved to a SQL view later; this is fine for Phase 2a list scale.
      const ids = rows.map((r) => r.id);
      if (ids.length === 0) return [];
      const [statusesRes, transitionsRes] = await Promise.all([
        typedQuery('catalyst_workflow_statuses')
          .select('scheme_id')
          .in('scheme_id', ids),
        typedQuery('catalyst_workflow_transitions')
          .select('scheme_id')
          .in('scheme_id', ids),
      ]);
      const statusCount = new Map<string, number>();
      const transitionCount = new Map<string, number>();
      (statusesRes.data ?? []).forEach((s: { scheme_id: string }) =>
        statusCount.set(s.scheme_id, (statusCount.get(s.scheme_id) ?? 0) + 1),
      );
      (transitionsRes.data ?? []).forEach((t: { scheme_id: string }) =>
        transitionCount.set(t.scheme_id, (transitionCount.get(t.scheme_id) ?? 0) + 1),
      );
      return rows.map((r) => ({
        ...r,
        status_count: statusCount.get(r.id) ?? 0,
        transition_count: transitionCount.get(r.id) ?? 0,
      }));
    },
    staleTime: 30_000,
  });

  const grouped = useMemo(() => {
    const out = new Map<string, SchemeWithCounts[]>();
    for (const row of data ?? []) {
      const list = out.get(row.issue_type) ?? [];
      list.push(row);
      out.set(row.issue_type, list);
    }
    return out;
  }, [data]);

  return (
    <div
      data-testid="admin-v2/workflows/page"
      style={{ padding: 'var(--ds-space-400, 24px)', maxWidth: 1280 }}
    >
      <Header
        issueFilter={issueFilter}
        onChangeFilter={setIssueFilter}
        onCreate={() => setCreateOpen(true)}
      />

      {error && (
        <div style={{ marginBottom: 'var(--ds-space-300, 16px)' }}>
          <SectionMessage appearance="error" title="Could not load workflow schemes">
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
          header="No workflow schemes yet"
          description={
            issueFilter === 'ALL'
              ? 'Create a scheme to define statuses and transitions for an issue type.'
              : `No workflow schemes for ${issueFilter} yet. Use Create scheme to add one.`
          }
        />
      )}

      {!isLoading && !error && grouped.size > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-300, 16px)' }}>
          {[...grouped.entries()].map(([issueType, rows]) => (
            <SchemeGroup
              key={issueType}
              issueType={issueType}
              rows={rows}
              onEdit={setEditing}
              onDelete={setDeleting}
              filter={issueFilter}
            />
          ))}
        </div>
      )}

      {createOpen && (
        <CreateOrEditModal
          mode="create"
          onClose={() => setCreateOpen(false)}
          queryInvalidate={queryKey}
        />
      )}

      {editing && (
        <CreateOrEditModal
          mode="edit"
          row={editing}
          onClose={() => setEditing(null)}
          queryInvalidate={queryKey}
        />
      )}

      {deleting && (
        <DeleteConfirmModal
          row={deleting}
          onClose={() => setDeleting(null)}
          queryInvalidate={queryKey}
        />
      )}
    </div>
  );
}

// ─── Header ────────────────────────────────────────────────────────────────

function Header({
  issueFilter,
  onChangeFilter,
  onCreate,
}: {
  issueFilter: FilterValue;
  onChangeFilter: (v: FilterValue) => void;
  onCreate: () => void;
}) {
  const filterOptions: SelectOption[] = [
    { value: 'ALL', label: 'All issue types' },
    ...ISSUE_TYPE_OPTIONS,
  ];
  const value = filterOptions.find((o) => o.value === issueFilter) ?? filterOptions[0];

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
          Workflows
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
          Workflow schemes define the statuses and transitions for an issue
          type. Click a scheme to edit its statuses and transitions.
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-space-200, 12px)' }}>
        <div style={{ minWidth: 220 }}>
          <Select
            options={filterOptions}
            value={value}
            onChange={(next) => onChangeFilter((next?.value as FilterValue) ?? 'ALL')}
            aria-label="Filter by issue type"
          />
        </div>
        <Button appearance="primary" onClick={onCreate}>
          Create scheme
        </Button>
      </div>
    </div>
  );
}

// ─── Scheme group + table ──────────────────────────────────────────────────

function SchemeGroup({
  issueType,
  rows,
  onEdit,
  onDelete,
  filter,
}: {
  issueType: string;
  rows: SchemeWithCounts[];
  onEdit: (r: WorkflowSchemeRow) => void;
  onDelete: (r: WorkflowSchemeRow) => void;
  filter: FilterValue;
}) {
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
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--ds-space-150, 10px)',
        }}
      >
        <Lozenge appearance={appearanceForIssueType(issueType)}>{issueType}</Lozenge>
        <span style={{ color: 'var(--ds-text-subtlest, #626F86)', fontWeight: 400 }}>
          · {rows.length} scheme{rows.length === 1 ? '' : 's'}
        </span>
      </header>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: 'var(--ds-surface, #FFFFFF)', borderBottom: '1px solid var(--ds-border, #DCDFE4)' }}>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Statuses</th>
            <th style={thStyle}>Transitions</th>
            <th style={thStyle}>Default</th>
            <th style={thStyle}>State</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <SchemeRow
              key={row.id}
              row={row}
              onEdit={onEdit}
              onDelete={onDelete}
              filter={filter}
            />
          ))}
        </tbody>
      </table>
    </section>
  );
}

function SchemeRow({
  row,
  onEdit,
  onDelete,
  filter,
}: {
  row: SchemeWithCounts;
  onEdit: (r: WorkflowSchemeRow) => void;
  onDelete: (r: WorkflowSchemeRow) => void;
  filter: FilterValue;
}) {
  const queryKey = ['admin', 'workflows', 'schemes', filter] as const;
  const toggleActive = useAdminMutation<{ next: boolean }, WorkflowSchemeRow>(
    {
      action: 'toggle',
      table: 'catalyst_workflow_schemes',
      rowId: row.id,
      invalidate: [queryKey],
    },
    async ({ next }) => {
      const { data, error } = await typedQuery('catalyst_workflow_schemes')
        .update({ is_active: next })
        .eq('id', row.id)
        .select('*')
        .single();
      if (error) throw error;
      return data as WorkflowSchemeRow;
    },
  );

  const setDefault = useAdminMutation<void, void>(
    {
      action: 'update',
      table: 'catalyst_workflow_schemes',
      rowId: row.id,
      reason: `Set default scheme for ${row.issue_type}`,
      invalidate: [queryKey],
    },
    async () => {
      // Clear default on every other scheme of the same issue_type.
      const { error: clearErr } = await typedQuery('catalyst_workflow_schemes')
        .update({ is_default: false })
        .eq('issue_type', row.issue_type)
        .neq('id', row.id);
      if (clearErr) throw clearErr;
      // Set default on this one.
      const { error: setErr } = await typedQuery('catalyst_workflow_schemes')
        .update({ is_default: true })
        .eq('id', row.id);
      if (setErr) throw setErr;
    },
  );

  return (
    <tr style={{ borderBottom: '1px solid var(--ds-border, #DCDFE4)' }}>
      <td style={tdStyle}>
        <Link
          to={`/admin/v2/work-items/workflows/${row.id}`}
          style={{
            fontWeight: 500,
            color: 'var(--ds-text-selected, #0C66E4)',
            textDecoration: 'none',
          }}
        >
          {row.name}
        </Link>
        {row.description && (
          <div style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #626F86)' }}>
            {row.description}
          </div>
        )}
      </td>
      <td style={tdStyle}>{row.status_count}</td>
      <td style={tdStyle}>{row.transition_count}</td>
      <td style={tdStyle}>
        {row.is_default ? (
          <Lozenge appearance="success">default</Lozenge>
        ) : (
          <Button
            appearance="subtle"
            spacing="compact"
            isDisabled={setDefault.isPending}
            onClick={() => setDefault.mutate()}
          >
            Set default
          </Button>
        )}
      </td>
      <td style={tdStyle}>
        <Lozenge appearance={row.is_active ? 'success' : 'default'}>
          {row.is_active ? 'active' : 'inactive'}
        </Lozenge>
      </td>
      <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
        <Button
          appearance="subtle"
          spacing="compact"
          isDisabled={toggleActive.isPending}
          onClick={() => toggleActive.mutate({ next: !row.is_active })}
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
  description: string;
  issue_type: string;
  is_default: boolean;
  is_active: boolean;
  reason: string;
}

function emptyForm(): FormState {
  return {
    name: '',
    description: '',
    issue_type: 'Story',
    is_default: false,
    is_active: true,
    reason: '',
  };
}

function rowToForm(row: WorkflowSchemeRow): FormState {
  return {
    name: row.name,
    description: row.description ?? '',
    issue_type: row.issue_type,
    is_default: row.is_default,
    is_active: row.is_active,
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
  row?: WorkflowSchemeRow;
  onClose: () => void;
  queryInvalidate: readonly [string, string, string, string];
}) {
  const [form, setForm] = useState<FormState>(() => (row ? rowToForm(row) : emptyForm()));

  const save = useAdminMutation<FormState, WorkflowSchemeRow>(
    {
      action: mode === 'create' ? 'create' : 'update',
      table: 'catalyst_workflow_schemes',
      rowId: row?.id ?? null,
      reason: form.reason,
      skipBeforeSnapshot: mode === 'create',
      invalidate: [queryInvalidate],
    },
    async (vars) => {
      const payload = {
        name: vars.name.trim(),
        description: vars.description.trim() || null,
        issue_type: vars.issue_type,
        is_default: vars.is_default,
        is_active: vars.is_active,
      };
      if (mode === 'create') {
        const { data, error } = await typedQuery('catalyst_workflow_schemes')
          .insert(payload)
          .select('*')
          .single();
        if (error) throw error;
        return data as WorkflowSchemeRow;
      }
      const { data, error } = await typedQuery('catalyst_workflow_schemes')
        .update(payload)
        .eq('id', row!.id)
        .select('*')
        .single();
      if (error) throw error;
      return data as WorkflowSchemeRow;
    },
    { onSuccess: onClose },
  );

  const issueTypeValue =
    ISSUE_TYPE_OPTIONS.find((o) => o.value === form.issue_type) ?? ISSUE_TYPE_OPTIONS[0];
  const canSubmit = form.name.trim().length > 0 && !save.isPending;

  return (
    <Modal isOpen onClose={onClose} width="medium">
      <ModalHeader>
        <ModalTitle>
          {mode === 'create' ? 'Create workflow scheme' : `Edit ${row?.name ?? 'scheme'}`}
        </ModalTitle>
      </ModalHeader>
      <ModalBody>
        <FormGrid>
          <FieldRowLabel label="Name">
            <Textfield
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Default Story workflow"
              autoFocus
            />
          </FieldRowLabel>

          <FieldRowLabel label="Description">
            <Textfield
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional context shown next to the scheme"
            />
          </FieldRowLabel>

          <FieldRowLabel
            label="Issue type"
            hint={mode === 'edit' ? 'Locked on edit — moving statuses across types is unsafe.' : undefined}
          >
            <Select
              options={ISSUE_TYPE_OPTIONS}
              value={issueTypeValue}
              isDisabled={mode === 'edit'}
              onChange={(next) => next && setForm({ ...form, issue_type: String(next.value) })}
            />
          </FieldRowLabel>

          <FieldRowLabel label="Default for this issue type">
            <Checkbox
              isChecked={form.is_default}
              onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
              label="Use this scheme by default — others on the same type are cleared on save."
            />
          </FieldRowLabel>

          <FieldRowLabel label="Active">
            <Checkbox
              isChecked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              label="Available for selection"
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
          {mode === 'create' ? 'Create scheme' : 'Save changes'}
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
  row: WorkflowSchemeRow;
  onClose: () => void;
  queryInvalidate: readonly [string, string, string, string];
}) {
  const [reason, setReason] = useState('');

  const del = useAdminMutation<void, void>(
    {
      action: 'delete',
      table: 'catalyst_workflow_schemes',
      rowId: row.id,
      reason,
      invalidate: [queryInvalidate],
    },
    async () => {
      const { error } = await typedQuery('catalyst_workflow_schemes').delete().eq('id', row.id);
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
        <SectionMessage appearance="warning" title="Statuses and transitions cascade">
          <p style={{ margin: 0, lineHeight: 1.5 }}>
            All statuses and transitions belonging to this scheme will be
            deleted with it. Issues whose status references one of those
            slugs will keep the slug stamped on their row, but the status
            will no longer be selectable.
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
          Delete scheme
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
