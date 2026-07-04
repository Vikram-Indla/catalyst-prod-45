import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Spinner from '@atlaskit/spinner';
import Lozenge from '@atlaskit/lozenge';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import { useProjects } from '@/hooks/test-management/useProjects';
import { useTestCases } from '@/hooks/test-management/useTestCases';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { Trash2 } from '@/lib/atlaskit-icons';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable/types';

// ── Types ─────────────────────────────────────────────────────────────────────

type SetType = 'smoke' | 'regression' | 'sanity' | 'integration' | 'e2e' | 'performance' | 'security' | 'accessibility' | 'custom';

interface TmTestSet {
  id: string;
  set_key: string;
  name: string;
  description: string | null;
  set_type: SetType;
  membership_type: string;
  is_active: boolean;
  project_id: string;
}

interface SetCase {
  id: string;
  test_case_id: string;
  sort_order: number;
  tm_test_cases: {
    id: string;
    case_key: string;
    title: string;
    status: string;
    priority_id: string | null;
  } | null;
}

interface CycleSet {
  id: string;
  cycle_id: string;
  tm_test_cycles: {
    id: string;
    name: string;
    status: string;
    planned_start: string | null;
    planned_end: string | null;
    sprint?: { id: string; name: string; status: string } | null;
  } | null;
}

interface AvailableCycle {
  id: string;
  name: string;
  status: string;
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

const CYCLE_STATUS_APPEARANCE: Record<string, 'default' | 'inprogress' | 'success' | 'moved' | 'removed'> = {
  PLANNED: 'default',
  IN_PROGRESS: 'inprogress',
  COMPLETED: 'success',
  CANCELLED: 'removed',
};

// ── Shared table styles ───────────────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  padding: '8px 12px',
  textAlign: 'left',
  fontSize: 'var(--ds-font-size-200)',
  fontWeight: 600,
  color: 'var(--ds-text-subtle)',
};

const tdStyle: React.CSSProperties = { padding: '8px 12px' };

// ── Add Cases Modal ───────────────────────────────────────────────────────────

function AddCasesModal({
  setId,
  projectId,
  existingCaseIds,
  onClose,
}: {
  setId: string;
  projectId: string;
  existingCaseIds: string[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { data: casesResult } = useTestCases(projectId, { per_page: 200 });
  const allCases = casesResult?.cases ?? [];
  const available = allCases.filter(c => !existingCaseIds.includes(c.id));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = available.filter(c =>
    search === '' ||
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    (c.key ?? '').toLowerCase().includes(search.toLowerCase())
  );

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
    setSaving(true);
    try {
      const selectedCases = available.filter(c => selected.has(c.id));
      const nextIndex = existingCaseIds.length;
      const rows = selectedCases.map((c, i) => ({
        test_set_id: setId,
        test_case_id: c.id,
        sort_order: nextIndex + i,
      }));
      const { error } = await (supabase.from('tm_set_cases') as any).insert(rows);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['set-cases', setId] });
      catalystToast.success(`Added ${selected.size} case${selected.size > 1 ? 's' : ''} to set`);
      onClose();
    } catch (e: unknown) {
      catalystToast.error(e instanceof Error ? e.message : 'Failed to add cases');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'var(--ds-blanket)', zIndex: 300 }}
      />
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 560,
        maxHeight: '80vh',
        background: 'var(--ds-surface-overlay)',
        borderRadius: 8,
        boxShadow: 'var(--ds-shadow-overlay)',
        zIndex: 301,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--ds-font-family-body)',
      }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--ds-border)' }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 'var(--ds-font-size-600)', fontWeight: 600, color: 'var(--ds-text)' }}>
            Add cases to set
          </h2>
          <input
            type="text"
            placeholder="Search by key or title…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
            style={{
              width: '100%',
              padding: '4px 10px',
              border: '2px solid var(--ds-border)',
              borderRadius: 4,
              fontSize: 'var(--ds-font-size-300)',
              fontFamily: 'var(--ds-font-family-body)',
              boxSizing: 'border-box',
              color: 'var(--ds-text)',
              background: 'var(--ds-surface)',
            }}
          />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 24px' }}>
          {filtered.length === 0 ? (
            <p style={{ color: 'var(--ds-text-subtlest)', fontSize: 'var(--ds-font-size-400)', padding: '16px 0' }}>
              {available.length === 0 ? 'All cases are already in this set.' : 'No cases match your search.'}
            </p>
          ) : (
            filtered.map(c => (
              <label
                key={c.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '8px 0',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--ds-border)',
                }}
              >
                <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest)', fontFamily: 'var(--ds-font-family-code)', minWidth: 72 }}>
                  {c.key}
                </span>
                <span style={{ fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text)', flex: 1 }}>{c.title}</span>
              </label>
            ))
          )}
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--ds-border)', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: 'none',
              border: '1px solid var(--ds-border)',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 'var(--ds-font-size-400)',
              color: 'var(--ds-text)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={selected.size === 0 || saving}
            style={{
              padding: '8px 20px',
              background: 'var(--ds-background-brand-bold)',
              color: 'var(--ds-text-inverse)',
              border: 'none',
              borderRadius: 4,
              cursor: selected.size === 0 || saving ? 'not-allowed' : 'pointer',
              fontSize: 'var(--ds-font-size-400)',
              fontWeight: 500,
              opacity: selected.size === 0 ? 0.7 : 1,
            }}
          >
            {saving ? 'Adding…' : selected.size > 0 ? `Add ${selected.size} case${selected.size > 1 ? 's' : ''}` : 'Add cases'}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}

