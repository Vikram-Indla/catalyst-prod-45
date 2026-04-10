/**
 * QuickExecutionModal — Inline test execution from Test Cycle Detail Page
 * Allows marking a test case as Pass/Fail/Blocked/Skip with optional notes
 */
import { useState, useEffect } from 'react';
import {
  X, Play, CheckCircle2, XCircle, AlertTriangle,
  SkipForward, Clock, FileText, ChevronRight
} from 'lucide-react';
import { supabase, typedQuery } from '@/integrations/supabase/client';
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
    current_status: string;
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
          .from('tm_test_steps')
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
      const { error } = await typedQuery('tm_cycle_scope')
        .update({
          current_status: status,
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
        <span key={i} style={{ color: 'var(--cp-blue)', fontWeight: 600, backgroundColor: 'color-mix(in srgb, var(--cp-blue) 8%, transparent)', padding: '1px 4px', borderRadius: 4, fontSize: 13 }}>{part}</span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  if (!isOpen || !cycleTestCase) return null;

  const tc = cycleTestCase.test_case;
  if (!tc) return null;

  const priorityStyle = {
    critical: { color: 'var(--sem-danger)', bg: '#FEF2F2' },
    high:     { color: '#EA580C', bg: '#FFF7ED' },
    medium:   { color: 'var(--sem-warning)', bg: '#FFFBEB' },
    low:      { color: 'var(--sem-success)', bg: '#ECFDF5' },
  }[tc.priority?.toLowerCase()] || { color: 'var(--sem-warning)', bg: '#FFFBEB' };

  return (
    <div
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ width: 640, maxHeight: '85vh', backgroundColor: 'var(--cp-float)', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--divider)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flex: 1, minWidth: 0 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #10B981 0%, var(--sem-success) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Play size={20} style={{ color: '#FFFFFF' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--cp-blue)', backgroundColor: 'color-mix(in srgb, var(--cp-blue) 8%, transparent)', padding: '3px 8px', borderRadius: 4 }}>{tc.case_key}</span>
                <span style={{ fontSize: 11, fontWeight: 500, color: priorityStyle.color, backgroundColor: priorityStyle.bg, padding: '3px 8px', borderRadius: 4, textTransform: 'capitalize' as const }}>{tc.priority}</span>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--fg-1)', margin: 0, lineHeight: 1.4 }}>{tc.title}</h3>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, border: 'none', backgroundColor: 'transparent', color: 'var(--fg-4)', cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {/* Description */}
          {tc.description && (
            <div style={{ marginBottom: 20, padding: 14, backgroundColor: 'var(--bg-1)', borderRadius: 8, border: '1px solid var(--divider)' }}>
              <p style={{ fontSize: 14, color: 'var(--fg-2)', margin: 0, lineHeight: 1.6 }}>{highlightVars(tc.description)}</p>
            </div>
          )}

          {/* Steps */}
          {steps.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <FileText size={16} style={{ color: 'var(--fg-3)' }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-2)' }}>Steps ({steps.length})</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {steps.map((step, i) => (
                  <div key={i} style={{ padding: '12px 14px', backgroundColor: 'var(--cp-float)', border: '1px solid var(--divider)', borderRadius: 8 }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <span style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: 'color-mix(in srgb, var(--cp-blue) 8%, transparent)', color: 'var(--cp-blue)', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {step.step_number || i + 1}
                      </span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 14, color: 'var(--fg-2)', margin: 0, lineHeight: 1.5 }}>{highlightVars(step.action)}</p>
                        {step.expected_result && (
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 8 }}>
                            <ChevronRight size={14} style={{ color: 'var(--sem-success)', marginTop: 2, flexShrink: 0 }} />
                            <p style={{ fontSize: 13, color: 'var(--sem-success)', margin: 0, lineHeight: 1.5 }}>{highlightVars(step.expected_result)}</p>
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
            <p style={{ fontSize: 13, color: 'var(--fg-4)', textAlign: 'center', padding: 16 }}>Loading steps...</p>
          )}

          {/* Expected Result */}
          {tc.expected_result && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-2)', margin: '0 0 8px' }}>Expected Result</p>
              <div style={{ padding: 14, backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 8 }}>
                <p style={{ fontSize: 14, color: '#065F46', margin: 0, lineHeight: 1.5 }}>{highlightVars(tc.expected_result)}</p>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 6 }}>
              Execution Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any observations or notes..."
              rows={3}
              style={{
                width: '100%', padding: 12, border: '1.5px solid var(--divider)', borderRadius: 8,
                fontSize: 14, color: 'var(--fg-2)', resize: 'vertical', fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Footer - Action Buttons */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--divider)', backgroundColor: 'var(--bg-1)' }}>
          <p style={{ fontSize: 12, color: 'var(--fg-3)', margin: '0 0 12px', textAlign: 'center' }}>Record the test result</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
            <button onClick={() => handleExecute('passed')} disabled={isSubmitting}
              style={{ height: 44, padding: '0 24px', border: 'none', borderRadius: 8, background: 'linear-gradient(135deg, #10B981 0%, var(--sem-success) 100%)', color: 'var(--cp-float)', fontSize: 14, fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 2px 8px rgba(16,185,129,0.3)' }}>
              <CheckCircle2 size={18} /> Pass
            </button>
            <button onClick={() => handleExecute('failed')} disabled={isSubmitting}
              style={{ height: 44, padding: '0 24px', border: 'none', borderRadius: 8, background: 'linear-gradient(135deg, var(--sem-danger) 0%, var(--sem-danger) 100%)', color: 'var(--cp-float)', fontSize: 14, fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 2px 8px rgba(220,38,38,0.3)' }}>
              <XCircle size={18} /> Fail
            </button>
            <button onClick={() => handleExecute('blocked')} disabled={isSubmitting}
              style={{ height: 44, padding: '0 24px', border: 'none', borderRadius: 8, background: 'linear-gradient(135deg, #F59E0B 0%, var(--sem-warning) 100%)', color: 'var(--cp-float)', fontSize: 14, fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 2px 8px rgba(217,119,6,0.3)' }}>
              <AlertTriangle size={18} /> Blocked
            </button>
            <button onClick={() => handleExecute('skipped')} disabled={isSubmitting}
              style={{ height: 44, padding: '0 20px', border: '1.5px solid var(--divider)', borderRadius: 8, backgroundColor: 'var(--cp-float)', color: 'var(--fg-3)', fontSize: 14, fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8 }}>
              <SkipForward size={18} /> Skip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
