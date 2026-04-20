/**
 * BusinessRequestDetailModal — Enterprise two-column modal
 * Replaces BusinessRequestDrawer with StoryDetailModal patterns:
 * - Jira-parity breadcrumb + share + dots menu header
 * - Left panel: title, description (ADF), acceptance criteria, accordion sections, activity
 * - Right panel: status, priority, assignee, reporter, owner, dates
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  X, Share2, MoreHorizontal, ChevronDown, Copy, Trash2, Loader2,
  Check, Pencil, Calendar, Archive, ExternalLink,
} from 'lucide-react';
import {
  useBusinessRequest, useUpdateBusinessRequest,
  useDeleteBusinessRequest, useDuplicateBusinessRequest,
} from '@/hooks/useBusinessRequests';
import { BusinessRequest } from '@/types/business-request';
// 2026-04-20 — StoryRichTextEditor import REMOVED (TipTap). Its StarterKit
// eagerly evaluates prosemirror-gapcursor at module load, which collides
// with @atlaskit/editor-core's internal copy and crashes the Atlaskit
// renderer. Business-request description + acceptance-criteria editors
// are now plain textareas; the canonical Atlaskit EpicDescriptionEditor
// is the single rich-text surface across Catalyst.
import { RichTextCommentEditor } from '@/modules/project-work-hub/components/dialogs/story-detail-modules/RichTextCommentEditor';
import { StatusLozenge } from '@/modules/project-work-hub/components/dialogs/story-detail-modules/shared-components';
import { UserSelect } from './UserSelect';
import { BRAssigneePicker } from './BRAssigneePicker';
import { BRProjectsPicker } from './BRProjectsPicker';
import { DepartmentSelect } from './DepartmentSelect';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';
import { useDepartments, useBusinessOwners, useDepartmentOwnerMappings, getOwnerIdForDepartment } from '@/hooks/useDepartmentsAndOwners';
import { useActiveDemandProcessSteps } from '@/hooks/useDemandProcessSteps';
import { WorkItemStarButton } from '@/components/shared/WorkItemStarButton';
import { format, parseISO } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { getAvatarColor, getInitials, fmtDate } from '@/modules/project-work-hub/components/dialogs/story-detail-modules/helpers';

// ─── Animations ─────────────────────────────────
const ANIM_ID = 'br-modal-anims';
if (typeof document !== 'undefined' && !document.getElementById(ANIM_ID)) {
  const s = document.createElement('style');
  s.id = ANIM_ID;
  s.textContent = `
    @keyframes brm-overlay-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes brm-card-in { from { opacity: 0; transform: scale(0.97) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    @keyframes brm-slide-down { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
  `;
  document.head.appendChild(s);
}

// ─── Constants ──────────────────────────────────
const AUTO_SAVE_DELAY = 800;
const QUARTER_OPTIONS = [
  'Q4-2025', 'Q1-2026', 'Q2-2026', 'Q3-2026', 'Q4-2026',
  'Q1-2027', 'Q2-2027', 'Q3-2027', 'Q4-2027',
];

const AUDIT_FIELD_LABELS: Record<string, string> = {
  title: 'Title', description: 'Description', process_step: 'Process Step',
  department: 'Department', business_owner: 'Business Owner', requestor: 'Requestor',
  assignee: 'Assignee', delivery_platform: 'Delivery Platform', planned_quarter: 'Planned Quarter',
  urgency: 'Urgency', complexity: 'Complexity', risk_rating: 'Risk Rating',
  estimated_effort: 'Estimated Effort', start_date: 'Start Date', end_date: 'End Date',
  priority_tier: 'Priority', health: 'Health', acceptance_criteria: 'Acceptance Criteria',
};

/** Jira-native priority SVG icons */
const PRIORITY_SVG: Record<string, React.ReactNode> = {
  Highest: <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 8l5-5 5 5" fill="none" stroke="#FF5630" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 12l5-5 5 5" fill="none" stroke="#FF5630" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  High: <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 10l5-5 5 5" fill="none" stroke="#FF5630" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Medium: <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 6h10" fill="none" stroke="#FFAB00" strokeWidth="2" strokeLinecap="round"/><path d="M3 10h10" fill="none" stroke="#FFAB00" strokeWidth="2" strokeLinecap="round"/></svg>,
  Low: <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 6l5 5 5-5" fill="none" stroke="#2684FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Lowest: <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 4l5 5 5-5" fill="none" stroke="#2684FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 8l5 5 5-5" fill="none" stroke="#2684FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};
const PRIORITY_LIST = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];

// ─── Process step → 3-color lozenge mapping ─────
function resolveProcessStepCategory(step: string | null | undefined): 'todo' | 'in_progress' | 'done' {
  const s = (step ?? '').toLowerCase();
  if (/closed|completed|rejected/.test(s)) return 'done';
  if (/review|analyse|analysis|approved|ready|implement|progress|on_hold/.test(s)) return 'in_progress';
  return 'todo';
}

