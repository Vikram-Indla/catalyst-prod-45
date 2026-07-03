import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProjects } from '@/hooks/test-management/useProjects';
import Spinner from '@atlaskit/spinner';
import Button from '@atlaskit/button/standard-button';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import Select from '@atlaskit/select';
import { catalystToast } from '@/lib/catalystToast';
import { MoreHorizontal } from '@/lib/atlaskit-icons';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';

type SetType = 'smoke' | 'regression' | 'sanity' | 'integration' | 'e2e' | 'performance' | 'security' | 'accessibility' | 'custom';
type MembershipType = 'static' | 'dynamic';

interface TmTestSet {
  id: string;
  set_key: string;
  name: string;
  description: string | null;
  set_type: SetType;
  membership_type: MembershipType;
  test_count: number;
  is_active: boolean;
  project_id: string;
  created_at: string;
}

const SET_TYPE_LABELS: Record<SetType, string> = {
  smoke: 'Smoke',
  regression: 'Regression',
  sanity: 'Sanity',
  integration: 'Integration',
  e2e: 'End-to-End',
  performance: 'Performance',
  security: 'Security',
  accessibility: 'Accessibility',
  custom: 'Custom',
};

const SET_TYPE_COLORS: Record<SetType, string> = {
  smoke: 'var(--ds-background-accent-orange-subtler)',
  regression: 'var(--ds-background-accent-blue-subtler)',
  sanity: 'var(--ds-background-accent-green-subtler)',
  integration: 'var(--ds-background-accent-purple-subtler)',
  e2e: 'var(--ds-background-accent-teal-subtler)',
  performance: 'var(--ds-background-accent-yellow-subtler)',
  security: 'var(--ds-background-accent-red-subtler)',
  accessibility: 'var(--ds-background-accent-magenta-subtler)',
  custom: 'var(--ds-background-neutral)',
};

function SetTypePill({ type }: { type: SetType }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '0px 8px',
      borderRadius: 3,
      fontSize: 'var(--ds-font-size-100)',
      fontWeight: 600,
      background: SET_TYPE_COLORS[type] ?? 'var(--ds-background-neutral)',
      color: 'var(--ds-text)',
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
    }}>
      {SET_TYPE_LABELS[type] ?? type}
    </span>
  );
}

function MembershipBadge({ type }: { type: MembershipType }) {
  return (
    <span style={{
      fontSize: 'var(--ds-font-size-100)',
      fontWeight: 500,
      color: type === 'dynamic'
        ? 'var(--ds-text-accent-blue)'
        : 'var(--ds-text-subtle)',
    }}>
      {type === 'dynamic' ? '⚡ Dynamic' : '📌 Static'}
    </span>
  );
}

interface CreateSetForm {
  name: string;
  description: string;
  set_type: SetType;
  membership_type: MembershipType;
}

const EMPTY_FORM: CreateSetForm = {
  name: '',
  description: '',
  set_type: 'regression',
  membership_type: 'static',
};

// ── Row ⋯ menu ─────────────────────────────────────────────────────────────────
function SetRowMenu({ set, projectId, onClose, onDeleted }: {
  set: TmTestSet; projectId: string; onClose: () => void; onDeleted: () => void;
}) {
  const qc = useQueryClient();
  const menuRef = useRef<HTMLDivElement>(null);
  const trigRef = useRef<HTMLButtonElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (trigRef.current) {
      const r = trigRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.right - 160 });
    }
    const down = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !trigRef.current?.contains(e.target as Node)) onClose();
    };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key, true);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key, true); };
  }, [onClose]);

  const deleteMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('tm_test_sets').delete().eq('id', set.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tm_test_sets', projectId] });
      catalystToast.success('Set deleted');
      onDeleted();
    },
    onError: (e: Error) => catalystToast.error(e.message),
  });

  const copyMut = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('tm_test_sets').insert({
        name: `${set.name} (Copy)`,
        description: set.description,
        set_type: set.set_type,
        membership_type: set.membership_type,
        project_id: projectId,
        created_by: user.id,
        owner_id: user.id,
        is_active: false,
        test_count: 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tm_test_sets', projectId] });
      catalystToast.success('Set copied');
      onClose();
    },
    onError: (e: Error) => catalystToast.error(e.message),
  });

  const archiveMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('tm_test_sets').update({ is_active: false }).eq('id', set.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tm_test_sets', projectId] });
      catalystToast.success('Set archived');
      onClose();
    },
    onError: (e: Error) => catalystToast.error(e.message),
  });

  const item: React.CSSProperties = {
    display: 'block', width: '100%', padding: '8px 16px', textAlign: 'left',
    border: 'none', background: 'none', cursor: 'pointer', fontSize: 'var(--ds-font-size-300)',
    color: 'var(--ds-text)',
  };

  return (
    <>
      <button ref={trigRef} onClick={e => e.stopPropagation()}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', color: 'var(--ds-text-subtlest)' }}>
        <MoreHorizontal size={14} />
      </button>
      {pos && createPortal(
        <div ref={menuRef} role="menu" style={{
          position: 'fixed', top: pos.top, left: pos.left,
          background: 'var(--ds-surface-overlay)',
          border: '1px solid var(--ds-border)',
          borderRadius: 6, boxShadow: '0 8px 28px var(--ds-shadow-raised, rgba(9,30,66,0.25))',
          padding: '4px 0', minWidth: 160, zIndex: 9999,
        }}>
          <button role="menuitem" style={item}
            onClick={e => { e.stopPropagation(); copyMut.mutate(); }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.04))'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}>
            Copy set
          </button>
          <button role="menuitem" style={{ ...item, color: 'var(--ds-text-warning)' }}
            onClick={e => { e.stopPropagation(); archiveMut.mutate(); }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.04))'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}>
            Archive set
          </button>
          <button role="menuitem" style={{ ...item, color: 'var(--ds-text-danger)' }}
            onClick={e => { e.stopPropagation(); deleteMut.mutate(); }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.04))'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}>
            Delete set
          </button>
        </div>,
        document.body
      )}
    </>
  );
}

