import React, { useState } from 'react';
import { ConfirmDeleteDialog } from '@/components/catalyst-detail-views/shared/ConfirmDeleteDialog';
import { useNavigate } from 'react-router-dom';
import Button from '@atlaskit/button/standard-button';
import { IconButton } from '@atlaskit/button/new';
import EditIcon from '@atlaskit/icon/core/edit';
import Tooltip from '@atlaskit/tooltip';
import Spinner from '@atlaskit/spinner';
import Textfield from '@atlaskit/textfield';
import { PageHeader } from '@/components/ads/PageHeader';
import { Breadcrumbs } from '@/components/ads/Breadcrumbs';
import { catalystToast } from '@/lib/catalystToast';
import {
  useCasePriorities,
  useCreatePriority,
  useUpdatePriority,
  useDeletePriority,
} from '@/hooks/test-management/useAdminConfig';
import { useProjects } from '@/hooks/test-management/useProjects';
import { TMCasePriority } from '@/types/test-management';

const COLORS = [
  'var(--ds-background-danger-bold)', 'var(--ds-background-warning-bold)', 'var(--ds-background-warning-bold)', 'var(--ds-background-success-bold)', 'var(--ds-background-accent-teal-bolder)',
  'var(--ds-background-information-bold)', 'var(--ds-background-discovery-bold)', 'var(--ds-background-accent-magenta-bolder)', 'var(--ds-text-subtlest)', 'var(--ds-text)',
];

