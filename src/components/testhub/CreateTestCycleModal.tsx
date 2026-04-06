import { useState, useEffect, useRef } from 'react';
import { X, Calendar, User, AlertCircle, Server, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from '@/hooks/useTheme';

const CYCLE_STATUS_OPTIONS = [
  { value: 'draft', label: 'DRAFT', bg: '#DFE1E6', text: '#253858' },
  { value: 'planned', label: 'PLANNED', bg: 'rgba(59,130,246,0.10)', text: '#0747A6' },
  { value: 'active', label: 'IN PROGRESS', bg: 'rgba(59,130,246,0.10)', text: '#0747A6' },
  { value: 'completed', label: 'COMPLETED', bg: 'rgba(74,222,128,0.10)', text: '#006644' },
  { value: 'paused', label: 'PAUSED', bg: '#DFE1E6', text: '#253858' },
  { value: 'archived', label: 'ARCHIVED', bg: '#DFE1E6', text: '#253858' },
] as const;
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
  planned_start: string | null;
  planned_end: string | null;
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
  const { isDark } = useTheme();
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

  const [cycleStatus, setCycleStatus] = useState('draft');
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);

  // Close status dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setStatusDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    let isCancelled = false;

    const loadModalData = async () => {
      const [profilesResult, environmentsResult] = await Promise.all([
        supabase.from('profiles').select('id, full_name').order('full_name'),
        (supabase as any)
          .from('tm_environments')
          .select('id, name, type, health_status')
          .eq('status', 'active')
          .order('name'),
      ]);

      if (isCancelled) return;

      if (profilesResult.data) setProfiles(profilesResult.data);
      if (environmentsResult.data) setEnvironments(environmentsResult.data);

      if (mode === 'edit' && cycle?.id) {
        let sourceCycle = cycle;

        const { data: latestCycle, error: cycleError } = await (supabase as any)
          .from('tm_test_cycles')
          .select('id, cycle_key, name, description, planned_start, planned_end, environment_id, status')
          .eq('id', cycle.id)
          .maybeSingle();

        if (!cycleError && latestCycle) {
          sourceCycle = latestCycle;
        } else if (cycleError) {
          console.error('Failed to load latest test cycle for edit modal:', cycleError);
        }

        if (isCancelled) return;

        setName(sourceCycle.name || '');
        setDescription(sourceCycle.description || '');
        setStartDate(sourceCycle.planned_start || '');
        setEndDate(sourceCycle.planned_end || '');
        setOwnerId('');
        setEnvironmentId(sourceCycle.environment_id || '');
        setCycleStatus(sourceCycle.status || 'draft');
      } else {
        setName('');
        setDescription('');
        setStartDate('');
        setEndDate('');
        setOwnerId('');
        setEnvironmentId('');
        setCycleStatus('draft');
      }

      setStatusDropdownOpen(false);
      setErrors({});
    };

    void loadModalData();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, mode, cycle?.id]);

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
      const { data: lastCycle } = await (supabase as any)
        .from('tm_test_cycles').select('cycle_key').order('created_at', { ascending: false }).limit(1);
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
          planned_start: startDate || null,
          planned_end: endDate || null,
          environment_id: environmentId || null,
          status: cycleStatus,
          updated_at: new Date().toISOString(),
        };

        const { error } = await (supabase as any)
          .from('tm_test_cycles')
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
          planned_start: startDate || null,
          planned_end: endDate || null,
          environment_id: environmentId || null,
          status: 'draft',
          total_cases: 0, passed_count: 0, failed_count: 0,
          blocked_count: 0, skipped_count: 0, not_run_count: 0,
          project_id: '00000000-0000-0000-0000-000000000001',
        };
        const { error } = await (supabase as any).from('tm_test_cycles').insert(insertData).select().single();

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
              style={{ width: '100%', height: 40, padding: '8px 12px', border: `1.5px solid ${errors.name ? 'var(--sem-danger)' : 'var(--divider)'}`, borderRadius: 8, fontSize: 14, color: 'var(--fg-1)' }}
            />
            {errors.name && <p style={{ fontSize: 12, color: 'var(--sem-danger)', margin: '6px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={12} />{errors.name}</p>}
          </div>

          {/* Status — edit mode only */}
          {isEdit && (
            <div style={{ marginBottom: 20 }} ref={statusRef}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--fg-1)', marginBottom: 6 }}>
                Status <span style={{ color: 'var(--sem-danger)' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                  style={{
                    width: '100%', height: 40, padding: '8px 12px',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.10)'}`, borderRadius: 6,
                    fontSize: 14, color: isDark ? '#EDEDED' : 'rgba(237,237,237,0.53)', backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
                    fontFamily: 'Geist, -apple-system, sans-serif',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    cursor: 'pointer', outline: 'none',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {(() => {
                      const opt = CYCLE_STATUS_OPTIONS.find(o => o.value === cycleStatus);
                      if (!opt) return cycleStatus;
                      return (
                        <span style={{
                          display: 'inline-block', padding: '0 6px', height: 20,
                          lineHeight: '20px', fontSize: 11, fontWeight: 700,
                          textTransform: 'uppercase', letterSpacing: '0.03em',
                          borderRadius: 4, backgroundColor: opt.bg, color: opt.text,
                        }}>{opt.label}</span>
                      );
                    })()}
                  </span>
                  <ChevronDown size={16} style={{ color: 'rgba(237,237,237,0.40)' }} />
                </button>
                {statusDropdownOpen && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0,
                    marginTop: 4, backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.10)'}`, borderRadius: 6,
                    boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.1)',
                    zIndex: 50, overflow: 'hidden',
                  }}>
                    {CYCLE_STATUS_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => { setCycleStatus(opt.value); setStatusDropdownOpen(false); }}
                        style={{
                          width: '100%', padding: '8px 12px', border: 'none',
                          backgroundColor: cycleStatus === opt.value ? (isDark ? '#1A1A1A' : '#1A1A1A') : 'transparent',
                          display: 'flex', alignItems: 'center', gap: 8,
                          cursor: 'pointer', fontSize: 14, color: isDark ? '#EDEDED' : 'rgba(237,237,237,0.53)',
                          fontFamily: 'Geist, -apple-system, sans-serif',
                        }}
                        onMouseEnter={(e) => { (e.target as HTMLElement).style.backgroundColor = isDark ? '#1A1A1A' : '#1A1A1A'; }}
                        onMouseLeave={(e) => { (e.target as HTMLElement).style.backgroundColor = cycleStatus === opt.value ? (isDark ? '#1A1A1A' : '#1A1A1A') : 'transparent'; }}
                      >
                        <span style={{
                          display: 'inline-block', padding: '0 6px', height: 20,
                          lineHeight: '20px', fontSize: 11, fontWeight: 700,
                          textTransform: 'uppercase', letterSpacing: '0.03em',
                          borderRadius: 4, backgroundColor: opt.bg, color: opt.text,
                        }}>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

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
              <input
                type="text"
                placeholder="YYYY-MM-DD"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                onFocus={(e) => { (e.target as HTMLInputElement).type = 'date'; }}
                onBlur={(e) => { if (!(e.target as HTMLInputElement).value) { (e.target as HTMLInputElement).type = 'text'; } }}
                style={{ width: '100%', height: 40, padding: '8px 12px', border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.10)'}`, borderRadius: 4, fontSize: 14, color: isDark ? '#EDEDED' : 'rgba(237,237,237,0.93)', backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF', fontFamily: 'Geist, -apple-system, sans-serif', outline: 'none', boxSizing: 'border-box' } as React.CSSProperties}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--fg-1)', marginBottom: 6 }}>
                <Calendar size={14} style={{ color: 'var(--fg-3)' }} /> End Date
              </label>
              <input
                type="text"
                placeholder="YYYY-MM-DD"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                onFocus={(e) => { (e.target as HTMLInputElement).type = 'date'; (e.target as HTMLInputElement).min = startDate; }}
                onBlur={(e) => { if (!(e.target as HTMLInputElement).value) { (e.target as HTMLInputElement).type = 'text'; } }}
                style={{ width: '100%', height: 40, padding: '8px 12px', border: `1.5px solid ${errors.endDate ? '#EF4444' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.10)')}`, borderRadius: 4, fontSize: 14, color: isDark ? '#EDEDED' : 'rgba(237,237,237,0.93)', backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF', fontFamily: 'Geist, -apple-system, sans-serif', outline: 'none', boxSizing: 'border-box' } as React.CSSProperties}
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
              style={{ width: '100%', height: 40, padding: '8px 12px', border: '1.5px solid var(--divider)', borderRadius: 4, fontSize: 14, color: 'var(--fg-1)', backgroundColor: 'var(--cp-float)', appearance: 'none', WebkitAppearance: 'none' }}
            >
              <option value="">Select environment (optional)</option>
              {environments.map(env => (
                <option key={env.id} value={env.id}>
                  {env.name} ({env.type})
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
              style={{ width: '100%', height: 40, padding: '8px 12px', border: '1.5px solid var(--divider)', borderRadius: 4, fontSize: 14, color: 'var(--fg-1)', backgroundColor: 'var(--cp-float)', appearance: 'none', WebkitAppearance: 'none' }}
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
          <button type="button" onClick={handleSubmit} disabled={isSubmitting} style={{
            height: 40, padding: '0 24px',
            backgroundColor: isSubmitting ? '#93C5FD' : '#2563EB',
            border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, color: '#FFFFFF',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 8,
            opacity: isSubmitting ? 0.7 : 1,
            transition: 'background-color 0.15s',
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
