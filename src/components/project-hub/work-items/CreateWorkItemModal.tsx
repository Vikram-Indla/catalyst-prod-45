import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { createWorkItem } from '@/services/workItemService';
import { X, ArrowUp, ArrowRight, ArrowDown, ChevronsUp, Calendar, Search, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────
interface WorkTypeOption { id: string; name: string; color: string; icon: string; level: string; }
interface StatusOption { id: string; name: string; is_default: boolean; }
interface ProfileOption { id: string; full_name: string; avatar_url: string | null; }
interface ParentOption { id: string; item_key: string; title: string; summary: string; }
interface LabelOption { id: string; name: string; color: string; }
interface ReleaseOption { id: string; name: string; status: string; }

interface CreateWorkItemModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectKey: string;
}

// ─── Hierarchy Icons ──────────────────────────────────────
const HIERARCHY_ICONS: Record<string, { symbol: string; color: string }> = {
  Epic:    { symbol: '◆', color: '#7C3AED' },
  Feature: { symbol: '▲', color: 'var(--cp-blue)' },
  Story:   { symbol: '●', color: 'var(--sem-success)' },
  Bug:     { symbol: '⬡', color: 'var(--sem-danger)' },
  Task:    { symbol: '■', color: 'var(--sem-warning)' },
  Subtask: { symbol: '○', color: 'var(--fg-4)' },
};

const PRIORITIES = [
  { value: 'critical', label: 'Critical', icon: <ChevronsUp size={14} />, color: 'var(--sem-danger)' },
  { value: 'high', label: 'High', icon: <ArrowUp size={14} />, color: 'var(--sem-warning)' },
  { value: 'medium', label: 'Medium', icon: <ArrowRight size={14} />, color: 'var(--cp-blue)' },
  { value: 'low', label: 'Low', icon: <ArrowDown size={14} />, color: 'var(--fg-4)' },
];

