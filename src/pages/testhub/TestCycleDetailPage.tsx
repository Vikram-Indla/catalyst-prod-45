/**
 * Test Cycle Detail Page — TestHub Module
 * Route: /testhub/cycles/:cycleId
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Pencil, Play, CheckCircle2, XCircle, AlertTriangle,
  Clock, Plus, User, Calendar, RefreshCw, Trash2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';
import { AddTestCasesModal } from '@/components/testhub/AddTestCasesModal';
import { EditTestCycleModal } from '@/components/testhub/EditTestCycleModal';
import { AssignTesterModal } from '@/components/testhub/AssignTesterModal';

interface TestCycle {
  id: string;
  cycle_key: string;
  name: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  progress_percent: number;
  total_cases: number;
  passed_count: number;
  failed_count: number;
  blocked_count: number;
  skipped_count: number;
  not_run_count: number;
  owner?: { id: string; full_name: string };
}

interface CycleTestCase {
  id: string;
  cycle_id: string;
  test_case_id: string;
  execution_status: string;
  executed_at: string | null;
  notes: string | null;
  assigned_to: string | null;
  test_case: { id: string; case_key: string; title: string; priority: string; type: string } | null;
  assignee?: { id: string; full_name: string } | null;
}

const statusConfig = {
  draft: { label: 'Draft', color: '#64748B', bg: '#F1F5F9' },
  active: { label: 'Active', color: '#059669', bg: '#ECFDF5' },
  completed: { label: 'Completed', color: '#2563EB', bg: '#EFF6FF' },
  archived: { label: 'Archived', color: '#94A3B8', bg: '#F8FAFC' },
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
  const [cycle, setCycle] = useState<TestCycle | null>(null);
  const [testCases, setTestCases] = useState<CycleTestCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Selection state for G3-10 & G3-11
  const [selectedTestCaseIds, setSelectedTestCaseIds] = useState<Set<string>>(new Set());
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false);

  const fetchCycle = async () => {
    if (!cycleId) return;
    try {
      const { data, error } = await supabase.from('th_test_cycles')
        .select(`*, owner:profiles!th_test_cycles_owner_id_fkey ( id, full_name )`)
        .eq('id', cycleId).single();
      if (error) throw error;
      setCycle(data);
    } catch { catalystToast.error('Failed to load cycle'); }
  };

  const fetchTestCases = async () => {
    if (!cycleId) return;
    try {
      const { data, error } = await supabase.from('th_cycle_test_cases')
        .select(`*, test_case:th_test_cases ( id, case_key, title, priority, type ), assignee:profiles!th_cycle_test_cases_assigned_to_fkey ( id, full_name )`)
        .eq('cycle_id', cycleId).order('created_at');
      if (error) throw error;
      setTestCases(data || []);
    } catch { /* ignore */ }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchCycle(); fetchTestCases(); }, [cycleId]);

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  const filteredTestCases = statusFilter === 'all' ? testCases : testCases.filter(tc => tc.execution_status === statusFilter);

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
      const { error } = await supabase
        .from('th_cycle_test_cases')
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', backgroundColor: '#F8FAFC' }}>
        <div style={{ textAlign: 'center', color: '#64748B' }}>
          <div style={{ width: 32, height: 32, border: '3px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          Loading cycle...
        </div>
      </div>
    );
  }

  const status = statusConfig[cycle.status];
  const canEdit = cycle.status === 'draft' || cycle.status === 'active';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#F8FAFC' }}>
      {/* Header */}
      <div style={{ padding: '20px 32px', backgroundColor: '#FFFFFF', borderBottom: '1px solid #E2E8F0' }}>
        <button onClick={() => navigate('/testhub/cycles')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 0, border: 'none', backgroundColor: 'transparent', color: '#64748B', fontSize: 13, fontWeight: 500, cursor: 'pointer', marginBottom: 16 }}>
          <ArrowLeft size={16} /> Back to Cycles
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '4px 10px', borderRadius: 6 }}>{cycle.cycle_key}</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: status.color, backgroundColor: status.bg, padding: '4px 10px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: status.color }} />{status.label}
              </span>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', margin: '0 0 8px' }}>{cycle.name}</h1>
            {cycle.description && <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 8px', maxWidth: 600 }}>{cycle.description}</p>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, color: '#64748B' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={14} />{formatDate(cycle.start_date)} — {formatDate(cycle.end_date)}</span>
              {cycle.owner && <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><User size={14} />{cycle.owner.full_name}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setIsLoading(true); fetchCycle(); fetchTestCases(); catalystToast.success('Refreshed'); }} title="Refresh"
              style={{ width: 40, height: 40, padding: 0, border: '1.5px solid #E2E8F0', borderRadius: 8, backgroundColor: '#FFFFFF', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RefreshCw size={18} />
            </button>
            {canEdit && (
              <button onClick={() => setIsEditModalOpen(true)}
                style={{ height: 40, padding: '0 16px', border: '1.5px solid #E2E8F0', borderRadius: 8, backgroundColor: '#FFFFFF', color: '#334155', fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Pencil size={16} /> Edit
              </button>
            )}
            {cycle.status === 'active' && (
              <button onClick={() => catalystToast.info('Execute mode coming in Group 4')}
                style={{ height: 40, padding: '0 16px', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', border: 'none', borderRadius: 8, color: '#FFFFFF', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Play size={16} /> Execute Tests
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ padding: '24px 32px', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20, textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, margin: '0 auto 12px', position: 'relative' }}>
            <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
              <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#E2E8F0" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.9155" fill="none" stroke={cycle.progress_percent === 100 ? '#059669' : '#2563EB'} strokeWidth="3" strokeDasharray={`${cycle.progress_percent} ${100 - cycle.progress_percent}`} strokeLinecap="round" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: cycle.progress_percent === 100 ? '#059669' : '#2563EB' }}>
              {cycle.progress_percent}%
            </div>
          </div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#334155', margin: 0 }}>Progress</p>
          <p style={{ fontSize: 12, color: '#94A3B8', margin: '4px 0 0' }}>{cycle.total_cases - cycle.not_run_count}/{cycle.total_cases} executed</p>
        </div>
        <div style={{ backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 12, padding: 20, textAlign: 'center' }}>
          <CheckCircle2 size={32} style={{ color: '#059669', marginBottom: 8 }} />
          <p style={{ fontSize: 28, fontWeight: 700, color: '#059669', margin: 0 }}>{cycle.passed_count}</p>
          <p style={{ fontSize: 13, color: '#059669', margin: '4px 0 0' }}>Passed</p>
        </div>
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: 20, textAlign: 'center' }}>
          <XCircle size={32} style={{ color: '#DC2626', marginBottom: 8 }} />
          <p style={{ fontSize: 28, fontWeight: 700, color: '#DC2626', margin: 0 }}>{cycle.failed_count}</p>
          <p style={{ fontSize: 13, color: '#DC2626', margin: '4px 0 0' }}>Failed</p>
        </div>
        <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: 20, textAlign: 'center' }}>
          <AlertTriangle size={32} style={{ color: '#D97706', marginBottom: 8 }} />
          <p style={{ fontSize: 28, fontWeight: 700, color: '#D97706', margin: 0 }}>{cycle.blocked_count}</p>
          <p style={{ fontSize: 13, color: '#D97706', margin: '4px 0 0' }}>Blocked</p>
        </div>
        <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20, textAlign: 'center' }}>
          <Clock size={32} style={{ color: '#64748B', marginBottom: 8 }} />
          <p style={{ fontSize: 28, fontWeight: 700, color: '#64748B', margin: 0 }}>{cycle.not_run_count}</p>
          <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>Not Run</p>
        </div>
      </div>

      {/* Test Cases Section */}
      <div style={{ flex: 1, padding: '0 32px 32px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {/* Section Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', margin: 0 }}>
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
                    <button onClick={deselectAllTestCases} style={{ padding: '4px 8px', border: 'none', backgroundColor: 'transparent', color: '#64748B', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                      Clear
                    </button>
                  </>
                ) : (
                  <button onClick={selectAllTestCases} style={{ padding: '4px 8px', border: 'none', backgroundColor: 'transparent', color: '#64748B', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
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
                  height: 36, padding: '0 14px', border: '1.5px solid #C7D2FE', borderRadius: 8,
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
                  height: 36, padding: '0 14px', border: '1.5px solid #FECACA', borderRadius: 8,
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
              style={{ height: 36, padding: '0 12px', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 13, color: '#334155', backgroundColor: '#FFFFFF' }}>
              <option value="all">All Statuses</option>
              <option value="not_run">Not Run</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
              <option value="blocked">Blocked</option>
            </select>
            {/* Add Test Cases Button */}
            {canEdit && (
              <button onClick={() => setIsAddModalOpen(true)} style={{ height: 36, padding: '0 14px', background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', border: 'none', borderRadius: 8, color: '#FFFFFF', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Plus size={16} /> Add Test Cases
              </button>
            )}
          </div>
        </div>

        <div style={{ flex: 1, backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {testCases.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', padding: 40 }}>
              <Clock size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
              <p style={{ fontSize: 16, fontWeight: 500, margin: '0 0 8px', color: '#64748B' }}>No test cases added yet</p>
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
                  <tr style={{ backgroundColor: '#F8FAFC' }}>
                    {/* Checkbox Header */}
                    {canEdit && (
                      <th style={{ padding: '14px 16px', textAlign: 'center', borderBottom: '1px solid #E2E8F0', width: 50 }}>
                        <input
                          type="checkbox"
                          checked={filteredTestCases.length > 0 && filteredTestCases.every(tc => selectedTestCaseIds.has(tc.id))}
                          onChange={(e) => { if (e.target.checked) selectAllTestCases(); else deselectAllTestCases(); }}
                          style={{ width: 16, height: 16, accentColor: '#2563EB' }}
                        />
                      </th>
                    )}
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #E2E8F0' }}>Test Case</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #E2E8F0', width: 100 }}>Priority</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #E2E8F0', width: 140 }}>Assigned To</th>
                    <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #E2E8F0', width: 120 }}>Status</th>
                    <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #E2E8F0', width: 100 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTestCases.map((ctc, index) => {
                    const execStatus = executionStatusConfig[ctc.execution_status] || executionStatusConfig.not_run;
                    const StatusIcon = execStatus.Icon;
                    const priority = priorityConfig[ctc.test_case?.priority?.toLowerCase() || ''] || priorityConfig.medium;
                    const isSelected = selectedTestCaseIds.has(ctc.id);
                    return (
                      <tr key={ctc.id} style={{ borderBottom: index < filteredTestCases.length - 1 ? '1px solid #F1F5F9' : 'none', backgroundColor: isSelected ? '#EFF6FF' : 'transparent' }}>
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
                            <span style={{ fontSize: 14, color: '#334155' }}>{ctc.test_case?.title || 'Unknown'}</span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontSize: 12, fontWeight: 500, color: priority.color, backgroundColor: priority.bg, padding: '4px 8px', borderRadius: 4, textTransform: 'capitalize' as const }}>{ctc.test_case?.priority || 'Medium'}</span>
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
                              cursor: 'pointer', fontSize: 13, color: ctc.assignee ? '#334155' : '#94A3B8',
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
                          {cycle.status === 'active' && ctc.execution_status === 'not_run' && (
                            <button onClick={() => catalystToast.info('Execute coming in Group 4')} style={{ height: 30, padding: '0 12px', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', border: 'none', borderRadius: 6, color: '#FFFFFF', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
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
      <EditTestCycleModal
        isOpen={isEditModalOpen}
        cycle={cycle}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={() => { fetchCycle(); setIsEditModalOpen(false); }}
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

      {/* Remove Confirmation Dialog */}
      {isRemoveConfirmOpen && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            width: 420, backgroundColor: '#FFFFFF', borderRadius: 12,
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          }}>
            <div style={{
              padding: '20px 24px', borderBottom: '1px solid #E2E8F0',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, backgroundColor: '#FEF2F2',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Trash2 size={20} style={{ color: '#DC2626' }} />
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Remove Test Cases
              </h2>
            </div>
            <div style={{ padding: 24 }}>
              <p style={{ fontSize: 14, color: '#334155', margin: 0 }}>
                Are you sure you want to remove <strong>{selectedTestCaseIds.size}</strong> test case{selectedTestCaseIds.size !== 1 ? 's' : ''} from this cycle?
              </p>
              <p style={{ fontSize: 13, color: '#64748B', margin: '12px 0 0' }}>
                The test cases will remain in the Test Repository. Any execution data for these test cases in this cycle will be lost.
              </p>
            </div>
            <div style={{
              padding: '16px 24px', borderTop: '1px solid #E2E8F0',
              display: 'flex', justifyContent: 'flex-end', gap: 12,
            }}>
              <button
                onClick={() => setIsRemoveConfirmOpen(false)}
                style={{ height: 40, padding: '0 20px', backgroundColor: '#FFFFFF', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 14, fontWeight: 500, color: '#334155', cursor: 'pointer' }}
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
