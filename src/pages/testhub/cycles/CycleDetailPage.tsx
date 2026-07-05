import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { useTestCycleByKey } from '@/hooks/useTestCycleByKey';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import Select from '@atlaskit/select';
import { portalSelectStyles } from '@/lib/select-portal-styles';
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
import { useCreateDefect } from '@/hooks/test-management/useDefects';
import { useTestHubProject } from '@/hooks/test-management/useTestHubProject';
import Spinner from '@atlaskit/spinner';
import Lozenge from '@atlaskit/lozenge';
import Textarea from '@atlaskit/textarea';
import Textfield from '@atlaskit/textfield';
import Tooltip from '@atlaskit/tooltip';
import Button from '@atlaskit/button/standard-button';
import { IconButton } from '@atlaskit/button/new';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import Tabs, { Tab, TabList } from '@atlaskit/tabs';
import BugIcon from '@atlaskit/icon/core/bug';
import CommentIcon from '@atlaskit/icon/core/comment';
import AttachmentIcon from '@atlaskit/icon/core/attachment';
import CloseIcon from '@atlaskit/icon/core/close';
import DeleteIcon from '@atlaskit/icon/core/delete';
import { Play, CheckCircle, Plus } from '@/lib/atlaskit-icons';
import { TMCycleScope, RunStatus } from '@/types/test-management';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable/types';

const TAB_ORDER = ['scope', 'planning'] as const;

