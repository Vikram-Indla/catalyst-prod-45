// ============================================================================
// TASK DETAIL MODAL V4 — PIXEL-PERFECT WITH SUPABASE INTEGRATION
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  X, 
  Link2, 
  MoreHorizontal, 
  ChevronDown, 
  Calendar, 
  Tag, 
  Lock, 
  FileText, 
  Check, 
  Trash2, 
  Plus, 
  Upload, 
  List, 
  MessageSquare, 
  Clock 
} from 'lucide-react';
import { toast } from 'sonner';
import { useUpdatePlannerTaskField } from '../../hooks/useUpdatePlannerTaskField';
import { usePlannerTaskRealtime } from '../../hooks/usePlannerTaskRealtime';
import { 
  useTaskActivity, 
  useTaskChecklist, 
  useToggleChecklistItem, 
  useAddChecklistItem, 
  useDeleteChecklistItem 
} from '../../hooks/useTaskDetails';
import { usePlannerUsers } from '../../hooks/usePlannerUsers';
import { usePlannerWorkstreams } from '../../hooks/usePlannerWorkstreams';

// ============================================================================
// TYPES
// ============================================================================

interface TaskData {
  id: string;
  task_key: string;
  title: string;
  description: string | null;
  priority: string;
  due_date: string | null;
  start_date: string | null;
  created_at: string;
  updated_at: string;
  status_id: string | null;
  workstream_id: string | null;
  assignee_id: string | null;
  status?: { id: string; name: string; slug: string; color?: string } | null;
  workstream?: { id: string; name: string; color?: string } | null;
  assignee?: { id: string; full_name: string | null; avatar_url?: string | null } | null;
}

