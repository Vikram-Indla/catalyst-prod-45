import { User, Users, Building2, Cog, Globe, Calendar, Clock, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SlaStatusCard } from '@/components/incidents/SlaStatusCard';
import { cn } from '@/lib/utils';
import { getAllowedTransitions } from '@/utils/incidentLifecycle';
import { 
  STATUS_CONFIG, 
  STATUS_VARIANT_CLASSES,
  SEVERITY_CONFIG as SEVERITY_OPTIONS_CONFIG,
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
import { useState } from 'react';

// Convert SEVERITY_CONFIG to array for dropdown
const SEVERITY_OPTIONS = Object.entries(SEVERITY_OPTIONS_CONFIG).map(([value, config]) => ({
  value,
  label: `${value} — ${value === 'SEV1' ? 'Critical' : value === 'SEV2' ? 'High' : value === 'SEV3' ? 'Medium' : 'Low'}`,
  dotColor: config.dotColor,
}));

const DELIVERY_STAGE_OPTIONS: { value: DeliveryStage; label: string }[] = [
  { value: 'stage', label: 'Staging' },
  { value: 'qa', label: 'QA' },
  { value: 'beta', label: 'Beta' },
  { value: 'prod', label: 'Production' },
];

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

interface IncidentTriageRailProps {
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
  sla: SlaRecord | null;
  createdAt: string;
  updatedAt: string;
  isConverted: boolean;
  onStatusChange: (status: IncidentStatus) => void;
  onSeverityChange: (severity: string) => void;
  onImpactChange: (impact: string) => void;
  onUrgencyChange: (urgency: string) => void;
  onDeliveryStageChange: (stage: string) => void;
  onAssignToMe: () => void;
  isSubmitting: boolean;
}

function FieldLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5", className)}>
      {children}
    </label>
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
    <div className={className}>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </div>
  );
}

