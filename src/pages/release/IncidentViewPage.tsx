import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Paperclip, Clock, User, Loader2, AlertTriangle, CheckCircle, XCircle, FileText, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useIncident } from '@/hooks/useIncidents';
import { format } from 'date-fns';
import type { IncidentStatus, SeverityLevel, SupportLevel, VoteStatus, CommitteeMember } from '@/types/incident';

// Severity badge
const SeverityBadge = ({ severity }: { severity: SeverityLevel }) => {
  const colors: Record<SeverityLevel, string> = {
    SEV1: 'bg-red-100 text-red-800 border-red-200',
    SEV2: 'bg-orange-100 text-orange-800 border-orange-200',
    SEV3: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    SEV4: 'bg-blue-100 text-blue-800 border-blue-200',
  };
  return (
    <Badge variant="outline" className={cn('text-xs font-medium', colors[severity])}>
      {severity}
    </Badge>
  );
};

// Status badge
const StatusBadge = ({ status }: { status: IncidentStatus }) => {
  const config: Record<IncidentStatus, { label: string; className: string }> = {
    open: { label: 'Open', className: 'bg-blue-100 text-blue-800' },
    triage: { label: 'Triage', className: 'bg-yellow-100 text-yellow-800' },
    to_committee: { label: 'To Committee', className: 'bg-purple-100 text-purple-800' },
    in_progress: { label: 'In Progress', className: 'bg-orange-100 text-orange-800' },
    resolved: { label: 'Resolved', className: 'bg-green-100 text-green-800' },
    converted: { label: 'Converted', className: 'bg-teal-100 text-teal-800' },
    closed: { label: 'Closed', className: 'bg-gray-100 text-gray-800' },
  };
  const { label, className } = config[status] || { label: status, className: 'bg-gray-100' };
  return (
    <Badge variant="outline" className={cn('text-xs font-medium', className)}>
      {label}
    </Badge>
  );
};

// SLA Timer component
const SlaTimer = ({ label, dueAt, metAt, breached }: { 
  label: string; 
  dueAt?: string; 
  metAt?: string; 
  breached?: boolean;
}) => {
  if (!dueAt) return null;
  
  const now = new Date();
  const due = new Date(dueAt);
  const isMet = !!metAt;
  const isBreached = breached;
  
  let timeRemaining = '';
  if (isMet) {
    timeRemaining = 'Met';
  } else if (isBreached) {
    timeRemaining = 'Breached';
  } else {
    const diff = due.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (diff < 0) {
      timeRemaining = 'Overdue';
    } else if (hours > 24) {
      timeRemaining = `${Math.floor(hours / 24)}d ${hours % 24}h`;
    } else {
      timeRemaining = `${hours}h ${minutes}m`;
    }
  }
  
  return (
    <div className={cn(
      "p-2 rounded border text-xs",
      isBreached ? "bg-red-50 border-red-200" : isMet ? "bg-green-50 border-green-200" : "bg-muted/50 border-border"
    )}>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn(
          "font-medium",
          isBreached ? "text-red-700" : isMet ? "text-green-700" : "text-foreground"
        )}>
          {timeRemaining}
        </span>
      </div>
      <div className="text-[10px] text-muted-foreground mt-0.5">
        Due: {format(due, 'MMM d, h:mm a')}
      </div>
    </div>
  );
};

// Vote status icon
const VoteIcon = ({ vote }: { vote: VoteStatus }) => {
  switch (vote) {
    case 'approved':
      return <CheckCircle className="h-3.5 w-3.5 text-green-600" />;
    case 'rejected':
      return <XCircle className="h-3.5 w-3.5 text-red-600" />;
    case 'vetoed':
      return <AlertTriangle className="h-3.5 w-3.5 text-orange-600" />;
    default:
      return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
  }
};