interface TaskDetailModalV4Props {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ============================================================================
// COLOR MAPPINGS — CRITICAL
// ============================================================================

const STATUS_COLORS: Record<string, string> = {
  'backlog': '#94a3b8',
  'planned': '#3b82f6',
  'in-progress': '#f59e0b',
  'review': '#8b5cf6',
  'done': '#16a34a'
};

const PRIORITY_COLORS: Record<string, string> = {
  'critical': '#dc2626',
  'high': '#f97316',
  'medium': '#eab308',  // YELLOW — NOT BLUE
  'low': '#94a3b8'
};

const PRIORITIES = ['critical', 'high', 'medium', 'low'];

// Generate avatar color from string
function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ['#8b5cf6', '#3b82f6', '#ec4899', '#14b8a6', '#f59e0b', '#dc2626'];
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

// ============================================================================
// INLINE STYLES — PIXEL PERFECT
// ============================================================================

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(15, 23, 42, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    zIndex: 1000
  },
  modal: {
    background: '#ffffff',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '820px',
    maxHeight: '92vh',
    display: 'flex',
    flexDirection: 'column' as const,
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
    overflow: 'hidden'
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px',
    color: '#64748b'
  },
  header: {
    padding: '24px 28px 20px',
    borderBottom: '1px solid #e2e8f0',
    background: '#ffffff'
  },
  headerTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px'
  },
  taskMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  taskId: {
    fontFamily: 'ui-monospace, "SF Mono", monospace',
    fontSize: '14px',
    fontWeight: 600,
    color: '#64748b'
  },
  metaSep: {
    color: '#94a3b8'
  },
  wsLink: {
    fontSize: '14px',
    color: '#64748b'
  },
  headerActions: {
    display: 'flex',
    gap: '6px'
  },
  iconBtn: {
    width: '38px',
    height: '38px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    color: '#64748b',
    cursor: 'pointer'
  },
  taskTitle: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#0f172a',
    lineHeight: 1.3,
    margin: 0
  },
  metadataBar: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '20px',
    padding: '18px 28px',
    background: '#f8fafc',
    borderBottom: '1px solid #e2e8f0'
  },
  metaField: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
    position: 'relative' as const
  },
  metaLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em'
  },
  metaDropdown: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    cursor: 'pointer'
  },
  metaDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    flexShrink: 0
  },
  metaText: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#0f172a',
    flex: 1
  },
  metaChevron: {
    color: '#94a3b8'
  },
  avatarSm: {
    width: '26px',
    height: '26px',
    borderRadius: '50%',
    color: 'white',
    fontSize: '11px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  dropdownMenu: {
    position: 'absolute' as const,
    top: 'calc(100% + 4px)',
    left: 0,
    right: 0,
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
    zIndex: 1000,
    padding: '6px',
    maxHeight: '280px',
    overflowY: 'auto' as const
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  itemDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    flexShrink: 0
  },
  itemAvatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 600,
    color: 'white'
  },
  tabsContainer: {
    display: 'flex',
    padding: '0 28px',
    borderBottom: '1px solid #e2e8f0',
    background: '#ffffff',
    overflowX: 'auto' as const
  },
  tabBtn: {
    padding: '16px 18px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#64748b',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    position: 'relative' as const,
    whiteSpace: 'nowrap' as const
  },
  tabBtnActive: {
    color: '#2563eb'
  },
  tabIndicator: {
    position: 'absolute' as const,
    bottom: '-1px',
    left: 0,
    right: 0,
    height: '2px',
    background: '#2563eb'
  },
  contentArea: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '28px'
  },
  descriptionTextarea: {
    width: '100%',
    minHeight: '160px',
    padding: '16px 18px',
    border: '1px solid #cbd5e1',
    borderRadius: '12px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif',
    fontSize: '14px',
    lineHeight: 1.6,
    color: '#0f172a',
    background: '#ffffff',
    resize: 'vertical' as const,
    outline: 'none'
  },
  fieldsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
    marginTop: '28px'
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    position: 'relative' as const
  },
  fieldLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase' as const
  },
  fieldDropdown: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 14px',
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '10px',
    cursor: 'pointer'
  },
  fieldIcon: {
    color: '#94a3b8'
  },
  fieldText: {
    flex: 1,
    fontSize: '14px',
    color: '#0f172a'
  },
  fieldTextPlaceholder: {
    color: '#94a3b8'
  },
  labelsSection: {
    marginTop: '28px'
  },
  addLabelsBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 18px',
    background: '#f1f5f9',
    border: '2px dashed #cbd5e1',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#64748b',
    cursor: 'pointer'
  },
  uploadZone: {
    padding: '40px',
    border: '2px dashed #cbd5e1',
    borderRadius: '12px',
    textAlign: 'center' as const,
    marginBottom: '24px',
    cursor: 'pointer',
    background: '#f8fafc',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center'
  },
  uploadIcon: {
    color: '#94a3b8',
    marginBottom: '16px'
  },
  uploadTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#334155',
    marginBottom: '6px'
  },
  uploadText: {
    fontSize: '14px',
    color: '#64748b'
  },
  browseLink: {
    color: '#2563eb',
    fontWeight: 500
  },
  footer: {
    padding: '16px 28px',
    background: '#f8fafc',
    borderTop: '1px solid #e2e8f0'
  },
  footerText: {
    fontSize: '13px',
    color: '#64748b'
  },
  footerStrong: {
    fontWeight: 600,
    color: '#334155'
  },
  checklistHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '20px'
  },
  progressInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px'
  },
  progressText: {
    fontSize: '14px',
    color: '#64748b'
  },
  progressBar: {
    width: '140px',
    height: '8px',
    background: '#e2e8f0',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    background: '#2563eb',
    borderRadius: '4px'
  },
  checklistItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '14px 16px',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    marginBottom: '8px'
  },
  checklistItemCompleted: {
    background: '#f8fafc'
  },
  checkbox: {
    width: '22px',
    height: '22px',
    border: '2px solid #cbd5e1',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#ffffff',
    flexShrink: 0
  },
  checkboxChecked: {
    background: '#2563eb',
    borderColor: '#2563eb'
  },
  itemLabel: {
    flex: 1,
    fontSize: '14px',
    color: '#0f172a'
  },
  itemLabelCompleted: {
    color: '#94a3b8',
    textDecoration: 'line-through'
  },
  addItemInput: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px 20px',
    background: '#ffffff',
    border: '2px solid #2563eb',
    borderRadius: '12px',
    marginTop: '12px'
  },
  addItemIcon: {
    width: '32px',
    height: '32px',
    minWidth: '32px',
    background: '#2563eb',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    flexShrink: 0,
    cursor: 'pointer'
  },
  addItemInputField: {
    flex: 1,
    border: 'none',
    background: 'none',
    fontSize: '15px',
    color: '#334155',
    outline: 'none',
    padding: 0,
    margin: 0,
    boxShadow: 'none',
    WebkitAppearance: 'none' as const
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '48px 24px',
    background: '#f8fafc',
    border: '2px dashed #cbd5e1',
    borderRadius: '12px',
    textAlign: 'center' as const
  },
  emptyIcon: {
    color: '#94a3b8',
    marginBottom: '16px'
  },
  emptyTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#334155',
    marginBottom: '6px'
  },
  emptyText: {
    fontSize: '14px',
    color: '#64748b'
  },
  noteBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '14px 18px',
    background: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: '10px',
    marginBottom: '24px'
  },
  noteBannerIcon: {
    color: '#d97706'
  },
  noteBannerText: {
    fontSize: '13px',
    color: '#92400e'
  },
  activityFilters: {
    display: 'flex',
    background: '#f8fafc',
    borderRadius: '10px',
    padding: '4px',
    marginBottom: '24px'
  },
  activityFilterBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px 16px',
    background: 'transparent',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#64748b',
    cursor: 'pointer'
  },
  activityFilterBtnActive: {
    background: '#ffffff',
    color: '#0f172a',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  activityItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px',
    padding: '16px 0',
    borderBottom: '1px solid #e2e8f0'
  },
  activityIcon: {
    width: '36px',
    height: '36px',
    background: '#f8fafc',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  linksInputRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-end',
    marginBottom: '24px'
  },
  linkInput: {
    padding: '12px 14px',
    border: '1px solid #cbd5e1',
    borderRadius: '10px',
    fontSize: '14px',
    width: '100%'
  },
  addLinkBtn: {
    padding: '12px 20px',
    background: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const
  }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TaskDetailModalV4({ taskId, open, onOpenChange }: TaskDetailModalV4Props) {
  const [activeTab, setActiveTab] = useState('description');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [activityFilter, setActivityFilter] = useState('All');
  const queryClient = useQueryClient();
  const { updateNow, updateDebounced, flushPending, isPending } = useUpdatePlannerTaskField();

  // Fetch task data
  const { data: task, isLoading } = useQuery({
    queryKey: ['task-detail', taskId],
    queryFn: async (): Promise<TaskData | null> => {
      if (!taskId) return null;

      const { data, error } = await supabase
        .from('planner_tasks')
        .select(`
          *,
          status:planner_statuses(*),
          workstream:planner_workstreams(id, name, color),
          assignee:profiles!planner_tasks_assignee_id_fkey(id, full_name, avatar_url)
        `)
        .eq('id', taskId)
        .single();

      if (error) throw error;
      return data as TaskData;
    },
    enabled: !!taskId && open,
  });

  // Fetch statuses
  const { data: statuses = [] } = useQuery({
    queryKey: ['planner-statuses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planner_statuses')
        .select('*')
        .order('position');
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch users & workstreams
  const { data: users = [] } = usePlannerUsers();
  const { data: workstreams = [] } = usePlannerWorkstreams();

  // Fetch checklist items using proper hook
  const { data: checklistItems = [] } = useTaskChecklist(taskId || '');
  const toggleChecklistMutation = useToggleChecklistItem();
  const addChecklistMutation = useAddChecklistItem();
  const deleteChecklistMutation = useDeleteChecklistItem();

  // Fetch activities
  const { data: activities = [] } = useTaskActivity(taskId);

  // Realtime subscription
  usePlannerTaskRealtime({
    taskId: open ? taskId : null,
    onDelete: () => onOpenChange(false),
  });

  // Sync description with task
  useEffect(() => {
    if (task?.description !== undefined) {
      setDescription(task.description || '');
    }
  }, [task?.description]);

  // Handle escape key
  useEffect(() => {
    if (!open) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (taskId) flushPending(taskId);
        onOpenChange(false);
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onOpenChange, taskId, flushPending]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = () => setOpenDropdown(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleClose = useCallback(() => {
    if (taskId) flushPending(taskId);
    onOpenChange(false);
  }, [taskId, flushPending, onOpenChange]);

  const handleFieldChange = useCallback((field: string, value: any, debounce = false) => {
    if (!taskId) return;
    if (debounce) {
      updateDebounced(taskId, field, value);
    } else {
      updateNow(taskId, field, value);
    }
  }, [taskId, updateNow, updateDebounced]);

  const handleCopyLink = () => {
    if (!task) return;
    const url = `${window.location.origin}${window.location.pathname}?task=${task.task_key}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  const toggleDropdown = (id: string) => {
    setOpenDropdown(openDropdown === id ? null : id);
  };

  const handleToggleChecklistItem = (itemId: string, currentCompleted: boolean) => {
    toggleChecklistMutation.mutate({ id: itemId, is_completed: !currentCompleted });
  };

  const handleAddChecklistItem = () => {
    if (!newChecklistItem.trim() || !taskId) return;
    addChecklistMutation.mutate({ taskId, text: newChecklistItem.trim() }, {
      onSuccess: () => setNewChecklistItem(''),
    });
  };

  const handleDeleteChecklistItem = (itemId: string) => {
    deleteChecklistMutation.mutate(itemId);
  };

  if (!open) return null;

  const tabs = [
    { id: 'description', label: 'Description' },
    { id: 'notes', label: 'Notes' },
    { id: 'checklist', label: 'Checklist' },
    { id: 'links', label: 'Links' },
    { id: 'files', label: 'Files' },
    { id: 'activity', label: 'Activity', badge: activities.length || undefined }
  ];

  // Checklist calculations - use is_completed field
  const completedCount = checklistItems.filter((item: any) => item.is_completed).length;
  const progressPercent = checklistItems.length > 0 ? Math.round((completedCount / checklistItems.length) * 100) : 0;

  const getStatusColor = (slug: string) => STATUS_COLORS[slug] || '#94a3b8';
  const getPriorityColor = (priority: string) => PRIORITY_COLORS[priority?.toLowerCase()] || '#eab308';

  return (
    <div style={styles.overlay} onClick={handleClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        
        {isLoading ? (
          <div style={styles.loading}>Loading...</div>
        ) : task ? (
          <>
            {/* ==================== HEADER ==================== */}
            <div style={styles.header}>
              <div style={styles.headerTop}>
                <div style={styles.taskMeta}>
                  <span style={styles.taskId}>{task.task_key}</span>
                  <span style={styles.metaSep}>·</span>
                  <span style={styles.wsLink}>{task.workstream?.name || 'No Workstream'}</span>
                </div>
                <div style={styles.headerActions}>
                  <button style={styles.iconBtn} onClick={handleCopyLink} title="Copy link">
                    <Link2 size={18} />
                  </button>
                  <button style={styles.iconBtn} title="More">
                    <MoreHorizontal size={18} />
                  </button>
                  <button style={styles.iconBtn} onClick={handleClose} title="Close">
                    <X size={18} />
                  </button>
                </div>
              </div>
              {/* CRITICAL: h1, NOT input */}
              <h1 style={styles.taskTitle}>{task.title}</h1>
            </div>

            {/* ==================== METADATA BAR ==================== */}
            <div style={styles.metadataBar}>
              {/* STATUS */}
              <div style={styles.metaField}>
                <span style={styles.metaLabel}>Status</span>
                <div 
                  style={styles.metaDropdown}
                  onClick={(e) => { e.stopPropagation(); toggleDropdown('status'); }}
                >
                  <span 
                    style={{
                      ...styles.metaDot,
                      backgroundColor: getStatusColor(task.status?.slug || 'backlog')
                    }}
                  />
                  <span style={styles.metaText}>{task.status?.name || 'Backlog'}</span>
                  <ChevronDown size={16} style={styles.metaChevron} />
                </div>
                {openDropdown === 'status' && (
                  <div style={styles.dropdownMenu}>
                    {statuses.map((status: any) => (
                      <div
                        key={status.id}
                        style={{
                          ...styles.dropdownItem,
                          background: task.status_id === status.id ? '#dbeafe' : 'transparent'
                        }}
                        onClick={() => {
                          handleFieldChange('status_id', status.id);
                          setOpenDropdown(null);
                        }}
                      >
                        <span style={{ ...styles.itemDot, backgroundColor: getStatusColor(status.slug) }} />
                        <span>{status.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* PRIORITY */}
              <div style={styles.metaField}>
                <span style={styles.metaLabel}>Priority</span>
                <div 
                  style={styles.metaDropdown}
                  onClick={(e) => { e.stopPropagation(); toggleDropdown('priority'); }}
                >
                  <span 
                    style={{
                      ...styles.metaDot,
                      backgroundColor: getPriorityColor(task.priority)
                    }}
                  />
                  <span style={{ ...styles.metaText, textTransform: 'capitalize' }}>{task.priority}</span>
                  <ChevronDown size={16} style={styles.metaChevron} />
                </div>
                {openDropdown === 'priority' && (
                  <div style={styles.dropdownMenu}>
                    {PRIORITIES.map((priority) => (
                      <div
                        key={priority}
                        style={{
                          ...styles.dropdownItem,
                          background: task.priority?.toLowerCase() === priority ? '#dbeafe' : 'transparent'
                        }}
                        onClick={() => {
                          handleFieldChange('priority', priority);
                          setOpenDropdown(null);
                        }}
                      >
                        <span style={{ ...styles.itemDot, backgroundColor: getPriorityColor(priority) }} />
                        <span style={{ textTransform: 'capitalize' }}>{priority}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* WORKSTREAM */}
              <div style={styles.metaField}>
                <span style={styles.metaLabel}>Workstream</span>
                <div 
                  style={styles.metaDropdown}
                  onClick={(e) => { e.stopPropagation(); toggleDropdown('workstream'); }}
                >
                  <span 
                    style={{
                      ...styles.metaDot,
                      backgroundColor: task.workstream?.color || '#64748b'
                    }}
                  />
                  <span style={styles.metaText}>{task.workstream?.name || 'None'}</span>
                  <ChevronDown size={16} style={styles.metaChevron} />
                </div>
                {openDropdown === 'workstream' && (
                  <div style={styles.dropdownMenu}>
                    {workstreams.map((ws: any) => (
                      <div
                        key={ws.id}
                        style={{
                          ...styles.dropdownItem,
                          background: task.workstream_id === ws.id ? '#dbeafe' : 'transparent'
                        }}
                        onClick={() => {
                          handleFieldChange('workstream_id', ws.id);
                          setOpenDropdown(null);
                        }}
                      >
                        <span style={{ ...styles.itemDot, backgroundColor: ws.color || '#64748b' }} />
                        <span>{ws.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ASSIGNEE */}
              <div style={styles.metaField}>
                <span style={styles.metaLabel}>Assignee</span>
                <div 
                  style={styles.metaDropdown}
                  onClick={(e) => { e.stopPropagation(); toggleDropdown('assignee'); }}
                >
                  <span 
                    style={{
                      ...styles.avatarSm,
                      backgroundColor: task.assignee ? stringToColor(task.assignee.full_name || '') : '#94a3b8'
                    }}
                  >
                    {getInitials(task.assignee?.full_name || null)}
                  </span>
                  <span style={styles.metaText}>{task.assignee?.full_name || 'Unassigned'}</span>
                  <ChevronDown size={16} style={styles.metaChevron} />
                </div>
                {openDropdown === 'assignee' && (
                  <div style={styles.dropdownMenu}>
                    {/* Unassigned option */}
                    <div
                      style={{
                        ...styles.dropdownItem,
                        background: !task.assignee_id ? '#dbeafe' : 'transparent'
                      }}
                      onClick={() => {
                        handleFieldChange('assignee_id', null);
                        setOpenDropdown(null);
                      }}
                    >
                      <span style={{ ...styles.itemAvatar, backgroundColor: '#94a3b8' }}>?</span>
                      <span>Unassigned</span>
                    </div>
                    {users.map((user: any) => (
                      <div
                        key={user.id}
                        style={{
                          ...styles.dropdownItem,
                          background: task.assignee_id === user.id ? '#dbeafe' : 'transparent'
                        }}
                        onClick={() => {
                          handleFieldChange('assignee_id', user.id);
                          setOpenDropdown(null);
                        }}
                      >
                        <span style={{ ...styles.itemAvatar, backgroundColor: stringToColor(user.name) }}>
                          {user.initials}
                        </span>
                        <span>{user.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ==================== TABS ==================== */}
            <div style={styles.tabsContainer}>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  style={{
                    ...styles.tabBtn,
                    ...(activeTab === tab.id ? styles.tabBtnActive : {})
                  }}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                  {tab.badge && (
                    <span style={{
                      marginLeft: '6px',
                      padding: '2px 6px',
                      background: '#e2e8f0',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: 600
                    }}>
                      {tab.badge}
                    </span>
                  )}
                  {activeTab === tab.id && <div style={styles.tabIndicator} />}
                </button>
              ))}
            </div>

            {/* ==================== CONTENT AREA ==================== */}
            <div style={styles.contentArea}>
              
              {/* DESCRIPTION TAB */}
              {activeTab === 'description' && (
                <div>
                  <textarea
                    style={styles.descriptionTextarea}
                    placeholder="What is this task about? Add context, requirements, or notes..."
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      handleFieldChange('description', e.target.value, true);
                    }}
                  />

                  <div style={styles.fieldsRow}>
                    <div style={styles.fieldGroup}>
                      <label style={styles.fieldLabel}>Priority</label>
                      <div style={styles.fieldDropdown}>
                        <span style={{ ...styles.metaDot, backgroundColor: getPriorityColor(task.priority) }} />
                        <span style={{ ...styles.fieldText, textTransform: 'capitalize' }}>{task.priority}</span>
                        <ChevronDown size={16} style={styles.metaChevron} />
                      </div>
                    </div>

                    <div style={styles.fieldGroup}>
                      <label style={styles.fieldLabel}>Due Date</label>
                      <div style={styles.fieldDropdown}>
                        <Calendar size={18} style={styles.fieldIcon} />
                        <span style={task.due_date ? styles.fieldText : { ...styles.fieldText, ...styles.fieldTextPlaceholder }}>
                          {task.due_date ? formatDate(task.due_date) : 'Set due date...'}
                        </span>
                        <ChevronDown size={16} style={styles.metaChevron} />
                      </div>
                    </div>

                    <div style={styles.fieldGroup}>
                      <label style={styles.fieldLabel}>Start Date</label>
                      <div style={styles.fieldDropdown}>
                        <Calendar size={18} style={styles.fieldIcon} />
                        <span style={task.start_date ? styles.fieldText : { ...styles.fieldText, ...styles.fieldTextPlaceholder }}>
                          {task.start_date ? formatDate(task.start_date) : 'Set start date...'}
                        </span>
                        <ChevronDown size={16} style={styles.metaChevron} />
                      </div>
                    </div>
                  </div>

                  <div style={styles.labelsSection}>
                    <button style={styles.addLabelsBtn}>
                      <Tag size={18} />
                      Add labels
                    </button>
                  </div>
                </div>
              )}

              {/* NOTES TAB */}
              {activeTab === 'notes' && (
                <div>
                  <div style={styles.noteBanner}>
                    <Lock size={20} style={styles.noteBannerIcon} />
                    <span style={styles.noteBannerText}>
                      Visible to all · Editable by leads and management
                    </span>
                  </div>
                  <div style={styles.emptyState}>
                    <FileText size={52} style={styles.emptyIcon} />
                    <h3 style={styles.emptyTitle}>No notes yet</h3>
                    <p style={styles.emptyText}>Add the first note for your team</p>
                  </div>
                </div>
              )}

              {/* CHECKLIST TAB */}
              {activeTab === 'checklist' && (
                <div>
                  <div style={styles.checklistHeader}>
                    <div style={styles.progressInfo}>
                      <span style={styles.progressText}>
                        {completedCount} of {checklistItems.length} complete ({progressPercent}%)
                      </span>
                      <div style={styles.progressBar}>
                        <div style={{ ...styles.progressFill, width: `${progressPercent}%` }} />
                      </div>
                    </div>
                  </div>

                  {checklistItems.map((item: any) => (
                    <div 
                      key={item.id} 
                      style={{
                        ...styles.checklistItem,
                        ...(item.is_completed ? styles.checklistItemCompleted : {})
                      }}
                    >
                      <div 
                        style={{
                          ...styles.checkbox,
                          ...(item.is_completed ? styles.checkboxChecked : {})
                        }}
                        onClick={() => handleToggleChecklistItem(item.id, item.is_completed)}
                      >
                        {item.is_completed && <Check size={14} style={{ color: 'white' }} />}
                      </div>
                      <span style={{
                        ...styles.itemLabel,
                        ...(item.is_completed ? styles.itemLabelCompleted : {})
                      }}>
                        {item.text}
                      </span>
                      <button 
                        style={{ ...styles.iconBtn, width: '30px', height: '30px', border: 'none' }}
                        onClick={() => handleDeleteChecklistItem(item.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}

                  <div style={styles.addItemInput}>
                    <div style={styles.addItemIcon} onClick={handleAddChecklistItem}>
                      <Plus size={14} />
                    </div>
                    <input
                      style={styles.addItemInputField}
                      placeholder="Add checklist item..."
                      value={newChecklistItem}
                      onChange={(e) => setNewChecklistItem(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                    />
                  </div>
                </div>
              )}

              {/* LINKS TAB */}
              {activeTab === 'links' && (
                <div>
                  <div style={styles.linksInputRow}>
                    <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={styles.fieldLabel}>URL</label>
                      <input style={styles.linkInput} placeholder="https://example.com" />
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={styles.fieldLabel}>Title (optional)</label>
                      <input style={styles.linkInput} placeholder="Link title" />
                    </div>
                    <button style={styles.addLinkBtn}>Add Link</button>
                  </div>
                  
                  <div style={styles.emptyState}>
                    <Link2 size={52} style={styles.emptyIcon} />
                    <h3 style={styles.emptyTitle}>No links yet</h3>
                    <p style={styles.emptyText}>Add links to relevant resources</p>
                  </div>
                </div>
              )}

              {/* FILES TAB */}
              {activeTab === 'files' && (
                <div>
                  <div style={styles.uploadZone}>
                    <Upload size={48} style={styles.uploadIcon} />
                    <h3 style={styles.uploadTitle}>Drop files here to upload</h3>
                    <p style={styles.uploadText}>
                      or <span style={styles.browseLink}>browse</span> to choose files
                    </p>
                  </div>
                </div>
              )}

              {/* ACTIVITY TAB */}
              {activeTab === 'activity' && (
                <div>
                  <div style={styles.activityFilters}>
                    {['All', 'Comments', 'History'].map((filter) => (
                      <button
                        key={filter}
                        style={{
                          ...styles.activityFilterBtn,
                          ...(activityFilter === filter ? styles.activityFilterBtnActive : {})
                        }}
                        onClick={() => setActivityFilter(filter)}
                      >
                        {filter === 'All' && <List size={16} />}
                        {filter === 'Comments' && <MessageSquare size={16} />}
                        {filter === 'History' && <Clock size={16} />}
                        {filter}
                      </button>
                    ))}
                  </div>

                  {activities.length > 0 ? (
                    activities.map((activity: any) => (
                      <div key={activity.id} style={styles.activityItem}>
                        <div style={styles.activityIcon}>
                          <Clock size={16} style={{ color: '#64748b' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', color: '#334155' }}>
                            <strong style={{ color: '#0f172a' }}>{activity.action}</strong>
                          </div>
                          <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
                            {formatDate(activity.created_at)}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={styles.activityItem}>
                      <div style={styles.activityIcon}>
                        <Clock size={16} style={{ color: '#64748b' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', color: '#334155' }}>
                          <strong style={{ color: '#0f172a' }}>Task created</strong>
                        </div>
                        <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
                          {formatDate(task.created_at)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ==================== FOOTER ==================== */}
            <div style={styles.footer}>
              <span style={styles.footerText}>
                Created <strong style={styles.footerStrong}>{formatDate(task.created_at)}</strong> · 
                Updated <strong style={styles.footerStrong}>{formatDate(task.updated_at)}</strong>
                {isPending && <span style={{ marginLeft: '12px', color: '#2563eb' }}>Saving...</span>}
              </span>
            </div>
          </>
        ) : (
          <div style={styles.loading}>Task not found</div>
        )}
      </div>
    </div>
  );
}

export default TaskDetailModalV4;