export function IncidentTriageRail({
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
  sla,
  createdAt,
  updatedAt,
  isConverted,
  onStatusChange,
  onSeverityChange,
  onImpactChange,
  onUrgencyChange,
  onDeliveryStageChange,
  onAssignToMe,
  isSubmitting,
}: IncidentTriageRailProps) {
  const [contextExpanded, setContextExpanded] = useState(true);
  const allowedTransitions = getAllowedTransitions(status, supportLevel, undefined);
  const currentSeverity = SEVERITY_OPTIONS.find(s => s.value === severity);

  return (
    <TooltipProvider delayDuration={300}>
      <aside className="w-[340px] min-w-[320px] max-w-[380px] border-l border-border overflow-auto bg-muted/5 flex flex-col">
        <div className="p-4 space-y-5">
          {/* ========== 1. STATUS (Workflow dropdown) ========== */}
          <FieldRow label="Status">
            <Select 
              value={status} 
              onValueChange={(v) => onStatusChange(v as IncidentStatus)}
              disabled={isConverted || status === 'closed'}
            >
              <SelectTrigger 
                className={cn(
                  "h-9 text-sm font-medium border",
                  STATUS_VARIANT_CLASSES[STATUS_CONFIG[status].variant]
                )}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={status} className="text-sm">
                  {STATUS_CONFIG[status].label} (current)
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

          {/* ========== 2. ASSIGNEE + ASSIGNED GROUP ========== */}
          <div className="space-y-3">
            <FieldRow label="Assignee">
              <div className="flex items-center gap-2 p-2.5 bg-background rounded-md border border-border">
                {assignee ? (
                  <>
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                        {assignee.avatar_initials || assignee.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium truncate block">{assignee.full_name}</span>
                      {assignee.workgroup && (
                        <span className="text-xs text-muted-foreground truncate block">{assignee.workgroup.name}</span>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
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

            <FieldRow label="Assigned Group / Delivery Team">
              <div className="flex items-center gap-2 p-2.5 bg-background rounded-md border border-border">
                <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                {assigneeWorkgroup ? (
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium truncate block">{assigneeWorkgroup.name}</span>
                    <span className="text-xs text-muted-foreground">{assigneeWorkgroup.code}</span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground flex-1">No group assigned</span>
                )}
              </div>
            </FieldRow>
          </div>

          {/* ========== 3. SEVERITY + PRIORITY ========== */}
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="Severity">
              <Select value={severity} onValueChange={onSeverityChange} disabled={isConverted}>
                <SelectTrigger className="h-9 text-sm">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: currentSeverity?.dotColor }}
                    />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {SEVERITY_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value} className="text-sm">
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: opt.dotColor }}
                        />
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>

            <FieldRow label="Priority (derived)">
              {priority ? (
                <div className="h-9 flex items-center gap-2">
                  <span 
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: PRIORITY_CONFIG[priority].dotColor }}
                  />
                  <span className="text-sm font-medium text-foreground">
                    {PRIORITY_CONFIG[priority].fullLabel}
                  </span>
                </div>
              ) : (
                <div className="h-9 flex items-center">
                  <span className="text-sm text-muted-foreground">Not calculated</span>
                </div>
              )}
            </FieldRow>
          </div>

          {/* ========== 4. SLA HEALTH ========== */}
          <FieldRow label="SLA Health">
            <SlaStatusCard slaRecord={sla} createdAt={createdAt} />
          </FieldRow>

          {/* ========== 5. REPORTER + TIMESTAMPS ========== */}
          <div className="space-y-3 pt-3 border-t border-border">
            <FieldRow label="Reporter">
              <div className="flex items-center gap-2 p-2.5 bg-background rounded-md border border-border">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                    {reporter?.avatar_initials || 
                     reporter?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) ||
                     reporterName?.charAt(0) || 
                     'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium truncate flex-1">
                  {reporter?.full_name || reporterName || 'Unknown'}
                </span>
              </div>
            </FieldRow>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Created</FieldLabel>
                <div className="flex items-center gap-1.5 text-sm text-foreground">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  {new Date(createdAt).toLocaleDateString()}
                </div>
              </div>
              <div>
                <FieldLabel>Updated</FieldLabel>
                <div className="flex items-center gap-1.5 text-sm text-foreground">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  {new Date(updatedAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          {/* ========== 6. IMPACT/CONTEXT SECTION (Collapsible) ========== */}
          <Collapsible open={contextExpanded} onOpenChange={setContextExpanded}>
            <CollapsibleTrigger className="flex items-center justify-between w-full pt-3 border-t border-border">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Impact & Context
              </span>
              <ChevronDown className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                contextExpanded && "rotate-180"
              )} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-3">
              {/* Impact + Urgency */}
              <div className="grid grid-cols-2 gap-3">
                <FieldRow label="Impact">
                  <Select value={impact} onValueChange={onImpactChange} disabled={isConverted}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high" className="text-sm">High</SelectItem>
                      <SelectItem value="medium" className="text-sm">Medium</SelectItem>
                      <SelectItem value="low" className="text-sm">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldRow>

                <FieldRow label="Urgency">
                  <Select value={urgency} onValueChange={onUrgencyChange} disabled={isConverted}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high" className="text-sm">High</SelectItem>
                      <SelectItem value="medium" className="text-sm">Medium</SelectItem>
                      <SelectItem value="low" className="text-sm">Low</SelectItem>
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
                  <SelectTrigger className="h-9 text-sm">
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

              {/* Release Version */}
              <FieldRow label="Release Version">
                <div className="flex items-center gap-2 p-2.5 bg-background rounded-md border border-border">
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

              {/* Business Process */}
              <FieldRow label="Business Process">
                <div className="flex items-center gap-2 p-2.5 bg-background rounded-md border border-border">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  {businessProcess ? (
                    <span className="text-sm font-medium">{businessProcess.name_en}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Not specified</span>
                  )}
                </div>
              </FieldRow>

              {/* Affected Service/System */}
              <FieldRow label="Affected Service/System">
                <div className="flex items-center gap-2 p-2.5 bg-background rounded-md border border-border">
                  <Cog className="h-3.5 w-3.5 text-muted-foreground" />
                  {serviceComponent ? (
                    <span className="text-sm font-medium">{serviceComponent}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Not specified</span>
                  )}
                </div>
              </FieldRow>

              {/* Support Level (read-only) */}
              {supportLevel && (
                <FieldRow label="Support Level">
                  <Badge variant="outline" className="text-sm px-2 py-1">
                    {supportLevel} — {supportLevel === 'L1' ? 'Frontline' : supportLevel === 'L2' ? 'Technical' : 'Specialist'}
                  </Badge>
                </FieldRow>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </aside>
    </TooltipProvider>
  );
}
