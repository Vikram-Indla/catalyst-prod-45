import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { createWorkItem } from '@/services/workItemService';
import { X, Zap, Layers, Bookmark, Bug, CheckSquare, CornerDownRight, ArrowUp, ArrowRight, ArrowDown, ChevronsUp, Calendar, Search, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────
interface WorkTypeOption {
  id: string;
  name: string;
  color: string;
  icon: string;
  level: string;
}

interface StatusOption {
  id: string;
  name: string;
  is_default: boolean;
}

interface ProfileOption {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface ParentOption {
  id: string;
  item_key: string;
  title: string;
  summary: string;
}

interface CreateWorkItemModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectKey: string;
}

// ─── Constants ────────────────────────────────────────────
const TYPE_ICONS: Record<string, React.ReactNode> = {
  Epic: <Zap size={16} />,
  Feature: <Layers size={16} />,
  Story: <Bookmark size={16} />,
  Bug: <Bug size={16} />,
  Task: <CheckSquare size={16} />,
  Subtask: <CornerDownRight size={16} />,
};

const TYPE_COLORS: Record<string, string> = {
  Epic: '#7C3AED',
  Feature: '#2563EB',
  Story: '#0D9488',
  Bug: '#DC2626',
  Task: '#D97706',
  Subtask: '#94A3B8',
};

const PRIORITIES = [
  { value: 'Critical', icon: <ChevronsUp size={14} />, color: '#DC2626' },
  { value: 'High', icon: <ArrowUp size={14} />, color: '#D97706' },
  { value: 'Medium', icon: <ArrowRight size={14} />, color: '#2563EB' },
  { value: 'Low', icon: <ArrowDown size={14} />, color: '#94A3B8' },
];

// ─── Component ────────────────────────────────────────────
export function CreateWorkItemModal({ open, onClose, projectId, projectKey }: CreateWorkItemModalProps) {
  const queryClient = useQueryClient();
  const titleRef = useRef<HTMLInputElement>(null);

  // Form state
  const [selectedType, setSelectedType] = useState<string>('');
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const [createAnother, setCreateAnother] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Dropdown states
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [parentOpen, setParentOpen] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [parentSearch, setParentSearch] = useState('');

  // ─── Data Queries ────────────────────────────────────────
  const { data: workTypes = [] } = useQuery<WorkTypeOption[]>({
    queryKey: ['ph-work-types', projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_work_types')
        .select('id, name, color, icon, level')
        .eq('project_id', projectId)
        .eq('is_enabled', true)
        .order('position');
      return (data || []) as WorkTypeOption[];
    },
    enabled: !!projectId,
  });

  const { data: statuses = [] } = useQuery<StatusOption[]>({
    queryKey: ['ph-statuses-default', projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_workflow_statuses')
        .select('id, name, is_default')
        .eq('project_id', projectId)
        .order('position');
      return (data || []) as StatusOption[];
    },
    enabled: !!projectId,
  });

  const { data: profiles = [] } = useQuery<ProfileOption[]>({
    queryKey: ['ph-profiles-all'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .order('full_name');
      return (data || []) as ProfileOption[];
    },
  });

  const { data: parentItems = [] } = useQuery<ParentOption[]>({
    queryKey: ['ph-parent-items', projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_work_items')
        .select('id, item_key, title, summary')
        .eq('project_id', projectId)
        .order('item_key');
      return (data || []) as ParentOption[];
    },
    enabled: !!projectId,
  });

  // ─── Defaults ────────────────────────────────────────────
  useEffect(() => {
    if (open && workTypes.length > 0 && !selectedType) {
      const story = workTypes.find(t => t.name === 'Story');
      setSelectedType(story?.id || workTypes[0].id);
    }
  }, [open, workTypes, selectedType]);

  useEffect(() => {
    if (open) setTimeout(() => titleRef.current?.focus(), 100);
  }, [open]);

  // ─── Filtered lists ─────────────────────────────────────
  const filteredProfiles = useMemo(() => {
    if (!assigneeSearch.trim()) return profiles;
    const q = assigneeSearch.toLowerCase();
    return profiles.filter(p => p.full_name?.toLowerCase().includes(q));
  }, [profiles, assigneeSearch]);

  const filteredParents = useMemo(() => {
    if (!parentSearch.trim()) return parentItems;
    const q = parentSearch.toLowerCase();
    return parentItems.filter(p =>
      p.item_key?.toLowerCase().includes(q) || (p.title || p.summary)?.toLowerCase().includes(q)
    );
  }, [parentItems, parentSearch]);

  const selectedTypeName = workTypes.find(t => t.id === selectedType)?.name || 'Story';

  // ─── Close all dropdowns ────────────────────────────────
  const closeDropdowns = () => {
    setPriorityOpen(false);
    setAssigneeOpen(false);
    setParentOpen(false);
  };

  // ─── Reset form ──────────────────────────────────────────
  const resetForm = (keepTypeAndPriority = false) => {
    setTitle('');
    setAssigneeId(null);
    setDueDate('');
    setParentId(null);
    setAssigneeSearch('');
    setParentSearch('');
    if (!keepTypeAndPriority) {
      const story = workTypes.find(t => t.name === 'Story');
      setSelectedType(story?.id || workTypes[0]?.id || '');
      setPriority('Medium');
    }
  };

  // ─── Submit ──────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!title.trim() || !selectedType || submitting) return;

    const defaultStatus = statuses.find(s => s.is_default) || statuses[0];
    if (!defaultStatus) return;

    setSubmitting(true);
    try {
      const result = await createWorkItem({
        project_id: projectId,
        type_id: selectedType,
        status_id: defaultStatus.id,
        title: title.trim(),
        item_type: selectedTypeName,
        priority,
        assignee_id: assigneeId,
        parent_id: parentId,
        due_date: dueDate || null,
      });

      queryClient.invalidateQueries({ queryKey: ['ph-work-items', projectId] });

      toast.success(`✓ ${result.item_key} created`, {
        description: result.title,
        duration: 4000,
      });

      if (createAnother) {
        resetForm(true);
        setTimeout(() => titleRef.current?.focus(), 50);
      } else {
        resetForm();
        onClose();
      }
    } catch (err: any) {
      toast.error('Failed to create work item', { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Close handler ───────────────────────────────────────
  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!open) return null;

  const selectedAssignee = profiles.find(p => p.id === assigneeId);
  const selectedParent = parentItems.find(p => p.id === parentId);

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center"
      style={{ fontFamily: 'Inter, sans-serif' }}
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0" style={{ background: 'rgba(15, 23, 42, 0.5)' }} />

      {/* Modal */}
      <div
        className="relative rounded-lg shadow-2xl flex flex-col"
        style={{
          width: 480,
          maxHeight: '85vh',
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 8,
        }}
        onClick={e => { e.stopPropagation(); closeDropdowns(); }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid #F1F5F9' }}>
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold" style={{ color: '#0F172A', fontFamily: 'Sora, sans-serif' }}>
              Create Work Item
            </span>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: '#F1F5F9', color: '#64748B' }}>
              {projectKey}
            </span>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#F1F5F9] transition-colors"
            style={{ color: '#94A3B8' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 flex flex-col gap-4 overflow-y-auto">
          {/* Type selector */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider mb-2 block" style={{ color: '#94A3B8' }}>
              Type
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {workTypes.map(wt => {
                const isSelected = wt.id === selectedType;
                const color = TYPE_COLORS[wt.name] || wt.color;
                return (
                  <button
                    key={wt.id}
                    onClick={() => setSelectedType(wt.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all"
                    style={{
                      border: isSelected ? `2px solid ${color}` : '1px solid #E2E8F0',
                      background: isSelected ? `${color}10` : '#FFFFFF',
                      color: isSelected ? color : '#475569',
                      outline: isSelected ? `1px solid ${color}` : 'none',
                    }}
                  >
                    <span style={{ color }}>{TYPE_ICONS[wt.name] || <Bookmark size={14} />}</span>
                    {wt.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: '#94A3B8' }}>
              Title <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <input
              ref={titleRef}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full rounded-md border px-3 text-[14px] font-medium focus:outline-none focus:ring-2 focus:ring-[#2563EB] transition-shadow"
              style={{
                height: 40,
                borderColor: '#E2E8F0',
                color: '#0F172A',
                fontFamily: 'Inter, sans-serif',
              }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSubmit(); }}
            />
          </div>

          {/* Fields row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Priority */}
            <div className="relative">
              <label className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: '#94A3B8' }}>
                Priority
              </label>
              <button
                onClick={e => { e.stopPropagation(); setPriorityOpen(!priorityOpen); setAssigneeOpen(false); setParentOpen(false); }}
                className="w-full flex items-center justify-between rounded-md border px-2.5 text-[12px] font-medium hover:border-[#94A3B8] transition-colors"
                style={{ height: 36, borderColor: '#E2E8F0', color: '#334155' }}
              >
                <span className="flex items-center gap-1.5">
                  {PRIORITIES.find(p => p.value === priority)?.icon}
                  {priority}
                </span>
                <ChevronDown size={14} className="text-[#94A3B8]" />
              </button>
              {priorityOpen && (
                <div
                  className="absolute left-0 mt-1 rounded-md overflow-hidden"
                  style={{
                    width: '100%',
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.18)',
                    zIndex: 9999,
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  {PRIORITIES.map(p => (
                    <button
                      key={p.value}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium hover:bg-[#F1F5F9] transition-colors"
                      style={{ color: '#334155' }}
                      onClick={() => { setPriority(p.value); setPriorityOpen(false); }}
                    >
                      <span style={{ color: p.color }}>{p.icon}</span>
                      {p.value}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Assignee */}
            <div className="relative">
              <label className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: '#94A3B8' }}>
                Assignee
              </label>
              <button
                onClick={e => { e.stopPropagation(); setAssigneeOpen(!assigneeOpen); setPriorityOpen(false); setParentOpen(false); }}
                className="w-full flex items-center justify-between rounded-md border px-2.5 text-[12px] font-medium hover:border-[#94A3B8] transition-colors"
                style={{ height: 36, borderColor: '#E2E8F0', color: selectedAssignee ? '#334155' : '#94A3B8' }}
              >
                <span className="truncate">
                  {selectedAssignee ? selectedAssignee.full_name : 'Unassigned'}
                </span>
                <ChevronDown size={14} className="text-[#94A3B8] shrink-0" />
              </button>
              {assigneeOpen && (
                <div
                  className="absolute left-0 mt-1 rounded-md overflow-hidden flex flex-col"
                  style={{
                    width: '100%',
                    maxHeight: 220,
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.18)',
                    zIndex: 9999,
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <div className="px-2 py-1.5" style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <div className="relative">
                      <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                      <input
                        value={assigneeSearch}
                        onChange={e => setAssigneeSearch(e.target.value)}
                        placeholder="Search..."
                        className="w-full pl-7 pr-2 py-1 text-[11px] rounded border focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                        style={{ borderColor: '#E2E8F0', height: 28 }}
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto flex-1">
                    <button
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#F1F5F9] transition-colors"
                      style={{ color: '#94A3B8' }}
                      onClick={() => { setAssigneeId(null); setAssigneeOpen(false); setAssigneeSearch(''); }}
                    >
                      Unassigned
                    </button>
                    {filteredProfiles.map(p => (
                      <button
                        key={p.id}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium hover:bg-[#F1F5F9] transition-colors"
                        style={{ color: '#334155' }}
                        onClick={() => { setAssigneeId(p.id); setAssigneeOpen(false); setAssigneeSearch(''); }}
                      >
                        <ProfileAvatar name={p.full_name} url={p.avatar_url} size={18} />
                        <span className="truncate">{p.full_name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Due date + Parent row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Due date */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: '#94A3B8' }}>
                Due Date
              </label>
              <div className="relative">
                <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full rounded-md border pl-8 pr-2.5 text-[12px] font-medium focus:outline-none focus:ring-2 focus:ring-[#2563EB] transition-shadow"
                  style={{ height: 36, borderColor: '#E2E8F0', color: '#334155', fontFamily: 'JetBrains Mono, monospace' }}
                />
              </div>
            </div>

            {/* Parent selector */}
            <div className="relative">
              <label className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: '#94A3B8' }}>
                Parent
              </label>
              <button
                onClick={e => { e.stopPropagation(); setParentOpen(!parentOpen); setPriorityOpen(false); setAssigneeOpen(false); }}
                className="w-full flex items-center justify-between rounded-md border px-2.5 text-[12px] font-medium hover:border-[#94A3B8] transition-colors"
                style={{ height: 36, borderColor: '#E2E8F0', color: selectedParent ? '#334155' : '#94A3B8' }}
              >
                <span className="truncate">
                  {selectedParent ? `${selectedParent.item_key} — ${selectedParent.title || selectedParent.summary}` : 'None'}
                </span>
                <ChevronDown size={14} className="text-[#94A3B8] shrink-0" />
              </button>
              {parentOpen && (
                <div
                  className="absolute left-0 mt-1 rounded-md overflow-hidden flex flex-col"
                  style={{
                    width: 280,
                    maxHeight: 220,
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.18)',
                    zIndex: 9999,
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <div className="px-2 py-1.5" style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <div className="relative">
                      <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                      <input
                        value={parentSearch}
                        onChange={e => setParentSearch(e.target.value)}
                        placeholder="Search by key or title..."
                        className="w-full pl-7 pr-2 py-1 text-[11px] rounded border focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                        style={{ borderColor: '#E2E8F0', height: 28 }}
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto flex-1">
                    <button
                      className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-[#F1F5F9] transition-colors"
                      style={{ color: '#94A3B8' }}
                      onClick={() => { setParentId(null); setParentOpen(false); setParentSearch(''); }}
                    >
                      None
                    </button>
                    {filteredParents.map(p => (
                      <button
                        key={p.id}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium hover:bg-[#F1F5F9] transition-colors text-left"
                        style={{ color: '#334155' }}
                        onClick={() => { setParentId(p.id); setParentOpen(false); setParentSearch(''); }}
                      >
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#64748B', fontSize: 10 }}>
                          {p.item_key}
                        </span>
                        <span className="truncate">{p.title || p.summary}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderTop: '1px solid #F1F5F9' }}
        >
          <label className="flex items-center gap-2 text-[11px] font-medium cursor-pointer select-none" style={{ color: '#64748B' }}>
            <input
              type="checkbox"
              checked={createAnother}
              onChange={e => setCreateAnother(e.target.checked)}
              className="w-3.5 h-3.5 rounded accent-[#2563EB]"
            />
            Create another
          </label>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className="px-3.5 py-1.5 text-[12px] font-medium rounded-md hover:bg-[#F1F5F9] transition-colors"
              style={{ color: '#64748B' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || submitting}
              className="flex items-center justify-center rounded-md text-[13px] font-semibold transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                height: 40,
                padding: '0 20px',
                background: '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 6,
              }}
            >
              {submitting ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Small Profile Avatar ──────────────────────────────────
function ProfileAvatar({ name, url, size = 20 }: { name: string; url: string | null; size?: number }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const colors = ['#2563EB', '#0D9488', '#7C3AED', '#D97706', '#DC2626', '#16A34A'];
  const bg = colors[Math.abs(hash) % colors.length];

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="rounded-full shrink-0 object-cover"
        style={{ width: size, height: size }}
        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold shrink-0"
      style={{ width: size, height: size, backgroundColor: bg, fontSize: size * 0.4 }}
    >
      {initials}
    </div>
  );
}
