import { useState, useEffect } from 'react';
import { 
  User, Users, Building2, Cog, Globe, Calendar, Clock, 
  ChevronDown, FolderKanban, AlertTriangle, CheckCircle,
  PanelRightClose, PanelRight, Maximize2, Minimize2
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
import { 
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
  // Handlers - Status/Assignee removed (handled in top strip only)
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

// Keys for localStorage
const RAIL_SECTIONS_KEY = 'incident-context-rail-sections';

interface SectionState {
  sla: boolean;
  impact: boolean;
  project: boolean;
  reporter: boolean;
}

const DEFAULT_SECTION_STATE: SectionState = {
  sla: true,
  impact: true,
  project: true,
  reporter: false, // Reporter & Metadata collapsed by default
};

function AccordionSection({ 
  id,
  title, 
  icon: Icon,
  isOpen,
  onToggle,
  children 
}: { 
  id: string;
  title: string; 
  icon?: React.ElementType;
  isOpen: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}) {
  return (
    <Collapsible open={isOpen} onOpenChange={() => onToggle(id)}>
      <div className="border border-border rounded-md bg-card overflow-hidden">
        <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 hover:bg-muted/40 transition-colors">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {title}
            </span>
          </div>
          <ChevronDown className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3 pt-2 space-y-2.5 border-t border-border bg-background/50">
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
      <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
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
  const severityConfig = SEVERITY_CONFIG[severity];

  // Section expand/collapse state with localStorage persistence
  const [sections, setSections] = useState<SectionState>(() => {
    try {
      const saved = localStorage.getItem(RAIL_SECTIONS_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_SECTION_STATE;
    } catch {
      return DEFAULT_SECTION_STATE;
    }
  });

  useEffect(() => {
    localStorage.setItem(RAIL_SECTIONS_KEY, JSON.stringify(sections));
  }, [sections]);

  const toggleSection = (id: string) => {
    setSections(prev => ({ ...prev, [id]: !prev[id as keyof SectionState] }));
  };

  const allExpanded = Object.values(sections).every(Boolean);
  const toggleAll = () => {
    const newState = !allExpanded;
    setSections({ sla: newState, impact: newState, project: newState, reporter: newState });
  };

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
          
          <div className="h-px w-6 bg-border" />
          
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
              <div className={cn("h-8 w-8 rounded-md flex items-center justify-center", severityConfig.className)}>
                <AlertTriangle className="h-3.5 w-3.5" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="left">Severity: {severityConfig.label}</TooltipContent>
          </Tooltip>
          
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
      <aside className="w-[300px] min-w-[280px] max-w-[320px] border-l border-border overflow-auto bg-muted/5 flex flex-col">
        {/* Rail header with collapse/expand controls */}
        <div className="px-3 py-2 border-b border-border flex items-center justify-between bg-background/80">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Context</span>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={toggleAll}
                >
                  {allExpanded ? (
                    <Minimize2 className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">{allExpanded ? 'Collapse all' : 'Expand all'}</TooltipContent>
            </Tooltip>
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
        </div>

        <div className="p-2.5 space-y-2 flex-1 overflow-auto">
          {/* ========== SECTION 1: SLA HEALTH (expanded by default) ========== */}
          <AccordionSection 
            id="sla"
            title="SLA Health" 
            icon={Clock} 
            isOpen={sections.sla}
            onToggle={toggleSection}
          >
            {sla ? (
              <div className="space-y-2">
                {/* Response SLA */}
                <div className="flex items-center justify-between py-1">
                  <span className="text-xs text-muted-foreground">Response</span>
                  <div className="flex items-center gap-1.5">
                    {sla.response_breached ? (
                      <AlertTriangle className="h-3 w-3 text-destructive" />
                    ) : sla.responded_at ? (
                      <CheckCircle className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <Clock className="h-3 w-3 text-amber-500" />
                    )}
                    <Badge 
                      variant="outline" 
                      className={cn(
                        'text-[10px] px-1.5 py-0 font-medium',
                        sla.response_breached 
                          ? 'bg-destructive/10 text-destructive border-destructive/30'
                          : sla.responded_at 
                            ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400'
                            : 'bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400'
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
                      <AlertTriangle className="h-3 w-3 text-destructive" />
                    ) : sla.resolved_at ? (
                      <CheckCircle className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <Clock className="h-3 w-3 text-amber-500" />
                    )}
                    <Badge 
                      variant="outline" 
                      className={cn(
                        'text-[10px] px-1.5 py-0 font-medium',
                        sla.resolution_breached 
                          ? 'bg-destructive/10 text-destructive border-destructive/30'
                          : sla.resolved_at 
                            ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400'
                            : 'bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400'
                      )}
                    >
                      {sla.resolution_breached ? 'Breached' : sla.resolved_at ? 'Met' : 'On track'}
                    </Badge>
                  </div>
                </div>

                {/* Due times */}
                <div className="pt-1.5 border-t border-border/50 space-y-0.5">
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

          {/* ========== SECTION 2: CLASSIFICATION ========== */}
          <AccordionSection 
            id="impact"
            title="Classification" 
            icon={AlertTriangle}
            isOpen={sections.impact}
            onToggle={toggleSection}
          >
            {/* Environment */}
            <FieldRow label="Environment">
              <Select 
                value={deliveryStage || ''} 
                onValueChange={onDeliveryStageChange} 
                disabled={isConverted}
              >
                <SelectTrigger className="h-7 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Globe className="h-3 w-3 text-muted-foreground" />
                    <SelectValue placeholder="Select environment" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {DELIVERY_STAGE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>

            {/* Affected System */}
            <FieldRow label="Affected System">
              <div className="flex items-center gap-1.5 px-2 py-1.5 bg-muted/40 rounded text-xs">
                <Cog className="h-3 w-3 text-muted-foreground" />
                <span className="truncate text-foreground">
                  {serviceComponent || 'Not specified'}
                </span>
              </div>
            </FieldRow>

            {/* Business Process */}
            <FieldRow label="Business Process">
              <div className="flex items-center gap-1.5 px-2 py-1.5 bg-muted/40 rounded text-xs">
                <Building2 className="h-3 w-3 text-muted-foreground" />
                <span className="truncate text-foreground">
                  {businessProcess?.name_en || 'Not specified'}
                </span>
              </div>
            </FieldRow>

            {/* Owning Team */}
            <FieldRow label="Owning Team">
              <Select 
                value={teamId || 'unassigned'} 
                onValueChange={(v) => onTeamChange(v === 'unassigned' ? '' : v)}
                disabled={isConverted}
              >
                <SelectTrigger className="h-7 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <SelectValue placeholder="Select team" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned" className="text-xs text-muted-foreground">
                    Unassigned
                  </SelectItem>
                  {availableTeams.map(team => (
                    <SelectItem key={team.id} value={team.id} className="text-xs">
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>
          </AccordionSection>

          {/* Support Level (if present) */}
          {supportLevel && (
            <div className="px-2.5 py-2 border border-border rounded-md bg-card">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Support Level</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
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
