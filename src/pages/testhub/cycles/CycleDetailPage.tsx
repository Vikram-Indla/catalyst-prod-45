import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import Select from '@atlaskit/select';
import { DatePicker } from '@atlaskit/datetime-picker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useTestCycle,
  useCycleScope,
  useAddCasesToScope,
  useRemoveFromScope,
  useStartCycle,
  useCompleteCycle,
} from '@/hooks/test-management/useTestCycles';
import { useTestCases } from '@/hooks/test-management/useTestCases';
import { useProjects } from '@/hooks/test-management/useProjects';
import Spinner from '@atlaskit/spinner';
import Lozenge from '@atlaskit/lozenge';
import Textarea from '@atlaskit/textarea';
import Textfield from '@atlaskit/textfield';
import { Play, CheckCircle, Plus, Trash2 } from '@/lib/atlaskit-icons';
import { TMCycleScope, RunStatus } from '@/types/test-management';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { Breadcrumbs } from '@/components/ads/Breadcrumbs';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';

export default function CycleDetailPage() {
  const { id: cycleId, projectKey = 'BAU' } = useParams<{ id: string; projectKey: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: projects = [] } = useProjects();
  const projectId = projects[0]?.id;

  const { data: cycle, isLoading: cycleLoading } = useTestCycle(cycleId);
  const { data: scopeItems = [], isLoading: scopeLoading } = useCycleScope(cycleId);

  const addCases = useAddCasesToScope();
  const removeCases = useRemoveFromScope();
  const startCycle = useStartCycle();
  const completeCycle = useCompleteCycle();

  const [showAddCases, setShowAddCases] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'scope' | 'planning'>('scope');

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .order('full_name');
      return data ?? [];
    },
  });

  const { data: otherCycles = [] } = useQuery({
    queryKey: ['cycles-for-move', projectId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('tm_test_cycles')
        .select('id, name, status')
        .eq('project_id', projectId!)
        .neq('id', cycleId!)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!projectId && !!cycleId,
  });

  if (cycleLoading) {
    return (
      <div style={{ padding: 32, display: 'flex', justifyContent: 'center' }}>
        <Spinner size="large" />
      </div>
    );
  }

  if (!cycle) {
    return <div style={{ padding: 32, color: 'var(--ds-text-danger, #AE2A19)' }}>Cycle not found</div>;
  }

  const total = cycle.total_cases ?? 0;
  const passed = cycle.passed_count ?? 0;
  const failed = cycle.failed_count ?? 0;
  const blocked = cycle.blocked_count ?? 0;
  const executed = passed + failed + blocked;
  const pct = total > 0 ? Math.round((executed / total) * 100) : 0;

  // Filter
  const filteredItems = statusFilter === 'ALL' ? scopeItems : scopeItems.filter(i => i.status === statusFilter);

  // Bulk select helpers
  const allSelected = filteredItems.length > 0 && filteredItems.every(i => selectedIds.has(i.id));
  const toggleAll = () => setSelectedIds(() => allSelected ? new Set() : new Set(filteredItems.map(i => i.id)));
  const toggleOne = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const STATUS_PILLS: { value: string; label: string }[] = [
    { value: 'ALL', label: 'All' },
    { value: 'NOT_RUN', label: 'Not run' },
    { value: 'PASSED', label: 'Pass' },
    { value: 'FAILED', label: 'Fail' },
    { value: 'BLOCKED', label: 'Blocked' },
    { value: 'IN_PROGRESS', label: 'In progress' },
    { value: 'SKIPPED', label: 'Skip' },
  ];

  const handleBulkStatusChange = async (newStatus: RunStatus) => {
    const ids = Array.from(selectedIds);
    const { error } = await (supabase.from('tm_cycle_scope') as any).update({ status: newStatus }).in('id', ids);
    if (error) { catalystToast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ['cycle-scope', cycleId] });
    setSelectedIds(new Set());
    catalystToast.success(`Updated ${ids.length} case${ids.length > 1 ? 's' : ''}`);
  };

  const handleMoveRuns = async (targetCycle: { id: string; name: string }) => {
    const ids = Array.from(selectedIds);
    const selectedItems = scopeItems.filter(i => ids.includes(i.id));

    // Insert into target cycle
    const inserts = selectedItems.map(i => ({
      cycle_id: targetCycle.id,
      test_case_id: i.case_id,
      status: 'NOT_RUN' as const,
    }));
    const { error: insertErr } = await (supabase as any)
      .from('tm_cycle_scope')
      .upsert(inserts, { onConflict: 'cycle_id,test_case_id', ignoreDuplicates: true });
    if (insertErr) { catalystToast.error(insertErr.message); return; }

    // Remove from current cycle
    const { error: deleteErr } = await (supabase as any)
      .from('tm_cycle_scope')
      .delete()
      .in('id', ids);
    if (deleteErr) { catalystToast.error(deleteErr.message); return; }

    qc.invalidateQueries({ queryKey: ['cycle-scope', cycleId] });
    qc.invalidateQueries({ queryKey: ['cycle-scope', targetCycle.id] });
    setSelectedIds(new Set());
    catalystToast.success(`${ids.length} case${ids.length > 1 ? 's' : ''} moved to ${targetCycle.name}`);
  };

  return (
    <div style={{ padding: '24px', maxWidth: 1200, fontFamily: 'var(--ds-font-family-body)' }}>
      <div style={{ marginBottom: 24 }}>
        <ProjectPageHeader
          hubType="test"
          title={cycle.name}
          breadcrumbs={
            <Breadcrumbs items={[
              { key: 'home', text: 'Home', href: '/for-you' },
              { key: 'testhub', text: 'Test Hub', href: '/testhub' },
              { key: 'project', text: projectKey, href: `/testhub/${projectKey}/dashboard` },
              { key: 'cycles', text: 'Test Cycles', href: `/testhub/${projectKey}/cycles` },
              { key: 'detail', text: cycle.name, isCurrent: true },
            ]} />
          }
          actions={
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                onClick={() => {
                  const sprintName = (cycle as any)?.sprint?.name ?? '';
                  const headers = ['Key', 'Title', 'Status', 'Assignee', 'Sprint'];
                  const rows = scopeItems.map(i => [
                    i.test_case?.key ?? '',
                    i.test_case?.title ?? '',
                    i.status,
                    i.assignee?.full_name ?? 'Unassigned',
                    sprintName,
                  ]);
                  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = `cycle-${cycle.name}-report.csv`; a.click();
                  URL.revokeObjectURL(url);
                }}
                style={{
                  padding: '6px 12px', background: 'none', border: '1px solid var(--ds-border, #DFE1E6)',
                  borderRadius: 4, cursor: 'pointer', fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text, #172B4D)',
                }}
              >
                Export CSV
              </button>
              {cycle.status === 'PLANNED' && (
                <button
                  onClick={() => startCycle.mutate({ id: cycle.id, project_id: cycle.project_id })}
                  disabled={startCycle.isPending}
                  style={{
                    padding: '8px 16px',
                    background: 'var(--ds-background-brand-bold, #0052CC)',
                    color: 'var(--ds-text-inverse, #FFFFFF)',
                    border: 'none',
                    borderRadius: 4,
                    cursor: startCycle.isPending ? 'not-allowed' : 'pointer',
                    fontSize: 'var(--ds-font-size-300)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    opacity: startCycle.isPending ? 0.7 : 1,
                  }}
                >
                  <Play size={13} />
                  {startCycle.isPending ? 'Starting...' : 'Start cycle'}
                </button>
              )}
              {cycle.status === 'IN_PROGRESS' && (
                <>
                  <button
                    onClick={() => navigate(`/testhub/${projectKey}/cycles/${cycle.id}/execute`)}
                    style={{
                      padding: '8px 16px',
                      background: 'var(--ds-background-brand-bold, #0052CC)',
                      color: 'var(--ds-text-inverse, #FFFFFF)',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontSize: 'var(--ds-font-size-300)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Play size={13} />
                    Execute
                  </button>
                  <button
                    onClick={() => completeCycle.mutate({ id: cycle.id, project_id: cycle.project_id })}
                    disabled={completeCycle.isPending}
                    style={{
                      padding: '8px 16px',
                      background: 'none',
                      border: '1px solid var(--ds-border, #DFE1E6)',
                      borderRadius: 4,
                      cursor: completeCycle.isPending ? 'not-allowed' : 'pointer',
                      fontSize: 'var(--ds-font-size-300)',
                      color: 'var(--ds-text, #172B4D)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      opacity: completeCycle.isPending ? 0.7 : 1,
                    }}
                  >
                    <CheckCircle size={13} />
                    {completeCycle.isPending ? 'Completing...' : 'Complete'}
                  </button>
                </>
              )}
            </div>
          }
        />
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          flex: 1,
          maxWidth: 320,
          height: 8,
          background: 'var(--ds-background-neutral, #F1F2F4)',
          borderRadius: 4,
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            background: 'var(--ds-background-brand-bold, #0052CC)',
            borderRadius: 4,
          }} />
        </div>
        <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle, #42526E)' }}>
          {pct}% — {executed}/{total} executed
        </span>
        <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-success, #006644)' }}>{passed} passed</span>
        <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-danger, #AE2A19)' }}>{failed} failed</span>
        <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-warning, #974F0C)' }}>{blocked} blocked</span>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--ds-border, #DFE1E6)', marginBottom: 16 }}>
        {(['scope', 'planning'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 16px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--ds-link, #0052CC)' : '2px solid transparent',
              marginBottom: -2,
              cursor: 'pointer',
              fontSize: 'var(--ds-font-size-400)',
              fontWeight: activeTab === tab ? 600 : 400,
              color: activeTab === tab ? 'var(--ds-link, #0052CC)' : 'var(--ds-text-subtle, #42526E)',
            }}
          >
            {tab === 'scope' ? 'Scope' : 'Planning'}
          </button>
        ))}
      </div>

      {activeTab === 'planning' && (
        <PlanningTab
          scopeItems={scopeItems}
          teamMembers={teamMembers as Array<{ id: string; full_name: string; avatar_url: string | null }>}
          cycleId={cycleId ?? ''}
          isLoading={scopeLoading}
        />
      )}

      {activeTab === 'scope' && (<>

      {/* Scope section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ fontSize: 'var(--ds-font-size-500)', fontWeight: 600, color: 'var(--ds-text, #172B4D)', margin: 0 }}>
          {statusFilter === 'ALL'
            ? `Scope (${scopeItems.length} ${scopeItems.length === 1 ? 'case' : 'cases'})`
            : `Scope (${filteredItems.length} of ${scopeItems.length})`}
        </h2>
        <button
          onClick={() => setShowAddCases(true)}
          style={{
            padding: '6px 12px',
            background: 'none',
            border: '1px solid var(--ds-border, #DFE1E6)',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 'var(--ds-font-size-300)',
            color: 'var(--ds-text, #172B4D)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Plus size={13} />
          Add cases
        </button>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div style={{
          background: 'var(--ds-background-selected, #E9F2FF)',
          border: '1px solid var(--ds-border-selected, #4C9AFF)',
          borderRadius: 6, padding: '8px 16px', marginBottom: 8,
          display: 'flex', alignItems: 'center', gap: 12, fontSize: 'var(--ds-font-size-300)',
          color: 'var(--ds-text, #172B4D)',
        }}>
          <span style={{ fontWeight: 500 }}>{selectedIds.size} case{selectedIds.size > 1 ? 's' : ''} selected</span>
          <button
            onClick={() => {
              removeCases.mutate({ cycle_id: cycleId!, scope_ids: Array.from(selectedIds) });
              setSelectedIds(new Set());
            }}
            style={{ background: 'none', border: '1px solid var(--ds-border, #DFE1E6)', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text, #172B4D)' }}
          >
            Remove from scope
          </button>
          <DropdownMenu trigger="Change status ▾" triggerType="button">
            <DropdownItemGroup>
              {(['PASSED', 'FAILED', 'BLOCKED', 'SKIPPED'] as RunStatus[]).map(s => (
                <DropdownItem key={s} onClick={() => handleBulkStatusChange(s)}>
                  {s.charAt(0) + s.slice(1).toLowerCase().replace('_', ' ')}
                </DropdownItem>
              ))}
            </DropdownItemGroup>
          </DropdownMenu>
          <DropdownMenu trigger="Move to cycle ▾" triggerType="button" isDisabled={otherCycles.length === 0}>
            <DropdownItemGroup>
              {(otherCycles as Array<{ id: string; name: string; status: string }>).map(c => (
                <DropdownItem key={c.id} onClick={() => handleMoveRuns(c)}>
                  {c.name}
                  <span style={{ marginLeft: 8, fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)' }}>{c.status}</span>
                </DropdownItem>
              ))}
            </DropdownItemGroup>
          </DropdownMenu>
          <button
            onClick={() => setSelectedIds(new Set())}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtle, #42526E)', marginLeft: 'auto' }}
          >
            ✕ Clear
          </button>
        </div>
      )}

      {/* Status filter pills */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {STATUS_PILLS.map(pill => (
          <button
            key={pill.value}
            onClick={() => setStatusFilter(pill.value)}
            style={{
              padding: '5px 12px',
              borderRadius: 16,
              cursor: 'pointer',
              fontSize: 'var(--ds-font-size-300)',
              fontWeight: 500,
              border: statusFilter === pill.value ? 'none' : '1px solid var(--ds-border, #DFE1E6)',
              background: statusFilter === pill.value ? 'var(--ds-background-brand-bold, #0052CC)' : 'none',
              color: statusFilter === pill.value ? 'var(--ds-text-inverse, #FFFFFF)' : 'var(--ds-text-subtle, #42526E)',
            }}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {scopeLoading ? (
        <Spinner size="medium" />
      ) : scopeItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 'var(--ds-font-size-400)' }}>
          No cases in scope yet. Add cases to start executing.
        </div>
      ) : filteredItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 'var(--ds-font-size-400)' }}>
          No cases match the selected status filter.
        </div>
      ) : (
        <div style={{ border: '1px solid var(--ds-border, #DFE1E6)', borderRadius: 8, overflow: 'hidden', background: 'var(--ds-surface, #FFFFFF)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--ds-font-size-400)' }}>
            <thead>
              <tr style={{ background: 'var(--ds-surface-sunken, #F7F8F9)', borderBottom: '1px solid var(--ds-border, #DFE1E6)' }}>
                <th style={{ ...thStyle, width: 36 }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                    title={allSelected ? 'Deselect all' : 'Select all'}
                  />
                </th>
                <th style={thStyle}>Key</th>
                <th style={thStyle}>Title</th>
                <th style={thStyle}>Status</th>
                <th style={{ ...thStyle, minWidth: 130 }}>Assignee</th>
                <th style={{ ...thStyle, minWidth: 120 }}>Due Date</th>
                <th style={{ ...thStyle, width: 96 }}>Actions</th>
                <th style={{ ...thStyle, width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => (
                <ScopeRow
                  key={item.id}
                  item={item}
                  cycleId={cycleId ?? ''}
                  onRemove={() => removeCases.mutate({ cycle_id: cycleId!, scope_ids: [item.id] })}
                  selected={selectedIds.has(item.id)}
                  onToggle={() => toggleOne(item.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddCases && cycleId && projectId && (
        <AddCasesModal
          cycleId={cycleId}
          projectId={projectId}
          existingCaseIds={scopeItems.map(s => s.case_id)}
          onClose={() => setShowAddCases(false)}
        />
      )}
      </>)}
    </div>
  );
}

type ScopePanel = 'defect' | 'comments' | 'evidence' | null;

function ScopeRow({ item, cycleId, onRemove, selected, onToggle }: {
  item: TMCycleScope;
  cycleId: string;
  onRemove: () => void;
  selected?: boolean;
  onToggle?: () => void;
}) {
  const [panel, setPanel] = useState<ScopePanel>(null);
  const toggle = (p: ScopePanel) => setPanel(prev => prev === p ? null : p);

  const iconBtn = (label: string, emoji: string, p: ScopePanel) => (
    <button
      onClick={() => toggle(p)}
      title={label}
      style={{
        background: panel === p ? 'var(--ds-background-selected, #E9F2FF)' : 'none',
        border: '1px solid var(--ds-border, #DFE1E6)',
        borderRadius: 4, cursor: 'pointer', padding: '2px 6px',
        fontSize: 'var(--ds-font-size-400)', lineHeight: 1, color: panel === p ? 'var(--ds-text-brand, #0052CC)' : 'var(--ds-text-subtle, #42526E)',
      }}
    >
      {emoji}
    </button>
  );

  return (
    <>
      <tr style={{ borderBottom: '1px solid var(--ds-border, #DFE1E6)', background: selected ? 'var(--ds-background-selected, #E9F2FF)' : undefined }}>
        <td style={{ ...tdStyle, width: 36 }}>
          <input
            type="checkbox"
            checked={!!selected}
            onChange={onToggle}
            style={{ width: 16, height: 16, cursor: 'pointer' }}
          />
        </td>
        <td style={{ ...tdStyle, fontFamily: 'var(--ds-font-family-code)', color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 'var(--ds-font-size-200)' }}>
          {item.test_case?.key ?? '—'}
        </td>
        <td style={{ ...tdStyle, color: 'var(--ds-text, #172B4D)' }}>
          {item.test_case?.title ?? '—'}
        </td>
        <td style={tdStyle}>
          <RunStatusPill status={item.status} />
        </td>
        <td style={tdStyle}>
          <AssigneeCell scopeId={item.id} cycleId={cycleId} assignee={item.assignee ?? null} />
        </td>
        <td style={tdStyle}>
          <DueDateCell scopeId={item.id} cycleId={cycleId} dueDate={item.due_date} />
        </td>
        <td style={tdStyle}>
          <div style={{ display: 'flex', gap: 4 }}>
            {iconBtn('Log defect', '🐛', 'defect')}
            {iconBtn('Comments', '📝', 'comments')}
            {iconBtn('Evidence', '📎', 'evidence')}
          </div>
        </td>
        <td style={tdStyle}>
          <button
            onClick={onRemove}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ds-text-subtlest, #6B778C)', padding: 4 }}
            title="Remove from scope"
          >
            <Trash2 size={13} />
          </button>
        </td>
      </tr>
      {panel === 'defect' && <DefectPanel item={item} onClose={() => setPanel(null)} />}
      {panel === 'comments' && <CommentsPanel item={item} onClose={() => setPanel(null)} />}
      {panel === 'evidence' && <EvidencePanel item={item} onClose={() => setPanel(null)} />}
    </>
  );
}

// ── AssigneeCell ────────────────────────────────────────────────────────────
function AssigneeCell({ scopeId, cycleId, assignee }: {
  scopeId: string;
  cycleId: string;
  assignee: { id: string; full_name: string; avatar_url?: string } | null;
}) {
  const [users, setUsers] = useState<{ id: string; full_name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    supabase.from('profiles').select('id, full_name').order('full_name').limit(50)
      .then(({ data }) => setUsers(data ?? []));
  }, []);

  const assign = useCallback(async (userId: string | null) => {
    setSaving(true);
    const { error } = await supabase
      .from('tm_cycle_scope')
      .update({ assigned_to: userId })
      .eq('id', scopeId);
    setSaving(false);
    if (error) { catalystToast.error('Failed to assign'); return; }
    qc.invalidateQueries({ queryKey: ['tm-cycle-scope', cycleId] });
  }, [scopeId, cycleId, qc]);

  return (
    <Select
      menuPosition="fixed"
      placeholder="Unassigned"
      value={assignee ? { label: assignee.full_name, value: assignee.id } : null}
      options={[
        { label: 'Unassigned', value: null as any },
        ...users.map(u => ({ label: u.full_name, value: u.id }))
      ]}
      onChange={(opt) => assign(opt?.value ?? null)}
      isDisabled={saving}
      isClearable
      styles={{ container: (b: any) => ({ ...b, minWidth: 140 }) }}
    />
  );
}

// ── DueDateCell ──────────────────────────────────────────────────────────────
function DueDateCell({ scopeId, cycleId, dueDate }: {
  scopeId: string;
  cycleId: string;
  dueDate: string | null;
}) {
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  const inputVal = dueDate ? dueDate.slice(0, 10) : '';

  const save = useCallback(async (value: string) => {
    setSaving(true);
    const iso = value ? new Date(value).toISOString() : null;
    const { error } = await supabase
      .from('tm_cycle_scope')
      .update({ due_date: iso })
      .eq('id', scopeId);
    setSaving(false);
    if (error) { catalystToast.error('Failed to set due date'); return; }
    qc.invalidateQueries({ queryKey: ['tm-cycle-scope', cycleId] });
  }, [scopeId, cycleId, qc]);

  return (
    <DatePicker
      value={inputVal}
      onChange={(val) => save(val)}
      isDisabled={saving}
      placeholder="Set date"
    />
  );
}

// ── Shared panel shell ──────────────────────────────────────────────────────
function RightPanel({ title, subtitle, onClose, children }: {
  title: string; subtitle: string; onClose: () => void; children: React.ReactNode;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    document.addEventListener('keydown', h, true);
    return () => document.removeEventListener('keydown', h, true);
  }, [onClose]);

  return createPortal(
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 8000, background: 'var(--ds-shadow-raised, rgba(9,30,66,0.25))' }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, width: 480, height: '100vh', zIndex: 8001,
        background: 'var(--ds-surface-overlay, #FFFFFF)',
        boxShadow: '-4px 0 24px var(--ds-shadow-raised, rgba(9,30,66,0.2))',
        display: 'flex', flexDirection: 'column',
        fontFamily: 'var(--ds-font-family-body)',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--ds-border, #DFE1E6)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 'var(--ds-font-size-500)', color: 'var(--ds-text, #172B4D)' }}>{title}</div>
            <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest, #6B778C)', marginTop: 2 }}>{subtitle}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--ds-font-size-600)', color: 'var(--ds-text-subtle, #42526E)', padding: '0 4px' }}>✕</button>
        </div>
        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {children}
        </div>
      </div>
    </>,
    document.body
  );
}

