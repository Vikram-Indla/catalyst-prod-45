import { useState, useEffect } from 'react';
import { 
  Clock, AlertTriangle, FileText, List, Target, Timer, History
} from 'lucide-react';
import { ExecutionAttachments } from './ExecutionAttachments';
import { ExecutionHistoryModal } from './ExecutionHistoryModal';

interface TestStep {
  step_number: number;
  action: string;
  expected_result?: string;
  shared_step_id?: string;
}

interface TestCase {
  id: string;
  case_key: string;
  title: string;
  description: string | null;
  preconditions: string | null;
  steps: TestStep[];
  expected_result: string | null;
  priority: string;
  type: string;
}

interface CycleTestCase {
  id: string;
  execution_status: 'not_run' | 'passed' | 'failed' | 'blocked' | 'skipped';
  notes: string | null;
  execution_time_seconds: number;
  started_at: string | null;
  test_case: TestCase;
  assignee?: { id: string; full_name: string };
}

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_at: string;
}

interface ExecutionTestCaseViewProps {
  cycleTestCase: CycleTestCase;
  attachments: Attachment[];
  elapsedTime: number;
  onNotesChange: (notes: string) => void;
  onAttachmentsChange: () => void;
}

export function ExecutionTestCaseView({
  cycleTestCase,
  attachments,
  elapsedTime,
  onNotesChange,
  onAttachmentsChange,
}: ExecutionTestCaseViewProps) {
  const [notes, setNotes] = useState(cycleTestCase.notes || '');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  useEffect(() => {
    setNotes(cycleTestCase.notes || '');
  }, [cycleTestCase.id, cycleTestCase.notes]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (notes !== (cycleTestCase.notes || '')) {
        onNotesChange(notes);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [notes]);

  const testCase = cycleTestCase.test_case;

  const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
    not_run: { color: '#64748B', bg: '#F1F5F9', label: 'Not Run' },
    passed: { color: '#059669', bg: '#ECFDF5', label: 'Passed' },
    failed: { color: '#DC2626', bg: '#FEF2F2', label: 'Failed' },
    blocked: { color: '#D97706', bg: '#FFFBEB', label: 'Blocked' },
    skipped: { color: '#94A3B8', bg: '#F8FAFC', label: 'Skipped' },
  };

  const priorityConfig: Record<string, { color: string; bg: string }> = {
    critical: { color: '#DC2626', bg: '#FEF2F2' },
    high: { color: '#EA580C', bg: '#FFF7ED' },
    medium: { color: '#D97706', bg: '#FFFBEB' },
    low: { color: '#059669', bg: '#ECFDF5' },
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const highlightVariables = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\{\{[^}]+\}\})/g);
    return parts.map((part, index) => {
      if (part.match(/^\{\{[^}]+\}\}$/)) {
        return (
          <span key={index} style={{ backgroundColor: '#DBEAFE', color: '#1D4ED8', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace', fontSize: '0.9em' }}>
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const status = statusConfig[cycleTestCase.execution_status];
  const priority = priorityConfig[testCase?.priority?.toLowerCase()] || priorityConfig.medium;

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '6px 14px', borderRadius: 6 }}>
              {testCase?.case_key}
            </span>
            <span style={{ fontSize: 12, fontWeight: 500, color: status.color, backgroundColor: status.bg, padding: '6px 12px', borderRadius: 6 }}>
              {status.label}
            </span>
            <span style={{ fontSize: 12, fontWeight: 500, color: priority.color, backgroundColor: priority.bg, padding: '6px 12px', borderRadius: 6, textTransform: 'capitalize' }}>
              {testCase?.priority || 'Medium'}
            </span>
            <span style={{ fontSize: 12, color: '#64748B', backgroundColor: '#F1F5F9', padding: '6px 12px', borderRadius: 6 }}>
              {testCase?.type || 'Functional'}
            </span>
            <button onClick={() => setIsHistoryOpen(true)} title="View Execution History" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 10px', backgroundColor: '#F1F5F9', border: 'none', borderRadius: 6, color: '#64748B', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
              <History size={14} /> History
            </button>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', backgroundColor: elapsedTime > 0 ? '#FEF3C7' : '#F1F5F9', borderRadius: 6 }}>
              <Timer size={14} style={{ color: elapsedTime > 0 ? '#D97706' : '#64748B' }} />
              <span style={{ fontSize: 14, fontWeight: 600, fontFamily: 'monospace', color: elapsedTime > 0 ? '#D97706' : '#64748B' }}>
                {formatTime(elapsedTime)}
              </span>
            </div>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', margin: '0 0 8px', lineHeight: 1.3 }}>{testCase?.title}</h1>
          {testCase?.description && <p style={{ fontSize: 14, color: '#64748B', margin: 0, lineHeight: 1.5 }}>{testCase.description}</p>}
          {cycleTestCase.assignee && (
            <div style={{ marginTop: 12, fontSize: 13, color: '#64748B' }}>
              Assigned to: <strong style={{ color: '#334155' }}>{cycleTestCase.assignee.full_name}</strong>
            </div>
          )}
        </div>

        {/* Preconditions */}
        {testCase?.preconditions && (
          <div style={{ marginBottom: 24, padding: 16, backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <AlertTriangle size={16} style={{ color: '#D97706' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#92400E' }}>Preconditions</span>
            </div>
            <p style={{ fontSize: 14, color: '#92400E', margin: 0, lineHeight: 1.5 }}>{highlightVariables(testCase.preconditions)}</p>
          </div>
        )}

        {/* Steps */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <List size={18} style={{ color: '#2563EB' }} />
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', margin: 0 }}>Test Steps</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {testCase?.steps && testCase.steps.length > 0 ? (
              testCase.steps.map((step, index) => (
                <div key={index} style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: '#2563EB', color: '#FFFFFF', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {step.step_number || index + 1}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Step {step.step_number || index + 1}</span>
                  </div>
                  <div style={{ padding: 16 }}>
                    <div style={{ marginBottom: step.expected_result ? 12 : 0 }}>
                      <p style={{ fontSize: 14, color: '#334155', margin: 0, lineHeight: 1.6 }}>{highlightVariables(step.action)}</p>
                    </div>
                    {step.expected_result && (
                      <div style={{ padding: 12, backgroundColor: '#ECFDF5', borderRadius: 8, borderLeft: '3px solid #10B981' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <Target size={12} style={{ color: '#059669' }} />
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#059669', textTransform: 'uppercase' }}>Expected</span>
                        </div>
                        <p style={{ fontSize: 13, color: '#065F46', margin: 0, lineHeight: 1.5 }}>{highlightVariables(step.expected_result)}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: 24, backgroundColor: '#F8FAFC', borderRadius: 10, textAlign: 'center', color: '#94A3B8' }}>
                <FileText size={24} style={{ marginBottom: 8, opacity: 0.5 }} />
                <p style={{ margin: 0 }}>No steps defined for this test case</p>
              </div>
            )}
          </div>
        </div>

        {/* Overall Expected Result */}
        {testCase?.expected_result && (
          <div style={{ marginBottom: 24, padding: 16, backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Target size={16} style={{ color: '#059669' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#065F46' }}>Expected Result</span>
            </div>
            <p style={{ fontSize: 14, color: '#065F46', margin: 0, lineHeight: 1.5 }}>{highlightVariables(testCase.expected_result)}</p>
          </div>
        )}

        {/* Execution Notes */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <FileText size={18} style={{ color: '#64748B' }} />
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', margin: 0 }}>Execution Notes</h2>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes about this test execution..."
            style={{ width: '100%', minHeight: 100, padding: 14, border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 14, color: '#334155', lineHeight: 1.5, resize: 'vertical', fontFamily: 'inherit' }}
          />
          <p style={{ fontSize: 12, color: '#94A3B8', margin: '8px 0 0' }}>Notes auto-save as you type</p>
        </div>

        {/* Attachments */}
        <div style={{ marginBottom: 24 }}>
          <ExecutionAttachments
            cycleTestCaseId={cycleTestCase.id}
            attachments={attachments}
            onAttachmentsChange={onAttachmentsChange}
          />
        </div>
      </div>

      <ExecutionHistoryModal
        isOpen={isHistoryOpen}
        cycleTestCaseId={cycleTestCase.id}
        testCaseKey={testCase?.case_key || ''}
        testCaseTitle={testCase?.title || ''}
        onClose={() => setIsHistoryOpen(false)}
      />
    </div>
  );
}