// ─── Audit logging ──────────────────────────────
async function logFieldChanges(requestId: string, oldData: Record<string, any>, newData: Record<string, any>) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user?.id).single();
    const actorName = profile?.full_name || user?.email || 'Unknown User';
    const logs: any[] = [];
    for (const [field, label] of Object.entries(AUDIT_FIELD_LABELS)) {
      const o = oldData[field] ?? null;
      const n = newData[field] ?? null;
      if (JSON.stringify(o) === JSON.stringify(n)) continue;
      const fmt = (v: any) => v === null || v === undefined ? 'None' : typeof v === 'object' ? JSON.stringify(v) : String(v);
      logs.push({ business_request_id: requestId, actor_id: user?.id, actor_name: actorName, action: 'UPDATE', field_changed: label, old_value: fmt(o), new_value: fmt(n) });
    }
    if (logs.length > 0) await typedQuery('business_request_audit_logs').insert(logs);
  } catch (e) { console.error('Audit log failed:', e); }
}

// ─── Description / Acceptance-criteria textarea editor ──
// 2026-04-20 — Replaces StoryRichTextEditor (TipTap). TipTap's StarterKit
// and @atlaskit/editor-core register conflicting prosemirror-gapcursor
// Selection jsonIDs in the same runtime, crashing the Atlaskit renderer.
// Plain textarea keeps the create flow simple; the canonical Atlaskit
// EpicDescriptionEditor remains the rich surface on the story detail.
interface BRTextareaEditorProps {
  initialValue: string;
  placeholder?: string;
  minHeight?: number;
  onSave: (text: string) => void;
  onCancel: () => void;
}
function BRTextareaEditor({ initialValue, placeholder, minHeight = 120, onSave, onCancel }: BRTextareaEditorProps) {
  const [value, setValue] = useState(initialValue ?? '');
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div>
      <textarea
        ref={ref}
        value={value}
        placeholder={placeholder}
        onChange={e => setValue(e.target.value)}
        style={{
          width: '100%',
          minHeight,
          padding: '10px 12px',
          border: '1px solid #DFE1E6',
          borderRadius: 3,
          background: '#FFFFFF',
          color: '#172B4D',
          fontSize: 14,
          lineHeight: 1.5,
          fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif',
          resize: 'vertical',
          outline: 'none',
        }}
        onFocus={e => (e.currentTarget.style.borderColor = '#4C9AFF')}
        onBlur={e => (e.currentTarget.style.borderColor = '#DFE1E6')}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button
          type="button"
          onClick={() => onSave(value)}
          style={{
            padding: '6px 16px', borderRadius: 3, border: 'none', cursor: 'pointer',
            background: '#0052CC', color: '#FFFFFF', fontSize: 14, fontWeight: 600,
          }}
        >Save</button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '6px 16px', borderRadius: 3, border: 'none', cursor: 'pointer',
            background: 'transparent', color: '#42526E', fontSize: 14, fontWeight: 500,
          }}
        >Cancel</button>
      </div>
    </div>
  );
}

