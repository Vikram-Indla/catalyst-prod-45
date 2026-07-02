import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useApprovedProfiles } from '@/hooks/useApprovedProfiles';
import { createWorkItem } from '@/services/workItemService';
import { X, ArrowUp, ArrowRight, ArrowDown, ChevronsUp, Calendar, Search, ChevronDown } from '@/lib/atlaskit-icons';
import { catalystToast } from '@/lib/catalystToast';

// ─── Types ────────────────────────────────────────────────
interface WorkTypeOption { id: string; name: string; color: string; icon: string; level: string; }
interface StatusOption { id: string; name: string; is_default: boolean; }
interface ProfileOption { id: string; full_name: string; avatar_url: string | null; }
interface ParentOption { id: string; item_key: string; title: string; summary: string; }
interface LabelOption { id: string; name: string; color: string; }
interface ReleaseOption { id: string; name: string; status: string; }
interface SprintOption { id: string; name: string; status: string; }

interface CreateWorkItemModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectKey: string;
  onCreated?: (itemKey: string) => void;
  /** Prefill title on open. Used when opened from the AI-suggest Edit
   *  action so the user can tweak the suggestion before submitting
   *  (2026-07-02). */
  initialTitle?: string;
  /** Prefill work-type NAME on open (e.g. "Sub-task", "Backend").
   *  Resolved against workTypes at open time. */
  initialTypeName?: string;
  /** Prefill parent by parent work item id (ph_work_items.id). Read-only
   *  in the parent picker when set. */
  initialParentId?: string | null;
}

