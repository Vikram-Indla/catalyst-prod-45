// ============================================================================
// WORKSTREAM DETAIL DRAWER — PIXEL-PERFECT IMPLEMENTATION
// File: src/modules/planner/components/workstreams/WorkstreamDrawer.tsx
// ============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  UserPlus,
  ChevronDown,
  Search,
  Calendar,
  LayoutGrid,
  List,
  User
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Workstream,
  useUpdateWorkstream,
  useAddWorkstreamMember,
  useRemoveWorkstreamMember,
  useDeleteWorkstream,
  useArchiveWorkstream,
} from '../../hooks/usePlannerWorkstreams';
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
// TYPES
// ============================================================================

interface TeamMember {
  id: string;
  name: string;
  initials: string;
  role: string;
  avatarColor: string;
}

interface WorkstreamActivity {
  id: string;
  action: string;
  actor_name: string;
  actor_initials: string;
  actor_color: string;
  created_at: string;
}

interface WorkstreamDrawerProps {
  workstream: Workstream | null;
  isOpen: boolean;
  onClose: () => void;
}

// ============================================================================
// COLOR CONSTANTS — Catalyst V5 Design System
// ============================================================================

const COLORS = {
  // Text Colors
  textPrimary: '#0f172a',      // slate-900
  textSecondary: '#334155',    // slate-700
  textMuted: '#64748b',        // slate-500
  textLight: '#94a3b8',        // slate-400
  textPlaceholder: '#9ca3af',  // gray-400

  // Surface Colors
  surfaceCard: '#ffffff',
  surfacePage: '#f8fafc',      // slate-50
  surfaceHover: '#f1f5f9',     // slate-100
  surfaceSelected: '#dbeafe',  // blue-100

  // Border Colors
  borderLight: '#e2e8f0',      // slate-200
  borderDefault: '#cbd5e1',    // slate-300
  borderFocus: '#3b82f6',      // blue-500

  // Brand Colors
  accent: '#2563eb',           // blue-600
  accentHover: '#1d4ed8',      // blue-700
  accentLight: '#dbeafe',      // blue-100

  // Status Colors
  danger: '#dc2626',           // red-600
  dangerBg: '#fef2f2',         // red-50
  dangerBorder: '#fecaca',     // red-200

  warning: '#f59e0b',          // amber-500
  warningBg: '#fffbeb',        // amber-50
  warningBorder: '#fde68a',    // amber-200

  success: '#16a34a',          // green-600
  successBg: '#f0fdf4',        // green-50
  successBorder: '#bbf7d0',    // green-200
};

// ============================================================================
// HEALTH STATUS CONFIG
// ============================================================================

const HEALTH_CONFIG: Record<string, { color: string; bgColor: string; borderColor: string; icon: typeof Check; label: string }> = {
  'healthy': {
    color: COLORS.success,
    bgColor: COLORS.successBg,
    borderColor: COLORS.successBorder,
    icon: Check,
    label: 'On Track'
  },
  'at-risk': {
    color: COLORS.warning,
    bgColor: COLORS.warningBg,
    borderColor: COLORS.warningBorder,
    icon: AlertTriangle,
    label: 'At Risk'
  },
  'critical': {
    color: COLORS.danger,
    bgColor: COLORS.dangerBg,
    borderColor: COLORS.dangerBorder,
    icon: AlertTriangle,
    label: 'Critical'
  }
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
    year: 'numeric'
  });
};

const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// ============================================================================
// MEMBER ITEM SUB-COMPONENT
// ============================================================================

