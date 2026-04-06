/**
 * IdeationCreateWizard — Single-page modal for new idea submission
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { X, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Props {
  open: boolean;
  onClose: () => void;
}

const IDEA_TYPES = [
  { key: 'Problem', label: 'Problem', dot: '#EF4444' },
  { key: 'Opportunity', label: 'Opportunity', dot: '#16A34A' },
  { key: 'Feature Request', label: 'Feature', dot: '#2563EB' },
  { key: 'Solution', label: 'Solution', dot: '#7C3AED' },
  { key: 'Improvement', label: 'Improvement', dot: '#D97706' },
];

const PRIORITIES = [
  { key: 'P1', label: 'P1 — Critical' },
  { key: 'P2', label: 'P2 — High' },
  { key: 'P3', label: 'P3 — Medium' },
  { key: 'P4', label: 'P4 — Low' },
];

const DEPARTMENTS = [
  'Digital Transformation',
  'IT Operations',
  'Data & Analytics',
  'Customer Experience',
  'Risk & Compliance',
  'Cybersecurity',
  'Human Resources',
];

const SOURCES = [
  { key: 'Ministry Directive', label: 'Ministry Directive' },
  { key: 'Internal', label: 'Internal' },
  { key: 'Stakeholder', label: 'Stakeholder' },
  { key: 'Customer Feedback', label: 'Customer Feedback' },
  { key: 'Research', label: 'Research' },
];

// inputBase/labelBase/focusHandlers are now computed inside the component for dark mode support
const focusHandlersLight = {
  onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = '#2563EB';
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.08)';
  },
  onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)';
    e.currentTarget.style.boxShadow = 'none';
  },
};
const focusHandlersDark = {
  onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = '#2563EB';
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.08)';
  },
  onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
    e.currentTarget.style.boxShadow = 'none';
  },
};

export default function IdeationCreateWizard({ open, onClose }: Props) {
  const { isDark } = useTheme();

  const inputBase: React.CSSProperties = {
    width: '100%', height: '44px',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#E2E8F0'}`,
    borderRadius: '8px', padding: '0 14px', fontSize: '14px',
    color: isDark ? '#EDEDED' : '#0F172A',
    background: isDark ? 'transparent' : '#FFFFFF', outline: 'none',
  };
  const labelBase: React.CSSProperties = {
    display: 'block', fontSize: '13px', fontWeight: 600,
    color: isDark ? '#EDEDED' : '#0F172A', marginBottom: '6px',
  };
  const focusHandlers = isDark ? focusHandlersDark : focusHandlersLight;

  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [ideaType, setIdeaType] = useState('');
  const [priority, setPriority] = useState('');
  const [department, setDepartment] = useState('');
  const [source, setSource] = useState('');
  const [assignee, setAssignee] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [titleError, setTitleError] = useState(false);
  const [descError, setDescError] = useState(false);
  const [theme, setTheme] = useState('');
  const [assignedTeam, setAssignedTeam] = useState('');
  const [targetReleaseDate, setTargetReleaseDate] = useState('');

  // Fetch profiles for assignee
  const { data: profiles = [] } = useQuery({
    queryKey: ['idea-profiles'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('approval_status', 'APPROVED')
        .order('full_name');
      return data || [];
    },
    enabled: open,
  });

  // Generate next idea_key
  const generateKey = useCallback(async () => {
    const { data } = await supabase
      .from('ph_ideas')
      .select('idea_key')
      .order('created_at', { ascending: false })
      .limit(1);
    if (data && data.length > 0) {
      const last = data[0].idea_key;
      const num = parseInt(last.replace(/\D/g, ''), 10) || 0;
      return `IDH-${String(num + 1).padStart(3, '0')}`;
    }
    return 'IDH-001';
  }, []);

  // Submit mutation
  const createIdea = useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      const { error } = await supabase.from('ph_ideas').insert(payload as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ideation'] });
      queryClient.invalidateQueries({ queryKey: ['ph-ideas'] });
      toast.success('✓ Idea submitted successfully');
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to submit idea');
    },
  });

  useEffect(() => {
    if (open) {
      setTitle(''); setDesc(''); setIdeaType(''); setPriority('');
      setDepartment(''); setSource(''); setAssignee(''); setCategory('');
      setTags([]); setTagInput(''); setTitleError(false); setDescError(false);
      setTheme(''); setAssignedTeam(''); setTargetReleaseDate('');
    }
  }, [open]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) { document.addEventListener('keydown', handleEsc); return () => document.removeEventListener('keydown', handleEsc); }
  }, [open, onClose]);

  if (!open) return null;

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().replace(/,$/, '');
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => setTags(tags.filter(t => t !== tag));

  const handleSubmit = async () => {
    const hasTitle = title.trim().length > 0;
    const hasDesc = desc.trim().length > 0;
    setTitleError(!hasTitle);
    setDescError(!hasDesc);
    if (!hasTitle || !hasDesc) return;

    const ideaKey = await generateKey();
    const { data: { user } } = await supabase.auth.getUser();

    createIdea.mutate({
      idea_key: ideaKey,
      title: title.trim(),
      description: desc.trim(),
      idea_type: ideaType || 'Feature Request',
      priority: priority || 'P2',
      source: source || 'Internal',
      department: department || '',
      category: category || '',
      tags: tags.length > 0 ? tags : null,
      assigned_to: assignee || null,
      submitted_by: user?.id || null,
      status: 'Submitted',
      theme: theme || null,
      assigned_team: assignedTeam || null,
      target_release_date: targetReleaseDate || null,
    });
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ').filter(Boolean);
    return parts.length >= 2
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : (parts[0]?.[0] || '?').toUpperCase();
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 300,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {/* Modal */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: isDark ? '#1A1A1A' : '#FFFFFF',
            borderRadius: '16px',
            width: '720px',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: isDark ? 'none' : '0 24px 64px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.05)',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '24px 32px 16px',
            borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: '20px', fontWeight: 700, color: isDark ? '#EDEDED' : '#0F172A' }}>Submit New Idea</span>
            <button
              onClick={onClose}
              style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: 'transparent', border: 'none', color: isDark ? '#878787' : '#94A3B8',
                fontSize: '16px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : '#F4F4F5'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <X size={16} />
            </button>
          </div>

          {/* AI Auto-fill Bar */}
          <div style={{
            margin: '16px 32px 0',
            background: isDark ? 'rgba(124,58,237,0.08)' : '#F5F3FF',
            border: `1px solid ${isDark ? 'rgba(124,58,237,0.15)' : '#EDE9FE'}`,
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={14} style={{ color: '#7C3AED' }} />
              <span style={{ fontSize: '13px', color: '#7C3AED', fontWeight: 500 }}>
                AI can auto-fill fields from a short description
              </span>
            </div>
            <button style={{
              background: '#7C3AED', color: '#FFF', border: 'none',
              borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
            }}>Auto-fill</button>
          </div>

          {/* Form Body */}
          <div style={{
            padding: '24px 32px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}>
            {/* Row 1: Title */}
            <div>
              <label style={labelBase}>Title *</label>
              <input
                value={title}
                onChange={e => { setTitle(e.target.value); setTitleError(false); }}
                placeholder="Enter idea title..."
                style={{ ...inputBase, borderColor: titleError ? '#EF4444' : 'rgba(255,255,255,0.10)' }}
                {...focusHandlers}
              />
              {titleError && <span style={{ fontSize: '12px', color: '#EF4444', marginTop: '4px', display: 'block' }}>Required</span>}
            </div>

            {/* Row 2: Description */}
            <div>
              <label style={labelBase}>Description *</label>
              <textarea
                value={desc}
                onChange={e => { setDesc(e.target.value); setDescError(false); }}
                placeholder="Describe the idea, its expected impact, and any supporting context..."
                style={{
                  ...inputBase,
                  height: 'auto',
                  minHeight: '120px',
                  padding: '12px 14px',
                  lineHeight: '1.6',
                  resize: 'vertical' as const,
                  borderColor: descError ? '#EF4444' : 'rgba(255,255,255,0.10)',
                }}
                {...focusHandlers}
              />
              {descError && <span style={{ fontSize: '12px', color: '#EF4444', marginTop: '4px', display: 'block' }}>Required</span>}
            </div>

            {/* Row 3: Type + Priority */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelBase}>Idea Type</label>
                <Select value={ideaType} onValueChange={setIdeaType}>
                  <SelectTrigger className="h-[44px] border-[rgba(255,255,255,0.10)] rounded-lg text-sm">
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {IDEA_TYPES.map(t => (
                      <SelectItem key={t.key} value={t.key}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: t.dot, display: 'inline-block', flexShrink: 0 }} />
                          {t.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label style={labelBase}>Priority</label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="h-[44px] border-[rgba(255,255,255,0.10)] rounded-lg text-sm">
                    <SelectValue placeholder="Select priority..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(p => (
                      <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 4: Department + Source */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelBase}>Department</label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger className="h-[44px] border-[rgba(255,255,255,0.10)] rounded-lg text-sm">
                    <SelectValue placeholder="Select department..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label style={labelBase}>Source</label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger className="h-[44px] border-[rgba(255,255,255,0.10)] rounded-lg text-sm">
                    <SelectValue placeholder="Select source..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCES.map(s => (
                      <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 5: Assignee + Category */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelBase}>Assignee</label>
                <Select value={assignee} onValueChange={setAssignee}>
                  <SelectTrigger className="h-[44px] border-[rgba(255,255,255,0.10)] rounded-lg text-sm">
                    <SelectValue placeholder="Select assignee..." />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            width: '22px', height: '22px', borderRadius: '50%',
                            background: '#2563EB', color: '#FFF',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '10px', fontWeight: 700, flexShrink: 0,
                          }}>
                            {getInitials(p.full_name || 'NA')}
                          </span>
                          {p.full_name || 'Unknown'}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 6: Theme + Assigned Team */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelBase}>Theme</label>
                <input
                  value={theme}
                  onChange={e => setTheme(e.target.value)}
                  placeholder="e.g., Digital Maturity 2026..."
                  style={inputBase}
                  {...focusHandlers}
                />
              </div>
              <div>
                <label style={labelBase}>Assigned Team</label>
                <Select value={assignedTeam} onValueChange={setAssignedTeam}>
                  <SelectTrigger className="h-[44px] border-[rgba(255,255,255,0.10)] rounded-lg text-sm">
                    <SelectValue placeholder="Select team..." />
                  </SelectTrigger>
                  <SelectContent>
                    {['Senaie BAU', 'Integration Team', 'Mobile App Team'].map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 7: Target Release Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelBase}>Target Release Date</label>
                <input
                  type="date"
                  value={targetReleaseDate}
                  onChange={e => setTargetReleaseDate(e.target.value)}
                  style={inputBase}
                  {...focusHandlers}
                />
              </div>
              <div>
                <label style={labelBase}>Category</label>
                <input
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  placeholder="e.g., Process Improvement..."
                  style={inputBase}
                  {...focusHandlers}
                />
              </div>
            </div>

            {/* Row 8: Tags */}
            <div>
              <label style={labelBase}>Tags</label>
              <div style={{
                display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px',
                minHeight: '44px', border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#E2E8F0'}`, borderRadius: '8px',
                padding: '6px 10px', background: isDark ? 'transparent' : '#FFFFFF',
              }}>
                {tags.map(tag => (
                  <span key={tag} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    padding: '2px 8px', background: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'}`,
                    borderRadius: '4px', fontSize: '12px', color: isDark ? '#A1A1A1' : '#334155',
                  }}>
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      style={{
                        background: 'none', border: 'none', color: isDark ? '#878787' : '#94A3B8',
                        cursor: 'pointer', padding: 0, fontSize: '14px', lineHeight: 1,
                      }}
                    >×</button>
                  </span>
                ))}
                <input
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder={tags.length === 0 ? 'Type a tag and press Enter...' : ''}
                  style={{
                    flex: 1, minWidth: '120px', border: 'none', outline: 'none',
                    fontSize: '13px', color: isDark ? '#EDEDED' : '#0F172A', background: 'transparent',
                    height: '28px',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding: '16px 32px',
            borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'}`,
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '12px',
            background: isDark ? '#0A0A0A' : '#FAFAFA',
            borderRadius: '0 0 16px 16px',
          }}>
            <button
              onClick={onClose}
              style={{
                background: 'transparent', color: isDark ? '#A1A1A1' : '#64748B',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'}`, borderRadius: '8px',
                padding: '10px 20px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              }}
            >Cancel</button>
            <button
              onClick={handleSubmit}
              disabled={createIdea.isPending}
              style={{
                background: '#2563EB', color: '#FFF', border: 'none',
                borderRadius: '8px', padding: '10px 24px', fontSize: '14px',
                fontWeight: 600, cursor: 'pointer',
                opacity: createIdea.isPending ? 0.7 : 1,
              }}
            >
              {createIdea.isPending ? 'Submitting...' : 'Submit Idea'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
