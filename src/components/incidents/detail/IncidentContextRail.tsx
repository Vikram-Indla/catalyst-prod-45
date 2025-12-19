import { useState } from 'react';
import { 
  User, Users, Building2, Cog, Globe, Calendar, Clock, 
  ChevronDown, FolderKanban, AlertTriangle, CheckCircle 
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
  businessProcess: BusinessProcess | null;
  serviceComponent: string | null;
  projectId: string | null;
  sla: SlaRecord | null;
  createdAt: string;
  updatedAt: string;
  isConverted: boolean;
  // Available data
  availableProjects: Project[];
  // Handlers
  onStatusChange: (status: IncidentStatus) => void;
  onSeverityChange: (severity: string) => void;
  onImpactChange: (impact: string) => void;
  onUrgencyChange: (urgency: string) => void;
  onDeliveryStageChange: (stage: string) => void;
  onProjectChange: (projectId: string) => void;
  onAssignToMe: () => void;
  isSubmitting: boolean;
}

const DELIVERY_STAGE_OPTIONS: { value: DeliveryStage; label: string }[] = [
  { value: 'stage', label: 'Staging' },
  { value: 'qa', label: 'QA' },
  { value: 'beta', label: 'Beta' },
  { value: 'prod', label: 'Production' },
];

function CardHeader({ title, icon: Icon }: { title: string; icon?: React.ElementType }) {
  return (
    <div className="flex items-center gap-2 pb-2 mb-3 border-b border-border">
      {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {title}
      </span>
    </div>
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
  businessProcess,
  serviceComponent,
  projectId,
  sla,
  createdAt,
  updatedAt,
  isConverted,
  availableProjects,
  onStatusChange,
  onSeverityChange,
  onImpactChange,
  onUrgencyChange,
  onDeliveryStageChange,
  onProjectChange,
  onAssignToMe,
  isSubmitting,
}: IncidentContextRailProps) {
  const [impactExpanded, setImpactExpanded] = useState(true);
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

  return (
    <TooltipProvider delayDuration={300}>
      <aside className="w-[320px] min-w-[300px] max-w-[360px] border-l border-border overflow-auto bg-muted/5 flex flex-col">
        <div className="p-4 space-y-4">
          {/* ========== CARD 1: STATUS & OWNERSHIP ========== */}
          <div className="p-3 rounded-lg border border-border bg-background">
            <CardHeader title="Status & Ownership" icon={User} />
            
            {/* Status */}
            <FieldRow label="Status" className="mb-3">
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
            <FieldRow label="Assignee" className="mb-3">
              <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md">
                {assignee ? (
                  <>
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                        {assignee.avatar_initials || assignee.full_name?.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium truncate flex-1">{assignee.full_name}</span>
                  </>
                ) : (
                  <>
                    <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <span className="text-sm text-muted-foreground flex-1">Unassigned</span>
                  </>
                )}
                <Button 
                  variant="link" 
                  size="sm" 
                  className="text-xs text-primary p-0 h-auto"
                  onClick={onAssignToMe}
                  disabled={isConverted}
                >
                  Assign to me
                </Button>
              </div>
            </FieldRow>

            {/* Team/Group */}
            <FieldRow label="Team / Group">
              <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md">
                <Users className="h-4 w-4 text-muted-foreground" />
                {assigneeWorkgroup ? (
                  <span className="text-sm font-medium truncate">{assigneeWorkgroup.name}</span>
                ) : (
                  <span className="text-sm text-muted-foreground">No group assigned</span>
                )}
              </div>
            </FieldRow>
          </div>

          {/* ========== CARD 2: SLA HEALTH ========== */}
          <div className="p-3 rounded-lg border border-border bg-background">
            <CardHeader title="SLA Health" icon={Clock} />
            
            {sla ? (
              <div className="space-y-2">
                {/* Response SLA */}
                <div className="flex items-center justify-between">
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
                <div className="flex items-center justify-between">
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
                <div className="pt-2 border-t border-border mt-2 space-y-1">
                  <p className="text-[10px] text-muted-foreground">
                    Response due: {formatDateTime(sla.response_due_at)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Resolution due: {formatDateTime(sla.resolution_due_at)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No SLA configured</p>
            )}
          </div>

          {/* ========== CARD 3: IMPACT & CLASSIFICATION ========== */}
          <Collapsible open={impactExpanded} onOpenChange={setImpactExpanded}>
            <div className="p-3 rounded-lg border border-border bg-background">
              <CollapsibleTrigger className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Impact & Classification
                  </span>
                </div>
                <ChevronDown className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  impactExpanded && "rotate-180"
                )} />
              </CollapsibleTrigger>
              
              <CollapsibleContent className="pt-3 space-y-3">
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
                  {priority ? (
                    <Badge variant="outline" className={cn('text-sm px-2 py-1', PRIORITY_CONFIG[priority].className)}>
                      {PRIORITY_CONFIG[priority].fullLabel}
                    </Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">Not calculated</span>
                  )}
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
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* ========== CARD 4: PROJECT & RELEASE ========== */}
          <div className="p-3 rounded-lg border border-border bg-background">
            <CardHeader title="Project & Release" icon={FolderKanban} />
            
            {/* Project */}
            <FieldRow label="Project" className="mb-3">
              <Select 
                value={projectId || 'unassigned'} 
                onValueChange={(v) => onProjectChange(v === 'unassigned' ? '' : v)}
                disabled={isConverted}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned" className="text-sm text-muted-foreground">
                    Unassigned
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
              <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md">
                <Cog className="h-3.5 w-3.5 text-muted-foreground" />
                {releaseVersion ? (
                  <span className="text-sm font-medium">
                    {releaseVersion.version}
                    {releaseVersion.name && ` — ${releaseVersion.name}`}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">Not specified</span>
                )}
              </div>
            </FieldRow>
          </div>

          {/* ========== CARD 5: REPORTER & METADATA ========== */}
          <div className="p-3 rounded-lg border border-border bg-background">
            <CardHeader title="Reporter & Metadata" icon={Calendar} />
            
            {/* Reporter */}
            <FieldRow label="Reporter" className="mb-3">
              <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
                    {reporter?.avatar_initials || 
                     reporter?.full_name?.slice(0, 2) ||
                     reporterName?.charAt(0) || 
                     'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium truncate">
                  {reporter?.full_name || reporterName || 'Unknown'}
                </span>
              </div>
            </FieldRow>

            {/* Dates */}
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

            {/* Support Level */}
            {supportLevel && (
              <FieldRow label="Support Level" className="mt-3">
                <Badge variant="outline" className="text-sm px-2 py-1">
                  {supportLevel} — {supportLevel === 'L1' ? 'Frontline' : supportLevel === 'L2' ? 'Technical' : 'Specialist'}
                </Badge>
              </FieldRow>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
