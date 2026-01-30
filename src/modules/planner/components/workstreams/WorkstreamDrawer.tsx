// ============================================================================
// WORKSTREAM DRAWER - Enterprise Grade Implementation with Inline Styles
// Preserves all existing functionality with pixel-perfect UI revamp
// ============================================================================

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Edit2,
  Archive,
  ArchiveRestore,
  Trash2,
  AlertTriangle,
  Check,
  ChevronDown,
  Search,
  UserPlus,
  Calendar,
  LayoutGrid,
  List,
} from 'lucide-react';
import {
  Workstream,
  useUpdateWorkstream,
  useAddWorkstreamMember,
  useRemoveWorkstreamMember,
  useDeleteWorkstream,
  useArchiveWorkstream,
} from '../../hooks/usePlannerWorkstreams';
import { useResourceInventory, Resource } from '../../hooks/useResourceInventory';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ============================================================================
// COLOR CONSTANTS - CATALYST V5 DESIGN SYSTEM
// ============================================================================

const COLORS = {
  textPrimary: '#0f172a',
  textSecondary: '#334155',
  textMuted: '#64748b',
  textLight: '#94a3b8',
  textPlaceholder: '#9ca3af',
  surfaceCard: '#ffffff',
  surfacePage: '#f8fafc',
  surfaceHover: '#f1f5f9',
  surfaceSelected: '#dbeafe',
  borderLight: '#e2e8f0',
  borderDefault: '#cbd5e1',
  borderFocus: '#3b82f6',
  accent: '#2563eb',
  accentHover: '#1d4ed8',
  accentLight: '#dbeafe',
  success: '#16a34a',
  successBg: '#f0fdf4',
  successBorder: '#bbf7d0',
  warning: '#f59e0b',
  warningBg: '#fffbeb',
  warningBorder: '#fde68a',
  danger: '#dc2626',
  dangerBg: '#fef2f2',
  dangerBorder: '#fecaca',
};

