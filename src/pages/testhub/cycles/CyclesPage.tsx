import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useProjects } from '@/hooks/test-management/useProjects';
import { useReleases } from '@/hooks/test-management/useReleases';
import { useTestCases } from '@/hooks/test-management/useTestCases';
import {
  useTestCycles, useCreateCycle, useDeleteCycle, useAddCasesToScope,
  useCloneCycle, useArchiveCycle, useBulkArchiveCycles, useBulkDeleteCycles,
} from '@/hooks/test-management/useTestCycles';
import { useNavigate, useParams } from 'react-router-dom';
import Spinner from '@atlaskit/spinner';
import Lozenge from '@atlaskit/lozenge';
import Button from '@atlaskit/button/standard-button';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import { Plus, X, MoreHorizontal, Search } from '@/lib/atlaskit-icons';
import { TMCycle, CycleStatus } from '@/types/test-management';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable/types';
import { supabase } from '@/integrations/supabase/client';

const columns: Column<TMCycle>[] = [
  {
    id: 'key',
    label: 'Key',
    width: 8,
    alwaysVisible: true,
    cell: ({ row }) => (
      <span style={{ fontFamily: 'var(--ds-font-family-code, monospace)', color: 'var(--ds-text-subtlest)', fontSize: 12, whiteSpace: 'nowrap' }}>
        {row.key}
      </span>
    ),
  },
  {
    id: 'name',
    label: 'Name',
    flex: true,
    alwaysVisible: true,
    cell: ({ row }) => (
      <span style={{ fontWeight: 500, color: 'var(--ds-text)' }}>{row.name}</span>
    ),
  },
  {
    id: 'status',
    label: 'Status',
    width: 14,
    cell: ({ row }) => <CycleStatusPill status={row.status} />,
  },
  {
    id: 'progress',
    label: 'Progress',
    width: 16,
    cell: ({ row }) => <CycleProgressBar cycle={row} />,
  },
  {
    id: 'cases',
    label: 'Cases',
    width: 8,
    cell: ({ row }) => (
      <span style={{ color: 'var(--ds-text-subtle)' }}>{row.total_cases ?? 0}</span>
    ),
  },
  {
    id: 'dates',
    label: 'Date range',
    width: 20,
    cell: ({ row }) => (
      <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest)' }}>
        {row.planned_start_date ? new Date(row.planned_start_date).toLocaleDateString() : '—'}
        {row.planned_start_date && row.planned_end_date ? ' – ' : ''}
        {row.planned_end_date ? new Date(row.planned_end_date).toLocaleDateString() : ''}
      </span>
    ),
  },
  {
    id: 'actions',
    label: '',
    width: 6,
    cell: ({ row }) => <CycleActions cycle={row} />,
  },
];

