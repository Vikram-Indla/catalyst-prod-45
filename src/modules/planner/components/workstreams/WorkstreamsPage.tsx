// ============================================================================
// WORKSTREAMS V10 - Main Page Component
// Enterprise Clean design with INLINE STYLES per spec
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Plus,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  List,
  LayoutGrid,
  Archive,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  usePlannerWorkstreams,
  Workstream,
  useArchiveWorkstream,
  useDeleteWorkstream,
  useArchivedWorkstreamsCount,
  useSetWorkstreamLead,
} from '../../hooks/usePlannerWorkstreams';
import { useResourceInventory } from '../../hooks/useResourceInventory';
import { WorkstreamDrawer } from './WorkstreamDrawer';
import { CreateWorkstreamModal } from './CreateWorkstreamModal';
import { WorkstreamQuickEditDialog } from './WorkstreamQuickEditDialog';
import { ArchivedWorkstreamsView } from './ArchivedWorkstreamsView';
import { WorkstreamCard } from './WorkstreamCard';
import { WorkstreamMembersDialog } from './WorkstreamMembersDialog';
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

import { COLORS, getInitials, getIconColor, TeamMember } from './workstreams-constants';
import { SummaryCard } from './WorkstreamSummaryCard';
import { ViewToggleButton } from './WorkstreamViewToggle';
import { TableHeader } from './WorkstreamTableHeader';
import { WorkstreamRow } from './WorkstreamRowView';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function WorkstreamsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [leadSearchQuery, setLeadSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState<TeamMember[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [leads, setLeads] = useState<Record<string, TeamMember | null>>({});

  // Toolbar filter dropdowns
  const [showHealthFilter, setShowHealthFilter] = useState(false);
  const [showLeadFilter, setShowLeadFilter] = useState(false);
  const [healthFilter, setHealthFilter] = useState<string | null>(null);
  const [leadFilter, setLeadFilter] = useState<string | null>(null);
  const healthFilterRef = useRef<HTMLDivElement>(null);
  const leadFilterRef = useRef<HTMLDivElement>(null);

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeWorkstreamId, setActiveWorkstreamId] = useState<string | null>(null);

  // Create modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Quick edit dialog
  const [isQuickEditOpen, setIsQuickEditOpen] = useState(false);
  const [quickEditWorkstream, setQuickEditWorkstream] = useState<Workstream | null>(null);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Workstream | null>(null);

  // Members dialog
  const [membersDialogWorkstream, setMembersDialogWorkstream] = useState<Workstream | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close filter dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (healthFilterRef.current && !healthFilterRef.current.contains(e.target as Node)) {
        setShowHealthFilter(false);
      }
      if (leadFilterRef.current && !leadFilterRef.current.contains(e.target as Node)) {
        setShowLeadFilter(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Archive filter - check URL param
  const showArchived = searchParams.get('archived') === 'true';
  const { data: workstreams = [], isLoading } = usePlannerWorkstreams(showArchived);
  const { data: archivedCount = 0 } = useArchivedWorkstreamsCount();
  const { data: resources = [] } = useResourceInventory();
  const archiveWorkstream = useArchiveWorkstream();
  const deleteWorkstream = useDeleteWorkstream();
  const setWorkstreamLead = useSetWorkstreamLead();

  // Toggle archive view
  const toggleArchiveView = () => {
    if (showArchived) {
      searchParams.delete('archived');
    } else {
      searchParams.set('archived', 'true');
    }
    setSearchParams(searchParams);
  };

  // Build lead options from resource inventory (lead_id FK requires resource_inventory.id)
  useEffect(() => {
    setAllUsers(
      (resources || [])
        .filter(r => !!r.profile_id)
        .map((r) => ({
          id: r.id,
          profile_id: r.profile_id,
          name: r.name || 'Unknown',
          initials: r.initials || getInitials(r.name || 'U'),
          role: r.role || 'Team Member',
          avatarColor: COLORS.accent,
        }))
    );
  }, [resources]);

  // Build leads map from workstreams
  useEffect(() => {
    const leadsMap: Record<string, TeamMember> = {};
    workstreams.forEach((ws) => {
      if (ws.lead?.id && ws.lead?.name) {
        leadsMap[ws.lead.id] = {
          id: ws.lead.id,
          profile_id: null,
          name: ws.lead.name,
          initials: getInitials(ws.lead.name),
          role: 'Lead',
          avatarColor: COLORS.accent,
        };
      }
    });
    setLeads(leadsMap);
  }, [workstreams]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveDropdownId(null);
        setLeadSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Assign lead
  const handleAssignLead = async (workstreamId: string, user: TeamMember | null) => {
    try {
      await setWorkstreamLead.mutateAsync({
        workstreamId,
        leadResourceId: user ? user.id : null,
      });

      if (user) setLeads((prev) => ({ ...prev, [user.id]: user }));

      setActiveDropdownId(null);
      setLeadSearchQuery('');
    } catch (error) {
      console.error('Error assigning lead:', error);
    }
  };

  // Filtered workstreams
  const filteredWorkstreams = useMemo(() => {
    return workstreams.filter((ws) => {
      if (!showArchived && ws.is_archived) return false;
      if (showArchived && !ws.is_archived) return false;
      if (searchQuery && !ws.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      // Health filter
      if (healthFilter) {
        if (healthFilter === 'healthy' && ws.health !== 'healthy') return false;
        if (healthFilter === 'at-risk' && ws.health !== 'at-risk') return false;
        if (healthFilter === 'critical' && ws.health !== 'critical') return false;
      }
      // Lead filter
      if (leadFilter) {
        if (leadFilter === 'unassigned' && ws.lead) return false;
        if (leadFilter === 'assigned' && !ws.lead) return false;
      }
      return true;
    });
  }, [workstreams, searchQuery, showArchived, healthFilter, leadFilter]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, healthFilter, leadFilter, showArchived]);

  // Paginated workstreams
  const totalPages = Math.ceil(filteredWorkstreams.length / itemsPerPage);
  const paginatedWorkstreams = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredWorkstreams.slice(start, start + itemsPerPage);
  }, [filteredWorkstreams, currentPage, itemsPerPage]);

  const filteredUsers = allUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(leadSearchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(leadSearchQuery.toLowerCase())
  );

  // Compute summary stats (only for active workstreams)
  const stats = useMemo(() => {
    const activeWorkstreams = workstreams.filter((ws) => !ws.is_archived);
    return {
      total: activeWorkstreams.length,
      tasks: activeWorkstreams.reduce((sum, ws) => sum + (ws.taskCount || 0), 0),
      onTrack: activeWorkstreams.filter((ws) => ws.health === 'healthy').length,
      atRisk: activeWorkstreams.filter((ws) => ws.health === 'at-risk').length,
      critical: activeWorkstreams.filter((ws) => ws.health === 'critical').length,
    };
  }, [workstreams]);

  // Open drawer - store ID, not the stale object
  const openDrawer = useCallback((ws: Workstream) => {
    setActiveWorkstreamId(ws.id);
    setIsDrawerOpen(true);
  }, []);

  // Get fresh workstream from query data (auto-updates when query invalidates)
  const activeWorkstream = useMemo(() => {
    if (!activeWorkstreamId) return null;
    return workstreams.find(ws => ws.id === activeWorkstreamId) || null;
  }, [activeWorkstreamId, workstreams]);

  // Quick actions
  const handleQuickArchive = useCallback(
    (ws: Workstream, e: React.MouseEvent) => {
      e.stopPropagation();
      setIsDrawerOpen(false);
      archiveWorkstream.mutate({ id: ws.id, archive: !ws.is_archived });
    },
    [archiveWorkstream]
  );

  const handleQuickEdit = useCallback((ws: Workstream, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDrawerOpen(false);
    setQuickEditWorkstream(ws);
    setIsQuickEditOpen(true);
  }, []);

  const handleRequestDelete = useCallback((ws: Workstream, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDrawerOpen(false);
    setDeleteTarget(ws);
  }, []);

  // Show dedicated Archived view when in archived mode
  if (showArchived) {
    return (
      <ArchivedWorkstreamsView
        workstreams={filteredWorkstreams}
        isLoading={isLoading}
        onBack={toggleArchiveView}
      />
    );
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <div
      style={{
        backgroundColor: COLORS.surfacePage,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* PAGE HEADER - Dashboard Style */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          backgroundColor: COLORS.surfaceWhite,
          borderBottom: `1px solid ${COLORS.borderLight}`,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.25rem',
              lineHeight: '1.75rem',
              fontWeight: 700,
              color: 'var(--ds-text, var(--ds-text, #0f172a))',
              margin: 0,
            }}
          >
            Workstreams
          </h1>
          <p
            style={{
              fontSize: '0.875rem',
              lineHeight: '1.25rem',
              color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748b))',
              margin: 0,
            }}
          >
            {stats.total} workstreams · {stats.critical + stats.atRisk} need attention
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={toggleArchiveView}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              backgroundColor: COLORS.surfaceWhite,
              border: `1px solid ${COLORS.borderLight}`,
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              color: COLORS.textSecondary,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <Archive size={16} />
            Archived
            {archivedCount > 0 && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '20px',
                  height: '20px',
                  padding: '0 6px',
                  backgroundColor: 'var(--ds-surface-sunken, var(--ds-surface-sunken, #f1f5f9))',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748b))',
                }}
              >
                {archivedCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              backgroundColor: COLORS.accent,
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              color: 'var(--ds-surface, var(--ds-surface, #ffffff))',
              cursor: 'pointer',
              fontFamily: 'inherit',
              boxShadow: '0 1px 3px rgba(37, 99, 235, 0.2)',
            }}
          >
            <Plus size={16} />
            New Workstream
          </button>
        </div>
      </div>
      
      {/* Content Container - Scrollable */}
      <div style={{ padding: '24px', flex: 1, overflowY: 'auto', minHeight: 0 }}>

      {/* SUMMARY CARDS */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <SummaryCard value={stats.total} label="Workstreams" isActive />
        <SummaryCard value={stats.tasks} label="Tasks" />
        <SummaryCard
          value={stats.onTrack}
          label="On Track"
          icon={<CheckCircle2 size={20} style={{ color: COLORS.success }} />}
        />
        <SummaryCard
          value={stats.atRisk}
          label="At Risk"
          icon={<AlertTriangle size={20} style={{ color: COLORS.warning }} />}
        />
        <SummaryCard
          value={stats.critical}
          label="Critical"
          icon={<AlertCircle size={20} style={{ color: COLORS.danger }} />}
        />
      </div>

      {/* TABLE CONTAINER */}
      <div
        style={{
          backgroundColor: COLORS.surfaceWhite,
          border: `1px solid ${COLORS.borderLight}`,
          borderRadius: '16px',
          overflow: 'hidden',
        }}
      >
        {/* TOOLBAR */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: `1px solid ${COLORS.borderLight}`,
          }}
        >
          {/* Search */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              backgroundColor: COLORS.surfacePage,
              border: `1px solid ${COLORS.borderLight}`,
              borderRadius: '12px',
              width: '320px',
            }}
          >
            <Search size={16} style={{ color: COLORS.textLight }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search workstreams..."
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
            <span
              style={{
                padding: '4px 8px',
                backgroundColor: COLORS.borderLight,
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 500,
                color: COLORS.textMuted,
              }}
            >
              ⌘K
            </span>
          </div>

          {/* Filters + View Toggle */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Health Filter Dropdown */}
            <div ref={healthFilterRef} style={{ position: 'relative' }}>
              <button
                onClick={() => {
                  setShowHealthFilter(!showHealthFilter);
                  setShowLeadFilter(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  backgroundColor: healthFilter ? 'var(--ds-background-selected, var(--ds-background-selected, #eff6ff))' : COLORS.surfaceWhite,
                  border: `1px solid ${healthFilter ? 'var(--ds-text-brand, var(--ds-text-brand, #3b82f6))' : COLORS.borderLight}`,
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: healthFilter ? 'var(--ds-text-brand, var(--ds-text-brand, #2563eb))' : COLORS.textSecondary,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Health
                {healthFilter && (
                  <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--ds-text-brand, var(--ds-text-brand, #2563eb))',
                  }} />
                )}
                <ChevronDown size={16} style={{ color: COLORS.textMuted }} />
              </button>

              {showHealthFilter && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    right: 0,
                    width: '180px',
                    backgroundColor: 'var(--ds-surface, var(--ds-surface, #ffffff))',
                    border: `1px solid ${COLORS.borderDefault}`,
                    borderRadius: '12px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                    zIndex: 9999,
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ padding: '4px' }}>
                    {[
                      { value: null, label: 'All', color: COLORS.textMuted },
                      { value: 'healthy', label: 'On Track', color: COLORS.success },
                      { value: 'at-risk', label: 'At Risk', color: COLORS.warning },
                      { value: 'critical', label: 'Critical', color: COLORS.danger },
                    ].map((option) => (
                      <button
                        key={option.label}
                        onClick={() => {
                          setHealthFilter(option.value);
                          setShowHealthFilter(false);
                        }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 12px',
                          backgroundColor: healthFilter === option.value ? COLORS.surfaceHover : 'transparent',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: 500,
                          color: COLORS.textPrimary,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          textAlign: 'left',
                        }}
                      >
                        {option.value && (
                          <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: option.color,
                          }} />
                        )}
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Lead Filter Dropdown */}
            <div ref={leadFilterRef} style={{ position: 'relative' }}>
              <button
                onClick={() => {
                  setShowLeadFilter(!showLeadFilter);
                  setShowHealthFilter(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  backgroundColor: leadFilter ? 'var(--ds-background-selected, var(--ds-background-selected, #eff6ff))' : COLORS.surfaceWhite,
                  border: `1px solid ${leadFilter ? 'var(--ds-text-brand, var(--ds-text-brand, #3b82f6))' : COLORS.borderLight}`,
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: leadFilter ? 'var(--ds-text-brand, var(--ds-text-brand, #2563eb))' : COLORS.textSecondary,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Lead
                {leadFilter && (
                  <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--ds-text-brand, var(--ds-text-brand, #2563eb))',
                  }} />
                )}
                <ChevronDown size={16} style={{ color: COLORS.textMuted }} />
              </button>

              {showLeadFilter && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    right: 0,
                    width: '180px',
                    backgroundColor: 'var(--ds-surface, var(--ds-surface, #ffffff))',
                    border: `1px solid ${COLORS.borderDefault}`,
                    borderRadius: '12px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                    zIndex: 9999,
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ padding: '4px' }}>
                    {[
                      { value: null, label: 'All' },
                      { value: 'assigned', label: 'Assigned' },
                      { value: 'unassigned', label: 'Unassigned' },
                    ].map((option) => (
                      <button
                        key={option.label}
                        onClick={() => {
                          setLeadFilter(option.value);
                          setShowLeadFilter(false);
                        }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 12px',
                          backgroundColor: leadFilter === option.value ? COLORS.surfaceHover : 'transparent',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: 500,
                          color: COLORS.textPrimary,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          textAlign: 'left',
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                backgroundColor: COLORS.surfaceHover,
                borderRadius: '8px',
                padding: '4px',
              }}
            >
              <ViewToggleButton
                icon={<List size={16} />}
                label="List"
                isActive={viewMode === 'list'}
                onClick={() => setViewMode('list')}
              />
              <ViewToggleButton
                icon={<LayoutGrid size={16} />}
                label="Grid"
                isActive={viewMode === 'grid'}
                onClick={() => setViewMode('grid')}
              />
            </div>
          </div>
        </div>

        {/* TABLE */}
        {isLoading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: COLORS.textMuted }}>
            Loading workstreams...
          </div>
        ) : filteredWorkstreams.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: COLORS.textMuted }}>
            {searchQuery ? 'No workstreams match your search' : 'No workstreams yet'}
          </div>
        ) : viewMode === 'list' ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr
                style={{
                  backgroundColor: COLORS.surfacePage,
                  borderBottom: `1px solid ${COLORS.borderLight}`,
                }}
              >
                <TableHeader width="30%">WORKSTREAM</TableHeader>
                <TableHeader width="18%">LEAD</TableHeader>
                <TableHeader width="12%">HEALTH</TableHeader>
                <TableHeader width="8%" center>
                  TASKS
                </TableHeader>
                <TableHeader width="8%" center>
                  OVERDUE
                </TableHeader>
                <TableHeader width="8%" center>
                  MEMBERS
                </TableHeader>
                <TableHeader width="8%" />
              </tr>
            </thead>
            <tbody>
              {paginatedWorkstreams.map((workstream, index) => {
                const lead = workstream.lead
                  ? {
                      id: workstream.lead.id,
                      profile_id: null,
                      name: workstream.lead.name,
                      initials: getInitials(workstream.lead.name),
                      role: 'Lead',
                      avatarColor: COLORS.accent,
                    }
                  : null;

                return (
                  <WorkstreamRow
                    key={workstream.id}
                    workstream={workstream}
                    lead={lead}
                    iconColor={getIconColor((currentPage - 1) * itemsPerPage + index)}
                    allUsers={filteredUsers}
                    isDropdownOpen={activeDropdownId === workstream.id}
                    leadSearchQuery={leadSearchQuery}
                    onToggleDropdown={() => {
                      setActiveDropdownId(activeDropdownId === workstream.id ? null : workstream.id);
                      setLeadSearchQuery('');
                    }}
                    onLeadSearchChange={setLeadSearchQuery}
                    onAssignLead={(user) => handleAssignLead(workstream.id, user)}
                    dropdownRef={activeDropdownId === workstream.id ? dropdownRef : undefined}
                    onRowClick={() => openDrawer(workstream)}
                    onArchive={(e) => handleQuickArchive(workstream, e)}
                    onEdit={(e) => handleQuickEdit(workstream, e)}
                    onDelete={(e) => handleRequestDelete(workstream, e)}
                    onMembersClick={(e) => {
                      e.stopPropagation();
                      setMembersDialogWorkstream(workstream);
                    }}
                  />
                );
              })}
            </tbody>
          </table>
        ) : (
          // Grid View
          <div
            style={{
              padding: '24px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '20px',
            }}
          >
            {paginatedWorkstreams.map((ws, index) => (
              <WorkstreamCard
                key={ws.id}
                workstream={ws}
                  onLeadChange={(workstreamId, leadId) =>
                    setWorkstreamLead.mutate({ workstreamId, leadResourceId: leadId })
                  }
                onEdit={(id) => {
                  const target = workstreams.find((w) => w.id === id);
                  if (target) {
                    setQuickEditWorkstream(target);
                    setIsQuickEditOpen(true);
                  }
                }}
                onArchive={(id) => {
                  const target = workstreams.find((w) => w.id === id);
                  if (target) {
                    archiveWorkstream.mutate({ id, archive: !target.is_archived });
                  }
                }}
                onDelete={(id) => {
                  const target = workstreams.find((w) => w.id === id);
                  if (target) {
                    setDeleteTarget(target);
                  }
                }}
                onOpenDrawer={openDrawer}
              />
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {filteredWorkstreams.length > itemsPerPage && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 24px',
              borderTop: `1px solid ${COLORS.borderLight}`,
              backgroundColor: COLORS.surfacePage,
            }}
          >
            <span style={{ fontSize: '13px', color: COLORS.textMuted }}>
              Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredWorkstreams.length)} of {filteredWorkstreams.length}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  backgroundColor: currentPage === 1 ? COLORS.surfaceHover : COLORS.surfaceWhite,
                  border: `1px solid ${COLORS.borderLight}`,
                  borderRadius: '6px',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  opacity: currentPage === 1 ? 0.5 : 1,
                }}
              >
                <ChevronLeft size={16} style={{ color: COLORS.textSecondary }} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '32px',
                    height: '32px',
                    padding: '0 10px',
                    backgroundColor: page === currentPage ? COLORS.accent : COLORS.surfaceWhite,
                    border: `1px solid ${page === currentPage ? COLORS.accent : COLORS.borderLight}`,
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: page === currentPage ? 600 : 500,
                    color: page === currentPage ? 'var(--ds-surface, var(--ds-surface, #ffffff))' : COLORS.textSecondary,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  backgroundColor: currentPage === totalPages ? COLORS.surfaceHover : COLORS.surfaceWhite,
                  border: `1px solid ${COLORS.borderLight}`,
                  borderRadius: '6px',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  opacity: currentPage === totalPages ? 0.5 : 1,
                }}
              >
                <ChevronRight size={16} style={{ color: COLORS.textSecondary }} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Drawer */}
      <WorkstreamDrawer
        workstream={activeWorkstream}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />

      {/* Quick Edit (pencil) */}
      <WorkstreamQuickEditDialog
        open={isQuickEditOpen}
        onOpenChange={setIsQuickEditOpen}
        workstream={quickEditWorkstream}
      />

      {/* Delete */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete workstream?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the workstream. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteTarget) return;
                await deleteWorkstream.mutateAsync(deleteTarget.id);
                setDeleteTarget(null);
              }}
              disabled={deleteWorkstream.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Modal */}
      <CreateWorkstreamModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />

      {/* Members Dialog */}
      <WorkstreamMembersDialog
        open={!!membersDialogWorkstream}
        onOpenChange={(open) => !open && setMembersDialogWorkstream(null)}
        workstream={membersDialogWorkstream}
      />
      </div>
    </div>
  );
}

export default WorkstreamsPage;
