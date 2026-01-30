// ============================================================================
// TASK DETAIL MODAL — COMPLETE PRODUCTION-READY COMPONENT
// ============================================================================
// 
// VERSION: 4.0 FINAL
// DATE: January 30, 2026
// 
// INSTRUCTIONS FOR LOVABLE:
// 1. Go to Code View (not chat)
// 2. Find or create: src/components/planner/TaskDetailModal.tsx
// 3. DELETE everything in that file
// 4. PASTE this entire code
// 5. Save and test
//
// This component uses INLINE STYLES to guarantee correct rendering.
// No external CSS file needed.
//
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Link2, 
  MoreHorizontal, 
  ChevronDown, 
  Calendar, 
  Tag, 
  Lock, 
  Send, 
  FileText, 
  Check, 
  Edit2, 
  Trash2, 
  Plus, 
  ExternalLink, 
  Upload, 
  Download, 
  List, 
  MessageSquare, 
  Clock,
  AlertCircle
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface Assignee {
  name: string;
  initials: string;
  color: string;
}

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface TaskLink {
  id: string;
  url: string;
  title: string;
}

interface TaskFile {
  id: string;
  name: string;
  size: string;
  type: 'pdf' | 'doc' | 'img' | 'other';
  uploadedAt: string;
}

interface Comment {
  id: string;
  content: string;
  author: string;
  authorInitials: string;
  authorColor: string;
  createdAt: string;
}

interface HistoryEvent {
  id: string;
  action: string;
  author: string;
  timestamp: string;
}

interface Task {
  id: string;
  taskId: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  workstream: string;
  assignee?: Assignee;
  dueDate?: string;
  startDate?: string;
  labels?: string[];
  checklist?: ChecklistItem[];
  links?: TaskLink[];
  files?: TaskFile[];
  comments?: Comment[];
  history?: HistoryEvent[];
  createdAt?: string;
  updatedAt?: string;
}

interface TaskDetailModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (task: Task) => void;
}

// ============================================================================
// COLOR CONSTANTS — CRITICAL: DO NOT MODIFY
// ============================================================================

const COLORS = {
  // Text
  textPrimary: '#0f172a',
  textSecondary: '#334155',
  textMuted: '#64748b',
  textLight: '#94a3b8',
  
  // Surfaces
  surfacePage: '#f8fafc',
  surfaceCard: '#ffffff',
  surfaceHover: '#f1f5f9',
  
  // Borders
  borderLight: '#e2e8f0',
  borderDefault: '#cbd5e1',
  borderFocus: '#3b82f6',
  
  // Accent
  accent: '#2563eb',
  accentHover: '#1d4ed8',
  accentLight: '#dbeafe',
  
  // Status
  statusBacklog: '#94a3b8',
  statusPlanned: '#3b82f6',
  statusProgress: '#f59e0b',
  statusReview: '#8b5cf6',
  statusDone: '#16a34a',
  
  // Priority — MEDIUM IS YELLOW
  priorityCritical: '#dc2626',
  priorityHigh: '#f97316',
  priorityMedium: '#eab308',
  priorityLow: '#94a3b8',
  
  // Workstream — CATALYST IS INDIGO, MIM IS GRAY
  wsCatalyst: '#6366f1',
  wsDataAi: '#8b5cf6',
  wsDelivery: '#ec4899',
  wsMim: '#64748b',
  wsSenaei: '#14b8a6',
  
  // Warning
  warningBg: '#fffbeb',
  warningBorder: '#fde68a',
  warningText: '#92400e',
  warningIcon: '#d97706',
  
  // File types
  filePdfBg: '#fef2f2',
  filePdfIcon: '#dc2626',
  fileDocBg: '#eff6ff',
  fileDocIcon: '#2563eb',
  fileImgBg: '#f0fdf4',
  fileImgIcon: '#16a34a'
};

const STATUS_COLORS: Record<string, string> = {
  'Backlog': COLORS.statusBacklog,
  'Planned': COLORS.statusPlanned,
  'In Progress': COLORS.statusProgress,
  'In Review': COLORS.statusReview,
  'Done': COLORS.statusDone
};

const PRIORITY_COLORS: Record<string, string> = {
  'Critical': COLORS.priorityCritical,
  'High': COLORS.priorityHigh,
  'Medium': COLORS.priorityMedium,  // YELLOW #eab308
  'Low': COLORS.priorityLow
};

const WORKSTREAM_COLORS: Record<string, string> = {
  'Catalyst': COLORS.wsCatalyst,  // INDIGO #6366f1
  'Data & AI': COLORS.wsDataAi,
  'Delivery': COLORS.wsDelivery,
  'MIM': COLORS.wsMim,  // GRAY #64748b — NOT PINK
  'Senaei': COLORS.wsSenaei
};

