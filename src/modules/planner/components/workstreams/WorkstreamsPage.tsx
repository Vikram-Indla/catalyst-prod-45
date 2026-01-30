// ============================================================================
// WORKSTREAMS V10 - Main Page Component
// Enterprise Clean design with INLINE STYLES per spec
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Plus,
  Search,
  ChevronDown,
  List,
  LayoutGrid,
  Archive,
  ArchiveRestore,
  Edit2,
  Trash2,
  User,
  Check,
  X,
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
// COLOR CONSTANTS — CATALYST V5 DESIGN SYSTEM
// ============================================================================

const COLORS = {
  // Text
  textPrimary: '#0f172a',
  textSecondary: '#334155',
  textMuted: '#64748b',
  textLight: '#94a3b8',

  // Surfaces
  surfaceWhite: '#ffffff',
  surfacePage: '#f8fafc',
  surfaceHover: '#f1f5f9',
  surfaceSelected: '#dbeafe',

  // Borders
  borderLight: '#e2e8f0',
  borderDefault: '#cbd5e1',

  // Brand
  accent: '#2563eb',
  accentHover: '#1d4ed8',
  accentLight: '#dbeafe',
  accentLighter: '#eff6ff',

  // Status
  success: '#16a34a',
  successBg: '#f0fdf4',

  warning: '#f59e0b',
  warningText: '#b45309',
  warningBg: '#fffbeb',

  danger: '#dc2626',
  dangerBg: '#fef2f2',
  dangerBorder: '#fecaca',
};

// ============================================================================
// ICON COLORS (Gradient backgrounds for workstream avatars)
// ============================================================================

const ICON_COLORS = [
  'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
  'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
  'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
  'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
  'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
  'linear-gradient(135deg, #64748b 0%, #475569 100%)',
];

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

const getIconColor = (index: number): string => {
  return ICON_COLORS[index % ICON_COLORS.length];
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// ============================================================================
// TYPES
// ============================================================================

interface TeamMember {
  id: string;
  profile_id: string | null;
  name: string;
  initials: string;
  role: string;
  avatarColor: string;
}

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
  const [leads, setLeads] = useState<Record<string, TeamMember | null>>({});

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeWorkstream, setActiveWorkstream] = useState<Workstream | null>(null);

  // Create modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Quick edit dialog
  const [isQuickEditOpen, setIsQuickEditOpen] = useState(false);
  const [quickEditWorkstream, setQuickEditWorkstream] = useState<Workstream | null>(null);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Workstream | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

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
      return true;
    });
  }, [workstreams, searchQuery, showArchived]);

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

  // Open drawer
  const openDrawer = useCallback((ws: Workstream) => {
    setActiveWorkstream(ws);
    setIsDrawerOpen(true);
  }, []);

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
        padding: '32px 40px',
        backgroundColor: COLORS.surfacePage,
        minHeight: '100vh',
      }}
    >
      {/* PAGE HEADER */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '24px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: COLORS.textPrimary,
              margin: 0,
            }}
          >
            Workstreams
          </h1>
          <p
            style={{
              fontSize: '14px',
              color: COLORS.textMuted,
              marginTop: '4px',
              margin: 0,
            }}
          >
            {stats.total} workstreams · {stats.critical + stats.atRisk} need attention
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={toggleArchiveView}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              backgroundColor: COLORS.surfaceWhite,
              border: `1px solid ${COLORS.borderLight}`,
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 500,
              color: COLORS.textSecondary,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <Archive size={16} />
            Archived
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              backgroundColor: COLORS.accent,
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#ffffff',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <Plus size={16} />
            New Workstream
          </button>
        </div>
      </div>

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
              borderRadius: '10px',
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
          <div style={{ display: 'flex', gap: '8px' }}>
            <FilterButton label="Health" />
            <FilterButton label="Lead" />

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
                <TableHeader width="35%">WORKSTREAM</TableHeader>
                <TableHeader width="20%">LEAD</TableHeader>
                <TableHeader width="15%">HEALTH</TableHeader>
                <TableHeader width="10%" center>
                  TASKS
                </TableHeader>
                <TableHeader width="10%" center>
                  OVERDUE
                </TableHeader>
                <TableHeader width="10%" />
              </tr>
            </thead>
            <tbody>
              {filteredWorkstreams.map((workstream, index) => {
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
                    iconColor={getIconColor(index)}
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
            {filteredWorkstreams.map((ws) => (
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
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const SummaryCard: React.FC<{
  value: number;
  label: string;
  icon?: React.ReactNode;
  isActive?: boolean;
}> = ({ value, label, icon, isActive }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '16px 20px',
      backgroundColor: isActive ? COLORS.accentLighter : COLORS.surfaceWhite,
      border: `1px solid ${isActive ? COLORS.accent : COLORS.borderLight}`,
      borderRadius: '12px',
      minWidth: '140px',
    }}
  >
    {icon}
    <div>
      <div
        style={{
          fontSize: '28px',
          fontWeight: 700,
          color: isActive ? COLORS.accent : COLORS.textPrimary,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: '13px', color: COLORS.textMuted, marginTop: '2px' }}>{label}</div>
    </div>
  </div>
);

const FilterButton: React.FC<{ label: string }> = ({ label }) => (
  <button
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '8px 14px',
      backgroundColor: COLORS.surfaceWhite,
      border: `1px solid ${COLORS.borderLight}`,
      borderRadius: '8px',
      fontSize: '13px',
      fontWeight: 500,
      color: COLORS.textSecondary,
      cursor: 'pointer',
      fontFamily: 'inherit',
    }}
  >
    {label}
    <ChevronDown size={16} style={{ color: COLORS.textMuted }} />
  </button>
);

const ViewToggleButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '8px 14px',
      backgroundColor: isActive ? COLORS.surfaceWhite : 'transparent',
      border: 'none',
      borderRadius: '6px',
      fontSize: '13px',
      fontWeight: 500,
      color: isActive ? COLORS.textPrimary : COLORS.textMuted,
      cursor: 'pointer',
      fontFamily: 'inherit',
      boxShadow: isActive ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
    }}
  >
    {icon}
    {label}
  </button>
);

