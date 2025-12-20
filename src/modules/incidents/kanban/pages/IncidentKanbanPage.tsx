/**
 * Incident Kanban Page
 * Production-grade Kanban board for Incident management
 */

import { useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, RefreshCw, Settings2, ChevronsLeftRight, ChevronsRightLeft, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TooltipProvider } from '@/components/ui/tooltip';
import { GlobalPageHeader } from '@/components/layout/GlobalPageHeader';
import { IncidentCommandBar } from '@/components/incidents/IncidentCommandBar';
import { CreateIncidentModal, IncidentFormData } from '@/components/incidents/CreateIncidentModal';
import { useIncidents, useUpdateIncident, useCreateIncident } from '@/hooks/useIncidents';
import { useUserRole } from '@/hooks/useUserRole';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

import { KanbanColumn } from '../components/KanbanColumn';
import { KanbanSwimlane } from '../components/KanbanSwimlane';
import { ManageColumnsDialog } from '../components/ManageColumnsDialog';
import { QuickFilterChips } from '../components/QuickFilterChips';
import { SetCommitteeApproversModal, CommitteeSetupData } from '../components/SetCommitteeApproversModal';
import { useKanbanColumnPrefs } from '../hooks/useKanbanColumnPrefs';
import { useKanbanColumnConfig } from '../hooks/useKanbanColumnConfig';
import {
  OPEN_STATUSES,
  GROUP_BY_OPTIONS,
  groupIncidents,
  type GroupByOption,
  getSlaHealth,
  type QuickFilterKey,
  QUICK_FILTERS,
  applyQuickFilters,
} from '../types';
import type { Incident, IncidentStatus } from '@/types/incident';

// Pending committee drop context
interface PendingCommitteeDrop {
  incidentId: string;
  incident: Incident;
  previousStatus: IncidentStatus;
}