// ─── Component ────────────────────────────────────────────
export function CreateWorkItemModal({ open, onClose, projectId, projectKey }: CreateWorkItemModalProps) {
  const queryClient = useQueryClient();
  const titleRef = useRef<HTMLInputElement>(null);

  // Form state
  const [selectedType, setSelectedType] = useState('');
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const [releaseId, setReleaseId] = useState<string | null>(null);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [createAnother, setCreateAnother] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Dropdown states
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [parentOpen, setParentOpen] = useState(false);
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [parentSearch, setParentSearch] = useState('');

  // ─── Data Queries ────────────────────────────────────────
  const { data: workTypes = [] } = useQuery<WorkTypeOption[]>({
    queryKey: ['ph-work-types', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_work_types').select('id, name, color, icon, level')
        .eq('project_id', projectId).eq('is_enabled', true).order('position');
      if (error) throw error;
      return (data || []) as WorkTypeOption[];
    },
    enabled: !!projectId,
  });

  const { data: statuses = [] } = useQuery<StatusOption[]>({
    queryKey: ['ph-statuses-default', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_workflow_statuses').select('id, name, is_default')
        .eq('project_id', projectId).order('position');
      if (error) throw error;
      return (data || []) as StatusOption[];
    },
    enabled: !!projectId,
  });

  const { data: profiles = [] } = useQuery<ProfileOption[]>({
    queryKey: ['ph-profiles-all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, full_name, avatar_url').order('full_name');
      if (error) throw error;
      return (data || []) as ProfileOption[];
    },
  });

  const { data: parentItems = [] } = useQuery<ParentOption[]>({
    queryKey: ['ph-parent-items', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_work_items').select('id, item_key, title, summary')
        .eq('project_id', projectId).order('item_key');
      if (error) throw error;
      return (data || []) as ParentOption[];
    },
    enabled: !!projectId,
  });

  const { data: labels = [] } = useQuery<LabelOption[]>({
    queryKey: ['ph-labels', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_labels').select('id, name, color')
        .eq('project_id', projectId).order('name');
      if (error) throw error;
      return (data || []) as LabelOption[];
    },
    enabled: !!projectId,
  });

  const { data: releases = [] } = useQuery<ReleaseOption[]>({
    queryKey: ['ph-releases', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_releases').select('id, name, status')
        .eq('project_id', projectId).order('release_date');
      if (error) throw error;
      return (data || []) as ReleaseOption[];
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

  const closeDropdowns = () => {
    setPriorityOpen(false); setAssigneeOpen(false);
    setParentOpen(false); setReleaseOpen(false); setLabelsOpen(false);
  };

  const resetForm = (keepTypeAndPriority = false) => {
    setTitle(''); setAssigneeId(null); setDueDate('');
    setParentId(null); setReleaseId(null); setSelectedLabels([]);
    setAssigneeSearch(''); setParentSearch('');
    if (!keepTypeAndPriority) {
      const story = workTypes.find(t => t.name === 'Story');
      setSelectedType(story?.id || workTypes[0]?.id || '');
      setPriority('medium');
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
        release_id: releaseId,
        label_ids: selectedLabels.length > 0 ? selectedLabels : undefined,
      });

      queryClient.invalidateQueries({ queryKey: ['ph-work-items'] });

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

  const handleClose = () => { resetForm(); onClose(); };

  if (!open) return null;

  const selectedAssignee = profiles.find(p => p.id === assigneeId);
  const selectedParent = parentItems.find(p => p.id === parentId);
  const selectedRelease = releases.find(r => r.id === releaseId);
  const pri = PRIORITIES.find(p => p.value === priority);

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center"
      style={{ fontFamily: 'Inter, sans-serif' }}
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[rgba(15,23,42,0.5)]" />

      {/* Modal */}
      <div
        className="relative rounded-lg shadow-2xl flex flex-col bg-[var(--cp-float)]"
        style={{ width: 480, maxHeight: '85vh', border: '1px solid var(--divider)', borderRadius: 8 }}
        onClick={e => { e.stopPropagation(); closeDropdowns(); }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid var(--cp-bd-zone)' }}>
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold" style={{ color: 'var(--fg-1)', fontFamily: 'Sora, sans-serif' }}>
              Create Work Item
            </span>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--cp-bd-zone)]" style={{ color: 'var(--fg-3)' }}>
              {projectKey}
            </span>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#F1F5F9] transition-colors"
            style={{ color: 'var(--fg-4)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 flex flex-col gap-4 overflow-y-auto">
          {/* Type selector — hierarchy icons */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider mb-2 block" style={{ color: 'var(--fg-4)' }}>
              Type
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {workTypes.map(wt => {
                const isSelected = wt.id === selectedType;
                const hi = HIERARCHY_ICONS[wt.name] || { symbol: '●', color: wt.color };
                return (
                  <button
                    key={wt.id}
                    onClick={() => setSelectedType(wt.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all"
                    style={{
                      border: isSelected ? `2px solid ${hi.color}` : '1px solid var(--divider)',
                      backgroundColor: isSelected ? `${hi.color}10` : 'var(--bg-app)',
                      color: isSelected ? hi.color : 'var(--fg-2)',
                      outline: isSelected ? `1px solid ${hi.color}` : 'none',
                    }}
                  >
                    <span style={{ color: hi.color, fontSize: 14, lineHeight: 1 }}>{hi.symbol}</span>
                    {wt.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--fg-4)' }}>
              Title <span style={{ color: 'var(--sem-danger)' }}>*</span>
            </label>
            <input
              ref={titleRef}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full rounded-md border px-3 text-[14px] font-medium focus:outline-none focus:ring-2 focus:ring-[#2563EB] transition-shadow"
              style={{ height: 40, borderColor: 'var(--divider)', color: 'var(--fg-1)', fontFamily: 'Inter, sans-serif' }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSubmit(); }}
            />
          </div>

          {/* Priority + Assignee */}
          <div className="grid grid-cols-2 gap-3">
            {/* Priority */}
            <div className="relative">
              <label className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--fg-4)' }}>Priority</label>
              <button
                onClick={e => { e.stopPropagation(); closeDropdowns(); setPriorityOpen(!priorityOpen); }}
                className="w-full flex items-center justify-between rounded-md border px-2.5 text-[12px] font-medium hover:border-[var(--fg-3, #94A3B8)] transition-colors"
                style={{ height: 50, borderColor: 'var(--divider)', color: 'var(--fg-2)' }}
              >
                <span className="flex items-center gap-1.5">
                  <span style={{ color: pri?.color }}>{pri?.icon}</span>
                  {pri?.label}
                </span>
                <ChevronDown size={14} className="text-[var(--fg-3, #94A3B8)]" />
              </button>
              {priorityOpen && (
                <FixedDropdown width="100%" onClick={e => e.stopPropagation()}>
                  {PRIORITIES.map(p => (
                    <button
                      key={p.value}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium hover:bg-[#F1F5F9] transition-colors"
                      style={{ color: 'var(--fg-2)' }}
                      onClick={() => { setPriority(p.value); setPriorityOpen(false); }}
                    >
                      <span style={{ color: p.color }}>{p.icon}</span>
                      {p.label}
                    </button>
                  ))}
                </FixedDropdown>
              )}
            </div>

            {/* Assignee */}
            <div className="relative">
              <label className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--fg-4)' }}>Assignee</label>
              <button
                onClick={e => { e.stopPropagation(); closeDropdowns(); setAssigneeOpen(!assigneeOpen); }}
                className="w-full flex items-center justify-between rounded-md border px-2.5 text-[12px] font-medium hover:border-[var(--fg-3, #94A3B8)] transition-colors"
                style={{ height: 50, borderColor: 'var(--divider)', color: selectedAssignee ? 'var(--fg-2)' : 'var(--fg-4)' }}
              >
                <span className="truncate">{selectedAssignee ? selectedAssignee.full_name : 'Unassigned'}</span>
                <ChevronDown size={14} className="text-[var(--fg-3, #94A3B8)] shrink-0" />
              </button>
              {assigneeOpen && (
                <FixedDropdown maxHeight={220} onClick={e => e.stopPropagation()}>
                  <div className="px-2 py-1.5" style={{ borderBottom: '1px solid var(--cp-bd-zone)' }}>
                    <div className="relative">
                      <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--fg-3, #94A3B8)]" />
                      <input
                        value={assigneeSearch}
                        onChange={e => setAssigneeSearch(e.target.value)}
                        placeholder="Search..."
                        className="w-full pl-7 pr-2 py-1 text-[11px] rounded border focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                        style={{ borderColor: 'var(--divider)', height: 28 }}
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto flex-1">
                    <button
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#F1F5F9]"
                      style={{ color: 'var(--fg-4)' }}
                      onClick={() => { setAssigneeId(null); setAssigneeOpen(false); setAssigneeSearch(''); }}
                    >
                      Unassigned
                    </button>
                    {filteredProfiles.map(p => (
                      <button
                        key={p.id}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium hover:bg-[#F1F5F9] text-left"
                        style={{ color: 'var(--fg-2)' }}
                        onClick={() => { setAssigneeId(p.id); setAssigneeOpen(false); setAssigneeSearch(''); }}
                      >
                        <ProfileAvatar name={p.full_name} url={p.avatar_url} size={18} />
                        <span className="truncate">{p.full_name}</span>
                      </button>
                    ))}
                  </div>
                </FixedDropdown>
              )}
            </div>
          </div>

          {/* Labels (multi-select chips) */}
          <div className="relative">
            <label className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--fg-4)' }}>Labels</label>
            <button
              onClick={e => { e.stopPropagation(); closeDropdowns(); setLabelsOpen(!labelsOpen); }}
              className="w-full flex items-center gap-1.5 flex-wrap min-h-[50px] rounded-md border px-2.5 py-1.5 text-[12px] hover:border-[var(--fg-3, #94A3B8)] transition-colors"
              style={{ borderColor: 'var(--divider)' }}
            >
              {selectedLabels.length === 0 && <span style={{ color: 'var(--fg-4)' }}>Select labels...</span>}
              {selectedLabels.map(lid => {
                const lb = labels.find(l => l.id === lid);
                if (!lb) return null;
                return (
                  <span
                    key={lid}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--cp-primary-20)]"
                    style={{ color: 'var(--cp-blue)' }}
                  >
                    {lb.name}
                    <span
                      className="cursor-pointer hover:opacity-70"
                      onClick={e => { e.stopPropagation(); setSelectedLabels(prev => prev.filter(l => l !== lid)); }}
                    >×</span>
                  </span>
                );
              })}
              <ChevronDown size={14} className="text-[var(--fg-3, #94A3B8)] ml-auto shrink-0" />
            </button>
            {labelsOpen && labels.length > 0 && (
              <FixedDropdown maxHeight={200} onClick={e => e.stopPropagation()}>
                <div className="overflow-y-auto">
                  {labels.map(lb => {
                    const checked = selectedLabels.includes(lb.id);
                    return (
                      <button
                        key={lb.id}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium hover:bg-[#F1F5F9]"
                        style={{ color: 'var(--fg-2)' }}
                        onClick={() => {
                          setSelectedLabels(prev =>
                            checked ? prev.filter(l => l !== lb.id) : [...prev, lb.id]
                          );
                        }}
                      >
                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${checked ? 'bg-[var(--cp-blue)]' : 'bg-[var(--bg-app)]'}`} style={{ borderColor: checked ? 'var(--cp-blue)' : 'var(--divider)' }}>
                          {checked && <span className="text-white text-[9px]">✓</span>}
                        </div>
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: lb.color }} />
                        {lb.name}
                      </button>
                    );
                  })}
                </div>
              </FixedDropdown>
            )}
          </div>

          {/* Due date + Release */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--fg-4)' }}>Due Date</label>
              <div className="relative">
                <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-3, #94A3B8)]" />
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full rounded-md border pl-8 pr-2.5 text-[12px] font-medium focus:outline-none focus:ring-2 focus:ring-[#2563EB] transition-shadow"
                  style={{ height: 50, borderColor: 'var(--divider)', color: 'var(--fg-2)', fontFamily: 'JetBrains Mono, monospace' }}
                />
              </div>
            </div>

            {/* Release */}
            <div className="relative">
              <label className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--fg-4)' }}>Release</label>
              <button
                onClick={e => { e.stopPropagation(); closeDropdowns(); setReleaseOpen(!releaseOpen); }}
                className="w-full flex items-center justify-between rounded-md border px-2.5 text-[12px] font-medium hover:border-[var(--fg-3, #94A3B8)] transition-colors"
                style={{ height: 50, borderColor: 'var(--divider)', color: selectedRelease ? 'var(--fg-2)' : 'var(--fg-4)' }}
              >
                <span className="truncate">
                  {selectedRelease ? selectedRelease.name : 'None'}
                </span>
                <ChevronDown size={14} className="text-[var(--fg-3, #94A3B8)] shrink-0" />
              </button>
              {releaseOpen && (
                <FixedDropdown maxHeight={200} onClick={e => e.stopPropagation()}>
                  <button
                    className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-[#F1F5F9]"
                    style={{ color: 'var(--fg-4)' }}
                    onClick={() => { setReleaseId(null); setReleaseOpen(false); }}
                  >
                    None
                  </button>
                  {releases.map(r => (
                    <button
                      key={r.id}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium hover:bg-[#F1F5F9] text-left"
                      style={{ color: 'var(--fg-2)' }}
                      onClick={() => { setReleaseId(r.id); setReleaseOpen(false); }}
                    >
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[var(--sem-success-bg)]" style={{ color: 'var(--sem-success)' }}>
                        {r.status === 'released' ? '✓' : r.status === 'in_progress' ? '►' : '○'}
                      </span>
                      {r.name}
                    </button>
                  ))}
                </FixedDropdown>
              )}
            </div>
          </div>

          {/* Parent selector */}
          <div className="relative">
            <label className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--fg-4)' }}>Parent</label>
            <button
              onClick={e => { e.stopPropagation(); closeDropdowns(); setParentOpen(!parentOpen); }}
              className="w-full flex items-center justify-between rounded-md border px-2.5 text-[12px] font-medium hover:border-[var(--fg-3, #94A3B8)] transition-colors"
              style={{ height: 50, borderColor: 'var(--divider)', color: selectedParent ? 'var(--fg-2)' : 'var(--fg-4)' }}
            >
              <span className="truncate">
                {selectedParent ? `${selectedParent.item_key} — ${selectedParent.title || selectedParent.summary}` : 'None'}
              </span>
              <ChevronDown size={14} className="text-[var(--fg-3, #94A3B8)] shrink-0" />
            </button>
            {parentOpen && (
              <FixedDropdown width={280} maxHeight={220} onClick={e => e.stopPropagation()}>
                <div className="px-2 py-1.5" style={{ borderBottom: '1px solid var(--cp-bd-zone)' }}>
                  <div className="relative">
                    <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--fg-3, #94A3B8)]" />
                    <input
                      value={parentSearch}
                      onChange={e => setParentSearch(e.target.value)}
                      placeholder="Search by key or title..."
                      className="w-full pl-7 pr-2 py-1 text-[11px] rounded border focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                      style={{ borderColor: 'var(--divider)', height: 28 }}
                      autoFocus
                    />
                  </div>
                </div>
                <div className="overflow-y-auto flex-1">
                  <button
                    className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-[#F1F5F9]"
                    style={{ color: 'var(--fg-4)' }}
                    onClick={() => { setParentId(null); setParentOpen(false); setParentSearch(''); }}
                  >
                    None
                  </button>
                  {filteredParents.map(p => (
                    <button
                      key={p.id}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium hover:bg-[#F1F5F9] text-left"
                      style={{ color: 'var(--fg-2)' }}
                      onClick={() => { setParentId(p.id); setParentOpen(false); setParentSearch(''); }}
                    >
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--fg-3)', fontSize: 10 }}>
                        {p.item_key}
                      </span>
                      <span className="truncate">{p.title || p.summary}</span>
                    </button>
                  ))}
                </div>
              </FixedDropdown>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid var(--cp-bd-zone)' }}>
          <label className="flex items-center gap-2 text-[11px] font-medium cursor-pointer select-none" style={{ color: 'var(--fg-3)' }}>
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
              style={{ color: 'var(--fg-3)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || submitting}
              className="flex items-center justify-center rounded-md text-[13px] font-semibold transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--cp-blue)]"
              style={{ height: 40, padding: '0 20px', color: '#FFFFFF', borderRadius: 6 }}
            >
              {submitting ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Reusable fixed dropdown ───────────────────────────────
function FixedDropdown({
  children,
  width,
  maxHeight,
  onClick,
}: {
  children: React.ReactNode;
  width?: number | string;
  maxHeight?: number;
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      className="absolute left-0 mt-1 rounded-md overflow-hidden flex flex-col bg-[var(--cp-float)]"
      style={{
        width: width || '100%',
        maxHeight: maxHeight || 'auto',
        border: '1px solid var(--divider)',
        boxShadow: '0 8px 20px rgba(0,0,0,0.18)',
        zIndex: 9999,
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// ─── Profile Avatar ────────────────────────────────────────
function ProfileAvatar({ name, url, size = 20 }: { name: string; url: string | null; size?: number }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const colors = ['#2563EB', '#0D9488', '#7C3AED', '#D97706', '#DC2626', '#16A34A'];
  const bg = colors[Math.abs(hash) % colors.length];

  if (url) {
    return (
      <img src={url} alt={name} className="rounded-full shrink-0 object-cover"
        style={{ width: size, height: size }}
        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    );
  }

  return (
    <div className="rounded-full flex items-center justify-center text-white font-bold shrink-0"
      style={{ width: size, height: size, backgroundColor: bg, fontSize: size * 0.4 }}>
      {initials}
    </div>
  );
}