const MemberItem: React.FC<{
  member: TeamMember;
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
        transition: 'background-color 0.15s ease'
      }}
    >
      {/* Avatar */}
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
          flexShrink: 0
        }}
      >
        {member.initials}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: COLORS.textPrimary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
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
            whiteSpace: 'nowrap'
          }}
        >
          {member.role}
        </div>
      </div>

      {/* Remove Button */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        title="Remove member"
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
          opacity: isHovered ? 1 : 0,
          transition: 'all 0.15s ease'
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
        <X size={16} />
      </button>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function WorkstreamDrawer({ workstream, isOpen, onClose }: WorkstreamDrawerProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Refs
  const leadPickerRef = useRef<HTMLDivElement>(null);
  const memberPickerRef = useRef<HTMLDivElement>(null);

  // UI State
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState('');
  const [showLeadPicker, setShowLeadPicker] = useState(false);
  const [showMemberPicker, setShowMemberPicker] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [leadSearchQuery, setLeadSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'board' | 'calendar'>('list');
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Data State
  const [allUsers, setAllUsers] = useState<TeamMember[]>([]);
  const [activities, setActivities] = useState<WorkstreamActivity[]>([]);

  // Mutations
  const updateWorkstream = useUpdateWorkstream();
  const addMember = useAddWorkstreamMember();
  const removeMember = useRemoveWorkstreamMember();
  const deleteWorkstream = useDeleteWorkstream();
  const archiveWorkstream = useArchiveWorkstream();

  // ========================================
  // DATA FETCHING
  // ========================================

  const fetchAllUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .order('full_name');

      if (error) throw error;

      setAllUsers((data || []).map(u => ({
        id: u.id,
        name: u.full_name || 'Unknown',
        initials: getInitials(u.full_name || 'U'),
        role: 'Team Member',
        avatarColor: COLORS.accent
      })));
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, []);

  const fetchActivities = useCallback(async () => {
    if (!workstream?.id) return;
    // Activities are currently not stored in a dedicated table
    // Just show the creation activity
    setActivities([]);
  }, [workstream?.id]);

  // ========================================
  // EFFECTS
  // ========================================

  // Initial load
  useEffect(() => {
    if (isOpen && workstream) {
      setDescriptionValue(workstream.description || '');
      fetchAllUsers();
      fetchActivities();
      setIsEditingDescription(false);
      setShowLeadPicker(false);
      setShowMemberPicker(false);
      setMemberSearchQuery('');
      setLeadSearchQuery('');
    }
  }, [isOpen, workstream?.id, fetchAllUsers, fetchActivities]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (leadPickerRef.current && !leadPickerRef.current.contains(e.target as Node)) {
        setShowLeadPicker(false);
        setLeadSearchQuery('');
      }
      if (memberPickerRef.current && !memberPickerRef.current.contains(e.target as Node)) {
        setShowMemberPicker(false);
        setMemberSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showLeadPicker) {
          setShowLeadPicker(false);
          setLeadSearchQuery('');
        } else if (showMemberPicker) {
          setShowMemberPicker(false);
          setMemberSearchQuery('');
        } else if (isEditingDescription) {
          setIsEditingDescription(false);
          setDescriptionValue(workstream?.description || '');
        } else {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, showLeadPicker, showMemberPicker, isEditingDescription, workstream, onClose]);

  if (!workstream) return null;

  // ========================================
  // COMPUTED DATA
  // ========================================

  const members: TeamMember[] = (workstream.members || [])
    .filter(m => m.role !== 'lead')
    .map(m => ({
      id: m.user_id,
      name: m.profile?.full_name || 'Unknown',
      initials: getInitials(m.profile?.full_name || 'U'),
      role: 'Team Member',
      avatarColor: workstream.color || COLORS.accent
    }));

  const lead: TeamMember | null = workstream.lead ? {
    id: workstream.lead.id || '',
    name: workstream.lead.name || 'Unknown',
    initials: workstream.lead.initials || 'U',
    role: 'Lead',
    avatarColor: workstream.color || COLORS.accent
  } : null;

  const healthConfig = HEALTH_CONFIG[workstream.health || 'healthy'] || HEALTH_CONFIG['healthy'];
  const HealthIcon = healthConfig.icon;
  const canDelete = (workstream.taskCount || 0) === 0;

  // Filtered data
  const availableUsersForMember = allUsers.filter(
    u => !members.some(m => m.id === u.id) &&
      u.name.toLowerCase().includes(memberSearchQuery.toLowerCase())
  );

  const filteredUsersForLead = allUsers.filter(
    u => u.name.toLowerCase().includes(leadSearchQuery.toLowerCase())
  );

  // ========================================
  // ACTIONS
  // ========================================

  const handleAddMember = async (user: TeamMember) => {
    if (members.some(m => m.id === user.id)) {
      toast({ title: 'Already a member', description: `${user.name} is already in this workstream` });
      return;
    }

    try {
      await addMember.mutateAsync({
        workstreamId: workstream.id,
        userId: user.id,
        role: 'member',
      });

      setShowMemberPicker(false);
      setMemberSearchQuery('');
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);

      toast({
        title: 'Member added',
        description: `${user.name} has been added to the workstream.`
      });

    } catch (error) {
      console.error('Error adding member:', error);
      toast({ title: 'Error', description: 'Failed to add member', variant: 'destructive' });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return;

    try {
      await removeMember.mutateAsync({
        workstreamId: workstream.id,
        userId: memberId,
      });

      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);

      toast({
        title: 'Member removed',
        description: `${member.name} has been removed from the workstream.`
      });

    } catch (error) {
      console.error('Error removing member:', error);
      toast({ title: 'Error', description: 'Failed to remove member', variant: 'destructive' });
    }
  };

  const handleChangeLead = async (user: TeamMember | null) => {
    try {
      await addMember.mutateAsync({
        workstreamId: workstream.id,
        userId: user?.id || '',
        role: 'lead',
      });

      setShowLeadPicker(false);
      setLeadSearchQuery('');
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);

      toast({
        title: user ? 'Lead updated' : 'Lead removed',
        description: user ? `${user.name} is now the workstream lead.` : 'Workstream lead has been removed.'
      });

    } catch (error) {
      console.error('Error changing lead:', error);
      toast({ title: 'Error', description: 'Failed to update lead', variant: 'destructive' });
    }
  };

  const handleSaveDescription = async () => {
    setIsSaving(true);
    try {
      await updateWorkstream.mutateAsync({
        id: workstream.id,
        updates: { description: descriptionValue || null },
      });

      setIsEditingDescription(false);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);

      toast({ title: 'Description saved' });

    } catch (error) {
      console.error('Error saving description:', error);
      toast({ title: 'Error', description: 'Failed to save description', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteWorkstream.mutateAsync(workstream.id);
      setIsDeleteOpen(false);
      onClose();
      toast({ title: 'Workstream deleted' });
    } catch (error) {
      console.error('Error deleting workstream:', error);
      toast({ title: 'Error', description: 'Failed to delete workstream', variant: 'destructive' });
    }
  };

  const handleArchive = async () => {
    try {
      await archiveWorkstream.mutateAsync({
        id: workstream.id,
        archive: !workstream.is_archived,
      });
      onClose();
      toast({ title: workstream.is_archived ? 'Workstream restored' : 'Workstream archived' });
    } catch (error) {
      console.error('Error archiving workstream:', error);
      toast({ title: 'Error', description: 'Failed to archive workstream', variant: 'destructive' });
    }
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

  // ========================================
  // RENDER
  // ========================================

  return createPortal(
    <>
      {/* ================================================================ */}
      {/* BACKDROP */}
      {/* ================================================================ */}
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
          transition: 'opacity 0.2s ease'
        }}
      />

      {/* ================================================================ */}
      {/* DRAWER CONTAINER */}
      {/* ================================================================ */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '480px',
          maxWidth: '100vw',
          height: '100vh',
          backgroundColor: COLORS.surfaceCard,
          boxShadow: '-8px 0 30px rgba(0, 0, 0, 0.15)',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s ease'
        }}
      >
        {/* ============================================================ */}
        {/* HEADER */}
        {/* ============================================================ */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: `1px solid ${COLORS.borderLight}`,
            backgroundColor: COLORS.surfaceCard
          }}
        >
          {/* TOP ROW: Title + Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              marginBottom: '16px'
            }}
          >
            {/* Left: Health dot + Title */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
              {/* Health Indicator Dot */}
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                   backgroundColor: healthConfig.color,
                  marginTop: '6px',
                  flexShrink: 0
                }}
              />

              {/* Title & Meta */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1
                  style={{
                    fontSize: '20px',
                    fontWeight: 600,
                    color: COLORS.textPrimary,
                    margin: 0,
                    lineHeight: 1.3
                  }}
                >
                  {workstream.name}
                </h1>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '4px',
                    fontSize: '13px',
                    color: COLORS.textMuted
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'ui-monospace, "SF Mono", Monaco, monospace',
                      fontWeight: 500,
                      color: COLORS.textSecondary
                    }}
                  >
                    {workstream.key_prefix || workstream.code}
                  </span>
                  <span style={{ color: COLORS.textLight }}>·</span>
                  <span>Created {formatDate(workstream.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Right: Action Buttons */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {/* Edit Button */}
              <button
                title="Edit workstream"
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
                  transition: 'all 0.15s ease'
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

              {/* Archive Button */}
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
                  transition: 'all 0.15s ease'
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

              {/* Delete Button */}
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
                  opacity: canDelete ? 1 : 0.5
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

              {/* Close Button */}
              <button
                onClick={onClose}
                title="Close"
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
                  transition: 'all 0.15s ease'
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
              marginBottom: '12px'
            }}
          >
            {/* Status Icon */}
            <HealthIcon
              size={20}
              style={{ color: healthConfig.color, flexShrink: 0 }}
            />

            {/* Status Info */}
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: healthConfig.color
                }}
              >
                {healthConfig.label}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: COLORS.textMuted,
                  marginTop: '2px'
                }}
              >
                {workstream.overdueCount || 0} overdue · {workstream.taskCount || 0} tasks
              </div>
            </div>

            {/* Change Status Button (UI only) */}
            <button
              style={{
                padding: '6px 12px',
                backgroundColor: COLORS.surfaceCard,
                border: `1px solid ${COLORS.borderLight}`,
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 500,
                color: COLORS.textMuted,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                fontFamily: 'inherit'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = COLORS.surfacePage;
                e.currentTarget.style.borderColor = COLORS.borderDefault;
                e.currentTarget.style.color = COLORS.textSecondary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = COLORS.surfaceCard;
                e.currentTarget.style.borderColor = COLORS.borderLight;
                e.currentTarget.style.color = COLORS.textMuted;
              }}
            >
              Change Status
            </button>
          </div>

          {/* SAVE INDICATOR */}
          {showSaved && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                color: COLORS.success
              }}
            >
              <Check size={14} />
              <span>All changes saved</span>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* BODY (Scrollable) */}
        {/* ============================================================ */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px'
          }}
        >
          {/* ======================================== */}
          {/* DESCRIPTION SECTION */}
          {/* ======================================== */}
          <div style={{ marginBottom: '28px' }}>
            {/* Section Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px'
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: COLORS.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                Description
              </span>

              {!isEditingDescription ? (
                <button
                  onClick={() => setIsEditingDescription(true)}
                  style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: COLORS.accent,
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontFamily: 'inherit',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = COLORS.accentLight}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  Edit
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => {
                      setIsEditingDescription(false);
                      setDescriptionValue(workstream.description || '');
                    }}
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: COLORS.textMuted,
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontFamily: 'inherit'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveDescription}
                    disabled={isSaving}
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: COLORS.accent,
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: isSaving ? 'not-allowed' : 'pointer',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontFamily: 'inherit',
                      opacity: isSaving ? 0.6 : 1
                    }}
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </div>

            {/* Description Content */}
            {isEditingDescription ? (
              <textarea
                value={descriptionValue}
                onChange={(e) => setDescriptionValue(e.target.value)}
                placeholder="Add a description for this workstream..."
                autoFocus
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '12px 14px',
                  border: `1px solid ${COLORS.borderDefault}`,
                  borderRadius: '10px',
                  fontSize: '14px',
                  lineHeight: 1.6,
                  color: COLORS.textPrimary,
                  backgroundColor: COLORS.surfaceCard,
                  resize: 'vertical',
                  outline: 'none',
                  fontFamily: 'inherit',
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
            ) : (
              <p
                style={{
                  fontSize: '14px',
                  color: workstream.description ? COLORS.textSecondary : COLORS.textLight,
                  lineHeight: 1.6,
                  margin: 0,
                  fontStyle: workstream.description ? 'normal' : 'italic'
                }}
              >
                {workstream.description || 'No description provided'}
              </p>
            )}
          </div>

          {/* ======================================== */}
          {/* TEAM SECTION */}
          {/* ======================================== */}
          <div style={{ marginBottom: '28px' }}>
            {/* Section Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px'
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: COLORS.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                Team
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: COLORS.textPrimary
                }}
              >
                {members.length} member{members.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* LEAD ROW */}
            <div
              ref={leadPickerRef}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 0',
                borderBottom: `1px solid ${COLORS.surfaceHover}`,
                position: 'relative'
              }}
            >
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: COLORS.textMuted
                }}
              >
                Lead
              </span>

              {/* Lead Picker Trigger */}
              <button
                onClick={() => setShowLeadPicker(!showLeadPicker)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s ease',
                  minWidth: '160px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f1f5f9';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              >
                {lead ? (
                  <>
                    {/* Lead Avatar */}
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: lead.avatarColor || '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#ffffff',
                        flexShrink: 0,
                      }}
                    >
                      {lead.initials}
                    </div>
                    {/* Lead Name */}
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        color: '#0f172a',
                        flex: 1,
                        textAlign: 'left',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {lead.name}
                    </span>
                  </>
                ) : (
                  /* Empty State - Shows "Unassigned" */
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '14px',
                      color: '#94a3b8',
                    }}
                  >
                    <User size={16} />
                    Unassigned
                  </span>
                )}

                {/* Chevron Arrow */}
                <ChevronDown
                  size={14}
                  style={{
                    color: '#94a3b8',
                    flexShrink: 0,
                    transform: showLeadPicker ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                  }}
                />
              </button>

              {/* Lead Picker Dropdown */}
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
                    overflow: 'hidden'
                  }}
                >
                  {/* Search */}
                  <div
                    style={{
                      padding: '12px',
                      borderBottom: `1px solid ${COLORS.borderLight}`
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        backgroundColor: COLORS.surfacePage,
                        borderRadius: '8px',
                        border: `1px solid ${COLORS.borderLight}`
                      }}
                    >
                      <Search size={16} style={{ color: COLORS.textLight, flexShrink: 0 }} />
                      <input
                        type="text"
                        value={leadSearchQuery}
                        onChange={(e) => setLeadSearchQuery(e.target.value)}
                        placeholder="Search team members..."
                        autoFocus
                        style={{
                          flex: 1,
                          border: 'none',
                          backgroundColor: 'transparent',
                          fontSize: '14px',
                          color: COLORS.textPrimary,
                          outline: 'none',
                          fontFamily: 'inherit'
                        }}
                      />
                      {leadSearchQuery && (
                        <button
                          onClick={() => setLeadSearchQuery('')}
                          style={{
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: COLORS.surfaceHover,
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            color: COLORS.textMuted
                          }}
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* User List */}
                  <div
                    style={{
                      maxHeight: '280px',
                      overflowY: 'auto',
                      padding: '8px'
                    }}
                  >
                    {filteredUsersForLead.length === 0 ? (
                      <div
                        style={{
                          padding: '16px',
                          textAlign: 'center',
                          color: COLORS.textMuted,
                          fontSize: '14px'
                        }}
                      >
                        No members found
                      </div>
                    ) : (
                      filteredUsersForLead.map(user => (
                        <div
                          key={user.id}
                          onClick={() => handleChangeLead(user)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            backgroundColor: lead?.id === user.id ? COLORS.surfaceSelected : 'transparent',
                            transition: 'background-color 0.1s ease',
                            marginBottom: '2px'
                          }}
                          onMouseEnter={(e) => {
                            if (lead?.id !== user.id) {
                              e.currentTarget.style.backgroundColor = COLORS.surfaceHover;
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = lead?.id === user.id ? COLORS.surfaceSelected : 'transparent';
                          }}
                        >
                          {/* Avatar */}
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              backgroundColor: user.avatarColor,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '13px',
                              fontWeight: 600,
                              color: '#ffffff',
                              flexShrink: 0
                            }}
                          >
                            {user.initials}
                          </div>

                          {/* Info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: '14px',
                                fontWeight: 500,
                                color: COLORS.textPrimary,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {user.name}
                            </div>
                            <div
                              style={{
                                fontSize: '12px',
                                color: COLORS.textMuted,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {user.role}
                            </div>
                          </div>

                          {/* Check */}
                          {lead?.id === user.id && (
                            <Check size={18} style={{ color: COLORS.accent, flexShrink: 0 }} />
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Remove Assignment */}
                  {lead && (
                    <div
                      style={{
                        padding: '8px 12px',
                        borderTop: `1px solid ${COLORS.borderLight}`
                      }}
                    >
                      <button
                        onClick={() => handleChangeLead(null)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          width: '100%',
                          padding: '10px 12px',
                          backgroundColor: 'transparent',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '14px',
                          color: COLORS.danger,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          transition: 'background-color 0.1s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = COLORS.dangerBg}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <X size={16} />
                        Remove assignment
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* MEMBERS LIST */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                marginTop: '12px'
              }}
            >
              {members.map(member => (
                <MemberItem
                  key={member.id}
                  member={member}
                  onRemove={() => handleRemoveMember(member.id)}
                />
              ))}
            </div>

            {/* ADD MEMBER BUTTON */}
            <div ref={memberPickerRef} style={{ position: 'relative', marginTop: '12px' }}>
              <button
                onClick={() => setShowMemberPicker(!showMemberPicker)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: COLORS.surfaceCard,
                  border: `1.5px dashed ${COLORS.borderDefault}`,
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: COLORS.textMuted,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s ease'
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

              {/* Member Picker Dropdown */}
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
                    overflow: 'hidden'
                  }}
                >
                  {/* Search */}
                  <div
                    style={{
                      padding: '12px',
                      borderBottom: `1px solid ${COLORS.borderLight}`
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        backgroundColor: COLORS.surfacePage,
                        borderRadius: '8px',
                        border: `1px solid ${COLORS.borderLight}`
                      }}
                    >
                      <Search size={16} style={{ color: COLORS.textLight, flexShrink: 0 }} />
                      <input
                        type="text"
                        value={memberSearchQuery}
                        onChange={(e) => setMemberSearchQuery(e.target.value)}
                        placeholder="Search team members..."
                        autoFocus
                        style={{
                          flex: 1,
                          border: 'none',
                          backgroundColor: 'transparent',
                          fontSize: '14px',
                          color: COLORS.textPrimary,
                          outline: 'none',
                          fontFamily: 'inherit'
                        }}
                      />
                      {memberSearchQuery && (
                        <button
                          onClick={() => setMemberSearchQuery('')}
                          style={{
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: COLORS.surfaceHover,
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            color: COLORS.textMuted
                          }}
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Available Users List */}
                  <div
                    style={{
                      maxHeight: '280px',
                      overflowY: 'auto',
                      padding: '8px'
                    }}
                  >
                    {availableUsersForMember.length === 0 ? (
                      <div
                        style={{
                          padding: '16px',
                          textAlign: 'center',
                          color: COLORS.textMuted,
                          fontSize: '14px'
                        }}
                      >
                        {memberSearchQuery ? 'No members found' : 'All team members are already added'}
                      </div>
                    ) : (
                      availableUsersForMember.map(user => (
                        <div
                          key={user.id}
                          onClick={() => handleAddMember(user)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            backgroundColor: 'transparent',
                            transition: 'background-color 0.1s ease',
                            marginBottom: '2px'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = COLORS.surfaceHover}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          {/* Avatar */}
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              backgroundColor: user.avatarColor,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '13px',
                              fontWeight: 600,
                              color: '#ffffff',
                              flexShrink: 0
                            }}
                          >
                            {user.initials}
                          </div>

                          {/* Info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: '14px',
                                fontWeight: 500,
                                color: COLORS.textPrimary,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {user.name}
                            </div>
                            <div
                              style={{
                                fontSize: '12px',
                                color: COLORS.textMuted,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {user.role}
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

          {/* ======================================== */}
          {/* WORK SUMMARY SECTION */}
          {/* ======================================== */}
          <div style={{ marginBottom: '28px' }}>
            {/* Section Header */}
            <span
              style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 600,
                color: COLORS.textMuted,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '12px'
              }}
            >
              Work Summary
            </span>

            {/* Summary Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px'
              }}
            >
              {/* Total Tasks */}
              <div
                style={{
                  padding: '16px',
                  backgroundColor: COLORS.surfacePage,
                  border: `1px solid ${COLORS.borderLight}`,
                  borderRadius: '10px',
                  textAlign: 'center'
                }}
              >
                <div
                  style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    color: COLORS.textPrimary,
                    lineHeight: 1
                  }}
                >
                  {workstream.taskCount || 0}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: COLORS.textMuted,
                    marginTop: '4px'
                  }}
                >
                  Total Tasks
                </div>
              </div>

              {/* Overdue */}
              <div
                style={{
                  padding: '16px',
                  backgroundColor: COLORS.surfacePage,
                  border: `1px solid ${COLORS.borderLight}`,
                  borderRadius: '10px',
                  textAlign: 'center'
                }}
              >
                <div
                  style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    color: (workstream.overdueCount || 0) > 0 ? COLORS.danger : COLORS.textPrimary,
                    lineHeight: 1
                  }}
                >
                  {workstream.overdueCount || 0}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: COLORS.textMuted,
                    marginTop: '4px'
                  }}
                >
                  Overdue
                </div>
              </div>

              {/* Members */}
              <div
                style={{
                  padding: '16px',
                  backgroundColor: COLORS.surfacePage,
                  border: `1px solid ${COLORS.borderLight}`,
                  borderRadius: '10px',
                  textAlign: 'center'
                }}
              >
                <div
                  style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    color: COLORS.textPrimary,
                    lineHeight: 1
                  }}
                >
                  {workstream.memberCount || members.length}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: COLORS.textMuted,
                    marginTop: '4px'
                  }}
                >
                  Members
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div style={{ marginTop: '16px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px'
                }}
              >
                <span
                  style={{
                    fontSize: '12px',
                    color: COLORS.textMuted
                  }}
                >
                  Task Completion
                </span>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: COLORS.textPrimary
                  }}
                >
                  {workstream.progress || 0}% complete
                </span>
              </div>
              <div
                style={{
                  height: '8px',
                  backgroundColor: COLORS.borderLight,
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${workstream.progress || 0}%`,
                    backgroundColor: COLORS.accent,
                    borderRadius: '4px',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
            </div>
          </div>

          {/* ======================================== */}
          {/* ACTIVITY SECTION */}
          {/* ======================================== */}
          <div>
            {/* Section Header */}
            <span
              style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 600,
                color: COLORS.textMuted,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '12px'
              }}
            >
              Activity
            </span>

            {/* Activity List */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}
            >
              {activities.length === 0 ? (
                <div
                  style={{
                    display: 'flex',
                    gap: '12px'
                  }}
                >
                  {/* Avatar */}
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
                      flexShrink: 0
                    }}
                  >
                    {workstream.lead?.initials || 'SY'}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, paddingTop: '2px' }}>
                    <div
                      style={{
                        fontSize: '14px',
                        color: COLORS.textSecondary,
                        lineHeight: 1.4
                      }}
                    >
                      <strong
                        style={{
                          fontWeight: 600,
                          color: COLORS.textPrimary
                        }}
                      >
                        {workstream.lead?.name || 'System'}
                      </strong>
                      {' '}
                      created this workstream
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: COLORS.textLight,
                        marginTop: '4px'
                      }}
                    >
                      {formatTime(workstream.created_at)}
                    </div>
                  </div>
                </div>
              ) : (
                activities.map(activity => (
                  <div
                    key={activity.id}
                    style={{
                      display: 'flex',
                      gap: '12px'
                    }}
                  >
                    {/* Avatar */}
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: activity.actor_color || COLORS.textMuted,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#ffffff',
                        flexShrink: 0
                      }}
                    >
                      {activity.actor_initials}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, paddingTop: '2px' }}>
                      <div
                        style={{
                          fontSize: '14px',
                          color: COLORS.textSecondary,
                          lineHeight: 1.4
                        }}
                      >
                        <strong
                          style={{
                            fontWeight: 600,
                            color: COLORS.textPrimary
                          }}
                        >
                          {activity.actor_name}
                        </strong>
                        {' '}
                        {activity.action}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: COLORS.textLight,
                          marginTop: '4px'
                        }}
                      >
                        {formatTime(activity.created_at)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* FOOTER TABS */}
        {/* ============================================================ */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: `1px solid ${COLORS.borderLight}`,
            backgroundColor: COLORS.surfaceCard
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: '8px'
            }}
          >
            {/* Task List Tab */}
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
                transition: 'all 0.15s ease'
              }}
            >
              <List size={16} />
              Task List
            </button>

            {/* Board Tab */}
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
                transition: 'all 0.15s ease'
              }}
            >
              <LayoutGrid size={16} />
              Board
            </button>

            {/* Calendar Tab */}
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
                transition: 'all 0.15s ease'
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

export default WorkstreamDrawer;