// ─── Props ──────────────────────────────────────
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
  const { data: departments } = useDepartments();
  const { data: owners } = useBusinessOwners();
  const { data: mappings } = useDepartmentOwnerMappings();
  const { data: processSteps = [] } = useActiveDemandProcessSteps();

  // ─── Local state ──────────────────────────────
  const [formData, setFormData] = useState<Partial<BusinessRequest> & Record<string, any>>({});
  const [originalData, setOriginalData] = useState<Record<string, any>>({});
  const [titleFocused, setTitleFocused] = useState(false);
  const [descEditMode, setDescEditMode] = useState(false);
  const [acEditMode, setAcEditMode] = useState(false);
  const [showDotsMenu, setShowDotsMenu] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeActivityTab, setActiveActivityTab] = useState<'comments' | 'history' | 'all'>('comments');
  const [newComment, setNewComment] = useState('');

  // Resizable right panel
  const [rightPanelWidth, setRightPanelWidth] = useState(280);
  const isDraggingRef = useRef(false);
  const dotsMenuRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const priorityDropdownRef = useRef<HTMLDivElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingChangesRef = useRef<Record<string, any>>({});
  const skipNextFormResetRef = useRef(false);

  // ─── Queries ──────────────────────────────────
  const { data: comments = [] } = useQuery({
    queryKey: ['br-comments', requestId], enabled: !!requestId && isOpen,
    queryFn: async () => {
      const { data } = await typedQuery('business_request_audit_logs')
        .select('*')
        .eq('business_request_id', requestId!)
        .eq('action', 'COMMENT')
        .order('created_at', { ascending: true });
      return data ?? [];
    },
  });

  const { data: auditLog = [] } = useQuery({
    queryKey: ['br-audit-log', requestId], enabled: !!requestId && isOpen,
    queryFn: async () => {
      const { data } = await typedQuery('business_request_audit_logs')
        .select('*')
        .eq('business_request_id', requestId!)
        .neq('action', 'COMMENT')
        .order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  // ─── Resizer ──────────────────────────────────
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const modal = document.querySelector('[data-brm-scope]') as HTMLElement;
      if (!modal) return;
      const rect = modal.getBoundingClientRect();
      setRightPanelWidth(Math.max(220, Math.min(480, rect.right - e.clientX)));
    };
    const onUp = () => { isDraggingRef.current = false; document.body.style.cursor = ''; document.body.style.userSelect = ''; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dotsMenuRef.current && !dotsMenuRef.current.contains(e.target as Node)) setShowDotsMenu(false);
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) setShowStatusDropdown(false);
      if (priorityDropdownRef.current && !priorityDropdownRef.current.contains(e.target as Node)) setShowPriorityDropdown(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Sync form data
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

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showDotsMenu && !showStatusDropdown && !showDeleteConfirm) onClose();
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [isOpen, showDotsMenu, showStatusDropdown, showDeleteConfirm, onClose]);

  // ─── Auto-save ────────────────────────────────
  const performAutoSave = useCallback(async (dataToSave: Record<string, any>) => {
    if (!requestId) return;
    setIsSaving(true);
    try {
      await updateMutation.mutateAsync({ id: requestId, data: dataToSave as Partial<BusinessRequest> });
      await logFieldChanges(requestId, originalData, dataToSave);
      setOriginalData(dataToSave);
      skipNextFormResetRef.current = true;
      queryClient.invalidateQueries({ queryKey: ['business-requests'] });
      queryClient.invalidateQueries({ queryKey: ['br-audit-log', requestId] });
    } catch { toast.error('Failed to save changes'); }
    finally { setIsSaving(false); }
  }, [requestId, originalData, updateMutation, queryClient]);

  const handleFieldChange = useCallback((field: string, value: any) => {
    setFormData(prev => {
      const newData = field === '_batch' && typeof value === 'object' ? { ...prev, ...value } : { ...prev, [field]: value };
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

  useEffect(() => () => { if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current); }, []);

  // ─── Handlers ─────────────────────────────────
  const handleShare = useCallback(() => {
    const url = `${window.location.origin}/producthub?request=${requestId}`;
    navigator.clipboard.writeText(url);
    toast('Link copied to clipboard');
  }, [requestId]);

  const handleDelete = () => {
    if (requestId) {
      deleteMutation.mutate(requestId, {
        onSuccess: () => { setShowDeleteConfirm(false); queryClient.invalidateQueries({ queryKey: ['business-requests'] }); onClose(); },
      });
    }
  };

  const handleDuplicate = () => {
    if (requestId) {
      duplicateMutation.mutate(requestId, {
        onSuccess: (newReq) => {
          queryClient.invalidateQueries({ queryKey: ['business-requests'] });
          if (onRequestChange) onRequestChange(newReq.id);
        },
      });
    }
  };

  const handleDepartmentChange = (deptId: string) => {
    const dept = departments?.find(d => d.id === deptId);
    const updates: Record<string, any> = { department_id: deptId, department: dept?.name || null };
    if (mappings) {
      const ownerId = getOwnerIdForDepartment(deptId, mappings);
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

  const handleCommentSubmit = async (html: string) => {
    if (!html.trim() || !requestId || !user) return;
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
    await typedQuery('business_request_audit_logs').insert({
      business_request_id: requestId,
      actor_id: user.id,
      actor_name: profile?.full_name || user.email || 'Unknown',
      action: 'COMMENT',
      field_changed: null,
      old_value: null,
      new_value: html,
    });
    toast.success('Comment added');
    queryClient.invalidateQueries({ queryKey: ['br-comments', requestId] });
  };

  // ─── Derived ──────────────────────────────────
  const processStepLabel = useMemo(() => {
    const step = processSteps.find(s => s.value === formData.process_step);
    return step?.label || formData.process_step?.replace(/_/g, ' ').replace(/^\w/, (c: string) => c.toUpperCase()) || 'New Demand';
  }, [formData.process_step, processSteps]);

  const statusCategory = resolveProcessStepCategory(formData.process_step);
  const priorityKey = formData.priority_tier || 'unscored';
  const priorityLabel = priorityKey.charAt(0).toUpperCase() + priorityKey.slice(1);
  const businessOwnerName = formData.business_owner || owners?.find(o => o.id === formData.business_owner_id)?.name;

  if (!isOpen) return null;

  // ─── Loading state ────────────────────────────
  if (isLoading || !request) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(9, 30, 66, 0.54)' }} onClick={onClose}>
        <div style={{ width: 48, height: 48, border: '3px solid #DFE1E6', borderTopColor: '#0052CC', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  // ─── Menu item style ──────────────────────────
  const menuItem: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
    padding: '8px 14px', border: 'none', background: 'transparent',
    textAlign: 'left', cursor: 'pointer', fontSize: 14, color: '#172B4D',
    transition: 'background 0.1s', fontFamily: 'inherit',
  };

  return (
    <>
      {/* OVERLAY */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          background: 'rgba(9, 30, 66, 0.54)',
          padding: '40px 16px', overflowY: 'auto',
          animation: 'brm-overlay-in 200ms ease-out',
        }}
        onClick={onClose}
      >
        <div
          data-brm-scope
          style={{
            width: 1024, maxWidth: '92vw',
            height: 'min(720px, calc(100vh - 120px))',
            background: '#FFFFFF', borderRadius: 8,
            display: 'flex', flexDirection: 'column',
            boxShadow: '0 8px 32px rgba(9, 30, 66, 0.25)',
            overflow: 'hidden',
            animation: 'brm-card-in 250ms ease-out',
          }}
          onClick={e => e.stopPropagation()}
        >

          {/* ── A. TOP BAR ─────────────────────────── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 20px', minHeight: 44, flexShrink: 0,
            borderBottom: '1px solid #EBECF0',
          }}>
            {/* Breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#42526E', minWidth: 0 }}>
              {/* Business Request icon */}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect width="16" height="16" rx="2" fill="#FFAB00"/>
                <path d="M8 3C6.067 3 4.5 4.567 4.5 6.5C4.5 7.614 5.03 8.604 5.85 9.22V10.5C5.85 10.776 6.074 11 6.35 11H9.65C9.926 11 10.15 10.776 10.15 10.5V9.22C10.97 8.604 11.5 7.614 11.5 6.5C11.5 4.567 9.933 3 8 3Z" fill="white"/>
                <rect x="6.25" y="11.5" width="3.5" height="0.75" rx="0.375" fill="white"/>
                <rect x="6.75" y="12.75" width="2.5" height="0.75" rx="0.375" fill="white"/>
              </svg>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600, color: '#0052CC' }}>
                {request.request_key || '—'}
              </span>
            </div>

            {/* Right actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {/* Save indicator */}
              {isSaving && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#6B778C', marginRight: 8 }}>
                  <Loader2 size={12} className="animate-spin" /> Saving…
                </span>
              )}
              {requestId && <WorkItemStarButton itemId={requestId} itemType="business_request" size="md" />}
              <button onClick={handleShare} style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '6px 10px',
                borderRadius: 4, color: '#42526E', fontSize: 13, fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 6, transition: 'background 0.15s',
                fontFamily: "'Inter', sans-serif",
              }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <Share2 size={16} /> <span>Share</span>
              </button>
              {/* Dots menu */}
              <div ref={dotsMenuRef} style={{ position: 'relative' }}>
                <button onClick={() => setShowDotsMenu(!showDotsMenu)} style={{
                  background: showDotsMenu ? '#F4F5F7' : 'none', border: 'none', cursor: 'pointer',
                  padding: '6px 8px', borderRadius: 4, color: '#42526E',
                  display: 'flex', alignItems: 'center', transition: 'background 0.15s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
                  onMouseLeave={e => { if (!showDotsMenu) e.currentTarget.style.background = 'none'; }}
                ><MoreHorizontal size={18} /></button>
                {showDotsMenu && (
                  <div style={{
                    position: 'absolute', right: 0, top: 36, background: '#FFF',
                    border: '1px solid #DFE1E6', borderRadius: 6,
                    boxShadow: '0 4px 16px rgba(9,30,66,0.18)', padding: '6px 0',
                    zIndex: 50, minWidth: 200, animation: 'brm-slide-down 0.15s ease',
                  }}>
                    <button onClick={() => { setShowDotsMenu(false); handleDuplicate(); }} style={menuItem}
                      onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    ><Copy size={14} /> Clone request</button>
                    <button onClick={() => { setShowDotsMenu(false); toast('Archive — coming soon'); }} style={menuItem}
                      onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    ><Archive size={14} /> Archive</button>
                    <div style={{ height: 1, background: '#EBECF0', margin: '6px 0' }} />
                    <button onClick={() => { setShowDotsMenu(false); setShowDeleteConfirm(true); }}
                      style={{ ...menuItem, color: '#DE350B' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#FFEBE6')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    ><Trash2 size={14} /> Delete request</button>
                  </div>
                )}
              </div>
              {/* Close */}
              <button onClick={handleClose} style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px',
                borderRadius: 4, color: '#42526E', display: 'flex', alignItems: 'center',
                transition: 'background 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = '#FFEBE6'; e.currentTarget.style.color = '#DE350B'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#42526E'; }}
              ><X size={18} /></button>
            </div>
          </div>

          {/* ── B. BODY — two-column ─────────────── */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

            {/* LEFT PANEL */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '20px 24px 32px 24px',
              borderRight: '1px solid #EBECF0', minWidth: 0,
            }}>
              {/* 1. TITLE */}
              <h1
                contentEditable
                suppressContentEditableWarning
                onFocus={() => setTitleFocused(true)}
                onBlur={e => {
                  setTitleFocused(false);
                  const newTitle = e.currentTarget.textContent?.trim() ?? '';
                  if (newTitle && newTitle !== request.title) handleFieldChange('title', newTitle);
                }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } if (e.key === 'Escape') { e.currentTarget.textContent = request.title ?? ''; e.currentTarget.blur(); } }}
                style={{
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  fontSize: 22, fontWeight: 700, color: '#172B4D', lineHeight: 1.3,
                  margin: '0 0 12px', outline: 'none', cursor: 'text', borderRadius: 3,
                  padding: '4px 6px', wordBreak: 'break-word', transition: 'background 0.15s, box-shadow 0.15s',
                  background: titleFocused ? '#FFFFFF' : 'transparent',
                  boxShadow: titleFocused ? '0 0 0 2px #4C9AFF' : 'none',
                }}
                onMouseEnter={e => { if (!titleFocused) e.currentTarget.style.background = '#F4F5F7'; }}
                onMouseLeave={e => { if (!titleFocused) e.currentTarget.style.background = 'transparent'; }}
              >{request.title ?? '—'}</h1>

              {/* 2. DESCRIPTION — Rich text with view/edit toggle */}
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 14, fontWeight: 500, color: 'rgb(80, 82, 88)', lineHeight: '18.67px', margin: '0 0 4px', fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif' }}>Description</h2>
                {descEditMode ? (
                  <BRTextareaEditor
                    initialValue={formData.description || ''}
                    placeholder="Add a description…"
                    minHeight={150}
                    onSave={(text) => {
                      handleFieldChange('description', text);
                      setDescEditMode(false);
                    }}
                    onCancel={() => setDescEditMode(false)}
                  />
                ) : (
                  <div
                    onClick={() => setDescEditMode(true)}
                    style={{
                      borderRadius: 3, padding: '8px 6px', minHeight: 32, cursor: 'text',
                      outline: 'none', transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F8F8F8')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {formData.description && formData.description.trim() ? (
                      <div
                        dangerouslySetInnerHTML={{ __html: formData.description }}
                        style={{
                          fontSize: 14, fontWeight: 400, lineHeight: '24px', color: 'rgb(41, 42, 46)',
                          fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif',
                        }}
                        className="jira-desc-view"
                      />
                    ) : (
                      <span style={{ fontSize: 14, color: 'rgb(140, 143, 151)', fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif', padding: '4px 0' }}>
                        Add a description…
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* 3. ACCEPTANCE CRITERIA */}
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 14, fontWeight: 500, color: 'rgb(80, 82, 88)', lineHeight: '18.67px', margin: '0 0 4px', fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif' }}>Acceptance Criteria</h2>
                {acEditMode ? (
                  <BRTextareaEditor
                    initialValue={formData.acceptance_criteria || ''}
                    placeholder="No acceptance criteria defined · Click to add"
                    minHeight={80}
                    onSave={(text) => {
                      handleFieldChange('acceptance_criteria', text);
                      setAcEditMode(false);
                    }}
                    onCancel={() => setAcEditMode(false)}
                  />
                ) : (
                  <div
                    onClick={() => setAcEditMode(true)}
                    style={{
                      borderRadius: 3, padding: '8px 6px', minHeight: 32, cursor: 'text',
                      outline: 'none', transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F8F8F8')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {formData.acceptance_criteria && formData.acceptance_criteria.trim() ? (
                      <div
                        dangerouslySetInnerHTML={{ __html: formData.acceptance_criteria }}
                        style={{
                          fontSize: 14, fontWeight: 400, lineHeight: '24px', color: 'rgb(41, 42, 46)',
                          fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif',
                        }}
                        className="jira-desc-view"
                      />
                    ) : (
                      <span style={{ fontSize: 14, color: 'rgb(140, 143, 151)', padding: '4px 0' }}>
                        No acceptance criteria defined · Click to add
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* 4. SCORING ACCORDION */}
              <CollapsibleSection title="Scoring & Business Value" defaultOpen={false}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <SidebarField label="Executive Urgency" value={formData.executive_urgency != null ? `${formData.executive_urgency}/10` : '—'} />
                  <SidebarField label="Business Value" value={formData.business_value != null ? `${formData.business_value}/10` : '—'} />
                  <SidebarField label="Complexity Score" value={formData.complexity_score != null ? `${formData.complexity_score}/10` : '—'} />
                  <SidebarField label="Business Score" value={formData.business_score != null ? String(formData.business_score) : '—'} />
                </div>
              </CollapsibleSection>

              {/* 5. BUDGET ACCORDION */}
              <CollapsibleSection title="Budget & Funding" defaultOpen={false}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <SidebarField label="Funding Status" value={formData.funding_status || '—'} />
                  <SidebarField label="Budget Year" value={formData.budget_year || '—'} />
                  <SidebarField label="Approved Budget (SAR)" value={formData.approved_budget_sar != null ? `SAR ${Number(formData.approved_budget_sar).toLocaleString()}` : '—'} />
                  <SidebarField label="Contract Type" value={formData.contract_type || '—'} />
                </div>
              </CollapsibleSection>

              {/* 6. MILESTONES ACCORDION */}
              <CollapsibleSection title="Milestones" defaultOpen={false}>
                <span style={{ fontSize: 13, color: '#6B778C' }}>Milestones are managed in the dedicated view.</span>
              </CollapsibleSection>

              {/* 7. RISKS ACCORDION */}
              <CollapsibleSection title="Risks" defaultOpen={false}>
                <span style={{ fontSize: 13, color: '#6B778C' }}>Risks are managed in the dedicated view.</span>
              </CollapsibleSection>

              {/* 8. ACTIVITY — Jira-parity tabs */}
              <div style={{ marginTop: 32 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#292A2E', lineHeight: '20px', margin: 0, marginBottom: 12 }}>Activity</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
                  {(['all', 'comments', 'history'] as const).map(tab => {
                    const isActive = activeActivityTab === tab;
                    const label = tab === 'all' ? 'All' : tab === 'comments' ? 'Comments' : 'History';
                    return (
                      <button key={tab} onClick={() => setActiveActivityTab(tab)} style={{
                        height: 26, padding: '0 12px',
                        border: isActive ? '0.556px solid #1868DB' : '0.556px solid transparent',
                        borderRadius: 2,
                        background: isActive ? '#E9F2FE' : 'transparent',
                        fontSize: 13.33, fontWeight: isActive ? 700 : 400,
                        color: isActive ? '#1868DB' : '#505258',
                        cursor: 'pointer', transition: 'all 0.15s',
                        fontFamily: '"Atlassian Sans", ui-sans-serif, sans-serif',
                      }}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#F4F5F7'; }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                      >{label}</button>
                    );
                  })}
                </div>

                {/* Comment input */}
                {(activeActivityTab === 'comments' || activeActivityTab === 'all') && (
                  <div style={{ marginBottom: 20 }}>
                    <RichTextCommentEditor
                      onSubmit={handleCommentSubmit}
                      placeholder="Add a comment…"
                      workItemId={requestId || ''}
                    />
                  </div>
                )}

                {/* Comments */}
                {(activeActivityTab === 'comments' || activeActivityTab === 'all') && (
                  <div>
                    {comments.length === 0 && activeActivityTab === 'comments' && (
                      <div style={{ padding: '24px 0', color: '#97A0AF', fontSize: 14, textAlign: 'center' }}>No comments yet</div>
                    )}
                    {comments.map((c: any) => (
                      <div key={c.id} style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: getAvatarColor(c.actor_id || c.actor_name),
                          color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 13, fontWeight: 700, flexShrink: 0,
                        }}>
                          {getInitials(c.actor_name)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ marginBottom: 4 }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: '#172B4D' }}>{c.actor_name || 'Unknown'}</span>
                            {' '}
                            <span style={{ fontSize: 13, color: '#6B778C' }}>{fmtDate(c.created_at)}</span>
                          </div>
                          <div
                            dangerouslySetInnerHTML={{ __html: c.new_value || '' }}
                            style={{ fontSize: 14, color: '#172B4D', lineHeight: 1.6 }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* History */}
                {(activeActivityTab === 'history' || activeActivityTab === 'all') && (
                  <div>
                    {auditLog.length === 0 && activeActivityTab === 'history' && (
                      <div style={{ padding: '24px 0', color: '#97A0AF', fontSize: 14, textAlign: 'center' }}>No history recorded</div>
                    )}
                    {auditLog.map((e: any) => (
                      <div key={e.id} style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%', background: '#0052CC',
                          color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2"><rect x="8" y="2" width="8" height="4" rx="1"/><rect x="4" y="4" width="16" height="18" rx="2"/></svg>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, color: '#172B4D', lineHeight: 1.5, marginBottom: 2 }}>
                            <span style={{ fontWeight: 600 }}>{e.actor_name || 'System'}</span>{' '}
                            changed the <span style={{ fontWeight: 600 }}>{e.field_changed}</span>
                          </div>
                          <div style={{ fontSize: 13, color: '#6B778C' }}>{fmtDate(e.created_at)}</div>
                          {(e.old_value || e.new_value) && (
                            <div style={{ marginTop: 6, fontSize: 14, color: '#172B4D', display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ color: '#6B778C' }}>{e.old_value || 'None'}</span>
                              <span style={{ color: '#97A0AF' }}>→</span>
                              <span style={{ fontWeight: 500 }}>{e.new_value || 'None'}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* RESIZABLE SPLITTER */}
            <div
              onMouseDown={() => { isDraggingRef.current = true; document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'; }}
              style={{
                width: 6, minWidth: 6, cursor: 'col-resize', background: 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
              onMouseLeave={e => { if (!isDraggingRef.current) e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ width: 1.5, height: 32, borderRadius: 1, background: '#DFE1E6' }} />
            </div>

            {/* RIGHT PANEL — Sidebar */}
            <div style={{
              width: rightPanelWidth, minWidth: 220, maxWidth: 480,
              background: '#FFFFFF', overflowY: 'auto', overflowX: 'hidden',
              display: 'flex', flexDirection: 'column', padding: '16px 16px 32px 16px',
            }}>
              {/* Status */}
              <div style={{ marginBottom: 14 }} ref={statusDropdownRef}>
                <div style={{ position: 'relative' }}>
                  <button onClick={() => setShowStatusDropdown(!showStatusDropdown)} style={{
                    backgroundColor: statusCategory === 'done' ? '#E3FCEF' : statusCategory === 'in_progress' ? '#DEEBFF' : '#DFE1E6',
                    color: statusCategory === 'done' ? '#006644' : statusCategory === 'in_progress' ? '#0747A6' : '#253858',
                    padding: '6px 12px', borderRadius: 4, fontSize: 13, fontWeight: 700,
                    border: 'none', cursor: 'pointer', display: 'inline-flex',
                    alignItems: 'center', gap: 6, fontFamily: 'inherit', lineHeight: 1,
                    textTransform: 'uppercase', letterSpacing: '0.03em',
                    transition: 'opacity 0.15s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                  >
                    {processStepLabel.toUpperCase()}
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 4L5 7L8 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                  {showStatusDropdown && (
                    <div style={{
                      position: 'absolute', left: 0, top: '100%', marginTop: 4,
                      background: '#FFFFFF', borderRadius: 4, border: 'none',
                      boxShadow: '0 8px 12px rgba(30,31,33,0.15), 0 0 1px rgba(30,31,33,0.31)',
                      padding: '4px 0', zIndex: 9999, minWidth: 220, maxHeight: 340, overflowY: 'auto',
                      animation: 'brm-slide-down 0.15s ease-out',
                    }}>
                      {processSteps.map((step: any) => {
                        const isActive = formData.process_step === step.value;
                        const cat = resolveProcessStepCategory(step.value);
                        const bg = cat === 'done' ? '#E3FCEF' : cat === 'in_progress' ? '#DEEBFF' : '#DFE1E6';
                        const color = cat === 'done' ? '#006644' : cat === 'in_progress' ? '#0747A6' : '#253858';
                        return (
                          <div key={step.value}
                            onClick={() => { handleFieldChange('process_step', step.value); setShowStatusDropdown(false); }}
                            style={{
                              height: 36, padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              cursor: 'pointer', background: isActive ? '#DEEBFF' : 'transparent', transition: 'background 80ms',
                            }}
                            onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '#F4F5F7'; }}
                            onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                          >
                            <span style={{ background: bg, color, display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 6px', borderRadius: 3, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{step.label}</span>
                            {isActive && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0052CC" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Details section */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, userSelect: 'none' }}>
                  <ChevronDown size={14} color="#42526E" />
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#172B4D' }}>Details</span>
                </div>

                {/* Priority */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }} ref={priorityDropdownRef}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#42526E', width: 110, flexShrink: 0, paddingTop: 6 }}>Priority</div>
                  <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                    <div
                      onClick={() => setShowPriorityDropdown(!showPriorityDropdown)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px',
                        borderRadius: 4, cursor: 'pointer', transition: 'background 0.12s',
                        border: showPriorityDropdown ? '2px solid #4C9AFF' : '2px solid transparent',
                      }}
                      onMouseEnter={e => { if (!showPriorityDropdown) e.currentTarget.style.background = '#F4F5F7'; }}
                      onMouseLeave={e => { if (!showPriorityDropdown) e.currentTarget.style.background = 'transparent'; }}
                    >
                      {PRIORITY_SVG[priorityLabel] || PRIORITY_SVG.Medium}
                      <span style={{ fontSize: 14, color: '#172B4D' }}>{priorityLabel === 'Unscored' ? 'Medium' : priorityLabel}</span>
                    </div>
                    {showPriorityDropdown && (
                      <div style={{
                        position: 'absolute', left: 0, top: '100%', marginTop: 4,
                        background: '#FFFFFF', borderRadius: 4, border: 'none',
                        boxShadow: '0 8px 12px rgba(30,31,33,0.15), 0 0 1px rgba(30,31,33,0.31)',
                        padding: '4px 0', zIndex: 9999, minWidth: 180,
                      }}>
                        {PRIORITY_LIST.map(p => {
                          const isActive = priorityLabel === p;
                          return (
                            <div key={p}
                              onClick={() => { handleFieldChange('priority_tier', p.toLowerCase()); setShowPriorityDropdown(false); }}
                              style={{
                                height: 36, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 8,
                                cursor: 'pointer', background: isActive ? '#DEEBFF' : 'transparent',
                                transition: 'background 80ms',
                              }}
                              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '#F4F5F7'; }}
                              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                            >
                              {PRIORITY_SVG[p]}
                              <span style={{ fontSize: 14, color: '#172B4D' }}>{p}</span>
                              {isActive && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0052CC" strokeWidth="2.5" style={{ marginLeft: 'auto' }}><polyline points="20 6 9 17 4 12"/></svg>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Projects (linked ProjectHub projects) */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#42526E', width: 110, flexShrink: 0, paddingTop: 6 }}>Projects</div>
                  <BRProjectsPicker businessRequestId={request.id} />
                </div>

                {/* Assignee — canonical Story-style picker */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#42526E', width: 110, flexShrink: 0, paddingTop: 6 }}>Assignee</div>
                  <BRAssigneePicker
                    value={formData.assignee || null}
                    onChange={(v) => handleFieldChange('assignee', v)}
                    placeholder="Unassigned"
                  />
                </div>

                {/* Reporter */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#42526E', width: 110, flexShrink: 0, paddingTop: 6 }}>Reporter</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <UserSelect
                      value={formData.requestor || null}
                      onChange={(userId) => handleFieldChange('requestor', userId)}
                      placeholder="Select reporter"
                    />
                  </div>
                </div>

                {/* Business Owner */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#42526E', width: 110, flexShrink: 0, paddingTop: 6 }}>Business Owner</div>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', borderRadius: 4 }}>
                    {businessOwnerName ? (
                      <>
                        <div style={{
                          width: 24, height: 24, borderRadius: '50%',
                          background: getAvatarColor(businessOwnerName),
                          color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 700, flexShrink: 0,
                        }}>{getInitials(businessOwnerName)}</div>
                        <span style={{ fontSize: 14, color: '#172B4D' }}>{businessOwnerName}</span>
                      </>
                    ) : <span style={{ color: '#42526E', fontSize: 14 }}>Auto-assigned</span>}
                  </div>
                </div>

                {/* Department */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#42526E', width: 110, flexShrink: 0, paddingTop: 6 }}>Department</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <DepartmentSelect
                      value={formData.department_id || null}
                      onChange={handleDepartmentChange}
                      placeholder="Select department"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                {/* Target Quarter */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#42526E', width: 110, flexShrink: 0, paddingTop: 6 }}>Target Quarter</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Select value={formData.planned_quarter?.[0] || ''} onValueChange={(v) => handleFieldChange('planned_quarter', [v])}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select quarter" /></SelectTrigger>
                      <SelectContent className="z-[9999] bg-popover">
                        {QUARTER_OPTIONS.map(q => <SelectItem key={q} value={q}>{q.replace('-', ' ')}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Rank */}
                {formData.rank && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#42526E', width: 110, flexShrink: 0, paddingTop: 6 }}>Rank</div>
                    <span style={{ fontSize: 14, color: '#172B4D', fontWeight: 500, paddingTop: 6 }}>#{formData.rank}</span>
                  </div>
                )}

                {/* EA Review */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#42526E', width: 110, flexShrink: 0, paddingTop: 6 }}>EA Review</div>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4 }}>
                    <Switch
                      checked={formData.ea_review_required ?? false}
                      onCheckedChange={(checked) => handleFieldChange('ea_review_required', checked)}
                    />
                    <span style={{ fontSize: 13, color: '#42526E' }}>{formData.ea_review_required ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>

              {/* Dates section */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, userSelect: 'none' }}>
                  <ChevronDown size={14} color="#42526E" />
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#172B4D' }}>Dates</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#42526E', width: 110, flexShrink: 0, paddingTop: 6 }}>Business Ask</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <CatalystDatePicker value={formData.start_date} onChange={(d) => handleDateChange('start_date')(d ?? undefined)} placeholder="Select date" />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#42526E', width: 110, flexShrink: 0, paddingTop: 6 }}>Kickoff Date</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <CatalystDatePicker value={formData.impl_start_date} onChange={(d) => handleDateChange('impl_start_date')(d ?? undefined)} placeholder="Select date" />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#42526E', width: 110, flexShrink: 0, paddingTop: 6 }}>Target Complete</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <CatalystDatePicker value={formData.impl_target_end_date} onChange={(d) => handleDateChange('impl_target_end_date')(d ?? undefined)} placeholder="Select date" />
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div style={{ marginTop: 'auto', padding: '12px 0 0' }}>
                <div style={{ fontSize: 12, color: '#5E6C84', marginBottom: 4, lineHeight: 1.6 }}>
                  <span style={{ color: '#42526E', fontWeight: 500 }}>Created</span> {request.created_at ? format(parseISO(request.created_at), 'dd MMM yyyy') : '—'}
                </div>
                <div style={{ fontSize: 12, color: '#5E6C84', lineHeight: 1.6 }}>
                  <span style={{ color: '#42526E', fontWeight: 500 }}>Updated</span> {request.updated_at ? format(parseISO(request.updated_at), 'dd MMM yyyy') : '—'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(9,30,66,0.4)' }}>
          <div style={{ background: '#FFF', borderRadius: 8, padding: 28, width: 400, maxWidth: '95vw' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#172B4D', marginBottom: 8 }}>Delete {request.request_key}?</h3>
            <p style={{ fontSize: 13, color: '#5E6C84', lineHeight: 1.6, marginBottom: 20 }}>This request will be moved to deleted items and can be restored within 30 days.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowDeleteConfirm(false)} style={{ padding: '7px 16px', borderRadius: 4, background: '#FFF', border: '1px solid #DFE1E6', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#5E6C84' }}>Cancel</button>
              <button onClick={handleDelete} style={{ padding: '7px 16px', borderRadius: 4, background: '#DE350B', color: '#FFF', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Collapsible Section ────────────────────────
function CollapsibleSection({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 16, borderTop: '1px solid #EBECF0', paddingTop: 12 }}>
      <div onClick={() => setOpen(!open)} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none', marginBottom: open ? 12 : 0 }}>
        <span style={{ width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#5E6C84', transition: 'transform 0.2s', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', flexShrink: 0 }}>
          <ChevronDown size={14} />
        </span>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#172B4D' }}>{title}</span>
      </div>
      {open && <div style={{ paddingLeft: 22 }}>{children}</div>}
    </div>
  );
}

// ─── Sidebar Field ──────────────────────────────
function SidebarField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#6B778C', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, color: '#172B4D', fontWeight: 400 }}>{value}</div>
    </div>
  );
}