const TableHeader: React.FC<{
  children?: React.ReactNode;
  width: string;
  center?: boolean;
}> = ({ children, width, center }) => (
  <th
    style={{
      padding: '14px 20px',
      textAlign: center ? 'center' : 'left',
      fontSize: '11px',
      fontWeight: 600,
      color: COLORS.textMuted,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      width,
    }}
  >
    {children}
  </th>
);

const WorkstreamRow: React.FC<{
  workstream: Workstream;
  lead: TeamMember | null;
  iconColor: string;
  allUsers: TeamMember[];
  isDropdownOpen: boolean;
  leadSearchQuery: string;
  onToggleDropdown: () => void;
  onLeadSearchChange: (query: string) => void;
  onAssignLead: (user: TeamMember | null) => void;
  dropdownRef?: React.RefObject<HTMLDivElement>;
  onRowClick: () => void;
  onArchive: (e: React.MouseEvent) => void;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}> = ({
  workstream,
  lead,
  iconColor,
  allUsers,
  isDropdownOpen,
  leadSearchQuery,
  onToggleDropdown,
  onLeadSearchChange,
  onAssignLead,
  dropdownRef,
  onRowClick,
  onArchive,
  onEdit,
  onDelete,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const healthConfig = {
    healthy: { label: 'On Track', bg: COLORS.successBg, color: COLORS.success },
    'at-risk': { label: 'At Risk', bg: COLORS.warningBg, color: COLORS.warningText },
    critical: { label: 'Critical', bg: COLORS.dangerBg, color: COLORS.danger },
    locked: { label: 'Locked', bg: COLORS.surfaceHover, color: COLORS.textMuted },
  }[workstream.health || 'healthy'] || { label: 'On Track', bg: COLORS.successBg, color: COLORS.success };

  return (
    <tr
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onRowClick}
      style={{
        borderBottom: `1px solid ${COLORS.surfaceHover}`,
        backgroundColor: isHovered ? COLORS.surfacePage : 'transparent',
        cursor: 'pointer',
      }}
    >
      {/* NAME CELL */}
      <td style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: iconColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              fontWeight: 700,
              color: '#ffffff',
            }}
          >
            {workstream.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: COLORS.textPrimary }}>
              {workstream.name}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                color: COLORS.textMuted,
              }}
            >
              <span
                style={{
                  fontFamily: '"SF Mono", Monaco, monospace',
                  fontSize: '11px',
                  fontWeight: 500,
                  backgroundColor: COLORS.surfaceHover,
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}
              >
                {workstream.code || workstream.key_prefix || workstream.name.substring(0, 3).toUpperCase()}
              </span>
              <span>·</span>
              <span>Created {formatDate(workstream.created_at || new Date().toISOString())}</span>
            </div>
          </div>
        </div>
      </td>

      {/* LEAD CELL */}
      <td style={{ padding: '16px 20px', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
        <div ref={dropdownRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleDropdown();
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 10px',
              backgroundColor: 'transparent',
              border: `1px solid ${isHovered || isDropdownOpen ? COLORS.borderDefault : 'transparent'}`,
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {lead ? (
              <>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: lead.avatarColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#ffffff',
                  }}
                >
                  {lead.initials}
                </div>
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    color: COLORS.textPrimary,
                    maxWidth: '120px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {lead.name}
                </span>
              </>
            ) : (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  color: COLORS.textLight,
                }}
              >
                <User size={18} />
                Unassigned
              </span>
            )}
            <ChevronDown
              size={14}
              style={{ color: COLORS.textLight, opacity: isHovered || isDropdownOpen ? 1 : 0 }}
            />
          </button>

          {isDropdownOpen && (
            <LeadPickerDropdown
              users={allUsers}
              selectedId={lead?.id}
              searchQuery={leadSearchQuery}
              onSearchChange={onLeadSearchChange}
              onSelect={onAssignLead}
              showRemove={!!lead}
            />
          )}
        </div>
      </td>

      {/* HEALTH CELL */}
      <td style={{ padding: '16px 20px' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            backgroundColor: healthConfig.bg,
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 500,
            color: healthConfig.color,
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: healthConfig.color,
            }}
          />
          {healthConfig.label}
        </span>
      </td>

      {/* TASKS CELL */}
      <td
        style={{
          padding: '16px 20px',
          textAlign: 'center',
          fontSize: '14px',
          fontWeight: 500,
          color: COLORS.textSecondary,
        }}
      >
        {workstream.taskCount || 0}
      </td>

      {/* OVERDUE CELL */}
      <td
        style={{
          padding: '16px 20px',
          textAlign: 'center',
          fontSize: '14px',
          fontWeight: 600,
          color: (workstream.overdueCount || 0) > 0 ? COLORS.danger : COLORS.textLight,
        }}
      >
        {workstream.overdueCount || 0}
      </td>

      {/* ACTIONS CELL */}
      <td style={{ padding: '16px 20px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '4px',
            opacity: isHovered ? 1 : 0,
          }}
        >
          <ActionButton icon={<Archive size={16} />} title="Archive" onClick={onArchive} />
          <ActionButton icon={<Edit2 size={16} />} title="Edit" onClick={onEdit} />
          <ActionButton
            icon={<Trash2 size={16} />}
            title="Delete"
            danger
            onClick={onDelete}
            disabled={(workstream.taskCount || 0) > 0}
          />
        </div>
      </td>
    </tr>
  );
};

