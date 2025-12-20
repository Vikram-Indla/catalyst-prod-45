/**
 * Incident Kanban Page
 * Production-grade Kanban board for Incident management
 */

import { useState, useMemo, useCallback } from 'react';
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
import { toast } from 'sonner';

import { KanbanColumn } from '../components/KanbanColumn';
import { KanbanSwimlane } from '../components/KanbanSwimlane';
import { ManageColumnsDialog } from '../components/ManageColumnsDialog';
import { QuickFilterChips } from '../components/QuickFilterChips';
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

export default function IncidentKanbanPage() {
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [manageColumnsOpen, setManageColumnsOpen] = useState(false);
  const [showOpenOnly, setShowOpenOnly] = useState(true);
  const [groupBy, setGroupBy] = useState<GroupByOption>('none');
  const [quickFilters, setQuickFilters] = useState<QuickFilterKey[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [optimisticUpdates, setOptimisticUpdates] = useState<Record<string, IncidentStatus>>({});

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

  // Drop handler with optimistic update
  const handleDrop = useCallback(async (incidentId: string, newStatus: IncidentStatus) => {
    const incident = incidents?.find(i => i.id === incidentId);
    if (!incident || incident.status === newStatus) return;

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
      </div>
    </TooltipProvider>
  );
}
