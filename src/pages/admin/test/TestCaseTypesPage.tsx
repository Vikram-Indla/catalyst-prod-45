import React, { useState } from 'react';
import { ConfirmDeleteDialog } from '@/components/catalyst-detail-views/shared/ConfirmDeleteDialog';
import { useNavigate } from 'react-router-dom';
import Button from '@atlaskit/button/standard-button';
import Spinner from '@atlaskit/spinner';
import Textfield from '@atlaskit/textfield';
import { PageHeader } from '@/components/ads/PageHeader';
import { Breadcrumbs } from '@/components/ads/Breadcrumbs';
import { catalystToast } from '@/lib/catalystToast';
import {
  useCaseTypes,
  useCreateType,
  useUpdateType,
  useDeleteType,
} from '@/hooks/test-management/useAdminConfig';
import { useProjects } from '@/hooks/test-management/useProjects';
import { TMCaseType } from '@/types/test-management';
import {
  Search, Zap, RefreshCw, Link as LinkIcon, Monitor, Lock, Globe,
  Settings, CheckCircle, Box, type LucideIcon,
} from '@/lib/atlaskit-icons';

// D065: tm_case_types.icon stores an icon NAME (e.g. "shield", "zap", "code",
// "box"), not an emoji. Map the stored name to a real @atlaskit-backed icon
// component so the Icon column renders the icon — not the literal name string.
const ICON_BY_NAME: Record<string, LucideIcon> = {
  search: Search,
  zap: Zap,
  refresh: RefreshCw,
  link: LinkIcon,
  monitor: Monitor,
  lock: Lock,
  globe: Globe,
  settings: Settings,
  check: CheckCircle,
  box: Box,
  // Aliases for names seen in existing data / other seeds.
  code: Box,
  shield: Lock,
};

// Picker offers the named icons (no emoji, no bare color).
const ICON_NAMES = ['search', 'zap', 'refresh', 'link', 'monitor', 'lock', 'globe', 'settings', 'check', 'box'];

function CaseTypeIcon({ name, size = 18 }: { name: string | null | undefined; size?: number }) {
  const Icon = name ? ICON_BY_NAME[name.toLowerCase()] : undefined;
  // Zero-assumption: unknown / unmapped icon name renders nothing, not a guess.
  if (!Icon) return null;
  return <Icon size={size} />;
}

