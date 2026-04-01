import { useState, useEffect, useMemo, useRef } from 'react';
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

function useIsDark() {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
}

export function CreateProjectDialog({ open, onClose }: Props) {
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [keyManuallyEdited, setKeyManuallyEdited] = useState(false);
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('todo');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const createProject = useCreateProject();
  const { data: projects } = useProjects();
  const overlayRef = useRef<HTMLDivElement>(null);
  const dk = useIsDark();

  const existingKeys = new Set((projects ?? []).map(p => p.project_key?.toUpperCase()).filter(Boolean));
  const isDuplicate = key.length >= 3 && existingKeys.has(key);

  const uniqueDepartments = useMemo(() => {
    const depts = new Set((projects ?? []).map(p => p.department).filter(Boolean));
    return Array.from(depts).sort() as string[];
  }, [projects]);

  useEffect(() => {
    if (!keyManuallyEdited) {
      setKey(deriveKeyFromName(name));
    }
  }, [name, keyManuallyEdited]);

  useEffect(() => {
    if (!open) {
      setName(''); setKey(''); setKeyManuallyEdited(false);
      setDepartment(''); setStatus('todo'); setDescription(''); setErrors({});
    }
  }, [open]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2) errs.name = 'Project name is required';
    if (!key || key.length < 3 || key.length > 4 || !/^[A-Z]+$/.test(key)) errs.key = 'Key must be 3-4 uppercase letters';
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
        status_category: status,
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

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  if (!open) return null;

  // Dark / Light tokens
  const surface = dk ? '#232019' : 'var(--bg-app)';
  const textPrimary = dk ? 'rgba(248,244,240,0.92)' : 'var(--fg-1)';
  const textSecondary = dk ? 'rgba(248,244,240,0.72)' : 'var(--fg-2)';
  const textMuted = dk ? 'rgba(248,244,240,0.55)' : 'var(--fg-4)';
  const textPlaceholder = dk ? 'rgba(248,244,240,0.40)' : undefined;
  const border = dk ? 'rgba(248,244,240,0.10)' : 'var(--divider)';
  const divider = dk ? 'rgba(248,244,240,0.08)' : 'var(--divider)';
  const inputBg = dk ? 'transparent' : 'var(--bg-app)';
  const closeHoverBg = dk ? 'rgba(248,244,240,0.06)' : 'var(--cp-bd-zone)';
  const cancelBg = dk ? 'transparent' : 'var(--bg-app)';
  const cancelHoverBg = dk ? 'rgba(248,244,240,0.06)' : 'var(--bg-1)';
  const dropdownBg = dk ? '#232019' : 'var(--cp-float)';

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: 36,
    padding: '0 12px',
    border: `1.5px solid ${border}`,
    borderRadius: 6,
    fontSize: 14,
    fontFamily: "'Inter', sans-serif",
    color: textPrimary,
    outline: 'none',
    background: inputBg,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 500,
    color: textPrimary,
    display: 'block',
    marginBottom: 6,
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1600,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: surface, borderRadius: 12, width: 520, maxHeight: '80vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: dk ? '0 25px 50px -12px rgba(0,0,0,0.5)' : '0 25px 50px -12px rgba(0,0,0,0.25)',
          animation: 'slideUp 250ms ease-out',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: `1px solid ${divider}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 18, fontWeight: 600, color: textPrimary }}>
            Create New Project
          </span>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 6, border: 'none', background: 'transparent',
              color: textSecondary, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = closeHoverBg)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
          {/* Project Name */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Project Name <span style={{ color: 'var(--sem-danger)' }}>*</span></label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter project name"
              style={{ ...inputStyle, ...(textPlaceholder ? { ['--placeholder-color' as string]: textPlaceholder } : {}) }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--cp-blue)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.18)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.boxShadow = 'none'; }}
            />
            {errors.name && <p style={{ fontSize: 12, color: 'var(--sem-danger)', marginTop: 4 }}>{errors.name}</p>}
          </div>

          {/* Project Key */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Project Key <span style={{ color: 'var(--sem-danger)' }}>*</span></label>
            <input
              value={key}
              onChange={e => {
                setKeyManuallyEdited(true);
                setKey(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 4));
              }}
              placeholder="ABC"
              maxLength={4}
              style={{
                ...inputStyle,
                textTransform: 'uppercase',
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: '0.05em',
                borderColor: (errors.key || isDuplicate) ? '#DC2626' : border,
              }}
              onFocus={e => {
                if (!errors.key && !isDuplicate) {
                  e.currentTarget.style.borderColor = 'var(--cp-blue)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.18)';
                }
              }}
              onBlur={e => {
                if (!errors.key && !isDuplicate) {
                  e.currentTarget.style.borderColor = border;
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            />
            {errors.key && <p style={{ fontSize: 12, color: 'var(--sem-danger)', marginTop: 4 }}>{errors.key}</p>}
            {!errors.key && (
              <p style={{ fontSize: 11, color: textMuted, marginTop: 4 }}>Auto-generated from project name · 3–4 letters</p>
            )}
          </div>

          {/* Department + Status row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Department</label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger
                  className="h-9 text-sm"
                  style={{ border: `1.5px solid ${border}`, borderRadius: 6, background: inputBg, color: textPrimary }}
                >
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent
                  style={{ zIndex: 9999, background: dropdownBg }}
                  onPointerDownOutside={e => e.preventDefault()}
                >
                  {uniqueDepartments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger
                  className="h-9 text-sm"
                  style={{ border: `1.5px solid ${border}`, borderRadius: 6, background: inputBg, color: textPrimary }}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  style={{ zIndex: 9999, background: dropdownBg }}
                  onPointerDownOutside={e => e.preventDefault()}
                >
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
                border: `1.5px solid ${border}`, borderRadius: 6,
                fontSize: 14, fontFamily: "'Inter', sans-serif", color: textPrimary,
                resize: 'vertical', outline: 'none', background: inputBg,
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--cp-blue)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.18)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: `1px solid ${divider}`,
          display: 'flex', gap: 12, justifyContent: 'flex-end',
        }}>
          <button
            onClick={onClose}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px',
              background: cancelBg, color: textSecondary, border: `1px solid ${border}`, borderRadius: 6,
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = cancelHoverBg; }}
            onMouseLeave={e => { e.currentTarget.style.background = cancelBg; }}
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
              boxShadow: dk ? 'none' : '0 1px 3px rgba(37,99,235,0.15)',
              opacity: createProject.isPending ? 0.6 : 1,
            }}
            onMouseEnter={e => { if (!createProject.isPending) e.currentTarget.style.boxShadow = dk ? '0 2px 8px rgba(37,99,235,0.4)' : '0 2px 8px rgba(37,99,235,0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = dk ? 'none' : '0 1px 3px rgba(37,99,235,0.15)'; }}
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