// ── Add to Cycle portal dropdown ──────────────────────────────────────────────

function AddToCycleDropdown({
  setId,
  triggerRef,
  cycles,
  onClose,
}: {
  setId: string;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  cycles: AvailableCycle[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!triggerRef.current) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !triggerRef.current?.contains(e.target as Node)) {
        onClose();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [onClose, triggerRef]);

  if (!triggerRef.current) return null;
  const rect = triggerRef.current.getBoundingClientRect();

  const handleSelectCycle = async (cycle: AvailableCycle) => {
    try {
      const { error } = await supabase.from('tm_cycle_sets').insert({
        cycle_id: cycle.id,
        set_id: setId,
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['set-cycle-sets', setId] });
      catalystToast.success(`Added to cycle "${cycle.name}"`);
      onClose();
    } catch (e: unknown) {
      catalystToast.error(e instanceof Error ? e.message : 'Failed to add to cycle');
    }
  };

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      style={{
        position: 'fixed',
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
        background: 'var(--ds-surface-overlay)',
        border: '1px solid var(--ds-border)',
        borderRadius: 6,
        boxShadow: 'var(--ds-shadow-overlay)',
        padding: '4px 0',
        minWidth: 200,
        zIndex: 9999,
        fontFamily: 'var(--ds-font-family-body)',
      }}
    >
      {cycles.length === 0 ? (
        <div style={{ padding: '8px 16px', fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtlest)' }}>
          No cycles available
        </div>
      ) : (
        cycles.map(cycle => (
          <button
            key={cycle.id}
            role="menuitem"
            onClick={() => handleSelectCycle(cycle)}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '8px 16px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 'var(--ds-font-size-300)',
              color: 'var(--ds-text)',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-background-neutral-subtle)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            {cycle.name}
          </button>
        ))
      )}
    </div>,
    document.body
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SetDetailPage() {
  // P1-S14 (slug contract): route param is the set's set_key, not its uuid.
  // Resolve to the internal id below; every downstream query/FK write in
  // this file already expects that internal id, so `setId` keeps its
  // existing meaning once resolved.
  const { setKey: routeSetKey, projectKey = 'BAU' } = useParams<{ setKey: string; projectKey: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: projects = [] } = useProjects();
  const projectId = projects[0]?.id;

  const [activeTab, setActiveTab] = useState<'cases' | 'cycles'>('cases');
  const [showAddCases, setShowAddCases] = useState(false);
  const [addToCycleOpen, setAddToCycleOpen] = useState(false);
  const addToCycleBtnRef = useRef<HTMLButtonElement | null>(null);

  // Query the set itself
  const { data: set, isLoading: setLoading } = useQuery({
    queryKey: ['test-set', routeSetKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tm_test_sets')
        .select('id, name, description, set_type, membership_type, is_active, project_id, set_key')
        .eq('set_key', routeSetKey!)
        .single();
      if (error) throw error;
      return data as TmTestSet;
    },
    enabled: !!routeSetKey,
  });

  const setId = set?.id;

  // Query cases in this set
  const { data: setCases = [], isLoading: casesLoading } = useQuery({
    queryKey: ['set-cases', setId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('tm_set_cases') as any)
        .select('id, test_case_id, sort_order, tm_test_cases(id, case_key, title, status, priority_id)')
        .eq('test_set_id', setId!)
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as SetCase[];
    },
    enabled: !!setId,
  });

  // Query cycles using this set
  const { data: cycleSets = [], isLoading: cyclesLoading } = useQuery({
    queryKey: ['set-cycle-sets', setId],
    queryFn: async () => {
      const { data, error } = await supabase.from('tm_cycle_sets')
        .select('id, cycle_id, tm_test_cycles(id, name, status, planned_start, planned_end)')
        .eq('set_id', setId!);
      if (error) throw error;
      return (data ?? []) as CycleSet[];
    },
    enabled: !!setId,
  });

  // JiraTable columns for setCases
  const setCasesTableColumns: Column<SetCase>[] = [
    {
      id: 'key',
      label: 'Key',
      width: 10,
      cell: ({ row }) => (
        <div style={{ fontFamily: 'var(--ds-font-family-code)', fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest)' }}>
          {row.tm_test_cases?.case_key ?? '—'}
        </div>
      ),
    },
    {
      id: 'title',
      label: 'Title',
      flex: true,
      cell: ({ row }) => (
        <div style={{ color: 'var(--ds-text)' }}>
          {row.tm_test_cases?.title ?? '—'}
        </div>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      width: 12,
      cell: ({ row }) => (
        <>{row.tm_test_cases?.status ? <CaseStatusPill status={row.tm_test_cases.status} /> : '—'}</>
      ),
    },
    {
      id: 'remove',
      label: '',
      width: 10,
      cell: ({ row }) => (
        <button
          onClick={() => removeCaseMut.mutate(row.id)}
          title="Remove from set"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--ds-text-subtlest)',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Trash2 size={13} />
        </button>
      ),
    },
  ];

  // JiraTable columns for cycleSets
  const cyclesTableColumns: Column<CycleSet>[] = [
    {
      id: 'cycleName',
      label: 'Cycle name',
      flex: true,
      cell: ({ row }) => (
        <div style={{ color: 'var(--ds-text)', fontWeight: 500 }}>
          {row.tm_test_cycles?.name ?? '—'}
        </div>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      width: 12,
      cell: ({ row }) => (
        <>
          {row.tm_test_cycles?.status ? (
            <Lozenge appearance={CYCLE_STATUS_APPEARANCE[row.tm_test_cycles.status] ?? 'default'}>
              {row.tm_test_cycles.status.charAt(0) + row.tm_test_cycles.status.slice(1).toLowerCase().replace('_', ' ')}
            </Lozenge>
          ) : '—'}
        </>
      ),
    },
    {
      id: 'startDate',
      label: 'Start date',
      width: 12,
      cell: ({ row }) => (
        <div style={{ color: 'var(--ds-text-subtle)', fontSize: 'var(--ds-font-size-200)' }}>
          {row.tm_test_cycles?.sprint?.name ?? '—'}
        </div>
      ),
    },
    {
      id: 'endDate',
      label: 'End date',
      width: 12,
      cell: ({ row }) => (
        <div style={{ color: 'var(--ds-text-subtle)' }}>
          {row.tm_test_cycles?.planned_end ? formatDate(row.tm_test_cycles.planned_end) : '—'}
        </div>
      ),
    },
    {
      id: 'actions',
      label: '',
      width: 10,
      cell: ({ row }) => (
        <>
          {row.tm_test_cycles?.id && (
            <button
              onClick={() => navigate(`/testhub/${projectKey}/cycles/${row.tm_test_cycles?.id}`)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 'var(--ds-font-size-200)',
                color: 'var(--ds-link)',
                padding: 0,
              }}
            >
              View cycle
            </button>
          )}
        </>
      ),
    },
  ];

  // Query available cycles for "Add to cycle" dropdown
  const { data: availableCycles = [] } = useQuery({
    queryKey: ['available-cycles', projectId, setId],
    queryFn: async () => {
      const existingCycleIds = cycleSets.map(cs => cs.cycle_id);
      // tm_cycle_status enum is lowercase (planned/in_progress/draft/active/
      // paused/completed/archived). This query hits the DB column directly
      // (not via useTestCycles' UPPERCASE mapping), so it MUST use the raw
      // lowercase values — list only cycles still open for adding cases
      // (exclude terminal completed/archived).
      let query = (supabase.from('tm_test_cycles') as any)
        .select('id, name, status')
        .eq('project_id', projectId!)
        .in('status', ['draft', 'planned', 'active', 'in_progress', 'paused'])
        .order('name');

      const { data, error } = await query;
      if (error) throw error;
      const cycles = (data ?? []) as AvailableCycle[];
      return cycles.filter(c => !existingCycleIds.includes(c.id));
    },
    enabled: !!projectId && !!setId && cycleSets !== undefined,
  });

  // Remove case from set
  const removeCaseMut = useMutation({
    mutationFn: async (setCaseId: string) => {
      const { error } = await (supabase.from('tm_set_cases') as any).delete().eq('id', setCaseId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['set-cases', setId] });
      catalystToast.success('Case removed from set');
    },
    onError: (e: Error) => catalystToast.error(e.message),
  });

  if (setLoading) {
    return (
      <div style={{ padding: 32, display: 'flex', justifyContent: 'center' }}>
        <Spinner size="large" />
      </div>
    );
  }

  if (!set) {
    return <div style={{ padding: 32, color: 'var(--ds-text-danger)' }}>Set not found</div>;
  }

  const setTypeLabel = SET_TYPE_LABELS[set.set_type as SetType] ?? set.set_type;
  const existingCaseIds = setCases.map(sc => sc.test_case_id);

  return (
    <div style={{ padding: 24, maxWidth: 1200, fontFamily: 'var(--ds-font-family-body)' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <ProjectPageHeader
          hubType="test"
          trail={[{ text: 'Sets', href: '/testhub/sets' }]}
          title={set.name}
          actions={
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                onClick={() => setShowAddCases(true)}
                style={{
                  padding: '8px 14px',
                  background: 'none',
                  border: '1px solid var(--ds-border)',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 'var(--ds-font-size-300)',
                  color: 'var(--ds-text)',
                }}
              >
                + Add cases
              </button>
              <div style={{ position: 'relative' }}>
                <button
                  ref={addToCycleBtnRef}
                  onClick={() => setAddToCycleOpen(v => !v)}
                  style={{
                    padding: '8px 14px',
                    background: 'none',
                    border: '1px solid var(--ds-border)',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 'var(--ds-font-size-300)',
                    color: 'var(--ds-text)',
                  }}
                >
                  Add to cycle ▾
                </button>
                {addToCycleOpen && (
                  <AddToCycleDropdown
                    setId={set.id}
                    triggerRef={addToCycleBtnRef}
                    cycles={availableCycles}
                    onClose={() => setAddToCycleOpen(false)}
                  />
                )}
              </div>
              <button
                onClick={() => navigate(`/testhub/${projectKey}/sets`)}
                style={{
                  padding: '8px 14px',
                  background: 'none',
                  border: '1px solid var(--ds-border)',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 'var(--ds-font-size-300)',
                  color: 'var(--ds-text)',
                }}
              >
                Edit
              </button>
            </div>
          }
        />
      </div>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <SummaryCard label="Total cases" value={String(setCases.length)} />
        <SummaryCard label="Active cycles" value={String(cycleSets.length)} />
        <SummaryCard label="Set type" value={setTypeLabel} />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--ds-border)', marginBottom: 16 }}>
        {(['cases', 'cycles'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 20px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: 'var(--ds-font-size-400)',
              fontWeight: activeTab === tab ? 600 : 400,
              color: activeTab === tab ? 'var(--ds-text)' : 'var(--ds-text-subtle)',
              borderBottom: activeTab === tab ? '2px solid var(--ds-border-brand)' : '2px solid transparent',
              marginBottom: -2,
            }}
          >
            {tab === 'cases' ? `Cases (${setCases.length})` : `Cycles using this set (${cycleSets.length})`}
          </button>
        ))}
      </div>

      {/* Cases tab */}
      {activeTab === 'cases' && (
        <>
          {casesLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
              <Spinner size="medium" />
            </div>
          ) : setCases.length === 0 ? (
            <EmptyState
              message="No cases in this set. Add cases to get started."
              action={
                <button
                  onClick={() => setShowAddCases(true)}
                  style={{
                    padding: '8px 16px',
                    background: 'var(--ds-background-brand-bold)',
                    color: 'var(--ds-text-inverse)',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 'var(--ds-font-size-300)',
                    fontWeight: 500,
                  }}
                >
                  Add cases
                </button>
              }
            />
          ) : (
            <JiraTable
              columns={setCasesTableColumns}
              data={setCases}
              getRowId={(row) => row.id}
            />
          )}
        </>
      )}

      {/* Cycles tab */}
      {activeTab === 'cycles' && (
        <>
          {cyclesLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
              <Spinner size="medium" />
            </div>
          ) : cycleSets.length === 0 ? (
            <EmptyState message="This set has not been added to any cycles yet." />
          ) : (
            <JiraTable
              columns={cyclesTableColumns}
              data={cycleSets}
              getRowId={(row) => row.id}
            />
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Add Cases Modal */}
      {showAddCases && setId && projectId && (
        <AddCasesModal
          setId={setId}
          projectId={projectId}
          existingCaseIds={existingCaseIds}
          onClose={() => setShowAddCases(false)}
        />
      )}
    </div>
  );
}

// ── Helper components ─────────────────────────────────────────────────────────

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      padding: '16px 20px',
      border: '1px solid var(--ds-border)',
      borderRadius: 8,
      background: 'var(--ds-surface)',
      minWidth: 140,
    }}>
      <div style={{ fontSize: 'var(--ds-font-size-800)', fontWeight: 600, color: 'var(--ds-text)', marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)' }}>
        {label}
      </div>
    </div>
  );
}

function EmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '48px 32px',
      color: 'var(--ds-text-subtlest)',
      fontSize: 'var(--ds-font-size-400)',
      border: '1px dashed var(--ds-border)',
      borderRadius: 8,
    }}>
      <p style={{ margin: '0 0 16px', color: 'var(--ds-text-subtle)' }}>{message}</p>
      {action}
    </div>
  );
}

function CaseStatusPill({ status }: { status: string }) {
  const map: Record<string, 'default' | 'inprogress' | 'success' | 'moved'> = {
    draft: 'default',
    ready: 'inprogress',
    approved: 'success',
    deprecated: 'default',
  };
  const label = status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
  return <Lozenge appearance={map[status] ?? 'default'}>{label}</Lozenge>;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}
