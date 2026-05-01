import { useState, useEffect } from 'react';
import { X, ClipboardList, Calendar, User, Tag, FileText, Target, AlertCircle } from 'lucide-react';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';

interface CreatePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreatePlanModal({ isOpen, onClose, onCreated }: CreatePlanModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [releaseVersion, setReleaseVersion] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [objectives, setObjectives] = useState('');
  const [scope, setScope] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [users, setUsers] = useState<{ id: string; full_name: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase.from('profiles').select('id, full_name').order('full_name');
      if (data) setUsers(data);
    };
    const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        setOwnerId(user.id);
      }
    };
    fetchUsers();
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setReleaseVersion('');
      setStartDate('');
      setEndDate('');
      setObjectives('');
      setScope('');
      if (currentUserId) setOwnerId(currentUserId);
      setErrors({});
    }
  }, [isOpen, currentUserId]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (name.length > 255) newErrors.name = 'Name must be less than 255 characters';
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      newErrors.endDate = 'End date must be after start date';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await typedQuery('tm_test_plans')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          release_version: releaseVersion.trim() || null,
          start_date: startDate || null,
          end_date: endDate || null,
          objectives: objectives.trim() || null,
          scope: scope.trim() || null,
          owner_id: ownerId || null,
          status: 'draft',
        } as any)
        .select()
        .single();

      if (error) throw error;

      catalystToast.success(`Plan ${(data as any).plan_key} created`, { title: 'Success' });
      onCreated();
      onClose();
    } catch (err) {
      console.error('Create plan error:', err);
      catalystToast.error('Failed to create plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const inputStyle = (hasError?: boolean) => ({
    width: '100%',
    height: 44,
    padding: '0 14px',
    border: `1.5px solid ${hasError ? 'var(--sem-danger)' : 'var(--divider)'}`,
    borderRadius: 12,
    fontSize: 14,
  });

  const labelStyle = { display: 'block' as const, fontSize: 13, fontWeight: 600, color: 'var(--fg-1)', marginBottom: 6 };

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000, padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 600, maxHeight: '90vh', backgroundColor: 'var(--cp-float)',
        borderRadius: 16, boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--divider)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg, var(--ds-text-brand, #2563EB) 0%, #1E3A8A 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ClipboardList size={22} style={{ color: 'var(--ds-text-inverse, #FFFFFF)' }} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg-1)', margin: 0 }}>Create Test Plan</h2>
          </div>
          <button onClick={onClose} style={{
            width: 36, height: 50, border: 'none', borderRadius: 8,
            backgroundColor: 'transparent', color: 'var(--fg-3)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><X size={20} /></button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Plan Name <span style={{ color: 'var(--sem-danger)' }}>*</span></label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Release 2.0 Testing" style={inputStyle(!!errors.name)} />
            {errors.name && (
              <p style={{ fontSize: 12, color: 'var(--sem-danger)', margin: '6px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                <AlertCircle size={12} /> {errors.name}
              </p>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Tag size={14} /> Release Version</span>
              </label>
              <input type="text" value={releaseVersion} onChange={(e) => setReleaseVersion(e.target.value)}
                placeholder="e.g., 2.0.0" style={inputStyle()} />
            </div>
            <div>
              <label style={labelStyle}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><User size={14} /> Owner</span>
              </label>
              <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}
                style={{ ...inputStyle(), backgroundColor: 'var(--cp-float)' }}>
                <option value="">Select owner</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.full_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={14} /> Start Date</span>
              </label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle()} />
            </div>
            <div>
              <label style={labelStyle}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={14} /> End Date</span>
              </label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle(!!errors.endDate)} />
              {errors.endDate && <p style={{ fontSize: 12, color: 'var(--sem-danger)', margin: '6px 0 0' }}>{errors.endDate}</p>}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FileText size={14} /> Description</span>
            </label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the test plan..." rows={3}
              style={{ width: '100%', padding: 14, border: '1.5px solid var(--divider)', borderRadius: 12, fontSize: 14, resize: 'vertical' }} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Target size={14} /> Objectives</span>
            </label>
            <textarea value={objectives} onChange={(e) => setObjectives(e.target.value)}
              placeholder="What are the testing objectives?" rows={3}
              style={{ width: '100%', padding: 14, border: '1.5px solid var(--divider)', borderRadius: 12, fontSize: 14, resize: 'vertical' }} />
          </div>

          <div>
            <label style={labelStyle}>Scope</label>
            <textarea value={scope} onChange={(e) => setScope(e.target.value)}
              placeholder="What is in/out of scope for this plan?" rows={3}
              style={{ width: '100%', padding: 14, border: '1.5px solid var(--divider)', borderRadius: 12, fontSize: 14, resize: 'vertical' }} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--divider)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={onClose} disabled={isSubmitting} style={{
            height: 44, padding: '0 20px', backgroundColor: 'var(--cp-float)', border: '1.5px solid var(--divider)',
            borderRadius: 12, fontSize: 14, fontWeight: 500, color: 'var(--fg-2)', cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={handleSubmit} disabled={isSubmitting} style={{
            height: 44, padding: '0 24px',
            background: 'linear-gradient(135deg, var(--ds-text-brand, #2563EB) 0%, #1E3A8A 100%)',
            border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, color: 'var(--ds-text-inverse, #FFFFFF)',
            cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <ClipboardList size={16} />
            {isSubmitting ? 'Creating...' : 'Create Plan'}
          </button>
        </div>
      </div>
    </div>
  );
}
