import { useState } from 'react';
import { X, XCircle, Bug, Server, Database, FileWarning, Clock, HelpCircle, Link2, Plus } from 'lucide-react';
import { CreateDefectModal } from '@/components/testhub/defects/CreateDefectModal';

interface FailureReasonModalProps {
  isOpen: boolean;
  testCaseKey: string;
  testCaseTitle: string;
  testCaseId?: string;
  cycleId?: string;
  cycleTestCaseId?: string;
  onClose: () => void;
  onConfirm: (failureReason: string, defectId: string | null, notes: string) => void;
}

const FAILURE_REASONS = [
  { id: 'bug', label: 'Bug / Defect', description: 'Application defect found', icon: Bug, color: 'var(--sem-danger)' },
  { id: 'environment', label: 'Environment Issue', description: 'Environment or configuration problem', icon: Server, color: '#2563EB' },
  { id: 'test_data', label: 'Test Data Issue', description: 'Invalid or missing test data', icon: Database, color: '#0891B2' },
  { id: 'test_script', label: 'Test Script Error', description: 'Error in the test case itself', icon: FileWarning, color: '#EA580C' },
  { id: 'timeout', label: 'Timeout', description: 'Operation timed out', icon: Clock, color: '#CA8A04' },
  { id: 'other', label: 'Other', description: 'Other reason (notes required)', icon: HelpCircle, color: 'var(--fg-3)' },
];

export function FailureReasonModal({ isOpen, testCaseKey, testCaseTitle, testCaseId, cycleId, cycleTestCaseId, onClose, onConfirm }: FailureReasonModalProps) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [defectId, setDefectId] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [showCreateDefect, setShowCreateDefect] = useState(false);

  const handleConfirm = () => {
    if (!selectedReason) { setError('Please select a failure reason'); return; }
    if (selectedReason === 'other' && !notes.trim()) { setError('Notes are required when selecting "Other"'); return; }
    onConfirm(selectedReason, defectId.trim() || null, notes.trim());
    setSelectedReason(null); setDefectId(''); setNotes(''); setError('');
  };

  const handleClose = () => {
    setSelectedReason(null); setDefectId(''); setNotes(''); setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
        <div style={{ width: 520, maxHeight: '90vh', backgroundColor: 'var(--bg-app)', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <XCircle size={24} style={{ color: 'var(--sem-danger)' }} />
              </div>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg-1)', margin: 0 }}>Test Failed</h2>
                <p style={{ fontSize: 13, color: 'var(--fg-3)', margin: '4px 0 0' }}>Select a reason for the failure</p>
              </div>
            </div>
            <button onClick={handleClose} style={{ width: 32, height: 32, padding: 0, border: 'none', borderRadius: 8, backgroundColor: 'transparent', color: 'var(--fg-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            <div style={{ padding: 12, backgroundColor: 'color-mix(in srgb, var(--bg-2) 30%, transparent)', borderRadius: 8, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--cp-blue)', backgroundColor: 'color-mix(in srgb, var(--cp-blue) 8%, transparent)', padding: '3px 8px', borderRadius: 4 }}>{testCaseKey}</span>
                <span style={{ fontSize: 14, color: 'var(--fg-1)', fontWeight: 500 }}>{testCaseTitle}</span>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--fg-1)', marginBottom: 10 }}>
                Failure Reason <span style={{ color: 'var(--sem-danger)' }}>*</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {FAILURE_REASONS.map((reason) => {
                  const Icon = reason.icon;
                  const isSelected = selectedReason === reason.id;
                  return (
                    <button key={reason.id} onClick={() => { setSelectedReason(reason.id); setError(''); }}
                      style={{ padding: '14px 16px', border: `2px solid ${isSelected ? reason.color : 'var(--divider)'}`, borderRadius: 12, backgroundColor: isSelected ? `${reason.color}10` : 'var(--bg-app)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ width: 36, height: 50, borderRadius: 8, backgroundColor: isSelected ? `${reason.color}20` : 'color-mix(in srgb, var(--bg-2) 40%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon size={18} style={{ color: isSelected ? reason.color : 'var(--fg-3)' }} />
                        </div>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 600, color: isSelected ? reason.color : 'var(--fg-1)', margin: 0 }}>{reason.label}</p>
                          <p style={{ fontSize: 12, color: 'var(--fg-3)', margin: '2px 0 0' }}>{reason.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Defect ID + Create Button */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--fg-1)', marginBottom: 6 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Link2 size={14} style={{ color: 'var(--fg-3)' }} /> Defect ID <span style={{ fontWeight: 400, color: 'var(--fg-3)' }}>(optional)</span>
                </span>
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="text" value={defectId} onChange={(e) => setDefectId(e.target.value)} placeholder="e.g., DEF-001"
                  style={{ flex: 1, height: 40, padding: '8px 12px', border: '1.5px solid var(--divider)', borderRadius: 8, fontSize: 14, color: 'var(--fg-1)', backgroundColor: 'var(--bg-app)' }} />
                <button
                  onClick={() => setShowCreateDefect(true)}
                  style={{
                    height: 40, padding: '0 14px',
                    backgroundColor: '#2563EB',
                    border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
                    color: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Plus size={14} /> Create Defect
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--fg-1)', marginBottom: 6 }}>
                Notes{selectedReason === 'other' && <span style={{ color: 'var(--sem-danger)' }}> *</span>}
              </label>
              <textarea value={notes} onChange={(e) => { setNotes(e.target.value); setError(''); }}
                placeholder={selectedReason === 'other' ? 'Please describe the failure reason...' : 'Add any additional details about the failure...'}
                rows={3} style={{ width: '100%', padding: '10px 12px', border: `1.5px solid ${error && selectedReason === 'other' && !notes.trim() ? 'var(--sem-danger)' : 'var(--divider)'}`, borderRadius: 8, fontSize: 14, color: 'var(--fg-1)', backgroundColor: 'var(--bg-app)', resize: 'vertical', fontFamily: 'inherit' }} />
            </div>

            {error && (
              <p style={{ fontSize: 13, color: 'var(--sem-danger)', margin: '12px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                <XCircle size={14} /> {error}
              </p>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--divider)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button onClick={handleClose} style={{ height: 40, padding: '0 20px', backgroundColor: 'var(--bg-app)', border: '1.5px solid var(--divider)', borderRadius: 8, fontSize: 14, fontWeight: 500, color: 'var(--fg-1)', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleConfirm} style={{ height: 40, padding: '0 20px', background: 'linear-gradient(135deg, var(--sem-danger) 0%, var(--sem-danger) 100%)', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, color: 'var(--cp-float)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <XCircle size={16} /> Mark as Failed
            </button>
          </div>
        </div>
      </div>

      {/* Create Defect Modal */}
      <CreateDefectModal
        isOpen={showCreateDefect}
        onClose={() => setShowCreateDefect(false)}
        onCreated={(createdDefectId) => {
          setDefectId(createdDefectId);
          setShowCreateDefect(false);
        }}
        prefill={{
          title: `Failed: ${testCaseKey} - ${testCaseTitle}`,
          testCaseId,
          cycleTestCaseId,
          cycleId,
        }}
      />
    </>
  );
}
