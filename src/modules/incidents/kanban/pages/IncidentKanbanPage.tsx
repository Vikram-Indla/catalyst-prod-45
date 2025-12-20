/**
 * Incident Kanban Page
 * Production-grade Kanban board for Incident management
 */

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
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
import { TooltipProvider } from '@/components/ui/tooltip';
import { GlobalPageHeader } from '@/components/layout/GlobalPageHeader';
import { IncidentCommandBar } from '@/components/incidents/IncidentCommandBar';
import { CreateIncidentModal, IncidentFormData } from '@/components/incidents/CreateIncidentModal';
import { useIncidents, useUpdateIncident, useCreateIncident } from '@/hooks/useIncidents';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import { KanbanColumn } from '../components/KanbanColumn';
import { KanbanSwimlane } from '../components/KanbanSwimlane';
import {
  KANBAN_STATUSES,
  OPEN_STATUSES,
  GROUP_BY_OPTIONS,
  groupIncidents,
  type GroupByOption,
} from '../types';
import type { Incident, IncidentStatus } from '@/types/incident';

export default function IncidentKanbanPage() {
  const navigate = useNavigate();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [showOpenOnly, setShowOpenOnly] = useState(true);
  const [groupBy, setGroupBy] = useState<GroupByOption>('none');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [optimisticUpdates, setOptimisticUpdates] = useState<Record<string, IncidentStatus>>({});

  const { data: incidents, isLoading, error, refetch } = useIncidents({});
  const updateIncident = useUpdateIncident();
  const createIncident = useCreateIncident();

  // Determine visible statuses based on toggle
  const visibleStatuses = useMemo(() => {
    if (showOpenOnly) {
      return KANBAN_STATUSES.filter(s => OPEN_STATUSES.includes(s));
    }
    return KANBAN_STATUSES;
  }, [showOpenOnly]);

  // Filter and apply optimistic updates
  const filteredIncidents = useMemo(() => {
    if (!incidents) return [];
    
    return incidents
      .filter(incident => {
        // Apply optimistic status
        const effectiveStatus = optimisticUpdates[incident.id] || incident.status;
        // Filter by visible statuses
        return visibleStatuses.includes(effectiveStatus);
      })
      .map(incident => {
        // Apply optimistic update to incident object
        if (optimisticUpdates[incident.id]) {
          return { ...incident, status: optimisticUpdates[incident.id] };
        }
        return incident;
      });
  }, [incidents, visibleStatuses, optimisticUpdates]);

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

    // Optimistic update
    setOptimisticUpdates(prev => ({ ...prev, [incidentId]: newStatus }));
    setDraggingId(null);

    try {
      await updateIncident.mutateAsync({
        id: incidentId,
        data: { status: newStatus } as any,
      });
      
      // Clear optimistic update on success
      setOptimisticUpdates(prev => {
        const next = { ...prev };
        delete next[incidentId];
        return next;
      });
      
      toast.success(`Moved to ${newStatus.replace('_', ' ')}`);
    } catch (err: any) {
      // Rollback on failure
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
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-3 text-sm"
              onClick={() => refetch()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
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

          {/* Stats summary */}
          <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
            <span>{filteredIncidents.length} incident{filteredIncidents.length !== 1 ? 's' : ''}</span>
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
            // Standard column view (no swimlanes)
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
                  />
                ))}
              </div>
            </div>
          ) : (
            // Swimlane view
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
      </div>
    </TooltipProvider>
  );
}