export default function TestCaseTypesPage() {
  const navigate = useNavigate();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const projectId = projects[0]?.id ?? null;

  const { data: types = [], isLoading } = useCaseTypes(projectId);
  const createType = useCreateType();
  const updateType = useUpdateType();
  const deleteType = useDeleteType();

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState(ICON_NAMES[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<TMCaseType | null>(null);

  const handleAdd = async () => {
    if (!newName.trim() || !projectId) return;
    try {
      await createType.mutateAsync({
        project_id: projectId,
        name: newName.trim(),
        icon: newIcon,
        is_default: types.length === 0,
      });
      setNewName('');
      setNewIcon(ICON_NAMES[0]);
      setShowAdd(false);
      catalystToast.success('Case type created');
    } catch (e: any) {
      catalystToast.error(e.message);
    }
  };

  const startEdit = (t: TMCaseType) => {
    setEditingId(t.id);
    setEditName(t.name);
    setEditIcon(t.icon ?? ICON_NAMES[0]);
  };

  const saveEdit = async (t: TMCaseType) => {
    if (!editName.trim()) return;
    try {
      await updateType.mutateAsync({
        id: t.id,
        project_id: t.project_id,
        name: editName.trim(),
        icon: editIcon,
      });
      setEditingId(null);
      catalystToast.success('Case type updated');
    } catch (e: any) {
      catalystToast.error(e.message);
    }
  };

  const setDefault = async (t: TMCaseType) => {
    if (!projectId) return;
    try {
      for (const ty of types) {
        if (ty.id !== t.id && ty.is_default) {
          await updateType.mutateAsync({ id: ty.id, project_id: ty.project_id, is_default: false });
        }
      }
      await updateType.mutateAsync({ id: t.id, project_id: t.project_id, is_default: true });
      catalystToast.success(`${t.name} set as default`);
    } catch (e: any) {
      catalystToast.error(e.message);
    }
  };

  const handleDelete = async (t: TMCaseType) => {
    try {
      await deleteType.mutateAsync({ id: t.id, projectId: t.project_id });
      catalystToast.success('Case type deleted');
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
        title="Case types"
        breadcrumbs={
          <Breadcrumbs items={[
            { key: 'admin', text: 'Admin', onClick: () => navigate('/admin/overview') },
            { key: 'test', text: 'Test Hub', isCurrent: false },
            { key: 'types', text: 'Case types', isCurrent: true },
          ]} />
        }
        actions={<Button appearance="primary" onClick={() => setShowAdd(v => !v)}>+ Add type</Button>}
      />

      <p style={{ fontSize: 14, color: 'var(--ds-text-subtle)', margin: '4px 0 24px' }}>
        Define test case types (e.g. Functional, Regression, Integration). The default type is applied on new cases.
      </p>

      {showAdd && (
        <div style={{
          border: '1px solid var(--ds-border)', borderRadius: 8, padding: 16, marginBottom: 16,
          background: 'var(--ds-surface-overlay)', boxShadow: '0 2px 8px var(--ds-background-neutral-subtle-pressed, rgba(9,30,66,0.1))',
        }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: 'var(--ds-text)' }}>New case type</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>
            <div>
              <label style={labelStyle}>Name *</label>
              <Textfield
                value={newName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewName(e.target.value)}
                placeholder="e.g. Functional"
                autoFocus
              />
            </div>
            <div>
              <label style={labelStyle}>Icon</label>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {ICON_NAMES.map(ic => (
                  <button
                    key={ic}
                    onClick={() => setNewIcon(ic)}
                    aria-label={ic}
                    aria-pressed={newIcon === ic}
                    style={{
                      width: 28, height: 28, borderRadius: 4,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--ds-text-subtle)',
                      border: newIcon === ic ? '1px solid var(--ds-border-focused)' : '1px solid transparent',
                      cursor: 'pointer', background: newIcon === ic ? 'var(--ds-background-selected)' : 'none',
                    }}
                  >
                    <CaseTypeIcon name={ic} size={16} />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
            <Button appearance="subtle" onClick={() => { setShowAdd(false); setNewName(''); }}>Cancel</Button>
            <Button appearance="primary" isDisabled={!newName.trim() || createType.isPending} onClick={handleAdd}>
              {createType.isPending ? 'Adding…' : 'Add'}
            </Button>
          </div>
        </div>
      )}

      <div style={{ border: '1px solid var(--ds-border)', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: 'var(--ds-surface-sunken)', borderBottom: '1px solid var(--ds-border)' }}>
              {['Icon', 'Name', 'Default', 'Actions'].map((h, i) => (
                <th key={i} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {types.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '32px 12px', textAlign: 'center', color: 'var(--ds-text-subtlest)' }}>
                  No case types yet.
                </td>
              </tr>
            ) : types.map(t => (
              <tr key={t.id} style={{ borderBottom: '1px solid var(--ds-border)' }}>
                <td style={{ padding: '8px 12px', width: 80 }}>
                  {editingId === t.id ? (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {ICON_NAMES.map(ic => (
                        <button
                          key={ic}
                          onClick={() => setEditIcon(ic)}
                          aria-label={ic}
                          aria-pressed={editIcon === ic}
                          style={{
                            width: 24, height: 24, borderRadius: 4,
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--ds-text-subtle)',
                            border: editIcon === ic ? '1px solid var(--ds-border-focused)' : '1px solid transparent',
                            cursor: 'pointer', background: editIcon === ic ? 'var(--ds-background-selected)' : 'none',
                          }}
                        >
                          <CaseTypeIcon name={ic} size={14} />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span style={{ display: 'inline-flex', color: 'var(--ds-icon)' }}>
                      <CaseTypeIcon name={t.icon} size={18} />
                    </span>
                  )}
                </td>
                <td style={{ padding: '8px 12px' }}>
                  {editingId === t.id ? (
                    <Textfield
                      value={editName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)}
                      autoFocus
                    />
                  ) : (
                    <span style={{ fontWeight: 500, color: 'var(--ds-text)' }}>{t.name}</span>
                  )}
                </td>
                <td style={{ padding: '8px 12px' }}>
                  {t.is_default ? (
                    <span style={{
                      display: 'inline-block', padding: '0px 8px', borderRadius: 3, fontSize: 11, fontWeight: 600,
                      background: 'var(--ds-background-accent-blue-subtler)', color: 'var(--ds-text-accent-blue)',
                    }}>Default</span>
                  ) : (
                    <button
                      onClick={() => setDefault(t)}
                      style={{ fontSize: 11, color: 'var(--ds-link)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      Set default
                    </button>
                  )}
                </td>
                <td style={{ padding: '8px 12px' }}>
                  {editingId === t.id ? (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Button appearance="primary" spacing="compact" onClick={() => saveEdit(t)}>Save</Button>
                      <Button appearance="subtle" spacing="compact" onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Button appearance="subtle" spacing="compact" onClick={() => startEdit(t)}>Edit</Button>
                      <Button appearance="subtle" spacing="compact" onClick={() => setDeleteTarget(t)}>Delete</Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ConfirmDeleteDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        issueKey={deleteTarget?.name}
        typeLabel="test case type"
        onConfirm={() => { if (deleteTarget) handleDelete(deleteTarget); setDeleteTarget(null); }}
      />
    </div>
  );
}
