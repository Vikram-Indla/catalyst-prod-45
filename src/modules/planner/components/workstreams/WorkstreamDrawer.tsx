// ============================================================================
// WORKSTREAM DETAIL DRAWER — PIXEL-PERFECT V2 IMPLEMENTATION
// File: src/modules/planner/components/workstreams/WorkstreamDrawer.tsx
// ============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
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
  Loader2
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
  useSetWorkstreamLead,
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
  id: string | null; // profile_id (for member operations) - can be null
  name: string;
  initials: string;
  role: string;
  avatarColor: string;
  resourceId?: string; // resource_inventory.id for leads
  hasProfile?: boolean; // whether the resource has a linked profile
}

interface WorkstreamDrawerProps {
  workstream: Workstream | null;
  isOpen: boolean;
  onClose: () => void;
}

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

// Generate avatar color from name
const getAvatarColor = (name: string): string => {
  const colors = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// ============================================================================
// HEALTH STATUS CONFIG
// ============================================================================

const HEALTH_CONFIG: Record<string, { color: string; bgColor: string; borderColor: string; label: string }> = {
  'healthy': {
    color: '#16a34a',
    bgColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    label: 'On Track'
  },
  'at-risk': {
    color: '#f59e0b',
    bgColor: '#fffbeb',
    borderColor: '#fde68a',
    label: 'At Risk'
  },
  'critical': {
    color: '#dc2626',
    bgColor: '#fef2f2',
    borderColor: '#fecaca',
    label: 'Critical'
  }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function WorkstreamDrawer({ workstream, isOpen, onClose }: WorkstreamDrawerProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Data State - all available users for selection
  const [allUsers, setAllUsers] = useState<TeamMember[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Mutations
  const updateWorkstream = useUpdateWorkstream();
  const addMember = useAddWorkstreamMember();
  const removeMember = useRemoveWorkstreamMember();
  const deleteWorkstream = useDeleteWorkstream();
  const archiveWorkstream = useArchiveWorkstream();
  const setWorkstreamLead = useSetWorkstreamLead();

  // ========================================
  // DATA FETCHING - Using resource_inventory for lead picker
  // ========================================

  const fetchAllUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      // Fetch from resource_inventory with profile link
      const { data, error } = await supabase
        .from('resource_inventory')
        .select('id, name, profile_id, is_active')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      setAllUsers((data || []).map((u: any) => ({
        // CRITICAL: For workstream_members, we MUST use profile_id (FK to profiles.id)
        // If profile_id is null, we can still show the user but they can't be added as members
        id: u.profile_id, // profile_id for member operations (can be null)
        resourceId: u.id, // resource_inventory.id for lead operations (always valid)
        name: u.name || 'Unknown',
        initials: getInitials(u.name || 'U'),
        role: 'Team Member',
        avatarColor: getAvatarColor(u.name || 'U'),
        hasProfile: !!u.profile_id, // track if they have a linked profile
      })));
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  // ========================================
  // EFFECTS
  // ========================================

  // Initial load when drawer opens
  useEffect(() => {
    if (isOpen && workstream) {
      setDescriptionValue(workstream.description || '');
      fetchAllUsers();
      setIsEditingDescription(false);
      setShowLeadPicker(false);
      setShowMemberPicker(false);
      setMemberSearchQuery('');
      setLeadSearchQuery('');
    }
  }, [isOpen, workstream?.id, fetchAllUsers]);

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

  // Members from workstream prop (excludes lead)
  const members: TeamMember[] = (workstream.members || [])
    .filter(m => m.role !== 'lead')
    .map(m => ({
      id: m.user_id,
      name: m.profile?.full_name || 'Unknown',
      initials: getInitials(m.profile?.full_name || 'U'),
      role: 'Team Member',
      avatarColor: getAvatarColor(m.profile?.full_name || 'U')
    }));

  // Lead from workstream prop
  const lead: TeamMember | null = workstream.lead ? {
    id: workstream.lead.id || '',
    name: workstream.lead.name || 'Unknown',
    initials: workstream.lead.initials || 'U',
    role: 'Lead',
    avatarColor: getAvatarColor(workstream.lead.name || 'U')
  } : null;

  const healthConfig = HEALTH_CONFIG[workstream.health || 'healthy'] || HEALTH_CONFIG['healthy'];
  const canDelete = (workstream.taskCount || 0) === 0;
  const memberCount = members.length + (lead ? 1 : 0);

  // Filtered users for pickers - only show users with valid profile_id for member picker
  const availableUsersForMember = allUsers.filter(
    u => u.hasProfile && // MUST have a linked profile to be added as member
      u.id && // must have profile_id
      !members.some(m => m.id === u.id) &&
      (!lead || lead.id !== u.resourceId) &&
      u.name.toLowerCase().includes(memberSearchQuery.toLowerCase())
  );

  // Lead picker can show all users (leads don't require profile_id, they use resource_id)
  const filteredUsersForLead = allUsers.filter(
    u => u.name.toLowerCase().includes(leadSearchQuery.toLowerCase())
  );

  // Calculate progress
  const taskCount = workstream.taskCount || 0;
  const doneCount = workstream.doneCount || 0;
  const progress = taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0;

  // ========================================
  // SAVE INDICATOR HELPER
  // ========================================

  const showSaveSuccess = () => {
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 3000);
  };

  // ========================================
  // ACTIONS
  // ========================================

  const handleAddMember = async (user: TeamMember) => {
    // CRITICAL: workstream_members.user_id requires a valid profile_id (FK to profiles.id)
    // Resources without a linked profile cannot be added as members
    if (!user.id || !user.hasProfile) {
      toast({ 
        title: 'Cannot add member', 
        description: `${user.name} does not have a linked profile. Please create an account for this resource first.`,
        variant: 'destructive'
      });
      return;
    }

    if (members.some(m => m.id === user.id)) {
      toast({ title: 'Already a member', description: `${user.name} is already in this workstream` });
      return;
    }

    try {
      await addMember.mutateAsync({
        workstreamId: workstream.id,
        userId: user.id, // This is now guaranteed to be a valid profile_id
        role: 'member',
      });

      // Immediately refetch to update UI
      await queryClient.invalidateQueries({ queryKey: ['planner-workstreams'] });
      
      setShowMemberPicker(false);
      setMemberSearchQuery('');
      showSaveSuccess();

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

      // Immediately refetch to update UI
      await queryClient.invalidateQueries({ queryKey: ['planner-workstreams'] });
      
      showSaveSuccess();

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
      // Use setWorkstreamLead mutation which properly handles resource_inventory.id
      await setWorkstreamLead.mutateAsync({
        workstreamId: workstream.id,
        leadResourceId: user?.resourceId || null,
      });

      // Immediately refetch to update UI
      await queryClient.invalidateQueries({ queryKey: ['planner-workstreams'] });
      
      setShowLeadPicker(false);
      setLeadSearchQuery('');
      showSaveSuccess();

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

      await queryClient.invalidateQueries({ queryKey: ['planner-workstreams'] });
      
      setIsEditingDescription(false);
      showSaveSuccess();

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
    navigate(`/taskhub/task-list?workstream=${encodeURIComponent(workstream.slug || workstream.id)}`);
    onClose();
  };

  const navigateToBoard = () => {
    navigate(`/taskhub/boards?workstream=${encodeURIComponent(workstream.slug || workstream.id)}`);
    onClose();
  };

  const navigateToCalendar = () => {
    navigate(`/taskhub/calendar?workstream=${encodeURIComponent(workstream.slug || workstream.id)}`);
    onClose();
  };

  // ========================================
  // RENDER
  // ========================================

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
          zIndex: 998,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.2s ease'
        }}
      />

      {/* DRAWER CONTAINER */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '420px',
          maxWidth: '100vw',
          height: '100vh',
          backgroundColor: '#ffffff',
          boxShadow: '-8px 0 30px rgba(0, 0, 0, 0.12)',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s ease'
        }}
      >
        {/* ============================================================ */}
        {/* HEADER SECTION */}
        {/* ============================================================ */}
        <div style={{ padding: '20px 20px 16px 20px', borderBottom: '1px solid #e2e8f0' }}>
          {/* TOP ROW: Health dot + Title + Actions */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
            {/* Left: Health dot + Title */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1, minWidth: 0 }}>
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
                <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#0f172a', margin: 0, lineHeight: 1.3 }}>
                  {workstream.name}
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', fontSize: '13px', color: '#64748b' }}>
                  <span style={{ fontWeight: 500, color: '#475569' }}>
                    {workstream.key_prefix || workstream.code}
                  </span>
                  <span>·</span>
                  <span>Created {formatDate(workstream.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Right: Action Buttons */}
            <div style={{ display: 'flex', gap: '2px', marginLeft: '12px' }}>
              <button title="Edit workstream" style={iconButtonStyle}>
                <Edit2 size={18} />
              </button>
              <button title={workstream.is_archived ? 'Unarchive' : 'Archive'} onClick={handleArchive} style={iconButtonStyle}>
                {workstream.is_archived ? <ArchiveRestore size={18} /> : <Archive size={18} />}
              </button>
              <button
                title={canDelete ? 'Delete' : `Cannot delete: ${workstream.taskCount} task(s) linked`}
                onClick={() => canDelete && setIsDeleteOpen(true)}
                disabled={!canDelete}
                style={{ ...iconButtonStyle, opacity: canDelete ? 1 : 0.4, cursor: canDelete ? 'pointer' : 'not-allowed' }}
              >
                <Trash2 size={18} />
              </button>
              <button onClick={onClose} title="Close" style={iconButtonStyle}>
                <X size={20} />
              </button>
            </div>
          </div>

          {/* STATUS BANNER */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 14px',
              backgroundColor: healthConfig.bgColor,
              border: `1px solid ${healthConfig.borderColor}`,
              borderRadius: '10px',
              marginBottom: '12px'
            }}
          >
            <AlertTriangle size={20} style={{ color: healthConfig.color, marginRight: '10px', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: healthConfig.color }}>{healthConfig.label}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                {workstream.overdueCount || 0} overdue · {workstream.taskCount || 0} tasks
              </div>
            </div>
            <button
              style={{
                padding: '6px 14px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                color: '#475569',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Change Status
            </button>
          </div>

          {/* SAVE INDICATOR */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#16a34a', minHeight: '20px' }}>
            {showSaved && (
              <>
                <Check size={14} />
                <span>All changes saved</span>
              </>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* SCROLLABLE BODY */}
        {/* ============================================================ */}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '80px' }}>
          {/* WORK SUMMARY (sticky) */}
          <div
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 20,
              padding: '20px',
              backgroundColor: '#ffffff',
              borderBottom: '1px solid #e2e8f0',
            }}
          >
            <div style={{ marginBottom: '14px' }}>
              <span style={sectionLabelStyle}>Work Summary</span>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={statCardStyle}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{taskCount}</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Total Tasks</div>
              </div>
              <div style={statCardStyle}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#dc2626', lineHeight: 1 }}>{workstream.overdueCount || 0}</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Overdue</div>
              </div>
              <div style={statCardStyle}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{memberCount}</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Members</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: '#64748b' }}>Task Completion</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{progress}% complete</span>
              </div>
              <div style={{ height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, backgroundColor: '#2563eb', borderRadius: '4px', transition: 'width 0.3s ease' }} />
              </div>
            </div>
          </div>

          <div style={{ padding: '20px' }}>
            {/* DESCRIPTION SECTION */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={sectionLabelStyle}>Description</span>
                {!isEditingDescription && (
                  <button onClick={() => setIsEditingDescription(true)} style={editLinkStyle}>Edit</button>
                )}
              </div>

              {isEditingDescription ? (
                <div>
                  <textarea
                    value={descriptionValue}
                    onChange={(e) => setDescriptionValue(e.target.value)}
                    placeholder="Add a description..."
                    style={{
                      width: '100%',
                      minHeight: '100px',
                      padding: '12px',
                      fontSize: '14px',
                      lineHeight: 1.6,
                      color: '#334155',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      outline: 'none'
                    }}
                    autoFocus
                  />
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button onClick={handleSaveDescription} disabled={isSaving} style={primaryButtonStyle}>
                      {isSaving ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
                    </button>
                    <button onClick={() => { setIsEditingDescription(false); setDescriptionValue(workstream.description || ''); }} style={secondaryButtonStyle}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: '14px', lineHeight: 1.7, color: '#334155', margin: 0 }}>
                  {workstream.description || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No description added.</span>}
                </p>
              )}
            </div>

            {/* TEAM SECTION */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <span style={sectionLabelStyle}>Team</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', letterSpacing: '0.03em' }}>
                  {memberCount} {memberCount === 1 ? 'MEMBER' : 'MEMBERS'}
                </span>
              </div>

              {/* Lead Picker */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>Lead</span>
                  <div ref={leadPickerRef} style={{ position: 'relative' }}>
                    <button
                      onClick={() => setShowLeadPicker(!showLeadPicker)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 12px',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        minWidth: '200px',
                        justifyContent: 'space-between'
                      }}
                    >
                      {lead ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={avatarStyle(lead.avatarColor)}>{lead.initials}</div>
                          <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: 500 }}>{lead.name}</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '14px', color: '#94a3b8' }}>Select lead...</span>
                      )}
                      <ChevronDown size={16} style={{ color: '#64748b' }} />
                    </button>

                    {/* Lead Dropdown */}
                    {showLeadPicker && (
                      <div style={dropdownStyle}>
                        <div style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>
                          <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                              type="text"
                              value={leadSearchQuery}
                              onChange={(e) => setLeadSearchQuery(e.target.value)}
                              placeholder="Search..."
                              style={searchInputStyle}
                              autoFocus
                            />
                          </div>
                        </div>
                        <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                          {lead && (
                            <button onClick={() => handleChangeLead(null)} style={dropdownItemStyle}>
                              <span style={{ color: '#dc2626', fontSize: '13px' }}>Remove lead</span>
                            </button>
                          )}
                          {filteredUsersForLead.map(user => (
                            <button
                              key={user.id}
                              onClick={() => handleChangeLead(user)}
                              style={dropdownItemStyle}
                            >
                              <div style={avatarStyle(user.avatarColor, 28)}>{user.initials}</div>
                              <span style={{ fontSize: '14px', color: '#0f172a' }}>{user.name}</span>
                              {lead?.id === user.resourceId && <Check size={16} style={{ marginLeft: 'auto', color: '#2563eb' }} />}
                            </button>
                          ))}
                          {filteredUsersForLead.length === 0 && !isLoadingUsers && (
                            <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>No users found</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Member Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Show lead as first member card if exists */}
                {lead && (
                  <div style={memberCardStyle}>
                    <div style={avatarStyle(lead.avatarColor, 40)}>{lead.initials}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>{lead.name}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Product Manager</div>
                    </div>
                  </div>
                )}
                
                {/* Regular members */}
                <div style={{ maxHeight: '260px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {members.map(member => (
                    <div key={member.id} style={memberCardStyle} className="group">
                      <div style={avatarStyle(member.avatarColor, 40)}>{member.initials}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>{member.name}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>Senior Engineer</div>
                      </div>
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        title="Remove"
                        aria-label={`Remove ${member.name}`}
                        style={{ transition: 'opacity 0.15s', padding: '4px', borderRadius: '4px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#94a3b8' }}
                        className="opacity-0 group-hover:opacity-100"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Member Button */}
                <div ref={memberPickerRef} style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowMemberPicker(!showMemberPicker)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '14px',
                      backgroundColor: 'transparent',
                      border: '2px dashed #e2e8f0',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      color: '#64748b',
                      fontSize: '14px',
                      fontWeight: 500,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <UserPlus size={18} />
                    Add Member
                  </button>

                  {/* Member Dropdown */}
                  {showMemberPicker && (
                    <div style={{ ...dropdownStyle, bottom: '100%', top: 'auto', marginBottom: '4px' }}>
                      <div style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>
                        <div style={{ position: 'relative' }}>
                          <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                          <input
                            type="text"
                            value={memberSearchQuery}
                            onChange={(e) => setMemberSearchQuery(e.target.value)}
                            placeholder="Search..."
                            style={searchInputStyle}
                            autoFocus
                          />
                        </div>
                      </div>
                      <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                        {availableUsersForMember.map(user => (
                          <button
                            key={user.resourceId || user.id}
                            onClick={() => handleAddMember(user)}
                            style={dropdownItemStyle}
                          >
                            <div style={avatarStyle(user.avatarColor, 28)}>{user.initials}</div>
                            <span style={{ fontSize: '14px', color: '#0f172a' }}>{user.name}</span>
                          </button>
                        ))}
                        {availableUsersForMember.length === 0 && !isLoadingUsers && (
                          <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                            No users with linked profiles available
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ============================================================ */}
        {/* FOOTER NAVIGATION TABS */}
        {/* ============================================================ */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            display: 'flex',
            gap: '8px',
            padding: '12px 20px',
            backgroundColor: '#ffffff',
            borderTop: '1px solid #e2e8f0'
          }}
        >
          <button onClick={navigateToTasks} style={navTabStyle(true)}>
            <LayoutGrid size={16} />
            Task List
          </button>
          <button onClick={navigateToBoard} style={navTabStyle(false)}>
            <List size={16} />
            Board
          </button>
          <button onClick={navigateToCalendar} style={navTabStyle(false)}>
            <Calendar size={16} />
            Calendar
          </button>
        </div>
      </div>

      {/* DELETE CONFIRMATION DIALOG */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete workstream?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete "{workstream.name}" and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>,
    document.body
  );
}

// ============================================================================
// STYLE HELPERS
// ============================================================================

const iconButtonStyle: React.CSSProperties = {
  width: '36px',
  height: '36px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'transparent',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  color: '#64748b',
  transition: 'all 0.15s ease'
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.05em'
};

const editLinkStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 500,
  color: '#2563eb',
  backgroundColor: 'transparent',
  border: 'none',
  cursor: 'pointer',
  padding: '4px 8px',
  borderRadius: '4px'
};

const primaryButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  padding: '8px 16px',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  border: 'none',
  borderRadius: '6px',
  fontSize: '13px',
  fontWeight: 500,
  cursor: 'pointer'
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: '8px 16px',
  backgroundColor: '#f1f5f9',
  color: '#475569',
  border: '1px solid #e2e8f0',
  borderRadius: '6px',
  fontSize: '13px',
  fontWeight: 500,
  cursor: 'pointer'
};

const avatarStyle = (color: string, size = 32): React.CSSProperties => ({
  width: `${size}px`,
  height: `${size}px`,
  borderRadius: '50%',
  backgroundColor: color,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: size > 32 ? '14px' : '12px',
  fontWeight: 600,
  color: '#ffffff',
  flexShrink: 0
});

const memberCardStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '12px 14px',
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '10px'
};

const statCardStyle: React.CSSProperties = {
  padding: '16px',
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '10px',
  textAlign: 'center'
};

const dropdownStyle: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  marginTop: '4px',
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '10px',
  boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
  zIndex: 9999,
  overflow: 'hidden'
};

const searchInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 8px 8px 36px',
  fontSize: '14px',
  border: '1px solid #e2e8f0',
  borderRadius: '6px',
  outline: 'none'
};

const dropdownItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  width: '100%',
  padding: '10px 12px',
  backgroundColor: 'transparent',
  border: 'none',
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'background-color 0.1s ease'
};

const navTabStyle = (isActive: boolean): React.CSSProperties => ({
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  padding: '10px 16px',
  backgroundColor: isActive ? '#2563eb' : '#ffffff',
  color: isActive ? '#ffffff' : '#475569',
  border: isActive ? 'none' : '1px solid #e2e8f0',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.15s ease'
});

export default WorkstreamDrawer;
