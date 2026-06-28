/**
 * TaskStatusRegistry — admin surface for the Tasks Hub status workflow.
 *
 * Tasks are a Catalyst-native, PROJECT-LESS module. Their statuses live in
 * the `task_statuses` table (separate from the project-scoped
 * `ph_workflow_statuses` registry above). This component is the single
 * authority for adding / renaming / recolouring / reordering / deleting Task
 * statuses. All Tasks Hub surfaces (board, list, timeline, widgets) read
 * `task_statuses` by slug, so changes here flow everywhere in real time.
 *
 * Reuse note: task_statuses has a simpler shape than ph_workflow_statuses
 * (no category, no per-type assignment, no project) — so it gets its own
 * lightweight registry rather than being forced through StatusRegistryTable.
 */
import React, { useState } from 'react';
import Modal, {
  ModalTransition,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import Toggle from '@atlaskit/toggle';
import Lozenge from '@atlaskit/lozenge';
import Spinner from '@atlaskit/spinner';
import { Field } from '@atlaskit/form';
import {
  useKanbanStatuses,
  useKanbanStatusesRealtime,
  useCreateKanbanStatus,
  useUpdateKanbanStatus,
  useDeleteKanbanStatus,
  useReorderKanbanStatuses,
} from '@/modules/tasks/hooks/useKanbanStatuses';
import type { PlannerStatus } from '@/modules/tasks/types/kanban';

type EditTarget = (PlannerStatus & { is_system?: boolean }) | null;

const TH: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 653,
  color: 'var(--ds-text-subtle)',
  textAlign: 'left',
  padding: '4px 12px 4px 0',
  borderBottom: '1.67px solid var(--ds-text, rgba(11,18,14,0.14))',
  whiteSpace: 'nowrap',
};
const TD: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 400,
  color: 'var(--ds-text)',
  padding: '8px 12px 8px 0',
  borderBottom: '1px solid var(--ds-border)',
  verticalAlign: 'middle',
};

