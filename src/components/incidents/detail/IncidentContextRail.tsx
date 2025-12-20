/**
 * IncidentContextRail — Right panel for incident detail view
 * 
 * Design: Free-floating stacked fields (no accordions)
 * Fields: Environment, Affected System, Business Process, Owning Team, Project
 */

import { 
  Users, Building2, Globe, FolderKanban,
  PanelRightClose, PanelRight, Cog
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { 
  IncidentStatus, 
  SeverityLevel, 
  PriorityLevel, 
  ImpactLevel, 
  UrgencyLevel, 
  SupportLevel,
  DeliveryStage,
  Workgroup,
  IncidentUserProfile,
  ReleaseVersion
} from '@/types/incident';

interface Project {
  id: string;
  name: string;
  key: string;
}

interface IncidentTeam {
  id: string;
  name: string;
}

interface SlaRecord {
  id: string;
  response_due_at: string;
  resolution_due_at: string;
  responded_at?: string;
  resolved_at?: string;
  response_breached: boolean;
  resolution_breached: boolean;
}

interface BusinessProcess {
  id: string;
  name_en: string;
  name_ar?: string;
}

interface IncidentContextRailProps {
  incidentId: string;
  status: IncidentStatus;
  severity: SeverityLevel;
  priority: PriorityLevel | null;
  impact: ImpactLevel;
  urgency: UrgencyLevel;
  supportLevel: SupportLevel | null;
  assignee: IncidentUserProfile | null;
  assigneeWorkgroup: Workgroup | null;
  reporter: IncidentUserProfile | null;
  reporterName: string | null;
  deliveryStage: DeliveryStage | null;
  releaseVersion: ReleaseVersion | null;
  releaseVersionId: string | null;
  businessProcess: BusinessProcess | null;
  serviceComponent: string | null;
  projectId: string | null;
  teamId: string | null;
  sla: SlaRecord | null;
  createdAt: string;
  updatedAt: string;
  isConverted: boolean;
  isCollapsed: boolean;
  // Available data
  availableProjects: Project[];
  availableTeams: IncidentTeam[];
  availableUsers: IncidentUserProfile[];
  availableReleaseVersions: ReleaseVersion[];
  // Handlers
  onStatusChange: (status: IncidentStatus) => void;
  onSeverityChange: (severity: string) => void;
  onImpactChange: (impact: string) => void;
  onUrgencyChange: (urgency: string) => void;
  onDeliveryStageChange: (stage: string) => void;
  onProjectChange: (projectId: string) => void;
  onTeamChange: (teamId: string) => void;
  onAssigneeChange: (userId: string) => void;
  onReporterChange: (userId: string) => void;
  onReleaseVersionChange: (versionId: string) => void;
  onAssignToMe: () => void;
  onToggleCollapse: () => void;
  isSubmitting: boolean;
}

const DELIVERY_STAGE_OPTIONS: { value: DeliveryStage; label: string }[] = [
  { value: 'stage', label: 'Staging' },
  { value: 'qa', label: 'QA' },
  { value: 'beta', label: 'Beta' },
  { value: 'prod', label: 'Production' },
];

// Owning Team defaults - seeded values
const OWNING_TEAM_DEFAULTS = [
  { id: 'delivery', name: 'Delivery' },
  { id: 'operations', name: 'Operations' },
  { id: 'business', name: 'Business' },
];

function FieldRow({ 
  label, 
  children, 
  icon: Icon,
}: { 
  label: string; 
  children: React.ReactNode; 
  icon?: React.ElementType;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </label>
      {children}
    </div>
  );
}

export function IncidentContextRail({
  incidentId,
  status,
  severity,
  priority,
  impact,
  urgency,
  supportLevel,
  assignee,
  assigneeWorkgroup,
  reporter,
  reporterName,
  deliveryStage,
  releaseVersion,
  releaseVersionId,
  businessProcess,
  serviceComponent,
  projectId,
  teamId,
  sla,
  createdAt,
  updatedAt,
  isConverted,
  isCollapsed,
  availableProjects,
  availableTeams,
  availableUsers,
  availableReleaseVersions,
  onStatusChange,
  onSeverityChange,
  onImpactChange,
  onUrgencyChange,
  onDeliveryStageChange,
  onProjectChange,
  onTeamChange,
  onAssigneeChange,
  onReporterChange,
  onReleaseVersionChange,
  onAssignToMe,
  onToggleCollapse,
  isSubmitting,
}: IncidentContextRailProps) {
  
  // Merge available teams with defaults if empty
  const owningTeams = availableTeams.length > 0 ? availableTeams : OWNING_TEAM_DEFAULTS;

  // Collapsed state - show thin icon strip
  if (isCollapsed) {
    return (
      <TooltipProvider delayDuration={300}>
        <aside className="w-12 border-l border-border bg-muted/5 flex flex-col items-center py-3 gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={onToggleCollapse}
              >
                <PanelRight className="h-4 w-4 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Expand panel</TooltipContent>
          </Tooltip>
        </aside>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <aside className="w-[280px] min-w-[260px] max-w-[300px] border-l border-border overflow-auto bg-muted/5 flex flex-col">
        {/* Rail header */}
        <div className="px-3 py-2.5 border-b border-border flex items-center justify-between bg-background/80 shrink-0">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Details</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={onToggleCollapse}
              >
                <PanelRightClose className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Collapse panel</TooltipContent>
          </Tooltip>
        </div>

        {/* Free-floating stacked fields */}
        <div className="p-4 space-y-4 flex-1 overflow-auto">
          {/* Project */}
          <FieldRow label="Project" icon={FolderKanban}>
            <Select 
              value={projectId || 'default'} 
              onValueChange={(v) => onProjectChange(v === 'default' ? '' : v)}
              disabled={isConverted}
            >
              <SelectTrigger className="h-8 text-sm bg-background">
                <SelectValue placeholder="Select project">
                  {projectId 
                    ? availableProjects.find(p => p.id === projectId)?.name || 'Default'
                    : 'Default'
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default" className="text-sm">
                  Default
                </SelectItem>
                {availableProjects.map(project => (
                  <SelectItem key={project.id} value={project.id} className="text-sm">
                    {project.key} — {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>

          {/* Environment */}
          <FieldRow label="Environment" icon={Globe}>
            <Select 
              value={deliveryStage || ''} 
              onValueChange={onDeliveryStageChange} 
              disabled={isConverted}
            >
              <SelectTrigger className="h-8 text-sm bg-background">
                <SelectValue placeholder="Select environment" />
              </SelectTrigger>
              <SelectContent>
                {DELIVERY_STAGE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="text-sm">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>

          {/* Affected System */}
          <FieldRow label="Affected System" icon={Cog}>
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 rounded-md border border-border text-sm">
              <span className="text-foreground">
                {serviceComponent || 'Not specified'}
              </span>
            </div>
          </FieldRow>

          {/* Business Process */}
          <FieldRow label="Business Process" icon={Building2}>
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 rounded-md border border-border text-sm">
              <span className="text-foreground">
                {businessProcess?.name_en || 'Not specified'}
              </span>
            </div>
          </FieldRow>

          {/* Owning Team */}
          <FieldRow label="Owning Team" icon={Users}>
            <Select 
              value={teamId || 'delivery'} 
              onValueChange={(v) => onTeamChange(v)}
              disabled={isConverted}
            >
              <SelectTrigger className="h-8 text-sm bg-background">
                <SelectValue placeholder="Select team">
                  {teamId 
                    ? owningTeams.find(t => t.id === teamId)?.name || 'Delivery'
                    : 'Delivery'
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {owningTeams.map(team => (
                  <SelectItem key={team.id} value={team.id} className="text-sm">
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>
        </div>
      </aside>
    </TooltipProvider>
  );
}
