import React, { useState, useEffect } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { updateWorkItem, createWorkItem } from '@/services/workItemService';
import { CollapsibleSection } from './detail/CollapsibleSection';
import { StatusLozenge } from './detail/StatusLozenge';
import { ActivityFeed } from './detail/ActivityFeed';
import { AttachmentsSection } from './detail/AttachmentsSection';
import { LinkedItemsSection } from './detail/LinkedItemsSection';
import { DetailRightSidebar } from './detail/DetailRightSidebar';
import { useWorkItemDetail, type ChildItem } from '@/hooks/useWorkItemDetail';
import {
  X, Copy, Bookmark, Eye, Zap, Layers, Bug, CheckSquare, CornerDownRight,
  Flag, Plus, MoreHorizontal, Share2, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

const TYPE_COLORS: Record<string, string> = {
  Epic: '#7C3AED', Feature: 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))', Story: '#0D9488',
  Bug: 'var(--ds-text-danger, var(--ds-text-danger, #DC2626))', Task: 'var(--ds-text-warning, var(--ds-text-warning, #D97706))', Subtask: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #94A3B8))',
};
const TYPE_ICONS: Record<string, React.ReactNode> = {
  Epic: <Zap size={18} />, Feature: <Layers size={18} />,
  Story: <Bookmark size={18} />, Bug: <Bug size={18} />,
  Task: <CheckSquare size={18} />, Subtask: <CornerDownRight size={18} />,
};

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

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [creatingSubtask, setCreatingSubtask] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [subtaskSubmitting, setSubtaskSubmitting] = useState(false);
  const [newCriterion, setNewCriterion] = useState('');

  const [statuses, setStatuses] = useState<{ id: string; name: string; category: string }[]>([]);
  const [workTypes, setWorkTypes] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!projectId) return;
    supabase.from('ph_workflow_statuses').select('id, name, category').eq('project_id', projectId).order('position').then(({ data }) => setStatuses(data || []));
    supabase.from('ph_work_types').select('id, name').eq('project_id', projectId).eq('is_enabled', true).order('position').then(({ data }) => setWorkTypes(data || []));
  }, [projectId]);

  const { data: acceptanceCriteria = [], refetch: refetchAC } = useQuery({
    queryKey: ['ph-acceptance-criteria', itemId],
    queryFn: async () => {
      if (!itemId) return [];
      const { data } = await supabase.from('ph_acceptance_criteria').select('*').eq('work_item_id', itemId).order('sort_order');
      return data || [];
    },
    enabled: !!itemId && open,
  });

  if (!open) return null;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['ph-work-item-detail', itemId] });
    queryClient.invalidateQueries({ queryKey: ['ph-work-items', projectId] });
  };

  const handleSaveTitle = async () => {
    if (!item || !titleDraft.trim() || titleDraft.trim() === item.title) { setEditingTitle(false); return; }
    try { await updateWorkItem(item.id, { title: titleDraft.trim(), summary: titleDraft.trim() }); invalidate(); toast.success('Title updated'); } catch (e: any) { toast.error(e.message); }
    setEditingTitle(false);
  };

  const handleUpdateField = async (field: string, value: any) => {
    if (!item) return;
    try { await updateWorkItem(item.id, { [field]: value }); invalidate(); } catch (e: any) { toast.error(e.message); }
  };

  const handleCreateSubtask = async () => {
    if (!subtaskTitle.trim() || subtaskSubmitting) return;
    setSubtaskSubmitting(true);
    try {
      const subtaskType = workTypes.find(t => t.name === 'Subtask') || workTypes[workTypes.length - 1];
      const defaultStatus = statuses[0];
      if (!subtaskType || !defaultStatus) throw new Error('Missing type/status config');
      await createWorkItem({ project_id: projectId, type_id: subtaskType.id, status_id: defaultStatus.id, title: subtaskTitle.trim(), item_type: 'Subtask', parent_id: item!.id, priority: 'Medium' });
      invalidate(); setSubtaskTitle(''); setCreatingSubtask(false); toast.success('Subtask created');
    } catch (e: any) { toast.error(e.message); } finally { setSubtaskSubmitting(false); }
  };

  const handleAddCriterion = async () => {
    if (!newCriterion.trim() || !item) return;
    await supabase.from('ph_acceptance_criteria').insert({ work_item_id: item.id, title: newCriterion.trim(), is_checked: false, sort_order: acceptanceCriteria.length });
    setNewCriterion(''); refetchAC();
  };

  const handleToggleCriterion = async (id: string, isChecked: boolean) => {
    await supabase.from('ph_acceptance_criteria').update({ is_checked: !isChecked }).eq('id', id);
    refetchAC();
  };

  const handleCopyKey = () => { if (item) { navigator.clipboard.writeText(item.item_key); toast.success(`Copied ${item.item_key}`); } };

  const typeColor = item ? (TYPE_COLORS[item.type_name] || item.type_color) : 'var(--ds-text-subtlest, var(--ds-text-subtlest, #94A3B8))';
  const doneCount = item?.children?.filter(c => c.status_category === 'done').length ?? 0;
  const totalChildren = item?.children?.length ?? 0;
  const progressPct = totalChildren > 0 ? Math.round((doneCount / totalChildren) * 100) : 0;
  const isEpic = item?.type_name === 'Epic' || item?.type_level === 'epic';
  const showParentBreadcrumb = !!item?.parent_id && !!item?.parent_key && !isEpic;

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 200, fontFamily: 'var(--cp-font-body)' }} onClick={onClose}>
      <div className="absolute inset-0 bg-[rgba(9,30,66,0.54)]" />
      <div
        className="relative flex flex-col bg-[var(--cp-float)]"
        style={{ width: 960, maxHeight: '90vh', borderRadius: 12, boxShadow: '0 0 0 1px rgba(9,30,66,0.08), 0 2px 1px rgba(9,30,66,0.08), 0 0 20px -6px rgba(9,30,66,0.31)', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 shrink-0" style={{ borderBottom: '1px solid var(--divider)', height: 52 }}>
          <div className="flex items-center gap-2.5 min-w-0">
            <span style={{ color: typeColor }}>{TYPE_ICONS[item?.type_name ?? ''] || <CheckSquare size={18} />}</span>
            <span className="text-[13px] shrink-0" style={{ fontFamily: 'var(--cp-font-mono)', color: 'var(--fg-3)' }}>{item?.item_key ?? '…'}</span>
            {item?.is_flagged && <Flag size={13} style={{ color: 'var(--sem-danger)' }} />}
          </div>
          <div className="flex items-center gap-0.5">
            <HeaderBtn title="Watchers"><Eye size={15} /></HeaderBtn>
            <HeaderBtn title="Bookmark"><Bookmark size={15} /></HeaderBtn>
            <HeaderBtn title="Copy key" onClick={handleCopyKey}><Copy size={15} /></HeaderBtn>
            <HeaderBtn title="Share"><Share2 size={15} /></HeaderBtn>
            <HeaderBtn title="More"><MoreHorizontal size={15} /></HeaderBtn>
            <HeaderBtn title="Close" onClick={onClose}><X size={16} /></HeaderBtn>
          </div>
        </div>

        {isLoading || !item ? (
          <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-[var(--ds-text-brand,var(--ds-text-brand, #2563EB))]" /></div>
        ) : (
          <div className="flex flex-1 overflow-hidden">
            {/* LEFT PANEL */}
            <div className="flex-1 overflow-y-auto" style={{ padding: '0 24px 80px' }}>
              {/* Title */}
              <div className="pt-5 pb-2">
                {editingTitle ? (
                  <input autoFocus value={titleDraft} onChange={e => setTitleDraft(e.target.value)} onBlur={handleSaveTitle}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
                    className="w-full text-[22px] font-semibold px-1 py-0.5 rounded"
                    style={{ fontFamily: 'var(--cp-font-heading)', color: 'var(--fg-1)', lineHeight: '30px', border: '2px solid var(--cp-blue)', outline: 'none' }}
                  />
                ) : (
                  <h2 className="text-[22px] font-semibold cursor-text rounded px-1 py-0.5 border-2 border-transparent hover:border-[var(--bd-default, #E2E8F0)] transition-colors"
                    style={{ fontFamily: 'var(--cp-font-heading)', color: 'var(--fg-1)', lineHeight: '30px' }}
                    onClick={() => { setTitleDraft(item.title); setEditingTitle(true); }}
                  >{item.title}</h2>
                )}
              </div>

              {/* Parent breadcrumb */}
              {showParentBreadcrumb && (
                <div className="mb-4">
                  <button className="flex items-center gap-2 px-3 py-2 rounded-md w-full text-left transition-colors bg-[var(--bg-1)]" style={{ border: '1px solid var(--divider)' }} onClick={() => onNavigate?.(item.parent_id!)}>
                    <span style={{ color: item.parent_type_color || 'var(--fg-4)' }}>{TYPE_ICONS[item.parent_type_name ?? ''] || <CheckSquare size={14} />}</span>
                    <span className="text-[11px] shrink-0" style={{ fontFamily: 'var(--cp-font-mono)', color: 'var(--fg-3)' }}>{item.parent_key}</span>
                    <span className="text-[13px] font-medium truncate" style={{ color: 'var(--fg-1)' }}>{item.parent_title}</span>
                    {item.parent_status_name && <StatusLozenge name={item.parent_status_name} category={item.parent_status_category || 'todo'} />}
                  </button>
                </div>
              )}

              {/* Key Details — dates only (status/priority/assignee/reporter moved to sidebar) */}
              <CollapsibleSection title="Key Details" defaultOpen={true}>
                <div className="grid gap-y-3 gap-x-4" style={{ gridTemplateColumns: '110px 1fr' }}>
                  <FieldLabel>Start Date</FieldLabel>
                  <span className="text-[13px]" style={{ fontFamily: 'var(--cp-font-mono)', color: item.start_date ? 'var(--fg-2)' : 'var(--fg-4)' }}>
                    {item.start_date ? new Date(item.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'None'}
                  </span>
                  <FieldLabel>Due Date</FieldLabel>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px]" style={{ fontFamily: 'var(--cp-font-mono)', color: item.due_date && new Date(item.due_date) < new Date() ? 'var(--sem-danger)' : 'var(--fg-2)' }}>
                      {item.due_date ? new Date(item.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : <span style={{ color: 'var(--fg-4)' }}>None</span>}
                    </span>
                    {item.due_date && new Date(item.due_date) < new Date() && (
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-[var(--sem-danger-bg)]" style={{ color: 'var(--sem-danger)' }}>Overdue</span>
                    )}
                  </div>
                </div>
              </CollapsibleSection>

              {/* Description */}
              <CollapsibleSection title="Description" defaultOpen={true}>
                <div className="rounded-md px-3 py-2 min-h-[60px] border border-transparent hover:border-[var(--ds-border,var(--ds-border, #DFE1E6))] cursor-text transition-colors" style={{ fontSize: 14, lineHeight: '22px', color: item.description ? 'var(--fg-1)' : 'var(--fg-4)' }}>
                  {item.description || 'Add a description...'}
                </div>
              </CollapsibleSection>

              {/* Acceptance Criteria */}
              <CollapsibleSection title="Acceptance Criteria" count={acceptanceCriteria.length} defaultOpen={acceptanceCriteria.length > 0}>
                {acceptanceCriteria.map((ac: any) => (
                  <div key={ac.id} className="flex items-start gap-2 py-1.5 group">
                    <button onClick={() => handleToggleCriterion(ac.id, ac.is_checked)}
                      className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${ac.is_checked ? 'bg-[var(--sem-success)]' : 'bg-transparent'}`}
                      style={{ borderColor: ac.is_checked ? 'var(--sem-success)' : 'var(--divider)' }}>
                      {ac.is_checked && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </button>
                    <span className="text-[13px]" style={{ color: ac.is_checked ? 'var(--fg-4)' : 'var(--fg-1)', textDecoration: ac.is_checked ? 'line-through' : 'none', lineHeight: '20px' }}>{ac.title}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 mt-1">
                  <input value={newCriterion} onChange={e => setNewCriterion(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleAddCriterion(); }}
                    placeholder="+ Add acceptance criterion" className="flex-1 text-[13px] px-2 py-1.5 rounded border border-transparent hover:border-[var(--divider)] focus:border-[var(--cp-blue)] focus:outline-none transition-colors" style={{ color: 'var(--fg-2)', background: 'transparent' }} />
                </div>
              </CollapsibleSection>

              {/* Attachments */}
              <AttachmentsSection workItemId={item.id} projectId={projectId} />

              {/* Subtasks */}
              <CollapsibleSection title="Subtasks" count={totalChildren} defaultOpen={totalChildren > 0}>
                {totalChildren > 0 && (
                  <>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-[var(--divider)]">
                        <div className="h-full rounded-full transition-all bg-[var(--sem-success)]" style={{ width: `${progressPct}%` }} />
                      </div>
                      <span className="text-[11px] font-medium shrink-0" style={{ color: 'var(--fg-3)' }}>{doneCount}/{totalChildren} · {progressPct}%</span>
                    </div>
                    <div className="grid gap-2 px-2 py-1.5" style={{ gridTemplateColumns: '1fr 80px 100px 90px', fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '2px solid var(--divider)' }}>
                      <span>Work</span><span>Priority</span><span>Assignee</span><span>Status</span>
                    </div>
                    {item.children.map(child => (
                      <SubtaskRow key={child.id} child={child} statuses={statuses}
                        onStatusChange={statusId => { updateWorkItem(child.id, { status_id: statusId }).then(invalidate); }}
                        onClick={() => onNavigate?.(child.id)} />
                    ))}
                  </>
                )}
                {creatingSubtask ? (
                  <div className="flex items-center gap-2 mt-2">
                    <input autoFocus value={subtaskTitle} onChange={e => setSubtaskTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleCreateSubtask(); if (e.key === 'Escape') { setCreatingSubtask(false); setSubtaskTitle(''); } }}
                      placeholder="Subtask title..." className="flex-1 text-[13px] px-2.5 py-1.5 rounded border focus:outline-none focus:ring-1 focus:ring-[var(--cp-blue)]" style={{ borderColor: 'var(--divider)', height: 32 }} />
                    <button onClick={handleCreateSubtask} disabled={subtaskSubmitting} className="px-3 py-1 text-[11px] font-semibold rounded text-white bg-[var(--cp-blue)]" style={{ height: 32 }}>{subtaskSubmitting ? '…' : 'Create'}</button>
                    <button onClick={() => { setCreatingSubtask(false); setSubtaskTitle(''); }} className="px-2 py-1 text-[11px] font-medium rounded hover:bg-[var(--cp-bd-zone)]" style={{ color: 'var(--fg-3)', height: 32 }}>Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setCreatingSubtask(true)} className="flex items-center gap-1.5 mt-2 text-[11px] font-medium hover:bg-[var(--bg-1)] px-2 py-1.5 rounded transition-colors" style={{ color: 'var(--fg-4)' }}>
                    <Plus size={13} /> Create subtask
                  </button>
                )}
              </CollapsibleSection>

              {/* Linked Work Items */}
              <LinkedItemsSection workItemId={item.id} projectId={projectId} linkedItems={item.linked_items} onNavigate={onNavigate} onInvalidate={invalidate} />

              {/* Activity Feed */}
              <ActivityFeed workItemId={item.id} />
            </div>

            {/* RIGHT SIDEBAR */}
            <DetailRightSidebar
              item={item as any}
              statuses={statuses}
              onUpdate={handleUpdateField}
              onInvalidate={invalidate}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Primitives ─────────────────────────────────────────
function HeaderBtn({ title, onClick, children }: { title: string; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-[var(--cp-bd-zone)] transition-colors" title={title} style={{ color: 'var(--fg-4)' }}>
      {children}
    </button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-[12px] font-medium self-center" style={{ color: 'var(--fg-2)' }}>{children}</span>;
}

function SubtaskRow({ child, statuses, onStatusChange, onClick }: { child: ChildItem; statuses: { id: string; name: string; category: string }[]; onStatusChange: (id: string) => void; onClick: () => void }) {
  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const idx = statuses.findIndex(s => s.id === child.status_id);
    const next = statuses[(idx + 1) % statuses.length];
    if (next) onStatusChange(next.id);
  };
  const TYPE_COLORS: Record<string, string> = { Epic: '#7C3AED', Feature: 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))', Story: '#0D9488', Bug: 'var(--ds-text-danger, var(--ds-text-danger, #DC2626))', Task: 'var(--ds-text-warning, var(--ds-text-warning, #D97706))', Subtask: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #94A3B8))' };
  return (
    <div className="grid gap-2 px-2 py-2 hover:bg-[var(--bg-1)] rounded cursor-pointer transition-colors" style={{ gridTemplateColumns: '1fr 80px 100px 90px', fontSize: 13 }} onClick={onClick}>
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: TYPE_COLORS[child.type_name] || child.type_color }} />
        <span className="text-[10px] shrink-0" style={{ fontFamily: 'var(--cp-font-mono)', color: 'var(--fg-3)' }}>{child.item_key}</span>
        <span className="truncate font-medium" style={{ color: 'var(--fg-1)' }}>{child.title}</span>
      </div>
      <span className="text-[12px]" style={{ color: 'var(--fg-2)' }}>{child.priority}</span>
      <span className="text-[12px] truncate" style={{ color: 'var(--fg-2)' }}>{child.assignee_name || '—'}</span>
      <button onClick={handleStatusClick}><StatusLozenge name={child.status_name} category={child.status_category} /></button>
    </div>
  );
}