const STATUSES = ['Backlog', 'Planned', 'In Progress', 'In Review', 'Done'];
const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
const WORKSTREAMS = ['Catalyst', 'Data & AI', 'Delivery', 'MIM', 'Senaei'];
const ASSIGNEES: Assignee[] = [
  { name: 'Vikram Indla', initials: 'VI', color: '#8b5cf6' },
  { name: 'Ahmed Khan', initials: 'AK', color: '#3b82f6' },
  { name: 'Sarah Johnson', initials: 'SJ', color: '#ec4899' },
  { name: 'Mohammed Ali', initials: 'MA', color: '#14b8a6' },
  { name: 'Unassigned', initials: '?', color: '#94a3b8' }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  isOpen,
  onClose,
  onSave
}) => {
  // State
  const [activeTab, setActiveTab] = useState('description');
  const [editedTask, setEditedTask] = useState<Task>(task);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newComment, setNewComment] = useState('');
  const [activityFilter, setActivityFilter] = useState<'all' | 'comments' | 'history'>('all');
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  
  const modalRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset when task changes
  useEffect(() => {
    setEditedTask(task);
    setActiveTab('description');
    setOpenDropdown(null);
  }, [task]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevent body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (openDropdown && modalRef.current) {
        const target = e.target as HTMLElement;
        if (!target.closest('.dropdown-trigger') && !target.closest('.dropdown-menu')) {
          setOpenDropdown(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  if (!isOpen) return null;

  // Handlers
  const handleFieldChange = (field: keyof Task, value: any) => {
    const updated = { ...editedTask, [field]: value };
    setEditedTask(updated);
    if (onSave) onSave(updated);
  };

  const toggleDropdown = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenDropdown(openDropdown === id ? null : id);
  };

  // Checklist handlers
  const checklist = editedTask.checklist || [];
  const completedCount = checklist.filter(item => item.completed).length;
  const progressPercent = checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : 0;

  const toggleChecklistItem = (itemId: string) => {
    const updated = checklist.map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    handleFieldChange('checklist', updated);
  };

  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    const newItem: ChecklistItem = {
      id: Date.now().toString(),
      text: newChecklistItem,
      completed: false
    };
    handleFieldChange('checklist', [...checklist, newItem]);
    setNewChecklistItem('');
  };

  const deleteChecklistItem = (itemId: string) => {
    const updated = checklist.filter(item => item.id !== itemId);
    handleFieldChange('checklist', updated);
  };

  // Links handlers
  const links = editedTask.links || [];
  
  const addLink = () => {
    if (!newLinkUrl.trim()) return;
    const newLink: TaskLink = {
      id: Date.now().toString(),
      url: newLinkUrl,
      title: newLinkTitle || newLinkUrl
    };
    handleFieldChange('links', [...links, newLink]);
    setNewLinkUrl('');
    setNewLinkTitle('');
  };

  const deleteLink = (linkId: string) => {
    const updated = links.filter(link => link.id !== linkId);
    handleFieldChange('links', updated);
  };

  // Files handlers
  const files = editedTask.files || [];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles) return;

    const newFiles: TaskFile[] = Array.from(uploadedFiles).map(file => {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      let type: TaskFile['type'] = 'other';
      if (ext === 'pdf') type = 'pdf';
      else if (['doc', 'docx'].includes(ext)) type = 'doc';
      else if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) type = 'img';
      
      return {
        id: Date.now().toString() + Math.random(),
        name: file.name,
        size: file.size < 1024 * 1024 
          ? `${Math.round(file.size / 1024)} KB` 
          : `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        type,
        uploadedAt: 'Just now'
      };
    });

    handleFieldChange('files', [...files, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const deleteFile = (fileId: string) => {
    const updated = files.filter(f => f.id !== fileId);
    handleFieldChange('files', updated);
  };

  // Comments/Activity
  const comments = editedTask.comments || [];
  const history = editedTask.history || [
    { id: '1', action: 'Task created', author: 'System', timestamp: editedTask.createdAt || 'Unknown' }
  ];

  const addComment = () => {
    if (!newComment.trim()) return;
    const comment: Comment = {
      id: Date.now().toString(),
      content: newComment,
      author: 'Current User',
      authorInitials: 'CU',
      authorColor: COLORS.accent,
      createdAt: 'Just now'
    };
    handleFieldChange('comments', [...comments, comment]);
    setNewComment('');
  };

  // Tab configuration
  const tabs = [
    { id: 'description', label: 'Description' },
    { id: 'notes', label: 'Notes' },  // NOT "Lead Notes"
    { id: 'checklist', label: 'Checklist' },
    { id: 'links', label: 'Links' },
    { id: 'files', label: 'Files' },
    { id: 'activity', label: 'Activity', badge: comments.length + history.length }
  ];

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      {/* OVERLAY */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}
        onClick={onClose}
      >
        {/* MODAL */}
        <div
          ref={modalRef}
          style={{
            backgroundColor: COLORS.surfaceCard,
            borderRadius: '16px',
            width: '100%',
            maxWidth: '820px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
            overflow: 'hidden'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          
          {/* ==================== HEADER ==================== */}
          <div
            style={{
              padding: '24px 28px 20px',
              borderBottom: `1px solid ${COLORS.borderLight}`,
              backgroundColor: COLORS.surfaceCard
            }}
          >
            {/* Header Top Row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px'
              }}
            >
              {/* Task Meta */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontFamily: 'ui-monospace, "SF Mono", "Cascadia Code", monospace',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: COLORS.textMuted
                  }}
                >
                  {editedTask.taskId}
                </span>
                <span style={{ color: COLORS.textLight }}>·</span>
                <span
                  style={{
                    fontSize: '14px',
                    color: COLORS.textMuted,
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = COLORS.accent)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = COLORS.textMuted)}
                >
                  {editedTask.workstream}
                </span>
              </div>

              {/* Header Actions */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {[
                  { icon: Link2, title: 'Copy link', onClick: () => navigator.clipboard.writeText(`${window.location.origin}/task/${editedTask.id}`) },
                  { icon: MoreHorizontal, title: 'More options', onClick: () => {} },
                  { icon: X, title: 'Close', onClick: onClose }
                ].map((btn, idx) => (
                  <button
                    key={idx}
                    title={btn.title}
                    onClick={btn.onClick}
                    style={{
                      width: '38px',
                      height: '38px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'transparent',
                      border: `1px solid ${COLORS.borderLight}`,
                      borderRadius: '10px',
                      color: COLORS.textMuted,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = COLORS.surfaceHover;
                      e.currentTarget.style.borderColor = COLORS.borderDefault;
                      e.currentTarget.style.color = COLORS.textSecondary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.borderColor = COLORS.borderLight;
                      e.currentTarget.style.color = COLORS.textMuted;
                    }}
                  >
                    <btn.icon size={18} />
                  </button>
                ))}
              </div>
            </div>

            {/* TASK TITLE — CRITICAL: h1, NOT INPUT */}
            <h1
              style={{
                fontSize: '24px',
                fontWeight: 600,
                color: COLORS.textPrimary,
                lineHeight: 1.3,
                margin: 0,
                padding: 0,
                border: 'none',
                background: 'none'
              }}
            >
              {editedTask.title}
            </h1>
          </div>

          {/* ==================== METADATA BAR ==================== */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '20px',
              padding: '18px 28px',
              backgroundColor: COLORS.surfacePage,
              borderBottom: `1px solid ${COLORS.borderLight}`
            }}
          >
            {/* STATUS DROPDOWN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: COLORS.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                Status
              </span>
              <div
                className="dropdown-trigger"
                onClick={(e) => toggleDropdown('status', e)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  backgroundColor: COLORS.surfaceCard,
                  border: `1px solid ${openDropdown === 'status' ? COLORS.borderFocus : COLORS.borderLight}`,
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: openDropdown === 'status' ? `0 0 0 3px rgba(59, 130, 246, 0.15)` : 'none'
                }}
              >
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: STATUS_COLORS[editedTask.status] || COLORS.statusBacklog,
                    flexShrink: 0
                  }}
                />
                <span style={{ fontSize: '14px', fontWeight: 500, color: COLORS.textPrimary, flex: 1 }}>
                  {editedTask.status}
                </span>
                <ChevronDown 
                  size={16} 
                  style={{ 
                    color: COLORS.textLight,
                    transition: 'transform 0.2s ease',
                    transform: openDropdown === 'status' ? 'rotate(180deg)' : 'rotate(0deg)'
                  }} 
                />
              </div>
              {openDropdown === 'status' && (
                <div
                  className="dropdown-menu"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    backgroundColor: COLORS.surfaceCard,
                    border: `1px solid ${COLORS.borderDefault}`,
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
                    zIndex: 1000,
                    padding: '6px',
                    maxHeight: '280px',
                    overflowY: 'auto'
                  }}
                >
                  {STATUSES.map((status) => (
                    <div
                      key={status}
                      onClick={() => {
                        handleFieldChange('status', status);
                        setOpenDropdown(null);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        backgroundColor: editedTask.status === status ? COLORS.accentLight : 'transparent',
                        transition: 'background-color 0.1s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (editedTask.status !== status) {
                          e.currentTarget.style.backgroundColor = COLORS.surfaceHover;
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = editedTask.status === status ? COLORS.accentLight : 'transparent';
                      }}
                    >
                      <span
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: STATUS_COLORS[status],
                          flexShrink: 0
                        }}
                      />
                      <span style={{ fontSize: '14px', color: COLORS.textPrimary }}>{status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PRIORITY DROPDOWN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: COLORS.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                Priority
              </span>
              <div
                className="dropdown-trigger"
                onClick={(e) => toggleDropdown('priority', e)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  backgroundColor: COLORS.surfaceCard,
                  border: `1px solid ${openDropdown === 'priority' ? COLORS.borderFocus : COLORS.borderLight}`,
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: openDropdown === 'priority' ? `0 0 0 3px rgba(59, 130, 246, 0.15)` : 'none'
                }}
              >
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: PRIORITY_COLORS[editedTask.priority] || COLORS.priorityMedium,
                    flexShrink: 0
                  }}
                />
                <span style={{ fontSize: '14px', fontWeight: 500, color: COLORS.textPrimary, flex: 1 }}>
                  {editedTask.priority}
                </span>
                <ChevronDown 
                  size={16} 
                  style={{ 
                    color: COLORS.textLight,
                    transition: 'transform 0.2s ease',
                    transform: openDropdown === 'priority' ? 'rotate(180deg)' : 'rotate(0deg)'
                  }} 
                />
              </div>
              {openDropdown === 'priority' && (
                <div
                  className="dropdown-menu"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    backgroundColor: COLORS.surfaceCard,
                    border: `1px solid ${COLORS.borderDefault}`,
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
                    zIndex: 1000,
                    padding: '6px'
                  }}
                >
                  {PRIORITIES.map((priority) => (
                    <div
                      key={priority}
                      onClick={() => {
                        handleFieldChange('priority', priority);
                        setOpenDropdown(null);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        backgroundColor: editedTask.priority === priority ? COLORS.accentLight : 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        if (editedTask.priority !== priority) {
                          e.currentTarget.style.backgroundColor = COLORS.surfaceHover;
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = editedTask.priority === priority ? COLORS.accentLight : 'transparent';
                      }}
                    >
                      <span
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: PRIORITY_COLORS[priority],
                          flexShrink: 0
                        }}
                      />
                      <span style={{ fontSize: '14px', color: COLORS.textPrimary }}>{priority}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* WORKSTREAM DROPDOWN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: COLORS.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                Workstream
              </span>
              <div
                className="dropdown-trigger"
                onClick={(e) => toggleDropdown('workstream', e)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  backgroundColor: COLORS.surfaceCard,
                  border: `1px solid ${openDropdown === 'workstream' ? COLORS.borderFocus : COLORS.borderLight}`,
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: openDropdown === 'workstream' ? `0 0 0 3px rgba(59, 130, 246, 0.15)` : 'none'
                }}
              >
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: WORKSTREAM_COLORS[editedTask.workstream] || COLORS.wsMim,
                    flexShrink: 0
                  }}
                />
                <span style={{ fontSize: '14px', fontWeight: 500, color: COLORS.textPrimary, flex: 1 }}>
                  {editedTask.workstream}
                </span>
                <ChevronDown 
                  size={16} 
                  style={{ 
                    color: COLORS.textLight,
                    transition: 'transform 0.2s ease',
                    transform: openDropdown === 'workstream' ? 'rotate(180deg)' : 'rotate(0deg)'
                  }} 
                />
              </div>
              {openDropdown === 'workstream' && (
                <div
                  className="dropdown-menu"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    backgroundColor: COLORS.surfaceCard,
                    border: `1px solid ${COLORS.borderDefault}`,
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
                    zIndex: 1000,
                    padding: '6px'
                  }}
                >
                  {WORKSTREAMS.map((ws) => (
                    <div
                      key={ws}
                      onClick={() => {
                        handleFieldChange('workstream', ws);
                        setOpenDropdown(null);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        backgroundColor: editedTask.workstream === ws ? COLORS.accentLight : 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        if (editedTask.workstream !== ws) {
                          e.currentTarget.style.backgroundColor = COLORS.surfaceHover;
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = editedTask.workstream === ws ? COLORS.accentLight : 'transparent';
                      }}
                    >
                      <span
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: WORKSTREAM_COLORS[ws],
                          flexShrink: 0
                        }}
                      />
                      <span style={{ fontSize: '14px', color: COLORS.textPrimary }}>{ws}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ASSIGNEE DROPDOWN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: COLORS.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                Assignee
              </span>
              <div
                className="dropdown-trigger"
                onClick={(e) => toggleDropdown('assignee', e)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  backgroundColor: COLORS.surfaceCard,
                  border: `1px solid ${openDropdown === 'assignee' ? COLORS.borderFocus : COLORS.borderLight}`,
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: openDropdown === 'assignee' ? `0 0 0 3px rgba(59, 130, 246, 0.15)` : 'none'
                }}
              >
                <span
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    backgroundColor: editedTask.assignee?.color || '#94a3b8',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  {editedTask.assignee?.initials || '?'}
                </span>
                <span style={{ fontSize: '14px', fontWeight: 500, color: COLORS.textPrimary, flex: 1 }}>
                  {editedTask.assignee?.name || 'Unassigned'}
                </span>
                <ChevronDown 
                  size={16} 
                  style={{ 
                    color: COLORS.textLight,
                    transition: 'transform 0.2s ease',
                    transform: openDropdown === 'assignee' ? 'rotate(180deg)' : 'rotate(0deg)'
                  }} 
                />
              </div>
              {openDropdown === 'assignee' && (
                <div
                  className="dropdown-menu"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    backgroundColor: COLORS.surfaceCard,
                    border: `1px solid ${COLORS.borderDefault}`,
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
                    zIndex: 1000,
                    padding: '6px'
                  }}
                >
                  {ASSIGNEES.map((assignee) => (
                    <div
                      key={assignee.name}
                      onClick={() => {
                        handleFieldChange('assignee', assignee.name === 'Unassigned' ? undefined : assignee);
                        setOpenDropdown(null);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        backgroundColor: editedTask.assignee?.name === assignee.name ? COLORS.accentLight : 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        if (editedTask.assignee?.name !== assignee.name) {
                          e.currentTarget.style.backgroundColor = COLORS.surfaceHover;
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = editedTask.assignee?.name === assignee.name ? COLORS.accentLight : 'transparent';
                      }}
                    >
                      <span
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          backgroundColor: assignee.color,
                          color: 'white',
                          fontSize: '11px',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {assignee.initials}
                      </span>
                      <span style={{ fontSize: '14px', color: COLORS.textPrimary }}>{assignee.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ==================== TABS ==================== */}
          <div
            style={{
              display: 'flex',
              padding: '0 28px',
              borderBottom: `1px solid ${COLORS.borderLight}`,
              backgroundColor: COLORS.surfaceCard,
              overflowX: 'auto'
            }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '16px 18px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: activeTab === tab.id ? COLORS.accent : COLORS.textMuted,
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  whiteSpace: 'nowrap',
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.color = COLORS.textSecondary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.color = COLORS.textMuted;
                  }
                }}
              >
                {tab.label}
                {tab.badge && tab.badge > 0 && (
                  <span
                    style={{
                      minWidth: '20px',
                      height: '20px',
                      padding: '0 6px',
                      backgroundColor: activeTab === tab.id ? COLORS.accentLight : COLORS.surfaceHover,
                      color: activeTab === tab.id ? COLORS.accent : COLORS.textMuted,
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {tab.badge}
                  </span>
                )}
                {activeTab === tab.id && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-1px',
                      left: 0,
                      right: 0,
                      height: '2px',
                      backgroundColor: COLORS.accent
                    }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* ==================== CONTENT AREA ==================== */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '28px'
            }}
          >
            {/* DESCRIPTION TAB */}
            {activeTab === 'description' && (
              <div>
                {/* NO "Description" HEADER — Just the textarea */}
                <textarea
                  placeholder="What is this task about? Add context, requirements, or notes..."
                  value={editedTask.description || ''}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: '160px',
                    padding: '16px 18px',
                    border: `1px solid ${COLORS.borderDefault}`,
                    borderRadius: '12px',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif',
                    fontSize: '14px',
                    lineHeight: 1.6,
                    color: COLORS.textPrimary,
                    backgroundColor: COLORS.surfaceCard,
                    resize: 'vertical',
                    outline: 'none',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = COLORS.borderFocus;
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = COLORS.borderDefault;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />

                {/* FIELDS ROW */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '20px',
                    marginTop: '28px'
                  }}
                >
                  {/* Priority Field */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: COLORS.textMuted,
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em'
                      }}
                    >
                      Priority
                    </label>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '12px 14px',
                        backgroundColor: COLORS.surfaceCard,
                        border: `1px solid ${COLORS.borderDefault}`,
                        borderRadius: '10px',
                        cursor: 'pointer'
                      }}
                    >
                      <span
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: PRIORITY_COLORS[editedTask.priority],
                          flexShrink: 0
                        }}
                      />
                      <span style={{ flex: 1, fontSize: '14px', color: COLORS.textPrimary }}>
                        {editedTask.priority}
                      </span>
                      <ChevronDown size={16} style={{ color: COLORS.textLight }} />
                    </div>
                  </div>

                  {/* Due Date Field */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: COLORS.textMuted,
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em'
                      }}
                    >
                      Due Date
                    </label>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '12px 14px',
                        backgroundColor: COLORS.surfaceCard,
                        border: `1px solid ${COLORS.borderDefault}`,
                        borderRadius: '10px',
                        cursor: 'pointer'
                      }}
                    >
                      <Calendar size={18} style={{ color: COLORS.textLight, flexShrink: 0 }} />
                      <span
                        style={{
                          flex: 1,
                          fontSize: '14px',
                          color: editedTask.dueDate ? COLORS.textPrimary : COLORS.textLight
                        }}
                      >
                        {editedTask.dueDate || 'Set due date...'}
                      </span>
                      <ChevronDown size={16} style={{ color: COLORS.textLight }} />
                    </div>
                  </div>

                  {/* Start Date Field */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: COLORS.textMuted,
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em'
                      }}
                    >
                      Start Date
                    </label>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '12px 14px',
                        backgroundColor: COLORS.surfaceCard,
                        border: `1px solid ${COLORS.borderDefault}`,
                        borderRadius: '10px',
                        cursor: 'pointer'
                      }}
                    >
                      <Calendar size={18} style={{ color: COLORS.textLight, flexShrink: 0 }} />
                      <span
                        style={{
                          flex: 1,
                          fontSize: '14px',
                          color: editedTask.startDate ? COLORS.textPrimary : COLORS.textLight
                        }}
                      >
                        {editedTask.startDate || 'Set start date...'}
                      </span>
                      <ChevronDown size={16} style={{ color: COLORS.textLight }} />
                    </div>
                  </div>
                </div>

                {/* ADD LABELS BUTTON */}
                <div style={{ marginTop: '28px' }}>
                  <button
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px 18px',
                      backgroundColor: COLORS.surfaceHover,
                      border: `2px dashed ${COLORS.borderDefault}`,
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: COLORS.textMuted,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = COLORS.accentLight;
                      e.currentTarget.style.borderColor = COLORS.accent;
                      e.currentTarget.style.borderStyle = 'solid';
                      e.currentTarget.style.color = COLORS.accent;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = COLORS.surfaceHover;
                      e.currentTarget.style.borderColor = COLORS.borderDefault;
                      e.currentTarget.style.borderStyle = 'dashed';
                      e.currentTarget.style.color = COLORS.textMuted;
                    }}
                  >
                    <Tag size={18} />
                    Add labels
                  </button>
                </div>
              </div>
            )}

            {/* NOTES TAB */}
            {activeTab === 'notes' && (
              <div>
                {/* Permission Banner */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '14px 18px',
                    backgroundColor: COLORS.warningBg,
                    border: `1px solid ${COLORS.warningBorder}`,
                    borderRadius: '10px',
                    marginBottom: '24px'
                  }}
                >
                  <Lock size={20} style={{ color: COLORS.warningIcon, flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', color: COLORS.warningText }}>
                    Visible to all · Editable by leads and management
                  </span>
                </div>

                {/* Note Composer */}
                <div
                  style={{
                    border: `1px solid ${COLORS.borderDefault}`,
                    borderRadius: '12px',
                    overflow: 'hidden',
                    marginBottom: '24px'
                  }}
                >
                  <div style={{ display: 'flex', gap: '14px', padding: '18px' }}>
                    <span
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: COLORS.accent,
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      CU
                    </span>
                    <textarea
                      placeholder="Add a note for the team..."
                      style={{
                        flex: 1,
                        minHeight: '70px',
                        border: 'none',
                        fontFamily: 'inherit',
                        fontSize: '14px',
                        lineHeight: 1.5,
                        color: COLORS.textPrimary,
                        resize: 'none',
                        backgroundColor: 'transparent',
                        outline: 'none'
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      padding: '14px 18px',
                      backgroundColor: COLORS.surfacePage,
                      borderTop: `1px solid ${COLORS.borderLight}`
                    }}
                  >
                    <button
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 20px',
                        backgroundColor: COLORS.accent,
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        fontFamily: 'inherit'
                      }}
                    >
                      <Send size={16} />
                      Add Note
                    </button>
                  </div>
                </div>

                {/* Empty State */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '48px 24px',
                    backgroundColor: COLORS.surfacePage,
                    border: `2px dashed ${COLORS.borderDefault}`,
                    borderRadius: '12px',
                    textAlign: 'center'
                  }}
                >
                  <FileText size={52} style={{ color: COLORS.textLight, marginBottom: '16px' }} />
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: COLORS.textSecondary, margin: '0 0 6px 0' }}>
                    No notes yet
                  </h3>
                  <p style={{ fontSize: '14px', color: COLORS.textMuted, margin: 0 }}>
                    Add the first note for your team
                  </p>
                </div>
              </div>
            )}

            {/* CHECKLIST TAB */}
            {activeTab === 'checklist' && (
              <div>
                {/* Progress Header */}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{ fontSize: '14px', color: COLORS.textMuted }}>
                      {completedCount} of {checklist.length} complete ({progressPercent}%)
                    </span>
                    <div
                      style={{
                        width: '140px',
                        height: '8px',
                        backgroundColor: COLORS.borderLight,
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}
                    >
                      <div
                        style={{
                          width: `${progressPercent}%`,
                          height: '100%',
                          backgroundColor: COLORS.accent,
                          borderRadius: '4px',
                          transition: 'width 0.3s ease'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Checklist Items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                  {checklist.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        padding: '14px 16px',
                        backgroundColor: item.completed ? COLORS.surfacePage : COLORS.surfaceCard,
                        border: `1px solid ${COLORS.borderLight}`,
                        borderRadius: '10px',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = COLORS.borderDefault;
                        if (!item.completed) e.currentTarget.style.backgroundColor = COLORS.surfaceHover;
                        setHoveredItem(item.id);
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = COLORS.borderLight;
                        e.currentTarget.style.backgroundColor = item.completed ? COLORS.surfacePage : COLORS.surfaceCard;
                        setHoveredItem(null);
                      }}
                    >
                      <div
                        onClick={() => toggleChecklistItem(item.id)}
                        style={{
                          width: '22px',
                          height: '22px',
                          border: `2px solid ${item.completed ? COLORS.accent : COLORS.borderDefault}`,
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: item.completed ? COLORS.accent : COLORS.surfaceCard,
                          flexShrink: 0,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {item.completed && <Check size={14} style={{ color: 'white' }} />}
                      </div>
                      <span
                        style={{
                          flex: 1,
                          fontSize: '14px',
                          color: item.completed ? COLORS.textMuted : COLORS.textPrimary,
                          textDecoration: item.completed ? 'line-through' : 'none'
                        }}
                      >
                        {item.text}
                      </span>
                      <div
                        style={{
                          display: 'flex',
                          gap: '4px',
                          opacity: hoveredItem === item.id ? 1 : 0,
                          transition: 'opacity 0.15s ease'
                        }}
                      >
                        <button
                          style={{
                            width: '30px',
                            height: '30px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'transparent',
                            border: 'none',
                            borderRadius: '6px',
                            color: COLORS.textLight,
                            cursor: 'pointer'
                          }}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => deleteChecklistItem(item.id)}
                          style={{
                            width: '30px',
                            height: '30px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'transparent',
                            border: 'none',
                            borderRadius: '6px',
                            color: COLORS.textLight,
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Item Input */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '14px 16px',
                    backgroundColor: COLORS.surfacePage,
                    border: `2px dashed ${COLORS.borderDefault}`,
                    borderRadius: '10px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div
                    style={{
                      width: '22px',
                      height: '22px',
                      backgroundColor: COLORS.accent,
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      flexShrink: 0
                    }}
                  >
                    <Plus size={14} />
                  </div>
                  <input
                    type="text"
                    placeholder="Add checklist item..."
                    value={newChecklistItem}
                    onChange={(e) => setNewChecklistItem(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addChecklistItem()}
                    style={{
                      flex: 1,
                      border: 'none',
                      backgroundColor: 'transparent',
                      fontSize: '14px',
                      color: COLORS.textPrimary,
                      fontFamily: 'inherit',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            )}

            {/* LINKS TAB */}
            {activeTab === 'links' && (
              <div>
                {/* Add Link Form */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginBottom: '24px' }}>
                  <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: COLORS.textMuted, textTransform: 'uppercase' }}>
                      URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://example.com"
                      value={newLinkUrl}
                      onChange={(e) => setNewLinkUrl(e.target.value)}
                      style={{
                        padding: '12px 14px',
                        border: `1px solid ${COLORS.borderDefault}`,
                        borderRadius: '10px',
                        fontSize: '14px',
                        color: COLORS.textPrimary,
                        backgroundColor: COLORS.surfaceCard,
                        fontFamily: 'inherit',
                        outline: 'none'
                      }}
                    />
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: COLORS.textMuted, textTransform: 'uppercase' }}>
                      Title (optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Link title"
                      value={newLinkTitle}
                      onChange={(e) => setNewLinkTitle(e.target.value)}
                      style={{
                        padding: '12px 14px',
                        border: `1px solid ${COLORS.borderDefault}`,
                        borderRadius: '10px',
                        fontSize: '14px',
                        color: COLORS.textPrimary,
                        backgroundColor: COLORS.surfaceCard,
                        fontFamily: 'inherit',
                        outline: 'none'
                      }}
                    />
                  </div>
                  <button
                    onClick={addLink}
                    style={{
                      padding: '12px 20px',
                      backgroundColor: COLORS.accent,
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      fontFamily: 'inherit'
                    }}
                  >
                    Add Link
                  </button>
                </div>

                {/* Links List */}
                {links.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {links.map((link) => (
                      <div
                        key={link.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                          padding: '16px 18px',
                          backgroundColor: COLORS.surfaceCard,
                          border: `1px solid ${COLORS.borderLight}`,
                          borderRadius: '10px',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = COLORS.borderDefault;
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
                          setHoveredItem(link.id);
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = COLORS.borderLight;
                          e.currentTarget.style.boxShadow = 'none';
                          setHoveredItem(null);
                        }}
                      >
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            backgroundColor: COLORS.accentLight,
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          <Link2 size={20} style={{ color: COLORS.accent }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '14px', fontWeight: 500, color: COLORS.textPrimary, marginBottom: '4px' }}>
                            {link.title}
                          </div>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: '13px',
                              color: COLORS.accent,
                              textDecoration: 'none',
                              display: 'block',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {link.url}
                          </a>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            gap: '4px',
                            opacity: hoveredItem === link.id ? 1 : 0,
                            transition: 'opacity 0.15s ease'
                          }}
                        >
                          <button
                            onClick={() => window.open(link.url, '_blank')}
                            style={{
                              width: '30px',
                              height: '30px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: 'transparent',
                              border: 'none',
                              borderRadius: '6px',
                              color: COLORS.textLight,
                              cursor: 'pointer'
                            }}
                          >
                            <ExternalLink size={16} />
                          </button>
                          <button
                            onClick={() => deleteLink(link.id)}
                            style={{
                              width: '30px',
                              height: '30px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: 'transparent',
                              border: 'none',
                              borderRadius: '6px',
                              color: COLORS.textLight,
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '48px 24px',
                      backgroundColor: COLORS.surfacePage,
                      border: `2px dashed ${COLORS.borderDefault}`,
                      borderRadius: '12px',
                      textAlign: 'center'
                    }}
                  >
                    <Link2 size={52} style={{ color: COLORS.textLight, marginBottom: '16px' }} />
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: COLORS.textSecondary, margin: '0 0 6px 0' }}>
                      No links yet
                    </h3>
                    <p style={{ fontSize: '14px', color: COLORS.textMuted, margin: 0 }}>
                      Add links to relevant resources
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* FILES TAB */}
            {activeTab === 'files' && (
              <div>
                {/* Upload Zone — CENTERED */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    padding: '40px',
                    border: `2px dashed ${COLORS.borderDefault}`,
                    borderRadius: '12px',
                    textAlign: 'center',
                    marginBottom: '24px',
                    cursor: 'pointer',
                    backgroundColor: COLORS.surfacePage,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = COLORS.accent;
                    e.currentTarget.style.backgroundColor = COLORS.accentLight;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = COLORS.borderDefault;
                    e.currentTarget.style.backgroundColor = COLORS.surfacePage;
                  }}
                >
                  <Upload size={48} style={{ color: COLORS.textLight, marginBottom: '16px' }} />
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: COLORS.textSecondary, margin: '0 0 6px 0' }}>
                    Drop files here to upload
                  </h3>
                  <p style={{ fontSize: '14px', color: COLORS.textMuted, margin: 0 }}>
                    or <span style={{ color: COLORS.accent, fontWeight: 500 }}>browse</span> to choose files
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                  />
                </div>

                {/* Files List */}
                {files.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {files.map((file) => {
                      const iconBg = file.type === 'pdf' ? COLORS.filePdfBg : file.type === 'doc' ? COLORS.fileDocBg : file.type === 'img' ? COLORS.fileImgBg : COLORS.surfacePage;
                      const iconColor = file.type === 'pdf' ? COLORS.filePdfIcon : file.type === 'doc' ? COLORS.fileDocIcon : file.type === 'img' ? COLORS.fileImgIcon : COLORS.textMuted;
                      
                      return (
                        <div
                          key={file.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '14px',
                            padding: '16px 18px',
                            backgroundColor: COLORS.surfaceCard,
                            border: `1px solid ${COLORS.borderLight}`,
                            borderRadius: '10px',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = COLORS.borderDefault;
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
                            setHoveredItem(file.id);
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = COLORS.borderLight;
                            e.currentTarget.style.boxShadow = 'none';
                            setHoveredItem(null);
                          }}
                        >
                          <div
                            style={{
                              width: '44px',
                              height: '44px',
                              backgroundColor: iconBg,
                              borderRadius: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                          >
                            <FileText size={22} style={{ color: iconColor }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '14px', fontWeight: 500, color: COLORS.textPrimary, marginBottom: '4px' }}>
                              {file.name}
                            </div>
                            <div style={{ fontSize: '13px', color: COLORS.textMuted }}>
                              {file.size} · {file.uploadedAt}
                            </div>
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              gap: '4px',
                              opacity: hoveredItem === file.id ? 1 : 0,
                              transition: 'opacity 0.15s ease'
                            }}
                          >
                            <button
                              style={{
                                width: '30px',
                                height: '30px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: 'transparent',
                                border: 'none',
                                borderRadius: '6px',
                                color: COLORS.textLight,
                                cursor: 'pointer'
                              }}
                            >
                              <Download size={16} />
                            </button>
                            <button
                              onClick={() => deleteFile(file.id)}
                              style={{
                                width: '30px',
                                height: '30px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: 'transparent',
                                border: 'none',
                                borderRadius: '6px',
                                color: COLORS.textLight,
                                cursor: 'pointer'
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ACTIVITY TAB */}
            {activeTab === 'activity' && (
              <div>
                {/* Filter Buttons */}
                <div
                  style={{
                    display: 'flex',
                    backgroundColor: COLORS.surfacePage,
                    borderRadius: '10px',
                    padding: '4px',
                    marginBottom: '24px'
                  }}
                >
                  {[
                    { id: 'all', label: 'All', icon: List },
                    { id: 'comments', label: 'Comments', icon: MessageSquare },
                    { id: 'history', label: 'History', icon: Clock }
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setActivityFilter(id as any)}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '12px 16px',
                        backgroundColor: activityFilter === id ? COLORS.surfaceCard : 'transparent',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 500,
                        color: activityFilter === id ? COLORS.textPrimary : COLORS.textMuted,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        boxShadow: activityFilter === id ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Icon size={16} />
                      {label}
                    </button>
                  ))}
                </div>

                {/* Comments */}
                {(activityFilter === 'all' || activityFilter === 'comments') && comments.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
                    {comments.map((comment) => (
                      <div key={comment.id} style={{ display: 'flex', gap: '14px' }}>
                        <span
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            backgroundColor: comment.authorColor,
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          {comment.authorInitials}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 600, color: COLORS.textPrimary }}>
                              {comment.author}
                            </span>
                            <span style={{ fontSize: '13px', color: COLORS.textLight }}>
                              {comment.createdAt}
                            </span>
                          </div>
                          <div
                            style={{
                              padding: '14px 18px',
                              backgroundColor: COLORS.surfacePage,
                              borderRadius: '10px',
                              fontSize: '14px',
                              lineHeight: 1.5,
                              color: COLORS.textSecondary
                            }}
                          >
                            {comment.content}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* History */}
                {(activityFilter === 'all' || activityFilter === 'history') && (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {history.map((event, idx) => (
                      <div
                        key={event.id}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '14px',
                          padding: '16px 0',
                          borderBottom: idx < history.length - 1 ? `1px solid ${COLORS.borderLight}` : 'none'
                        }}
                      >
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            backgroundColor: COLORS.surfacePage,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          <Clock size={16} style={{ color: COLORS.textMuted }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', color: COLORS.textSecondary, lineHeight: 1.5 }}>
                            <strong style={{ color: COLORS.textPrimary, fontWeight: 600 }}>{event.action}</strong>
                            {' by '}
                            <strong style={{ color: COLORS.textPrimary, fontWeight: 600 }}>{event.author}</strong>
                          </div>
                          <div style={{ fontSize: '13px', color: COLORS.textLight, marginTop: '4px' }}>
                            {event.timestamp}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Comment Composer */}
                <div style={{ display: 'flex', gap: '14px', marginTop: '24px' }}>
                  <span
                    style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: COLORS.accent,
                      borderRadius: '50%',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    CU
                  </span>
                  <div
                    style={{
                      flex: 1,
                      border: `1px solid ${COLORS.borderDefault}`,
                      borderRadius: '14px',
                      overflow: 'hidden'
                    }}
                  >
                    <textarea
                      placeholder="Write a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      style={{
                        width: '100%',
                        minHeight: '90px',
                        padding: '16px 18px',
                        border: 'none',
                        fontFamily: 'inherit',
                        fontSize: '14px',
                        lineHeight: 1.5,
                        color: COLORS.textPrimary,
                        resize: 'none',
                        backgroundColor: 'transparent',
                        outline: 'none'
                      }}
                    />
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        padding: '12px 16px',
                        backgroundColor: COLORS.surfacePage,
                        borderTop: `1px solid ${COLORS.borderLight}`
                      }}
                    >
                      <button
                        onClick={addComment}
                        style={{
                          width: '40px',
                          height: '40px',
                          backgroundColor: COLORS.accent,
                          border: 'none',
                          borderRadius: '50%',
                          color: 'white',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Send size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ==================== FOOTER ==================== */}
          <div
            style={{
              padding: '16px 28px',
              backgroundColor: COLORS.surfacePage,
              borderTop: `1px solid ${COLORS.borderLight}`
            }}
          >
            <span style={{ fontSize: '13px', color: COLORS.textMuted }}>
              Created <strong style={{ fontWeight: 600, color: COLORS.textSecondary }}>{editedTask.createdAt || 'Unknown'}</strong>
              {' · '}
              Updated <strong style={{ fontWeight: 600, color: COLORS.textSecondary }}>{editedTask.updatedAt || 'Just now'}</strong>
            </span>
          </div>
        </div>
      </div>
    </>
  );
};

export default TaskDetailModal;
