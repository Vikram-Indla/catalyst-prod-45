/**
 * TestHub Test Execution Page
 * Route: /testhub/cycles/:cycleId/execute
 * Full-screen split layout for executing test cases in a cycle.
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, Play, Clock, CheckCircle2, XCircle, 
  AlertTriangle, SkipForward, User, Timer
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';
import { ExecutionTestCaseView } from '@/components/testhub/ExecutionTestCaseView';
import { ExecutionActionBar } from '@/components/testhub/ExecutionActionBar';
import { FailureReasonModal } from '@/components/testhub/FailureReasonModal';

interface TestCycle {
  id: string;
  cycle_key: string;
  name: string;
  status: string;
  progress_percent: number;
  total_cases: number;
  passed_count: number;
  failed_count: number;
  blocked_count: number;
  skipped_count: number;
  not_run_count: number;
}

interface CycleTestCase {
  id: string;
  cycle_id: string;
  test_case_id: string;
  execution_status: string;
  executed_at: string | null;
  executed_by: string | null;
  assigned_to: string | null;
  notes: string | null;
  execution_time_seconds: number;
  failure_reason: string | null;
  started_at: string | null;
  defect_ids: string[] | null;
  test_case: {
    id: string;
    case_key: string;
    title: string;
    objective: string | null;
    preconditions: string | null;
    priority: string;
    type: string;
    steps?: any[];
  } | null;
  assignee?: { id: string; full_name: string } | null;
}

export default function TestHubExecutionPage() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [cycle, setCycle] = useState<TestCycle | null>(null);
  const [testCases, setTestCases] = useState<CycleTestCase[]>([]);
  const [selectedTestCaseId, setSelectedTestCaseId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showMyTestsOnly, setShowMyTestsOnly] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFailureModalOpen, setIsFailureModalOpen] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getUser();
  }, []);

  const fetchCycle = async () => {
    if (!cycleId) return;
    try {
      const { data, error } = await supabase.from('th_test_cycles').select('*').eq('id', cycleId).single();
      if (error) throw error;
      // @ts-ignore - steps added dynamically
      setCycle(data);
    } catch { catalystToast.error('Failed to load cycle'); }
  };

  const fetchTestCases = async () => {
    if (!cycleId) return;
    try {
      const { data, error } = await supabase
        .from('th_cycle_test_cases')
        .select(`*, test_case:th_test_cases ( id, case_key, title, objective, preconditions, priority, type ), assignee:profiles!th_cycle_test_cases_assigned_to_fkey ( id, full_name )`)
        .eq('cycle_id', cycleId)
        .order('created_at');
      
      // Fetch steps for all test cases
      if (data && data.length > 0) {
        const testCaseIds = data.map(tc => tc.test_case?.id).filter(Boolean);
        const { data: stepsData } = await supabase
          .from('th_test_steps')
          .select('*')
          .in('test_case_id', testCaseIds)
          .order('step_number');
        
        // Attach steps to test cases
        if (stepsData) {
          const stepsMap = new Map<string, any[]>();
          stepsData.forEach(s => {
            if (!stepsMap.has(s.test_case_id)) stepsMap.set(s.test_case_id, []);
            stepsMap.get(s.test_case_id)!.push(s);
          });
          data.forEach(tc => {
            if (tc.test_case) {
              (tc.test_case as any).steps = stepsMap.get(tc.test_case.id) || [];
              (tc.test_case as any).description = tc.test_case.objective;
            }
          });
        }
      }
      if (error) throw error;
      setTestCases(data || []);
      if (data && data.length > 0 && !selectedTestCaseId) {
        const testIdFromUrl = searchParams.get('testId');
        const matchFromUrl = testIdFromUrl ? data.find(tc => tc.id === testIdFromUrl) : null;
        setSelectedTestCaseId(matchFromUrl ? matchFromUrl.id : data[0].id);
      }
    } catch { /* ignore */ }
    finally { setIsLoading(false); }
  };

  const fetchAttachments = async () => {
    if (!selectedTestCaseId) return;
    try {
      const { data, error } = await supabase.from('th_execution_attachments').select('*').eq('cycle_test_case_id', selectedTestCaseId).order('uploaded_at', { ascending: false });
      if (!error) setAttachments(data || []);
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchCycle(); fetchTestCases(); }, [cycleId]);
  useEffect(() => { if (selectedTestCaseId) fetchAttachments(); }, [selectedTestCaseId]);

  // Timer
  useEffect(() => {
    if (!selectedTestCaseId) return;
    const currentTC = testCases.find(tc => tc.id === selectedTestCaseId);
    setElapsedTime(currentTC?.execution_time_seconds || 0);
    const interval = setInterval(() => setElapsedTime(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [selectedTestCaseId]);

  const filteredTestCases = testCases.filter(tc => {
    if (statusFilter !== 'all' && tc.execution_status !== statusFilter) return false;
    if (showMyTestsOnly && tc.assigned_to !== currentUserId) return false;
    return true;
  });

  const currentTestCase = testCases.find(tc => tc.id === selectedTestCaseId);
  const currentIndex = filteredTestCases.findIndex(tc => tc.id === selectedTestCaseId);

  const statusConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
    not_run: { icon: Clock, color: '#64748B', bg: '#F1F5F9', label: 'Not Run' },
    passed: { icon: CheckCircle2, color: '#059669', bg: '#ECFDF5', label: 'Passed' },
    failed: { icon: XCircle, color: '#DC2626', bg: '#FEF2F2', label: 'Failed' },
    blocked: { icon: AlertTriangle, color: '#D97706', bg: '#FFFBEB', label: 'Blocked' },
    skipped: { icon: SkipForward, color: '#94A3B8', bg: '#F8FAFC', label: 'Skipped' },
  };

  const handleExit = () => navigate(`/testhub/cycles/${cycleId}`);

  const handlePrevious = () => {
    if (currentIndex > 0) setSelectedTestCaseId(filteredTestCases[currentIndex - 1].id);
  };
  const handleNext = () => {
    if (currentIndex < filteredTestCases.length - 1) setSelectedTestCaseId(filteredTestCases[currentIndex + 1].id);
  };

  const updateExecutionStatus = async (status: string, failureReason?: string, failureNotes?: string, defectId?: string | null) => {
    if (!selectedTestCaseId || !currentUserId) return;
    setIsSubmitting(true);
    try {
      const updateData: any = {
        execution_status: status,
        executed_at: new Date().toISOString(),
        executed_by: currentUserId,
        execution_time_seconds: elapsedTime,
        updated_at: new Date().toISOString(),
      };
      if (failureReason) updateData.failure_reason = failureReason;
      if (failureNotes) {
        const existing = currentTestCase?.notes || '';
        updateData.notes = existing ? `${existing}\n\n[Failure Notes] ${failureNotes}` : `[Failure Notes] ${failureNotes}`;
      }
      if (defectId) {
        const existing = currentTestCase?.defect_ids || [];
        updateData.defect_ids = [...existing, defectId];
      }
      if (status === 'not_run') {
        updateData.executed_at = null;
        updateData.executed_by = null;
        updateData.failure_reason = null;
        updateData.execution_time_seconds = 0;
      }

      const { error } = await supabase.from('th_cycle_test_cases').update(updateData).eq('id', selectedTestCaseId);
      if (error) { catalystToast.error('Failed to update test result'); return; }

      const toastMap: Record<string, () => void> = {
        passed: () => catalystToast.success('Test case marked as passed', { title: 'Test Passed' }),
        failed: () => catalystToast.error('Test case marked as failed', { title: 'Test Failed' }),
        blocked: () => catalystToast.warning('Test case marked as blocked', { title: 'Test Blocked' }),
        skipped: () => catalystToast.info('Test case skipped', { title: 'Test Skipped' }),
        not_run: () => catalystToast.info('Test case reset to not run', { title: 'Reset' }),
      };
      toastMap[status]?.();

      await fetchTestCases();
      await fetchCycle();
      setElapsedTime(0);

      if (status !== 'not_run' && currentIndex < filteredTestCases.length - 1) {
        setTimeout(() => handleNext(), 300);
      }
    } catch (err: any) { catalystToast.error(err.message || 'Failed to update test result'); }
    finally { setIsSubmitting(false); }
  };

  const handlePass = () => updateExecutionStatus('passed');
  const handleFail = () => setIsFailureModalOpen(true);
  const handleBlocked = () => updateExecutionStatus('blocked');
  const handleSkip = () => updateExecutionStatus('skipped');
  const handleReset = () => updateExecutionStatus('not_run');

  const handleFailureConfirm = async (failureReason: string, defectId: string | null, failureNotes: string) => {
    setIsFailureModalOpen(false);
    await updateExecutionStatus('failed', failureReason, failureNotes, defectId);
  };

  const handleNotesChange = async (notes: string) => {
    if (!selectedTestCaseId) return;
    try { await supabase.from('th_cycle_test_cases').update({ notes, updated_at: new Date().toISOString() }).eq('id', selectedTestCaseId); }
    catch { /* ignore */ }
  };

  if (isLoading || !cycle) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#F8FAFC' }}>
        <div style={{ textAlign: 'center', color: '#64748B' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          Loading execution mode...
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#F8FAFC' }}>
      {/* Header */}
      <div style={{ height: 60, padding: '0 24px', backgroundColor: '#FFFFFF', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={handleExit} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, backgroundColor: '#FFFFFF', color: '#64748B', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            <ArrowLeft size={16} /> Exit
          </button>
          <div style={{ height: 24, width: 1, backgroundColor: '#E2E8F0' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Play size={20} style={{ color: '#10B981' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '2px 8px', borderRadius: 4 }}>{cycle.cycle_key}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{cycle.name}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { count: cycle.passed_count, color: '#059669', bg: '#ECFDF5', Icon: CheckCircle2 },
              { count: cycle.failed_count, color: '#DC2626', bg: '#FEF2F2', Icon: XCircle },
              { count: cycle.blocked_count, color: '#D97706', bg: '#FFFBEB', Icon: AlertTriangle },
            ].map((s, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', backgroundColor: s.bg, borderRadius: 6, fontSize: 12, fontWeight: 600, color: s.color }}>
                <s.Icon size={14} /> {s.count}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 120, height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${cycle.progress_percent}%`, background: 'linear-gradient(90deg, #10B981 0%, #059669 100%)', borderRadius: 4, transition: 'width 0.3s ease' }} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#059669' }}>{cycle.progress_percent}%</span>
          </div>
        </div>
      </div>

      {/* Main Content - Split */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Sidebar */}
        <div style={{ width: 320, backgroundColor: '#FFFFFF', borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: 16, borderBottom: '1px solid #E2E8F0' }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Test Queue</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                style={{ flex: 1, height: 32, padding: '0 8px', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 12, color: '#334155', backgroundColor: '#FFFFFF' }}>
                <option value="all">All Status</option>
                <option value="not_run">Not Run</option>
                <option value="passed">Passed</option>
                <option value="failed">Failed</option>
                <option value="blocked">Blocked</option>
                <option value="skipped">Skipped</option>
              </select>
              <button onClick={() => setShowMyTestsOnly(!showMyTestsOnly)}
                style={{ height: 32, padding: '0 10px', border: `1px solid ${showMyTestsOnly ? '#2563EB' : '#E2E8F0'}`, borderRadius: 6, backgroundColor: showMyTestsOnly ? '#EFF6FF' : '#FFFFFF', color: showMyTestsOnly ? '#2563EB' : '#64748B', fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <User size={14} /> My Tests
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
            {filteredTestCases.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>No test cases match the filter</div>
            ) : (
              filteredTestCases.map(tc => {
                const st = statusConfig[tc.execution_status];
                const StatusIcon = st.icon;
                const isSelected = tc.id === selectedTestCaseId;
                return (
                  <button key={tc.id} onClick={() => setSelectedTestCaseId(tc.id)}
                    style={{ width: '100%', padding: 12, marginBottom: 4, border: isSelected ? '2px solid #2563EB' : '1px solid transparent', borderRadius: 8, backgroundColor: isSelected ? '#EFF6FF' : 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: st.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <StatusIcon size={16} style={{ color: st.color }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#2563EB' }}>{tc.test_case?.case_key}</span>
                          {tc.assignee && <span style={{ fontSize: 10, color: '#94A3B8' }}>• {tc.assignee.full_name}</span>}
                        </div>
                        <p style={{ fontSize: 13, fontWeight: isSelected ? 600 : 400, color: isSelected ? '#1E40AF' : '#334155', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {tc.test_case?.title}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div style={{ padding: 16, borderTop: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: '#64748B' }}>Progress</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{cycle.total_cases - cycle.not_run_count}/{cycle.total_cases}</span>
            </div>
            <div style={{ height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${cycle.progress_percent}%`, background: 'linear-gradient(90deg, #10B981 0%, #059669 100%)', borderRadius: 3 }} />
            </div>
          </div>
        </div>

        {/* Right Main */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {currentTestCase ? (
            <>
              <ExecutionTestCaseView
                cycleTestCase={currentTestCase as any}
                attachments={attachments}
                elapsedTime={elapsedTime}
                onNotesChange={handleNotesChange}
                onAttachmentsChange={fetchAttachments}
              />
              <ExecutionActionBar
                currentIndex={currentIndex}
                totalCount={filteredTestCases.length}
                currentStatus={currentTestCase.execution_status}
                onPrevious={handlePrevious}
                onNext={handleNext}
                onPass={handlePass}
                onFail={handleFail}
                onBlocked={handleBlocked}
                onSkip={handleSkip}
                onReset={handleReset}
                isSubmitting={isSubmitting}
                canGoPrevious={currentIndex > 0}
                canGoNext={currentIndex < filteredTestCases.length - 1}
              />
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
              <div style={{ textAlign: 'center' }}>
                <Clock size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
                <p style={{ fontSize: 16, margin: 0 }}>Select a test case from the queue to begin execution</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <FailureReasonModal
        isOpen={isFailureModalOpen}
        testCaseKey={currentTestCase?.test_case?.case_key || ''}
        testCaseTitle={currentTestCase?.test_case?.title || ''}
        onClose={() => setIsFailureModalOpen(false)}
        onConfirm={handleFailureConfirm}
      />
    </div>
  );
}
