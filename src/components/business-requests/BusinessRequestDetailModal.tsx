/**
 * BusinessRequestDetailModal — Two-column modal matching StoryDetailModal V15
 * Replaces the old BusinessRequestDrawer (Sheet/tab-based layout)
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  X, ChevronDown, ChevronRight, Plus, Paperclip,
  Share2, Search, Link2, Trash2, Check,
  Sparkles, Loader2, MoreHorizontal, Copy,
  Globe, Pencil, Lock,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useBusinessRequest, useUpdateBusinessRequest, useDeleteBusinessRequest, useDuplicateBusinessRequest } from '@/hooks/useBusinessRequests';
import { useCatalystWorkflow, type WorkflowStatus } from '@/hooks/useCatalystWorkflow';
import { BusinessRequest } from '@/types/business-request';
import { WorkItemStarButton } from '@/components/shared/WorkItemStarButton';
import { RichTextEditor } from './RichTextEditor';
import { DepartmentSelect } from './DepartmentSelect';
import { UserSelect } from './UserSelect';
import { useDepartments, useBusinessOwners, useDepartmentOwnerMappings, getOwnerIdForDepartment } from '@/hooks/useDepartmentsAndOwners';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

// Accordion sections
import { ScoringAccordion } from './detail-sections/ScoringAccordion';
import { BudgetAccordion } from './detail-sections/BudgetAccordion';
import { MilestonesAccordion } from './detail-sections/MilestonesAccordion';
import { RisksAccordion } from './detail-sections/RisksAccordion';
import { BRLinkedIssuesSection } from './detail-sections/BRLinkedIssuesSection';
import { BRActivitySection } from './detail-sections/BRActivitySection';

// ── Animations ──
const ANIM_STYLE_ID = 'br-modal-anims';
if (typeof document !== 'undefined' && !document.getElementById(ANIM_STYLE_ID)) {
  const s = document.createElement('style');
  s.id = ANIM_STYLE_ID;
  s.textContent = `
    @keyframes brm-overlay-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes brm-card-in { from { opacity: 0; transform: scale(0.97) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    @keyframes brm-slide-down { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
  `;
  document.head.appendChild(s);
}

// ── Constants ──
const AUTO_SAVE_DELAY = 800;

const QUARTER_OPTIONS = [
  'Q4-2025', 'Q1-2026', 'Q2-2026', 'Q3-2026', 'Q4-2026',
  'Q1-2027', 'Q2-2027', 'Q3-2027', 'Q4-2027',
];

const AUDIT_FIELD_LABELS: Record<string, string> = {
  title: 'Title', description: 'Description', process_step: 'Status',
  department: 'Department', business_owner: 'Business Owner', requestor: 'Requestor',
  assignee: 'Assignee', delivery_platform: 'Delivery Platform', delivery_track: 'Delivery Track',
  planned_quarter: 'Planned Quarter', urgency: 'Urgency', complexity: 'Complexity',
  risk_rating: 'Risk Rating', estimated_effort: 'Estimated Effort', estimated_cost: 'Estimated Cost',
  start_date: 'Start Date', end_date: 'End Date', health: 'Health',
  acceptance_criteria: 'Acceptance Criteria',
};

// ── Helpers ──
function fmtDate(d?: string | null): string {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd MMM yyyy'); } catch { return d; }
}

function getInitials(name?: string | null): string {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

async function logFieldChanges(
  requestId: string,
  oldData: Record<string, any>,
  newData: Record<string, any>,
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user?.id).single();
    const actorName = profile?.full_name || user?.email || 'Unknown';
    const logs: any[] = [];
    for (const [field, label] of Object.entries(AUDIT_FIELD_LABELS)) {
      const oldVal = oldData[field] ?? null;
      const newVal = newData[field] ?? null;
      if (JSON.stringify(oldVal) === JSON.stringify(newVal)) continue;
      logs.push({
        business_request_id: requestId, actor_id: user?.id, actor_name: actorName,
        action: 'UPDATE', field_changed: label,
        old_value: oldVal == null ? 'None' : String(oldVal),
        new_value: newVal == null ? 'None' : String(newVal),
      });
    }
    if (logs.length > 0) await typedQuery('business_request_audit_logs').insert(logs);
  } catch (e) { console.error('Audit log failed:', e); }
}

// ── Status lozenge colors (3-color guardrail) ──
const STATUS_LOZENGE: Record<string, { bg: string; text: string }> = {
  todo: { bg: '#DFE1E6', text: '#253858' },
  in_progress: { bg: '#DEEBFF', text: '#0747A6' },
  done: { bg: '#E3FCEF', text: '#006644' },
};

// ── Props ──
interface BusinessRequestDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: string | null;
  onRequestChange?: (newRequestId: string) => void;
}

export function BusinessRequestDetailModal({ isOpen, onClose, requestId, onRequestChange }: BusinessRequestDetailModalProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: request, isLoading } = useBusinessRequest(requestId);
  const updateMutation = useUpdateBusinessRequest();
  const deleteMutation = useDeleteBusinessRequest();
  const duplicateMutation = useDuplicateBusinessRequest();

  // Workflow statuses from catalyst system
  const { statuses: workflowStatuses } = useCatalystWorkflow('Business Request');

  // Reference data
  const { data: departments } = useDepartments();
  const { data: owners } = useBusinessOwners();
  const { data: mappings } = useDepartmentOwnerMappings();

  // ── State ──
  const [formData, setFormData] = useState<Partial<BusinessRequest> & Record<string, any>>({});
  const [originalData, setOriginalData] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [titleFocused, setTitleFocused] = useState(false);
  const [descEditMode, setDescEditMode] = useState(false);
  const [acEditMode, setAcEditMode] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showDotsMenu, setShowDotsMenu] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [addMenuSearch, setAddMenuSearch] = useState('');

  // Resizable sidebar
  const [rightPanelWidth, setRightPanelWidth] = useState(300);
  const isDraggingRef = useRef(false);
  const splitterRef = useRef<HTMLDivElement>(null);

  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingChangesRef = useRef<Record<string, any>>({});
  const skipNextFormResetRef = useRef(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const dotsMenuRef = useRef<HTMLDivElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);

  // ── Resizable splitter ──
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const modal = document.querySelector('[data-brm-scope]') as HTMLElement;
      if (!modal) return;
      const rect = modal.getBoundingClientRect();
      setRightPanelWidth(Math.max(240, Math.min(480, rect.right - e.clientX)));
    };
    const onMouseUp = () => { isDraggingRef.current = false; document.body.style.cursor = ''; document.body.style.userSelect = ''; };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); };
  }, []);

  // Close menus on click outside
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) setShowStatusDropdown(false);
      if (dotsMenuRef.current && !dotsMenuRef.current.contains(e.target as Node)) setShowDotsMenu(false);
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) { setShowAddMenu(false); setAddMenuSearch(''); }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Sync form data when request changes
  useEffect(() => {
    if (request) {
      if (!skipNextFormResetRef.current) {
        setFormData(request);
        setOriginalData(request);
      } else {
        setOriginalData(request);
      }
      skipNextFormResetRef.current = false;
    }
  }, [request]);

  // Cleanup
  useEffect(() => () => { if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current); }, []);

  // ── Auto-save ──
  const performAutoSave = useCallback(async (dataToSave: Record<string, any>) => {
    if (!requestId) return;
    setIsSaving(true);
    try {
      await updateMutation.mutateAsync({ id: requestId, data: dataToSave as Partial<BusinessRequest> });
      await logFieldChanges(requestId, originalData, dataToSave);
      setOriginalData(dataToSave);
      skipNextFormResetRef.current = true;
      setShowSavedIndicator(true);
      setTimeout(() => setShowSavedIndicator(false), 2000);
      queryClient.invalidateQueries({ queryKey: ['business-requests'] });
      queryClient.invalidateQueries({ queryKey: ['business-request-audit', requestId] });
    } catch {
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  }, [requestId, originalData, updateMutation, queryClient]);

  const handleFieldChange = useCallback((field: string, value: any) => {
    setFormData(prev => {
      const newData = field === '_batch' && typeof value === 'object'
        ? { ...prev, ...value }
        : { ...prev, [field]: value };
      pendingChangesRef.current = newData;
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = setTimeout(() => performAutoSave(pendingChangesRef.current), AUTO_SAVE_DELAY);
      return newData;
    });
    skipNextFormResetRef.current = true;
  }, [performAutoSave]);

  const handleClose = () => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      if (Object.keys(pendingChangesRef.current).length > 0) performAutoSave(pendingChangesRef.current);
    }
    queryClient.invalidateQueries({ queryKey: ['business-requests'] });
    onClose();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/producthub?request=${requestId}`);
    toast.success('Link copied to clipboard');
  };

  const handleDuplicate = () => {
    if (requestId) {
      duplicateMutation.mutate(requestId, {
        onSuccess: (newReq) => {
          queryClient.invalidateQueries({ queryKey: ['business-requests'] });
          onRequestChange?.(newReq.id);
        },
      });
    }
  };

  const handleConfirmDelete = () => {
    if (requestId) {
      deleteMutation.mutate(requestId, {
        onSuccess: () => {
          setShowDeleteConfirm(false);
          queryClient.invalidateQueries({ queryKey: ['business-requests'] });
          onClose();
        },
      });
    }
  };

  // Department change with auto business owner
  const handleDepartmentChange = (departmentId: string) => {
    const dept = departments?.find(d => d.id === departmentId);
    const updates: Record<string, any> = { department_id: departmentId, department: dept?.name || null };
    if (mappings) {
      const ownerId = getOwnerIdForDepartment(departmentId, mappings);
      if (ownerId) {
        const owner = owners?.find(o => o.id === ownerId);
        updates.business_owner_id = ownerId;
        updates.business_owner = owner?.name || null;
      }
    }
    handleFieldChange('_batch', updates);
  };

  const handleDateChange = (field: string) => (date: Date | undefined) => {
    const val = date ? format(date, 'yyyy-MM-dd') : null;
    if (field === 'impl_target_end_date') {
      handleFieldChange('_batch', { impl_target_end_date: val, end_date: val });
    } else {
      handleFieldChange(field, val);
    }
  };

  // ── Resolved values ──
  const currentProcessStep = formData.process_step || 'new_request';
  const currentWorkflowStatus = workflowStatuses.find(s => s.slug === currentProcessStep);
  const statusCategory = currentWorkflowStatus?.category || 'todo';
  const statusStyle = STATUS_LOZENGE[statusCategory] || STATUS_LOZENGE.todo;
  const businessOwnerName = formData.business_owner || owners?.find(o => o.id === formData.business_owner_id)?.name;

  // Fetch reporter profile
  const { data: reporterProfile } = useQuery({
    queryKey: ['profile', formData.requestor],
    queryFn: async () => {
      if (!formData.requestor || !formData.requestor.includes('-')) return null;
      const { data } = await supabase.from('profiles').select('id, full_name, email').eq('id', formData.requestor).single();
      return data;
    },
    enabled: !!formData.requestor && formData.requestor?.includes('-'),
    staleTime: 300_000,
  });
  const reporterName = formData.requestor_name || reporterProfile?.full_name || reporterProfile?.email;

  // Group statuses by category for dropdown
  const statusGroups = useMemo(() => {
    const groups: { category: string; label: string; statuses: WorkflowStatus[] }[] = [
      { category: 'todo', label: 'TO DO', statuses: [] },
      { category: 'in_progress', label: 'IN PROGRESS', statuses: [] },
      { category: 'done', label: 'DONE', statuses: [] },
    ];
    workflowStatuses.forEach(s => {
      const g = groups.find(g => g.category === s.category);
      if (g) g.statuses.push(s);
    });
    return groups.filter(g => g.statuses.length > 0);
  }, [workflowStatuses]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(9,30,66,0.54)',
          animation: 'brm-overlay-in 200ms ease-out',
        }}
      />

      {/* Modal */}
      <div
        data-brm-scope
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24, pointerEvents: 'none',
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            pointerEvents: 'auto',
            width: '100%', maxWidth: 1200, height: '90vh',
            background: '#FFFFFF', borderRadius: 8,
            boxShadow: '0 20px 60px rgba(9,30,66,0.3), 0 0 1px rgba(9,30,66,0.4)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            animation: 'brm-card-in 250ms ease-out',
          }}
        >
          {/* ═══ TOP BAR ═══ */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 16px', borderBottom: '1px solid #EBECF0', flexShrink: 0,
            minHeight: 44,
          }}>
            {/* Left — breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, color: '#6B778C' }}>Product Backlog</span>
              <span style={{ fontSize: 13, color: '#C1C7D0' }}>/</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0052CC', fontFamily: "'JetBrains Mono', monospace" }}>
                {request?.request_key || '...'}
              </span>
            </div>

            {/* Right — actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {/* Save indicator */}
              <div style={{ minWidth: 70, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                {isSaving && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#6B778C' }}>
                    <Loader2 size={12} className="animate-spin" /> Saving...
                  </span>
                )}
                {!isSaving && showSavedIndicator && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#006644' }}>
                    <Check size={12} /> Saved
                  </span>
                )}
              </div>

              {/* Share */}
              <button onClick={handleCopyLink} style={topBarBtnStyle} title="Copy link">
                <Share2 size={16} />
              </button>

              {/* Star */}
              {requestId && <WorkItemStarButton itemId={requestId} itemType="business_request" size="md" />}

              {/* Dots menu */}
              <div ref={dotsMenuRef} style={{ position: 'relative' }}>
                <button onClick={() => setShowDotsMenu(!showDotsMenu)} style={topBarBtnStyle}>
                  <MoreHorizontal size={16} />
                </button>
                {showDotsMenu && (
                  <div style={dropdownStyle}>
                    <button onClick={() => { setShowDotsMenu(false); handleDuplicate(); }} style={menuItemStyle}>
                      <Copy size={14} /> Duplicate
                    </button>
                    <div style={{ height: 1, background: '#EBECF0', margin: '4px 0' }} />
                    <button onClick={() => { setShowDotsMenu(false); setShowDeleteConfirm(true); }} style={{ ...menuItemStyle, color: '#DE350B' }}>
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                )}
              </div>

              {/* Close */}
              <button
                onClick={handleClose}
                style={topBarBtnStyle}
                onMouseEnter={e => { e.currentTarget.style.background = '#FFEBE6'; e.currentTarget.style.color = '#DE350B'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#42526E'; }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* ═══ BODY — two-column ═══ */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

            {/* LEFT PANEL */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '20px 24px 40px 24px',
              borderRight: '1px solid #EBECF0', minWidth: 0,
            }}>
              {isLoading ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#6B778C' }}>
                  <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                  Loading...
                </div>
              ) : (
                <>
                  {/* 1. TITLE */}
                  <h1
                    contentEditable suppressContentEditableWarning
                    onFocus={() => setTitleFocused(true)}
                    onBlur={e => {
                      setTitleFocused(false);
                      const newTitle = e.currentTarget.textContent?.trim() ?? '';
                      if (newTitle && newTitle !== request?.title) handleFieldChange('title', newTitle);
                    }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } if (e.key === 'Escape') { e.currentTarget.textContent = request?.title ?? ''; e.currentTarget.blur(); } }}
                    style={{
                      fontFamily: "'Sora', sans-serif", fontSize: 22, fontWeight: 700,
                      color: '#172B4D', lineHeight: 1.3, margin: '0 0 12px',
                      outline: 'none', cursor: 'text', borderRadius: 3,
                      padding: '4px 6px', wordBreak: 'break-word',
                      transition: 'background 0.15s, box-shadow 0.15s',
                      background: titleFocused ? '#FFFFFF' : 'transparent',
                      boxShadow: titleFocused ? '0 0 0 2px #4C9AFF' : 'none',
                    }}
                    onMouseEnter={e => { if (!titleFocused) e.currentTarget.style.background = '#F4F5F7'; }}
                    onMouseLeave={e => { if (!titleFocused) e.currentTarget.style.background = 'transparent'; }}
                  >
                    {request?.title ?? '—'}
                  </h1>

                  {/* 2. Quick actions */}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
                    <div ref={addMenuRef} style={{ position: 'relative' }}>
                      <button
                        onClick={() => setShowAddMenu(!showAddMenu)}
                        style={{
                          width: 28, height: 28, border: '1px solid #DFE1E6', background: '#FAFBFC',
                          borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#5E6C84', transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#EBECF0'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#FAFBFC'; }}
                      >
                        <Plus size={14} />
                      </button>
                      {showAddMenu && (
                        <div style={{ position: 'absolute', left: 0, top: 34, background: '#FFF', borderRadius: 4, boxShadow: '0 8px 12px rgba(30,31,33,0.15), 0 0 1px rgba(30,31,33,0.31)', width: 266, zIndex: 400, padding: 0 }}>
                          <div style={{ margin: '4px 8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', border: '0.556px solid rgb(140, 143, 151)', borderRadius: 3, padding: '1px 0' }}>
                              <Search size={14} style={{ marginLeft: 8 }} />
                              <input type="text" placeholder="Find menu item" value={addMenuSearch} onChange={e => setAddMenuSearch(e.target.value)} autoFocus
                                style={{ background: 'transparent', border: 'none', outline: 'none', padding: '4px 8px', fontSize: 14, width: '100%', height: 28 }} />
                            </div>
                          </div>
                          {[
                            { id: 'link', icon: <Link2 size={16} />, label: 'Link work item', action: () => { setShowAddMenu(false); setAddMenuSearch(''); const el = document.querySelector('[data-section="linked-issues"]'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } },
                            { id: 'attachment', icon: <Paperclip size={16} />, label: 'Add attachment', action: () => { setShowAddMenu(false); setAddMenuSearch(''); toast.info('Attachments — use the section below'); } },
                            { id: 'weblink', icon: <Globe size={16} />, label: 'Add web link', action: () => { setShowAddMenu(false); setAddMenuSearch(''); toast.info('Web link — coming soon'); } },
                          ].filter(i => !addMenuSearch || i.label.toLowerCase().includes(addMenuSearch.toLowerCase())).map(item => (
                            <button key={item.id} onClick={item.action}
                              style={{ display: 'flex', alignItems: 'center', height: 40, padding: '8px 16px', fontSize: 13, color: '#292A2E', background: 'transparent', border: 'none', cursor: 'pointer', width: '100%', gap: 8 }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(11,18,14,0.06)'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                            >
                              {item.icon} {item.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 3. Description */}
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#172B4D' }}>Description</span>
                      <button onClick={() => setDescEditMode(!descEditMode)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#0052CC' }}>
                        {descEditMode ? 'Done' : 'Edit'}
                      </button>
                    </div>
                    {descEditMode ? (
                      <RichTextEditor
                        value={formData.description || ''}
                        onChange={v => handleFieldChange('description', v)}
                        placeholder="Describe the demand in detail..."
                        minHeight="180px"
                      />
                    ) : (
                      <div
                        onClick={() => setDescEditMode(true)}
                        style={{
                          fontSize: 14, color: formData.description ? '#172B4D' : '#97A0AF',
                          lineHeight: 1.6, padding: '8px 10px', borderRadius: 4, cursor: 'pointer',
                          minHeight: 60, transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#F4F5F7'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                        dangerouslySetInnerHTML={{ __html: formData.description || 'Add a description...' }}
                      />
                    )}
                  </div>

                  {/* 4. Acceptance Criteria */}
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#172B4D' }}>Acceptance Criteria</span>
                      <button onClick={() => setAcEditMode(!acEditMode)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#0052CC' }}>
                        {acEditMode ? 'Done' : 'Edit'}
                      </button>
                    </div>
                    {acEditMode ? (
                      <RichTextEditor
                        value={formData.acceptance_criteria || ''}
                        onChange={v => handleFieldChange('acceptance_criteria', v)}
                        placeholder="Define acceptance criteria..."
                        minHeight="120px"
                      />
                    ) : (
                      <div
                        onClick={() => setAcEditMode(true)}
                        style={{
                          fontSize: 14, color: formData.acceptance_criteria ? '#172B4D' : '#97A0AF',
                          lineHeight: 1.6, padding: '8px 10px', borderRadius: 4, cursor: 'pointer',
                          minHeight: 40, transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#F4F5F7'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                        dangerouslySetInnerHTML={{ __html: formData.acceptance_criteria || 'Add acceptance criteria...' }}
                      />
                    )}
                  </div>

                  {/* 5. Linked Issues */}
                  {requestId && (
                    <BRLinkedIssuesSection requestId={requestId} />
                  )}

                  {/* 6. Scoring & Review + EA Review */}
                  <ScoringAccordion
                    data={formData}
                    onChange={handleFieldChange}
                    requestId={requestId || undefined}
                  />

                  {/* 7. Budget & Funding */}
                  <BudgetAccordion data={formData} onChange={handleFieldChange} />

                  {/* 8. Milestones */}
                  {requestId && <MilestonesAccordion requestId={requestId} />}

                  {/* 9. Risks */}
                  {requestId && <RisksAccordion requestId={requestId} />}

                  {/* 10. Activity */}
                  {requestId && <BRActivitySection requestId={requestId} />}
                </>
              )}
            </div>

            {/* RESIZABLE SPLITTER */}
            <div
              ref={splitterRef}
              onMouseDown={() => { isDraggingRef.current = true; document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'; }}
              style={{
                width: 6, minWidth: 6, cursor: 'col-resize', background: 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F4F5F7'; }}
              onMouseLeave={e => { if (!isDraggingRef.current) e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ width: 1.5, height: 32, borderRadius: 1, background: '#DFE1E6' }} />
            </div>

            {/* RIGHT PANEL — Sidebar */}
            <div style={{
              width: rightPanelWidth, minWidth: 240, maxWidth: 480,
              background: '#FFFFFF', overflowY: 'auto', overflowX: 'hidden',
              display: 'flex', flexDirection: 'column', padding: '16px 16px 32px 16px',
            }}>
              {/* Status */}
              <div style={{ marginBottom: 16 }} ref={statusDropdownRef}>
                <div style={{ position: 'relative' }}>
                  <button onClick={() => setShowStatusDropdown(!showStatusDropdown)} style={{
                    backgroundColor: statusStyle.bg, color: statusStyle.text,
                    padding: '6px 12px', borderRadius: 4, fontSize: 13, fontWeight: 700,
                    border: 'none', cursor: 'pointer', display: 'inline-flex',
                    alignItems: 'center', gap: 6, lineHeight: 1, textTransform: 'uppercase',
                    letterSpacing: '0.03em', transition: 'opacity 0.15s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                  >
                    {currentWorkflowStatus?.name?.toUpperCase() || currentProcessStep.replace(/_/g, ' ').toUpperCase()}
                    <ChevronDown size={12} />
                  </button>
                  {showStatusDropdown && (
                    <div style={{
                      position: 'absolute', left: 0, top: '100%', marginTop: 4,
                      background: '#FFFFFF', borderRadius: 4,
                      boxShadow: '0 8px 12px rgba(30,31,33,0.15), 0 0 1px rgba(30,31,33,0.31)',
                      padding: '4px 0', zIndex: 9999, minWidth: 220, maxHeight: 340, overflowY: 'auto',
                      animation: 'brm-slide-down 0.15s ease-out',
                    }}>
                      {statusGroups.map(group => (
                        <div key={group.category}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#6B778C', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '8px 12px 4px', marginTop: 4 }}>
                            {group.label}
                          </div>
                          {group.statuses.map(st => {
                            const isActive = st.slug === currentProcessStep;
                            const loz = STATUS_LOZENGE[st.category] || STATUS_LOZENGE.todo;
                            return (
                              <div key={st.id} onClick={() => {
                                handleFieldChange('process_step', st.slug);
                                setShowStatusDropdown(false);
                              }}
                                style={{
                                  height: 36, padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                  cursor: 'pointer', background: isActive ? '#DEEBFF' : 'transparent', transition: 'background 80ms',
                                }}
                                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#F4F5F7'; }}
                                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = isActive ? '#DEEBFF' : 'transparent'; }}
                              >
                                <span style={{ ...loz, display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 6px', borderRadius: 3, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                  {st.name}
                                </span>
                                {isActive && <Check size={14} color="#0052CC" />}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Details section */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <ChevronDown size={14} color="#42526E" />
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#172B4D' }}>Details</span>
                </div>

                {/* Priority */}
                <SidebarField label="Priority">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px' }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: formData.priority_tier === 'high' ? '#DE350B' : formData.priority_tier === 'medium' ? '#FF991F' : formData.priority_tier === 'low' ? '#36B37E' : '#97A0AF',
                    }} />
                    <span style={{ fontSize: 14, color: '#172B4D' }}>
                      {formData.priority_tier ? formData.priority_tier.charAt(0).toUpperCase() + formData.priority_tier.slice(1) : 'Unscored'}
                    </span>
                    <Lock size={12} color="#97A0AF" />
                  </div>
                </SidebarField>

                {/* Rank */}
                {formData.rank && (
                  <SidebarField label="Rank">
                    <span style={{ fontSize: 14, color: '#172B4D', fontWeight: 600, padding: '4px 6px' }}>
                      #{formData.rank}
                    </span>
                  </SidebarField>
                )}

                {/* Assignee */}
                <SidebarField label="Assignee">
                  <UserSelect
                    value={formData.assignee || null}
                    onChange={(userId) => handleFieldChange('assignee', userId)}
                    placeholder="Unassigned"
                  />
                </SidebarField>

                {/* Reporter */}
                <SidebarField label="Reporter">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px' }}>
                    {reporterName ? (
                      <>
                        <Avatar className="h-6 w-6">
                          <AvatarFallback style={{ background: '#0052CC', color: '#FFF', fontSize: 10, fontWeight: 700 }}>
                            {getInitials(reporterName)}
                          </AvatarFallback>
                        </Avatar>
                        <span style={{ fontSize: 14, color: '#172B4D' }}>{reporterName}</span>
                      </>
                    ) : <span style={{ color: '#6B778C', fontSize: 14 }}>—</span>}
                  </div>
                </SidebarField>

                {/* Business Owner */}
                <SidebarField label="Business Owner">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px' }}>
                    {businessOwnerName ? (
                      <>
                        <Avatar className="h-6 w-6">
                          <AvatarFallback style={{ background: '#6554C0', color: '#FFF', fontSize: 10, fontWeight: 700 }}>
                            {getInitials(businessOwnerName)}
                          </AvatarFallback>
                        </Avatar>
                        <span style={{ fontSize: 14, color: '#172B4D' }}>{businessOwnerName}</span>
                      </>
                    ) : <span style={{ color: '#6B778C', fontSize: 14 }}>Auto-assigned</span>}
                  </div>
                </SidebarField>

                {/* Department */}
                <SidebarField label="Department">
                  <DepartmentSelect
                    value={formData.department_id || null}
                    onChange={handleDepartmentChange}
                    placeholder="Select department"
                    className="h-8 text-sm"
                  />
                </SidebarField>

                {/* Delivery Platform */}
                <SidebarField label="Platform">
                  <Select value={formData.delivery_platform || ''} onValueChange={v => handleFieldChange('delivery_platform', v)}>
                    <SelectTrigger className="h-8 text-sm border-none shadow-none"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent className="z-[10000]">
                      {['SAP', 'ServiceNow', 'Salesforce', 'Custom', 'Other'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </SidebarField>

                {/* Delivery Track */}
                <SidebarField label="Track">
                  <Select value={formData.delivery_track || ''} onValueChange={v => handleFieldChange('delivery_track', v)}>
                    <SelectTrigger className="h-8 text-sm border-none shadow-none"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent className="z-[10000]">
                      {['Internal', 'External', 'Co-sourced', 'Vendor'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </SidebarField>

                {/* Complexity */}
                <SidebarField label="Complexity">
                  <Select value={formData.complexity || ''} onValueChange={v => handleFieldChange('complexity', v)}>
                    <SelectTrigger className="h-8 text-sm border-none shadow-none"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent className="z-[10000]">
                      {['Low', 'Medium', 'High', 'Very High'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </SidebarField>

                {/* Urgency */}
                <SidebarField label="Urgency">
                  <Select value={formData.urgency || ''} onValueChange={v => handleFieldChange('urgency', v)}>
                    <SelectTrigger className="h-8 text-sm border-none shadow-none"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent className="z-[10000]">
                      {['Low', 'Medium', 'High', 'Critical'].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </SidebarField>

                {/* Risk Rating */}
                <SidebarField label="Risk">
                  <Select value={formData.risk_rating || ''} onValueChange={v => handleFieldChange('risk_rating', v)}>
                    <SelectTrigger className="h-8 text-sm border-none shadow-none"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent className="z-[10000]">
                      {['Low', 'Medium', 'High', 'Critical'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </SidebarField>

                {/* Health */}
                <SidebarField label="Health">
                  <Select value={formData.health || 'green'} onValueChange={v => handleFieldChange('health', v)}>
                    <SelectTrigger className="h-8 text-sm border-none shadow-none"><SelectValue /></SelectTrigger>
                    <SelectContent className="z-[10000]">
                      <SelectItem value="green"><span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#36B37E' }} /> Green</span></SelectItem>
                      <SelectItem value="amber"><span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF991F' }} /> Amber</span></SelectItem>
                      <SelectItem value="red"><span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#DE350B' }} /> Red</span></SelectItem>
                    </SelectContent>
                  </Select>
                </SidebarField>

                {/* EA Review Required */}
                <SidebarField label="EA Review">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px' }}>
                    <Switch
                      checked={formData.ea_review_required ?? false}
                      onCheckedChange={checked => handleFieldChange('ea_review_required', checked)}
                    />
                    <span style={{ fontSize: 13, color: '#42526E' }}>{formData.ea_review_required ? 'Required' : 'No'}</span>
                  </div>
                </SidebarField>
              </div>

              {/* Dates section */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <ChevronDown size={14} color="#42526E" />
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#172B4D' }}>Dates</span>
                </div>

                <SidebarField label="Quarter">
                  <Select value={formData.planned_quarter?.[0] || ''} onValueChange={v => handleFieldChange('planned_quarter', [v])}>
                    <SelectTrigger className="h-8 text-sm border-none shadow-none"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent className="z-[10000]">
                      {QUARTER_OPTIONS.map(q => <SelectItem key={q} value={q}>{q.replace('-', ' ')}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </SidebarField>

                <SidebarField label="Business Ask">
                  <CatalystDatePicker
                    value={formData.start_date}
                    onChange={date => handleDateChange('start_date')(date ?? undefined)}
                    placeholder="Select date"
                  />
                </SidebarField>

                <SidebarField label="Kickoff">
                  <CatalystDatePicker
                    value={formData.impl_start_date}
                    onChange={date => handleDateChange('impl_start_date')(date ?? undefined)}
                    placeholder="Select date"
                  />
                </SidebarField>

                <SidebarField label="Target Complete">
                  <CatalystDatePicker
                    value={formData.impl_target_end_date}
                    onChange={date => handleDateChange('impl_target_end_date')(date ?? undefined)}
                    placeholder="Select date"
                  />
                </SidebarField>

                <SidebarField label="Effort">
                  <input
                    value={formData.estimated_effort || ''}
                    onChange={e => handleFieldChange('estimated_effort', e.target.value)}
                    placeholder="e.g. 3 months"
                    style={{ width: '100%', border: 'none', outline: 'none', fontSize: 14, color: '#172B4D', padding: '4px 6px', background: 'transparent' }}
                  />
                </SidebarField>

                <SidebarField label="Cost (SAR)">
                  <input
                    type="number"
                    value={formData.estimated_cost ?? ''}
                    onChange={e => handleFieldChange('estimated_cost', e.target.value ? Number(e.target.value) : null)}
                    placeholder="0"
                    style={{ width: '100%', border: 'none', outline: 'none', fontSize: 14, color: '#172B4D', padding: '4px 6px', background: 'transparent' }}
                  />
                </SidebarField>
              </div>

              {/* Timestamps */}
              <div style={{ marginTop: 'auto', padding: '12px 0 0' }}>
                <div style={{ fontSize: 12, color: '#5E6C84', marginBottom: 4, lineHeight: 1.6 }}>
                  <span style={{ color: '#42526E', fontWeight: 500 }}>Created</span> {fmtDate(request?.created_at)}
                </div>
                <div style={{ fontSize: 12, color: '#5E6C84', lineHeight: 1.6 }}>
                  <span style={{ color: '#42526E', fontWeight: 500 }}>Updated</span> {fmtDate(request?.updated_at)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent style={{ zIndex: 10001 }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{request?.request_key}</strong>? This action can be undone within 30 days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── Sidebar field layout ──
function SidebarField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10, display: 'flex', alignItems: 'flex-start', gap: 0 }}>
      <div style={{ width: 110, flexShrink: 0, fontSize: 12, fontWeight: 600, color: '#42526E', paddingTop: 6 }}>
        {label}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}

// ── Shared styles ──
const topBarBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  padding: '6px 8px', borderRadius: 4, color: '#42526E',
  display: 'flex', alignItems: 'center', transition: 'background 0.15s',
};

const dropdownStyle: React.CSSProperties = {
  position: 'absolute', right: 0, top: '100%', marginTop: 4,
  background: '#FFFFFF', borderRadius: 4,
  boxShadow: '0 8px 12px rgba(30,31,33,0.15), 0 0 1px rgba(30,31,33,0.31)',
  padding: '4px 0', zIndex: 9999, minWidth: 180,
  animation: 'brm-slide-down 0.15s ease-out',
};

const menuItemStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8,
  width: '100%', padding: '8px 14px', border: 'none',
  background: 'transparent', cursor: 'pointer',
  fontSize: 13, color: '#172B4D', textAlign: 'left',
};
