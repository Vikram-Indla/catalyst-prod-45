/**
 * QuickExecutionModal — Inline test execution from Test Cycle Detail Page
 * Allows marking a test case as Pass/Fail/Blocked/Skip with optional notes
 */
import { useState, useEffect } from 'react';
import {
  X, Play, CheckCircle2, XCircle, AlertTriangle,
  SkipForward, Clock, FileText, ChevronRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';

interface TestStep {
  step_number: number;
  action: string;
  expected_result?: string;
}

interface QuickExecutionModalProps {
  isOpen: boolean;
  cycleTestCase: {
    id: string;
    execution_status: string;
    notes: string | null;
    test_case_id: string;
    test_case: {
      id: string;
      case_key: string;
      title: string;
      description?: string | null;
      expected_result?: string | null;
      priority: string;
      type?: string;
    } | null;
  } | null;
  onClose: () => void;
  onSuccess: () => void;
}

type ExecutionStatus = 'passed' | 'failed' | 'blocked' | 'skipped';

export function QuickExecutionModal({
  isOpen,
  cycleTestCase,
  onClose,
  onSuccess,
}: QuickExecutionModalProps) {
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [steps, setSteps] = useState<TestStep[]>([]);
  const [loadingSteps, setLoadingSteps] = useState(false);

  useEffect(() => {
    if (isOpen && cycleTestCase) {
      setNotes(cycleTestCase.notes || '');
      // Fetch steps
      if (cycleTestCase.test_case_id) {
        setLoadingSteps(true);
        supabase
          .from('th_test_steps')
          .select('step_number, action, expected_result')
          .eq('test_case_id', cycleTestCase.test_case_id)
          .order('step_number')
          .then(({ data }) => {
            setSteps(data || []);
            setLoadingSteps(false);
          });
      }
    } else {
      setSteps([]);
    }
  }, [isOpen, cycleTestCase]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleExecute = async (status: ExecutionStatus) => {
    if (!cycleTestCase || !currentUserId) return;
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('th_cycle_test_cases')
        .update({
          execution_status: status,
          executed_at: new Date().toISOString(),
          executed_by: currentUserId,
          notes: notes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', cycleTestCase.id);

      if (error) throw new Error(error.message);

      const caseKey = cycleTestCase.test_case?.case_key || '';
      const messages: Record<ExecutionStatus, { title: string; msg: string; fn: 'success' | 'error' | 'warning' | 'info' }> = {
        passed:  { title: 'Test Passed',  msg: `${caseKey} marked as passed`,  fn: 'success' },
        failed:  { title: 'Test Failed',  msg: `${caseKey} marked as failed`,  fn: 'error' },
        blocked: { title: 'Test Blocked', msg: `${caseKey} marked as blocked`, fn: 'warning' },
        skipped: { title: 'Test Skipped', msg: `${caseKey} skipped`,           fn: 'info' },
      };
      const t = messages[status];
      catalystToast[t.fn](t.msg, { title: t.title });

      onSuccess();
      onClose();
    } catch (err: any) {
      catalystToast.error(err.message || 'Failed to execute test');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Variable highlighting
  const highlightVars = (text: string | null | undefined) => {
    if (!text) return null;
    const parts = text.split(/(\{[a-zA-Z_][a-zA-Z0-9_]*\})/g);
    return parts.map((part, i) =>
      part.match(/^\{[a-zA-Z_][a-zA-Z0-9_]*\}$/) ? (
        <span key={i} style={{ color: '#2563EB', fontWeight: 600, backgroundColor: '#EFF6FF', padding: '1px 4px', borderRadius: 3, fontSize: 13 }}>{part}</span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  if (!isOpen || !cycleTestCase) return null;

  const tc = cycleTestCase.test_case;
  if (!tc) return null;

  const priorityStyle = {
    critical: { color: '#DC2626', bg: '#FEF2F2' },
    high:     { color: '#EA580C', bg: '#FFF7ED' },
    medium:   { color: '#D97706', bg: '#FFFBEB' },
    low:      { color: '#059669', bg: '#ECFDF5' },
  }[tc.priority?.toLowerCase()] || { color: '#D97706', bg: '#FFFBEB' };

  return (
    <div
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ width: 640, maxHeight: '85vh', backgroundColor: '#FFFFFF', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flex: 1, minWidth: 0 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Play size={20} style={{ color: '#FFFFFF' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '3px 8px', borderRadius: 4 }}>{tc.case_key}</span>
                <span style={{ fontSize: 11, fontWeight: 500, color: priorityStyle.color, backgroundColor: priorityStyle.bg, padding: '3px 8px', borderRadius: 4, textTransform: 'capitalize' as const }}>{tc.priority}</span>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', margin: 0, lineHeight: 1.4 }}>{tc.title}</h3>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, border: 'none', backgroundColor: 'transparent', color: '#94A3B8', cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {/* Description */}
          {tc.description && (
            <div style={{ marginBottom: 20, padding: 14, backgroundColor: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
              <p style={{ fontSize: 14, color: '#334155', margin: 0, lineHeight: 1.6 }}>{highlightVars(tc.description)}</p>
            </div>
          )}

          {/* Steps */}
          {steps.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <FileText size={16} style={{ color: '#64748B' }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>Steps ({steps.length})</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {steps.map((step, i) => (
                  <div key={i} style={{ padding: '12px 14px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8 }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <span style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: '#EFF6FF', color: '#2563EB', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {step.step_number || i + 1}
                      </span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 14, color: '#334155', margin: 0, lineHeight: 1.5 }}>{highlightVars(step.action)}</p>
                        {step.expected_result && (
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 8 }}>
                            <ChevronRight size={14} style={{ color: '#059669', marginTop: 2, flexShrink: 0 }} />
                            <p style={{ fontSize: 13, color: '#059669', margin: 0, lineHeight: 1.5 }}>{highlightVars(step.expected_result)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loadingSteps && (
            <p style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', padding: 16 }}>Loading steps...</p>
          )}

          {/* Expected Result */}
          {tc.expected_result && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#334155', margin: '0 0 8px' }}>Expected Result</p>
              <div style={{ padding: 14, backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 8 }}>
                <p style={{ fontSize: 14, color: '#065F46', margin: 0, lineHeight: 1.5 }}>{highlightVars(tc.expected_result)}</p>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              Execution Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any observations or notes..."
              rows={3}
              style={{
                width: '100%', padding: 12, border: '1.5px solid #E2E8F0', borderRadius: 8,
                fontSize: 14, color: '#334155', resize: 'vertical', fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Footer - Action Buttons */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
          <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 12px', textAlign: 'center' }}>Record the test result</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
            <button onClick={() => handleExecute('passed')} disabled={isSubmitting}
              style={{ height: 44, padding: '0 24px', border: 'none', borderRadius: 8, background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: '#FFFFFF', fontSize: 14, fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 2px 8px rgba(16,185,129,0.3)' }}>
              <CheckCircle2 size={18} /> Pass
            </button>
            <button onClick={() => handleExecute('failed')} disabled={isSubmitting}
              style={{ height: 44, padding: '0 24px', border: 'none', borderRadius: 8, background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)', color: '#FFFFFF', fontSize: 14, fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 2px 8px rgba(220,38,38,0.3)' }}>
              <XCircle size={18} /> Fail
            </button>
            <button onClick={() => handleExecute('blocked')} disabled={isSubmitting}
              style={{ height: 44, padding: '0 24px', border: 'none', borderRadius: 8, background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', color: '#FFFFFF', fontSize: 14, fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 2px 8px rgba(217,119,6,0.3)' }}>
              <AlertTriangle size={18} /> Blocked
            </button>
            <button onClick={() => handleExecute('skipped')} disabled={isSubmitting}
              style={{ height: 44, padding: '0 20px', border: '1.5px solid #E2E8F0', borderRadius: 8, backgroundColor: '#FFFFFF', color: '#64748B', fontSize: 14, fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8 }}>
              <SkipForward size={18} /> Skip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
