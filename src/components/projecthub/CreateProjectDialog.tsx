import { useState, useEffect, useMemo, useRef } from 'react';
import { X, Search, ChevronDown, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useCreateProject, useProjects } from '@/hooks/useProjectHub';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface Props {
  open: boolean;
  onClose: () => void;
}

function deriveKeyFromName(name: string): string {
  const letters = name.replace(/[^a-zA-Z]/g, '').toUpperCase();
  return letters.slice(0, 3);
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

const BADGE_COLORS = ['#0D9488', '#2563EB', '#6366F1', '#0891B2', '#475569', '#059669', '#4F46E5', '#0284C7'];
function getRandomBadgeColor() {
  return BADGE_COLORS[Math.floor(Math.random() * BADGE_COLORS.length)];
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
  const [leadId, setLeadId] = useState('');
  const [linkJira, setLinkJira] = useState(false);
  const [jiraKey, setJiraKey] = useState('');
  const [leadFilter, setLeadFilter] = useState('');
  const [showLeadPicker, setShowLeadPicker] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const createProject = useCreateProject();
  const { data: projects } = useProjects();
  const overlayRef = useRef<HTMLDivElement>(null);
  const dk = useIsDark();

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-all-create'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name, avatar_url, role').order('full_name');
      return (data || []).map(p => ({ ...p, display_name: p.full_name || '' }));
    },
    staleTime: 60_000,
  });

  const existingKeys = new Set((projects ?? []).map(p => p.project_key?.toUpperCase()).filter(Boolean));
  const isDuplicate = key.length >= 2 && existingKeys.has(key);

  const uniqueDepartments = useMemo(() => {
    const depts = new Set((projects ?? []).map(p => p.department).filter(Boolean));
    return Array.from(depts).sort() as string[];
  }, [projects]);

  const selectedLead = profiles.find(p => p.id === leadId);

  const filteredProfiles = profiles.filter(p =>
    p.display_name?.toLowerCase().includes(leadFilter.toLowerCase())
  );

  useEffect(() => {
    if (!keyManuallyEdited) setKey(deriveKeyFromName(name));
  }, [name, keyManuallyEdited]);

  useEffect(() => {
    if (!open) {
      setName(''); setKey(''); setKeyManuallyEdited(false);
      setDepartment(''); setStatus('todo'); setDescription('');
      setLeadId(''); setLinkJira(false); setJiraKey('');
      setLeadFilter(''); setShowLeadPicker(false); setErrors({});
    }
  }, [open]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2) errs.name = 'Project name is required';
    if (!key || key.length < 2 || key.length > 6 || !/^[A-Z0-9]+$/.test(key)) errs.key = 'Key must be 2–6 uppercase letters';
    if (isDuplicate) errs.key = 'A project with this key already exists';
    if (linkJira && !jiraKey.trim()) errs.jiraKey = 'Jira project key is required when linking';
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
        lead_id: leadId || undefined,
        jira_key: linkJira && jiraKey.trim() ? jiraKey.trim().toUpperCase() : undefined,
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
    if (e.target === overlayRef.current) onClose();
  };

  if (!open) return null;

  const surface = dk ? '#1A1A1A' : 'var(--bg-app)';
  const textPrimary = dk ? 'rgba(255,255,255,0.92)' : 'var(--fg-1)';
  const textSecondary = dk ? 'rgba(255,255,255,0.72)' : 'var(--fg-2)';
  const textMuted = dk ? 'rgba(255,255,255,0.55)' : 'var(--fg-4)';
  const border = dk ? 'rgba(255,255,255,0.10)' : 'var(--divider)';
  const divider = dk ? 'rgba(255,255,255,0.08)' : 'var(--divider)';
  const inputBg = dk ? 'transparent' : 'var(--bg-app)';
  const closeHoverBg = dk ? 'rgba(255,255,255,0.06)' : 'var(--cp-bd-zone)';
  const cancelBg = dk ? 'transparent' : 'var(--bg-app)';
  const cancelHoverBg = dk ? 'rgba(255,255,255,0.06)' : 'var(--bg-1)';
  const dropdownBg = dk ? '#1A1A1A' : 'var(--cp-float)';

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 36, padding: '0 12px',
    border: `1.5px solid ${border}`, borderRadius: 6,
    fontSize: 14, fontFamily: "'Inter', sans-serif",
    color: textPrimary, outline: 'none', background: inputBg,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 13, fontWeight: 500, color: textPrimary,
    display: 'block', marginBottom: 6,
  };

  const focusIn = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = 'var(--cp-blue)';
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.18)';
  };
  const focusOut = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = border;
    e.currentTarget.style.boxShadow = 'none';
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
          background: surface, borderRadius: 12, width: 520, maxHeight: '85vh',
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
          <div>
            <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 18, fontWeight: 600, color: textPrimary, display: 'block' }}>
              Create new project
            </span>
            <span style={{ fontSize: 13, color: textSecondary, marginTop: 2, display: 'block' }}>
              Add a project manually or link to an existing Jira project.
            </span>
          </div>
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
            <label style={labelStyle}>Project name <span style={{ color: '#DC2626' }}>*</span></label>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Digital Transformation Initiative"
              style={inputStyle} onFocus={focusIn} onBlur={focusOut}
            />
            {errors.name && <p style={{ fontSize: 12, color: '#DC2626', marginTop: 4 }}>{errors.name}</p>}
          </div>

          {/* Project Key */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Project key <span style={{ color: '#DC2626' }}>*</span></label>
            <input
              value={key}
              onChange={e => {
                setKeyManuallyEdited(true);
                setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
              }}
              placeholder="e.g. DTI" maxLength={6}
              style={{
                ...inputStyle, textTransform: 'uppercase',
                fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.05em',
                borderColor: (errors.key || isDuplicate) ? '#DC2626' : border,
              }}
              onFocus={e => { if (!errors.key && !isDuplicate) focusIn(e); }}
              onBlur={e => { if (!errors.key && !isDuplicate) focusOut(e); }}
            />
            {errors.key && <p style={{ fontSize: 12, color: '#DC2626', marginTop: 4 }}>{errors.key}</p>}
            {!errors.key && <p style={{ fontSize: 11, color: textMuted, marginTop: 4 }}>2–6 uppercase letters. Used as issue prefix.</p>}
          </div>

          {/* Department + Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Department</label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className="h-9 text-sm" style={{ border: `1.5px solid ${border}`, borderRadius: 6, background: inputBg, color: textPrimary }}>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent style={{ zIndex: 9999, background: dropdownBg }} onPointerDownOutside={e => e.preventDefault()}>
                  {uniqueDepartments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-9 text-sm" style={{ border: `1.5px solid ${border}`, borderRadius: 6, background: inputBg, color: textPrimary }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ zIndex: 9999, background: dropdownBg }} onPointerDownOutside={e => e.preventDefault()}>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Project Lead */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Project lead</label>
            <Popover open={showLeadPicker} onOpenChange={o => { setShowLeadPicker(o); if (!o) setLeadFilter(''); }}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  style={{
                    ...inputStyle, display: 'flex', alignItems: 'center', gap: 8,
                    cursor: 'pointer', justifyContent: 'space-between',
                  }}
                >
                  {selectedLead ? (
                    <span className="flex items-center gap-2 min-w-0">
                      <Avatar className="w-5 h-5 flex-shrink-0">
                        {selectedLead.avatar_url && <AvatarImage src={selectedLead.avatar_url} />}
                        <AvatarFallback className="text-[9px] font-bold text-white" style={{ background: '#475569' }}>
                          {getInitials(selectedLead.display_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate text-[13px]">{selectedLead.display_name}</span>
                    </span>
                  ) : (
                    <span style={{ color: textMuted, fontSize: 13 }}>Select lead...</span>
                  )}
                  <ChevronDown size={14} style={{ color: textMuted, flexShrink: 0 }} />
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[calc(100%-48px)] p-2"
                style={{ background: dk ? '#1A1A1A' : '#FFF', border: `1px solid ${border}`, borderRadius: 6, zIndex: 9999, minWidth: 260 }}
                align="start"
              >
                <div className="relative mb-2">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: textMuted }} />
                  <input
                    placeholder="Search people..."
                    value={leadFilter} onChange={e => setLeadFilter(e.target.value)}
                    autoFocus
                    className="h-8 w-full pl-8 pr-2 rounded text-[13px] placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    style={{ border: `1px solid ${border}`, background: inputBg, color: textPrimary }}
                  />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-0.5">
                  {filteredProfiles.map(p => (
                    <button
                      key={p.id}
                      onClick={() => { setLeadId(p.id); setShowLeadPicker(false); }}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-md text-sm hover:bg-slate-50 dark:hover:bg-slate-800 w-full text-left"
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                    >
                      <Avatar className="w-6 h-6">
                        {p.avatar_url && <AvatarImage src={p.avatar_url} />}
                        <AvatarFallback className="text-[10px] font-bold text-white" style={{ background: '#475569' }}>
                          {getInitials(p.display_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium truncate" style={{ color: textPrimary }}>{p.display_name}</div>
                        <div className="text-[11px] truncate" style={{ color: textMuted }}>{p.role || 'Team Member'}</div>
                      </div>
                    </button>
                  ))}
                  {filteredProfiles.length === 0 && <p className="text-xs text-center py-3" style={{ color: textMuted }}>No results</p>}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Description */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Description</label>
            <textarea
              value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Brief project description..."
              rows={3}
              style={{
                width: '100%', minHeight: 80, padding: 12,
                border: `1.5px solid ${border}`, borderRadius: 6,
                fontSize: 14, fontFamily: "'Inter', sans-serif", color: textPrimary,
                resize: 'vertical', outline: 'none', background: inputBg,
              }}
              onFocus={focusIn} onBlur={focusOut}
            />
          </div>

          {/* Jira Link Toggle */}
          <div style={{
            padding: '12px 16px', borderRadius: 8,
            border: `1px solid ${border}`,
            background: dk ? 'rgba(255,255,255,0.02)' : 'var(--bg-1, #F8FAFC)',
          }}>
            <div className="flex items-center justify-between">
              <Switch checked={linkJira} onCheckedChange={setLinkJira} />
              <div className="flex-1 ml-3">
                <div style={{ fontSize: 13, fontWeight: 500, color: textPrimary }}>Link to Jira project</div>
                <div style={{ fontSize: 12, color: textMuted }}>Enable bi-directional sync for this project</div>
              </div>
            </div>

            {linkJira && (
              <div style={{ marginTop: 12 }}>
                <label style={{ ...labelStyle, fontSize: 12 }}>Jira project key</label>
                <input
                  value={jiraKey}
                  onChange={e => setJiraKey(e.target.value.toUpperCase())}
                  placeholder="e.g. DTI"
                  style={{
                    ...inputStyle, textTransform: 'uppercase',
                    fontFamily: "'JetBrains Mono', monospace",
                    borderColor: errors.jiraKey ? '#DC2626' : border,
                  }}
                  onFocus={focusIn} onBlur={focusOut}
                />
                {errors.jiraKey && <p style={{ fontSize: 12, color: '#DC2626', marginTop: 4 }}>{errors.jiraKey}</p>}
              </div>
            )}
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
              display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 16px',
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
              display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 18px',
              background: '#2563EB', color: '#FFFFFF',
              border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(37,99,235,0.15)',
              opacity: createProject.isPending ? 0.6 : 1,
            }}
          >
            {createProject.isPending && <Loader2 size={14} className="animate-spin" />}
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
