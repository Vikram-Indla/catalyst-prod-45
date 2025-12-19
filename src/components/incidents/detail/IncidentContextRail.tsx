import { AlertTriangle, Check, X, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SlaStatusCard } from '@/components/incidents/SlaStatusCard';
import { cn } from '@/lib/utils';
import { getAllowedTransitions } from '@/utils/incidentLifecycle';
import { 
  STATUS_CONFIG, 
  SEVERITY_CONFIG as SEVERITY_OPTIONS_CONFIG,
  PRIORITY_CONFIG 
} from '@/components/incidents/badges/IncidentBadges';
import type { IncidentStatus, SeverityLevel, PriorityLevel, ImpactLevel, UrgencyLevel, SupportLevel } from '@/types/incident';

// Convert SEVERITY_CONFIG to array for dropdown
const SEVERITY_OPTIONS = Object.entries(SEVERITY_OPTIONS_CONFIG).map(([value, config]) => ({
  value,
  label: `${value} — ${value === 'SEV1' ? 'Critical' : value === 'SEV2' ? 'High' : value === 'SEV3' ? 'Medium' : 'Low'}`,
  className: config.className,
}));

interface SlaRecord {
  id: string;
  response_due_at: string;
  resolution_due_at: string;
  responded_at?: string;
  resolved_at?: string;
  response_breached: boolean;
  resolution_breached: boolean;
}

interface CommitteeMember {
  id: string;
  user?: { full_name: string; avatar_initials?: string };
  role?: string;
  has_veto: boolean;
  vote?: { vote: string };
}

interface Committee {
  id: string;
  status: string;
  required_approvals: number;
  members?: CommitteeMember[];
}

interface Assignee {
  full_name: string;
  avatar_initials?: string;
}

