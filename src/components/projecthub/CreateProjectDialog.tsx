import { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateProject, useProjects } from '@/hooks/useProjectHub';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Extract first 3 letters (alpha only) from a name, uppercase */
function deriveKeyFromName(name: string): string {
  const letters = name.replace(/[^a-zA-Z]/g, '').toUpperCase();
  return letters.slice(0, 3);
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 36,
  padding: '0 12px',
  border: '1.5px solid #E2E8F0',
  borderRadius: 6,
  fontSize: 14,
  fontFamily: "'Inter', sans-serif",
  color: '#0F172A',
  outline: 'none',
  background: '#FFFFFF',
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: '#0F172A',
  display: 'block',
  marginBottom: 6,
};

export function CreateProjectDialog({ open, onClose }: Props) {
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [department, setDepartment] = useState('');
  const [category, setCategory] = useState('todo');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const createProject = useCreateProject();
  const { data: projects } = useProjects();

  const existingKeys = new Set((projects ?? []).map(p => p.project_key?.toUpperCase()).filter(Boolean));
  const isDuplicate = key.length >= 2 && existingKeys.has(key);

  const uniqueDepartments = useMemo(() => {
    const depts = new Set((projects ?? []).map(p => p.department).filter(Boolean));
    return Array.from(depts).sort() as string[];
  }, [projects]);

  // Auto-generate key when name changes
  useEffect(() => {
    setKey(deriveKeyFromName(name));
  }, [name]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setName(''); setKey(''); setDepartment(''); setCategory('todo'); setDescription(''); setErrors({});
    }
  }, [open]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2) errs.name = 'Project name is required';
    if (!key || key.length < 2 || key.length > 4 || !/^[A-Z]+$/.test(key)) errs.key = 'Key must be 2-4 uppercase letters';
    if (isDuplicate) errs.key = 'A project with this key already exists';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      await createProject.mutateAsync({
        name: name.trim(),
        project_key: key,
        department: department || undefined,
        description: description.trim() || undefined,
        status_category: category,
      });
      toast.success('Project created successfully');
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('duplicate')) {
        setErrors(prev => ({ ...prev, key: 'A project with this key already exists' }));
      } else {
        toast.error(err instanceof Error ? err.message : 'Failed to create project');
      }
    }
  };

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1600,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#FFFFFF', borderRadius: 12, width: 520, maxHeight: '80vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          animation: 'slideUp 250ms ease-out',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #E2E8F0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 18, fontWeight: 600, color: '#0F172A' }}>
            Create New Project
          </span>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 6, border: 'none', background: 'transparent',
              color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F1F5F9')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
          {/* Project Name */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Project Name <span style={{ color: '#DC2626' }}>*</span></label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter project name"
              style={inputStyle}
              onFocus={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.18)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
            />
            {errors.name && <p style={{ fontSize: 12, color: '#DC2626', marginTop: 4 }}>{errors.name}</p>}
          </div>

          {/* Project Key */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Project Key <span style={{ color: '#DC2626' }}>*</span></label>
            <input
              value={key}
              onChange={e => setKey(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 4))}
              placeholder="ABC"
              maxLength={4}
              style={{
                ...inputStyle,
                textTransform: 'uppercase',
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: '0.05em',
                borderColor: (errors.key || isDuplicate) ? '#DC2626' : '#E2E8F0',
              }}
              onFocus={e => {
                if (!errors.key && !isDuplicate) {
                  e.currentTarget.style.borderColor = '#2563EB';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.18)';
                }
              }}
              onBlur={e => {
                if (!errors.key && !isDuplicate) {
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            />
            {errors.key && <p style={{ fontSize: 12, color: '#DC2626', marginTop: 4 }}>{errors.key}</p>}
            {!errors.key && (
              <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>Auto-generated from project name · 2–4 letters</p>
            )}
          </div>

          {/* Department + Category row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Department</label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger
                  className="h-9 text-sm"
                  style={{ border: '1.5px solid #E2E8F0', borderRadius: 6 }}
                >
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueDepartments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label style={labelStyle}>Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger
                  className="h-9 text-sm"
                  style={{ border: '1.5px solid #E2E8F0', borderRadius: 6 }}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: 0 }}>
            <label style={labelStyle}>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief project description..."
              rows={3}
              style={{
                width: '100%', minHeight: 80, padding: 12,
                border: '1.5px solid #E2E8F0', borderRadius: 6,
                fontSize: 14, fontFamily: "'Inter', sans-serif", color: '#0F172A',
                resize: 'vertical', outline: 'none',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.18)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid #E2E8F0',
          display: 'flex', gap: 12, justifyContent: 'flex-end',
        }}>
          <button
            onClick={onClose}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px',
              background: '#FFFFFF', color: '#334155', border: '1px solid #E2E8F0', borderRadius: 6,
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={createProject.isPending}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 14px',
              background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', color: '#FFFFFF',
              border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(37,99,235,0.15)',
              opacity: createProject.isPending ? 0.6 : 1,
            }}
            onMouseEnter={e => { if (!createProject.isPending) e.currentTarget.style.boxShadow = '0 2px 8px rgba(37,99,235,0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(37,99,235,0.15)'; }}
          >
            {createProject.isPending ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