export default function CyclesPage() {
  const { projectKey = 'TESTHUB' } = useParams<{ projectKey: string }>();
  const { data: projects = [] } = useProjects();
  const projectId = projects[0]?.id;
  const { data: cycles = [], isLoading } = useTestCycles(projectId);
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const bulkArchive = useBulkArchiveCycles();
  const bulkDelete = useBulkDeleteCycles();

  return (
    <div style={{ padding: '24px', maxWidth: 1200, fontFamily: 'var(--ds-font-family-body)' }}>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <ProjectPageHeader projectKey={projectKey} hubType="test" />
        <Button appearance="primary" onClick={() => setShowCreate(true)} iconBefore={<Plus size={14} label="" />}>
          Create cycle
        </Button>
      </div>

      {selectedIds.size > 0 && (
        <div style={{ padding: '8px 0 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-text-information)' }}>
            {selectedIds.size} selected
          </span>
          <DropdownMenu
            trigger={({ triggerRef, ...props }) => (
              <button
                ref={triggerRef as React.Ref<HTMLButtonElement>}
                {...props}
                style={{
                  padding: '5px 12px', fontSize: 13, fontWeight: 500, borderRadius: 4,
                  border: '1px solid var(--ds-border)', background: 'var(--ds-surface)',
                  color: 'var(--ds-text)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                Bulk <MoreHorizontal size={13} />
              </button>
            )}
            placement="bottom-start"
          >
            <DropdownItemGroup>
              <DropdownItem
                onClick={() => {
                  if (projectId) bulkArchive.mutate(
                    { ids: Array.from(selectedIds), project_id: projectId },
                    { onSuccess: () => setSelectedIds(new Set()) },
                  );
                }}
              >
                Archive selected
              </DropdownItem>
              <DropdownItem
                onClick={() => {
                  if (projectId) bulkDelete.mutate(
                    { ids: Array.from(selectedIds), project_id: projectId },
                    { onSuccess: () => setSelectedIds(new Set()) },
                  );
                }}
              >
                Delete selected
              </DropdownItem>
            </DropdownItemGroup>
          </DropdownMenu>
          <button
            onClick={() => setSelectedIds(new Set())}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ds-text-subtlest)', fontSize: 13 }}
          >
            Clear
          </button>
        </div>
      )}

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Spinner size="large" />
        </div>
      ) : (
        <JiraTable<TMCycle>
          columns={columns}
          data={cycles}
          getRowId={row => row.id}
          onRowClick={row => navigate(`/testhub/${projectKey}/cycles/${row.id}`)}
          selectable
          selection={selectedIds}
          onSelectionChange={next => setSelectedIds(new Set(next))}
          showRowCount
          totalRowCount={cycles.length}
          emptyMessage="No test cycles yet. Create your first cycle to start executing tests."
        />
      )}

      {showCreate && projectId && (
        <CreateCycleModal projectId={projectId} onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}

// ── Progress bar cell ─────────────────────────────────────────────────────────

function CycleProgressBar({ cycle }: { cycle: TMCycle }) {
  const total = cycle.total_cases ?? 0;
  const executed = (cycle.passed_count ?? 0) + (cycle.failed_count ?? 0) + (cycle.blocked_count ?? 0);
  const pct = total > 0 ? Math.round((executed / total) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 100 }}>
      <div style={{ flex: 1, height: 6, background: 'var(--ds-background-neutral)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--ds-background-brand-bold)', borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 11, color: 'var(--ds-text-subtlest)', whiteSpace: 'nowrap' }}>{pct}%</span>
    </div>
  );
}

// ── Per-row action menu ───────────────────────────────────────────────────────

function CycleActions({ cycle }: { cycle: TMCycle }) {
  const deleteCycle = useDeleteCycle();
  const archiveCycle = useArchiveCycle();
  const cloneCycle = useCloneCycle();
  return (
    <div onClick={e => e.stopPropagation()}>
      <DropdownMenu
        trigger={({ triggerRef, ...props }) => (
          <button
            ref={triggerRef as React.Ref<HTMLButtonElement>}
            {...props}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', color: 'var(--ds-text-subtlest)' }}
          >
            <MoreHorizontal size={14} />
          </button>
        )}
        placement="bottom-end"
      >
        <DropdownItemGroup>
          <DropdownItem onClick={() => cloneCycle.mutate({ id: cycle.id, project_id: cycle.project_id })}>
            Copy cycle
          </DropdownItem>
          <DropdownItem onClick={() => archiveCycle.mutate({ id: cycle.id, project_id: cycle.project_id })}>
            Archive cycle
          </DropdownItem>
          <DropdownItem onClick={() => deleteCycle.mutate({ id: cycle.id, project_id: cycle.project_id })}>
            Delete cycle
          </DropdownItem>
        </DropdownItemGroup>
      </DropdownMenu>
    </div>
  );
}

// ── Create cycle modal ────────────────────────────────────────────────────────

function CreateCycleModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [selectedTab, setSelectedTab] = useState(0);
  const [name, setName] = useState('');
  const [objective, setObjective] = useState('');
  const [releaseId, setReleaseId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [caseSearch, setCaseSearch] = useState('');
  const [selectedCaseIds, setSelectedCaseIds] = useState<Set<string>>(new Set());
  const [assigneeIds, setAssigneeIds] = useState<Set<string>>(new Set());

  const createCycle = useCreateCycle();
  const addCases = useAddCasesToScope();
  const { data: releases = [] } = useReleases();
  const { data: casesResult } = useTestCases(projectId, { per_page: 200 });
  const allCases = casesResult?.cases ?? [];
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-list'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name, email, avatar_url').order('full_name').limit(100);
      return data ?? [];
    },
    staleTime: 300000,
  });

  const filteredCases = allCases.filter(c =>
    !caseSearch || c.title?.toLowerCase().includes(caseSearch.toLowerCase()) || c.key?.toLowerCase().includes(caseSearch.toLowerCase())
  );

  const handleCreateCycle = async () => {
    if (!name.trim()) return;
    const cycle = await createCycle.mutateAsync({
      project_id: projectId,
      name: name.trim(),
      description: objective || undefined,
      planned_start_date: startDate || undefined,
      planned_end_date: endDate || undefined,
    });
    if (selectedCaseIds.size > 0) {
      await addCases.mutateAsync({ cycle_id: cycle.id, case_ids: Array.from(selectedCaseIds) });
    }
    onClose();
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setTagInput('');
  };

  const fieldStyle: React.CSSProperties = {
    width: '100%', border: '1px solid var(--ds-border)', borderRadius: 4,
    padding: '6px 10px', fontSize: 14, fontFamily: 'var(--ds-font-family-body)',
    color: 'var(--ds-text)', background: 'var(--ds-surface)', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle)', marginBottom: 4,
  };

  const tabLabels = [
    'Details',
    `Cases${selectedCaseIds.size > 0 ? ` (${selectedCaseIds.size})` : ''}`,
    'Assignees',
  ];

  return (
    <ModalDialog onClose={onClose} width="large">
      <ModalHeader>
        <ModalTitle>Create Cycle</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <Tabs id="create-cycle-tabs" selected={selectedTab} onChange={setSelectedTab}>
          <TabList>
            {tabLabels.map(label => <Tab key={label}>{label}</Tab>)}
          </TabList>

          {/* ── Details ── */}
          <TabPanel>
            <div style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Title *</label>
                <Textfield
                  value={name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                  placeholder="Provide a value for this field"
                  autoFocus
                  isRequired
                />
              </div>
              <div>
                <label style={labelStyle}>Objective</label>
                <TextArea
                  value={objective}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setObjective(e.target.value)}
                  placeholder="Describe the goal of this test cycle"
                  minimumRows={3}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Release</label>
                  <select value={releaseId} onChange={e => setReleaseId(e.target.value)} style={fieldStyle}>
                    <option value="">— None —</option>
                    {releases.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Owner</label>
                  <select value={ownerId} onChange={e => setOwnerId(e.target.value)} style={fieldStyle}>
                    <option value="">— Unassigned —</option>
                    {(profiles as Array<{ id: string; full_name: string | null; email: string | null }>).map(p => (
                      <option key={p.id} value={p.id}>{p.full_name || p.email || p.id}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Start date</label>
                  <input type="date" value={startDate}
                    onChange={e => { setStartDate(e.target.value); if (endDate && e.target.value > endDate) setEndDate(''); }}
                    max={endDate || undefined} style={fieldStyle} />
                </div>
                <div>
                  <label style={labelStyle}>End date</label>
                  <input type="date" value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    min={startDate || undefined} style={fieldStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Tags</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                  {tags.map(tag => (
                    <span key={tag} style={{
                      padding: '2px 8px', borderRadius: 10, fontSize: 12,
                      background: 'var(--ds-background-neutral)', color: 'var(--ds-text)',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      {tag}
                      <button onClick={() => setTags(prev => prev.filter(t => t !== tag))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, color: 'var(--ds-text-subtlest)', fontSize: 12 }}>×</button>
                    </span>
                  ))}
                </div>
                <input
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                  placeholder="Type tag and press Enter"
                  style={{ ...fieldStyle, width: 'calc(100% - 20px)' }}
                />
              </div>
            </div>
          </TabPanel>

          {/* ── Cases ── */}
          <TabPanel>
            <div style={{ paddingTop: 16 }}>
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ds-text-subtlest)', display: 'flex' }}>
                  <Search size={14} />
                </span>
                <input
                  value={caseSearch}
                  onChange={e => setCaseSearch(e.target.value)}
                  placeholder="Search by case title or key…"
                  style={{ ...fieldStyle, paddingLeft: 32 }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--ds-border)', marginBottom: 4 }}>
                <input type="checkbox"
                  checked={filteredCases.length > 0 && filteredCases.every(c => selectedCaseIds.has(c.id))}
                  onChange={() => {
                    if (filteredCases.every(c => selectedCaseIds.has(c.id))) {
                      setSelectedCaseIds(new Set());
                    } else {
                      setSelectedCaseIds(new Set(filteredCases.map(c => c.id)));
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle)' }}>
                  Select all ({filteredCases.length} cases)
                </span>
                {selectedCaseIds.size > 0 && (
                  <span style={{ fontSize: 12, color: 'var(--ds-link)', marginLeft: 'auto' }}>
                    {selectedCaseIds.size} selected
                  </span>
                )}
              </div>
              {filteredCases.length === 0 ? (
                <p style={{ color: 'var(--ds-text-subtlest)', fontSize: 14, padding: '16px 0' }}>No published cases found.</p>
              ) : (
                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                  {filteredCases.map(c => (
                    <label key={c.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
                      borderBottom: '1px solid var(--ds-border)', cursor: 'pointer',
                    }}>
                      <input type="checkbox"
                        checked={selectedCaseIds.has(c.id)}
                        onChange={() => {
                          setSelectedCaseIds(prev => {
                            const next = new Set(prev);
                            next.has(c.id) ? next.delete(c.id) : next.add(c.id);
                            return next;
                          });
                        }}
                      />
                      <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest)', fontFamily: 'var(--ds-font-family-code)', minWidth: 70 }}>
                        {c.key}
                      </span>
                      <span style={{ fontSize: 14, color: 'var(--ds-text)', flex: 1 }}>{c.title}</span>
                      <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 10, background: 'var(--ds-background-neutral)', color: 'var(--ds-text-subtlest)' }}>
                        v{c.current_version ?? 1}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </TabPanel>

          {/* ── Assignees ── */}
          <TabPanel>
            <div style={{ paddingTop: 16 }}>
              <p style={{ fontSize: 13, color: 'var(--ds-text-subtle)', marginTop: 0, marginBottom: 12 }}>
                Select team members to assign to this cycle.
              </p>
              {(profiles as Array<{ id: string; full_name: string | null; email: string | null; avatar_url: string | null }>).length === 0 ? (
                <Spinner size="small" />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {(profiles as Array<{ id: string; full_name: string | null; email: string | null; avatar_url: string | null }>).map(p => (
                    <label key={p.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0',
                      borderBottom: '1px solid var(--ds-border)', cursor: 'pointer',
                    }}>
                      <input type="checkbox"
                        checked={assigneeIds.has(p.id)}
                        onChange={() => {
                          setAssigneeIds(prev => {
                            const next = new Set(prev);
                            next.has(p.id) ? next.delete(p.id) : next.add(p.id);
                            return next;
                          });
                        }}
                      />
                      {p.avatar_url
                        ? <img src={p.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                        : <span style={{
                            width: 28, height: 28, borderRadius: '50%', fontSize: 12, fontWeight: 600,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'var(--ds-background-neutral)', color: 'var(--ds-text)',
                          }}>
                            {(p.full_name || p.email || '?').charAt(0).toUpperCase()}
                          </span>
                      }
                      <span style={{ fontSize: 14, color: 'var(--ds-text)' }}>
                        {p.full_name || p.email}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </TabPanel>
        </Tabs>
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose}>Cancel</Button>
        <Button
          appearance="primary"
          isDisabled={!name.trim() || createCycle.isPending || addCases.isPending}
          onClick={handleCreateCycle}
        >
          {createCycle.isPending || addCases.isPending ? 'Creating…' : 'Create Cycle'}
        </Button>
      </ModalFooter>
    </ModalDialog>
  );
}

// ── Status pill ───────────────────────────────────────────────────────────────

function CycleStatusPill({ status }: { status: CycleStatus }) {
  const map: Record<CycleStatus, { appearance: 'success' | 'moved' | 'removed' | 'inprogress' | 'default'; label: string }> = {
    IN_PROGRESS: { appearance: 'inprogress', label: 'In progress' },
    COMPLETED:   { appearance: 'success',    label: 'Completed' },
    PLANNED:     { appearance: 'default',    label: 'Planned' },
    CANCELLED:   { appearance: 'removed',    label: 'Cancelled' },
  };
  const { appearance, label } = map[status] ?? { appearance: 'default' as const, label: status };
  return <Lozenge appearance={appearance}>{label}</Lozenge>;
}