export default function IncidentKanbanPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin } = useUserRole();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [manageColumnsOpen, setManageColumnsOpen] = useState(false);
  const [showOpenOnly, setShowOpenOnly] = useState(true);
  const [groupBy, setGroupBy] = useState<GroupByOption>('none');
  const [quickFilters, setQuickFilters] = useState<QuickFilterKey[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [optimisticUpdates, setOptimisticUpdates] = useState<Record<string, IncidentStatus>>({});
  
  // Committee modal state
  const [committeeModalOpen, setCommitteeModalOpen] = useState(false);
  const [committeeModalMode, setCommitteeModalMode] = useState<'create' | 'edit'>('create');
  const [editingCommitteeIncident, setEditingCommitteeIncident] = useState<Incident | null>(null);
  const pendingCommitteeDrop = useRef<PendingCommitteeDrop | null>(null);

  const { data: incidents, isLoading, error, refetch } = useIncidents({});
  const updateIncident = useUpdateIncident();
  const createIncident = useCreateIncident();

  // Column preferences (collapse state)
  const {
    isCollapsed,
    toggleCollapsed,
    collapseAll,
    expandAll,
    collapsedColumns,
  } = useKanbanColumnPrefs();

  // Column configuration (admin)
  const {
    orderedStatuses,
    addColumn,
    removeColumn,
    reorderColumns,
    resetToDefaults,
    getAddableStatuses,
    canRemove,
  } = useKanbanColumnConfig();

  // Get configured and ordered statuses
  const configuredStatuses = useMemo(() => orderedStatuses(), [orderedStatuses]);

  // Determine visible statuses based on toggle and config
  const visibleStatuses = useMemo(() => {
    if (showOpenOnly) {
      return configuredStatuses.filter(s => OPEN_STATUSES.includes(s));
    }
    return configuredStatuses;
  }, [showOpenOnly, configuredStatuses]);

  // Base filtered incidents (status filter + optimistic updates)
  const baseFilteredIncidents = useMemo(() => {
    if (!incidents) return [];
    
    return incidents
      .filter(incident => {
        const effectiveStatus = optimisticUpdates[incident.id] || incident.status;
        return visibleStatuses.includes(effectiveStatus);
      })
      .map(incident => {
        if (optimisticUpdates[incident.id]) {
          return { ...incident, status: optimisticUpdates[incident.id] };
        }
        return incident;
      });
  }, [incidents, visibleStatuses, optimisticUpdates]);

  // Compute quick filter counts (before applying quick filters)
  const quickFilterCounts = useMemo(() => {
    const counts: Record<QuickFilterKey, number> = {
      major: 0,
      committee: 0,
      unassigned: 0,
      sev1: 0,
      at_risk: 0,
      breached: 0,
    };

    baseFilteredIncidents.forEach(inc => {
      QUICK_FILTERS.forEach(filter => {
        if (filter.match(inc)) {
          counts[filter.key]++;
        }
      });
    });

    return counts;
  }, [baseFilteredIncidents]);

  // Apply quick filters
  const filteredIncidents = useMemo(() => {
    return applyQuickFilters(baseFilteredIncidents, quickFilters);
  }, [baseFilteredIncidents, quickFilters]);

  // Group incidents by status for non-swimlane view
  const incidentsByStatus = useMemo(() => {
    const grouped: Record<IncidentStatus, Incident[]> = {} as Record<IncidentStatus, Incident[]>;
    visibleStatuses.forEach(status => {
      grouped[status] = [];
    });
    filteredIncidents.forEach(incident => {
      if (grouped[incident.status]) {
        grouped[incident.status].push(incident);
      }
    });
    return grouped;
  }, [filteredIncidents, visibleStatuses]);

  // Group incidents into swimlanes
  const swimlanes = useMemo(() => {
    return groupIncidents(filteredIncidents, groupBy);
  }, [filteredIncidents, groupBy]);

  // Check if any columns are collapsed
  const hasCollapsedColumns = collapsedColumns.length > 0;

  // Toggle quick filter
  const handleToggleQuickFilter = useCallback((key: QuickFilterKey) => {
    setQuickFilters(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  }, []);

  // Drag handlers
  const handleDragStart = useCallback((e: React.DragEvent, incident: Incident) => {
    setDraggingId(incident.id);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
  }, []);

  // Drop handler with optimistic update - GATED for Committee column
  const handleDrop = useCallback(async (incidentId: string, newStatus: IncidentStatus) => {
    const incident = incidents?.find(i => i.id === incidentId);
    if (!incident || incident.status === newStatus) return;

    // GATED: If dropping to Committee, show modal first
    if (newStatus === 'to_committee') {
      // Store the pending drop context
      pendingCommitteeDrop.current = {
        incidentId,
        incident,
        previousStatus: incident.status,
      };
      // Apply optimistic update to show card in Committee column
      setOptimisticUpdates(prev => ({ ...prev, [incidentId]: newStatus }));
      setDraggingId(null);
      // Open the modal in create mode
      setCommitteeModalMode('create');
      setCommitteeModalOpen(true);
      return;
    }

    // Normal drop flow for non-Committee statuses
    setOptimisticUpdates(prev => ({ ...prev, [incidentId]: newStatus }));
    setDraggingId(null);

    try {
      await updateIncident.mutateAsync({
        id: incidentId,
        data: { status: newStatus } as any,
      });
      
      setOptimisticUpdates(prev => {
        const next = { ...prev };
        delete next[incidentId];
        return next;
      });
      
      toast.success(`Moved to ${newStatus.replace('_', ' ')}`);
    } catch (err: any) {
      setOptimisticUpdates(prev => {
        const next = { ...prev };
        delete next[incidentId];
        return next;
      });
      
      toast.error(`Failed to update status: ${err?.message || 'Unknown error'}`);
    }
  }, [incidents, updateIncident]);

  // Handle Committee modal confirm
  const handleCommitteeConfirm = useCallback(async (data: CommitteeSetupData) => {
    const pending = pendingCommitteeDrop.current;
    if (!pending) return;

    const { incidentId, incident } = pending;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Create the committee record
      const { data: newCommittee, error: createError } = await supabase
        .from('incident_committees')
        .insert({
          incident_id: incidentId,
          status: 'pending',
          required_approvals: data.approverIds.length,
          created_by: user?.id,
          decision_note: data.notes || null,
          due_date: data.dueDate || null,
        })
        .select()
        .single();

      if (createError) throw createError;

      // 2. Add committee members
      for (const userId of data.approverIds) {
        const { error: memberError } = await supabase
          .from('committee_members')
          .insert({
            committee_id: newCommittee.id,
            user_id: userId,
            has_veto: false,
            role: null,
          });

        if (memberError) {
          console.error('Failed to add member:', memberError);
          continue;
        }

        // Create vote record for member
        const { data: member } = await supabase
          .from('committee_members')
          .select('id')
          .eq('committee_id', newCommittee.id)
          .eq('user_id', userId)
          .single();

        if (member) {
          await supabase.from('committee_votes').insert({
            committee_id: newCommittee.id,
            member_id: member.id,
            vote: 'pending',
          });
        }
      }

      // 3. Update incident: link committee and set status
      // Backend trigger validates: committee must exist with at least 1 approver
      // Backend trigger also sets: committee_set_at, committee_set_by, requires_committee
      // Backend trigger also logs: status change and committee configuration to incident_history
      const { error: updateError } = await supabase
        .from('incidents')
        .update({
          committee_id: newCommittee.id,
          status: 'to_committee',
          requires_committee: true,
        })
        .eq('id', incidentId);

      if (updateError) {
        // Backend validation failed - show specific message
        const message = updateError.message?.includes('approver') 
          ? 'Add at least one approver to place in Committee'
          : updateError.message || 'Failed to update status';
        throw new Error(message);
      }

      // Clear optimistic update and pending context
      setOptimisticUpdates(prev => {
        const next = { ...prev };
        delete next[incidentId];
        return next;
      });
      pendingCommitteeDrop.current = null;
      setCommitteeModalOpen(false);

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident-committee', incidentId] });

      toast.success('Moved to Committee with approvers configured');
    } catch (err: any) {
      console.error('Failed to set up committee:', err);
      toast.error(`Failed to set up committee: ${err?.message || 'Unknown error'}`);
      
      // Revert optimistic update on error
      setOptimisticUpdates(prev => {
        const next = { ...prev };
        delete next[incidentId];
        return next;
      });
      pendingCommitteeDrop.current = null;
      setCommitteeModalOpen(false);
    }
  }, [queryClient]);

  // Handle Committee modal cancel - revert the drop (only in create mode)
  const handleCommitteeCancel = useCallback(() => {
    if (committeeModalMode === 'create') {
      const pending = pendingCommitteeDrop.current;
      if (pending) {
        // Revert optimistic update
        setOptimisticUpdates(prev => {
          const next = { ...prev };
          delete next[pending.incidentId];
          return next;
        });
        pendingCommitteeDrop.current = null;
      }
    }
    setCommitteeModalOpen(false);
    setEditingCommitteeIncident(null);
  }, [committeeModalMode]);

  // Handle Edit Committee click from card
  const handleEditCommittee = useCallback((incident: Incident) => {
    setEditingCommitteeIncident(incident);
    setCommitteeModalMode('edit');
    setCommitteeModalOpen(true);
  }, []);

  // Handle Edit Committee confirm - update existing committee
  const handleEditCommitteeConfirm = useCallback(async (data: CommitteeSetupData) => {
    const incident = editingCommitteeIncident;
    if (!incident || !incident.committee_id) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const committeeId = incident.committee_id;

      // Update committee due_date and notes
      const { error: committeeError } = await supabase
        .from('incident_committees')
        .update({
          due_date: data.dueDate || null,
          decision_note: data.notes || null,
        })
        .eq('id', committeeId);

      if (committeeError) throw committeeError;

      // Get current members
      const { data: currentMembers } = await supabase
        .from('committee_members')
        .select('id, user_id')
        .eq('committee_id', committeeId);

      const currentMemberUserIds = new Set(currentMembers?.map(m => m.user_id) || []);
      const newMemberUserIds = new Set(data.approverIds);

      // Remove members no longer in list
      const membersToRemove = currentMembers?.filter(m => !newMemberUserIds.has(m.user_id)) || [];
      for (const member of membersToRemove) {
        await supabase.from('committee_votes').delete().eq('member_id', member.id);
        await supabase.from('committee_members').delete().eq('id', member.id);
      }

      // Add new members
      const userIdsToAdd = data.approverIds.filter(id => !currentMemberUserIds.has(id));
      for (const userId of userIdsToAdd) {
        const { error: memberError } = await supabase
          .from('committee_members')
          .insert({
            committee_id: committeeId,
            user_id: userId,
            has_veto: false,
            role: null,
          });

        if (memberError) {
          console.error('Failed to add member:', memberError);
          continue;
        }

        const { data: member } = await supabase
          .from('committee_members')
          .select('id')
          .eq('committee_id', committeeId)
          .eq('user_id', userId)
          .single();

        if (member) {
          await supabase.from('committee_votes').insert({
            committee_id: committeeId,
            member_id: member.id,
            vote: 'pending',
          });
        }
      }

      // Log history
      await supabase.from('incident_history').insert({
        incident_id: incident.id,
        field_name: 'committee_approvers',
        old_value: `${currentMembers?.length || 0} approvers`,
        new_value: `${data.approverIds.length} approvers`,
        changed_by: user?.id,
      });

      setCommitteeModalOpen(false);
      setEditingCommitteeIncident(null);

      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident-committee', incident.id] });

      toast.success('Committee updated');
    } catch (err: any) {
      console.error('Failed to update committee:', err);
      toast.error(`Failed to update committee: ${err?.message || 'Unknown error'}`);
    }
  }, [editingCommitteeIncident, queryClient]);

  // Unified committee confirm handler
  const handleCommitteeConfirmUnified = useCallback((data: CommitteeSetupData) => {
    if (committeeModalMode === 'edit') {
      handleEditCommitteeConfirm(data);
    } else {
      handleCommitteeConfirm(data);
    }
  }, [committeeModalMode, handleCommitteeConfirm, handleEditCommitteeConfirm]);

  // Create incident handler
  const handleCreateIncident = async (formData: IncidentFormData) => {
    try {
      const result = await createIncident.mutateAsync({
        title: formData.title,
        description: formData.description,
        severity: formData.severity,
        impact: formData.impact,
        urgency: formData.urgency,
        support_level: formData.support_level,
        project_id: formData.project_id,
        release_version_id: formData.release_version_id,
        is_major_incident: formData.is_major_incident,
        incident_type: formData.incident_type,
        reporter_id: formData.reporterId,
        reporter_name: formData.reporterName,
        assignee_id: formData.assigneeId,
        target_date: formData.target_resolution_date,
      });

      toast.success('Incident created successfully');
      setCreateDialogOpen(false);

      if (result?.id) {
        navigate(`/release/incidents/${result.id}?created=true`);
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create incident');
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="h-full flex flex-col bg-background">
        <GlobalPageHeader
          sectionLabel="RELEASE"
          pageTitle="Incident Kanban"
          showDivider={false}
        />

        {/* Command Bar */}
        <IncidentCommandBar
          onCreateClick={() => setCreateDialogOpen(true)}
          additionalActions={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">More actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                {hasCollapsedColumns ? (
                  <DropdownMenuItem onClick={expandAll}>
                    <ChevronsRightLeft className="h-4 w-4 mr-2" />
                    Expand All Columns
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => collapseAll(visibleStatuses)}>
                    <ChevronsLeftRight className="h-4 w-4 mr-2" />
                    Collapse All Columns
                  </DropdownMenuItem>
                )}
                
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setManageColumnsOpen(true)}>
                      <Settings2 className="h-4 w-4 mr-2" />
                      Manage Columns
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          }
        />

        {/* Page Controls */}
        <div className="px-4 sm:px-6 py-3 border-b border-border bg-muted/20 flex flex-wrap items-center gap-4 sm:gap-6">
          {/* Toggle: Open tickets / Include closed */}
          <div className="flex items-center gap-2">
            <Switch
              id="show-open"
              checked={showOpenOnly}
              onCheckedChange={setShowOpenOnly}
            />
            <Label htmlFor="show-open" className="text-sm cursor-pointer">
              {showOpenOnly ? 'Open tickets' : 'Include closed tickets'}
            </Label>
          </div>

          <div className="h-5 w-px bg-border hidden sm:block" />

          {/* Group by dropdown */}
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground">Group by:</Label>
            <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupByOption)}>
              <SelectTrigger className="w-[140px] h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GROUP_BY_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="h-5 w-px bg-border hidden sm:block" />

          {/* Quick Filter Chips */}
          <QuickFilterChips
            activeFilters={quickFilters}
            onToggle={handleToggleQuickFilter}
            counts={quickFilterCounts}
          />

          {/* Stats summary */}
          <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
            <span>{filteredIncidents.length} incident{filteredIncidents.length !== 1 ? 's' : ''}</span>
            {quickFilters.length > 0 && (
              <button 
                onClick={() => setQuickFilters([])}
                className="text-primary hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex-1 overflow-hidden">
          {error ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <AlertCircle className="h-8 w-8 text-destructive mb-3" />
              <p className="text-sm font-medium text-destructive mb-1">Failed to load incidents</p>
              <p className="text-xs text-muted-foreground mb-4">
                {error instanceof Error ? error.message : 'Unable to fetch data'}
              </p>
              <Button variant="outline" size="sm" className="h-8 text-sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-1.5" />
                Retry
              </Button>
            </div>
          ) : groupBy === 'none' ? (
            <div className="h-full overflow-x-auto px-4 sm:px-6 py-4">
              <div className="flex gap-4 h-full">
                {visibleStatuses.map(status => (
                  <KanbanColumn
                    key={status}
                    status={status}
                    incidents={incidentsByStatus[status] || []}
                    onDrop={handleDrop}
                    draggingId={draggingId}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    isCollapsed={isCollapsed(status)}
                    onToggleCollapse={toggleCollapsed}
                    onEditCommittee={handleEditCommittee}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto">
              {swimlanes.map(group => (
                <KanbanSwimlane
                  key={group.key}
                  group={group}
                  onDrop={handleDrop}
                  draggingId={draggingId}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  visibleStatuses={visibleStatuses}
                />
              ))}
            </div>
          )}
        </div>

        {/* Create Incident Modal */}
        <CreateIncidentModal
          isOpen={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          onSubmit={handleCreateIncident}
        />

        {/* Manage Columns Dialog (Admin) */}
        {isAdmin && (
          <ManageColumnsDialog
            open={manageColumnsOpen}
            onOpenChange={setManageColumnsOpen}
            statuses={configuredStatuses}
            onReorder={reorderColumns}
            onAdd={addColumn}
            onRemove={removeColumn}
            onReset={resetToDefaults}
            getAddableStatuses={getAddableStatuses}
            canRemove={canRemove}
          />
        )}

        {/* Set Committee Approvers Modal */}
        <SetCommitteeApproversModal
          open={committeeModalOpen}
          mode={committeeModalMode}
          incidentKey={committeeModalMode === 'edit' ? editingCommitteeIncident?.incident_key : pendingCommitteeDrop.current?.incident?.incident_key}
          incidentTitle={committeeModalMode === 'edit' ? editingCommitteeIncident?.title : pendingCommitteeDrop.current?.incident?.title}
          initialApproverIds={editingCommitteeIncident?.committee?.members?.map(m => m.user_id) || []}
          initialDueDate={editingCommitteeIncident?.committee?.due_date || ''}
          initialNotes={editingCommitteeIncident?.committee?.decision_note || ''}
          onConfirm={handleCommitteeConfirmUnified}
          onCancel={handleCommitteeCancel}
        />
      </div>
    </TooltipProvider>
  );
}
