import { useState } from 'react';
import { X, XCircle, Bug, Server, Database, FileWarning, Clock, HelpCircle, Link2 } from 'lucide-react';

interface FailureReasonModalProps {
  isOpen: boolean;
  testCaseKey: string;
  testCaseTitle: string;
  onClose: () => void;
  onConfirm: (failureReason: string, defectId: string | null, notes: string) => void;
}

const FAILURE_REASONS = [
  { id: 'bug', label: 'Bug / Defect', description: 'Application defect found', icon: Bug, color: '#DC2626' },
  { id: 'environment', label: 'Environment Issue', description: 'Environment or configuration problem', icon: Server, color: '#7C3AED' },
  { id: 'test_data', label: 'Test Data Issue', description: 'Invalid or missing test data', icon: Database, color: '#0891B2' },
  { id: 'test_script', label: 'Test Script Error', description: 'Error in the test case itself', icon: FileWarning, color: '#EA580C' },
  { id: 'timeout', label: 'Timeout', description: 'Operation timed out', icon: Clock, color: '#CA8A04' },
  { id: 'other', label: 'Other', description: 'Other reason (notes required)', icon: HelpCircle, color: '#64748B' },
];

export function FailureReasonModal({ isOpen, testCaseKey, testCaseTitle, onClose, onConfirm }: FailureReasonModalProps) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [defectId, setDefectId] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

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
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ width: 520, maxHeight: '90vh', backgroundColor: '#FFFFFF', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <XCircle size={24} style={{ color: '#DC2626' }} />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0 }}>Test Failed</h2>
              <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>Select a reason for the failure</p>
            </div>
          </div>
          <button onClick={handleClose} style={{ width: 32, height: 32, padding: 0, border: 'none', borderRadius: 8, backgroundColor: 'transparent', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <div style={{ padding: 12, backgroundColor: '#F8FAFC', borderRadius: 8, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '3px 8px', borderRadius: 4 }}>{testCaseKey}</span>
              <span style={{ fontSize: 14, color: '#334155', fontWeight: 500 }}>{testCaseTitle}</span>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 10 }}>
              Failure Reason <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {FAILURE_REASONS.map((reason) => {
                const Icon = reason.icon;
                const isSelected = selectedReason === reason.id;
                return (
                  <button key={reason.id} onClick={() => { setSelectedReason(reason.id); setError(''); }}
                    style={{ padding: '14px 16px', border: `2px solid ${isSelected ? reason.color : '#E2E8F0'}`, borderRadius: 10, backgroundColor: isSelected ? `${reason.color}10` : '#FFFFFF', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: isSelected ? `${reason.color}20` : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={18} style={{ color: isSelected ? reason.color : '#64748B' }} />
                      </div>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: isSelected ? reason.color : '#0F172A', margin: 0 }}>{reason.label}</p>
                        <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>{reason.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 6 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Link2 size={14} style={{ color: '#64748B' }} /> Defect ID <span style={{ fontWeight: 400, color: '#94A3B8' }}>(optional)</span>
              </span>
            </label>
            <input type="text" value={defectId} onChange={(e) => setDefectId(e.target.value)} placeholder="e.g., BUG-123, JIRA-456"
              style={{ width: '100%', height: 40, padding: '0 12px', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 14, color: '#0F172A' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 6 }}>
              Notes{selectedReason === 'other' && <span style={{ color: '#EF4444' }}> *</span>}
            </label>
            <textarea value={notes} onChange={(e) => { setNotes(e.target.value); setError(''); }}
              placeholder={selectedReason === 'other' ? 'Please describe the failure reason...' : 'Add any additional details about the failure...'}
              rows={3} style={{ width: '100%', padding: '10px 12px', border: `1.5px solid ${error && selectedReason === 'other' && !notes.trim() ? '#EF4444' : '#E2E8F0'}`, borderRadius: 8, fontSize: 14, color: '#0F172A', resize: 'vertical', fontFamily: 'inherit' }} />
          </div>

          {error && (
            <p style={{ fontSize: 13, color: '#DC2626', margin: '12px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
              <XCircle size={14} /> {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={handleClose} style={{ height: 40, padding: '0 20px', backgroundColor: '#FFFFFF', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 14, fontWeight: 500, color: '#334155', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleConfirm} style={{ height: 40, padding: '0 20px', background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, color: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <XCircle size={16} /> Mark as Failed
          </button>
        </div>
      </div>
    </div>
  );
}
