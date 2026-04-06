/**
 * Create Release Modal — TestHub (Group 15)
 */
import { useState, useEffect } from 'react';
import { X, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { createRelease } from '@/hooks/testhub/useReleases';
import { catalystToast } from '@/components/ui/CatalystToast';

interface CreateReleaseModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateReleaseModal({ open, onClose, onCreated }: CreateReleaseModalProps) {
  const [name, setName] = useState('');
  const [version, setVersion] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('planning');
  const [targetDate, setTargetDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    supabase.from('release_vehicles').select('id, name').then(({ data }) => {
      setVehicles(data || []);
    });
  }, []);

  const handleSubmit = async () => {
    if (!name.trim() || !version.trim()) {
      catalystToast.error('Name and version are required');
      return;
    }
    setIsSaving(true);
    try {
      await createRelease({
        name: name.trim(),
        version: version.trim(),
        description: description.trim() || null,
        status,
        target_date: targetDate || null,
        start_date: startDate || null,
        release_vehicle_id: vehicleId || null,
      });
      catalystToast.success('Release created successfully');
      onCreated();
    } catch (err: any) {
      catalystToast.error(err.message || 'Failed to create release');
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }} onClick={onClose} />
      <div style={{ position: 'relative', width: 560, maxHeight: '90vh', background: 'var(--cp-float)', borderRadius: 14, boxShadow: '0 25px 50px rgba(0,0,0,0.2)', overflow: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--divider)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Package style={{ width: 20, height: 20, color: 'var(--cp-blue)' }} />
            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--fg-1)', margin: 0 }}>Create Release</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-4)' }}>
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        {/* Form */}
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <FormField label="Release Name *" value={name} onChange={setName} placeholder="Q1 2026 Feature Release" />
            <FormField label="Version *" value={version} onChange={setVersion} placeholder="v2.1.0" />
          </div>

          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Release objectives and scope..."
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} style={inputStyle}>
                <option value="planning">Planning</option>
                <option value="development">Development</option>
                <option value="testing">Testing</option>
                <option value="uat">UAT</option>
                <option value="staging">Staging</option>
                <option value="released">Released</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Vehicle</label>
              <select value={vehicleId} onChange={e => setVehicleId(e.target.value)} style={inputStyle}>
                <option value="">None</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <FormField label="Start Date" type="date" value={startDate} onChange={setStartDate} />
            <FormField label="Target Release Date" type="date" value={targetDate} onChange={setTargetDate} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 24px', borderTop: '1px solid var(--divider)' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', border: '1px solid var(--divider)', borderRadius: 8, background: 'var(--cp-float)', fontSize: 14, cursor: 'pointer', color: 'var(--fg-3)' }}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving || !name.trim() || !version.trim()}
            style={{
              padding: '9px 18px', border: 'none', borderRadius: 8,
              background: 'var(--cp-blue)', color: 'var(--cp-float)', fontSize: 14, fontWeight: 600,
              cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.6 : 1,
            }}
          >
            {isSaving ? 'Creating...' : 'Create Release'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={inputStyle}
      />
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%', height: 38, padding: '8px 12px', border: '1px solid var(--divider)',
  borderRadius: 8, fontSize: 13, color: 'var(--fg-1)', outline: 'none',
  background: 'var(--cp-float)',
};
