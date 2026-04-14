/**
 * CreateLinkedWorkItemModal — Create a new work item and auto-link to the source item.
 *
 * Reuses the CreateWorkItemModal pattern from Catalyst:
 *   - Work type selector (hierarchy icons)
 *   - Title (required)
 *   - Priority + Assignee
 *   - Link type chip showing source item
 *   - "Create another" checkbox
 *   - Unsaved changes confirmation dialog
 *
 * On submit: creates work item → creates link → invalidates queries.
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { createWorkItem } from '@/services/workItemService';
import { createWorkItemLink } from '@/services/linkedWorkItemsService';
import { useLinkTypes } from '@/hooks/useLinkedWorkItems';
import { linkedItemKeys } from '@/hooks/useLinkedWorkItems';
import {
  X, ArrowUp, ArrowRight, ArrowDown, ChevronsUp,
  ChevronDown, Search, AlertTriangle, Link as LinkIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import type { LinkTypeOption } from '@/services/linkedWorkItemsService';

// ─── Types ────────────────────────────────────────────────

interface CreateLinkedWorkItemModalProps {
  open: boolean;
  onClose: () => void;
  /** Source item being linked FROM */
  sourceItemId: string;
  sourceItemKey: string;
  /** Project context */
  projectId: string;
  projectKey: string;
}

interface WorkTypeOption { id: string; name: string; color: string; icon: string; level: string; }
interface StatusOption { id: string; name: string; is_default: boolean; category: string; }
interface ProfileOption { id: string; full_name: string; avatar_url: string | null; }

// ─── Constants ────────────────────────────────────────────

const HIERARCHY_ICONS: Record<string, { symbol: string; color: string }> = {
  Epic:    { symbol: '◆', color: '#7C3AED' },
  Feature: { symbol: '▲', color: '#2563EB' },
  Story:   { symbol: '●', color: '#0D9488' },
  Bug:     { symbol: '⬡', color: '#DC2626' },
  Task:    { symbol: '■', color: '#D97706' },
  Subtask: { symbol: '○', color: '#94A3B8' },
};

const PRIORITIES = [
  { value: 'critical', label: 'Critical', icon: <ChevronsUp size={14} />, color: '#DC2626' },
  { value: 'high', label: 'High', icon: <ArrowUp size={14} />, color: '#D97706' },
  { value: 'medium', label: 'Medium', icon: <ArrowRight size={14} />, color: '#2563EB' },
  { value: 'low', label: 'Low', icon: <ArrowDown size={14} />, color: '#94A3B8' },
];

// ─── Component ────────────────────────────────────────────

