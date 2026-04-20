/**
 * IncidentContextRail — Right panel for incident detail view
 * 
 * Design: Free-floating stacked fields (no accordions)
 * Fields: Reporter, Severity, Priority, Release, Project, Environment, Affected System, Business Process, Owning Team
 */

import { 
  Users, Building2, Globe, FolderKanban,
  PanelRightClose, PanelRight, Cog, User, AlertCircle, Flag, Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Tooltip } from '@/components/ads';
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
  name_en?: string;
  name_ar?: string;
  name?: string;
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
  onPriorityChange?: (priority: string) => void;
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

const SEVERITY_OPTIONS: { value: SeverityLevel; label: string }[] = [
  { value: 'SEV1', label: 'SEV1' },
  { value: 'SEV2', label: 'SEV2' },
  { value: 'SEV3', label: 'SEV3' },
  { value: 'SEV4', label: 'SEV4' },
];

const PRIORITY_OPTIONS: { value: PriorityLevel; label: string }[] = [
  { value: 'P1', label: 'P1' },
  { value: 'P2', label: 'P2' },
  { value: 'P3', label: 'P3' },
  { value: 'P4', label: 'P4' },
];

// Owning Team defaults - seeded values
const OWNING_TEAM_DEFAULTS = [
  { id: 'delivery', name: 'Delivery' },
  { id: 'operations', name: 'Operations' },
  { id: 'business', name: 'Business' },
];

// Severity badge colors - Branded enterprise tones
const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  SEV1: 'bg-destructive/10 text-destructive border-destructive/30',
  SEV2: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
  SEV3: 'bg-primary/10 text-primary border-primary/30',
  SEV4: 'bg-muted text-muted-foreground border-border',
};

// Priority badge colors - Branded enterprise tones
const PRIORITY_COLORS: Record<PriorityLevel, string> = {
  P1: 'bg-destructive/10 text-destructive border-destructive/30',
  P2: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
  P3: 'bg-primary/10 text-primary border-primary/30',
  P4: 'bg-muted text-muted-foreground border-border',
};

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

function SeverityBadge({ severity, onClick }: { severity: SeverityLevel; onClick?: () => void }) {
  return (
    <span 
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border",
        SEVERITY_COLORS[severity] || 'bg-muted text-muted-foreground border-border',
        onClick && "cursor-pointer hover:opacity-80"
      )}
      onClick={onClick}
    >
      {severity}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: PriorityLevel }) {
  return (
    <span 
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border",
        PRIORITY_COLORS[priority] || 'bg-muted text-muted-foreground border-border'
      )}
    >
      {priority}
    </span>
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
  onPriorityChange,
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

  // Reporter display name
  const reporterDisplay = reporter?.full_name || reporterName || 'Unknown';

  // Collapsed state - show thin icon strip
  if (isCollapsed) {
    return (
      <aside className="w-12 border-l border-border bg-muted/5 flex flex-col items-center py-3 gap-2">
        <Tooltip content="Expand panel" position="left" delay={300}>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onToggleCollapse}
          >
            <PanelRight className="h-4 w-4 text-muted-foreground" />
          </Button>
        </Tooltip>
      </aside>
    );
  }

  return (
    <aside className="w-[280px] min-w-[260px] max-w-[300px] border-l border-border overflow-auto bg-muted/5 flex flex-col">
      {/* Rail header */}
      <div className="px-3 py-2.5 border-b border-border flex items-center justify-between bg-background/80 shrink-0">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Details</span>
        <Tooltip content="Collapse panel" position="left" delay={300}>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={onToggleCollapse}
          >
            <PanelRightClose className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </Tooltip>
      </div>

        {/* Free-floating stacked fields */}
        <div className="p-4 space-y-4 flex-1 overflow-auto">
          {/* Reporter (read-only display) */}
          <FieldRow label="Reporter" icon={User}>
            <Select 
              value={reporter?.id || ''} 
              onValueChange={onReporterChange}
              disabled={isConverted}
            >
              <SelectTrigger className="h-8 text-sm bg-background">
                <SelectValue placeholder="Unknown">
                  {reporterDisplay}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {availableUsers.map(user => (
                  <SelectItem key={user.id} value={user.id} className="text-sm">
                    {user.full_name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>

          {/* Severity */}
          <FieldRow label="Severity">
            <Select 
              value={severity} 
              onValueChange={onSeverityChange}
              disabled={isConverted}
            >
              <SelectTrigger className="h-8 text-sm bg-background">
                <SelectValue>
                  <SeverityBadge severity={severity} />
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {SEVERITY_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="text-sm">
                    <SeverityBadge severity={opt.value} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>

          {/* Priority */}
          <FieldRow label="Priority">
            <Select 
              value={priority || ''} 
              onValueChange={(v) => onPriorityChange?.(v)}
              disabled={isConverted}
            >
              <SelectTrigger className="h-8 text-sm bg-background">
                <SelectValue placeholder="Select priority">
                  {priority ? <PriorityBadge priority={priority} /> : 'Not set'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="text-sm">
                    <PriorityBadge priority={opt.value} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>

          {/* Release */}
          <FieldRow label="Release" icon={Tag}>
            <Select 
              value={releaseVersionId || '__none__'} 
              onValueChange={(v) => onReleaseVersionChange(v === '__none__' ? '' : v)}
              disabled={isConverted}
            >
              <SelectTrigger className="h-8 text-sm bg-background">
                <SelectValue placeholder="Select release">
                  {releaseVersionId 
                    ? releaseVersion?.version || availableReleaseVersions.find(r => r.id === releaseVersionId)?.version || 'Unknown'
                    : 'Not assigned'
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-sm text-muted-foreground">
                  None
                </SelectItem>
                {availableReleaseVersions.map(version => (
                  <SelectItem key={version.id} value={version.id} className="text-sm">
                    {version.version}
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
  );
}
