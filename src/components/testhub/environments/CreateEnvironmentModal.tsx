import { useState, useEffect } from 'react';
import { X, Server, Globe, Link2, Database, User, FileText, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';

interface CreateEnvironmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const TYPE_OPTIONS = [
  { value: 'development', label: 'Development' },
  { value: 'testing', label: 'Testing / QA' },
  { value: 'staging', label: 'Staging' },
  { value: 'uat', label: 'UAT' },
  { value: 'production', label: 'Production' },
  { value: 'other', label: 'Other' },
];

export function CreateEnvironmentModal({ isOpen, onClose, onCreated }: CreateEnvironmentModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState('testing');
  const [url, setUrl] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [databaseInfo, setDatabaseInfo] = useState('');
  const [description, setDescription] = useState('');
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
      setName(''); setType('testing'); setUrl(''); setApiUrl('');
      setDatabaseInfo(''); setDescription('');
      if (currentUserId) setOwnerId(currentUserId);
      setErrors({});
    }
  }, [isOpen, currentUserId]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (name.length > 100) newErrors.name = 'Name must be less than 100 characters';
    if (url && !url.match(/^https?:\/\/.+/)) newErrors.url = 'URL must start with http:// or https://';
    if (apiUrl && !apiUrl.match(/^https?:\/\/.+/)) newErrors.apiUrl = 'API URL must start with http:// or https://';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await (supabase as any)
        .from('th_environments')
        .insert({
          name: name.trim(),
          type,
          status: 'active',
          health_status: 'unknown',
          url: url.trim() || null,
          api_url: apiUrl.trim() || null,
          database_info: databaseInfo.trim() || null,
          description: description.trim() || null,
          owner_id: ownerId || null,
        })
        .select()
        .single();
      if (error) throw error;
      catalystToast.success(`Environment ${data.env_key} created`, { title: 'Success' });
      onCreated();
      onClose();
    } catch (err) {
      console.error('Create environment error:', err);
      catalystToast.error('Failed to create environment');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 550, maxHeight: '90vh', backgroundColor: '#FFFFFF', borderRadius: 16, boxShadow: '0 25px 50px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Server size={22} style={{ color: '#FFFFFF' }} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0 }}>Add Environment</h2>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, border: 'none', borderRadius: 8, backgroundColor: 'transparent', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 6 }}>
                Name <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., QA Environment"
                style={{ width: '100%', height: 44, padding: '0 14px', border: `1.5px solid ${errors.name ? '#DC2626' : '#E2E8F0'}`, borderRadius: 10, fontSize: 14 }} />
              {errors.name && <p style={{ fontSize: 12, color: '#DC2626', margin: '6px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={12} /> {errors.name}</p>}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 6 }}>Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)}
                style={{ width: '100%', height: 44, padding: '0 14px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 14, backgroundColor: '#FFFFFF' }}>
                {TYPE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 6 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Globe size={14} /> Application URL</span>
            </label>
            <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://qa.example.com"
              style={{ width: '100%', height: 44, padding: '0 14px', border: `1.5px solid ${errors.url ? '#DC2626' : '#E2E8F0'}`, borderRadius: 10, fontSize: 14 }} />
            {errors.url && <p style={{ fontSize: 12, color: '#DC2626', margin: '6px 0 0' }}>{errors.url}</p>}
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 6 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Link2 size={14} /> API URL</span>
            </label>
            <input type="text" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="https://api.qa.example.com"
              style={{ width: '100%', height: 44, padding: '0 14px', border: `1.5px solid ${errors.apiUrl ? '#DC2626' : '#E2E8F0'}`, borderRadius: 10, fontSize: 14 }} />
            {errors.apiUrl && <p style={{ fontSize: 12, color: '#DC2626', margin: '6px 0 0' }}>{errors.apiUrl}</p>}
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 6 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Database size={14} /> Database Info</span>
            </label>
            <input type="text" value={databaseInfo} onChange={(e) => setDatabaseInfo(e.target.value)} placeholder="e.g., PostgreSQL @ db.qa.example.com:5432"
              style={{ width: '100%', height: 44, padding: '0 14px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 14 }} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 6 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><User size={14} /> Owner</span>
            </label>
            <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}
              style={{ width: '100%', height: 44, padding: '0 14px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 14, backgroundColor: '#FFFFFF' }}>
              <option value="">Select owner</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 6 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FileText size={14} /> Description</span>
            </label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Notes about this environment..." rows={3}
              style={{ width: '100%', padding: 14, border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 14, resize: 'vertical' }} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={onClose} disabled={isSubmitting}
            style={{ height: 44, padding: '0 20px', backgroundColor: '#FFFFFF', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 14, fontWeight: 500, color: '#334155', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={isSubmitting}
            style={{ height: 44, padding: '0 24px', background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#FFFFFF', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Server size={16} /> {isSubmitting ? 'Creating...' : 'Add Environment'}
          </button>
        </div>
      </div>
    </div>
  );
}
