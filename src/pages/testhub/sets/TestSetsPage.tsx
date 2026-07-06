import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTestHubProject } from '@/hooks/test-management/useTestHubProject';
import Spinner from '@atlaskit/spinner';
import Button from '@atlaskit/button/standard-button';
import { IconButton } from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import Select from '@atlaskit/select';
import Lozenge from '@atlaskit/lozenge';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import ShowMoreHorizontalIcon from '@atlaskit/icon/core/show-more-horizontal';
import { catalystToast } from '@/lib/catalystToast';
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

// D035: set type as an ADS Lozenge (component-owned color) instead of a
// hand-rolled uppercase pill on a custom accent-color map.
function SetTypePill({ type }: { type: SetType }) {
  return (
    <Lozenge appearance={type === 'smoke' ? 'new' : type === 'regression' ? 'inprogress' : 'default'}>
      {SET_TYPE_LABELS[type] ?? type}
    </Lozenge>
  );
}

// D034: membership type as a Lozenge, no emoji glyph.
function MembershipBadge({ type }: { type: MembershipType }) {
  return (
    <Lozenge appearance={type === 'dynamic' ? 'inprogress' : 'default'}>
      {type === 'dynamic' ? 'Dynamic' : 'Static'}
    </Lozenge>
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

// ── Row ⋯ menu (D035: canonical @atlaskit DropdownMenu, no hand-rolled portal) ──
function SetRowMenu({ set, projectId, onDeleted }: {
  set: TmTestSet; projectId: string; onDeleted: () => void;
}) {
  const qc = useQueryClient();

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
    },
    onError: (e: Error) => catalystToast.error(e.message),
  });

  return (
    <DropdownMenu<HTMLButtonElement>
      placement="bottom-end"
      trigger={({ triggerRef, ...props }) => (
        <IconButton
          {...props}
          ref={triggerRef}
          icon={ShowMoreHorizontalIcon}
          label="Set actions"
          appearance="subtle"
          spacing="compact"
        />
      )}
    >
      <DropdownItemGroup>
        <DropdownItem onClick={() => copyMut.mutate()}>Copy set</DropdownItem>
        <DropdownItem onClick={() => archiveMut.mutate()}>Archive set</DropdownItem>
        <DropdownItem onClick={() => deleteMut.mutate()}>Delete set</DropdownItem>
      </DropdownItemGroup>
    </DropdownMenu>
  );
}

export default function TestSetsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { projectKey = 'BAU' } = useParams<{ projectKey: string }>();
  const { projectId, isLoading: projectsLoading } = useTestHubProject();

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateSetForm>(EMPTY_FORM);

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
          boxShadow: '0 4px 12px var(--ds-background-neutral-subtle-pressed)',
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
              onClick={() => navigate(`/testhub/sets/${set.set_key}`)}
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
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-background-neutral-subtle-hovered)')}
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
                <SetRowMenu
                  set={set}
                  projectId={projectId!}
                  onDeleted={() => {}}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
