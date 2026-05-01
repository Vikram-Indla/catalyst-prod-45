/**
 * WorkTypesPage — per-project CRUD on `ph_work_types`.
 *
 * Phase 1c. Each project owns its own work type set (epics, stories, tasks,
 * etc.). This page picks a project, then lets admins add / edit / disable
 * the per-project set without leaving Catalyst.
 *
 * Schema (ph_work_types):
 *   id, name, level, icon, color, position, is_enabled, project_id, created_at
 *
 * The level is a strict hierarchy used by the Story View to nest items;
 * changing it on an existing type is allowed but visible to consumers, so
 * we capture a reason for the audit.
 */
import { useEffect, useMemo, useState } from 'react';
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

// ─── Schema ────────────────────────────────────────────────────────────────

interface ProjectRow {
  id: string;
  name: string;
  is_archived: boolean | null;
}

type WorkLevel =
  | 'initiative'
  | 'epic'
  | 'feature'
  | 'story'
  | 'task'
  | 'subtask'
  | 'defect'
  | 'incident'
  | 'request';

interface WorkTypeRow {
  id: string;
  name: string;
  level: WorkLevel;
  icon: string | null;
  color: string | null;
  position: number | null;
  is_enabled: boolean;
  project_id: string;
}

const LEVELS: ReadonlyArray<{ value: WorkLevel; label: string; appearance: LozengeAppearance }> = [
  { value: 'initiative', label: 'Initiative', appearance: 'new' },
  { value: 'epic', label: 'Epic', appearance: 'new' },
  { value: 'feature', label: 'Feature', appearance: 'inprogress' },
  { value: 'story', label: 'Story', appearance: 'success' },
  { value: 'task', label: 'Task', appearance: 'default' },
  { value: 'subtask', label: 'Subtask', appearance: 'default' },
  { value: 'defect', label: 'Defect', appearance: 'removed' },
  { value: 'incident', label: 'Incident', appearance: 'removed' },
  { value: 'request', label: 'Request', appearance: 'moved' },
];

const ICON_OPTIONS: SelectOption[] = [
  { value: 'epic', label: 'Epic' },
  { value: 'feature', label: 'Feature' },
  { value: 'story', label: 'Story' },
  { value: 'task', label: 'Task' },
  { value: 'subtask', label: 'Subtask' },
  { value: 'bug', label: 'Bug' },
  { value: 'incident', label: 'Incident' },
];

