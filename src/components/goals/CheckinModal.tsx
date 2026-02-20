/**
 * CheckinModal — 480px modal for recording a KR check-in
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { X, ClipboardCheck } from 'lucide-react';
import { useAllKeyResults, useCreateCheckin } from '@/hooks/useGoals';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

interface CheckinModalProps {
  krId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

function progressBar(pct: number) {
  const color = pct >= 60 ? '#16A34A' : pct >= 40 ? '#D97706' : '#EF4444';
  return (
    <div style={{ width: '100%', height: 6, background: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(100, Math.max(0, pct))}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 300ms' }} />
    </div>
  );
}

export function CheckinModal({ krId, isOpen, onClose }: CheckinModalProps) {
  const { data: allKRs = [] } = useAllKeyResults();
  const createCheckin = useCreateCheckin();

  const kr = useMemo(() => allKRs.find(k => k.id === krId), [allKRs, krId]);

  const [newValue, setNewValue] = useState('');
  const [confidence, setConfidence] = useState(50);
  const [note, setNote] = useState('');

  // Reset on open
  useEffect(() => {
    if (isOpen && kr) {
      setNewValue(String(kr.current_value));
      const c = typeof kr.confidence_level === 'number'
        ? (kr.confidence_level <= 1 ? Math.round(kr.confidence_level * 100) : Math.round(kr.confidence_level))
        : 50;
      setConfidence(c);
      setNote('');
    }
  }, [isOpen, kr?.id]);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const currentPct = useMemo(() => {
    if (!kr) return 0;
    if (kr.target === kr.baseline) return 0;
    if (kr.target < kr.baseline) return Math.min(100, Math.max(0, Math.round(((kr.baseline - kr.current_value) / (kr.baseline - kr.target)) * 100)));
    return Math.min(100, Math.max(0, Math.round(((kr.current_value - kr.baseline) / (kr.target - kr.baseline)) * 100)));
  }, [kr]);

  const handleSubmit = useCallback(async () => {
    if (!krId) return;
    const val = parseFloat(newValue);
    if (isNaN(val)) { toast.error('Please enter a valid number'); return; }

    try {
      await createCheckin.mutateAsync({
        key_result_id: krId,
        new_value: val,
        confidence_level: confidence / 100,
        note: note.trim() || undefined,
      });
      toast.success('Check-in recorded');
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to record check-in');
    }
  }, [krId, newValue, confidence, note, createCheckin, onClose]);

  if (!isOpen) return null;

  const inputStyle: React.CSSProperties = { width: '100%', padding: '7px 10px', fontSize: 13, border: '1px solid #E2E8F0', borderRadius: 6, outline: 'none', color: '#0F172A', background: '#FFFFFF' };
  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', marginBottom: 4, display: 'block' };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.3)', animation: 'fadeIn 200ms ease-out' }} />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 480, zIndex: 1001,
        background: '#FFFFFF', borderRadius: 16,
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        animation: 'scaleIn 200ms ease-out',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(37,99,235,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ClipboardCheck size={14} color="#2563EB" />
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Check-in: {kr?.kr_key} — {kr?.title || ''}
            </span>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={18} color="#64748B" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Current state */}
          <div style={{ background: '#F8FAFC', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>
              Current: <span style={{ fontWeight: 700, color: '#0F172A' }}>{kr?.current_value ?? 0}</span>
              {' / '}Target: <span style={{ fontWeight: 700, color: '#0F172A' }}>{kr?.target ?? 0}</span>
              {' '}({currentPct}%)
            </div>
            {progressBar(currentPct)}
          </div>

          {/* New value */}
          <div>
            <label style={labelStyle}>New Value *</label>
            <input
              type="number" value={newValue} onChange={e => setNewValue(e.target.value)}
              style={inputStyle}
              onFocus={e => { e.target.style.borderColor = '#2563EB'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
              onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          {/* Confidence */}
          <div>
            <label style={labelStyle}>Confidence Level — {confidence}%</label>
            <Slider value={[confidence]} onValueChange={v => setConfidence(v[0])} min={0} max={100} step={5} className="mt-2" />
          </div>

          {/* Note */}
          <div>
            <label style={labelStyle}>Note</label>
            <textarea
              value={note} onChange={e => setNote(e.target.value)}
              placeholder="What changed since last check-in?"
              style={{ ...inputStyle, minHeight: 60, resize: 'vertical', fontFamily: 'inherit' }}
              onFocus={e => { e.target.style.borderColor = '#2563EB'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
              onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none'; }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 20px', borderTop: '1px solid #E2E8F0' }}>
          <button onClick={onClose} style={{ padding: '7px 16px', fontSize: 13, fontWeight: 500, color: '#64748B', background: 'none', border: '1px solid #E2E8F0', borderRadius: 6, cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={createCheckin.isPending}
            style={{
              padding: '7px 16px', fontSize: 13, fontWeight: 600, color: '#FFFFFF',
              background: createCheckin.isPending ? '#93C5FD' : '#2563EB',
              border: 'none', borderRadius: 6, cursor: createCheckin.isPending ? 'not-allowed' : 'pointer',
            }}
          >
            {createCheckin.isPending ? 'Recording...' : 'Record Check-in'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes scaleIn { from { transform: translate(-50%, -50%) scale(0.95); opacity: 0; } to { transform: translate(-50%, -50%) scale(1); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </>
  );
}
