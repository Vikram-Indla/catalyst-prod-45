import { useState, useEffect } from 'react';
import { X, Calendar, User, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';

interface Profile {
  id: string;
  full_name: string;
}

interface CreateTestCycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateTestCycleModal({ isOpen, onClose, onSuccess }: CreateTestCycleModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    if (isOpen) {
      supabase.from('profiles').select('id, full_name').order('full_name').then(({ data }) => {
        if (data) setProfiles(data);
      });
      setName(''); setDescription(''); setStartDate(''); setEndDate(''); setOwnerId(''); setErrors({});
    }
  }, [isOpen]);

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
      const cycleKey = await generateCycleKey();
      const { error } = await supabase.from('th_test_cycles').insert({
        cycle_key: cycleKey,
        name: name.trim(),
        description: description.trim() || null,
        start_date: startDate || null,
        end_date: endDate || null,
        owner_id: ownerId || null,
        status: 'draft',
        progress_percent: 0, total_cases: 0, passed_count: 0, failed_count: 0,
        blocked_count: 0, skipped_count: 0, not_run_count: 0,
      }).select().single();

      if (error) {
        catalystToast.error(error.message || 'Failed to create test cycle', { title: 'Creation Failed' });
        return;
      }
      catalystToast.success(`Test cycle "${name.trim()}" created successfully`, { title: 'Cycle Created' });
      onSuccess();
      onClose();
    } catch (err: any) {
      catalystToast.error(err.message || 'Failed to create test cycle', { title: 'Error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ width: 560, maxHeight: '90vh', backgroundColor: '#FFFFFF', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0 }}>Create Test Cycle</h2>
            <p style={{ fontSize: 14, color: '#64748B', margin: '4px 0 0' }}>Plan a new test execution cycle</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, padding: 0, border: 'none', borderRadius: 8, backgroundColor: 'transparent', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {/* Name */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 6 }}>
              Cycle Name <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Sprint 24 - User Authentication"
              style={{ width: '100%', height: 40, padding: '0 12px', border: `1.5px solid ${errors.name ? '#EF4444' : '#E2E8F0'}`, borderRadius: 8, fontSize: 14, color: '#0F172A' }}
            />
            {errors.name && <p style={{ fontSize: 12, color: '#EF4444', margin: '6px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={12} />{errors.name}</p>}
          </div>

          {/* Description */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 6 }}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the scope and goals..." rows={3}
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 14, color: '#0F172A', resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          {/* Date Fields */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 6 }}>
                <Calendar size={14} style={{ color: '#64748B' }} /> Start Date
              </label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                style={{ width: '100%', height: 40, padding: '0 12px', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 14, color: '#0F172A' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 6 }}>
                <Calendar size={14} style={{ color: '#64748B' }} /> End Date
              </label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate}
                style={{ width: '100%', height: 40, padding: '0 12px', border: `1.5px solid ${errors.endDate ? '#EF4444' : '#E2E8F0'}`, borderRadius: 8, fontSize: 14, color: '#0F172A' }}
              />
              {errors.endDate && <p style={{ fontSize: 12, color: '#EF4444', margin: '6px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={12} />{errors.endDate}</p>}
            </div>
          </div>

          {/* Owner */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 6 }}>
              <User size={14} style={{ color: '#64748B' }} /> Owner
            </label>
            <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}
              style={{ width: '100%', height: 40, padding: '0 12px', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 14, color: '#0F172A', backgroundColor: '#FFFFFF' }}
            >
              <option value="">Select owner (optional)</option>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </div>

          <div style={{ padding: 16, backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8 }}>
            <p style={{ fontSize: 13, color: '#1E40AF', margin: 0 }}>
              <strong>Note:</strong> The cycle will be created in <strong>Draft</strong> status. Add test cases and start when ready.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={onClose} disabled={isSubmitting} style={{ height: 40, padding: '0 20px', backgroundColor: '#FFFFFF', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 14, fontWeight: 500, color: '#334155', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={isSubmitting || !name.trim()} style={{
            height: 40, padding: '0 20px',
            background: name.trim() ? 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' : '#94A3B8',
            border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, color: '#FFFFFF',
            cursor: name.trim() ? 'pointer' : 'not-allowed', opacity: isSubmitting ? 0.7 : 1,
          }}>
            {isSubmitting ? 'Creating...' : 'Create Cycle'}
          </button>
        </div>
      </div>
    </div>
  );
}