export default function CycleDetailPage() {
  const { cycleKey, id: legacyId, projectKey = 'BAU' } = useParams<{ cycleKey?: string; id?: string; projectKey?: string }>();
  const cycleParam = cycleKey ?? legacyId;
  const { data: cycleRecord } = useTestCycleByKey(cycleParam, projectKey);
  // Resolve to UUID for all downstream hooks that query by id
  const cycleId = cycleRecord?.id ?? (cycleParam && /^[0-9a-f-]{36}$/.test(cycleParam) ? cycleParam : undefined);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { projectId } = useTestHubProject();

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

  // JiraTable columns for scope view
  const scopeTableColumns: Column<TMCycleScope>[] = [
    {
      id: 'key',
      label: 'Key',
      width: 10,
      cell: ({ row }) => (
        <div style={{ fontFamily: 'var(--ds-font-family-code)', color: 'var(--ds-text-subtlest)', fontSize: 'var(--ds-font-size-200)' }}>
          {row.test_case?.key ?? '—'}
        </div>
      ),
    },
    {
      id: 'title',
      label: 'Title',
      flex: true,
      cell: ({ row }) => (
        <div style={{ color: 'var(--ds-text)' }}>
          {row.test_case?.title ?? '—'}
        </div>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      width: 12,
      cell: ({ row }) => <RunStatusPill status={row.status} />,
    },
    {
      id: 'assignee',
      label: 'Assignee',
      width: 15,
      cell: ({ row }) => <AssigneeCell scopeId={row.id} cycleId={cycleId ?? ''} assignee={row.assignee ?? null} />,
    },
    {
      id: 'dueDate',
      label: 'Due Date',
      width: 14,
      cell: ({ row }) => <DueDateCell scopeId={row.id} cycleId={cycleId ?? ''} dueDate={row.due_date} />,
    },
    {
      id: 'actions',
      label: 'Actions',
      width: 11,
      cell: ({ row }) => (
        <div style={{ display: 'flex', gap: 4 }}>
          <PanelButton row={row} cycleId={cycleId ?? ''} panelType="defect" />
          <PanelButton row={row} cycleId={cycleId ?? ''} panelType="comments" />
          <PanelButton row={row} cycleId={cycleId ?? ''} panelType="evidence" />
        </div>
      ),
    },
    {
      id: 'remove',
      label: '',
      width: 6,
      cell: ({ row }) => (
        <Tooltip content="Remove from scope">
          <IconButton
            icon={DeleteIcon}
            label="Remove from scope"
            appearance="subtle"
            spacing="compact"
            onClick={() => removeCases.mutate({ cycle_id: cycleId!, scope_ids: [row.id] })}
          />
        </Tooltip>
      ),
    },
  ];

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
    return <div style={{ padding: 32, color: 'var(--ds-text-danger)' }}>Cycle not found</div>;
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
    // D025: was maxWidth 1200 which clipped the scope table's Due Date / Actions
    // columns on wider viewports. Fluid width now; the table manages its own layout.
    <div style={{ padding: 'var(--ds-space-300)', width: '100%', boxSizing: 'border-box', fontFamily: 'var(--ds-font-family-body)' }}>
      <div style={{ marginBottom: 'var(--ds-space-300)' }}>
        <ProjectPageHeader
          hubType="test"
          trail={[{ text: 'Cycles', href: `/testhub/${projectKey}/cycles` }]}
          title={cycle.name}
          actions={
            <div style={{ display: 'flex', gap: 'var(--ds-space-100)', alignItems: 'center' }}>
              <Button
                appearance="default"
                onClick={() => navigate(`/testhub/${projectKey}/cycles/${cycle.key ?? cycle.id}/runs`)}
              >
                Run results
              </Button>
              <Button
                appearance="default"
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
              >
                Export CSV
              </Button>
              {cycle.status === 'PLANNED' && (
                <Button
                  appearance="primary"
                  iconBefore={<Play size={13} />}
                  isDisabled={startCycle.isPending}
                  onClick={() => startCycle.mutate({ id: cycle.id, project_id: cycle.project_id })}
                >
                  {startCycle.isPending ? 'Starting...' : 'Start cycle'}
                </Button>
              )}
              {cycle.status === 'IN_PROGRESS' && (
                <>
                  <Button
                    appearance="primary"
                    iconBefore={<Play size={13} />}
                    onClick={() => navigate(`/testhub/${projectKey}/cycles/${cycle.id}/execute`)}
                  >
                    Execute
                  </Button>
                  <Button
                    appearance="default"
                    iconBefore={<CheckCircle size={13} />}
                    isDisabled={completeCycle.isPending}
                    onClick={() => completeCycle.mutate({ id: cycle.id, project_id: cycle.project_id })}
                  >
                    {completeCycle.isPending ? 'Completing...' : 'Complete'}
                  </Button>
                </>
              )}
            </div>
          }
        />
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 'var(--ds-space-300)', display: 'flex', alignItems: 'center', gap: 'var(--ds-space-150)' }}>
        <div style={{
          flex: 1,
          maxWidth: 320,
          height: 8,
          background: 'var(--ds-background-neutral)',
          borderRadius: 4,
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            background: 'var(--ds-background-brand-bold)',
            borderRadius: 4,
          }} />
        </div>
        <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)' }}>
          {pct}% — {executed}/{total} executed
        </span>
        <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-success)' }}>{passed} passed</span>
        <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-danger)' }}>{failed} failed</span>
        <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-warning)' }}>{blocked} blocked</span>
      </div>

      {/* Tab bar */}
      <div style={{ marginBottom: 'var(--ds-space-200)' }}>
        <Tabs
          id="cycle-detail-tabs"
          selected={TAB_ORDER.indexOf(activeTab)}
          onChange={(index) => setActiveTab(TAB_ORDER[index])}
        >
          <TabList>
            <Tab>Scope</Tab>
            <Tab>Planning</Tab>
          </TabList>
        </Tabs>
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--ds-space-150)' }}>
        <h2 style={{ fontSize: 'var(--ds-font-size-500)', fontWeight: 600, color: 'var(--ds-text)', margin: 0 }}>
          {statusFilter === 'ALL'
            ? `Scope (${scopeItems.length} ${scopeItems.length === 1 ? 'case' : 'cases'})`
            : `Scope (${filteredItems.length} of ${scopeItems.length})`}
        </h2>
        <Button
          appearance="default"
          iconBefore={<Plus size={13} />}
          onClick={() => setShowAddCases(true)}
        >
          Add cases
        </Button>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div style={{
          background: 'var(--ds-background-selected)',
          border: '1px solid var(--ds-border-selected)',
          borderRadius: 6, padding: 'var(--ds-space-100) var(--ds-space-200)', marginBottom: 'var(--ds-space-100)',
          display: 'flex', alignItems: 'center', gap: 'var(--ds-space-150)', fontSize: 'var(--ds-font-size-300)',
          color: 'var(--ds-text)',
        }}>
          <span style={{ fontWeight: 500 }}>{selectedIds.size} case{selectedIds.size > 1 ? 's' : ''} selected</span>
          <Button
            appearance="default"
            spacing="compact"
            onClick={() => {
              removeCases.mutate({ cycle_id: cycleId!, scope_ids: Array.from(selectedIds) });
              setSelectedIds(new Set());
            }}
          >
            Remove from scope
          </Button>
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
          <div style={{ marginLeft: 'auto' }}>
            <Button
              appearance="subtle"
              spacing="compact"
              iconBefore={<CloseIcon label="" size="small" />}
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Status filter pills */}
      <div style={{ display: 'flex', gap: 'var(--ds-space-050)', flexWrap: 'wrap', marginBottom: 'var(--ds-space-150)' }}>
        {STATUS_PILLS.map(pill => (
          <Button
            key={pill.value}
            spacing="compact"
            appearance={statusFilter === pill.value ? 'primary' : 'default'}
            isSelected={statusFilter === pill.value}
            onClick={() => setStatusFilter(pill.value)}
          >
            {pill.label}
          </Button>
        ))}
      </div>

      {scopeLoading ? (
        <Spinner size="medium" />
      ) : scopeItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--ds-text-subtlest)', fontSize: 'var(--ds-font-size-400)' }}>
          No cases in scope yet. Add cases to start executing.
        </div>
      ) : filteredItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--ds-text-subtlest)', fontSize: 'var(--ds-font-size-400)' }}>
          No cases match the selected status filter.
        </div>
      ) : (
        <JiraTable
          columns={scopeTableColumns}
          data={filteredItems}
          getRowId={(row) => row.id}
          selectable
          selection={selectedIds}
          onSelectionChange={setSelectedIds}
          onRowClick={(item) => {
            // Placeholder for potential detail view
          }}
        />
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

type ScopePanel = 'defect' | 'comments' | 'evidence';

// D024: replaced raw emoji glyph buttons with @atlaskit IconButton + Tooltip,
// and wired the (previously dead) side panels so each action actually opens.
const PANEL_META: Record<ScopePanel, { label: string; icon: React.ComponentType<{ label: string }> }> = {
  defect:   { label: 'Log defect', icon: BugIcon },
  comments: { label: 'Comments',   icon: CommentIcon },
  evidence: { label: 'Evidence',   icon: AttachmentIcon },
};

function PanelButton({ row, cycleId, panelType }: { row: TMCycleScope; cycleId: string; panelType: ScopePanel }) {
  const [open, setOpen] = useState(false);
  const { label, icon } = PANEL_META[panelType];

  return (
    <>
      <Tooltip content={label}>
        <IconButton
          icon={icon}
          label={label}
          appearance="subtle"
          spacing="compact"
          isSelected={open}
          onClick={() => setOpen(true)}
        />
      </Tooltip>
      {open && panelType === 'defect' && (
        <DefectPanel item={row} cycleId={cycleId} onClose={() => setOpen(false)} />
      )}
      {open && panelType === 'comments' && (
        <CommentsPanel item={row} onClose={() => setOpen(false)} />
      )}
      {open && panelType === 'evidence' && (
        <EvidencePanel item={row} onClose={() => setOpen(false)} />
      )}
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
    // G14 COL-005/COL-019: first real TestHub notification event — the
    // registry event (test_cycle "tester_assigned") was defined but never
    // fired anywhere (confirmed via grep before writing this). Written
    // against the real `notifications` schema (recipient_user_id/
    // notification_type/hub_source/entity_type/entity_id, all uuid/text as
    // confirmed live) — NOT the pattern in workItemRepo.ts's addComment-
    // adjacent notification insert, which uses column names
    // (user_id/type/title/body/is_read) that don't exist on this table.
    if (userId) {
      const { data: { user: actor } } = await supabase.auth.getUser();
      await supabase.from('notifications').insert({
        recipient_user_id: userId,
        actor_user_id: actor?.id ?? null,
        notification_type: 'assigned',
        entity_type: 'test_cycle_scope',
        entity_id: scopeId,
        hub_source: 'TestHub',
        tab: 'direct',
      } as any);
    }
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
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 8000, background: 'var(--ds-blanket)' }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, width: 480, height: '100vh', zIndex: 8001,
        background: 'var(--ds-surface-overlay)',
        boxShadow: 'var(--ds-shadow-overlay)',
        display: 'flex', flexDirection: 'column',
        fontFamily: 'var(--ds-font-family-body)',
      }}>
        {/* Header */}
        <div style={{
          padding: 'var(--ds-space-200)', borderBottom: '1px solid var(--ds-border)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 'var(--ds-font-size-500)', color: 'var(--ds-text)' }}>{title}</div>
            <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest)', marginTop: 0 }}>{subtitle}</div>
          </div>
          <IconButton icon={CloseIcon} label="Close" appearance="subtle" spacing="compact" onClick={onClose} />
        </div>
        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--ds-space-200)' }}>
          {children}
        </div>
      </div>
    </>,
    document.body
  );
}

