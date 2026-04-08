import { useState, useEffect } from 'react';
import { X, RefreshCw, Search, CheckCircle2, Plus, Clock, Play, Archive } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';

interface AddCycleToPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
  onAdded: () => void;
}

interface UnassignedCycle {
  id: string;
  cycle_key: string;
  name: string;
  status: string;
  total_cases: number;
  progress_percent: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  draft: { label: 'Draft', color: 'var(--fg-3)', bg: 'var(--cp-bd-zone)', icon: Clock },
  active: { label: 'Active', color: 'var(--sem-success)', bg: '#ECFDF5', icon: Play },
  completed: { label: 'Completed', color: 'var(--cp-blue)', bg: 'color-mix(in srgb, var(--cp-blue) 8%, transparent)', icon: CheckCircle2 },
  archived: { label: 'Archived', color: 'var(--fg-4)', bg: 'var(--bg-1)', icon: Archive },
};

export function AddCycleToPlanModal({ isOpen, onClose, planId, onAdded }: AddCycleToPlanModalProps) {
  const [cycles, setCycles] = useState<UnassignedCycle[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUnassignedCycles = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_unassigned_cycles' as any, { p_project_id: '00000000-0000-0000-0000-000000000000', p_plan_id: planId });
      if (error) throw error;
      setCycles((data as any[]) || []);
    } catch (err) {
      console.error('Fetch cycles error:', err);
      catalystToast.error('Failed to load cycles');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUnassignedCycles();
      setSelectedIds(new Set());
      setSearchTerm('');
    }
  }, [isOpen]);

  const filteredCycles = cycles.filter(c => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return c.cycle_key.toLowerCase().includes(search) || c.name.toLowerCase().includes(search);
  });

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    if (selectedIds.size === filteredCycles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCycles.map(c => c.id)));
    }
  };

  const handleSubmit = async () => {
    if (selectedIds.size === 0) return;
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const inserts = Array.from(selectedIds).map((cycleId) => ({
        plan_id: planId,
        cycle_id: cycleId,
        linked_by: user?.id,
      }));

      const { error } = await (supabase as any).from('plan_test_cycles').insert(inserts as any);
      if (error) throw error;

      catalystToast.success(`Added ${selectedIds.size} cycle${selectedIds.size > 1 ? 's' : ''} to plan`);
      onAdded();
      onClose();
    } catch (err) {
      console.error('Add cycles error:', err);
      catalystToast.error('Failed to add cycles');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000, padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 600, maxHeight: '80vh', backgroundColor: 'var(--cp-float)',
        borderRadius: 16, boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg, #2563EB 0%, #1E3A8A 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><Plus size={22} style={{ color: '#FFFFFF' }} /></div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg-1)', margin: 0 }}>Add Cycles to Plan</h2>
              <p style={{ fontSize: 12, color: 'var(--fg-3)', margin: '2px 0 0' }}>Select cycles not assigned to any plan</p>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 36, height: 50, border: 'none', borderRadius: 8,
            backgroundColor: 'transparent', color: 'var(--fg-3)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><X size={20} /></button>
        </div>

        {/* Search */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--divider)' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-4)' }} />
            <input type="text" placeholder="Search cycles..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', height: 44, padding: '0 14px 0 44px', border: '1.5px solid var(--divider)', borderRadius: 12, fontSize: 14 }} />
          </div>
          {filteredCycles.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>{selectedIds.size} of {filteredCycles.length} selected</span>
              <button onClick={selectAll} style={{
                padding: '4px 10px', border: 'none', borderRadius: 6,
                backgroundColor: 'var(--cp-bd-zone)', color: 'var(--cp-blue)', fontSize: 12, fontWeight: 500, cursor: 'pointer',
              }}>{selectedIds.size === filteredCycles.length ? 'Deselect All' : 'Select All'}</button>
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', color: '#2563EB' }} />
            </div>
          ) : filteredCycles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--fg-4)' }}>
              <RefreshCw size={40} style={{ marginBottom: 12, opacity: 0.5 }} />
              <p style={{ margin: 0, fontSize: 14 }}>
                {searchTerm ? 'No cycles match your search' : 'All cycles are already assigned to plans'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredCycles.map((cycle) => {
                const isSelected = selectedIds.has(cycle.id);
                const st = STATUS_CONFIG[cycle.status] || STATUS_CONFIG.draft;
                const StatusIcon = st.icon;

                return (
                  <div key={cycle.id} onClick={() => toggleSelect(cycle.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: 14,
                    backgroundColor: isSelected ? '#EFF6FF' : 'var(--bg-1)', borderRadius: 12,
                    border: `2px solid ${isSelected ? '#2563EB' : 'transparent'}`, cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: 6,
                      border: `2px solid ${isSelected ? '#2563EB' : 'var(--divider)'}`,
                      backgroundColor: isSelected ? '#2563EB' : 'var(--cp-float)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>{isSelected && <CheckCircle2 size={14} style={{ color: '#FFF' }} />}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--cp-blue)', backgroundColor: 'color-mix(in srgb, var(--cp-blue) 8%, transparent)', padding: '2px 8px', borderRadius: 4 }}>
                          {cycle.cycle_key}
                        </span>
                        <span style={{
                          fontSize: 11, fontWeight: 500, color: st.color, backgroundColor: st.bg,
                          padding: '2px 6px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 3,
                        }}><StatusIcon size={10} /> {st.label}</span>
                      </div>
                      <p style={{ fontSize: 14, color: 'var(--fg-1)', margin: 0 }}>{cycle.name}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-1)', margin: 0 }}>{cycle.total_cases}</p>
                      <p style={{ fontSize: 11, color: 'var(--fg-4)', margin: 0 }}>tests</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#2563EB', margin: 0 }}>{cycle.progress_percent}%</p>
                      <p style={{ fontSize: 11, color: 'var(--fg-4)', margin: 0 }}>done</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--divider)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={onClose} disabled={isSubmitting} style={{
            height: 44, padding: '0 20px', backgroundColor: 'var(--cp-float)', border: '1.5px solid var(--divider)',
            borderRadius: 12, fontSize: 14, fontWeight: 500, color: 'var(--fg-2)', cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={handleSubmit} disabled={isSubmitting || selectedIds.size === 0} style={{
            height: 44, padding: '0 24px',
            background: selectedIds.size === 0 ? 'var(--divider)' : 'linear-gradient(135deg, #2563EB 0%, #1E3A8A 100%)',
            border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, color: '#FFFFFF',
            cursor: selectedIds.size === 0 || isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Plus size={16} />
            {isSubmitting ? 'Adding...' : `Add ${selectedIds.size || ''} Cycle${selectedIds.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
