/**
 * MilestoneConfigModal — Configure which statuses appear in Key Milestones
 */
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { useMilestoneConfig, useUpdateMilestoneConfig } from '@/hooks/useProjectDashboard';

const ALL_STATUSES = [
  'start', 'in_requirements', 'in_design', 'ready_for_development',
  'in_development', 'on_hold', 'in_qa', 'in_uat',
  'in_entity_integration', 'technical_validation',
  'in_beta', 'end_to_end_testing', 'production_ready', 'beta_ready', 'in_production',
];

const DEFAULTS = ['ready_for_development', 'beta_ready', 'production_ready'];

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
}

export default function MilestoneConfigModal({ open, onClose, projectId }: Props) {
  const { data: config } = useMilestoneConfig(projectId);
  const updateMutation = useUpdateMilestoneConfig(projectId);
  const [selected, setSelected] = useState<string[]>(DEFAULTS);

  useEffect(() => {
    if (config?.statuses) setSelected(config.statuses as string[]);
    else setSelected(DEFAULTS);
  }, [config, open]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  if (!open) return null;

  const toggle = (s: string) => {
    setSelected(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const save = () => {
    updateMutation.mutate(selected);
    onClose();
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div onClick={e => e.stopPropagation()} style={{ background: '#FFFFFF', borderRadius: 16, width: 480, maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,.15)' }}>
          <div style={{ padding: '20px 24px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', fontFamily: "'Sora', sans-serif" }}>Configure Key Milestones</div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Select which statuses appear. Super admin only.</div>
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={16} color="#94A3B8" />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 24px 16px' }}>
            {ALL_STATUSES.map(s => (
              <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', cursor: 'pointer', borderBottom: '1px solid #F8FAFC' }}>
                <input type="checkbox" checked={selected.includes(s)} onChange={() => toggle(s)} style={{ accentColor: '#2563EB', width: 16, height: 16 }} />
                <StatusBadge status={s} />
              </label>
            ))}
          </div>

          <div style={{ padding: '14px 24px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #E2E8F0', background: '#FFFFFF', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#64748B' }}>Cancel</button>
            <button onClick={save} style={{ padding: '8px 20px', borderRadius: 6, border: 'none', background: '#2563EB', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#FFFFFF' }}>Save</button>
          </div>
        </div>
      </div>
    </>
  );
}