const NO_RUN_MSG = (
  <p style={{ color: 'var(--ds-text-subtlest)', fontSize: 'var(--ds-font-size-400)', margin: 0 }}>
    No execution run yet. Execute this case first.
  </p>
);

// ── Defect panel ────────────────────────────────────────────────────────────
function DefectPanel({ item, cycleId, onClose }: { item: TMCycleScope; cycleId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const runId = item.last_run_id;

  // Real project for the defect row — the old inline insert wrote the scope-row
  // id into project_id (P0-S7 / DEF-002).
  const { data: cycleProject } = useQuery({
    queryKey: ['cycle-project', cycleId],
    enabled: !!cycleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tm_test_cycles')
        .select('project_id')
        .eq('id', cycleId)
        .single();
      if (error) throw error;
      return data.project_id as string;
    },
  });

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
  const createDefect = useCreateDefect();
  const saving = createDefect.isPending;

  const handleFile = async () => {
    if (!title.trim() || !runId || !cycleProject) return;
    try {
      // Canonical creation path: RPC-generated defect_key, real project_id,
      // auto-links to run/cycle (D-PIN-1).
      await createDefect.mutateAsync({
        project_id: cycleProject,
        title: title.trim(),
        severity,
        source_test_run_id: runId,
        source_test_case_id: item.case_id,
        run_id: runId,
        cycle_id: cycleId,
      } as any);
      qc.invalidateQueries({ queryKey: ['scope-defects', runId] });
      setTitle('');
    } catch {
      // useCreateDefect surfaces its own error toast
    }
  };

  const SEVERITY_COLORS: Record<string, string> = {
    critical: 'var(--ds-text-danger)',
    major: 'var(--ds-text-warning)',
    minor: 'var(--ds-text-subtle)',
    trivial: 'var(--ds-text-subtlest)',
  };

  return (
    <RightPanel title="Defects" subtitle={item.test_case?.title ?? item.case_id} onClose={onClose}>
      {!runId ? NO_RUN_MSG : (
        <>
          {/* Existing defects */}
          {isLoading ? <Spinner size="small" /> : defects.length === 0 ? (
            <p style={{ color: 'var(--ds-text-subtlest)', fontSize: 'var(--ds-font-size-300)' }}>No defects logged.</p>
          ) : (
            <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {defects.map((d: { id: string; defect_key: string; title: string; severity: string; status: string }) => (
                <div key={d.id} style={{
                  padding: '8px 12px', borderRadius: 6,
                  border: '1px solid var(--ds-border)',
                  background: 'var(--ds-surface-sunken)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 'var(--ds-font-size-100)', fontFamily: 'var(--ds-font-family-code)', color: 'var(--ds-text-subtlest)' }}>{d.defect_key}</span>
                    <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: SEVERITY_COLORS[d.severity] ?? 'inherit' }}>{d.severity}</span>
                  </div>
                  <div style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text)', fontWeight: 500 }}>{d.title}</div>
                  <div style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)', marginTop: 0 }}>{d.status}</div>
                </div>
              ))}
            </div>
          )}

          {/* New defect form */}
          <div style={{ borderTop: '1px solid var(--ds-border)', paddingTop: 'var(--ds-space-200)' }}>
            <div style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: 'var(--ds-text)', marginBottom: 'var(--ds-space-100)' }}>Log new defect</div>
            <div style={{ marginBottom: 'var(--ds-space-100)' }}>
              <label style={labelStyle}>Title</label>
              <Textfield value={title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)} placeholder="Describe the defect…" />
            </div>
            <div style={{ marginBottom: 'var(--ds-space-150)' }}>
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
            <Button
              appearance="primary"
              isDisabled={!title.trim() || saving}
              onClick={handleFile}
            >
              {saving ? 'Saving…' : 'File defect'}
            </Button>
          </div>
        </>
      )}
    </RightPanel>
  );
}