export function CreateLinkedWorkItemModal({
  open,
  onClose,
  sourceItemId,
  sourceItemKey,
  projectId,
  projectKey,
}: CreateLinkedWorkItemModalProps) {
  const queryClient = useQueryClient();
  const titleRef = useRef<HTMLInputElement>(null);

  // Form state
  const [selectedType, setSelectedType] = useState('');
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [selectedLinkType, setSelectedLinkType] = useState<LinkTypeOption | null>(null);
  const [createAnother, setCreateAnother] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Dropdown states
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [linkTypeOpen, setLinkTypeOpen] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState('');

  // Unsaved changes dialog
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);

  // ─── Data Queries ────────────────────────────────────────

  const { data: workTypes = [] } = useQuery<WorkTypeOption[]>({
    queryKey: ['ph-work-types', projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_work_types').select('id, name, color, icon, level')
        .eq('project_id', projectId).eq('is_enabled', true).order('position');
      return (data || []) as WorkTypeOption[];
    },
    enabled: !!projectId && open,
  });

  const { data: statuses = [] } = useQuery<StatusOption[]>({
    queryKey: ['ph-statuses-default', projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_workflow_statuses').select('id, name, is_default, category')
        .eq('project_id', projectId).order('position');
      return (data || []) as StatusOption[];
    },
    enabled: !!projectId && open,
  });

  const { data: profiles = [] } = useQuery<ProfileOption[]>({
    queryKey: ['ph-profiles-all'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name, avatar_url').order('full_name');
      return (data || []) as ProfileOption[];
    },
    enabled: open,
  });

  const { options: linkTypeOptions } = useLinkTypes();

  // ─── Defaults ────────────────────────────────────────────

  useEffect(() => {
    if (open && workTypes.length > 0 && !selectedType) {
      const story = workTypes.find(t => t.name === 'Story');
      setSelectedType(story?.id || workTypes[0].id);
    }
  }, [open, workTypes, selectedType]);

  // Default link type to first available
  useEffect(() => {
    if (open && linkTypeOptions.length > 0 && !selectedLinkType) {
      setSelectedLinkType(linkTypeOptions[0]);
    }
  }, [open, linkTypeOptions, selectedLinkType]);

  useEffect(() => {
    if (open) setTimeout(() => titleRef.current?.focus(), 100);
  }, [open]);

  // ─── Computed ────────────────────────────────────────────

  const filteredProfiles = useMemo(() => {
    if (!assigneeSearch.trim()) return profiles;
    const q = assigneeSearch.toLowerCase();
    return profiles.filter(p => p.full_name?.toLowerCase().includes(q));
  }, [profiles, assigneeSearch]);

  const selectedTypeName = workTypes.find(t => t.id === selectedType)?.name || 'Story';
  const selectedAssignee = profiles.find(p => p.id === assigneeId);
  const pri = PRIORITIES.find(p => p.value === priority);
  const defaultStatus = statuses.find(s => s.is_default) || statuses[0];

  const isDirty = title.trim().length > 0 || assigneeId !== null || priority !== 'medium';

  const closeDropdowns = () => {
    setPriorityOpen(false);
    setAssigneeOpen(false);
    setLinkTypeOpen(false);
  };

  const resetForm = (keepTypeAndPriority = false) => {
    setTitle('');
    setAssigneeId(null);
    setAssigneeSearch('');
    if (!keepTypeAndPriority) {
      const story = workTypes.find(t => t.name === 'Story');
      setSelectedType(story?.id || workTypes[0]?.id || '');
      setPriority('medium');
    }
  };

  // ─── Close with unsaved changes check ───────────────────

  const handleAttemptClose = () => {
    if (isDirty) {
      setShowUnsavedDialog(true);
    } else {
      resetForm();
      onClose();
    }
  };

  const handleDiscard = () => {
    setShowUnsavedDialog(false);
    resetForm();
    onClose();
  };

  const handleGoBack = () => {
    setShowUnsavedDialog(false);
  };

  // ─── Submit ──────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!title.trim() || !selectedType || !selectedLinkType || submitting) return;
    if (!defaultStatus) return;

    setSubmitting(true);
    let createdItemKey = '';
    let createdItemId = '';

    try {
      // Step 1: Create the work item
      const result = await createWorkItem({
        project_id: projectId,
        type_id: selectedType,
        status_id: defaultStatus.id,
        title: title.trim(),
        item_type: selectedTypeName,
        priority,
        assignee_id: assigneeId,
      });

      createdItemKey = result.item_key;
      createdItemId = result.id;

      // Step 2: Create the link
      try {
        await createWorkItemLink(sourceItemId, createdItemId, selectedLinkType.label);
      } catch (linkErr: any) {
        // Item created but link failed — show recovery info
        toast.error(`${createdItemKey} created but linking failed: ${linkErr.message}`, {
          description: `You can manually link ${createdItemKey} from the linked items section.`,
          duration: 8000,
        });
        queryClient.invalidateQueries({ queryKey: ['ph-work-items'] });
        return;
      }

      // Both succeeded
      queryClient.invalidateQueries({ queryKey: ['ph-work-items'] });
      queryClient.invalidateQueries({ queryKey: linkedItemKeys.linksForItem(sourceItemId) });

      toast.success(`${createdItemKey} created and linked`, {
        description: `${selectedLinkType.label} ${sourceItemKey}`,
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

  if (!open) return null;

  return (
    <>
      {/* Modal overlay */}
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ zIndex: 9998, fontFamily: 'Inter, sans-serif' }}
        onClick={handleAttemptClose}
      >
        <div className="absolute inset-0 bg-[rgba(15,23,42,0.5)]" />

        {/* Modal */}
        <div
          className="relative rounded-lg shadow-2xl flex flex-col bg-[var(--cp-float)]"
          style={{
            width: 520,
            maxHeight: '85vh',
            border: '1px solid var(--divider)',
            borderRadius: 8,
          }}
          onClick={e => { e.stopPropagation(); closeDropdowns(); }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-3.5"
            style={{ borderBottom: '1px solid var(--cp-bd-zone)' }}
          >
            <div className="flex items-center gap-2">
              <LinkIcon size={16} color="#6B778C" />
              <span
                className="text-[14px] font-semibold"
                style={{ color: 'var(--fg-1)', fontFamily: 'Sora, sans-serif' }}
              >
                Create Linked Work Item
              </span>
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--cp-bd-zone)]"
                style={{ color: 'var(--fg-3)' }}
              >
                {projectKey}
              </span>
            </div>
            <button
              onClick={handleAttemptClose}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#F1F5F9] transition-colors"
              style={{ color: 'var(--fg-4)' }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4 flex flex-col gap-4 overflow-y-auto">
            {/* Work Type */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider mb-2 block" style={{ color: 'var(--fg-4)' }}>
                Work Type <span style={{ color: '#DC2626' }}>*</span>
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

            {/* Status indicator */}
            {defaultStatus && (
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--fg-4)' }}>
                  Status
                </label>
                <div className="flex items-center gap-2">
                  <span
                    className="text-[12px] font-medium px-2 py-1 rounded"
                    style={{
                      background: defaultStatus.category === 'in_progress' ? '#DEEBFF' : '#DFE1E6',
                      color: defaultStatus.category === 'in_progress' ? '#0747A6' : '#253858',
                    }}
                  >
                    {defaultStatus.name}
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--fg-4)' }}>
                    Initial status upon creation
                  </span>
                </div>
              </div>
            )}

            {/* Linked Work Items (chip showing source item) */}
            <div className="relative">
              <label className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--fg-4)' }}>
                Linked Work Items <span style={{ color: '#DC2626' }}>*</span>
              </label>
              {/* Link type selector */}
              <button
                onClick={e => { e.stopPropagation(); closeDropdowns(); setLinkTypeOpen(!linkTypeOpen); }}
                className="w-full flex items-center justify-between rounded-md border px-2.5 text-[12px] font-medium hover:border-[#94A3B8] transition-colors mb-2"
                style={{ height: 36, borderColor: 'var(--divider)', color: 'var(--fg-2)' }}
              >
                <span>{selectedLinkType?.label || 'Select link type...'}</span>
                <ChevronDown size={14} className="text-[#94A3B8]" />
              </button>
              {linkTypeOpen && (
                <div
                  className="absolute left-0 right-0 rounded-md overflow-hidden flex flex-col bg-[var(--cp-float)]"
                  style={{
                    maxHeight: 240,
                    border: '1px solid var(--divider)',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.18)',
                    zIndex: 9999,
                    overflowY: 'auto',
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  {linkTypeOptions.map(opt => (
                    <button
                      key={`${opt.linkTypeId}-${opt.direction}`}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium hover:bg-[#F1F5F9] text-left transition-colors"
                      style={{
                        color: 'var(--fg-2)',
                        background: selectedLinkType?.label === opt.label && selectedLinkType?.linkTypeId === opt.linkTypeId ? '#DEEBFF' : 'transparent',
                      }}
                      onClick={() => { setSelectedLinkType(opt); setLinkTypeOpen(false); }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
              {/* Source item chip */}
              <div
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md w-fit"
                style={{ background: 'var(--cp-bd-zone)', border: '1px solid var(--divider)' }}
              >
                <span className="text-[11px] font-semibold" style={{ color: '#0052CC', fontFamily: 'JetBrains Mono, monospace' }}>
                  {sourceItemKey}
                </span>
                <span className="text-[10px]" style={{ color: 'var(--fg-3)' }}>×</span>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--fg-4)' }}>
                Summary <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                ref={titleRef}
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                className="w-full rounded-md border px-3 text-[14px] font-medium focus:outline-none focus:ring-2 focus:ring-[#2563EB] transition-shadow"
                style={{
                  height: 40,
                  borderColor: 'var(--divider)',
                  color: 'var(--fg-1)',
                  fontFamily: 'Inter, sans-serif',
                }}
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
                  className="w-full flex items-center justify-between rounded-md border px-2.5 text-[12px] font-medium hover:border-[#94A3B8] transition-colors"
                  style={{ height: 40, borderColor: 'var(--divider)', color: 'var(--fg-2)' }}
                >
                  <span className="flex items-center gap-1.5">
                    <span style={{ color: pri?.color }}>{pri?.icon}</span>
                    {pri?.label}
                  </span>
                  <ChevronDown size={14} className="text-[#94A3B8]" />
                </button>
                {priorityOpen && (
                  <div
                    className="absolute left-0 mt-1 rounded-md overflow-hidden flex flex-col bg-[var(--cp-float)]"
                    style={{ width: '100%', border: '1px solid var(--divider)', boxShadow: '0 8px 20px rgba(0,0,0,0.18)', zIndex: 9999 }}
                    onClick={e => e.stopPropagation()}
                  >
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
                  </div>
                )}
              </div>

              {/* Assignee */}
              <div className="relative">
                <label className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--fg-4)' }}>Assignee</label>
                <button
                  onClick={e => { e.stopPropagation(); closeDropdowns(); setAssigneeOpen(!assigneeOpen); }}
                  className="w-full flex items-center justify-between rounded-md border px-2.5 text-[12px] font-medium hover:border-[#94A3B8] transition-colors"
                  style={{ height: 40, borderColor: 'var(--divider)', color: selectedAssignee ? 'var(--fg-2)' : 'var(--fg-4)' }}
                >
                  <span className="truncate">{selectedAssignee ? selectedAssignee.full_name : 'Automatic'}</span>
                  <ChevronDown size={14} className="text-[#94A3B8] shrink-0" />
                </button>
                {assigneeOpen && (
                  <div
                    className="absolute left-0 mt-1 rounded-md overflow-hidden flex flex-col bg-[var(--cp-float)]"
                    style={{ width: '100%', maxHeight: 200, border: '1px solid var(--divider)', boxShadow: '0 8px 20px rgba(0,0,0,0.18)', zIndex: 9999 }}
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="px-2 py-1.5" style={{ borderBottom: '1px solid var(--cp-bd-zone)' }}>
                      <div className="relative">
                        <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
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
                        Automatic
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
                  </div>
                )}
              </div>
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
                onClick={handleAttemptClose}
                className="px-3.5 py-1.5 text-[12px] font-medium rounded-md hover:bg-[#F1F5F9] transition-colors"
                style={{ color: 'var(--fg-3)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!title.trim() || !selectedLinkType || submitting}
                className="flex items-center justify-center rounded-md text-[13px] font-semibold transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  height: 36,
                  padding: '0 20px',
                  borderRadius: 6,
                  background: '#2563EB',
                  color: '#FFFFFF',
                }}
              >
                {submitting ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Unsaved changes dialog */}
      {showUnsavedDialog && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 10000 }}
          onClick={handleGoBack}
        >
          <div className="absolute inset-0 bg-[rgba(15,23,42,0.3)]" />
          <div
            className="relative rounded-lg shadow-2xl flex flex-col bg-[var(--cp-float)]"
            style={{
              width: 400,
              border: '1px solid var(--divider)',
              borderRadius: 8,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4">
              <h3
                className="text-[16px] font-semibold"
                style={{ color: 'var(--fg-1)', fontFamily: 'Sora, sans-serif' }}
              >
                Your changes won't be saved
              </h3>
              <button
                onClick={handleGoBack}
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#F1F5F9] transition-colors"
                style={{ color: 'var(--fg-4)' }}
              >
                <X size={16} />
              </button>
            </div>
            <div className="px-5 pb-4">
              <p className="text-[13px]" style={{ color: 'var(--fg-2)', lineHeight: '20px' }}>
                We won't be able to save your data if you move away from this page.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3" style={{ borderTop: '1px solid var(--cp-bd-zone)' }}>
              <button
                onClick={handleGoBack}
                className="px-4 py-2 text-[13px] font-medium rounded-md hover:bg-[#F1F5F9] transition-colors"
                style={{ color: 'var(--fg-2)' }}
              >
                Go back
              </button>
              <button
                onClick={handleDiscard}
                className="px-4 py-2 text-[13px] font-semibold rounded-md transition-colors"
                style={{ background: '#DE350B', color: '#fff' }}
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </>
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