const HEALTH_CONFIG = {
  healthy: {
    color: COLORS.success,
    bgColor: COLORS.successBg,
    borderColor: COLORS.successBorder,
    label: 'On Track',
  },
  'at-risk': {
    color: COLORS.warning,
    bgColor: COLORS.warningBg,
    borderColor: COLORS.warningBorder,
    label: 'At Risk',
  },
  critical: {
    color: COLORS.danger,
    bgColor: COLORS.dangerBg,
    borderColor: COLORS.dangerBorder,
    label: 'Critical',
  },
  locked: {
    color: COLORS.textMuted,
    bgColor: COLORS.surfacePage,
    borderColor: COLORS.borderLight,
    label: 'Locked',
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const getInitials = (name: string): string => {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// ============================================================================
// TYPES
// ============================================================================

interface WorkstreamDrawerProps {
  workstream: Workstream | null;
  isOpen: boolean;
  onClose: () => void;
}

// ============================================================================
// MEMBER ITEM SUB-COMPONENT
// ============================================================================

const MemberItem: React.FC<{
  member: { id: string; name: string; initials: string; role: string; avatarColor: string };
  onRemove: () => void;
}> = ({ member, onRemove }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 12px',
        backgroundColor: COLORS.surfacePage,
        border: `1px solid ${COLORS.borderLight}`,
        borderRadius: '10px',
        transition: 'background-color 0.15s ease',
      }}
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          backgroundColor: member.avatarColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '13px',
          fontWeight: 600,
          color: '#ffffff',
          flexShrink: 0,
        }}
      >
        {member.initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: COLORS.textPrimary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {member.name}
        </div>
        <div
          style={{
            fontSize: '12px',
            color: COLORS.textMuted,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {member.role}
        </div>
      </div>
      {isHovered && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          style={{
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            color: COLORS.textLight,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = COLORS.dangerBg;
            e.currentTarget.style.color = COLORS.danger;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = COLORS.textLight;
          }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT: WorkstreamDrawer
// ============================================================================

export function WorkstreamDrawer({ workstream, isOpen, onClose }: WorkstreamDrawerProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const prefixInputRef = useRef<HTMLInputElement>(null);
  const leadPickerRef = useRef<HTMLDivElement>(null);
  const memberPickerRef = useRef<HTMLDivElement>(null);

  // Rename mode
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameName, setRenameName] = useState('');

  // Key prefix edit mode
  const [isEditingPrefix, setIsEditingPrefix] = useState(false);
  const [editPrefix, setEditPrefix] = useState('');

  // Picker states
  const [showLeadPicker, setShowLeadPicker] = useState(false);
  const [showMemberPicker, setShowMemberPicker] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [leadSearch, setLeadSearch] = useState('');

  // Delete confirmation
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Save indicator
  const [showSaveIndicator, setShowSaveIndicator] = useState(false);

  // Active tab for footer
  const [activeTab, setActiveTab] = useState<'list' | 'board' | 'calendar'>('list');

  const { data: resources = [] } = useResourceInventory();
  const updateWorkstream = useUpdateWorkstream();
  const addMember = useAddWorkstreamMember();
  const removeMember = useRemoveWorkstreamMember();
  const deleteWorkstream = useDeleteWorkstream();
  const archiveWorkstream = useArchiveWorkstream();

  // Reset state when workstream changes
  useEffect(() => {
    if (workstream) {
      setRenameName(workstream.name);
      setEditPrefix(workstream.key_prefix || workstream.code || '');
      setIsRenaming(false);
      setIsEditingPrefix(false);
      setShowMemberPicker(false);
      setShowLeadPicker(false);
      setMemberSearch('');
      setLeadSearch('');
    }
  }, [workstream?.id]);

  // Focus input when renaming starts
  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  // Focus prefix input when editing starts
  useEffect(() => {
    if (isEditingPrefix && prefixInputRef.current) {
      prefixInputRef.current.focus();
      prefixInputRef.current.select();
    }
  }, [isEditingPrefix]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (leadPickerRef.current && !leadPickerRef.current.contains(e.target as Node)) {
        setShowLeadPicker(false);
        setLeadSearch('');
      }
      if (memberPickerRef.current && !memberPickerRef.current.contains(e.target as Node)) {
        setShowMemberPicker(false);
        setMemberSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Escape key handling
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showLeadPicker) setShowLeadPicker(false);
        else if (showMemberPicker) setShowMemberPicker(false);
        else onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, showLeadPicker, showMemberPicker, onClose]);

  if (!workstream) return null;

  const healthConfig = HEALTH_CONFIG[workstream.health || 'healthy'];

  // Get existing member IDs
  const existingMemberIds = new Set(workstream.members?.map((m) => m.user_id) || []);

  // Filter available resources (not already members)
  const availableResources = resources.filter(
    (r) =>
      r.profile_id &&
      !existingMemberIds.has(r.profile_id) &&
      r.name.toLowerCase().includes(memberSearch.toLowerCase())
  );

  // All resources for lead picker
  const allResourcesForLead = resources.filter(
    (r) => r.profile_id && r.name.toLowerCase().includes(leadSearch.toLowerCase())
  );

  // Members list with formatted data
  const formattedMembers = (workstream.members || [])
    .filter((m) => m.role !== 'lead')
    .map((m) => ({
      id: m.id,
      name: m.profile?.full_name || 'Unknown',
      initials: getInitials(m.profile?.full_name || 'U'),
      role: 'Team Member',
      avatarColor: workstream.color || COLORS.accent,
      userId: m.user_id,
    }));

  // Rename handlers
  const handleRenameStart = () => {
    setRenameName(workstream.name);
    setIsRenaming(true);
  };

  const handleRenameSave = async () => {
    if (renameName.trim() && renameName !== workstream.name) {
      await updateWorkstream.mutateAsync({
        id: workstream.id,
        updates: { name: renameName.trim() },
      });
      setShowSaveIndicator(true);
      setTimeout(() => setShowSaveIndicator(false), 3000);
    }
    setIsRenaming(false);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRenameSave();
    else if (e.key === 'Escape') {
      setRenameName(workstream.name);
      setIsRenaming(false);
    }
  };

  // Key prefix handlers
  const handlePrefixStart = () => {
    setEditPrefix(workstream.key_prefix || workstream.code || '');
    setIsEditingPrefix(true);
  };

  const handlePrefixSave = async () => {
    const cleanPrefix = editPrefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
    if (cleanPrefix && cleanPrefix !== workstream.key_prefix) {
      await updateWorkstream.mutateAsync({
        id: workstream.id,
        updates: { key_prefix: cleanPrefix },
      });
      setShowSaveIndicator(true);
      setTimeout(() => setShowSaveIndicator(false), 3000);
    }
    setIsEditingPrefix(false);
  };

  const handlePrefixKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handlePrefixSave();
    else if (e.key === 'Escape') {
      setEditPrefix(workstream.key_prefix || workstream.code || '');
      setIsEditingPrefix(false);
    }
  };

  // Add member handler
  const handleAddMember = async (resource: Resource) => {
    if (!resource.profile_id) return;
    await addMember.mutateAsync({
      workstreamId: workstream.id,
      userId: resource.profile_id,
      role: 'member',
    });
    setMemberSearch('');
    setShowMemberPicker(false);
    setShowSaveIndicator(true);
    setTimeout(() => setShowSaveIndicator(false), 3000);
  };

  // Change lead handler
  const handleChangeLead = async (resource: Resource | null) => {
    await addMember.mutateAsync({
      workstreamId: workstream.id,
      userId: resource?.profile_id || '',
      role: 'lead',
    });
    setShowLeadPicker(false);
    setLeadSearch('');
    setShowSaveIndicator(true);
    setTimeout(() => setShowSaveIndicator(false), 3000);
  };

  // Remove member handler
  const handleRemoveMember = async (userId: string) => {
    await removeMember.mutateAsync({
      workstreamId: workstream.id,
      userId,
    });
    setShowSaveIndicator(true);
    setTimeout(() => setShowSaveIndicator(false), 3000);
  };

  // Delete handler
  const handleDelete = async () => {
    await deleteWorkstream.mutateAsync(workstream.id);
    setIsDeleteOpen(false);
    onClose();
  };

  // Archive handler
  const handleArchive = async () => {
    await archiveWorkstream.mutateAsync({
      id: workstream.id,
      archive: !workstream.is_archived,
    });
    onClose();
  };

  // Navigation handlers
  const navigateToTasks = () => {
    navigate(`/planner/task-list?workstream=${encodeURIComponent(workstream.slug || workstream.id)}`);
    onClose();
  };

  const navigateToBoard = () => {
    navigate(`/planner/boards?workstream=${encodeURIComponent(workstream.slug || workstream.id)}`);
    onClose();
  };

  const navigateToCalendar = () => {
    navigate(`/planner/calendar?workstream=${encodeURIComponent(workstream.slug || workstream.id)}`);
    onClose();
  };

  const canDelete = (workstream.taskCount || 0) === 0;

  return createPortal(
    <>
      {/* BACKDROP */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          zIndex: 998,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.2s ease',
        }}
      />

      {/* DRAWER CONTAINER */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '480px',
          height: '100vh',
          backgroundColor: COLORS.surfaceCard,
          boxShadow: '-8px 0 30px rgba(0, 0, 0, 0.15)',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s ease',
        }}
      >
        {/* HEADER */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: `1px solid ${COLORS.borderLight}`,
            backgroundColor: COLORS.surfaceCard,
          }}
        >
          {/* TOP ROW: Title + Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            {/* LEFT: Health dot + Title */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: workstream.color || healthConfig.color,
                  marginTop: '8px',
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                {isRenaming ? (
                  <input
                    ref={inputRef}
                    type="text"
                    value={renameName}
                    onChange={(e) => setRenameName(e.target.value)}
                    onBlur={handleRenameSave}
                    onKeyDown={handleRenameKeyDown}
                    style={{
                      width: '100%',
                      fontSize: '20px',
                      fontWeight: 600,
                      color: COLORS.textPrimary,
                      padding: '4px 8px',
                      backgroundColor: COLORS.surfacePage,
                      border: `2px solid ${COLORS.accent}`,
                      borderRadius: '6px',
                      outline: 'none',
                      fontFamily: 'inherit',
                    }}
                  />
                ) : (
                  <h1
                    style={{
                      fontSize: '20px',
                      fontWeight: 600,
                      color: COLORS.textPrimary,
                      margin: 0,
                      lineHeight: 1.3,
                    }}
                  >
                    {workstream.name}
                  </h1>
                )}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '4px',
                    fontSize: '13px',
                    color: COLORS.textMuted,
                  }}
                >
                  {isEditingPrefix ? (
                    <input
                      ref={prefixInputRef}
                      type="text"
                      value={editPrefix}
                      onChange={(e) => setEditPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5))}
                      onBlur={handlePrefixSave}
                      onKeyDown={handlePrefixKeyDown}
                      style={{
                        width: '60px',
                        fontSize: '13px',
                        fontWeight: 500,
                        fontFamily: 'ui-monospace, "SF Mono", Consolas, monospace',
                        color: COLORS.textSecondary,
                        padding: '2px 6px',
                        backgroundColor: COLORS.surfacePage,
                        border: `2px solid ${COLORS.accent}`,
                        borderRadius: '4px',
                        outline: 'none',
                      }}
                      maxLength={5}
                    />
                  ) : (
                    <button
                      onClick={handlePrefixStart}
                      style={{
                        fontFamily: 'ui-monospace, "SF Mono", Consolas, monospace',
                        fontWeight: 500,
                        color: COLORS.textSecondary,
                        backgroundColor: 'transparent',
                        border: 'none',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = COLORS.surfaceHover;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      title="Click to edit task key prefix"
                    >
                      {workstream.key_prefix || workstream.code}
                    </button>
                  )}
                  <span style={{ color: COLORS.textLight }}>·</span>
                  <span>Created {formatDate(workstream.created_at)}</span>
                </div>
              </div>
            </div>

            {/* RIGHT: Action Buttons */}
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                title="Edit workstream"
                onClick={handleRenameStart}
                style={{
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'transparent',
                  border: '1px solid transparent',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: COLORS.textMuted,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = COLORS.surfaceHover;
                  e.currentTarget.style.borderColor = COLORS.borderLight;
                  e.currentTarget.style.color = COLORS.textSecondary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.color = COLORS.textMuted;
                }}
              >
                <Edit2 size={18} />
              </button>

              <button
                title={workstream.is_archived ? 'Unarchive' : 'Archive'}
                onClick={handleArchive}
                style={{
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'transparent',
                  border: '1px solid transparent',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: COLORS.textMuted,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = COLORS.surfaceHover;
                  e.currentTarget.style.borderColor = COLORS.borderLight;
                  e.currentTarget.style.color = COLORS.textSecondary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.color = COLORS.textMuted;
                }}
              >
                {workstream.is_archived ? <ArchiveRestore size={18} /> : <Archive size={18} />}
              </button>

              <button
                title={canDelete ? 'Delete' : `Cannot delete: ${workstream.taskCount} task(s) linked`}
                onClick={() => canDelete && setIsDeleteOpen(true)}
                disabled={!canDelete}
                style={{
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'transparent',
                  border: '1px solid transparent',
                  borderRadius: '8px',
                  cursor: canDelete ? 'pointer' : 'not-allowed',
                  color: canDelete ? COLORS.textMuted : COLORS.borderDefault,
                  transition: 'all 0.15s ease',
                  opacity: canDelete ? 1 : 0.5,
                }}
                onMouseEnter={(e) => {
                  if (canDelete) {
                    e.currentTarget.style.backgroundColor = COLORS.dangerBg;
                    e.currentTarget.style.borderColor = COLORS.dangerBorder;
                    e.currentTarget.style.color = COLORS.danger;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.color = canDelete ? COLORS.textMuted : COLORS.borderDefault;
                }}
              >
                <Trash2 size={18} />
              </button>

              <button
                title="Close"
                onClick={onClose}
                style={{
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'transparent',
                  border: '1px solid transparent',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: COLORS.textMuted,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = COLORS.surfaceHover;
                  e.currentTarget.style.borderColor = COLORS.borderLight;
                  e.currentTarget.style.color = COLORS.textSecondary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.color = COLORS.textMuted;
                }}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* STATUS BANNER */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 16px',
              backgroundColor: healthConfig.bgColor,
              border: `1px solid ${healthConfig.borderColor}`,
              borderRadius: '10px',
              marginBottom: '12px',
            }}
          >
            <AlertTriangle size={20} style={{ color: healthConfig.color, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: healthConfig.color }}>
                {healthConfig.label}
              </div>
              <div style={{ fontSize: '12px', color: COLORS.textMuted, marginTop: '2px' }}>
                {workstream.overdueCount || 0} overdue · {workstream.taskCount || 0} tasks
              </div>
            </div>
          </div>

          {/* SAVE INDICATOR */}
          {showSaveIndicator && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: COLORS.success }}>
              <Check size={14} />
              <span>All changes saved</span>
            </div>
          )}
        </div>

        {/* BODY - SCROLLABLE CONTENT */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {/* DESCRIPTION SECTION */}
          <div style={{ marginBottom: '28px' }}>
            <span
              style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 600,
                color: COLORS.textMuted,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '12px',
              }}
            >
              Description
            </span>
            <p style={{ fontSize: '14px', color: COLORS.textSecondary, lineHeight: 1.6, margin: 0 }}>
              {workstream.description || 'No description provided'}
            </p>
          </div>

          {/* TEAM SECTION */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: COLORS.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Team
              </span>
              <span style={{ fontSize: '12px', color: COLORS.textLight }}>
                {workstream.memberCount || 0} members
              </span>
            </div>

            {/* LEAD PICKER */}
            <div ref={leadPickerRef} style={{ position: 'relative', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Lead
                </span>
                <button
                  onClick={() => setShowLeadPicker(!showLeadPicker)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 12px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = COLORS.surfaceHover; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  {workstream.lead ? (
                    <>
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: workstream.color || COLORS.accent,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          fontWeight: 600,
                          color: '#ffffff',
                        }}
                      >
                        {workstream.lead.initials}
                      </div>
                      <span style={{ fontSize: '14px', color: COLORS.textPrimary, fontWeight: 500 }}>
                        {workstream.lead.name}
                      </span>
                    </>
                  ) : (
                    <span style={{ fontSize: '14px', color: COLORS.textLight }}>Assign lead...</span>
                  )}
                  <ChevronDown size={14} style={{ color: COLORS.textLight, transform: showLeadPicker ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
                </button>
              </div>

              {showLeadPicker && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    right: 0,
                    width: '320px',
                    backgroundColor: COLORS.surfaceCard,
                    border: `1px solid ${COLORS.borderDefault}`,
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
                    zIndex: 100,
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ padding: '12px', borderBottom: `1px solid ${COLORS.borderLight}` }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        backgroundColor: COLORS.surfacePage,
                        borderRadius: '8px',
                        border: `1px solid ${COLORS.borderLight}`,
                      }}
                    >
                      <Search size={16} style={{ color: COLORS.textLight, flexShrink: 0 }} />
                      <input
                        type="text"
                        value={leadSearch}
                        onChange={(e) => setLeadSearch(e.target.value)}
                        placeholder="Search team members..."
                        autoFocus
                        style={{
                          flex: 1,
                          border: 'none',
                          backgroundColor: 'transparent',
                          fontSize: '14px',
                          color: COLORS.textPrimary,
                          outline: 'none',
                          fontFamily: 'inherit',
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ maxHeight: '280px', overflowY: 'auto', padding: '8px' }}>
                    {allResourcesForLead.length === 0 ? (
                      <div style={{ padding: '16px', textAlign: 'center', color: COLORS.textMuted, fontSize: '14px' }}>
                        No members found
                      </div>
                    ) : (
                      allResourcesForLead.map((resource) => (
                        <div
                          key={resource.id}
                          onClick={() => handleChangeLead(resource)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            backgroundColor: workstream.lead?.id === resource.profile_id ? COLORS.surfaceSelected : 'transparent',
                            transition: 'background-color 0.1s ease',
                            marginBottom: '2px',
                          }}
                          onMouseEnter={(e) => {
                            if (workstream.lead?.id !== resource.profile_id) {
                              e.currentTarget.style.backgroundColor = COLORS.surfaceHover;
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = workstream.lead?.id === resource.profile_id ? COLORS.surfaceSelected : 'transparent';
                          }}
                        >
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              backgroundColor: workstream.color || COLORS.accent,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '13px',
                              fontWeight: 600,
                              color: '#ffffff',
                              flexShrink: 0,
                            }}
                          >
                            {resource.initials}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '14px', fontWeight: 500, color: COLORS.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {resource.name}
                            </div>
                            <div style={{ fontSize: '12px', color: COLORS.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {resource.role}
                            </div>
                          </div>
                          {workstream.lead?.id === resource.profile_id && (
                            <Check size={18} style={{ color: COLORS.accent, flexShrink: 0 }} />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* MEMBERS LIST */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {formattedMembers.map((member) => (
                <MemberItem key={member.id} member={member} onRemove={() => handleRemoveMember(member.userId)} />
              ))}
            </div>

            {/* ADD MEMBER BUTTON */}
            <div ref={memberPickerRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setShowMemberPicker(!showMemberPicker)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '12px 16px',
                  marginTop: '12px',
                  backgroundColor: COLORS.surfaceCard,
                  border: `1.5px dashed ${COLORS.borderDefault}`,
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: COLORS.textMuted,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = COLORS.accentLight;
                  e.currentTarget.style.borderColor = COLORS.accent;
                  e.currentTarget.style.borderStyle = 'solid';
                  e.currentTarget.style.color = COLORS.accent;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = COLORS.surfaceCard;
                  e.currentTarget.style.borderColor = COLORS.borderDefault;
                  e.currentTarget.style.borderStyle = 'dashed';
                  e.currentTarget.style.color = COLORS.textMuted;
                }}
              >
                <UserPlus size={18} />
                Add Member
              </button>

              {showMemberPicker && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    left: 0,
                    right: 0,
                    backgroundColor: COLORS.surfaceCard,
                    border: `1px solid ${COLORS.borderDefault}`,
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
                    zIndex: 100,
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ padding: '12px', borderBottom: `1px solid ${COLORS.borderLight}` }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        backgroundColor: COLORS.surfacePage,
                        borderRadius: '8px',
                        border: `1px solid ${COLORS.borderLight}`,
                      }}
                    >
                      <Search size={16} style={{ color: COLORS.textLight, flexShrink: 0 }} />
                      <input
                        type="text"
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        placeholder="Search team members..."
                        autoFocus
                        style={{
                          flex: 1,
                          border: 'none',
                          backgroundColor: 'transparent',
                          fontSize: '14px',
                          color: COLORS.textPrimary,
                          outline: 'none',
                          fontFamily: 'inherit',
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ maxHeight: '280px', overflowY: 'auto', padding: '8px' }}>
                    {availableResources.length === 0 ? (
                      <div style={{ padding: '16px', textAlign: 'center', color: COLORS.textMuted, fontSize: '14px' }}>
                        {memberSearch ? 'No members found' : 'All users are already members'}
                      </div>
                    ) : (
                      availableResources.map((resource) => (
                        <div
                          key={resource.id}
                          onClick={() => handleAddMember(resource)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            backgroundColor: 'transparent',
                            transition: 'background-color 0.1s ease',
                            marginBottom: '2px',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = COLORS.surfaceHover; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              backgroundColor: workstream.color || COLORS.accent,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '13px',
                              fontWeight: 600,
                              color: '#ffffff',
                              flexShrink: 0,
                            }}
                          >
                            {resource.initials}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '14px', fontWeight: 500, color: COLORS.textPrimary }}>
                              {resource.name}
                            </div>
                            <div style={{ fontSize: '12px', color: COLORS.textMuted }}>
                              {resource.role}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* WORK SUMMARY SECTION */}
          <div style={{ marginBottom: '28px' }}>
            <span
              style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 600,
                color: COLORS.textMuted,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '12px',
              }}
            >
              Work Summary
            </span>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div style={{ padding: '16px', backgroundColor: COLORS.surfacePage, border: `1px solid ${COLORS.borderLight}`, borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 700, color: COLORS.textPrimary, lineHeight: 1 }}>
                  {workstream.taskCount || 0}
                </div>
                <div style={{ fontSize: '12px', color: COLORS.textMuted, marginTop: '4px' }}>
                  Total Tasks
                </div>
              </div>
              <div style={{ padding: '16px', backgroundColor: COLORS.surfacePage, border: `1px solid ${COLORS.borderLight}`, borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 700, color: (workstream.overdueCount || 0) > 0 ? COLORS.danger : COLORS.textPrimary, lineHeight: 1 }}>
                  {workstream.overdueCount || 0}
                </div>
                <div style={{ fontSize: '12px', color: COLORS.textMuted, marginTop: '4px' }}>
                  Overdue
                </div>
              </div>
              <div style={{ padding: '16px', backgroundColor: COLORS.surfacePage, border: `1px solid ${COLORS.borderLight}`, borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 700, color: COLORS.textPrimary, lineHeight: 1 }}>
                  {workstream.memberCount || 0}
                </div>
                <div style={{ fontSize: '12px', color: COLORS.textMuted, marginTop: '4px' }}>
                  Members
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div style={{ marginTop: '16px' }}>
              <div style={{ height: '8px', backgroundColor: COLORS.borderLight, borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${workstream.progress || 0}%`,
                    backgroundColor: COLORS.accent,
                    borderRadius: '4px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
              <div style={{ textAlign: 'right', marginTop: '8px', fontSize: '12px', color: COLORS.textMuted }}>
                {workstream.progress || 0}% complete
              </div>
            </div>
          </div>

          {/* ACTIVITY SECTION */}
          <div>
            <span
              style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 600,
                color: COLORS.textMuted,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '12px',
              }}
            >
              Activity
            </span>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: workstream.color || COLORS.accent,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#ffffff',
                  flexShrink: 0,
                }}
              >
                {workstream.lead?.initials || 'SY'}
              </div>
              <div style={{ flex: 1, paddingTop: '2px' }}>
                <div style={{ fontSize: '14px', color: COLORS.textSecondary, lineHeight: 1.4 }}>
                  <strong style={{ fontWeight: 600, color: COLORS.textPrimary }}>
                    {workstream.lead?.name || 'System'}
                  </strong>{' '}
                  created this workstream
                </div>
                <div style={{ fontSize: '12px', color: COLORS.textLight, marginTop: '4px' }}>
                  {new Date(workstream.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER - TAB BAR */}
        <div style={{ padding: '16px 24px', borderTop: `1px solid ${COLORS.borderLight}`, backgroundColor: COLORS.surfaceCard }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => { setActiveTab('list'); navigateToTasks(); }}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 16px',
                backgroundColor: activeTab === 'list' ? COLORS.accent : COLORS.surfacePage,
                border: `1px solid ${activeTab === 'list' ? COLORS.accent : COLORS.borderLight}`,
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 500,
                color: activeTab === 'list' ? '#ffffff' : COLORS.textMuted,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s ease',
              }}
            >
              <List size={16} />
              Task List
            </button>
            <button
              onClick={() => { setActiveTab('board'); navigateToBoard(); }}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 16px',
                backgroundColor: activeTab === 'board' ? COLORS.accent : COLORS.surfacePage,
                border: `1px solid ${activeTab === 'board' ? COLORS.accent : COLORS.borderLight}`,
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 500,
                color: activeTab === 'board' ? '#ffffff' : COLORS.textMuted,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s ease',
              }}
            >
              <LayoutGrid size={16} />
              Board
            </button>
            <button
              onClick={() => { setActiveTab('calendar'); navigateToCalendar(); }}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 16px',
                backgroundColor: activeTab === 'calendar' ? COLORS.accent : COLORS.surfacePage,
                border: `1px solid ${activeTab === 'calendar' ? COLORS.accent : COLORS.borderLight}`,
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 500,
                color: activeTab === 'calendar' ? '#ffffff' : COLORS.textMuted,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s ease',
              }}
            >
              <Calendar size={16} />
              Calendar
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workstream</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete "{workstream.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              style={{ backgroundColor: COLORS.danger }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>,
    document.body
  );
}