const ActionButton: React.FC<{
  icon: React.ReactNode;
  title: string;
  danger?: boolean;
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
}> = ({ icon, title, danger, onClick, disabled }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onClick(e);
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={title}
      disabled={disabled}
      style={{
        width: '32px',
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isHovered && !disabled ? (danger ? COLORS.dangerBg : COLORS.surfaceHover) : 'transparent',
        border: `1px solid ${isHovered && !disabled ? (danger ? COLORS.dangerBorder : COLORS.borderLight) : 'transparent'}`,
        borderRadius: '6px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: isHovered && !disabled ? (danger ? COLORS.danger : COLORS.textSecondary) : COLORS.textMuted,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {icon}
    </button>
  );
};

const LeadPickerDropdown: React.FC<{
  users: TeamMember[];
  selectedId?: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelect: (user: TeamMember | null) => void;
  showRemove: boolean;
}> = ({ users, selectedId, searchQuery, onSearchChange, onSelect, showRemove }) => (
  <div
    style={{
      position: 'absolute',
      top: 'calc(100% + 4px)',
      left: 0,
      width: '280px',
      backgroundColor: COLORS.surfaceWhite,
      border: `1px solid ${COLORS.borderLight}`,
      borderRadius: '12px',
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.12)',
      zIndex: 100,
      overflow: 'hidden',
    }}
    onClick={(e) => e.stopPropagation()}
  >
    {/* Search */}
    <div style={{ padding: '12px', borderBottom: `1px solid ${COLORS.surfaceHover}` }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          backgroundColor: COLORS.surfacePage,
          borderRadius: '8px',
        }}
      >
        <Search size={16} style={{ color: COLORS.textLight }} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search members..."
          autoFocus
          style={{
            flex: 1,
            border: 'none',
            backgroundColor: 'transparent',
            fontSize: '13px',
            color: COLORS.textPrimary,
            outline: 'none',
            fontFamily: 'inherit',
          }}
        />
      </div>
    </div>

    {/* List */}
    <div style={{ maxHeight: '240px', overflowY: 'auto', padding: '8px' }}>
      {users.length === 0 ? (
        <div style={{ padding: '16px', textAlign: 'center', color: COLORS.textMuted, fontSize: '13px' }}>
          No members found
        </div>
      ) : (
        users.map((user) => (
          <DropdownItem key={user.id} user={user} isSelected={selectedId === user.id} onClick={() => onSelect(user)} />
        ))
      )}
    </div>

    {/* Remove */}
    {showRemove && (
      <div style={{ padding: '8px 12px', borderTop: `1px solid ${COLORS.surfaceHover}` }}>
        <button
          onClick={() => onSelect(null)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            width: '100%',
            padding: '10px 12px',
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            color: COLORS.danger,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <X size={16} />
          Remove assignment
        </button>
      </div>
    )}
  </div>
);

const DropdownItem: React.FC<{
  user: TeamMember;
  isSelected: boolean;
  onClick: () => void;
}> = ({ user, isSelected, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '8px 10px',
        borderRadius: '8px',
        cursor: 'pointer',
        backgroundColor: isSelected ? COLORS.surfaceSelected : isHovered ? COLORS.surfaceHover : 'transparent',
        marginBottom: '2px',
      }}
    >
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          backgroundColor: user.avatarColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 600,
          color: '#ffffff',
        }}
      >
        {user.initials}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '13px', fontWeight: 500, color: COLORS.textPrimary }}>{user.name}</div>
        <div style={{ fontSize: '11px', color: COLORS.textMuted }}>{user.role}</div>
      </div>
      {isSelected && <Check size={16} style={{ color: COLORS.accent }} />}
    </div>
  );
};

export default WorkstreamsPage;
