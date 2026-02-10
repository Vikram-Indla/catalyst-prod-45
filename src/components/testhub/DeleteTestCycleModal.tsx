import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';

interface DeleteTestCycleModalProps {
  isOpen: boolean;
  cycle: { id: string; name: string; cycle_key: string; total_cases: number } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteTestCycleModal({ isOpen, cycle, onClose, onSuccess }: DeleteTestCycleModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!cycle) return;
    setIsDeleting(true);
    try {
      // Delete cycle test cases first
      await supabase.from('th_cycle_test_cases').delete().eq('cycle_id', cycle.id);
      const { error } = await supabase.from('th_test_cycles').delete().eq('id', cycle.id);
      if (error) throw new Error(error.message);
      catalystToast.success(`Cycle "${cycle.name}" deleted`, { title: 'Cycle Deleted' });
      onSuccess();
      onClose();
    } catch (err: any) {
      catalystToast.error(err.message || 'Failed to delete cycle');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen || !cycle) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ width: 480, backgroundColor: '#FFFFFF', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertTriangle size={24} style={{ color: '#DC2626' }} />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: '0 0 8px' }}>Delete Test Cycle</h2>
            <p style={{ fontSize: 14, color: '#64748B', margin: 0 }}>
              Are you sure you want to delete <strong style={{ color: '#0F172A' }}>{cycle.name}</strong> ({cycle.cycle_key})?
            </p>
            {cycle.total_cases > 0 && (
              <p style={{ fontSize: 13, color: '#DC2626', margin: '8px 0 0', padding: '8px 12px', backgroundColor: '#FEF2F2', borderRadius: 6 }}>
                This will also remove {cycle.total_cases} test case assignment{cycle.total_cases !== 1 ? 's' : ''} from this cycle.
              </p>
            )}
            <p style={{ fontSize: 13, color: '#94A3B8', margin: '8px 0 0' }}>This action cannot be undone.</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, padding: 0, border: 'none', borderRadius: 8, backgroundColor: 'transparent', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={onClose} disabled={isDeleting} style={{ height: 40, padding: '0 20px', backgroundColor: '#FFFFFF', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 14, fontWeight: 500, color: '#334155', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleDelete} disabled={isDeleting} style={{ height: 40, padding: '0 20px', backgroundColor: '#DC2626', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, color: '#FFFFFF', cursor: 'pointer', opacity: isDeleting ? 0.7 : 1 }}>
            {isDeleting ? 'Deleting...' : 'Delete Cycle'}
          </button>
        </div>
      </div>
    </div>
  );
}