// ─── Hierarchy Icons ──────────────────────────────────────
const HIERARCHY_ICONS: Record<string, { symbol: string; color: string }> = {
  Epic:    { symbol: '◆', color: 'var(--cp-purple-60)' },
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
export function CreateWorkItemModal({ open, onClose, projectId, projectKey, onCreated, initialTitle, initialTypeName, initialParentId }: CreateWorkItemModalProps) {
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
  // 2026-06-26: sprint replaces release in project-scope create flow.
  // release_id stays in DB for back-compat but is no longer written here.
  const [sprintId, setSprintId] = useState<string | null>(null);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [createAnother, setCreateAnother] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Dropdown states
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [parentOpen, setParentOpen] = useState(false);
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [sprintOpen, setSprintOpen] = useState(false);
  const [sprintSearch, setSprintSearch] = useState('');
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

  const { data: approvedProfiles = [] } = useApprovedProfiles();
  const profiles = approvedProfiles.map(p => ({ id: p.id, full_name: p.name, avatar_url: p.avatarUrl ?? null }));

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

  // 2026-06-26 (revised): ALL sprints, not project-filtered. Vikram
  // directive — dropdown always shows every sprint (past/current/future)
  // and is searchable.
  const { data: sprints = [] } = useQuery<SprintOption[]>({
    queryKey: ['ph-sprints-for-create-all'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('ph_jira_sprints').select('id, name, status')
        .order('release_date', { ascending: false, nullsFirst: false })
        .order('name');
      if (error) throw error;
      return (data || []) as SprintOption[];
    },
  });

  // ─── Defaults ────────────────────────────────────────────
  useEffect(() => {
    if (open && workTypes.length > 0 && !selectedType) {
      // Prefer explicit prefill work type (from AI-suggest Edit action)
      // over the generic "Story" default. Match case-insensitive.
      const prefill = initialTypeName
        ? workTypes.find(t => t.name.toLowerCase() === initialTypeName.toLowerCase())
        : null;
      const story = workTypes.find(t => t.name === 'Story');
      setSelectedType(prefill?.id || story?.id || workTypes[0].id);
    }
  }, [open, workTypes, selectedType, initialTypeName]);

  // Apply title / parent prefill on each open. Reset happens in the
  // reset-on-close effect below.
  useEffect(() => {
    if (!open) return;
    if (initialTitle) setTitle(initialTitle);
    if (initialParentId !== undefined) setParentId(initialParentId ?? null);
    setTimeout(() => titleRef.current?.focus(), 100);
  }, [open, initialTitle, initialParentId]);

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
    setParentOpen(false); setReleaseOpen(false); setSprintOpen(false); setLabelsOpen(false);
  };

  const resetForm = (keepTypeAndPriority = false) => {
    setTitle(''); setAssigneeId(null); setDueDate('');
    setParentId(null); setReleaseId(null); setSprintId(null); setSelectedLabels([]);
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
        sprint_id: sprintId,
        label_ids: selectedLabels.length > 0 ? selectedLabels : undefined,
      });

      queryClient.invalidateQueries({ queryKey: ['ph-work-items'] });

      catalystToast.success(`✓ ${result.item_key} created`, {
        description: result.title,
        duration: 4000,
      });

      onCreated?.(result.item_key);

      if (createAnother) {
        resetForm(true);
        setTimeout(() => titleRef.current?.focus(), 50);
      } else {
        resetForm();
        onClose();
      }
    } catch (err: any) {
      catalystToast.error('Failed to create work item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => { resetForm(); onClose(); };

  if (!open) return null;

  const selectedAssignee = profiles.find(p => p.id === assigneeId);
  const selectedParent = parentItems.find(p => p.id === parentId);
  const selectedRelease = releases.find(r => r.id === releaseId);
  const selectedSprint = sprints.find(s => s.id === sprintId);
  const pri = PRIORITIES.find(p => p.value === priority);

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center"
      style={{ fontFamily: 'var(--cp-font-body)' }}
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[var(--ds-shadow-overlay, rgba(15,23,42,0.5))]" />

      {/* Modal */}
      <div
        className="relative rounded-lg shadow-2xl flex flex-col bg-[var(--cp-float)]"
        style={{ width: 480, maxHeight: '85vh', border: '1px solid var(--divider)', borderRadius: 8 }}
        onClick={e => { e.stopPropagation(); closeDropdowns(); }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid var(--cp-bd-zone)' }}>
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold" style={{ color: 'var(--fg-1)', fontFamily: 'var(--cp-font-heading)' }}>
              Create Work Item
            </span>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--cp-bd-zone)]" style={{ color: 'var(--fg-3)' }}>
              {projectKey}
            </span>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--ds-surface-sunken,var(--cp-bg-sunken, var(--cp-bg-sunken)))] transition-colors"
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
                    <span style={{ color: hi.color, fontSize: 'var(--ds-font-size-400)', lineHeight: 1 }}>{hi.symbol}</span>
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
              className="w-full rounded-md border px-3 text-[14px] font-medium focus:outline-none focus:ring-2 focus:ring-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))] transition-shadow"
              style={{ height: 40, borderColor: 'var(--divider)', color: 'var(--fg-1)', fontFamily: 'var(--cp-font-body)' }}
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
                className="w-full flex items-center justify-between rounded-md border px-2.5 text-[12px] font-medium hover:border-[var(--ds-text-subtlest,var(--cp-ink-4, var(--cp-border-neutral-light)))] transition-colors"
                style={{ height: 50, borderColor: 'var(--divider)', color: 'var(--fg-2)' }}
              >
                <span className="flex items-center gap-1.5">
                  <span style={{ color: pri?.color }}>{pri?.icon}</span>
                  {pri?.label}
                </span>
                <ChevronDown size={14} className="text-[var(--ds-text-subtlest,var(--cp-ink-4, var(--cp-border-neutral-light)))]" />
              </button>
              {priorityOpen && (
                <FixedDropdown width="100%" onClick={e => e.stopPropagation()}>
                  {PRIORITIES.map(p => (
                    <button
                      key={p.value}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium hover:bg-[var(--ds-surface-sunken,var(--cp-bg-sunken, var(--cp-bg-sunken)))] transition-colors"
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
                className="w-full flex items-center justify-between rounded-md border px-2.5 text-[12px] font-medium hover:border-[var(--ds-text-subtlest,var(--cp-ink-4, var(--cp-border-neutral-light)))] transition-colors"
                style={{ height: 50, borderColor: 'var(--divider)', color: selectedAssignee ? 'var(--fg-2)' : 'var(--fg-4)' }}
              >
                <span className="truncate">{selectedAssignee ? selectedAssignee.full_name : 'Unassigned'}</span>
                <ChevronDown size={14} className="text-[var(--ds-text-subtlest,var(--cp-ink-4, var(--cp-border-neutral-light)))] shrink-0" />
              </button>
              {assigneeOpen && (
                <FixedDropdown maxHeight={220} onClick={e => e.stopPropagation()}>
                  <div className="px-2 py-1.5" style={{ borderBottom: '1px solid var(--cp-bd-zone)' }}>
                    <div className="relative">
                      <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--ds-text-subtlest,var(--cp-ink-4, var(--cp-border-neutral-light)))]" />
                      <input
                        value={assigneeSearch}
                        onChange={e => setAssigneeSearch(e.target.value)}
                        placeholder="Search..."
                        className="w-full pl-7 pr-2 py-1 text-[11px] rounded border focus:outline-none focus:ring-1 focus:ring-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))]"
                        style={{ borderColor: 'var(--divider)', height: 28 }}
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto flex-1">
                    <button
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[var(--ds-surface-sunken,var(--cp-bg-sunken, var(--cp-bg-sunken)))]"
                      style={{ color: 'var(--fg-4)' }}
                      onClick={() => { setAssigneeId(null); setAssigneeOpen(false); setAssigneeSearch(''); }}
                    >
                      Unassigned
                    </button>
                    {filteredProfiles.map(p => (
                      <button
                        key={p.id}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium hover:bg-[var(--ds-surface-sunken,var(--cp-bg-sunken, var(--cp-bg-sunken)))] text-left"
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
              className="w-full flex items-center gap-1.5 flex-wrap min-h-[50px] rounded-md border px-2.5 py-1.5 text-[12px] hover:border-[var(--ds-text-subtlest,var(--cp-ink-4, var(--cp-border-neutral-light)))] transition-colors"
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
              <ChevronDown size={14} className="text-[var(--ds-text-subtlest,var(--cp-ink-4, var(--cp-border-neutral-light)))] ml-auto shrink-0" />
            </button>
            {labelsOpen && labels.length > 0 && (
              <FixedDropdown maxHeight={200} onClick={e => e.stopPropagation()}>
                <div className="overflow-y-auto">
                  {labels.map(lb => {
                    const checked = selectedLabels.includes(lb.id);
                    return (
                      <button
                        key={lb.id}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium hover:bg-[var(--ds-surface-sunken,var(--cp-bg-sunken, var(--cp-bg-sunken)))]"
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

          {/* Due date + Sprint */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--fg-4)' }}>Due Date</label>
              <div className="relative">
                <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ds-text-subtlest,var(--cp-ink-4, var(--cp-border-neutral-light)))]" />
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full rounded-md border pl-8 pr-2.5 text-[12px] font-medium focus:outline-none focus:ring-2 focus:ring-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))] transition-shadow"
                  style={{ height: 50, borderColor: 'var(--divider)', color: 'var(--fg-2)', fontFamily: 'var(--cp-font-mono)' }}
                />
              </div>
            </div>

            {/* Sprint (2026-06-26: replaced Release in project-scope create) */}
            <div className="relative">
              <label className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--fg-4)' }}>Sprint</label>
              <button
                onClick={e => { e.stopPropagation(); closeDropdowns(); setSprintOpen(!sprintOpen); }}
                className="w-full flex items-center justify-between rounded-md border px-2.5 text-[12px] font-medium hover:border-[var(--ds-text-subtlest,var(--cp-ink-4, var(--cp-border-neutral-light)))] transition-colors"
                style={{ height: 50, borderColor: 'var(--divider)', color: selectedSprint ? 'var(--fg-2)' : 'var(--fg-4)' }}
              >
                <span className="truncate">
                  {selectedSprint ? selectedSprint.name : 'None'}
                </span>
                <ChevronDown size={14} className="text-[var(--ds-text-subtlest,var(--cp-ink-4, var(--cp-border-neutral-light)))] shrink-0" />
              </button>
              {sprintOpen && (
                <FixedDropdown maxHeight={260} onClick={e => e.stopPropagation()}>
                  <div className="p-1.5 border-b" style={{ borderColor: 'var(--divider)' }}>
                    <input
                      autoFocus
                      type="text"
                      value={sprintSearch}
                      onChange={(e) => setSprintSearch(e.currentTarget.value)}
                      placeholder="Search sprints"
                      className="w-full px-2 py-1 text-[11px] border rounded outline-none"
                      style={{ borderColor: 'var(--divider)', color: 'var(--fg-2)', background: 'var(--ds-surface)' }}
                    />
                  </div>
                  <button
                    className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-[var(--ds-surface-sunken,var(--cp-bg-sunken, var(--cp-bg-sunken)))]"
                    style={{ color: 'var(--fg-4)' }}
                    onClick={() => { setSprintId(null); setSprintOpen(false); setSprintSearch(''); }}
                  >
                    None
                  </button>
                  {sprints
                    .filter(s => !sprintSearch.trim() || s.name.toLowerCase().includes(sprintSearch.trim().toLowerCase()))
                    .map(s => (
                    <button
                      key={s.id}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium hover:bg-[var(--ds-surface-sunken,var(--cp-bg-sunken, var(--cp-bg-sunken)))] text-left"
                      style={{ color: 'var(--fg-2)' }}
                      onClick={() => { setSprintId(s.id); setSprintOpen(false); setSprintSearch(''); }}
                    >
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[var(--sem-success-bg)]" style={{ color: 'var(--sem-success)' }}>
                        {s.status === 'released' ? '✓' : s.status === 'in_progress' ? '►' : '○'}
                      </span>
                      {s.name}
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
              className="w-full flex items-center justify-between rounded-md border px-2.5 text-[12px] font-medium hover:border-[var(--ds-text-subtlest,var(--cp-ink-4, var(--cp-border-neutral-light)))] transition-colors"
              style={{ height: 50, borderColor: 'var(--divider)', color: selectedParent ? 'var(--fg-2)' : 'var(--fg-4)' }}
            >
              <span className="truncate">
                {selectedParent ? `${selectedParent.item_key} — ${selectedParent.title || selectedParent.summary}` : 'None'}
              </span>
              <ChevronDown size={14} className="text-[var(--ds-text-subtlest,var(--cp-ink-4, var(--cp-border-neutral-light)))] shrink-0" />
            </button>
            {parentOpen && (
              <FixedDropdown width={280} maxHeight={220} onClick={e => e.stopPropagation()}>
                <div className="px-2 py-1.5" style={{ borderBottom: '1px solid var(--cp-bd-zone)' }}>
                  <div className="relative">
                    <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--ds-text-subtlest,var(--cp-ink-4, var(--cp-border-neutral-light)))]" />
                    <input
                      value={parentSearch}
                      onChange={e => setParentSearch(e.target.value)}
                      placeholder="Search by key or title..."
                      className="w-full pl-7 pr-2 py-1 text-[11px] rounded border focus:outline-none focus:ring-1 focus:ring-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))]"
                      style={{ borderColor: 'var(--divider)', height: 28 }}
                      autoFocus
                    />
                  </div>
                </div>
                <div className="overflow-y-auto flex-1">
                  <button
                    className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-[var(--ds-surface-sunken,var(--cp-bg-sunken, var(--cp-bg-sunken)))]"
                    style={{ color: 'var(--fg-4)' }}
                    onClick={() => { setParentId(null); setParentOpen(false); setParentSearch(''); }}
                  >
                    None
                  </button>
                  {filteredParents.map(p => (
                    <button
                      key={p.id}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium hover:bg-[var(--ds-surface-sunken,var(--cp-bg-sunken, var(--cp-bg-sunken)))] text-left"
                      style={{ color: 'var(--fg-2)' }}
                      onClick={() => { setParentId(p.id); setParentOpen(false); setParentSearch(''); }}
                    >
                      <span style={{ fontFamily: 'var(--cp-font-mono)', color: 'var(--fg-3)', fontSize: 'var(--ds-font-size-50)' }}>
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
              className="w-3.5 h-3.5 rounded accent-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))]"
            />
            Create another
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className="px-3.5 py-1.5 text-[12px] font-medium rounded-md hover:bg-[var(--ds-surface-sunken,var(--cp-bg-sunken, var(--cp-bg-sunken)))] transition-colors"
              style={{ color: 'var(--fg-3)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || submitting}
              className="flex items-center justify-center rounded-md text-[13px] font-semibold transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--cp-blue)]"
              style={{ height: 40, padding: '0 20px', color: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))', borderRadius: 6 }}
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
        boxShadow: '0 8px 20px var(--ds-shadow-raised, rgba(0,0,0,0.18))',
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
  const colors = ['var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', 'var(--cp-teal-60)', 'var(--cp-purple-60)', 'var(--ds-text-warning, var(--cp-warning))', 'var(--ds-text-danger, var(--cp-danger))', 'var(--ds-text-success, var(--cp-success))'];
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