export default function IncidentViewPage() {
  const { incidentId } = useParams<{ incidentId: string }>();
  const { data: incident, isLoading, error } = useIncident(incidentId || '');

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-destructive text-lg font-medium">Incident not found</p>
          <Link to="/release/incidents/list" className="text-brand-primary hover:underline text-sm mt-2 inline-block">
            Back to Incidents
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="h-12 border-b border-border bg-card flex-shrink-0 px-4 flex items-center gap-3">
        <Link to="/release/incidents/list">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold text-brand-primary">{incident.incident_key}</span>
          <StatusBadge status={incident.status} />
          <SeverityBadge severity={incident.severity} />
          {incident.is_major_incident && (
            <Badge variant="destructive" className="text-[10px]">Major Incident</Badge>
          )}
        </div>
      </div>

      {/* Main Content - 70/30 Split */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[1fr_320px]">
        {/* Left Column - Main Content */}
        <div className="overflow-y-auto p-4 space-y-4 border-r border-border">
          {/* Summary */}
          <div>
            <h1 className="text-lg font-semibold text-foreground leading-tight">{incident.title}</h1>
          </div>

          {/* Description */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Description</h2>
            <div className="prose prose-sm max-w-none text-foreground">
              {incident.description ? (
                <div dangerouslySetInnerHTML={{ __html: incident.description }} />
              ) : (
                <p className="text-muted-foreground italic">No description provided</p>
              )}
            </div>
          </div>

          {/* CAP Committee Panel */}
          {incident.committee && (
            <div className="bg-card border border-border rounded-lg p-4">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">CAP Committee</h2>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline" className={cn(
                  "text-xs",
                  incident.committee.status === 'approved' ? "bg-green-100 text-green-800" :
                  incident.committee.status === 'rejected' ? "bg-red-100 text-red-800" :
                  "bg-yellow-100 text-yellow-800"
                )}>
                  {incident.committee.status.toUpperCase()}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {incident.committee.required_approvals} approvals required
                </span>
              </div>
              
              {incident.committee.members && incident.committee.members.length > 0 && (
                <div className="space-y-2">
                  {incident.committee.members.map((member: CommitteeMember) => (
                    <div key={member.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium">
                          {member.user?.avatar_initials || member.user?.full_name?.charAt(0) || '?'}
                        </div>
                        <span className="text-xs text-foreground">{member.user?.full_name}</span>
                        {member.has_veto && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 text-orange-700 border-orange-200">
                            VETO
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <VoteIcon vote={member.vote?.vote || 'pending'} />
                        {member.vote?.voted_at && (
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(member.vote.voted_at), 'MMM d, h:mm a')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {incident.committee.decision_note && (
                <div className="mt-3 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                  <span className="font-medium">Decision Note:</span> {incident.committee.decision_note}
                </div>
              )}
            </div>
          )}

          {/* Comments */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Comments ({incident.comments?.length || 0})
            </h2>
            {incident.comments && incident.comments.length > 0 ? (
              <div className="space-y-3">
                {incident.comments.map((comment) => (
                  <div key={comment.id} className="border-b border-border/50 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-medium">
                        {comment.author?.avatar_initials || comment.author?.full_name?.charAt(0) || 'S'}
                      </div>
                      <span className="text-xs font-medium text-foreground">
                        {comment.author?.full_name || 'System'}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(comment.created_at), 'MMM d, h:mm a')}
                      </span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0">{comment.comment_type}</Badge>
                    </div>
                    <div className="text-xs text-foreground ml-7">{comment.content}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No comments yet</p>
            )}
          </div>

          {/* Attachments */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Attachments ({incident.attachments?.length || 0})
            </h2>
            {incident.attachments && incident.attachments.length > 0 ? (
              <div className="space-y-2">
                {incident.attachments.map((att) => (
                  <div key={att.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded hover:bg-muted/50 cursor-pointer">
                    <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-foreground flex-1 truncate">{att.file_name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {(att.file_size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No attachments</p>
            )}
          </div>
        </div>

        {/* Right Column - Metadata */}
        <div className="overflow-y-auto p-4 space-y-4 bg-muted/20">
          {/* Details Panel */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Details</h2>
            <div className="space-y-3">
              <DetailRow label="Severity" value={<SeverityBadge severity={incident.severity} />} />
              <DetailRow label="Impact" value={incident.impact} />
              <DetailRow label="Urgency" value={incident.urgency} />
              <DetailRow label="Priority" value={incident.priority || '-'} />
              <DetailRow label="Support Level" value={incident.support_level || '-'} />
              <DetailRow label="Workgroup" value={incident.assignee_workgroup?.name || '-'} />
              <DetailRow label="Release Version" value={incident.release_version?.version || '-'} />
              <DetailRow label="Delivery Stage" value={incident.delivery_stage || '-'} />
            </div>
          </div>

          {/* SLA Panel */}
          {incident.sla && (
            <div className="bg-card border border-border rounded-lg p-4">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">SLA Status</h2>
              <div className="space-y-2">
                <SlaTimer 
                  label="Response" 
                  dueAt={incident.sla.response_due_at} 
                  metAt={incident.sla.response_met_at}
                  breached={incident.sla.response_breached}
                />
                <SlaTimer 
                  label="Resolution" 
                  dueAt={incident.sla.resolution_due_at} 
                  metAt={incident.sla.resolution_met_at}
                  breached={incident.sla.resolution_breached}
                />
              </div>
            </div>
          )}

          {/* People Panel */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">People</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Reporter:</span>
                <span className="text-xs text-foreground">{incident.reporter?.full_name || incident.reporter_name || '-'}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Assignee:</span>
                <span className="text-xs text-foreground">{incident.assignee?.full_name || '-'}</span>
              </div>
            </div>
          </div>

          {/* Linked Work Items */}
          {incident.converted_to_type && (
            <div className="bg-card border border-border rounded-lg p-4">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Linked Items</h2>
              <div className="flex items-center gap-2 p-2 bg-teal-50 rounded border border-teal-200">
                {incident.converted_to_type === 'story' && <FileText className="h-3.5 w-3.5 text-teal-600" />}
                {incident.converted_to_type === 'feature' && <GitBranch className="h-3.5 w-3.5 text-teal-600" />}
                {incident.converted_to_type === 'epic' && <GitBranch className="h-3.5 w-3.5 text-teal-600" />}
                <span className="text-xs text-teal-800 capitalize">
                  Converted to {incident.converted_to_type}
                </span>
              </div>
            </div>
          )}

          {/* History Panel */}
          {incident.history && incident.history.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-4">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">History</h2>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {incident.history.slice(0, 10).map((event) => (
                  <div key={event.id} className="text-[10px] text-muted-foreground py-1 border-b border-border/50 last:border-0">
                    <span className="font-medium text-foreground">{event.field_name}</span>
                    {' changed from '}
                    <span className="text-foreground">{event.old_value || '(empty)'}</span>
                    {' to '}
                    <span className="text-foreground">{event.new_value || '(empty)'}</span>
                    <div className="text-[9px] mt-0.5">
                      {format(new Date(event.changed_at), 'MMM d, h:mm a')}
                      {event.changer && ` by ${event.changer.full_name}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper component for detail rows
function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs text-foreground">{typeof value === 'string' ? value : value}</span>
    </div>
  );
}
