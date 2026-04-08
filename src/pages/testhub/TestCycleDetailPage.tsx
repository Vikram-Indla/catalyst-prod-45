/**
 * Test Cycle Detail Page — TestHub Module
 * Route: /testhub/cycles/:cycleId
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Pencil, Play, CheckCircle2, XCircle, AlertTriangle,
  Clock, Plus, User, Calendar, RefreshCw, Trash2, Download, Users, BarChart3, Server
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';
import { AddTestCasesModal } from '@/components/testhub/AddTestCasesModal';
import { CreateTestCycleModal } from '@/components/testhub/CreateTestCycleModal';
import { AssignTesterModal } from '@/components/testhub/AssignTesterModal';
import { QuickExecutionModal } from '@/components/testhub/QuickExecutionModal';
import { useTheme } from '@/hooks/useTheme';

interface TestCycle {
  id: string;
  cycle_key: string;
  name: string;
  description: string | null;
  status: string;
  planned_start: string | null;
  planned_end: string | null;
  total_cases: number;
  passed_count: number;
  failed_count: number;
  blocked_count: number;
  skipped_count: number;
  not_run_count: number;
  in_progress_count?: number;
  environment_id?: string | null;
}

interface CycleTestCase {
  id: string;
  cycle_id: string;
  test_case_id: string;
  current_status: string;
  executed_at: string | null;
  notes: string | null;
  assigned_to: string | null;
  test_case: { id: string; case_key: string; title: string; priority_id: string; case_type_id: string; priority: { id: string; name: string; color: string } | null; case_type: { id: string; name: string } | null } | null;
  assignee?: { id: string; full_name: string } | null;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  draft:       { label: 'DRAFT',       color: '#253858', bg: '#DFE1E6' },
  planned:     { label: 'PLANNED',     color: '#253858', bg: '#DFE1E6' },
  active:      { label: 'IN PROGRESS', color: '#0747A6', bg: '#DEEBFF' },
  in_progress: { label: 'IN PROGRESS', color: '#0747A6', bg: '#DEEBFF' },
  completed:   { label: 'COMPLETED',   color: '#006644', bg: '#E3FCEF' },
  done:        { label: 'DONE',        color: '#006644', bg: '#E3FCEF' },
  archived:    { label: 'ARCHIVED',    color: '#253858', bg: '#DFE1E6' },
  paused:      { label: 'PAUSED',      color: '#253858', bg: '#DFE1E6' },
};

const executionStatusConfig: Record<string, { label: string; color: string; bg: string; Icon: any }> = {
  not_run: { label: 'Not Run', color: '#64748B', bg: '#F1F5F9', Icon: Clock },
  passed: { label: 'Passed', color: '#059669', bg: '#ECFDF5', Icon: CheckCircle2 },
  failed: { label: 'Failed', color: '#DC2626', bg: '#FEF2F2', Icon: XCircle },
  blocked: { label: 'Blocked', color: '#D97706', bg: '#FFFBEB', Icon: AlertTriangle },
  skipped: { label: 'Skipped', color: '#94A3B8', bg: '#F8FAFC', Icon: Clock },
};

const priorityConfig: Record<string, { color: string; bg: string }> = {
  critical: { color: '#DC2626', bg: '#FEF2F2' },
  high: { color: '#EA580C', bg: '#FFF7ED' },
  medium: { color: '#D97706', bg: '#FFFBEB' },
  low: { color: '#059669', bg: '#ECFDF5' },
};

export default function TestCycleDetailPage() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromPlanId = searchParams.get('fromPlanId');
  const { isDark } = useTheme();
  const [cycle, setCycle] = useState<TestCycle | null>(null);
  const [testCases, setTestCases] = useState<CycleTestCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isExecutionModalOpen, setIsExecutionModalOpen] = useState(false);
  const [executingTestCase, setExecutingTestCase] = useState<any>(null);

  // Selection state for G3-10 & G3-11
  const [selectedTestCaseIds, setSelectedTestCaseIds] = useState<Set<string>>(new Set());
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false);

  const fetchCycle = async () => {
    if (!cycleId) return;
    try {
      const { data, error } = await (supabase as any).from('tm_test_cycles')
        .select('id, cycle_key, name, description, status, planned_start, planned_end, environment_id, project_id, total_cases, passed_count, failed_count, blocked_count, skipped_count, not_run_count, in_progress_count, created_at, updated_at')
        .eq('id', cycleId).maybeSingle();
      if (error) throw error;
      if (!data) { catalystToast.error('Cycle not found'); return; }
      setCycle(data);
    } catch { catalystToast.error('Failed to load cycle'); }
  };

  const fetchTestCases = async () => {
    if (!cycleId) return;
    try {
      const { data, error } = await (supabase as any).from('tm_cycle_scope')
        .select(`id, cycle_id, test_case_id, assigned_to, current_status, sort_order, priority, due_date, added_at, updated_at, assignee:profiles!assigned_to ( id, full_name, avatar_url ), test_case:tm_test_cases ( id, case_key, title, priority_id, case_type_id, priority:tm_case_priorities ( id, name, color ), case_type:tm_case_types ( id, name ) )`)
        .eq('cycle_id', cycleId).order('sort_order');
      if (error) throw error;
      setTestCases(data || []);
    } catch (err) { console.error('fetchTestCases error:', err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchCycle(); fetchTestCases(); }, [cycleId]);

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  const filteredTestCases = statusFilter === 'all' ? testCases : testCases.filter(tc => tc.current_status === statusFilter);

  // By Tester stats
  const testerStats = (() => {
    const map = new Map<string, { name: string; total: number; executed: number }>();
    testCases.forEach(tc => {
      const name = tc.assignee?.full_name || 'Unassigned';
      const key = tc.assigned_to || 'unassigned';
      if (!map.has(key)) map.set(key, { name, total: 0, executed: 0 });
      const entry = map.get(key)!;
      entry.total++;
      if (tc.current_status !== 'not_run') entry.executed++;
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  })();

  // Blocked test cases
  const blockedTestCases = testCases.filter(tc => tc.current_status === 'blocked');

  // Export CSV
  const handleExportCSV = () => {
    if (!cycle || testCases.length === 0) return;
    const headers = ['Case Key', 'Title', 'Priority', 'Assigned To', 'Status', 'Executed At', 'Notes'];
    const rows = testCases.map(tc => [
      tc.test_case?.case_key || '',
      tc.test_case?.title || '',
      tc.test_case?.priority?.name || '',
      tc.assignee?.full_name || '',
      tc.current_status,
      tc.executed_at ? new Date(tc.executed_at).toLocaleString() : '',
      (tc.notes || '').replace(/"/g, '""'),
    ]);
    const csvContent = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${cycle.cycle_key}-report.csv`;
    link.click();
    URL.revokeObjectURL(url);
    catalystToast.success('Cycle report exported as CSV', { title: 'Export Complete' });
  };

  // Selection helpers
  const toggleTestCaseSelection = (id: string) => {
    const newSelected = new Set(selectedTestCaseIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedTestCaseIds(newSelected);
  };

  const selectAllTestCases = () => {
    const newSelected = new Set(selectedTestCaseIds);
    filteredTestCases.forEach(tc => newSelected.add(tc.id));
    setSelectedTestCaseIds(newSelected);
  };

  const deselectAllTestCases = () => {
    setSelectedTestCaseIds(new Set());
  };

  // Remove selected test cases
  const handleRemoveTestCases = async () => {
    if (selectedTestCaseIds.size === 0) return;
    try {
      const idsToRemove = Array.from(selectedTestCaseIds);
      const { error } = await (supabase as any)
        .from('tm_cycle_scope')
        .delete()
        .in('id', idsToRemove);

      if (error) {
        catalystToast.error(error.message || 'Failed to remove test cases', { title: 'Remove Failed' });
        return;
      }

      catalystToast.success(`Removed ${selectedTestCaseIds.size} test case${selectedTestCaseIds.size !== 1 ? 's' : ''} from cycle`, {
        title: 'Test Cases Removed',
      });

      setSelectedTestCaseIds(new Set());
      setIsRemoveConfirmOpen(false);
      fetchCycle();
      fetchTestCases();
    } catch (err: any) {
      catalystToast.error(err.message || 'Failed to remove test cases');
    }
  };

  if (isLoading || !cycle) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', backgroundColor: isDark ? '#0A0A0A' : '#F8FAFC' }}>
        <div style={{ textAlign: 'center', color: isDark ? '#878787' : '#64748B' }}>
          <div style={{ width: 32, height: 32, border: `3px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          Loading cycle...
        </div>
      </div>
    );
  }

  const status = statusConfig[(cycle.status || 'draft').toLowerCase().replace(/-/g, '_')] ?? statusConfig['draft'];
  const canEdit = cycle.status === 'draft' || cycle.status === 'active';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: isDark ? '#0A0A0A' : '#F8FAFC' }}>
      {/* Header */}
      <div style={{ padding: '20px 32px', backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF', borderBottom: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}` }}>
        {fromPlanId ? (
          <button onClick={() => navigate(`/testhub/plans/${fromPlanId}`)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 0, border: 'none', backgroundColor: 'transparent', color: isDark ? '#878787' : '#64748B', fontSize: 13, fontWeight: 500, cursor: 'pointer', marginBottom: 16 }}>
            <ArrowLeft size={16} /> ← Back to Plan
          </button>
        ) : (
          <button onClick={() => navigate('/testhub/cycles')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 0, border: 'none', backgroundColor: 'transparent', color: isDark ? '#878787' : '#64748B', fontSize: 13, fontWeight: 500, cursor: 'pointer', marginBottom: 16 }}>
            <ArrowLeft size={16} /> Back to Cycles
          </button>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '4px 10px', borderRadius: 6 }}>{cycle.cycle_key}</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: status.color, backgroundColor: status.bg, padding: '4px 10px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: status.color }} />{status.label}
              </span>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: isDark ? '#EDEDED' : '#0F172A', margin: '0 0 8px' }}>{cycle.name}</h1>
            {cycle.description && <p style={{ fontSize: 14, color: isDark ? '#878787' : '#64748B', margin: '0 0 8px', maxWidth: 600 }}>{cycle.description}</p>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, color: isDark ? '#878787' : '#64748B' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={14} />{formatDate(cycle.planned_start)} — {formatDate(cycle.planned_end)}</span>
              {cycle.environment_id && (
                <span
                  onClick={() => navigate(`/testhub/environments/${cycle.environment_id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '2px 8px', backgroundColor: '#EFF6FF', borderRadius: 6, color: '#2563EB', fontWeight: 500 }}
                >
                  <Server size={14} />
                  Environment
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => navigate(`/testhub/cycles/${cycleId}/report`)}
              style={{ height: 40, padding: '0 16px', border: `1.5px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, borderRadius: 8, backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF', color: isDark ? '#A1A1A1' : '#334155', fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <BarChart3 size={16} /> Report
            </button>
            <button onClick={handleExportCSV} title="Export CSV" disabled={testCases.length === 0}
              style={{ width: 40, height: 40, padding: 0, border: `1.5px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, borderRadius: 8, backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF', color: testCases.length > 0 ? (isDark ? '#A1A1A1' : '#64748B') : (isDark ? '#878787' : '#CBD5E1'), cursor: testCases.length > 0 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Download size={18} />
            </button>
            <button onClick={() => { setIsLoading(true); fetchCycle(); fetchTestCases(); catalystToast.success('Refreshed'); }} title="Refresh"
              style={{ width: 40, height: 40, padding: 0, border: `1.5px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, borderRadius: 8, backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF', color: isDark ? '#A1A1A1' : '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RefreshCw size={18} />
            </button>
            {/* FSM Status Transition Button */}
            {cycle.status === 'draft' && (
              <button onClick={async () => {
                const { error } = await (supabase as any).from('tm_test_cycles').update({ status: 'active', updated_at: new Date().toISOString() }).eq('id', cycleId);
                if (error) { catalystToast.error(error.message); return; }
                catalystToast.success('Cycle activated successfully'); fetchCycle();
              }} style={{ height: 40, padding: '0 16px', background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', border: 'none', borderRadius: 8, color: '#FFFFFF', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Play size={16} /> Activate Cycle
              </button>
            )}
            {cycle.status === 'active' && (
              <button onClick={async () => {
                const { error } = await (supabase as any).from('tm_test_cycles').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', cycleId);
                if (error) { catalystToast.error(error.message); return; }
                catalystToast.success('Cycle completed'); fetchCycle();
              }} style={{ height: 40, padding: '0 16px', background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', border: 'none', borderRadius: 8, color: '#FFFFFF', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                Complete
              </button>
            )}
            {cycle.status === 'completed' && (
              <button onClick={async () => {
                const { error } = await (supabase as any).from('tm_test_cycles').update({ status: 'archived', updated_at: new Date().toISOString() }).eq('id', cycleId);
                if (error) { catalystToast.error(error.message); return; }
                catalystToast.success('Cycle archived'); fetchCycle();
              }} style={{ height: 40, padding: '0 16px', border: `1.5px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, borderRadius: 8, backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF', color: isDark ? '#A1A1A1' : '#334155', fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                Archive
              </button>
            )}
            {canEdit && (
              <button onClick={() => setIsEditModalOpen(true)}
                style={{ height: 40, padding: '0 16px', border: `1.5px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, borderRadius: 8, backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF', color: isDark ? '#A1A1A1' : '#334155', fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Pencil size={16} /> Edit
              </button>
            )}
            {cycle.status === 'active' && (
              <button onClick={() => {
                const notRun = testCases.find(tc => tc.current_status === 'not_run');
                if (notRun) {
                  navigate(`/testhub/cycles/${cycleId}/execute?testId=${notRun.id}`);
                } else {
                  catalystToast.info('All test cases have been executed', { title: 'Complete' });
                }
              }}
                style={{ height: 40, padding: '0 16px', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', border: 'none', borderRadius: 8, color: '#FFFFFF', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Play size={16} /> Execute Tests
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards - 3-panel layout per spec */}
      {(() => {
        const totalCount = testCases.length;
        const notRunCount = testCases.filter(tc => tc.current_status === 'not_run').length;
        const passedCount = testCases.filter(tc => tc.current_status === 'passed').length;
        const failedCount = testCases.filter(tc => tc.current_status === 'failed').length;
        const blockedCount = testCases.filter(tc => tc.current_status === 'blocked').length;
        const executedCount = totalCount - notRunCount;
        const pp = totalCount > 0 ? Math.round((executedCount / totalCount) * 100) : 0;
        return (
      <div style={{ padding: '24px 32px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {/* Progress Panel */}
        <div style={{ backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF', border: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, borderRadius: 12, padding: 24, textAlign: 'center' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#878787' : '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 16px' }}>Progress</p>
          <div style={{ width: 100, height: 100, margin: '0 auto 16px', position: 'relative' }}>
            <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
              <circle cx="18" cy="18" r="15.9155" fill="none" stroke={isDark ? '#2E2E2E' : '#E2E8F0'} strokeWidth="3" />
              <circle cx="18" cy="18" r="15.9155" fill="none" stroke={pp === 100 ? '#059669' : '#2563EB'} strokeWidth="3" strokeDasharray={`${pp} ${100 - pp}`} strokeLinecap="round" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: pp === 100 ? '#059669' : '#2563EB' }}>
              {pp}%
            </div>
          </div>
          <p style={{ fontSize: 14, color: isDark ? '#A1A1A1' : '#334155', margin: 0, fontWeight: 500 }}>{executedCount}/{totalCount} executed</p>
        </div>

        {/* By Status Panel */}
        <div style={{ backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF', border: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, borderRadius: 12, padding: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#878787' : '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 16px' }}>By Status</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button onClick={() => setStatusFilter('passed')} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', border: 'none', borderRadius: 8, backgroundColor: statusFilter === 'passed' ? (isDark ? 'rgba(5,150,105,0.12)' : '#ECFDF5') : 'transparent', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
              <CheckCircle2 size={18} style={{ color: '#059669' }} />
              <span style={{ flex: 1, fontSize: 14, color: isDark ? '#A1A1A1' : '#334155' }}>Passed</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#059669' }}>{passedCount}</span>
            </button>
            <button onClick={() => setStatusFilter('failed')} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', border: 'none', borderRadius: 8, backgroundColor: statusFilter === 'failed' ? (isDark ? 'rgba(220,38,38,0.12)' : '#FEF2F2') : 'transparent', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
              <XCircle size={18} style={{ color: '#DC2626' }} />
              <span style={{ flex: 1, fontSize: 14, color: isDark ? '#A1A1A1' : '#334155' }}>Failed</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#DC2626' }}>{failedCount}</span>
            </button>
            <button onClick={() => setStatusFilter('blocked')} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', border: 'none', borderRadius: 8, backgroundColor: statusFilter === 'blocked' ? (isDark ? 'rgba(217,119,6,0.12)' : '#FFFBEB') : 'transparent', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
              <AlertTriangle size={18} style={{ color: '#D97706' }} />
              <span style={{ flex: 1, fontSize: 14, color: isDark ? '#A1A1A1' : '#334155' }}>Blocked</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#D97706' }}>{blockedCount}</span>
            </button>
            <button onClick={() => setStatusFilter('not_run')} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', border: 'none', borderRadius: 8, backgroundColor: statusFilter === 'not_run' ? (isDark ? '#292929' : '#F8FAFC') : 'transparent', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
              <Clock size={18} style={{ color: isDark ? '#878787' : '#64748B' }} />
              <span style={{ flex: 1, fontSize: 14, color: isDark ? '#A1A1A1' : '#334155' }}>Not Run</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: isDark ? '#878787' : '#64748B' }}>{notRunCount}</span>
            </button>
            {statusFilter !== 'all' && (
              <button onClick={() => setStatusFilter('all')} style={{ padding: '6px 12px', border: 'none', backgroundColor: 'transparent', color: '#2563EB', fontSize: 12, fontWeight: 500, cursor: 'pointer', textAlign: 'center' }}>
                Show all
              </button>
            )}
          </div>
        </div>

        {/* By Tester Panel */}
        <div style={{ backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF', border: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, borderRadius: 12, padding: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#878787' : '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={14} /> By Tester
          </p>
          {testerStats.length === 0 ? (
            <p style={{ fontSize: 13, color: isDark ? '#878787' : '#94A3B8', textAlign: 'center', padding: 20, margin: 0 }}>No test cases assigned</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {testerStats.map((ts, i) => {
                const pct = ts.total > 0 ? Math.round((ts.executed / ts.total) * 100) : 0;
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: isDark ? '#EDEDED' : '#334155' }}>{ts.name}</span>
                      <span style={{ fontSize: 12, color: isDark ? '#878787' : '#64748B' }}>{ts.executed}/{ts.total}</span>
                    </div>
                    <div style={{ height: 6, backgroundColor: isDark ? '#2E2E2E' : '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, backgroundColor: pct === 100 ? '#059669' : '#2563EB', borderRadius: 4, transition: 'width 0.3s' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
        );
      })()}

      {/* Blocked Items Banner */}
      {blockedTestCases.length > 0 && (
        <div style={{ padding: '0 32px 16px' }}>
          <div style={{ padding: '14px 20px', backgroundColor: isDark ? 'rgba(217,119,6,0.1)' : '#FFFBEB', border: `1px solid ${isDark ? 'rgba(217,119,6,0.2)' : '#FDE68A'}`, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
            <AlertTriangle size={18} style={{ color: '#D97706', flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 500, color: '#92400E' }}>
              {blockedTestCases.length} blocked test case{blockedTestCases.length !== 1 ? 's' : ''} require attention
            </span>
            <button onClick={() => setStatusFilter('blocked')} style={{ marginLeft: 'auto', padding: '4px 12px', border: `1px solid ${isDark ? 'rgba(217,119,6,0.3)' : '#FDE68A'}`, borderRadius: 6, backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF', color: '#D97706', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              View Blocked
            </button>
          </div>
        </div>
      )}

      {/* Test Cases Section */}
      <div style={{ flex: 1, padding: '0 32px 32px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {/* Section Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: isDark ? '#EDEDED' : '#0F172A', margin: 0 }}>
              Test Cases ({testCases.length})
            </h2>
            {/* Selection Actions */}
            {testCases.length > 0 && canEdit && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {selectedTestCaseIds.size > 0 ? (
                  <>
                    <span style={{ fontSize: 13, color: '#2563EB', fontWeight: 500 }}>
                      {selectedTestCaseIds.size} selected
                    </span>
                    <button onClick={deselectAllTestCases} style={{ padding: '4px 8px', border: 'none', backgroundColor: 'transparent', color: isDark ? '#878787' : '#64748B', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                      Clear
                    </button>
                  </>
                ) : (
                  <button onClick={selectAllTestCases} style={{ padding: '4px 8px', border: 'none', backgroundColor: 'transparent', color: isDark ? '#878787' : '#64748B', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                    Select all
                  </button>
                )}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {/* Assign Button */}
            {selectedTestCaseIds.size > 0 && (
              <button
                onClick={() => setIsAssignModalOpen(true)}
                style={{
                  height: 50, padding: '0 14px', border: '1.5px solid #C7D2FE', borderRadius: 8,
                  backgroundColor: '#EEF2FF', color: '#4F46E5', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <User size={16} />
                Assign ({selectedTestCaseIds.size})
              </button>
            )}
            {/* Remove Button */}
            {selectedTestCaseIds.size > 0 && (
              <button
                onClick={() => setIsRemoveConfirmOpen(true)}
                style={{
                  height: 50, padding: '0 14px', border: '1.5px solid #FECACA', borderRadius: 8,
                  backgroundColor: '#FEF2F2', color: '#DC2626', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <Trash2 size={16} />
                Remove ({selectedTestCaseIds.size})
              </button>
            )}
            {/* Status Filter */}
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              style={{ height: 50, padding: '8px 12px', border: `1.5px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, borderRadius: 8, fontSize: 13, color: isDark ? '#A1A1A1' : '#334155', backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF' }}>
              <option value="all">All Statuses</option>
              <option value="not_run">Not Run</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
              <option value="blocked">Blocked</option>
            </select>
            {/* Add Test Cases Button */}
            {canEdit && (
              <button onClick={() => setIsAddModalOpen(true)} style={{ height: 50, padding: '0 14px', background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', border: 'none', borderRadius: 8, color: '#FFFFFF', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Plus size={16} /> Add Test Cases
              </button>
            )}
          </div>
        </div>

        <div style={{ flex: 1, backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF', border: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {testCases.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: isDark ? '#878787' : '#94A3B8', padding: 40 }}>
              <Clock size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
              <p style={{ fontSize: 16, fontWeight: 500, margin: '0 0 8px', color: isDark ? '#A1A1A1' : '#64748B' }}>No test cases added yet</p>
              <p style={{ fontSize: 14, margin: '0 0 16px' }}>Add test cases from the Test Repository to start planning</p>
              {canEdit && (
                <button onClick={() => setIsAddModalOpen(true)} style={{ height: 40, padding: '0 20px', background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', border: 'none', borderRadius: 8, color: '#FFFFFF', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Plus size={18} /> Add Test Cases
                </button>
              )}
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: isDark ? '#1A1A1A' : '#F8FAFC' }}>
                    {/* Checkbox Header */}
                    {canEdit && (
                      <th style={{ padding: '14px 16px', textAlign: 'center', borderBottom: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, width: 50 }}>
                        <input
                          type="checkbox"
                          checked={filteredTestCases.length > 0 && filteredTestCases.every(tc => selectedTestCaseIds.has(tc.id))}
                          onChange={(e) => { if (e.target.checked) selectAllTestCases(); else deselectAllTestCases(); }}
                          style={{ width: 16, height: 16, accentColor: '#2563EB' }}
                        />
                      </th>
                    )}
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: isDark ? '#878787' : '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}` }}>Test Case</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: isDark ? '#878787' : '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, width: 100 }}>Priority</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: isDark ? '#878787' : '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, width: 140 }}>Assigned To</th>
                    <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: isDark ? '#878787' : '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, width: 120 }}>Status</th>
                    <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: isDark ? '#878787' : '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, width: 100 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTestCases.map((ctc, index) => {
                    const execStatus = executionStatusConfig[ctc.current_status] || executionStatusConfig.not_run;
                    const StatusIcon = execStatus.Icon;
                    const priority = priorityConfig[ctc.test_case?.priority?.name?.toLowerCase() || ''] ?? priorityConfig.medium;
                    const isSelected = selectedTestCaseIds.has(ctc.id);
                    return (
                      <tr key={ctc.id} style={{ borderBottom: index < filteredTestCases.length - 1 ? `1px solid ${isDark ? '#292929' : '#F1F5F9'}` : 'none', backgroundColor: isSelected ? (isDark ? 'rgba(37,99,235,0.12)' : '#EFF6FF') : 'transparent' }}>
                        {/* Checkbox Cell */}
                        {canEdit && (
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleTestCaseSelection(ctc.id)}
                              style={{ width: 16, height: 16, accentColor: '#2563EB' }}
                            />
                          </td>
                        )}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '3px 8px', borderRadius: 4 }}>{ctc.test_case?.case_key || '—'}</span>
                            <span style={{ fontSize: 14, color: isDark ? '#EDEDED' : '#334155' }}>{ctc.test_case?.title || 'Unknown'}</span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontSize: 12, fontWeight: 500, color: priority.color, backgroundColor: priority.bg, padding: '4px 8px', borderRadius: 4, textTransform: 'capitalize' as const }}>{ctc.test_case?.priority?.name || 'Medium'}</span>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTestCaseIds(new Set([ctc.id]));
                              setIsAssignModalOpen(true);
                            }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px',
                              border: 'none', borderRadius: 4, backgroundColor: 'transparent',
                              cursor: 'pointer', fontSize: 13, color: ctc.assignee ? (isDark ? '#EDEDED' : '#334155') : (isDark ? '#878787' : '#94A3B8'),
                            }}
                          >
                            {ctc.assignee ? (
                              <>
                                <div style={{
                                  width: 22, height: 22, borderRadius: '50%', backgroundColor: '#E0E7FF',
                                  color: '#4F46E5', fontSize: 10, fontWeight: 600, display: 'flex',
                                  alignItems: 'center', justifyContent: 'center',
                                }}>
                                  {ctc.assignee.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                </div>
                                {ctc.assignee.full_name}
                              </>
                            ) : (
                              <>
                                <User size={14} />
                                Assign
                              </>
                            )}
                          </button>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, color: execStatus.color, backgroundColor: execStatus.bg, padding: '5px 10px', borderRadius: 6 }}>
                            <StatusIcon size={14} />{execStatus.label}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          {cycle.status === 'active' && (
                            <button onClick={(e) => { e.stopPropagation(); navigate(`/testhub/cycles/${cycleId}/execute?testId=${ctc.id}`); }} style={{ height: 30, padding: '8px 12px', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', border: 'none', borderRadius: 6, color: '#FFFFFF', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <Play size={12} /> Run
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <AddTestCasesModal
        isOpen={isAddModalOpen}
        cycleId={cycleId!}
        existingTestCaseIds={testCases.map(tc => tc.test_case_id)}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => { fetchCycle(); fetchTestCases(); }}
      />
      <CreateTestCycleModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={() => { fetchCycle(); setIsEditModalOpen(false); }}
        mode="edit"
        cycle={cycle}
      />
      <AssignTesterModal
        isOpen={isAssignModalOpen}
        cycleTestCaseIds={Array.from(selectedTestCaseIds)}
        onClose={() => setIsAssignModalOpen(false)}
        onSuccess={() => {
          fetchTestCases();
          setSelectedTestCaseIds(new Set());
        }}
      />
      <QuickExecutionModal
        isOpen={isExecutionModalOpen}
        cycleTestCase={executingTestCase}
        onClose={() => { setIsExecutionModalOpen(false); setExecutingTestCase(null); }}
        onSuccess={() => { fetchCycle(); fetchTestCases(); }}
      />

      {/* Remove Confirmation Dialog */}
      {isRemoveConfirmOpen && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            width: 420, backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF', borderRadius: 12,
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          }}>
            <div style={{
              padding: '20px 24px', borderBottom: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12, backgroundColor: '#FEF2F2',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Trash2 size={20} style={{ color: '#DC2626' }} />
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: isDark ? '#EDEDED' : '#0F172A', margin: 0 }}>
                Remove Test Cases
              </h2>
            </div>
            <div style={{ padding: 24 }}>
              <p style={{ fontSize: 14, color: isDark ? '#A1A1A1' : '#334155', margin: 0 }}>
                Are you sure you want to remove <strong>{selectedTestCaseIds.size}</strong> test case{selectedTestCaseIds.size !== 1 ? 's' : ''} from this cycle?
              </p>
              <p style={{ fontSize: 13, color: isDark ? '#878787' : '#64748B', margin: '12px 0 0' }}>
                The test cases will remain in the Test Repository. Any execution data for these test cases in this cycle will be lost.
              </p>
            </div>
            <div style={{
              padding: '16px 24px', borderTop: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`,
              display: 'flex', justifyContent: 'flex-end', gap: 12,
            }}>
              <button
                onClick={() => setIsRemoveConfirmOpen(false)}
                style={{ height: 40, padding: '0 20px', backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF', border: `1.5px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, borderRadius: 8, fontSize: 14, fontWeight: 500, color: isDark ? '#A1A1A1' : '#334155', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveTestCases}
                style={{
                  height: 40, padding: '0 20px',
                  background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                  border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
                  color: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                <Trash2 size={16} />
                Remove Test Cases
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