export default function TestPrioritiesPage() {
  const navigate = useNavigate();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const projectId = projects[0]?.id ?? null;

  const { data: priorities = [], isLoading } = useCasePriorities(projectId);
  const createPriority = useCreatePriority();
  const updatePriority = useUpdatePriority();
  const deletePriority = useDeletePriority();

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(COLORS[5]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<TMCasePriority | null>(null);

  const handleAdd = async () => {
    if (!newName.trim() || !projectId) return;
    try {
      await createPriority.mutateAsync({
        project_id: projectId,
        name: newName.trim(),
        color: newColor,
        sort_order: priorities.length,
        is_default: priorities.length === 0,
      });
      setNewName('');
      setNewColor(COLORS[5]);
      setShowAdd(false);
      catalystToast.success('Priority created');
    } catch (e: any) {
      catalystToast.error(e.message);
    }
  };

  const startEdit = (p: TMCasePriority) => {
    setEditingId(p.id);
    setEditName(p.name);
    setEditColor(p.color ?? COLORS[5]);
  };

  const saveEdit = async (p: TMCasePriority) => {
    if (!editName.trim()) return;
    try {
      await updatePriority.mutateAsync({
        id: p.id,
        project_id: p.project_id,
        name: editName.trim(),
        color: editColor,
      });
      setEditingId(null);
      catalystToast.success('Priority updated');
    } catch (e: any) {
      catalystToast.error(e.message);
    }
  };

  const setDefault = async (p: TMCasePriority) => {
    if (!projectId) return;
    try {
      // Unset all, then set this one
      for (const pr of priorities) {
        if (pr.id !== p.id && pr.is_default) {
          await updatePriority.mutateAsync({ id: pr.id, project_id: pr.project_id, is_default: false });
        }
      }
      await updatePriority.mutateAsync({ id: p.id, project_id: p.project_id, is_default: true });
      catalystToast.success(`${p.name} set as default`);
    } catch (e: any) {
      catalystToast.error(e.message);
    }
  };

  const handleDelete = async (p: TMCasePriority) => {
    try {
      await deletePriority.mutateAsync({ id: p.id, projectId: p.project_id });
      catalystToast.success('Priority deleted');
    } catch (e: any) {
      catalystToast.error(e.message);
    }
  };

  if (projectsLoading || isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner size="large" /></div>;
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle)', marginBottom: 4, display: 'block',
  };

  return (
    <div style={{ padding: 24, maxWidth: 860, fontFamily: 'var(--ds-font-family-body)' }}>
      <PageHeader
        title="Case priorities"
        breadcrumbs={
          <Breadcrumbs items={[
            { key: 'admin', text: 'Admin', onClick: () => navigate('/admin/overview') },
            { key: 'test', text: 'Test Hub', isCurrent: false },
            { key: 'priorities', text: 'Priorities', isCurrent: true },
          ]} />
        }
        actions={<Button appearance="primary" onClick={() => setShowAdd(v => !v)}>+ Add priority</Button>}
      />

      <p style={{ fontSize: 14, color: 'var(--ds-text-subtle)', margin: '4px 0 24px' }}>
        Define priority levels for test cases. The default priority is applied automatically on new cases.
      </p>

      {showAdd && (
        <div style={{
          border: '1px solid var(--ds-border)', borderRadius: 8, padding: 16, marginBottom: 16,
          background: 'var(--ds-surface-overlay)', boxShadow: '0 2px 8px var(--ds-background-neutral-subtle-pressed, rgba(9,30,66,0.1))',
        }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: 'var(--ds-text)' }}>New priority</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>
            <div>
              <label style={labelStyle}>Name *</label>
              <Textfield
                value={newName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewName(e.target.value)}
                placeholder="e.g. Critical"
                autoFocus
              />
            </div>
            <div>
              <label style={labelStyle}>Color</label>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    style={{
                      width: 24, height: 24, borderRadius: '50%', background: c,
                      border: newColor === c ? '1px solid var(--ds-border-focused)' : '1px solid transparent',
                      cursor: 'pointer', padding: 0,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
            <Button appearance="subtle" onClick={() => { setShowAdd(false); setNewName(''); }}>Cancel</Button>
            <Button appearance="primary" isDisabled={!newName.trim() || createPriority.isPending} onClick={handleAdd}>
              {createPriority.isPending ? 'Adding…' : 'Add'}
            </Button>
          </div>
        </div>
      )}

      <div style={{ border: '1px solid var(--ds-border)', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: 'var(--ds-surface-sunken)', borderBottom: '1px solid var(--ds-border)' }}>
              {['Color', 'Name', 'Default', 'Actions'].map((h, i) => (
                <th key={i} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {priorities.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '32px 12px', textAlign: 'center', color: 'var(--ds-text-subtlest)' }}>
                  No priorities yet. Add your first priority above.
                </td>
              </tr>
            ) : priorities.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--ds-border)' }}>
                <td style={{ padding: '8px 12px', width: 48 }}>
                  {editingId === p.id ? (
                    <div style={{ display: 'flex', gap: 4 }}>
                      {COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => setEditColor(c)}
                          style={{
                            width: 18, height: 18, borderRadius: '50%', background: c, border: editColor === c ? '1px solid var(--ds-border-focused)' : '1px solid transparent',
                            cursor: 'pointer', padding: 0,
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', background: p.color ?? 'var(--ds-text-subtlest)' }} />
                  )}
                </td>
                <td style={{ padding: '8px 12px' }}>
                  {editingId === p.id ? (
                    <Textfield
                      value={editName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)}
                      autoFocus
                    />
                  ) : (
                    <span style={{ fontWeight: 500, color: 'var(--ds-text)' }}>{p.name}</span>
                  )}
                </td>
                <td style={{ padding: '8px 12px' }}>
                  {p.is_default ? (
                    <span style={{
                      display: 'inline-block', padding: '0px 8px', borderRadius: 3, fontSize: 11, fontWeight: 600,
                      background: 'var(--ds-background-accent-blue-subtler)', color: 'var(--ds-text-accent-blue)',
                    }}>Default</span>
                  ) : (
                    <button
                      onClick={() => setDefault(p)}
                      style={{ fontSize: 11, color: 'var(--ds-link)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      Set default
                    </button>
                  )}
                </td>
                <td style={{ padding: '8px 12px' }}>
                  {editingId === p.id ? (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Button appearance="primary" spacing="compact" onClick={() => saveEdit(p)}>Save</Button>
                      <Button appearance="subtle" spacing="compact" onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      {/* D063: edit as an @atlaskit IconButton; delete as a Button
                          that opens the confirm dialog (no plain-text links). */}
                      <Tooltip content="Edit priority">
                        <IconButton
                          icon={EditIcon}
                          label="Edit priority"
                          appearance="subtle"
                          spacing="compact"
                          onClick={() => startEdit(p)}
                        />
                      </Tooltip>
                      <Button appearance="subtle" spacing="compact" onClick={() => setDeleteTarget(p)}>Delete</Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      <ConfirmDeleteDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        issueKey={deleteTarget?.name}
        typeLabel="test priority"
        onConfirm={() => { if (deleteTarget) handleDelete(deleteTarget); setDeleteTarget(null); }}
      />
      </div>
    </div>
  );
}
