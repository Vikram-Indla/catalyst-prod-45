import { useState, useEffect, useMemo } from 'react';
import { Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DangerZone } from './DangerZone';

const DEPARTMENTS = [
  'Technology & Innovation', 'Industrial Development', 'Mining & Minerals',
  'Energy & Sustainability', 'Regulatory Affairs', 'Strategy & Planning',
  'Human Capital', 'Finance & Admin',
];

const STATUSES = ['active', 'on_hold', 'completed'];

interface GeneralTabProps {
  project: {
    id: string;
    key: string;
    name: string;
    description: string | null;
    department: string;
    status: string;
    start_date: string | null;
    end_date: string | null;
    feature_layer: boolean | null;
    ai_assist: boolean | null;
  };
  onSaved: () => void;
}

export function GeneralTab({ project, onSaved }: GeneralTabProps) {
  const [form, setForm] = useState({
    name: project.name,
    department: project.department,
    description: project.description || '',
    status: project.status,
    start_date: project.start_date || '',
    end_date: project.end_date || '',
    feature_layer: project.feature_layer ?? false,
    ai_assist: project.ai_assist ?? true,
  });
  const [saving, setSaving] = useState(false);

  // Reset form when project changes
  useEffect(() => {
    setForm({
      name: project.name,
      department: project.department,
      description: project.description || '',
      status: project.status,
      start_date: project.start_date || '',
      end_date: project.end_date || '',
      feature_layer: project.feature_layer ?? false,
      ai_assist: project.ai_assist ?? true,
    });
  }, [project]);

  const isDirty = useMemo(() => {
    return (
      form.name !== project.name ||
      form.department !== project.department ||
      form.description !== (project.description || '') ||
      form.status !== project.status ||
      form.start_date !== (project.start_date || '') ||
      form.end_date !== (project.end_date || '') ||
      form.feature_layer !== (project.feature_layer ?? false) ||
      form.ai_assist !== (project.ai_assist ?? true)
    );
  }, [form, project]);

  const handleSave = async () => {
    if (!form.name.trim() || !form.department) {
      toast.error('Name and Department are required');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('ph_projects')
        .update({
          name: form.name.trim(),
          department: form.department,
          description: form.description.trim() || null,
          status: form.status,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
          feature_layer: form.feature_layer,
          ai_assist: form.ai_assist,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', project.id);
      if (error) throw new Error(error.message);
      toast.success('Settings saved.');
      onSaved();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 40, padding: '0 12px', fontSize: 13,
    color: '#0F172A', background: '#FFFFFF', border: '1px solid #E2E8F0',
    borderRadius: 6, outline: 'none', fontFamily: "'Inter', sans-serif",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 500, color: '#334155', display: 'block', marginBottom: 4,
  };

  return (
    <div className="space-y-5">
      {/* General Settings Card */}
      <div
        className="rounded-xl"
        style={{
          background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12,
          padding: '20px 24px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', fontFamily: "'Sora', sans-serif", marginBottom: 16 }}>
          General Settings
        </h3>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label style={labelStyle}>Project Name <span style={{ color: '#EF4444' }}>*</span></label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              style={inputStyle}
            />
          </div>

          {/* Key (read-only) */}
          <div>
            <label style={labelStyle}>Project Key</label>
            <div className="relative">
              <input
                value={project.key}
                readOnly
                style={{
                  ...inputStyle,
                  background: '#F1F5F9', color: '#64748B', cursor: 'not-allowed',
                  fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.05em',
                  paddingRight: 36,
                }}
              />
              <Lock size={14} color="#94A3B8" className="absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Department */}
          <div>
            <label style={labelStyle}>Department <span style={{ color: '#EF4444' }}>*</span></label>
            <select
              value={form.department}
              onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              style={{ ...inputStyle, height: 'auto', padding: '8px 12px', resize: 'vertical' }}
            />
          </div>

          {/* Status */}
          <div>
            <label style={labelStyle}>Status</label>
            <select
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              {STATUSES.map(s => (
                <option key={s} value={s}>
                  {s === 'on_hold' ? 'On Hold' : s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Start Date</label>
              <input
                type="date"
                value={form.start_date}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                style={{ ...inputStyle, cursor: 'pointer' }}
              />
            </div>
            <div>
              <label style={labelStyle}>End Date</label>
              <input
                type="date"
                value={form.end_date}
                onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                style={{ ...inputStyle, cursor: 'pointer' }}
              />
            </div>
          </div>

          {/* Feature Layer Toggle */}
          <div className="flex items-start justify-between gap-4 pt-2">
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#0F172A' }}>Feature Layer</div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                Adds Feature as an intermediate level between Epic and Story
              </div>
            </div>
            <button
              onClick={() => setForm(f => ({ ...f, feature_layer: !f.feature_layer }))}
              className="flex-shrink-0 rounded-full transition-colors"
              style={{
                width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
                background: form.feature_layer ? '#2563EB' : '#CBD5E1',
                position: 'relative',
              }}
            >
              <span
                className="rounded-full transition-transform"
                style={{
                  width: 16, height: 16, background: '#FFFFFF', borderRadius: '50%',
                  position: 'absolute', top: 3,
                  left: form.feature_layer ? 21 : 3,
                  transition: 'left 150ms ease',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                }}
              />
            </button>
          </div>

          {/* AI Assist Toggle */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#0F172A' }}>AI Assist</div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                Enable AI features for this project
              </div>
            </div>
            <button
              onClick={() => setForm(f => ({ ...f, ai_assist: !f.ai_assist }))}
              className="flex-shrink-0 rounded-full transition-colors"
              style={{
                width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
                background: form.ai_assist ? '#2563EB' : '#CBD5E1',
                position: 'relative',
              }}
            >
              <span
                className="rounded-full transition-transform"
                style={{
                  width: 16, height: 16, background: '#FFFFFF', borderRadius: '50%',
                  position: 'absolute', top: 3,
                  left: form.ai_assist ? 21 : 3,
                  transition: 'left 150ms ease',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                }}
              />
            </button>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end mt-6 pt-4" style={{ borderTop: '1px solid #E2E8F0' }}>
          <button
            onClick={handleSave}
            disabled={!isDirty || saving}
            className="hover:opacity-90 transition-opacity disabled:opacity-40"
            style={{
              height: 36, padding: '0 20px', fontSize: 13, fontWeight: 600,
              color: '#FFFFFF', background: '#2563EB', border: 'none', borderRadius: 6,
              cursor: isDirty && !saving ? 'pointer' : 'default',
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <DangerZone projectId={project.id} projectName={project.name} />
    </div>
  );
}
