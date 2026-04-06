/**
 * G8-03: Create Requirement Modal
 * Authority: tm_requirements
 */

import { useState, useEffect } from 'react';
import { X, FileCheck, Tag, User, FileText, AlertCircle, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';
import { useTheme } from '@/hooks/useTheme';

interface CreateRequirementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const TYPE_OPTIONS = [
  { value: 'functional', label: 'Functional' },
  { value: 'non_functional', label: 'Non-Functional' },
  { value: 'user_story', label: 'User Story' },
  { value: 'epic', label: 'Epic' },
  { value: 'feature', label: 'Feature' },
  { value: 'bug_fix', label: 'Bug Fix' },
];

const PRIORITY_OPTIONS = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

export function CreateRequirementModal({ isOpen, onClose, onCreated }: CreateRequirementModalProps) {
  const { isDark } = useTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('functional');
  const [priority, setPriority] = useState('medium');
  const [externalId, setExternalId] = useState('');
  const [source, setSource] = useState('');
  const [releaseVersion, setReleaseVersion] = useState('');
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
      if (user) { setCurrentUserId(user.id); setOwnerId(user.id); }
    };
    fetchUsers();
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTitle(''); setDescription(''); setType('functional'); setPriority('medium');
      setExternalId(''); setSource(''); setReleaseVersion('');
      if (currentUserId) setOwnerId(currentUserId);
      setErrors({});
    }
  }, [isOpen, currentUserId]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = 'Title is required';
    if (title.length > 255) newErrors.title = 'Title must be less than 255 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await (supabase as any)
        .from('tm_requirements')
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          type, priority, status: 'draft',
          external_id: externalId.trim() || null,
          source: source.trim() || null,
          release_version: releaseVersion.trim() || null,
          owner_id: ownerId || null,
          project_id: '00000000-0000-0000-0000-000000000001',
        })
        .select()
        .single();
      if (error) throw error;
      catalystToast.success(`Requirement ${(data as any).req_key} created`, { title: 'Success' });
      onCreated();
      onClose();
    } catch (err) {
      console.error('Create requirement error:', err);
      catalystToast.error('Failed to create requirement');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const inputStyle = (hasError?: boolean): React.CSSProperties => ({
    width: '100%', height: 44, padding: '0 14px',
    border: `1.5px solid ${hasError ? '#DC2626' : isDark ? '#2E2E2E' : '#E2E8F0'}`,
    borderRadius: 12, fontSize: 14,
    backgroundColor: isDark ? '#1A1A1A' : undefined,
    color: isDark ? '#EDEDED' : undefined,
  });

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 600, maxHeight: '90vh', backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF', borderRadius: 16, boxShadow: '0 25px 50px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: isDark ? '1px solid #2E2E2E' : '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileCheck size={22} style={{ color: '#FFFFFF' }} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: isDark ? '#EDEDED' : '#0F172A', margin: 0 }}>Add Requirement</h2>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 50, border: 'none', borderRadius: 8, backgroundColor: 'transparent', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: isDark ? '#EDEDED' : '#0F172A', marginBottom: 6 }}>
              Title <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., User can login with email and password" style={inputStyle(!!errors.title)} />
            {errors.title && (
              <p style={{ fontSize: 12, color: '#DC2626', margin: '6px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                <AlertCircle size={12} /> {errors.title}
              </p>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: isDark ? '#EDEDED' : '#0F172A', marginBottom: 6 }}>Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)} style={{ ...inputStyle(), backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF' }}>
                {TYPE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: isDark ? '#EDEDED' : '#0F172A', marginBottom: 6 }}>Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} style={{ ...inputStyle(), backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF' }}>
                {PRIORITY_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: isDark ? '#EDEDED' : '#0F172A', marginBottom: 6 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><ExternalLink size={14} /> External ID</span>
              </label>
              <input type="text" value={externalId} onChange={(e) => setExternalId(e.target.value)} placeholder="e.g., JIRA-123" style={inputStyle()} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: isDark ? '#EDEDED' : '#0F172A', marginBottom: 6 }}>Source</label>
              <input type="text" value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g., Jira, Azure DevOps" style={inputStyle()} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: isDark ? '#EDEDED' : '#0F172A', marginBottom: 6 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Tag size={14} /> Release Version</span>
              </label>
              <input type="text" value={releaseVersion} onChange={(e) => setReleaseVersion(e.target.value)} placeholder="e.g., 2.0.0" style={inputStyle()} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: isDark ? '#EDEDED' : '#0F172A', marginBottom: 6 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><User size={14} /> Owner</span>
              </label>
              <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} style={{ ...inputStyle(), backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF' }}>
                <option value="">Select owner</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: isDark ? '#EDEDED' : '#0F172A', marginBottom: 6 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FileText size={14} /> Description</span>
            </label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of the requirement..." rows={4}
              style={{ width: '100%', padding: 14, border: isDark ? '1.5px solid #2E2E2E' : '1.5px solid #E2E8F0', borderRadius: 12, fontSize: 14, resize: 'vertical', backgroundColor: isDark ? '#1A1A1A' : undefined, color: isDark ? '#EDEDED' : undefined }} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: isDark ? '1px solid #2E2E2E' : '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={onClose} disabled={isSubmitting}
            style={{ height: 44, padding: '0 20px', backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF', border: isDark ? '1.5px solid #2E2E2E' : '1.5px solid #E2E8F0', borderRadius: 12, fontSize: 14, fontWeight: 500, color: isDark ? '#A1A1A1' : '#64748B', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={isSubmitting}
            style={{ height: 44, padding: '0 24px', backgroundColor: '#2563EB', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, color: '#FFFFFF', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileCheck size={16} /> {isSubmitting ? 'Creating...' : 'Add Requirement'}
          </button>
        </div>
      </div>
    </div>
  );
}