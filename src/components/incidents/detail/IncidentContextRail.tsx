import { AlertTriangle, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SlaStatusCard } from '@/components/incidents/SlaStatusCard';
import { IncidentWatchersWidget } from '@/components/incidents/IncidentWatchersWidget';
import { cn } from '@/lib/utils';
import { getAllowedTransitions } from '@/utils/incidentLifecycle';
import type { IncidentStatus, SeverityLevel, PriorityLevel, ImpactLevel, UrgencyLevel, SupportLevel } from '@/types/incident';

const STATUS_CONFIG: Record<IncidentStatus, { label: string; className: string }> = {
  open: { label: 'New', className: 'bg-blue-100 text-blue-800' },
  triage: { label: 'Triage', className: 'bg-yellow-100 text-yellow-800' },
  to_committee: { label: 'To Committee', className: 'bg-purple-100 text-purple-800' },
  in_progress: { label: 'In Progress', className: 'bg-cyan-100 text-cyan-800' },
  resolved: { label: 'Resolved', className: 'bg-green-100 text-green-800' },
  converted: { label: 'Converted', className: 'bg-secondary-green/20 text-secondary-green' },
  closed: { label: 'Closed', className: 'bg-muted text-muted-foreground' },
};

const SEVERITY_CONFIG: Record<SeverityLevel, { label: string; className: string }> = {
  SEV1: { label: 'SEV1 — Critical', className: 'bg-red-100 text-red-800 border-red-200' },
  SEV2: { label: 'SEV2 — High', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  SEV3: { label: 'SEV3 — Medium', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  SEV4: { label: 'SEV4 — Low', className: 'bg-blue-100 text-blue-800 border-blue-200' },
};

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
  onImpactChange: (impact: string) => void;
  onUrgencyChange: (urgency: string) => void;
  onAssignToMe: () => void;
  onVote: (vote: 'approved' | 'rejected') => void;
  isSubmitting: boolean;
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
  onImpactChange,
  onUrgencyChange,
  onAssignToMe,
  onVote,
  isSubmitting,
}: IncidentContextRailProps) {
  const allowedTransitions = getAllowedTransitions(status, supportLevel, committee?.status as any);
  const severityConfig = SEVERITY_CONFIG[severity];

  return (
    <aside className="flex-[3] w-72 min-w-[280px] max-w-xs border-l border-border overflow-auto bg-muted/10 p-4 space-y-3">
      {/* L3 Governance Banner - Only for L3 */}
      {supportLevel === 'L3' && requiresCommittee && (
        <div className="flex gap-3 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
          <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-yellow-800">L3 Governance Required</p>
            <p className="text-xs text-yellow-700">
              This incident requires committee approval before conversion.
            </p>
          </div>
        </div>
      )}

      {/* 1. Status Selector */}
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</label>
        <Select 
          value={status} 
          onValueChange={(v) => onStatusChange(v as IncidentStatus)}
          disabled={isConverted || status === 'closed'}
        >
          <SelectTrigger className={cn('mt-1', STATUS_CONFIG[status].className)}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={status}>
              {STATUS_CONFIG[status].label} (current)
            </SelectItem>
            {allowedTransitions
              .filter(t => t.targetStatus !== status)
              .map(t => (
                <SelectItem key={t.targetStatus} value={t.targetStatus}>
                  {STATUS_CONFIG[t.targetStatus].label}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* 2. SLA Status Cards - Read-only, from sla_records */}
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">SLA Status</label>
        <SlaStatusCard slaRecord={sla} createdAt={createdAt} />
      </div>

      {/* 3. Severity (read-only) */}
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Severity</label>
        <div className="mt-1">
          <Badge variant="outline" className={cn('border', severityConfig.className)}>
            {severityConfig.label}
          </Badge>
        </div>
      </div>

      {/* 4. Priority (derived, read-only) */}
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Priority (derived)</label>
        <div className="mt-1">
          {priority && (
            <Badge variant="outline" className={cn(
              'border',
              priority === 'P1' ? 'bg-red-100 text-red-800 border-red-200' :
              priority === 'P2' ? 'bg-orange-100 text-orange-800 border-orange-200' :
              priority === 'P3' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
              'bg-blue-100 text-blue-800 border-blue-200'
            )}>
              {priority} — {priority === 'P1' ? 'Critical' : priority === 'P2' ? 'High' : priority === 'P3' ? 'Medium' : 'Low'}
            </Badge>
          )}
        </div>
      </div>

      {/* 5. Impact Control */}
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Impact</label>
        <Select value={impact} onValueChange={onImpactChange} disabled={isConverted}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 6. Urgency Control */}
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Urgency</label>
        <Select value={urgency} onValueChange={onUrgencyChange} disabled={isConverted}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 7. Assignee */}
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Assignee</label>
        <div className="mt-1 flex items-center gap-2">
          {assignee ? (
            <>
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px] bg-secondary-bronze text-white">
                  {assignee.avatar_initials || assignee.full_name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">{assignee.full_name}</span>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">Unassigned</span>
          )}
          <Button 
            variant="link" 
            size="sm" 
            className="text-xs text-brand-primary p-0 h-auto"
            onClick={onAssignToMe}
            disabled={isConverted}
          >
            Assign to me
          </Button>
        </div>
      </div>

      {/* 8. Business Process / Support Level */}
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Support Level</label>
        <div className="mt-1">
          {supportLevel ? (
            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
              {supportLevel}
            </Badge>
          ) : (
            <span className="text-sm text-muted-foreground">Not set</span>
          )}
        </div>
      </div>

      {/* Watchers Widget */}
      <IncidentWatchersWidget incidentId={incidentId} />

      {/* Created/Updated */}
      <div className="pt-4 border-t border-border space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Created</span>
          <span>{new Date(createdAt).toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Updated</span>
          <span>{new Date(updatedAt).toLocaleString()}</span>
        </div>
      </div>

      {/* 9. CAP Committee Panel - Only visible when L3 */}
      {supportLevel === 'L3' && committee && (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
            <h3 className="text-sm font-medium">CAP Committee</h3>
            <Badge 
              variant="outline" 
              className={cn(
                'text-[10px]',
                committee.status === 'approved' ? 'bg-green-100 text-green-800' :
                committee.status === 'rejected' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              )}
            >
              {committee.status.charAt(0).toUpperCase() + committee.status.slice(1)}
            </Badge>
          </div>
          <div className="p-3 space-y-3">
            {/* Progress */}
            <div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-secondary-green rounded-full transition-all"
                  style={{ 
                    width: `${(committee.members?.filter(m => m.vote?.vote === 'approved').length || 0) / (committee.members?.length || 1) * 100}%` 
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {committee.members?.filter(m => m.vote?.vote === 'approved').length || 0} of {committee.required_approvals} approvals (majority required)
              </p>
            </div>

            {/* Veto Rule */}
            <p className="text-xs text-muted-foreground border-l-2 border-yellow-400 pl-2">
              Any member with veto power can block approval.
            </p>

            {/* Members */}
            <div className="space-y-2">
              {committee.members?.map(member => (
                <div key={member.id} className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[10px] bg-secondary-bronze text-white">
                      {member.user?.avatar_initials || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{member.user?.full_name}</p>
                    <p className="text-[10px] text-muted-foreground">{member.role}</p>
                  </div>
                  {member.has_veto && (
                    <Badge variant="outline" className="text-[9px] px-1">Veto</Badge>
                  )}
                  <Badge 
                    variant="outline" 
                    className={cn(
                      'text-[10px]',
                      member.vote?.vote === 'approved' ? 'bg-green-100 text-green-800' :
                      member.vote?.vote === 'rejected' ? 'bg-red-100 text-red-800' :
                      member.vote?.vote === 'vetoed' ? 'bg-purple-100 text-purple-800' :
                      'bg-muted text-muted-foreground'
                    )}
                  >
                    {member.vote?.vote === 'approved' ? 'Approved' :
                     member.vote?.vote === 'rejected' ? 'Rejected' :
                     member.vote?.vote === 'vetoed' ? 'Vetoed' : 'Pending'}
                  </Badge>
                </div>
              ))}
            </div>

            {/* Vote Actions - gated by backend flags */}
            {committee.status === 'pending' && (
              <div className="flex gap-2 pt-2">
                <Button 
                  size="sm" 
                  className="flex-1 bg-secondary-green hover:bg-secondary-green/90 text-white"
                  onClick={() => onVote('approved')}
                  disabled={isSubmitting}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Approve
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive" 
                  className="flex-1"
                  onClick={() => onVote('rejected')}
                  disabled={isSubmitting}
                >
                  <X className="h-3 w-3 mr-1" />
                  Reject
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