export function TaskStatusRegistry() {
  useKanbanStatusesRealtime();
  const { data: statuses = [], isLoading } = useKanbanStatuses();
  const createStatus = useCreateKanbanStatus();
  const updateStatus = useUpdateKanbanStatus();
  const deleteStatus = useDeleteKanbanStatus();
  const reorder = useReorderKanbanStatuses();

  const [modalOpen, setModalOpen] = useState(false);
  const [target, setTarget] = useState<EditTarget>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState('var(--ds-text-subtlest)');
  const [isDefault, setIsDefault] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  function openCreate() {
    setTarget(null);
    setName('');
    setColor('var(--ds-text-subtlest)');
    setIsDefault(false);
    setIsCompleted(false);
    setModalOpen(true);
  }

  function openEdit(s: PlannerStatus) {
    setTarget(s);
    setName(s.name);
    setColor(s.color || 'var(--ds-text-subtlest)');
    setIsDefault(s.is_default);
    setIsCompleted(s.is_completed_status);
    setModalOpen(true);
  }

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (target) {
      updateStatus.mutate(
        { id: target.id, name: trimmed, color, is_default: isDefault, is_completed_status: isCompleted },
        { onSuccess: () => setModalOpen(false) },
      );
    } else {
      // Create takes name + color; default/completed flags are applied on the
      // freshly-created row only when toggled on (avoids a redundant write).
      createStatus.mutate(
        { name: trimmed, color },
        {
          onSuccess: (created: any) => {
            if ((isDefault || isCompleted) && created?.id) {
              updateStatus.mutate({ id: created.id, is_default: isDefault, is_completed_status: isCompleted });
            }
            setModalOpen(false);
          },
        },
      );
    }
  }

  function move(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= statuses.length) return;
    const a = statuses[index];
    const b = statuses[next];
    reorder.mutate([
      { id: a.id, position: b.position },
      { id: b.id, position: a.position },
    ]);
  }

  const saving = createStatus.isPending || updateStatus.isPending;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 8, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 653, color: 'var(--ds-text)', margin: 0, display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            Tasks{' '}
            {statuses.length > 0 && (
              <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--ds-text-subtle)' }}>
                ({statuses.length} status{statuses.length !== 1 ? 'es' : ''} · Catalyst-native, project-less)
              </span>
            )}
          </h2>
          <p style={{ fontSize: 14, color: 'var(--ds-text-subtle)', margin: '4px 0 0', maxWidth: 680 }}>
            The Tasks module has a single work item type ("Tasks") and its own status workflow — independent of projects and products. Statuses defined here drive the Tasks board, list, timeline and widgets.
          </p>
        </div>
        <Button appearance="primary" onClick={openCreate}>Create status</Button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Spinner size="large" />
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...TH, width: 40 }}>Colour</th>
              <th style={TH}>Name</th>
              <th style={TH}>Slug</th>
              <th style={TH}>Default</th>
              <th style={TH}>Completed</th>
              <th style={{ ...TH, width: 80 }}>Order</th>
              <th style={{ ...TH, width: 120, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {statuses.map((s, i) => {
              const isSystem = (s as any).is_system === true;
              return (
                <tr key={s.id}>
                  <td style={TD}>
                    <span style={{ display: 'inline-block', width: 16, height: 16, borderRadius: 4, background: s.color || 'var(--ds-text-subtlest)', border: '1px solid var(--ds-border)' }} />
                  </td>
                  <td style={{ ...TD, fontWeight: 500 }}>{s.name}</td>
                  <td style={{ ...TD, color: 'var(--ds-text-subtlest)', fontFamily: 'var(--ds-font-family-code, monospace)' }}>{s.slug}</td>
                  <td style={TD}>{s.is_default ? <Lozenge appearance="inprogress">Default</Lozenge> : null}</td>
                  <td style={TD}>{s.is_completed_status ? <Lozenge appearance="success">Completed</Lozenge> : null}</td>
                  <td style={TD}>
                    <div style={{ display: 'flex', gap: 2 }}>
                      <Button appearance="subtle" spacing="compact" isDisabled={i === 0 || reorder.isPending} onClick={() => move(i, -1)} aria-label={`Move ${s.name} up`}>↑</Button>
                      <Button appearance="subtle" spacing="compact" isDisabled={i === statuses.length - 1 || reorder.isPending} onClick={() => move(i, 1)} aria-label={`Move ${s.name} down`}>↓</Button>
                    </div>
                  </td>
                  <td style={{ ...TD, textAlign: 'right' }}>
                    <Button appearance="subtle" spacing="compact" onClick={() => openEdit(s)}>Edit</Button>
                    <Button
                      appearance="subtle"
                      spacing="compact"
                      isDisabled={isSystem || deleteStatus.isPending}
                      onClick={() => deleteStatus.mutate(s.id)}
                      aria-label={`Delete ${s.name}`}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <ModalTransition>
        {modalOpen && (
          <Modal onClose={() => setModalOpen(false)}>
            <ModalHeader>
              <ModalTitle>{target ? 'Edit status' : 'Create status'}</ModalTitle>
            </ModalHeader>
            <ModalBody>
              <Field name="status-name" label="Name" isRequired>
                {() => (
                  <Textfield
                    autoFocus
                    value={name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                    placeholder="e.g. In review"
                  />
                )}
              </Field>
              <div style={{ marginTop: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle)', display: 'block', marginBottom: 4 }}>Colour</label>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  style={{ width: 48, height: 32, border: '1px solid var(--ds-border)', borderRadius: 4, background: 'none', cursor: 'pointer' }}
                  aria-label="Status colour"
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
                <Toggle id="task-status-default" isChecked={isDefault} onChange={() => setIsDefault((v) => !v)} />
                <label htmlFor="task-status-default" style={{ fontSize: 14, color: 'var(--ds-text)' }}>Default status (new tasks start here)</label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <Toggle id="task-status-completed" isChecked={isCompleted} onChange={() => setIsCompleted((v) => !v)} />
                <label htmlFor="task-status-completed" style={{ fontSize: 14, color: 'var(--ds-text)' }}>Completed status (counts as done)</label>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button appearance="subtle" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button appearance="primary" onClick={handleSave} isDisabled={!name.trim() || saving} isLoading={saving}>
                {target ? 'Save' : 'Create'}
              </Button>
            </ModalFooter>
          </Modal>
        )}
      </ModalTransition>
    </div>
  );
}
