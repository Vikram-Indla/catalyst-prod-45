/**
 * Incident Kanban Page
 * Kanban board view for Incident management
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, RefreshCw, Grip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlobalPageHeader } from '@/components/layout/GlobalPageHeader';
import { IncidentCommandBar } from '@/components/incidents/IncidentCommandBar';
import { CreateIncidentModal, IncidentFormData } from '@/components/incidents/CreateIncidentModal';
import { useIncidents, useCreateIncident } from '@/hooks/useIncidents';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

// Status configuration for Kanban columns
const KANBAN_COLUMNS = [
  { id: 'open', label: 'Open', color: 'hsl(var(--b400))' },
  { id: 'triage', label: 'Triage', color: 'hsl(var(--y300))' },
  { id: 'in_progress', label: 'In Progress', color: 'hsl(var(--p300))' },
  { id: 'to_committee', label: 'Committee', color: 'hsl(var(--secondary-bronze))' },
  { id: 'resolved', label: 'Resolved', color: 'hsl(var(--g300))' },
  { id: 'closed', label: 'Closed', color: 'var(--text-3)' },
];

// Severity badge colors
const SEVERITY_COLORS: Record<string, string> = {
  SEV1: 'bg-destructive text-destructive-foreground',
  SEV2: 'bg-[hsl(var(--warning))] text-white',
  SEV3: 'bg-[hsl(var(--b400))] text-white',
  SEV4: 'bg-muted text-muted-foreground',
};

interface KanbanCardProps {
  incident: {
    id: string;
    incident_key: string;
    title: string;
    severity: string;
    priority?: string;
    assignee_name?: string | null;
    is_major_incident?: boolean;
  };
  onClick: (id: string) => void;
}

function KanbanCard({ incident, onClick }: KanbanCardProps) {
  return (
    <div
      onClick={() => onClick(incident.id)}
      className="p-3 bg-card border border-border rounded-lg cursor-pointer hover:shadow-md hover:border-[var(--brand-primary)] transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs font-mono text-muted-foreground group-hover:text-[var(--brand-primary)]">
          {incident.incident_key}
        </span>
        <span className={cn(
          "text-[10px] px-1.5 py-0.5 rounded font-bold uppercase",
          SEVERITY_COLORS[incident.severity] || SEVERITY_COLORS.SEV4
        )}>
          {incident.severity}
        </span>
      </div>
      <p className="text-sm font-medium text-foreground line-clamp-2 mb-2">
        {incident.title}
      </p>
      <div className="flex items-center justify-between">
        {incident.assignee_name ? (
          <span className="text-xs text-muted-foreground truncate max-w-[120px]">
            {incident.assignee_name}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/60 italic">Unassigned</span>
        )}
        {incident.is_major_incident && (
          <span className="text-[10px] px-1.5 py-0.5 bg-destructive/10 text-destructive rounded font-medium">
            Major
          </span>
        )}
      </div>
    </div>
  );
}

interface KanbanColumnProps {
  column: { id: string; label: string; color: string };
  incidents: any[];
  onCardClick: (id: string) => void;
}

function KanbanColumn({ column, incidents, onCardClick }: KanbanColumnProps) {
  return (
    <div className="flex flex-col min-w-[280px] max-w-[320px] flex-shrink-0 bg-muted/30 rounded-lg border border-border">
      {/* Column Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border bg-muted/50 rounded-t-lg">
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: column.color }}
        />
        <span className="text-sm font-semibold text-foreground">{column.label}</span>
        <span className="ml-auto text-xs font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          {incidents.length}
        </span>
      </div>

      {/* Column Content */}
      <ScrollArea className="flex-1 max-h-[calc(100vh-280px)]">
        <div className="p-2 space-y-2">
          {incidents.length === 0 ? (
            <div className="py-8 text-center">
              <Grip className="h-6 w-6 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground">No incidents</p>
            </div>
          ) : (
            incidents.map((incident) => (
              <KanbanCard
                key={incident.id}
                incident={incident}
                onClick={onCardClick}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default function IncidentKanbanPage() {
  const navigate = useNavigate();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  const { data: incidents, isLoading, error, refetch } = useIncidents({});
  const createIncident = useCreateIncident();

  // Group incidents by status
  const columnData = useMemo(() => {
    if (!incidents) return {};
    
    const grouped: Record<string, any[]> = {};
    KANBAN_COLUMNS.forEach(col => {
      grouped[col.id] = [];
    });
    
    incidents.forEach(incident => {
      const status = incident.status || 'open';
      if (grouped[status]) {
        grouped[status].push(incident);
      } else {
        // Fallback to open for unknown statuses
        grouped['open'].push(incident);
      }
    });
    
    return grouped;
  }, [incidents]);

  const handleCardClick = (id: string) => {
    navigate(`/release/incidents/${id}`);
  };

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
    <div className="h-full flex flex-col bg-background">
      <GlobalPageHeader
        sectionLabel="RELEASE"
        pageTitle="Incident Kanban"
        showDivider={false}
      />

      {/* Standardized Command Bar */}
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
        ) : (
          <div className="h-full overflow-x-auto px-4 sm:px-6 py-4">
            <div className="flex gap-4 h-full">
              {KANBAN_COLUMNS.map((column) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  incidents={columnData[column.id] || []}
                  onCardClick={handleCardClick}
                />
              ))}
            </div>
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
  );
}