export default function TestSetsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { projectKey = 'BAU' } = useParams<{ projectKey: string }>();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const projectId = projects[0]?.id;

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateSetForm>(EMPTY_FORM);
  const [rowMenuId, setRowMenuId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const bulkBtnRef = useRef<HTMLButtonElement | null>(null);
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);

  const { data: sets = [], isLoading } = useQuery({
    queryKey: ['tm_test_sets', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tm_test_sets')
        .select('id, set_key, name, description, set_type, membership_type, test_count, is_active, project_id, created_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const rows = data ?? [];

      // tm_test_sets.test_count is a denormalized counter nothing keeps in sync.
      // Derive the live membership count from tm_set_cases (batch, one query)
      // so the list never shows a stale count (zero-assumption: real, not a lie).
      const ids = rows.map((r) => r.id);
      const counts: Record<string, number> = {};
      if (ids.length > 0) {
        const { data: memberRows } = await supabase
          .from('tm_set_cases')
          .select('test_set_id')
          .in('test_set_id', ids);
        (memberRows ?? []).forEach((m: any) => {
          counts[m.test_set_id] = (counts[m.test_set_id] || 0) + 1;
        });
      }
      return rows.map((r) => ({ ...r, test_count: counts[r.id] ?? 0 })) as TmTestSet[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateSetForm) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('tm_test_sets').insert({
        name: input.name.trim(),
        description: input.description.trim() || null,
        set_type: input.set_type,
        membership_type: input.membership_type,
        project_id: projectId,
        created_by: user.id,
        owner_id: user.id,
        is_active: true,
        test_count: 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tm_test_sets', projectId] });
      setShowCreate(false);
      setForm(EMPTY_FORM);
      catalystToast.success('Test set created');
    },
    onError: (err: Error) => catalystToast.error(err.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('tm_test_sets')
        .update({ is_active: !is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tm_test_sets', projectId] }),
  });

  if (projectsLoading || isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <Spinner size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, fontFamily: 'var(--ds-font-family-body)' }}>
      <ProjectPageHeader
        hubType="test"
        actions={<Button appearance="primary" onClick={() => setShowCreate(true)}>+ New Test Set</Button>}
      />
      <p style={{ fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text-subtle)', margin: '4px 0' }}>
          {sets.length} set{sets.length !== 1 ? 's' : ''}
        </p>

      {/* Create form */}
      {showCreate && (
        <div style={{
          border: '1px solid var(--ds-border)',
          borderRadius: 8,
          padding: 16,
          marginBottom: 24,
          background: 'var(--ds-surface-overlay)',
          boxShadow: '0 4px 12px var(--ds-background-neutral-subtle-pressed, rgba(9,30,66,0.12))',
        }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 'var(--ds-font-size-500)', fontWeight: 600, color: 'var(--ds-text)' }}>
            New Test Set
          </h3>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text-subtle)', marginBottom: 4 }}>
                Name *
              </label>
              <Textfield
                value={form.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Regression Suite v2.0"
                autoFocus
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text-subtle)', marginBottom: 4 }}>
                Description
              </label>
              <TextArea
                value={form.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm(f => ({ ...f, description: e.target.value }))}
                minimumRows={2}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text-subtle)', marginBottom: 4 }}>
                  Type
                </label>
                <Select
                  value={{ value: form.set_type, label: SET_TYPE_LABELS[form.set_type] }}
                  onChange={opt => opt && setForm(f => ({ ...f, set_type: opt.value as SetType }))}
                  options={(Object.keys(SET_TYPE_LABELS) as SetType[]).map(t => ({ value: t, label: SET_TYPE_LABELS[t] }))}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text-subtle)', marginBottom: 4 }}>
                  Membership
                </label>
                <Select
                  value={{ value: form.membership_type, label: form.membership_type === 'dynamic' ? 'Dynamic (criteria-based)' : 'Static (manual)' }}
                  onChange={opt => opt && setForm(f => ({ ...f, membership_type: opt.value as MembershipType }))}
                  options={[
                    { value: 'static', label: 'Static (manual)' },
                    { value: 'dynamic', label: 'Dynamic (criteria-based)' },
                  ]}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button appearance="subtle" onClick={() => { setShowCreate(false); setForm(EMPTY_FORM); }}>
                Cancel
              </Button>
              <Button
                appearance="primary"
                isDisabled={!form.name.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate(form)}
              >
                {createMutation.isPending ? 'Creating…' : 'Create Set'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sets list */}
      {sets.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '48px 32px',
          color: 'var(--ds-text-subtlest)', fontSize: 'var(--ds-font-size-400)',
          border: '1px dashed var(--ds-border)', borderRadius: 8,
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
          <p style={{ margin: '0 0 16px', fontSize: 'var(--ds-font-size-500)', fontWeight: 500, color: 'var(--ds-text-subtle)' }}>
            No test sets yet
          </p>
          <p style={{ margin: '0 0 20px' }}>
            Group related test cases into reusable sets for faster cycle setup.
          </p>
          <Button appearance="primary" onClick={() => setShowCreate(true)}>
            Create first test set
          </Button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 0 }}>
          {/* Header row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '48px 1fr 120px 120px 80px 80px 80px',
            padding: '8px 16px',
            background: 'var(--ds-surface-sunken)',
            borderRadius: '6px 6px 0 0',
            border: '1px solid var(--ds-border)',
          }}>
            {['Key', 'Name', 'Type', 'Membership', 'Cases', 'Active', ''].map((h, i) => (
              <span key={i} style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 653, color: 'var(--ds-text-subtle)' }}>
                {h}
              </span>
            ))}
          </div>
          {/* Rows */}
          {sets.map((set, idx) => (
            <div
              key={set.id}
              onClick={() => navigate(`/testhub/sets/${set.id}`)}
              style={{
                display: 'grid',
                gridTemplateColumns: '48px 1fr 120px 120px 80px 80px 80px',
                padding: '12px 16px',
                alignItems: 'center',
                background: 'var(--ds-surface)',
                border: '1px solid var(--ds-border)',
                borderTop: 'none',
                borderRadius: idx === sets.length - 1 ? '0 0 6px 6px' : 0,
                cursor: 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--ds-surface)')}
            >
              <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 500, color: 'var(--ds-text-subtlest)', fontFamily: 'var(--ds-font-family-code, monospace)' }}>
                {set.set_key ?? '—'}
              </span>
              <div>
                <div style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 500, color: 'var(--ds-link)', cursor: 'pointer' }}>
                  {set.name}
                </div>
                {set.description && (
                  <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest)', marginTop: 0 }}>
                    {set.description}
                  </div>
                )}
              </div>
              <div><SetTypePill type={set.set_type} /></div>
              <div><MembershipBadge type={set.membership_type} /></div>
              <span style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtle)' }}>
                {set.test_count ?? 0}
              </span>
              <div onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => toggleActive.mutate({ id: set.id, is_active: set.is_active })}
                  style={{
                    width: 36, height: 20, borderRadius: 10,
                    border: 'none', cursor: 'pointer',
                    background: set.is_active
                      ? 'var(--ds-background-brand-bold)'
                      : 'var(--ds-background-neutral)',
                    position: 'relative', transition: 'background 200ms',
                  }}
                  aria-label={set.is_active ? 'Deactivate' : 'Activate'}
                >
                  <span style={{
                    display: 'block', width: 14, height: 14, borderRadius: '50%',
                    background: 'var(--ds-surface)',
                    position: 'absolute', top: 4,
                    left: set.is_active ? 19 : 3,
                    transition: 'left 200ms',
                  }} />
                </button>
              </div>
              <div onClick={e => e.stopPropagation()}>
                {rowMenuId === set.id
                  ? <SetRowMenu
                      set={set}
                      projectId={projectId!}
                      onClose={() => setRowMenuId(null)}
                      onDeleted={() => setRowMenuId(null)}
                    />
                  : <button
                      onClick={e => { e.stopPropagation(); setRowMenuId(set.id); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', color: 'var(--ds-text-subtlest)' }}
                    >
                      <MoreHorizontal size={14} />
                    </button>
                }
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