function appearanceForLevel(level: WorkLevel): LozengeAppearance {
  return LEVELS.find((l) => l.value === level)?.appearance ?? 'default';
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function WorkTypesPage() {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<WorkTypeRow | null>(null);
  const [deleting, setDeleting] = useState<WorkTypeRow | null>(null);

  // Project list — used to drive the picker.
  const { data: projects } = useQuery<ProjectRow[]>({
    queryKey: ['admin', 'work-types', 'projects'],
    queryFn: async () => {
      const { data, error } = await typedQuery('projects')
        .select('id, name, is_archived')
        .eq('is_archived', false)
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as ProjectRow[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Auto-select first project on load.
  useEffect(() => {
    if (!projectId && projects && projects.length > 0) {
      setProjectId(projects[0].id);
    }
  }, [projectId, projects]);

  const effectiveProjectId = projectId;

  const { data, isLoading, error } = useQuery<WorkTypeRow[]>({
    queryKey: ['admin', 'work-types', 'list', effectiveProjectId],
    queryFn: async () => {
      if (!effectiveProjectId) return [];
      const { data, error } = await typedQuery('ph_work_types')
        .select('*')
        .eq('project_id', effectiveProjectId)
        .order('position', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as WorkTypeRow[];
    },
    enabled: !!effectiveProjectId,
    staleTime: 30_000,
  });

  const projectOptions: SelectOption[] = useMemo(
    () => (projects ?? []).map((p) => ({ value: p.id, label: p.name })),
    [projects],
  );

  const projectValue =
    projectOptions.find((o) => o.value === projectId) ?? null;

  return (
    <div
      data-testid="admin-v2/work-types/page"
      style={{ padding: 'var(--ds-space-400, 24px)', maxWidth: 1280 }}
    >
      <div style={{ marginBottom: 'var(--ds-space-300, 16px)' }}>
        <Heading as="h1" size="large">
          Work types
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
          Per-project work item types (epics, stories, tasks, etc.). Changes
          here only affect the selected project.
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--ds-space-300, 16px)',
          marginBottom: 'var(--ds-space-300, 16px)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ minWidth: 280 }}>
          <Select
            options={projectOptions}
            value={projectValue}
            onChange={(next) => setProjectId(next ? String(next.value) : null)}
            placeholder="Pick a project"
            isSearchable
            aria-label="Project"
          />
        </div>
        <Button
          appearance="primary"
          isDisabled={!effectiveProjectId}
          onClick={() => setCreateOpen(true)}
        >
          Create work type
        </Button>
      </div>

      {error && (
        <div style={{ marginBottom: 'var(--ds-space-300, 16px)' }}>
          <SectionMessage appearance="error" title="Could not load work types">
            <p style={{ margin: 0 }}>{(error as Error).message}</p>
          </SectionMessage>
        </div>
      )}

      {!effectiveProjectId && (
        <EmptyState
          header="Select a project"
          description="Pick a project from the dropdown to see its work types."
        />
      )}

      {effectiveProjectId && isLoading && (
        <div style={spinnerWrapStyle}>
          <Spinner size="medium" />
        </div>
      )}

      {effectiveProjectId && !isLoading && !error && (data ?? []).length === 0 && (
        <EmptyState
          header="No work types yet"
          description="This project has no work types. Create one to get started."
        />
      )}

      {effectiveProjectId && !isLoading && !error && (data ?? []).length > 0 && (
        <WorkTypeTable
          rows={data ?? []}
          projectId={effectiveProjectId}
          onEdit={setEditing}
          onDelete={setDeleting}
        />
      )}

      {createOpen && effectiveProjectId && (
        <CreateOrEditModal
          mode="create"
          projectId={effectiveProjectId}
          onClose={() => setCreateOpen(false)}
        />
      )}

      {editing && (
        <CreateOrEditModal
          mode="edit"
          projectId={editing.project_id}
          row={editing}
          onClose={() => setEditing(null)}
        />
      )}

      {deleting && (
        <DeleteConfirmModal row={deleting} onClose={() => setDeleting(null)} />
      )}
    </div>
  );
}

// ─── Table ─────────────────────────────────────────────────────────────────

function WorkTypeTable({
  rows,
  projectId,
  onEdit,
  onDelete,
}: {
  rows: WorkTypeRow[];
  projectId: string;
  onEdit: (r: WorkTypeRow) => void;
  onDelete: (r: WorkTypeRow) => void;
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
            <th style={{ ...thStyle, width: 80 }}>Position</th>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Level</th>
            <th style={thStyle}>Icon</th>
            <th style={thStyle}>Color</th>
            <th style={{ ...thStyle, width: 100 }}>State</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <WorkTypeRowItem
              key={row.id}
              row={row}
              projectId={projectId}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WorkTypeRowItem({
  row,
  projectId,
  onEdit,
  onDelete,
}: {
  row: WorkTypeRow;
  projectId: string;
  onEdit: (r: WorkTypeRow) => void;
  onDelete: (r: WorkTypeRow) => void;
}) {
  const toggle = useAdminMutation<{ next: boolean }, WorkTypeRow>(
    {
      action: 'toggle',
      table: 'ph_work_types',
      rowId: row.id,
      invalidate: [['admin', 'work-types', 'list', projectId]],
    },
    async ({ next }) => {
      const { data, error } = await typedQuery('ph_work_types')
        .update({ is_enabled: next })
        .eq('id', row.id)
        .select('*')
        .single();
      if (error) throw error;
      return data as WorkTypeRow;
    },
  );

  return (
    <tr style={{ borderBottom: '1px solid var(--ds-border, #DCDFE4)' }}>
      <td style={tdStyle}>{row.position ?? '—'}</td>
      <td style={tdStyle}>
        <span style={{ fontWeight: 500 }}>{row.name}</span>
      </td>
      <td style={tdStyle}>
        <Lozenge appearance={appearanceForLevel(row.level)}>{row.level}</Lozenge>
      </td>
      <td
        style={{
          ...tdStyle,
          fontFamily:
            'var(--ds-font-family-code, ui-monospace, SF Mono, Menlo, Consolas)',
          color: 'var(--ds-text-subtle, #44546F)',
        }}
      >
        {row.icon ?? '—'}
      </td>
      <td style={tdStyle}>
        {row.color ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span
              aria-hidden="true"
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: row.color,
                border: '1px solid var(--ds-border, #DCDFE4)',
              }}
            />
            <span
              style={{
                fontFamily:
                  'var(--ds-font-family-code, ui-monospace, SF Mono, Menlo, Consolas)',
                color: 'var(--ds-text-subtle, #44546F)',
              }}
            >
              {row.color}
            </span>
          </span>
        ) : (
          '—'
        )}
      </td>
      <td style={tdStyle}>
        <Lozenge appearance={row.is_enabled ? 'success' : 'default'}>
          {row.is_enabled ? 'Enabled' : 'Disabled'}
        </Lozenge>
      </td>
      <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
        <Button
          appearance="subtle"
          spacing="compact"
          isDisabled={toggle.isPending}
          onClick={() => toggle.mutate({ next: !row.is_enabled })}
        >
          {row.is_enabled ? 'Disable' : 'Enable'}
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
  level: WorkLevel;
  icon: string;
  color: string;
  position: string;
  is_enabled: boolean;
  reason: string;
}

function emptyForm(): FormState {
  return {
    name: '',
    level: 'story',
    icon: 'story',
    /* eslint-disable-next-line no-restricted-syntax -- DB-stored hex default for new rows */
    color: '#0C66E4',
    position: '',
    is_enabled: true,
    reason: '',
  };
}

function rowToForm(row: WorkTypeRow): FormState {
  return {
    name: row.name,
    level: row.level,
    icon: row.icon ?? '',
    color: row.color ?? '',
    position: row.position != null ? String(row.position) : '',
    is_enabled: row.is_enabled,
    reason: '',
  };
}

function CreateOrEditModal({
  mode,
  projectId,
  row,
  onClose,
}: {
  mode: 'create' | 'edit';
  projectId: string;
  row?: WorkTypeRow;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => (row ? rowToForm(row) : emptyForm()));

  const save = useAdminMutation<FormState, WorkTypeRow>(
    {
      action: mode === 'create' ? 'create' : 'update',
      table: 'ph_work_types',
      rowId: row?.id ?? null,
      reason: form.reason,
      skipBeforeSnapshot: mode === 'create',
      invalidate: [['admin', 'work-types', 'list', projectId]],
    },
    async (vars) => {
      const positionNum = vars.position.trim() === '' ? null : Number(vars.position);
      const payload = {
        name: vars.name.trim(),
        level: vars.level,
        icon: vars.icon.trim() || null,
        color: vars.color.trim() || null,
        position: Number.isFinite(positionNum as number) ? positionNum : null,
        is_enabled: vars.is_enabled,
      };
      if (mode === 'create') {
        const { data, error } = await typedQuery('ph_work_types')
          .insert({ ...payload, project_id: projectId })
          .select('*')
          .single();
        if (error) throw error;
        return data as WorkTypeRow;
      }
      const { data, error } = await typedQuery('ph_work_types')
        .update(payload)
        .eq('id', row!.id)
        .select('*')
        .single();
      if (error) throw error;
      return data as WorkTypeRow;
    },
    { onSuccess: onClose },
  );

  const levelOptions: SelectOption<WorkLevel>[] = LEVELS.map((l) => ({
    value: l.value,
    label: l.label,
  }));
  const levelValue =
    levelOptions.find((o) => o.value === form.level) ?? levelOptions[3]; // story default
  const iconValue = ICON_OPTIONS.find((o) => o.value === form.icon) ?? null;

  const canSubmit = form.name.trim().length > 0 && !save.isPending;

  return (
    <Modal isOpen onClose={onClose} width="medium">
      <ModalHeader>
        <ModalTitle>
          {mode === 'create' ? 'Create work type' : `Edit ${row?.name ?? 'work type'}`}
        </ModalTitle>
      </ModalHeader>
      <ModalBody>
        <FormGrid>
          <FieldRowLabel label="Name">
            <Textfield
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Spike"
              autoFocus
            />
          </FieldRowLabel>

          <FieldRowLabel label="Level" hint="Hierarchy used by Story View nesting.">
            <Select<WorkLevel>
              options={levelOptions}
              value={levelValue}
              onChange={(next) => next && setForm({ ...form, level: next.value })}
            />
          </FieldRowLabel>

          <FieldRowLabel label="Icon">
            <Select
              options={ICON_OPTIONS}
              value={iconValue}
              onChange={(next) => setForm({ ...form, icon: next ? String(next.value) : '' })}
              isClearable
              placeholder="Pick an icon"
            />
          </FieldRowLabel>

          <FieldRowLabel label="Color" hint="Hex string stored on the row.">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--ds-space-100, 8px)',
              }}
            >
              <Textfield
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                placeholder="e.g. #0C66E4"
              />
              <span
                aria-hidden="true"
                style={{
                  width: 28,
                  height: 28,
                  flexShrink: 0,
                  borderRadius: '50%',
                  background: form.color || 'transparent',
                  border: '1px solid var(--ds-border, #DCDFE4)',
                }}
              />
            </div>
          </FieldRowLabel>

          <FieldRowLabel label="Position" hint="Optional. Lower numbers appear first.">
            <Textfield
              type="number"
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
              placeholder="e.g. 10"
            />
          </FieldRowLabel>

          <FieldRowLabel label="Enabled">
            <Checkbox
              isChecked={form.is_enabled}
              onChange={(e) => setForm({ ...form, is_enabled: e.target.checked })}
              label="Show this type to users on this project"
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
          {mode === 'create' ? 'Create work type' : 'Save changes'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

// ─── Delete confirm ────────────────────────────────────────────────────────

function DeleteConfirmModal({
  row,
  onClose,
}: {
  row: WorkTypeRow;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const del = useAdminMutation<void, void>(
    {
      action: 'delete',
      table: 'ph_work_types',
      rowId: row.id,
      reason,
      invalidate: [['admin', 'work-types', 'list', row.project_id]],
    },
    async () => {
      const { error } = await typedQuery('ph_work_types').delete().eq('id', row.id);
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
        <SectionMessage appearance="warning" title="Existing items keep this type">
          <p style={{ margin: 0, lineHeight: 1.5 }}>
            Work items currently using this type will keep the reference, but
            this type will no longer be selectable for new items in this project.
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
          Delete work type
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
