import { useState } from 'react';
import { 
  User, Users, Building2, Cog, Globe, Calendar, Clock, 
  ChevronDown, ChevronRight, FolderKanban, AlertTriangle, CheckCircle,
  PanelRightClose, PanelRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { getAllowedTransitions } from '@/utils/incidentLifecycle';
import { 
  STATUS_CONFIG, 
  SEVERITY_CONFIG,
  PRIORITY_CONFIG 
} from '@/components/incidents/badges/IncidentBadges';
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

function AccordionSection({ 
  title, 
  icon: Icon,
  defaultOpen = false,
  children 
}: { 
  title: string; 
  icon?: React.ElementType;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border border-border rounded-lg bg-background overflow-hidden">
        <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2.5 hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {title}
            </span>
          </div>
          <ChevronDown className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3 pt-1 space-y-3 border-t border-border">
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function FieldRow({ 
  label, 
  children, 
  className 
}: { 
  label: string; 
  children: React.ReactNode; 
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <label className="text-xs text-muted-foreground">{label}</label>
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
  const allowedTransitions = getAllowedTransitions(status, supportLevel, undefined);
  const statusConfig = STATUS_CONFIG[status];
  const severityConfig = SEVERITY_CONFIG[severity];

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Collapsed state - show thin icon strip
  if (isCollapsed) {
    return (
      <TooltipProvider delayDuration={300}>
        <aside className="w-12 border-l border-border bg-muted/5 flex flex-col items-center py-4 gap-3">
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
            <TooltipContent side="left">Expand rail</TooltipContent>
          </Tooltip>
          
          <div className="h-px w-6 bg-border" />
          
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn("h-8 w-8 rounded-md flex items-center justify-center", statusConfig.className)}>
                <span className="text-xs font-bold">{status.charAt(0).toUpperCase()}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="left">Status: {statusConfig.label}</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn("h-8 w-8 rounded-md flex items-center justify-center", severityConfig.className)}>
                <AlertTriangle className="h-3.5 w-3.5" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="left">Severity: {severityConfig.label}</TooltipContent>
          </Tooltip>
          
          {sla && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  "h-8 w-8 rounded-md flex items-center justify-center",
                  sla.resolution_breached ? "bg-destructive/10 text-destructive" : 
                  sla.resolved_at ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                )}>
                  <Clock className="h-3.5 w-3.5" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="left">
                SLA: {sla.resolution_breached ? 'Breached' : sla.resolved_at ? 'Met' : 'On track'}
              </TooltipContent>
            </Tooltip>
          )}
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                  {assignee?.avatar_initials || assignee?.full_name?.slice(0, 2) || 'UA'}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent side="left">
              Assignee: {assignee?.full_name || 'Unassigned'}
            </TooltipContent>
          </Tooltip>
        </aside>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <aside className="w-[320px] min-w-[300px] max-w-[360px] border-l border-border overflow-auto bg-muted/5 flex flex-col">
        {/* Rail toggle button */}
        <div className="px-3 py-2 border-b border-border flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Context</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={onToggleCollapse}
              >
                <PanelRightClose className="h-4 w-4 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Collapse rail</TooltipContent>
          </Tooltip>
        </div>

        <div className="p-3 space-y-3 flex-1 overflow-auto">
          {/* ========== SECTION 1: STATUS & OWNERSHIP (expanded by default) ========== */}
          <AccordionSection title="Status & Ownership" icon={User} defaultOpen={true}>
            {/* Status */}
            <FieldRow label="Status">
              <Select 
                value={status} 
                onValueChange={(v) => onStatusChange(v as IncidentStatus)}
                disabled={isConverted || status === 'closed'}
              >
                <SelectTrigger className={cn('h-8 text-sm font-medium', statusConfig.className)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={status} className="text-sm">
                    {statusConfig.label} (current)
                  </SelectItem>
                  {allowedTransitions
                    .filter(t => t.targetStatus !== status)
                    .map(t => (
                      <SelectItem key={t.targetStatus} value={t.targetStatus} className="text-sm">
                        {STATUS_CONFIG[t.targetStatus].label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </FieldRow>

            {/* Assignee */}
            <FieldRow label="Assignee">
              <Select 
                value={assignee?.id || 'unassigned'} 
                onValueChange={(v) => onAssigneeChange(v === 'unassigned' ? '' : v)}
                disabled={isConverted}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned" className="text-sm text-muted-foreground">
                    Unassigned
                  </SelectItem>
                  {availableUsers.map(user => (
                    <SelectItem key={user.id} value={user.id} className="text-sm">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[9px] bg-primary text-primary-foreground">
                            {user.avatar_initials || user.full_name?.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        {user.full_name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                variant="link" 
                size="sm" 
                className="text-xs text-primary p-0 h-auto mt-1"
                onClick={onAssignToMe}
                disabled={isConverted}
              >
                Assign to me
              </Button>
            </FieldRow>

            {/* Team / Group */}
            <FieldRow label="Team / Group">
              <Select 
                value={teamId || 'unassigned'} 
                onValueChange={(v) => onTeamChange(v === 'unassigned' ? '' : v)}
                disabled={isConverted}
              >
                <SelectTrigger className="h-8 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <SelectValue placeholder="Select team" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned" className="text-sm text-muted-foreground">
                    No team assigned
                  </SelectItem>
                  {availableTeams.map(team => (
                    <SelectItem key={team.id} value={team.id} className="text-sm">
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>

            {/* Reporter */}
            <FieldRow label="Reporter">
              <Select 
                value={reporter?.id || 'unassigned'} 
                onValueChange={(v) => onReporterChange(v === 'unassigned' ? '' : v)}
                disabled={isConverted}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select reporter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned" className="text-sm text-muted-foreground">
                    Unknown
                  </SelectItem>
                  {availableUsers.map(user => (
                    <SelectItem key={user.id} value={user.id} className="text-sm">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[9px] bg-primary text-primary-foreground">
                            {user.avatar_initials || user.full_name?.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        {user.full_name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>

            {/* Created & Updated */}
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Created">
                <div className="flex items-center gap-1.5 text-sm">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  {formatDate(createdAt)}
                </div>
              </FieldRow>
              <FieldRow label="Updated">
                <div className="flex items-center gap-1.5 text-sm">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  {formatDate(updatedAt)}
                </div>
              </FieldRow>
            </div>
          </AccordionSection>

          {/* ========== SECTION 2: SLA HEALTH (expanded by default) ========== */}
          <AccordionSection title="SLA Health" icon={Clock} defaultOpen={true}>
            {sla ? (
              <div className="space-y-2">
                {/* Response SLA */}
                <div className="flex items-center justify-between py-1">
                  <span className="text-xs text-muted-foreground">Response</span>
                  <div className="flex items-center gap-1.5">
                    {sla.response_breached ? (
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                    ) : sla.responded_at ? (
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Clock className="h-3.5 w-3.5 text-amber-500" />
                    )}
                    <Badge 
                      variant="outline" 
                      className={cn(
                        'text-[10px] px-1.5 py-0',
                        sla.response_breached 
                          ? 'bg-destructive/10 text-destructive border-destructive/30'
                          : sla.responded_at 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400'
                            : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400'
                      )}
                    >
                      {sla.response_breached ? 'Breached' : sla.responded_at ? 'Met' : 'On track'}
                    </Badge>
                  </div>
                </div>

                {/* Resolution SLA */}
                <div className="flex items-center justify-between py-1">
                  <span className="text-xs text-muted-foreground">Resolution</span>
                  <div className="flex items-center gap-1.5">
                    {sla.resolution_breached ? (
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                    ) : sla.resolved_at ? (
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Clock className="h-3.5 w-3.5 text-amber-500" />
                    )}
                    <Badge 
                      variant="outline" 
                      className={cn(
                        'text-[10px] px-1.5 py-0',
                        sla.resolution_breached 
                          ? 'bg-destructive/10 text-destructive border-destructive/30'
                          : sla.resolved_at 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400'
                            : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400'
                      )}
                    >
                      {sla.resolution_breached ? 'Breached' : sla.resolved_at ? 'Met' : 'On track'}
                    </Badge>
                  </div>
                </div>

                {/* Due times */}
                <div className="pt-2 border-t border-border space-y-1">
                  <p className="text-[10px] text-muted-foreground">
                    Response due: {formatDateTime(sla.response_due_at)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Resolution due: {formatDateTime(sla.resolution_due_at)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-1">No SLA configured</p>
            )}
          </AccordionSection>

          {/* ========== SECTION 3: IMPACT & CLASSIFICATION ========== */}
          <AccordionSection title="Impact & Classification" icon={AlertTriangle}>
            {/* Severity */}
            <FieldRow label="Severity">
              <Select value={severity} onValueChange={onSeverityChange} disabled={isConverted}>
                <SelectTrigger className={cn('h-8 text-sm', severityConfig.className)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SEVERITY_CONFIG).map(([value, config]) => (
                    <SelectItem key={value} value={value} className="text-sm">
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>

            {/* Priority (derived) */}
            <FieldRow label="Priority (derived)">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    {priority ? (
                      <Badge variant="outline" className={cn('text-sm px-2 py-1 cursor-help', PRIORITY_CONFIG[priority].className)}>
                        {PRIORITY_CONFIG[priority].fullLabel}
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">Not calculated</span>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs">
                  Priority is derived from severity, impact, and urgency
                </TooltipContent>
              </Tooltip>
            </FieldRow>

            {/* Impact & Urgency */}
            <div className="grid grid-cols-2 gap-2">
              <FieldRow label="Impact">
                <Select value={impact} onValueChange={onImpactChange} disabled={isConverted}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>

              <FieldRow label="Urgency">
                <Select value={urgency} onValueChange={onUrgencyChange} disabled={isConverted}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>
            </div>

            {/* Environment */}
            <FieldRow label="Environment">
              <Select 
                value={deliveryStage || ''} 
                onValueChange={onDeliveryStageChange} 
                disabled={isConverted}
              >
                <SelectTrigger className="h-8 text-sm">
                  <div className="flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                    <SelectValue placeholder="Select environment" />
                  </div>
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

            {/* Business Process */}
            <FieldRow label="Business Process">
              <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm truncate">
                  {businessProcess?.name_en || 'Not specified'}
                </span>
              </div>
            </FieldRow>

            {/* Affected System */}
            <FieldRow label="Affected System">
              <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md">
                <Cog className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm truncate">
                  {serviceComponent || 'Not specified'}
                </span>
              </div>
            </FieldRow>
          </AccordionSection>

          {/* ========== SECTION 4: PROJECT & RELEASE ========== */}
          <AccordionSection title="Project & Release" icon={FolderKanban}>
            {/* Project */}
            <FieldRow label="Project">
              <Select 
                value={projectId || 'default'} 
                onValueChange={(v) => onProjectChange(v === 'default' ? '' : v)}
                disabled={isConverted}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default" className="text-sm">
                    default
                  </SelectItem>
                  {availableProjects.map(project => (
                    <SelectItem key={project.id} value={project.id} className="text-sm">
                      {project.name} ({project.key})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>

            {/* Release Version */}
            <FieldRow label="Release Version">
              <Select 
                value={releaseVersionId || 'none'} 
                onValueChange={(v) => onReleaseVersionChange(v === 'none' ? '' : v)}
                disabled={isConverted}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select version" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-sm text-muted-foreground">
                    Not specified
                  </SelectItem>
                  {availableReleaseVersions.map(version => (
                    <SelectItem key={version.id} value={version.id} className="text-sm">
                      {version.version}{version.name ? ` — ${version.name}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>
          </AccordionSection>

          {/* Support Level (if present) */}
          {supportLevel && (
            <div className="px-3 py-2 border border-border rounded-lg bg-background">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Support Level</span>
                <Badge variant="outline" className="text-xs px-2 py-0.5">
                  {supportLevel} — {supportLevel === 'L1' ? 'Frontline' : supportLevel === 'L2' ? 'Technical' : 'Specialist'}
                </Badge>
              </div>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