interface IncidentContextRailProps {
  incidentId: string;
  status: IncidentStatus;
  severity: SeverityLevel;
  priority: PriorityLevel | null;
  impact: ImpactLevel;
  urgency: UrgencyLevel;
  supportLevel: SupportLevel | null;
  assignee: Assignee | null;
  sla: SlaRecord | null;
  createdAt: string;
  updatedAt: string;
  committee: Committee | null;
  requiresCommittee: boolean;
  isConverted: boolean;
  onStatusChange: (status: IncidentStatus) => void;
  onSeverityChange: (severity: string) => void;
  onImpactChange: (impact: string) => void;
  onUrgencyChange: (urgency: string) => void;
  onAssignToMe: () => void;
  onVote: (vote: 'approved' | 'rejected') => void;
  isSubmitting: boolean;
  canVote: boolean;
  voteDisabledReason?: string;
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
  sla,
  createdAt,
  updatedAt,
  committee,
  requiresCommittee,
  isConverted,
  onStatusChange,
  onSeverityChange,
  onImpactChange,
  onUrgencyChange,
  onAssignToMe,
  onVote,
  isSubmitting,
  canVote,
  voteDisabledReason,
}: IncidentContextRailProps) {
  const allowedTransitions = getAllowedTransitions(status, supportLevel, committee?.status as any);
  const currentSeverity = SEVERITY_OPTIONS.find(s => s.value === severity);
  const approvedCount = committee?.members?.filter(m => m.vote?.vote === 'approved').length || 0;
  const totalMembers = committee?.members?.length || 1;

  return (
    <aside className="w-[30%] min-w-[280px] max-w-[320px] border-l border-border overflow-auto bg-muted/5 flex flex-col">
      <div className="p-3 space-y-3">
        {/* 1. Status Selector - Backend-driven transitions only */}
        <div>
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">Status</label>
          <Select 
            value={status} 
            onValueChange={(v) => onStatusChange(v as IncidentStatus)}
            disabled={isConverted || status === 'closed'}
          >
            <SelectTrigger className={cn('h-8 text-xs', STATUS_CONFIG[status].className)}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={status} className="text-xs">
                {STATUS_CONFIG[status].label} (current)
              </SelectItem>
              {allowedTransitions
                .filter(t => t.targetStatus !== status)
                .map(t => (
                  <SelectItem key={t.targetStatus} value={t.targetStatus} className="text-xs">
                    {STATUS_CONFIG[t.targetStatus].label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {/* 2. SLA Status Cards - READ-ONLY from sla_records */}
        <div>
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">SLA Status</label>
          <SlaStatusCard slaRecord={sla} createdAt={createdAt} />
        </div>

        {/* 3. Severity - Editable */}
        <div>
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">Severity</label>
          <Select value={severity} onValueChange={onSeverityChange} disabled={isConverted}>
            <SelectTrigger className={cn('h-8 text-xs', currentSeverity?.className)}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEVERITY_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 4. Priority - Derived (read-only) - No UI recalculation */}
        <div>
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">
            Priority <span className="font-normal">(derived)</span>
          </label>
          {priority ? (
            <Badge variant="outline" className={cn('text-xs border', PRIORITY_CONFIG[priority].className)}>
              {PRIORITY_CONFIG[priority].fullLabel}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">Not calculated</span>
          )}
        </div>

        {/* 5. Impact - Editable (triggers backend recalc) */}
        <div>
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">Impact</label>
          <Select value={impact} onValueChange={onImpactChange} disabled={isConverted}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high" className="text-xs">High</SelectItem>
              <SelectItem value="medium" className="text-xs">Medium</SelectItem>
              <SelectItem value="low" className="text-xs">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 6. Urgency - Editable (triggers backend recalc) */}
        <div>
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">Urgency</label>
          <Select value={urgency} onValueChange={onUrgencyChange} disabled={isConverted}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high" className="text-xs">High</SelectItem>
              <SelectItem value="medium" className="text-xs">Medium</SelectItem>
              <SelectItem value="low" className="text-xs">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 7. Assignee - Single assignee */}
        <div>
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">Assignee</label>
          <div className="flex items-center gap-2 p-2 bg-background rounded border border-border">
            {assignee ? (
              <>
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px] bg-brand-primary text-white">
                    {assignee.avatar_initials || assignee.full_name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium flex-1 truncate">{assignee.full_name}</span>
              </>
            ) : (
              <>
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-3 w-3 text-muted-foreground" />
                </div>
                <span className="text-xs text-muted-foreground flex-1">Unassigned</span>
              </>
            )}
            <Button 
              variant="link" 
              size="sm" 
              className="text-[10px] text-brand-primary p-0 h-auto"
              onClick={onAssignToMe}
              disabled={isConverted}
            >
              Assign to me
            </Button>
          </div>
        </div>

        {/* 8. CAP Committee Panel - ONLY visible when support_level = L3 */}
        {supportLevel === 'L3' && (
          <div className="border border-border rounded overflow-hidden">
            <div className="flex items-center justify-between px-2 py-1.5 bg-muted/50 border-b border-border">
              <h3 className="text-[10px] font-medium uppercase tracking-wider">CAP Committee</h3>
              {committee && (
                <Badge 
                  variant="outline" 
                  className={cn(
                    'text-[9px] px-1 py-0',
                    committee.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    committee.status === 'rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                    'bg-amber-50 text-amber-700 border-amber-200'
                  )}
                >
                  {committee.status.charAt(0).toUpperCase() + committee.status.slice(1)}
                </Badge>
              )}
            </div>
            
            {committee ? (
              <div className="p-2 space-y-2">
                {/* Approval Progress */}
                <div>
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-secondary-green rounded-full transition-all"
                      style={{ width: `${(approvedCount / totalMembers) * 100}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {approvedCount}/{committee.required_approvals} approvals (majority required)
                  </p>
                </div>

                {/* Veto Rule - Always visible */}
                <p className="text-[10px] text-muted-foreground border-l-2 border-yellow-400 pl-1.5">
                  Single veto blocks approval
                </p>

                {/* Members List */}
                <div className="space-y-1">
                  {committee.members?.map(member => (
                    <div key={member.id} className="flex items-center gap-1.5 py-1">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[8px] bg-brand-primary text-white">
                          {member.user?.avatar_initials || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-medium truncate">{member.user?.full_name}</p>
                      </div>
                      {member.has_veto && (
                        <Badge variant="outline" className="text-[8px] px-1 py-0 h-3">Veto</Badge>
                      )}
                      <Badge 
                        variant="outline" 
                        className={cn(
                          'text-[8px] px-1 py-0 h-3',
                          member.vote?.vote === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          member.vote?.vote === 'rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          member.vote?.vote === 'vetoed' ? 'bg-violet-50 text-violet-700 border-violet-200' :
                          'bg-muted text-muted-foreground border-border'
                        )}
                      >
                        {member.vote?.vote === 'approved' ? '✓' :
                         member.vote?.vote === 'rejected' ? '✗' :
                         member.vote?.vote === 'vetoed' ? 'V' : '?'}
                      </Badge>
                    </div>
                  ))}
                </div>

                {/* Vote Actions - ONLY when status === 'pending' */}
                {committee.status === 'pending' && (
                  <TooltipProvider>
                    <div className="flex gap-1.5 pt-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex-1">
                            <Button 
                              size="sm" 
                              className="w-full h-7 text-[10px] bg-secondary-green hover:bg-secondary-green/90 text-white"
                              onClick={() => onVote('approved')}
                              disabled={isSubmitting || !canVote}
                            >
                              <Check className="h-3 w-3 mr-0.5" />
                              Approve
                            </Button>
                          </div>
                        </TooltipTrigger>
                        {!canVote && voteDisabledReason && (
                          <TooltipContent side="top" className="text-xs">
                            {voteDisabledReason}
                          </TooltipContent>
                        )}
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex-1">
                            <Button 
                              size="sm" 
                              variant="destructive" 
                              className="w-full h-7 text-[10px]"
                              onClick={() => onVote('rejected')}
                              disabled={isSubmitting || !canVote}
                            >
                              <X className="h-3 w-3 mr-0.5" />
                              Reject
                            </Button>
                          </div>
                        </TooltipTrigger>
                        {!canVote && voteDisabledReason && (
                          <TooltipContent side="top" className="text-xs">
                            {voteDisabledReason}
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </div>
                  </TooltipProvider>
                )}
              </div>
            ) : (
              <div className="p-2">
                <p className="text-[10px] text-muted-foreground">
                  {requiresCommittee 
                    ? 'Send to committee to initiate review'
                    : 'Committee not required'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Metadata Footer */}
        <div className="pt-2 border-t border-border space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Created</span>
            <span>{new Date(createdAt).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Updated</span>
            <span>{new Date(updatedAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}