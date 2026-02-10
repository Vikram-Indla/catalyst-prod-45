import { useState } from 'react';
import { X, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';

interface CloneTestCycleModalProps {
  isOpen: boolean;
  cycle: { id: string; name: string; description: string | null; start_date: string | null; end_date: string | null; owner_id?: string | null; total_cases: number } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function CloneTestCycleModal({ isOpen, cycle, onClose, onSuccess }: CloneTestCycleModalProps) {
  const [name, setName] = useState('');
  const [includeTestCases, setIncludeTestCases] = useState(true);
  const [isCloning, setIsCloning] = useState(false);

  // Reset on open
  useState(() => {
    if (isOpen && cycle) setName(`${cycle.name} (Copy)`);
  });

  const handleClone = async () => {
    if (!cycle || !name.trim()) return;
    setIsCloning(true);
    try {
      // Generate key
      const { data: cycleKey } = await supabase.rpc('generate_cycle_key');
      const key = cycleKey || `CYCLE-${Date.now().toString().slice(-3)}`;

      const { data: newCycle, error } = await supabase.from('th_test_cycles').insert({
        cycle_key: key,
        name: name.trim(),
        description: cycle.description,
        start_date: cycle.start_date,
        end_date: cycle.end_date,
        owner_id: cycle.owner_id || null,
        status: 'draft',
        progress_percent: 0, total_cases: 0, passed_count: 0, failed_count: 0,
        blocked_count: 0, skipped_count: 0, not_run_count: 0,
      }).select('id').single();

      if (error) throw new Error(error.message);

      if (includeTestCases && newCycle) {
        const { data: existingCases } = await supabase.from('th_cycle_test_cases')
          .select('test_case_id').eq('cycle_id', cycle.id);
        if (existingCases && existingCases.length > 0) {
          const inserts = existingCases.map(tc => ({
            cycle_id: newCycle.id,
            test_case_id: tc.test_case_id,
            execution_status: 'not_run',
          }));
          await supabase.from('th_cycle_test_cases').insert(inserts);
        }
      }

      catalystToast.success(`Cycle cloned as "${name.trim()}"`, { title: 'Cycle Cloned' });
      onSuccess();
      onClose();
    } catch (err: any) {
      catalystToast.error(err.message || 'Failed to clone cycle');
    } finally {
      setIsCloning(false);
    }
  };

  if (!isOpen || !cycle) return null;

  // Set default name on render if empty
  if (!name && cycle) setTimeout(() => setName(`${cycle.name} (Copy)`), 0);

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ width: 500, backgroundColor: '#FFFFFF', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', padding: 0 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Copy size={20} style={{ color: '#2563EB' }} />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0 }}>Clone Cycle</h2>
              <p style={{ fontSize: 13, color: '#64748B', margin: '2px 0 0' }}>Create a copy of this cycle</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, padding: 0, border: 'none', borderRadius: 8, backgroundColor: 'transparent', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 6 }}>New Cycle Name <span style={{ color: '#EF4444' }}>*</span></label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%', height: 40, padding: '0 12px', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 14, color: '#0F172A' }} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', backgroundColor: '#F8FAFC', borderRadius: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={includeTestCases} onChange={(e) => setIncludeTestCases(e.target.checked)} style={{ width: 16, height: 16, accentColor: '#2563EB' }} />
            <div>
              <span style={{ fontSize: 14, fontWeight: 500, color: '#334155' }}>Include test cases</span>
              <p style={{ fontSize: 12, color: '#94A3B8', margin: '2px 0 0' }}>{cycle.total_cases} test case{cycle.total_cases !== 1 ? 's' : ''} will be copied (all reset to "Not Run")</p>
            </div>
          </label>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={onClose} disabled={isCloning} style={{ height: 40, padding: '0 20px', backgroundColor: '#FFFFFF', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 14, fontWeight: 500, color: '#334155', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleClone} disabled={isCloning || !name.trim()} style={{ height: 40, padding: '0 20px', background: name.trim() ? 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' : '#94A3B8', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, color: '#FFFFFF', cursor: name.trim() ? 'pointer' : 'not-allowed', opacity: isCloning ? 0.7 : 1 }}>
            {isCloning ? 'Cloning...' : 'Clone Cycle'}
          </button>
        </div>
      </div>
    </div>
  );
}
