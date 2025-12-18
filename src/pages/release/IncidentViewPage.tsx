import { useState, useCallback, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Paperclip, Clock, User, Loader2, AlertTriangle, CheckCircle, XCircle, FileText, GitBranch, Edit2, Save, X, Plus, UserPlus, ArrowRightCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useIncident, useUpdateIncident, useReleaseVersions, useAddComment } from '@/hooks/useIncidents';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { IncidentStatus, SeverityLevel, SupportLevel, VoteStatus, CommitteeMember, ImpactLevel, UrgencyLevel, DeliveryStage, Incident } from '@/types/incident';

// Status options
const STATUS_OPTIONS: { value: IncidentStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'triage', label: 'Triage' },
  { value: 'to_committee', label: 'To CAP Committee' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'converted', label: 'Converted' },
  { value: 'closed', label: 'Closed' },
];

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

// Editable field with autosave
function EditableField({ 
  label, 
  value, 
  type = 'text',
  options,
  onSave,
  disabled,
  renderValue
}: { 
  label: string; 
  value: string | undefined | null;
  type?: 'text' | 'select' | 'textarea';
  options?: { value: string; label: string }[];
  onSave: (value: string) => void;
  disabled?: boolean;
  renderValue?: (value: string | undefined | null) => React.ReactNode;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');

  useEffect(() => {
    setEditValue(value || '');
  }, [value]);

  const handleSave = () => {
    if (editValue !== value) {
      onSave(editValue);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value || '');
    setIsEditing(false);
  };

  if (disabled) {
    return (
      <div className="flex items-center justify-between py-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs text-foreground">{renderValue ? renderValue(value) : value || '-'}</span>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="py-1 space-y-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        {type === 'select' && options ? (
          <Select value={editValue} onValueChange={(v) => { setEditValue(v); onSave(v); setIsEditing(false); }}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : type === 'textarea' ? (
          <div className="space-y-1">
            <Textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              autoFocus
              className="text-xs min-h-[60px]"
            />
          </div>
        ) : (
          <div className="flex gap-1">
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              autoFocus
              className="h-7 text-xs"
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      className="flex items-center justify-between py-1 group cursor-pointer hover:bg-muted/30 -mx-2 px-2 rounded"
      onClick={() => setIsEditing(true)}
    >
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <span className="text-xs text-foreground">{renderValue ? renderValue(value) : value || '-'}</span>
        <Edit2 className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}

// Convert Incident Dialog
function ConvertDialog({ 
  open, 
  onOpenChange, 
  incident,
  onConvert 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  incident: Incident;
  onConvert: (type: string, reason: string) => void;
}) {
  const [convertType, setConvertType] = useState<string>('story');
  const [reason, setReason] = useState('');

  const handleConvert = () => {
    onConvert(convertType, reason);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convert Incident</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Convert to</label>
            <Select value={convertType} onValueChange={setConvertType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="story">Story</SelectItem>
                <SelectItem value="feature">Feature</SelectItem>
                <SelectItem value="epic">Epic</SelectItem>
                <SelectItem value="business_request">Business Request</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Conversion Reason</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this incident being converted?"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConvert} className="bg-brand-primary text-white">
            Convert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function IncidentViewPage() {
  const { incidentId } = useParams<{ incidentId: string }>();
  const navigate = useNavigate();
  const { data: incident, isLoading, error, refetch } = useIncident(incidentId || '');
  const updateIncident = useUpdateIncident();
  const addComment = useAddComment();
  const { data: releaseVersions } = useReleaseVersions();
  
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [newComment, setNewComment] = useState('');

  const isConverted = incident?.status === 'converted';
  const isL3 = incident?.support_level === 'L3';

  const handleFieldUpdate = useCallback(async (field: string, value: string | boolean) => {
    if (!incident?.id) return;
    
    try {
      await updateIncident.mutateAsync({
        id: incident.id,
        data: { [field]: value },
      });
      toast.success('Updated');
    } catch (error) {
      toast.error('Failed to update');
    }
  }, [incident?.id, updateIncident]);

  const handleStatusChange = useCallback(async (status: IncidentStatus) => {
    if (!incident?.id) return;
    
    try {
      await updateIncident.mutateAsync({
        id: incident.id,
        data: { status },
      });
      toast.success(`Status changed to ${status.replace('_', ' ')}`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  }, [incident?.id, updateIncident]);

  const handleConvert = useCallback(async (type: string, reason: string) => {
    if (!incident?.id) return;
    
    try {
      await updateIncident.mutateAsync({
        id: incident.id,
        data: {
          status: 'converted' as IncidentStatus,
          converted_to_type: type,
          converted_at: new Date().toISOString(),
          conversion_reason: reason,
        },
      });
      toast.success(`Incident converted to ${type}`);
    } catch (error) {
      toast.error('Failed to convert incident');
    }
  }, [incident?.id, updateIncident]);

  const handleAddComment = async () => {
    if (!incident?.id || !newComment.trim()) return;
    
    try {
      await addComment.mutateAsync({
        incident_id: incident.id,
        content: newComment,
        comment_type: 'update',
      });
      setNewComment('');
      toast.success('Comment added');
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };

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
      <div className="h-12 border-b border-border bg-card flex-shrink-0 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/release/incidents/list">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-brand-primary">{incident.incident_key}</span>
            <Select value={incident.status} onValueChange={handleStatusChange} disabled={isConverted}>
              <SelectTrigger className="h-7 w-auto border-0 bg-transparent p-0">
                <StatusBadge status={incident.status} />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <SeverityBadge severity={incident.severity} />
            {incident.is_major_incident && (
              <Badge variant="destructive" className="text-[10px]">Major Incident</Badge>
            )}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          {isL3 && !isConverted && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowConvertDialog(true)}
              className="h-8 text-xs"
            >
              <ArrowRightCircle className="h-3.5 w-3.5 mr-1" />
              Convert
            </Button>
          )}
        </div>
      </div>

      {/* Main Content - 70/30 Split */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[1fr_320px]">
        {/* Left Column - Main Content */}
        <div className="overflow-y-auto p-4 space-y-4 border-r border-border">
          {/* Editable Summary */}
          <div className="group">
            <EditableField
              label=""
              value={incident.title}
              onSave={(v) => handleFieldUpdate('title', v)}
              disabled={isConverted}
              renderValue={(v) => (
                <h1 className="text-lg font-semibold text-foreground leading-tight">{v}</h1>
              )}
            />
          </div>

          {/* Editable Description */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Description</h2>
            {isConverted ? (
              <div className="prose prose-sm max-w-none text-foreground">
                {incident.description ? (
                  <div dangerouslySetInnerHTML={{ __html: incident.description }} />
                ) : (
                  <p className="text-muted-foreground italic">No description provided</p>
                )}
              </div>
            ) : (
              <Textarea
                value={incident.description || ''}
                onChange={(e) => {}}
                onBlur={(e) => handleFieldUpdate('description', e.target.value)}
                placeholder="Add a description..."
                className="min-h-[120px] text-sm border-0 p-0 focus-visible:ring-0 resize-none"
              />
            )}
          </div>

          {/* CAP Committee Panel */}
          {incident.committee && (
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">CAP Committee</h2>
                {!isConverted && (
                  <Button variant="ghost" size="sm" className="h-6 text-xs">
                    <UserPlus className="h-3 w-3 mr-1" />
                    Add Approver
                  </Button>
                )}
              </div>
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
                          <Badge variant="outline" className="text-[9px] px-1 py-0 text-orange-700 border-orange-200 bg-orange-50">
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

          {/* Comments with Add */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Comments ({incident.comments?.length || 0})
            </h2>
            
            {/* Add Comment */}
            <div className="mb-4 flex gap-2">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
              />
              <Button 
                size="sm" 
                onClick={handleAddComment}
                disabled={!newComment.trim() || addComment.isPending}
                className="bg-brand-primary text-white"
              >
                Add
              </Button>
            </div>

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
            <div className="space-y-1">
              <EditableField
                label="Severity"
                value={incident.severity}
                type="select"
                options={[
                  { value: 'SEV1', label: 'SEV1 - Critical' },
                  { value: 'SEV2', label: 'SEV2 - High' },
                  { value: 'SEV3', label: 'SEV3 - Medium' },
                  { value: 'SEV4', label: 'SEV4 - Low' },
                ]}
                onSave={(v) => handleFieldUpdate('severity', v)}
                disabled={isConverted}
                renderValue={(v) => <SeverityBadge severity={v as SeverityLevel} />}
              />
              <EditableField
                label="Impact"
                value={incident.impact}
                type="select"
                options={[
                  { value: 'high', label: 'High' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'low', label: 'Low' },
                ]}
                onSave={(v) => handleFieldUpdate('impact', v)}
                disabled={isConverted}
              />
              <EditableField
                label="Urgency"
                value={incident.urgency}
                type="select"
                options={[
                  { value: 'high', label: 'High' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'low', label: 'Low' },
                ]}
                onSave={(v) => handleFieldUpdate('urgency', v)}
                disabled={isConverted}
              />
              <EditableField
                label="Priority"
                value={incident.priority || '-'}
                onSave={() => {}}
                disabled
              />
              <EditableField
                label="Support Level"
                value={incident.support_level || '-'}
                onSave={() => {}}
                disabled={isConverted}
              />
              <EditableField
                label="Workgroup"
                value={incident.assignee_workgroup?.name || '-'}
                onSave={() => {}}
                disabled={isConverted}
              />
              <EditableField
                label="Release Version"
                value={incident.release_version_id || ''}
                type="select"
                options={releaseVersions?.map((v) => ({ value: v.id, label: v.version })) || []}
                onSave={(v) => handleFieldUpdate('release_version_id', v)}
                disabled={isConverted}
                renderValue={() => incident.release_version?.version || '-'}
              />
              <EditableField
                label="Delivery Stage"
                value={incident.delivery_stage || ''}
                type="select"
                options={[
                  { value: 'stage', label: 'Stage' },
                  { value: 'qa', label: 'QA' },
                  { value: 'beta', label: 'Beta' },
                  { value: 'prod', label: 'Production' },
                ]}
                onSave={(v) => handleFieldUpdate('delivery_stage', v)}
                disabled={isConverted}
              />
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
                {incident.converted_to_type === 'business_request' && <FileText className="h-3.5 w-3.5 text-teal-600" />}
                <span className="text-xs text-teal-800 capitalize">
                  Converted to {incident.converted_to_type.replace('_', ' ')}
                </span>
              </div>
              {incident.conversion_reason && (
                <p className="text-[10px] text-muted-foreground mt-2">{incident.conversion_reason}</p>
              )}
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

      {/* Convert Dialog */}
      <ConvertDialog
        open={showConvertDialog}
        onOpenChange={setShowConvertDialog}
        incident={incident}
        onConvert={handleConvert}
      />
    </div>
  );
}