// ── Comments panel ──────────────────────────────────────────────────────────
// G14 COL-004: this used to key ONLY on the scope item's last run (entity_type
// 'run'), so planning-phase discussion was impossible until the item had been
// executed at least once (NO_RUN_MSG). Fixed: scope-level thread
// (entity_type='cycle_scope', entity_id=item.id) is always available; the
// run-level thread (entity_type='run') renders as a separate section below it
// once a run exists — both streams shown, neither blocks the other.
function CommentThreadBlock({ entityType, entityId, label }: { entityType: string; entityId: string; label: string }) {
  const qc = useQueryClient();
  const queryKey = ['scope-comments', entityType, entityId];

  const { data: comments = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tm_comments')
        .select('id, content, created_at, author:profiles!tm_comments_author_id_fkey(full_name)')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);

  const handlePost = async () => {
    if (!text.trim()) return;
    setPosting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('tm_comments').insert({
        entity_type: entityType,
        entity_id: entityId,
        content: text.trim(),
        author_id: user.id,
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey });
      setText('');
    } catch (e: unknown) {
      catalystToast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text-subtle)', margin: '0 0 8px' }}>
        {label}
      </p>
      {isLoading ? <Spinner size="small" /> : comments.length === 0 ? (
        <p style={{ color: 'var(--ds-text-subtlest)', fontSize: 'var(--ds-font-size-300)' }}>No comments yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          {comments.map((c: { id: string; content: string; created_at: string; author: { full_name: string } | null }) => (
            <div key={c.id} style={{ borderBottom: '1px solid var(--ds-border-subtle)', paddingBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text)' }}>
                  {c.author?.full_name ?? 'Unknown'}
                </span>
                <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)' }}>
                  {new Date(c.created_at).toLocaleString()}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text)', lineHeight: 1.5 }}>{c.content}</p>
            </div>
          ))}
        </div>
      )}
      <div style={{ borderTop: '1px solid var(--ds-border)', paddingTop: 'var(--ds-space-200)' }}>
        <Textarea
          value={text}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
          placeholder="Add a comment…"
          minimumRows={3}
        />
        <div style={{ marginTop: 'var(--ds-space-100)' }}>
          <Button
            appearance="primary"
            isDisabled={!text.trim() || posting}
            onClick={handlePost}
          >
            {posting ? 'Posting…' : 'Post comment'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CommentsPanel({ item, onClose }: { item: TMCycleScope; onClose: () => void }) {
  const runId = item.last_run_id;
  return (
    <RightPanel title="Comments" subtitle={item.test_case?.title ?? item.case_id} onClose={onClose}>
      <CommentThreadBlock entityType="cycle_scope" entityId={item.id} label="Scope discussion" />
      {runId && <CommentThreadBlock entityType="run" entityId={runId} label="Latest run" />}
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
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '8px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 'var(--ds-font-size-300)',
              border: '1px solid var(--ds-border)', color: 'var(--ds-text)',
              background: uploading ? 'var(--ds-background-neutral)' : 'var(--ds-surface)',
            }}>
              {uploading ? <Spinner size="small" /> : <AttachmentIcon label="" />}
              {uploading ? 'Uploading…' : 'Attach file'}
              <input type="file" style={{ display: 'none' }} disabled={uploading} onChange={handleUpload} />
            </label>
          </div>

          {isLoading ? <Spinner size="small" /> : attachments.length === 0 ? (
            <p style={{ color: 'var(--ds-text-subtlest)', fontSize: 'var(--ds-font-size-300)' }}>No evidence attached.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {attachments.map((a: { id: string; file_name: string; file_path: string; file_size: number; mime_type: string; created_at: string }) => (
                <div key={a.id} style={{
                  padding: '8px 12px', borderRadius: 6,
                  border: '1px solid var(--ds-border)',
                  background: 'var(--ds-surface-sunken)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 500, color: 'var(--ds-text)' }}>{a.file_name}</div>
                    <div style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)', marginTop: 0 }}>
                      {fmtSize(a.file_size)} · {a.mime_type}
                    </div>
                  </div>
                  <a
                    href={supabase.storage.from('tm-attachments').getPublicUrl(a.file_path).data.publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-link)', textDecoration: 'none' }}
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
  color: 'var(--ds-text-subtle)', marginBottom: 4,
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
    <ModalDialog onClose={onClose} width="large">
      <ModalHeader>
        <ModalTitle>Add cases to scope</ModalTitle>
      </ModalHeader>
      <ModalBody>
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
                  gap: 'var(--ds-space-100)',
                  padding: 'var(--ds-space-100) 0',
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
                      styles={portalSelectStyles}
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
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose}>Cancel</Button>
        <Button
          appearance="primary"
          isDisabled={selected.size === 0 || addCases.isPending}
          onClick={handleAdd}
        >
          {addCases.isPending
            ? 'Adding...'
            : selected.size > 0
              ? `Add ${selected.size} case${selected.size > 1 ? 's' : ''}`
              : 'Add cases'}
        </Button>
      </ModalFooter>
    </ModalDialog>
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
  color: 'var(--ds-text-subtle)',
};

const tdStyle: React.CSSProperties = { padding: '8px 12px' };
