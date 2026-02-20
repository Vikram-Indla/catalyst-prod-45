import React, { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { updateWorkItem } from '@/services/workItemService';
import { createWorkItem } from '@/services/workItemService';
import { CollapsibleSection } from './detail/CollapsibleSection';
import { StatusLozenge } from './detail/StatusLozenge';
import { DetailRightSidebar } from './detail/DetailRightSidebar';
import { ActivityFeed } from './detail/ActivityFeed';
import { AttachmentsSection } from './detail/AttachmentsSection';
import { LinkedItemsSection } from './detail/LinkedItemsSection';
import { useWorkItemDetail, type ChildItem } from '@/hooks/useWorkItemDetail';
import {
  X, Copy, Bookmark, Eye, ChevronDown, ArrowUp, ArrowRight, ArrowDown,
  ChevronsUp, Zap, Layers, Bug, CheckSquare, CornerDownRight, Search,
  Flag, Calendar, Plus, Settings, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Constants ──────────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
  Epic: '#7C3AED', Feature: '#2563EB', Story: '#0D9488',
  Bug: '#DC2626', Task: '#D97706', Subtask: '#94A3B8',
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  Epic: <Zap size={16} />, Feature: <Layers size={16} />,
  Story: <Bookmark size={16} />, Bug: <Bug size={16} />,
  Task: <CheckSquare size={16} />, Subtask: <CornerDownRight size={16} />,
};

const PRIORITIES = [
  { value: 'Critical', icon: <ChevronsUp size={14} />, color: '#DC2626' },
  { value: 'High', icon: <ArrowUp size={14} />, color: '#D97706' },
  { value: 'Medium', icon: <ArrowRight size={14} />, color: '#2563EB' },
  { value: 'Low', icon: <ArrowDown size={14} />, color: '#94A3B8' },
];

// ─── Props ──────────────────────────────────────────────
interface WorkItemDetailModalProps {
  open: boolean;
  itemId: string | null;
  projectId: string;
  projectKey: string;
  onClose: () => void;
  onNavigate?: (id: string) => void;
}

export function WorkItemDetailModal({ open, itemId, projectId, projectKey, onClose, onNavigate }: WorkItemDetailModalProps) {
  const queryClient = useQueryClient();
  const { data: item, isLoading } = useWorkItemDetail(open ? itemId : null);

  // Inline title editing
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  // Priority dropdown
  const [priorityOpen, setPriorityOpen] = useState(false);

  // Status dropdown
  const [statusOpen, setStatusOpen] = useState(false);

  // Subtask creation
  const [creatingSubtask, setCreatingSubtask] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [subtaskSubmitting, setSubtaskSubmitting] = useState(false);

  // Fetch statuses for dropdown
  const [statuses, setStatuses] = useState<{ id: string; name: string; category: string }[]>([]);
  React.useEffect(() => {
    if (!projectId) return;
    supabase
      .from('ph_workflow_statuses')
      .select('id, name, category')
      .eq('project_id', projectId)
      .order('position')
      .then(({ data }) => setStatuses(data || []));
  }, [projectId]);

  // Fetch work types for subtask creation
  const [workTypes, setWorkTypes] = useState<{ id: string; name: string }[]>([]);
  React.useEffect(() => {
    if (!projectId) return;
    supabase
      .from('ph_work_types')
      .select('id, name')
      .eq('project_id', projectId)
      .eq('is_enabled', true)
      .order('position')
      .then(({ data }) => setWorkTypes(data || []));
  }, [projectId]);

  if (!open) return null;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['ph-work-item-detail', itemId] });
    queryClient.invalidateQueries({ queryKey: ['ph-work-items', projectId] });
  };

  const handleSaveTitle = async () => {
    if (!item || !titleDraft.trim() || titleDraft.trim() === item.title) {
      setEditingTitle(false);
      return;
    }
    try {
      await updateWorkItem(item.id, { title: titleDraft.trim(), summary: titleDraft.trim() });
      invalidate();
      toast.success('Title updated');
    } catch (e: any) {
      toast.error(e.message);
    }
    setEditingTitle(false);
  };

  const handleUpdateField = async (field: string, value: any) => {
    if (!item) return;
    try {
      await updateWorkItem(item.id, { [field]: value });
      invalidate();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleCreateSubtask = async () => {
    if (!subtaskTitle.trim() || subtaskSubmitting) return;
    setSubtaskSubmitting(true);
    try {
      const subtaskType = workTypes.find(t => t.name === 'Subtask') || workTypes[workTypes.length - 1];
      const defaultStatus = statuses[0];
      if (!subtaskType || !defaultStatus) throw new Error('Missing type/status config');

      await createWorkItem({
        project_id: projectId,
        type_id: subtaskType.id,
        status_id: defaultStatus.id,
        title: subtaskTitle.trim(),
        item_type: 'Subtask',
        parent_id: item!.id,
        priority: 'Medium',
      });
      invalidate();
      setSubtaskTitle('');
      setCreatingSubtask(false);
      toast.success('Subtask created');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubtaskSubmitting(false);
    }
  };

  const handleCopyKey = () => {
    if (item) {
      navigator.clipboard.writeText(item.item_key);
      toast.success(`Copied ${item.item_key}`);
    }
  };

  const typeColor = item ? (TYPE_COLORS[item.type_name] || item.type_color) : '#94A3B8';

  // Subtask progress
  const doneCount = item?.children?.filter(c => c.status_category === 'done').length ?? 0;
  const totalChildren = item?.children?.length ?? 0;
  const progressPct = totalChildren > 0 ? Math.round((doneCount / totalChildren) * 100) : 0;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 200, fontFamily: 'Inter, sans-serif' }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.45)' }} />

      {/* Modal */}
      <div
        className="relative flex flex-col rounded-lg"
        style={{
          width: 900,
          maxHeight: '88vh',
          background: '#FFFFFF',
          borderRadius: 8,
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        }}
        onClick={e => { e.stopPropagation(); setPriorityOpen(false); setStatusOpen(false); }}
      >
        {/* ─── Header ─────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-6 py-3 shrink-0"
          style={{ borderBottom: '1px solid #F1F5F9' }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Type icon */}
            <span style={{ color: typeColor }}>{TYPE_ICONS[item?.type_name ?? ''] || <CheckSquare size={16} />}</span>
            {/* Item key */}
            <span className="text-[12px] shrink-0" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#64748B' }}>
              {item?.item_key ?? '…'}
            </span>
            {item?.is_flagged && <Flag size={13} style={{ color: '#DC2626' }} />}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={handleCopyKey} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#F1F5F9]" title="Copy key" style={{ color: '#94A3B8' }}>
              <Copy size={14} />
            </button>
            <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#F1F5F9]" title="Watch" style={{ color: '#94A3B8' }}>
              <Eye size={14} />
            </button>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#F1F5F9]" style={{ color: '#94A3B8' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {isLoading || !item ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-[#2563EB]" />
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden min-h-0">
            {/* ─── Left Panel ──────────────────────────── */}
            <div className="flex-1 overflow-y-auto" style={{ padding: '20px 24px 60px' }}>
              {/* Inline editable title */}
              {editingTitle ? (
                <input
                  autoFocus
                  value={titleDraft}
                  onChange={e => setTitleDraft(e.target.value)}
                  onBlur={handleSaveTitle}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
                  className="w-full text-[24px] font-semibold mb-4 px-1 py-0.5 rounded border-2 focus:outline-none"
                  style={{ fontFamily: 'Sora, sans-serif', color: '#0F172A', lineHeight: '32px', borderColor: '#2563EB' }}
                />
              ) : (
                <h2
                  className="text-[24px] font-semibold mb-4 cursor-text rounded px-1 py-0.5 border border-transparent hover:border-[#E2E8F0] transition-colors"
                  style={{ fontFamily: 'Sora, sans-serif', color: '#0F172A', lineHeight: '32px' }}
                  onClick={() => { setTitleDraft(item.title); setEditingTitle(true); }}
                >
                  {item.title}
                </h2>
              )}

              {/* Parent link */}
              {item.parent_id && item.parent_key && (
                <CollapsibleSection title="Parent" defaultOpen={true}>
                  <button
                    className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-[#F8FAFC] transition-colors w-full text-left"
                    onClick={() => onNavigate?.(item.parent_id!)}
                  >
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: item.parent_type_color || '#94A3B8' }} />
                    <span className="text-[11px]" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#64748B' }}>
                      {item.parent_key}
                    </span>
                    <span className="text-[13px] font-medium truncate" style={{ color: '#0F172A' }}>
                      {item.parent_title}
                    </span>
                    {item.parent_status_name && (
                      <StatusLozenge name={item.parent_status_name} category={item.parent_status_category || 'todo'} />
                    )}
                  </button>
                </CollapsibleSection>
              )}

              {/* Key Details */}
              <CollapsibleSection title="Key Details" defaultOpen={true}>
                <div className="grid gap-3" style={{ gridTemplateColumns: '110px 1fr' }}>
                  {/* Status */}
                  <span className="text-[13px]" style={{ color: '#44546F' }}>Status</span>
                  <div className="relative">
                    <button
                      onClick={e => { e.stopPropagation(); setStatusOpen(!statusOpen); setPriorityOpen(false); }}
                      className="flex items-center gap-1"
                    >
                      <StatusLozenge name={item.status_name} category={item.status_category} size="md" />
                      <ChevronDown size={12} className="text-[#94A3B8]" />
                    </button>
                    {statusOpen && (
                      <div
                        className="absolute left-0 top-full mt-1 rounded-md overflow-hidden"
                        style={{ width: 180, background: '#FFF', border: '1px solid #E2E8F0', boxShadow: '0 8px 20px rgba(0,0,0,0.18)', zIndex: 9999 }}
                        onClick={e => e.stopPropagation()}
                      >
                        {statuses.map(s => (
                          <button
                            key={s.id}
                            className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium hover:bg-[#F1F5F9]"
                            onClick={() => { handleUpdateField('status_id', s.id); setStatusOpen(false); }}
                          >
                            <StatusLozenge name={s.name} category={s.category} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Priority */}
                  <span className="text-[13px]" style={{ color: '#44546F' }}>Priority</span>
                  <div className="relative">
                    <button
                      onClick={e => { e.stopPropagation(); setPriorityOpen(!priorityOpen); setStatusOpen(false); }}
                      className="flex items-center gap-1.5 text-[13px] font-medium"
                      style={{ color: '#334155' }}
                    >
                      {PRIORITIES.find(p => p.value === item.priority)?.icon}
                      {item.priority}
                      <ChevronDown size={12} className="text-[#94A3B8]" />
                    </button>
                    {priorityOpen && (
                      <div
                        className="absolute left-0 top-full mt-1 rounded-md overflow-hidden"
                        style={{ width: 160, background: '#FFF', border: '1px solid #E2E8F0', boxShadow: '0 8px 20px rgba(0,0,0,0.18)', zIndex: 9999 }}
                        onClick={e => e.stopPropagation()}
                      >
                        {PRIORITIES.map(p => (
                          <button
                            key={p.value}
                            className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium hover:bg-[#F1F5F9]"
                            onClick={() => { handleUpdateField('priority', p.value); setPriorityOpen(false); }}
                          >
                            <span style={{ color: p.color }}>{p.icon}</span>
                            {p.value}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Assignee */}
                  <span className="text-[13px]" style={{ color: '#44546F' }}>Assignee</span>
                  <span className="text-[13px] font-medium" style={{ color: '#334155' }}>
                    {item.assignee_name || <span style={{ color: '#94A3B8' }}>Unassigned</span>}
                  </span>

                  {/* Due Date */}
                  <span className="text-[13px]" style={{ color: '#44546F' }}>Due Date</span>
                  <span className="text-[13px]" style={{ fontFamily: 'JetBrains Mono, monospace', color: item.due_date && new Date(item.due_date) < new Date() ? '#DC2626' : '#334155' }}>
                    {item.due_date ? new Date(item.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : <span style={{ color: '#94A3B8' }}>None</span>}
                  </span>

                  {/* Story Points */}
                  {item.story_points != null && (
                    <>
                      <span className="text-[13px]" style={{ color: '#44546F' }}>Story Points</span>
                      <span className="text-[13px] font-medium" style={{ color: '#334155' }}>{item.story_points}</span>
                    </>
                  )}

                  {/* Reporter */}
                  <span className="text-[13px]" style={{ color: '#44546F' }}>Reporter</span>
                  <span className="text-[13px]" style={{ color: '#334155' }}>
                    {item.reporter_name || <span style={{ color: '#94A3B8' }}>—</span>}
                  </span>

                  {/* Created */}
                  <span className="text-[13px]" style={{ color: '#44546F' }}>Created</span>
                  <span className="text-[12px]" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#64748B' }}>
                    {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </CollapsibleSection>

              {/* Description */}
              <CollapsibleSection title="Description" defaultOpen={true}>
                <div
                  className="rounded-md px-3 py-2 min-h-[60px] border border-transparent hover:border-[#E2E8F0] cursor-text transition-colors"
                  style={{ fontSize: 14, lineHeight: '22px', color: item.description ? '#0F172A' : '#94A3B8' }}
                >
                  {item.description || 'Add a description...'}
                </div>
              </CollapsibleSection>

              {/* Subtasks */}
              <CollapsibleSection title="Subtasks" count={totalChildren} defaultOpen={totalChildren > 0}>
                {totalChildren > 0 && (
                  <>
                    {/* Progress bar */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#E2E8F0' }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${progressPct}%`, background: '#0D9488' }}
                        />
                      </div>
                      <span className="text-[11px] font-medium shrink-0" style={{ color: '#64748B' }}>
                        {doneCount} of {totalChildren} · {progressPct}% Done
                      </span>
                    </div>

                    {/* Grid header */}
                    <div
                      className="grid gap-2 px-2 py-1.5"
                      style={{
                        gridTemplateColumns: '1fr 80px 100px 90px',
                        fontSize: 11, fontWeight: 600, color: '#626F86',
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                        borderBottom: '2px solid #E2E8F0',
                      }}
                    >
                      <span>Work</span>
                      <span>Priority</span>
                      <span>Assignee</span>
                      <span>Status</span>
                    </div>

                    {/* Subtask rows */}
                    {item.children.map(child => (
                      <SubtaskRow
                        key={child.id}
                        child={child}
                        statuses={statuses}
                        onStatusChange={(statusId) => {
                          updateWorkItem(child.id, { status_id: statusId }).then(invalidate);
                        }}
                        onClick={() => onNavigate?.(child.id)}
                      />
                    ))}
                  </>
                )}

                {/* Quick create */}
                {creatingSubtask ? (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      autoFocus
                      value={subtaskTitle}
                      onChange={e => setSubtaskTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleCreateSubtask(); if (e.key === 'Escape') { setCreatingSubtask(false); setSubtaskTitle(''); } }}
                      placeholder="Subtask title..."
                      className="flex-1 text-[13px] px-2.5 py-1.5 rounded border focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                      style={{ borderColor: '#E2E8F0', height: 32 }}
                    />
                    <button
                      onClick={handleCreateSubtask}
                      disabled={subtaskSubmitting}
                      className="px-3 py-1 text-[11px] font-semibold rounded text-white"
                      style={{ background: '#2563EB', height: 32 }}
                    >
                      {subtaskSubmitting ? '…' : 'Create'}
                    </button>
                    <button
                      onClick={() => { setCreatingSubtask(false); setSubtaskTitle(''); }}
                      className="px-2 py-1 text-[11px] font-medium rounded hover:bg-[#F1F5F9]"
                      style={{ color: '#64748B', height: 32 }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setCreatingSubtask(true)}
                    className="flex items-center gap-1.5 mt-2 text-[11px] font-medium hover:bg-[#F8FAFC] px-2 py-1.5 rounded transition-colors"
                    style={{ color: '#94A3B8' }}
                  >
                    <Plus size={13} /> Create subtask
                  </button>
                )}
              </CollapsibleSection>

              {/* Attachments */}
              <AttachmentsSection workItemId={item.id} projectId={projectId} />

              {/* Linked Work Items */}
              <LinkedItemsSection
                workItemId={item.id}
                projectId={projectId}
                linkedItems={item.linked_items}
                onNavigate={onNavigate}
                onInvalidate={invalidate}
              />

              {/* Activity Feed */}
              <ActivityFeed workItemId={item.id} />
            </div>

            {/* ─── Right Sidebar ─────────────────────── */}
            <DetailRightSidebar
              item={item}
              projectId={projectId}
              statuses={statuses}
              onInvalidate={invalidate}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Subtask Row ─────────────────────────────────────────
function SubtaskRow({ child, statuses, onStatusChange, onClick }: {
  child: ChildItem;
  statuses: { id: string; name: string; category: string }[];
  onStatusChange: (statusId: string) => void;
  onClick: () => void;
}) {
  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Cycle to next status
    const idx = statuses.findIndex(s => s.id === child.status_id);
    const next = statuses[(idx + 1) % statuses.length];
    if (next) onStatusChange(next.id);
  };

  return (
    <div
      className="grid gap-2 px-2 py-2 hover:bg-[#F8FAFC] rounded cursor-pointer transition-colors"
      style={{ gridTemplateColumns: '1fr 80px 100px 90px', fontSize: 13 }}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: TYPE_COLORS[child.type_name] || child.type_color }} />
        <span className="text-[10px] shrink-0" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#64748B' }}>{child.item_key}</span>
        <span className="truncate font-medium" style={{ color: '#0F172A' }}>{child.title}</span>
      </div>
      <span className="text-[12px]" style={{ color: '#475569' }}>{child.priority}</span>
      <span className="text-[12px] truncate" style={{ color: '#475569' }}>{child.assignee_name || '—'}</span>
      <button onClick={handleStatusClick}>
        <StatusLozenge name={child.status_name} category={child.status_category} />
      </button>
    </div>
  );
}

// ─── Mini Avatar ─────────────────────────────────────────
function MiniAvatar({ name }: { name: string }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const colors = ['#2563EB', '#0D9488', '#7C3AED', '#D97706', '#DC2626', '#16A34A'];
  return (
    <div
      className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0"
      style={{ background: colors[Math.abs(hash) % colors.length] }}
    >
      {initials}
    </div>
  );
}