const NO_RUN_MSG = (
  <p style={{ color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 'var(--ds-font-size-400)', margin: 0 }}>
    No execution run yet. Execute this case first.
  </p>
);

// ── Defect panel ────────────────────────────────────────────────────────────
function DefectPanel({ item, onClose }: { item: TMCycleScope; onClose: () => void }) {
  const qc = useQueryClient();
  const runId = item.last_run_id;

  const { data: defects = [], isLoading } = useQuery({
    queryKey: ['scope-defects', runId],
    enabled: !!runId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tm_defects')
        .select('id, defect_key, title, severity, status, created_at')
        .eq('source_test_run_id', runId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState<'critical' | 'major' | 'minor' | 'trivial'>('major');
  const [saving, setSaving] = useState(false);

  const handleFile = async () => {
    if (!title.trim() || !runId) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('tm_defects').insert({
        title: title.trim(),
        severity,
        status: 'open',
        reporter_id: user.id,
        source_test_run_id: runId,
        source_test_case_id: item.case_id,
        project_id: item.id, // scope as project proxy
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['scope-defects', runId] });
      setTitle('');
      catalystToast.success('Defect filed');
    } catch (e: unknown) {
      catalystToast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const SEVERITY_COLORS: Record<string, string> = {
    critical: 'var(--ds-text-danger, #AE2A19)',
    major: 'var(--ds-text-warning, #974F0C)',
    minor: 'var(--ds-text-subtle, #42526E)',
    trivial: 'var(--ds-text-subtlest, #6B778C)',
  };

  return (
    <RightPanel title="Defects" subtitle={item.test_case?.title ?? item.case_id} onClose={onClose}>
      {!runId ? NO_RUN_MSG : (
        <>
          {/* Existing defects */}
          {isLoading ? <Spinner size="small" /> : defects.length === 0 ? (
            <p style={{ color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 'var(--ds-font-size-300)' }}>No defects logged.</p>
          ) : (
            <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {defects.map((d: { id: string; defect_key: string; title: string; severity: string; status: string }) => (
                <div key={d.id} style={{
                  padding: '10px 12px', borderRadius: 6,
                  border: '1px solid var(--ds-border, #DFE1E6)',
                  background: 'var(--ds-surface-sunken, #F7F8F9)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 'var(--ds-font-size-100)', fontFamily: 'var(--ds-font-family-code)', color: 'var(--ds-text-subtlest, #6B778C)' }}>{d.defect_key}</span>
                    <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: SEVERITY_COLORS[d.severity] ?? 'inherit' }}>{d.severity}</span>
                  </div>
                  <div style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text, #172B4D)', fontWeight: 500 }}>{d.title}</div>
                  <div style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest, #6B778C)', marginTop: 2 }}>{d.status}</div>
                </div>
              ))}
            </div>
          )}

          {/* New defect form */}
          <div style={{ borderTop: '1px solid var(--ds-border, #DFE1E6)', paddingTop: 16 }}>
            <div style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: 'var(--ds-text, #172B4D)', marginBottom: 10 }}>Log new defect</div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Title</label>
              <Textfield value={title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)} placeholder="Describe the defect…" />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Severity</label>
              <Select
                value={{ label: severity.charAt(0).toUpperCase() + severity.slice(1), value: severity }}
                options={[
                  { label: 'Critical', value: 'critical' },
                  { label: 'Major', value: 'major' },
                  { label: 'Minor', value: 'minor' },
                  { label: 'Trivial', value: 'trivial' },
                ]}
                onChange={(opt) => opt && setSeverity(opt.value as typeof severity)}
              />
            </div>
            <button
              onClick={handleFile}
              disabled={!title.trim() || saving}
              style={{
                padding: '8px 16px', borderRadius: 4, border: 'none',
                background: 'var(--ds-background-brand-bold, #0052CC)', color: 'var(--ds-surface, #FFFFFF)',
                cursor: (!title.trim() || saving) ? 'not-allowed' : 'pointer',
                fontSize: 'var(--ds-font-size-300)', fontWeight: 500, opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Saving…' : 'File defect'}
            </button>
          </div>
        </>
      )}
    </RightPanel>
  );
}

// ── Comments panel ──────────────────────────────────────────────────────────
function CommentsPanel({ item, onClose }: { item: TMCycleScope; onClose: () => void }) {
  const qc = useQueryClient();
  const runId = item.last_run_id;

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['scope-comments', runId],
    enabled: !!runId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tm_comments')
        .select('id, content, created_at, author:profiles!tm_comments_author_id_fkey(full_name)')
        .eq('entity_type', 'run')
        .eq('entity_id', runId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);

  const handlePost = async () => {
    if (!text.trim() || !runId) return;
    setPosting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('tm_comments').insert({
        entity_type: 'run',
        entity_id: runId,
        content: text.trim(),
        author_id: user.id,
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['scope-comments', runId] });
      setText('');
    } catch (e: unknown) {
      catalystToast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setPosting(false);
    }
  };

  return (
    <RightPanel title="Comments" subtitle={item.test_case?.title ?? item.case_id} onClose={onClose}>
      {!runId ? NO_RUN_MSG : (
        <>
          {isLoading ? <Spinner size="small" /> : comments.length === 0 ? (
            <p style={{ color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 'var(--ds-font-size-300)' }}>No comments yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              {comments.map((c: { id: string; content: string; created_at: string; author: { full_name: string } | null }) => (
                <div key={c.id} style={{ borderBottom: '1px solid var(--ds-border-subtle, #EBECF0)', paddingBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text, #172B4D)' }}>
                      {c.author?.full_name ?? 'Unknown'}
                    </span>
                    <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest, #6B778C)' }}>
                      {new Date(c.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text, #172B4D)', lineHeight: 1.5 }}>{c.content}</p>
                </div>
              ))}
            </div>
          )}
          <div style={{ borderTop: '1px solid var(--ds-border, #DFE1E6)', paddingTop: 16 }}>
            <Textarea
              value={text}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
              placeholder="Add a comment…"
              minimumRows={3}
            />
            <button
              onClick={handlePost}
              disabled={!text.trim() || posting}
              style={{
                marginTop: 8, padding: '7px 14px', borderRadius: 4, border: 'none',
                background: 'var(--ds-background-brand-bold, #0052CC)', color: 'var(--ds-surface, #FFFFFF)',
                cursor: (!text.trim() || posting) ? 'not-allowed' : 'pointer',
                fontSize: 'var(--ds-font-size-300)', fontWeight: 500, opacity: posting ? 0.7 : 1,
              }}
            >
              {posting ? 'Posting…' : 'Post comment'}
            </button>
          </div>
        </>
      )}
    </RightPanel>
  );
}

// ── Evidence panel ──────────────────────────────────────────────────────────
function EvidencePanel({ item, onClose }: { item: TMCycleScope; onClose: () => void }) {
  const qc = useQueryClient();
  const runId = item.last_run_id;

  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ['scope-evidence', runId],
    enabled: !!runId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tm_attachments')
        .select('id, file_name, file_path, file_size, mime_type, created_at')
        .eq('entity_type', 'run')
        .eq('entity_id', runId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !runId) return;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const path = `run/${runId}/${Date.now()}_${file.name}`;
      const { error: storageErr } = await supabase.storage.from('tm-attachments').upload(path, file);
      if (storageErr) throw storageErr;
      const { error: dbErr } = await supabase.from('tm_attachments').insert({
        entity_type: 'run',
        entity_id: runId,
        file_name: file.name,
        file_path: path,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: user.id,
      });
      if (dbErr) throw dbErr;
      qc.invalidateQueries({ queryKey: ['scope-evidence', runId] });
      catalystToast.success('Uploaded');
    } catch (err: unknown) {
      catalystToast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const fmtSize = (bytes: number) =>
    bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;

  return (
    <RightPanel title="Evidence" subtitle={item.test_case?.title ?? item.case_id} onClose={onClose}>
      {!runId ? NO_RUN_MSG : (
        <>
          {/* Upload button */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 'var(--ds-font-size-300)',
              border: '1px solid var(--ds-border, #DFE1E6)', color: 'var(--ds-text, #172B4D)',
              background: uploading ? 'var(--ds-background-neutral, #F1F2F4)' : 'var(--ds-surface, #FFFFFF)',
            }}>
              {uploading ? <Spinner size="small" /> : '📎'}
              {uploading ? 'Uploading…' : 'Attach file'}
              <input type="file" style={{ display: 'none' }} disabled={uploading} onChange={handleUpload} />
            </label>
          </div>

          {isLoading ? <Spinner size="small" /> : attachments.length === 0 ? (
            <p style={{ color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 'var(--ds-font-size-300)' }}>No evidence attached.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {attachments.map((a: { id: string; file_name: string; file_path: string; file_size: number; mime_type: string; created_at: string }) => (
                <div key={a.id} style={{
                  padding: '10px 12px', borderRadius: 6,
                  border: '1px solid var(--ds-border, #DFE1E6)',
                  background: 'var(--ds-surface-sunken, #F7F8F9)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 500, color: 'var(--ds-text, #172B4D)' }}>{a.file_name}</div>
                    <div style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest, #6B778C)', marginTop: 2 }}>
                      {fmtSize(a.file_size)} · {a.mime_type}
                    </div>
                  </div>
                  <a
                    href={supabase.storage.from('tm-attachments').getPublicUrl(a.file_path).data.publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-link, #0052CC)', textDecoration: 'none' }}
                  >
                    Download
                  </a>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </RightPanel>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 'var(--ds-font-size-100)', fontWeight: 600,
  color: 'var(--ds-text-subtle, #42526E)', marginBottom: 4,
};

function AddCasesModal({
  cycleId,
  projectId,
  existingCaseIds,
  onClose,
}: {
  cycleId: string;
  projectId: string;
  existingCaseIds: string[];
  onClose: () => void;
}) {
  const { data: casesResult } = useTestCases(projectId, { per_page: 100 });
  const allCases = casesResult?.cases ?? [];
  const available = allCases.filter(c => !existingCaseIds.includes(c.id));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // locked version per case: null = latest (default)
  const [lockedVersions, setLockedVersions] = useState<Record<string, number | null>>({});
  const addCases = useAddCasesToScope();

  // Batch-load version numbers for all available cases (just id + version_number — no snapshot)
  const availableIds = available.map(c => c.id);
  const { data: versionRows = [] } = useQuery({
    queryKey: ['case-version-numbers', availableIds.join(',')],
    queryFn: async () => {
      if (availableIds.length === 0) return [];
      const { data } = await supabase
        .from('tm_test_case_versions')
        .select('test_case_id, version_number')
        .in('test_case_id', availableIds)
        .order('version_number', { ascending: false });
      return data ?? [];
    },
    enabled: availableIds.length > 0,
  });

  // Map: caseId → sorted-desc version numbers
  const versionsByCase = React.useMemo(() => {
    const m: Record<string, number[]> = {};
    for (const r of versionRows as Array<{ test_case_id: string; version_number: number }>) {
      if (!m[r.test_case_id]) m[r.test_case_id] = [];
      m[r.test_case_id].push(r.version_number);
    }
    return m;
  }, [versionRows]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = async () => {
    if (selected.size === 0) return;
    const caseIds = Array.from(selected);
    // Build lockedVersions map (only for cases where user picked a specific version)
    const locked: Record<string, number> = {};
    for (const id of caseIds) {
      const v = lockedVersions[id];
      if (v != null) locked[id] = v;
    }
    await addCases.mutateAsync({
      cycle_id: cycleId,
      case_ids: caseIds,
      lockedVersions: Object.keys(locked).length > 0 ? locked : undefined,
    });
    onClose();
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'var(--ds-shadow-raised)', zIndex: 300 }}
      />
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 620,
        maxHeight: '80vh',
        background: 'var(--ds-surface-overlay)',
        borderRadius: 8,
        boxShadow: 'var(--ds-shadow-overlay)',
        zIndex: 301,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--ds-font-family-body)',
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--ds-border)' }}>
          <h2 style={{ margin: 0, fontSize: 'var(--ds-font-size-600)', fontWeight: 600, color: 'var(--ds-text)' }}>
            Add cases to scope
          </h2>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {available.length === 0 ? (
            <p style={{ color: 'var(--ds-text-subtlest)', fontSize: 'var(--ds-font-size-400)' }}>
              No cases available to add
            </p>
          ) : (
            available.map(c => {
              const versions = versionsByCase[c.id] ?? [];
              const latestVer = versions[0];
              const versionOptions = [
                { label: latestVer ? `Latest (v${latestVer})` : 'Latest', value: null as number | null },
                ...versions.map(v => ({ label: `v${v}`, value: v })),
              ];
              const isSelected = selected.has(c.id);
              return (
                <div
                  key={c.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 0',
                    borderBottom: '1px solid var(--ds-border)',
                  }}
                >
                  <input type="checkbox" checked={isSelected} onChange={() => toggle(c.id)} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest)', fontFamily: 'var(--ds-font-family-code)', flexShrink: 0 }}>
                    {c.key}
                  </span>
                  <span style={{ fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.title}
                  </span>
                  {isSelected && versions.length > 1 && (
                    <div style={{ minWidth: 130, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                      <Select
                        menuPosition="fixed"
                        value={versionOptions.find(o => o.value === (lockedVersions[c.id] ?? null)) ?? versionOptions[0]}
                        options={versionOptions}
                        onChange={opt => setLockedVersions(prev => ({ ...prev, [c.id]: opt?.value ?? null }))}
                        menuPortalTarget={document.body}
                      />
                    </div>
                  )}
                  {isSelected && versions.length <= 1 && latestVer && (
                    <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)', flexShrink: 0 }}>v{latestVer}</span>
                  )}
                </div>
              );
            })
          )}
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--ds-border)', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px', background: 'none',
              border: '1px solid var(--ds-border)', borderRadius: 4,
              cursor: 'pointer', fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={selected.size === 0 || addCases.isPending}
            style={{
              padding: '8px 20px',
              background: 'var(--ds-background-brand-bold)',
              color: 'var(--ds-text-inverse)',
              border: 'none', borderRadius: 4,
              cursor: selected.size === 0 || addCases.isPending ? 'not-allowed' : 'pointer',
              fontSize: 'var(--ds-font-size-400)', fontWeight: 500,
              opacity: selected.size === 0 ? 0.7 : 1,
            }}
          >
            {addCases.isPending
              ? 'Adding...'
              : selected.size > 0
                ? `Add ${selected.size} case${selected.size > 1 ? 's' : ''}`
                : 'Add cases'}
          </button>
        </div>
      </div>
    </>
  );
}

function RunStatusPill({ status }: { status: RunStatus }) {
  const map: Record<RunStatus, { appearance: 'success' | 'moved' | 'removed' | 'inprogress' | 'default'; label: string }> = {
    PASSED:      { appearance: 'success',    label: 'Passed' },
    FAILED:      { appearance: 'removed',    label: 'Failed' },
    BLOCKED:     { appearance: 'moved',      label: 'Blocked' },
    IN_PROGRESS: { appearance: 'inprogress', label: 'In progress' },
    NOT_RUN:     { appearance: 'default',    label: 'Not run' },
    SKIPPED:     { appearance: 'default',    label: 'Skipped' },
  };
  const { appearance, label } = map[status] ?? { appearance: 'default' as const, label: status };
  return <Lozenge appearance={appearance}>{label}</Lozenge>;
}

const thStyle: React.CSSProperties = {
  padding: '8px 12px',
  textAlign: 'left',
  fontSize: 'var(--ds-font-size-200)',
  fontWeight: 600,
  color: 'var(--ds-text-subtle, #42526E)',
};

const tdStyle: React.CSSProperties = { padding: '10px 12px' };
