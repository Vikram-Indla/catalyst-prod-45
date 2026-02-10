import { useState, useEffect } from 'react';
import { X, History, Clock, CheckCircle2, XCircle, AlertTriangle, SkipForward, ArrowRight, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface HistoryEntry {
  id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  changed_at: string;
  notes: string | null;
  execution_time_seconds: number | null;
  changer?: { full_name: string };
}

interface ExecutionHistoryModalProps {
  isOpen: boolean;
  cycleTestCaseId: string;
  testCaseKey: string;
  testCaseTitle: string;
  onClose: () => void;
}

export function ExecutionHistoryModal({ isOpen, cycleTestCaseId, testCaseKey, testCaseTitle, onClose }: ExecutionHistoryModalProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && cycleTestCaseId) fetchHistory();
  }, [isOpen, cycleTestCaseId]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('th_execution_history')
        .select(`*, changer:profiles!th_execution_history_changed_by_fkey ( full_name )`)
        .eq('cycle_test_case_id', cycleTestCaseId)
        .order('changed_at', { ascending: false });
      if (!error) setHistory(data || []);
    } catch (err) { console.error('Fetch history error:', err); }
    finally { setIsLoading(false); }
  };

  const statusConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
    not_run: { icon: Clock, color: '#64748B', bg: '#F1F5F9', label: 'Not Run' },
    passed: { icon: CheckCircle2, color: '#059669', bg: '#ECFDF5', label: 'Passed' },
    failed: { icon: XCircle, color: '#DC2626', bg: '#FEF2F2', label: 'Failed' },
    blocked: { icon: AlertTriangle, color: '#D97706', bg: '#FFFBEB', label: 'Blocked' },
    skipped: { icon: SkipForward, color: '#94A3B8', bg: '#F8FAFC', label: 'Skipped' },
  };

  const formatDateTime = (d: string) => new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  const formatTime = (s: number | null) => { if (!s) return '—'; return `${Math.floor(s / 60)}m ${s % 60}s`; };

  const renderStatusBadge = (status: string | null) => {
    if (!status) return <span style={{ color: '#94A3B8' }}>—</span>;
    const config = statusConfig[status] || statusConfig.not_run;
    const Icon = config.icon;
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', backgroundColor: config.bg, color: config.color, borderRadius: 6, fontSize: 12, fontWeight: 500 }}>
        <Icon size={14} /> {config.label}
      </span>
    );
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ width: 600, maxHeight: '80vh', backgroundColor: '#FFFFFF', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <History size={24} style={{ color: '#2563EB' }} />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0 }}>Execution History</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '2px 6px', borderRadius: 4 }}>{testCaseKey}</span>
                <span style={{ fontSize: 13, color: '#64748B' }}>{testCaseTitle}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, padding: 0, border: 'none', borderRadius: 8, backgroundColor: 'transparent', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#64748B' }}>Loading history...</div>
          ) : history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>
              <History size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
              <p style={{ margin: 0 }}>No execution history yet</p>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: 20, top: 24, bottom: 24, width: 2, backgroundColor: '#E2E8F0' }} />
              {history.map((entry, index) => {
                const newConfig = statusConfig[entry.new_status] || statusConfig.not_run;
                const NewIcon = newConfig.icon;
                return (
                  <div key={entry.id} style={{ display: 'flex', gap: 16, marginBottom: index < history.length - 1 ? 24 : 0, position: 'relative' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: newConfig.bg, border: `3px solid ${newConfig.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1 }}>
                      <NewIcon size={18} style={{ color: newConfig.color }} />
                    </div>
                    <div style={{ flex: 1, backgroundColor: '#F8FAFC', borderRadius: 10, padding: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        {renderStatusBadge(entry.old_status)}
                        <ArrowRight size={16} style={{ color: '#94A3B8' }} />
                        {renderStatusBadge(entry.new_status)}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: '#64748B' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {formatDateTime(entry.changed_at)}</span>
                        {entry.changer && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><User size={12} /> {entry.changer.full_name}</span>}
                        {entry.execution_time_seconds && entry.execution_time_seconds > 0 && <span>Execution time: {formatTime(entry.execution_time_seconds)}</span>}
                      </div>
                      {entry.notes && (
                        <div style={{ marginTop: 10, padding: 10, backgroundColor: '#FFFFFF', borderRadius: 6, fontSize: 13, color: '#334155', borderLeft: '3px solid #E2E8F0' }}>
                          {entry.notes}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ height: 40, padding: '0 20px', backgroundColor: '#FFFFFF', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 14, fontWeight: 500, color: '#334155', cursor: 'pointer' }}>Close</button>
        </div>
      </div>
    </div>
  );
}
