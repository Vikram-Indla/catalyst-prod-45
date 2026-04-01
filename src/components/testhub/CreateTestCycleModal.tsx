import { useState, useEffect } from 'react';
import { X, Calendar, User, AlertCircle, Server } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';

interface EnvironmentOption {
  id: string;
  name: string;
  type: string;
  health_status: string;
}

interface Profile {
  id: string;
  full_name: string;
}

interface TestCycleData {
  id: string;
  cycle_key: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  owner_id?: string | null;
  environment_id?: string | null;
  status: string;
}

interface CreateTestCycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode?: 'create' | 'edit';
  cycle?: TestCycleData | null;
}

export function CreateTestCycleModal({ isOpen, onClose, onSuccess, mode = 'create', cycle }: CreateTestCycleModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [environmentId, setEnvironmentId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [environments, setEnvironments] = useState<EnvironmentOption[]>([]);

  useEffect(() => {
    if (isOpen) {
      supabase.from('profiles').select('id, full_name').order('full_name').then(({ data }) => {
        if (data) setProfiles(data);
      });
      (supabase as any).from('th_environments').select('id, name, type, health_status').eq('status', 'active').order('name').then(({ data }: any) => {
        if (data) setEnvironments(data);
      });

      if (mode === 'edit' && cycle) {
        setName(cycle.name || '');
        setDescription(cycle.description || '');
        setStartDate(cycle.start_date || '');
        setEndDate(cycle.end_date || '');
        setOwnerId(cycle.owner_id || '');
        setEnvironmentId(cycle.environment_id || '');
      } else {
        setName('');
        setDescription('');
        setStartDate('');
        setEndDate('');
        setOwnerId('');
        setEnvironmentId('');
      }
      setErrors({});
    }
  }, [isOpen, mode, cycle]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Cycle name is required';
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      newErrors.endDate = 'End date must be after start date';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const generateCycleKey = async (): Promise<string> => {
    const { data, error } = await supabase.rpc('generate_cycle_key');
    if (error) {
      const { data: lastCycle } = await supabase
        .from('th_test_cycles').select('cycle_key').order('created_at', { ascending: false }).limit(1);
      if (lastCycle && lastCycle.length > 0) {
        const lastNum = parseInt(lastCycle[0].cycle_key.replace('CYCLE-', ''));
        return `CYCLE-${String(lastNum + 1).padStart(3, '0')}`;
      }
      return 'CYCLE-001';
    }
    return data;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);

    try {
      if (mode === 'edit' && cycle) {
        const updateData: any = {
          name: name.trim(),
          description: description.trim() || null,
          start_date: startDate || null,
          end_date: endDate || null,
          owner_id: ownerId || null,
          environment_id: environmentId || null,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from('th_test_cycles')
          .update(updateData)
          .eq('id', cycle.id);

        if (error) {
          catalystToast.error(error.message || 'Failed to update cycle', { title: 'Update Failed' });
          return;
        }

        catalystToast.success('Test cycle updated successfully', { title: 'Cycle Updated' });
      } else {
        const cycleKey = await generateCycleKey();
        const insertData: any = {
          cycle_key: cycleKey,
          name: name.trim(),
          description: description.trim() || null,
          start_date: startDate || null,
          end_date: endDate || null,
          owner_id: ownerId || null,
          environment_id: environmentId || null,
          status: 'draft',
          progress_percent: 0, total_cases: 0, passed_count: 0, failed_count: 0,
          blocked_count: 0, skipped_count: 0, not_run_count: 0,
        };
        const { error } = await supabase.from('th_test_cycles').insert(insertData).select().single();

        if (error) {
          catalystToast.error(error.message || 'Failed to create test cycle', { title: 'Creation Failed' });
          return;
        }
        catalystToast.success(`Test cycle "${name.trim()}" created successfully`, { title: 'Cycle Created' });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      catalystToast.error(err.message || 'Failed to save cycle');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isEdit = mode === 'edit';

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ width: 560, maxHeight: '90vh', backgroundColor: 'var(--cp-float)', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg-1)', margin: 0 }}>
              {isEdit ? 'Edit Test Cycle' : 'Create Test Cycle'}
            </h2>
            <p style={{ fontSize: 14, color: 'var(--fg-3)', margin: '4px 0 0' }}>
              {isEdit ? 'Update cycle details' : 'Plan a new test execution cycle'}
            </p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, padding: 0, border: 'none', borderRadius: 8, backgroundColor: 'transparent', color: 'var(--fg-4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {/* Name */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--fg-1)', marginBottom: 6 }}>
              Cycle Name <span style={{ color: 'var(--sem-danger)' }}>*</span>
            </label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Release 24 - User Authentication"
              style={{ width: '100%', height: 40, padding: '0 12px', border: `1.5px solid ${errors.name ? 'var(--sem-danger)' : 'var(--divider)'}`, borderRadius: 8, fontSize: 14, color: 'var(--fg-1)' }}
            />
            {errors.name && <p style={{ fontSize: 12, color: 'var(--sem-danger)', margin: '6px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={12} />{errors.name}</p>}
          </div>

          {/* Description */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--fg-1)', marginBottom: 6 }}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the scope and goals..." rows={3}
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid var(--divider)', borderRadius: 8, fontSize: 14, color: 'var(--fg-1)', resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          {/* Date Fields */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--fg-1)', marginBottom: 6 }}>
                <Calendar size={14} style={{ color: 'var(--fg-3)' }} /> Start Date
              </label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                style={{ width: '100%', height: 40, padding: '0 12px', border: '1.5px solid var(--divider)', borderRadius: 8, fontSize: 14, color: 'var(--fg-1)' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--fg-1)', marginBottom: 6 }}>
                <Calendar size={14} style={{ color: 'var(--fg-3)' }} /> End Date
              </label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate}
                style={{ width: '100%', height: 40, padding: '0 12px', border: `1.5px solid ${errors.endDate ? 'var(--sem-danger)' : 'var(--divider)'}`, borderRadius: 8, fontSize: 14, color: 'var(--fg-1)' }}
              />
              {errors.endDate && <p style={{ fontSize: 12, color: 'var(--sem-danger)', margin: '6px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={12} />{errors.endDate}</p>}
            </div>
          </div>

          {/* Environment */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--fg-1)', marginBottom: 6 }}>
              <Server size={14} style={{ color: 'var(--fg-3)' }} /> Environment
            </label>
            <select value={environmentId} onChange={(e) => setEnvironmentId(e.target.value)}
              style={{ width: '100%', height: 40, padding: '0 12px', border: '1.5px solid var(--divider)', borderRadius: 8, fontSize: 14, color: 'var(--fg-1)', backgroundColor: 'var(--cp-float)' }}
            >
              <option value="">Select environment (optional)</option>
              {environments.map(env => (
                <option key={env.id} value={env.id}>
                  {env.name} ({env.type}) {env.health_status === 'healthy' ? '🟢' : env.health_status === 'degraded' ? '🟡' : env.health_status === 'down' ? '🔴' : '⚪'}
                </option>
              ))}
            </select>
          </div>

          {/* Owner */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--fg-1)', marginBottom: 6 }}>
              <User size={14} style={{ color: 'var(--fg-3)' }} /> Owner
            </label>
            <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}
              style={{ width: '100%', height: 40, padding: '0 12px', border: '1.5px solid var(--divider)', borderRadius: 8, fontSize: 14, color: 'var(--fg-1)', backgroundColor: 'var(--cp-float)' }}
            >
              <option value="">Select owner (optional)</option>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </div>

          {!isEdit && (
            <div style={{ padding: 16, backgroundColor: 'color-mix(in srgb, var(--cp-blue) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--cp-blue) 25%, transparent)', borderRadius: 8 }}>
              <p style={{ fontSize: 13, color: 'var(--cp-primary-70)', margin: 0 }}>
                <strong>Note:</strong> The cycle will be created in <strong>Draft</strong> status. Add test cases and start when ready.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--divider)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={onClose} disabled={isSubmitting} style={{ height: 40, padding: '0 20px', backgroundColor: 'var(--cp-float)', border: '1.5px solid var(--divider)', borderRadius: 8, fontSize: 14, fontWeight: 500, color: 'var(--fg-2)', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={isSubmitting || !name.trim()} style={{
            height: 40, padding: '0 20px',
            background: name.trim() ? 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' : 'var(--fg-4)',
            border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, color: '#FFFFFF',
            cursor: name.trim() ? 'pointer' : 'not-allowed', opacity: isSubmitting ? 0.7 : 1,
          }}>
            {isSubmitting
              ? (isEdit ? 'Saving...' : 'Creating...')
              : (isEdit ? 'Save Changes' : 'Create Cycle')
            }
          </button>
        </div>
      </div>
    </div>
  );
}
