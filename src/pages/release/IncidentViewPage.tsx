import { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Paperclip, Clock, User, Loader2, AlertTriangle, CheckCircle, XCircle, FileText, GitBranch, Edit2, Plus, UserPlus, ArrowRightCircle, History, MessageSquare, Timer, ExternalLink, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useIncident, useUpdateIncident, useReleaseVersions, useAddComment, useWorkgroups } from '@/hooks/useIncidents';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { ConversionDialog } from '@/components/incidents/ConversionDialog';
import { CAPGovernanceSection } from '@/components/incidents/CAPGovernanceSection';
import { EventLogSection } from '@/components/incidents/EventLogSection';
import { LinkedWorkItemsPicker } from '@/components/incidents/LinkedWorkItemsPicker';
import type { IncidentStatus, SeverityLevel, SupportLevel, VoteStatus, CommitteeMember, Incident, PriorityLevel, IncidentUserProfile } from '@/types/incident';

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

// Testing Status options - Updated per requirements
const TESTING_STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'beta_tested', label: 'Beta Tested' },
  { value: 'production_tested', label: 'Production Tested' },
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

// Priority badge
const PriorityBadge = ({ priority }: { priority: PriorityLevel | undefined | null }) => {
  if (!priority) return <span className="text-muted-foreground">-</span>;
  const colors: Record<string, string> = {
    P1: 'bg-red-100 text-red-800 border-red-200',
    P2: 'bg-orange-100 text-orange-800 border-orange-200',
    P3: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    P4: 'bg-blue-100 text-blue-800 border-blue-200',
  };
  return (
    <Badge variant="outline" className={cn('text-xs font-medium', colors[priority])}>
      {priority}
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

// SLA Timer component with visual indicators
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
  let progressPercent = 100;
  
  if (isMet) {
    timeRemaining = 'Met';
    progressPercent = 100;
  } else if (isBreached) {
    timeRemaining = 'Breached';
    progressPercent = 100;
  } else {
    const diff = due.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (diff < 0) {
      timeRemaining = 'Overdue';
      progressPercent = 100;
    } else if (hours > 24) {
      timeRemaining = `${Math.floor(hours / 24)}d ${hours % 24}h`;
      progressPercent = 30;
    } else if (hours > 0) {
      timeRemaining = `${hours}h ${minutes}m`;
      progressPercent = 60;
    } else {
      timeRemaining = `${minutes}m`;
      progressPercent = 85;
    }
  }
  
  return (
    <div className={cn(
      "p-3 rounded-lg border",
      isBreached ? "bg-red-50 border-red-200" : isMet ? "bg-green-50 border-green-200" : "bg-muted/50 border-border"
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Timer className={cn(
            "h-4 w-4",
            isBreached ? "text-red-600" : isMet ? "text-green-600" : "text-muted-foreground"
          )} />
          <span className="text-xs font-medium text-foreground">{label}</span>
        </div>
        <span className={cn(
          "text-sm font-semibold",
          isBreached ? "text-red-700" : isMet ? "text-green-700" : "text-foreground"
        )}>
          {timeRemaining}
        </span>
      </div>
      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={cn(
            "h-full rounded-full transition-all",
            isBreached ? "bg-red-500" : isMet ? "bg-green-500" : progressPercent > 70 ? "bg-orange-500" : "bg-blue-500"
          )}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <div className="text-[10px] text-muted-foreground mt-1">
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
  type?: 'text' | 'select' | 'textarea' | 'date';
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

  if (disabled) {
    return (
      <div className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs text-foreground">{renderValue ? renderValue(value) : value || '-'}</span>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="py-1.5 space-y-1 border-b border-border/30 last:border-0">
        <span className="text-xs text-muted-foreground">{label}</span>
        {type === 'select' && options ? (
          <Select value={editValue} onValueChange={(v) => { setEditValue(v); onSave(v); setIsEditing(false); }}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[500]">
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : type === 'textarea' ? (
          <Textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            autoFocus
            className="text-xs min-h-[60px]"
          />
        ) : type === 'date' ? (
          <Input
            type="date"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            autoFocus
            className="h-7 text-xs"
          />
        ) : (
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            autoFocus
            className="h-7 text-xs"
          />
        )}
      </div>
    );
  }

  return (
    <div 
      className="flex items-center justify-between py-1.5 group cursor-pointer hover:bg-muted/30 -mx-2 px-2 rounded border-b border-border/30 last:border-0"
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

// Mock approvers for demo
const MOCK_APPROVERS: IncidentUserProfile[] = [
  { id: '1', full_name: 'Ahmed Al-Rashid', email: 'ahmed@company.com', avatar_initials: 'AR', incident_role: 'committee_member', has_veto_power: true },
  { id: '2', full_name: 'Sara Hassan', email: 'sara@company.com', avatar_initials: 'SH', incident_role: 'committee_member', has_veto_power: false },
  { id: '3', full_name: 'Mohammed Ali', email: 'mohammed@company.com', avatar_initials: 'MA', incident_role: 'committee_member', has_veto_power: false },
  { id: '4', full_name: 'Fatima Khalid', email: 'fatima@company.com', avatar_initials: 'FK', incident_role: 'admin', has_veto_power: true },
];

export default function IncidentViewPage() {
  const { incidentId } = useParams<{ incidentId: string }>();
  const navigate = useNavigate();
  const { data: incident, isLoading, error } = useIncident(incidentId || '');
  const updateIncident = useUpdateIncident();
  const addComment = useAddComment();
  const { data: releaseVersions } = useReleaseVersions();
  const { data: workgroups } = useWorkgroups();
  
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [activeTab, setActiveTab] = useState('comments');
  const [linkedItems, setLinkedItems] = useState<Array<{ id: string; key: string; title: string; type: 'story' | 'feature' | 'epic'; status: string }>>([]);

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

  const handleConvert = useCallback(async (type: string, justification: string, sendToCommittee: boolean) => {
    if (!incident?.id) return;
    
    try {
      if (sendToCommittee) {
        // Send to committee first
        await updateIncident.mutateAsync({
          id: incident.id,
          data: {
            status: 'to_committee' as IncidentStatus,
            requires_committee: true,
            conversion_reason: justification,
            converted_to_type: type as 'story' | 'feature' | 'epic',
          },
        });
        toast.success('Sent to CAP Committee for approval');
      } else {
        // Direct conversion
        await updateIncident.mutateAsync({
          id: incident.id,
          data: {
            status: 'converted' as IncidentStatus,
            converted_to_type: type as 'story' | 'feature' | 'epic',
            converted_at: new Date().toISOString(),
            conversion_reason: justification,
          },
        });
        toast.success(`Incident converted to ${type}`);
      }
    } catch (error) {
      toast.error('Failed to convert incident');
    }
  }, [incident?.id, updateIncident]);

  const handleAddApprover = useCallback(async (userId: string, hasVeto: boolean, note: string) => {
    // In production, this would call an API to add the approver
    toast.success('Approver added');
  }, []);

  const handleVote = useCallback(async (memberId: string, vote: VoteStatus, comment: string) => {
    // In production, this would call an API to submit the vote
    toast.success(`Vote recorded: ${vote}`);
  }, []);

  const handleUpdateDecisionNote = useCallback(async (note: string) => {
    // In production, this would call an API to update the decision note
    if (!incident?.id) return;
    try {
      // Would update committee decision note
      toast.success('Decision note updated');
    } catch (error) {
      toast.error('Failed to update decision note');
    }
  }, [incident?.id]);

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

  const handleLinkWorkItem = (item: { id: string; key: string; title: string; type: 'story' | 'feature' | 'epic'; status: string }) => {
    setLinkedItems(prev => [...prev, item]);
    toast.success(`Linked ${item.key}`);
  };

  const handleUnlinkWorkItem = (itemId: string) => {
    setLinkedItems(prev => prev.filter(i => i.id !== itemId));
    toast.success('Link removed');
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
          <Link to="/release/incidents" className="text-brand-primary hover:underline text-sm mt-2 inline-block">
            Back to Incidents
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header - Clean separation, scannable in < 3 seconds */}
      <div className="h-16 border-b border-border bg-card flex-shrink-0 px-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/release/incidents">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          
          {/* Key & Summary - Clear hierarchy */}
          <div className="flex items-center gap-3">
            <span className="font-mono text-base font-bold text-brand-primary">{incident.incident_key}</span>
            <div className="h-5 w-px bg-border" />
            <h1 className="text-sm font-medium text-foreground max-w-md truncate">{incident.title}</h1>
          </div>
        </div>
        
        {/* Status Badges - Scannable */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Select value={incident.status} onValueChange={handleStatusChange} disabled={isConverted}>
              <SelectTrigger className="h-7 w-auto border-0 bg-transparent p-0 hover:bg-muted/50 rounded px-1">
                <StatusBadge status={incident.status} />
              </SelectTrigger>
              <SelectContent className="z-[500]">
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <SeverityBadge severity={incident.severity} />
            {incident.support_level && (
              <Badge variant="outline" className={cn(
                "text-xs font-medium",
                incident.support_level === 'L3' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                incident.support_level === 'L2' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                'bg-green-100 text-green-800 border-green-200'
              )}>
                {incident.support_level}
              </Badge>
            )}
            {incident.is_major_incident && (
              <Badge variant="destructive" className="text-[10px] font-semibold animate-pulse">MAJOR</Badge>
            )}
          </div>
          
          {/* Actions */}
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

      {/* Conversion Banner */}
      {isConverted && (
        <div className="bg-teal-50 border-b border-teal-200 px-4 py-2 flex items-center gap-3">
          <ArrowRightCircle className="h-4 w-4 text-teal-600" />
          <span className="text-sm text-teal-800">
            This incident has been converted to a <span className="font-semibold capitalize">{incident.converted_to_type?.replace('_', ' ')}</span>
          </span>
          {incident.converted_to_id && (
            <Button variant="ghost" size="sm" className="h-6 text-xs text-teal-700">
              <ExternalLink className="h-3 w-3 mr-1" />
              View Work Item
            </Button>
          )}
        </div>
      )}

      {/* Main Content - 70/30 Split */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[1fr_380px]">
        {/* Left Column - Main Content */}
        <div className="overflow-y-auto p-4 space-y-4 border-r border-border">
          {/* Section 1: Incident Overview */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Incident Overview</h2>
            
            {/* Editable Summary */}
            <div className="mb-4">
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
            <div className="mb-4">
              <label className="text-xs text-muted-foreground mb-1 block">Description</label>
              {isConverted ? (
                <div className="prose prose-sm max-w-none text-foreground text-sm">
                  {incident.description ? (
                    <div dangerouslySetInnerHTML={{ __html: incident.description }} />
                  ) : (
                    <p className="text-muted-foreground italic">No description provided</p>
                  )}
                </div>
              ) : (
                <Textarea
                  value={incident.description || ''}
                  onChange={() => {}}
                  onBlur={(e) => handleFieldUpdate('description', e.target.value)}
                  placeholder="Add a description..."
                  className="min-h-[100px] text-sm border-border"
                />
              )}
            </div>

            {/* Context fields */}
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-xs text-muted-foreground">Business Process</span>
                <p className="text-foreground">-</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Delivery Platform</span>
                <p className="text-foreground">-</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Source Department</span>
                <p className="text-foreground">-</p>
              </div>
            </div>
          </div>

          {/* Section 2: Operational Details */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Operational Details</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
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
              </div>
              <div>
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
              </div>
              <div>
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
              </div>
              <div>
                <EditableField
                  label="Priority"
                  value={incident.priority || '-'}
                  onSave={() => {}}
                  disabled
                  renderValue={(v) => v ? <PriorityBadge priority={v as PriorityLevel} /> : '-'}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div>
                <EditableField
                  label="Support Level"
                  value={incident.support_level || ''}
                  type="select"
                  options={[
                    { value: 'L1', label: 'L1 - First Line' },
                    { value: 'L2', label: 'L2 - Second Line' },
                    { value: 'L3', label: 'L3 - Third Line' },
                  ]}
                  onSave={(v) => handleFieldUpdate('support_level', v)}
                  disabled={isConverted}
                />
              </div>
              <div>
                <EditableField
                  label="Workgroup"
                  value={incident.assignee_workgroup_id || ''}
                  type="select"
                  options={workgroups?.map((w) => ({ value: w.id, label: w.name })) || []}
                  onSave={(v) => handleFieldUpdate('assignee_workgroup_id', v)}
                  disabled={isConverted}
                  renderValue={() => incident.assignee_workgroup?.name || '-'}
                />
              </div>
              <div>
                <EditableField
                  label="Assignee"
                  value={incident.assignee?.full_name || '-'}
                  onSave={() => {}}
                  disabled
                />
              </div>
              <div>
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

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div>
                <EditableField
                  label="Testing Status"
                  value={(incident as unknown as { testing_status?: string }).testing_status || 'not_started'}
                  type="select"
                  options={TESTING_STATUS_OPTIONS}
                  onSave={(v) => handleFieldUpdate('testing_status', v)}
                  disabled={isConverted}
                  renderValue={(v) => TESTING_STATUS_OPTIONS.find(o => o.value === v)?.label || 'Not Started'}
                />
              </div>
              <div>
                <EditableField
                  label="Planned Deployment"
                  value={(incident as unknown as { planned_deployment_date?: string }).planned_deployment_date || ''}
                  type="date"
                  onSave={(v) => handleFieldUpdate('planned_deployment_date', v)}
                  disabled={isConverted}
                  renderValue={(v) => v ? format(new Date(v), 'MMM d, yyyy') : '-'}
                />
              </div>
              <div>
                <EditableField
                  label="Change Number"
                  value={(incident as unknown as { change_number?: string }).change_number || ''}
                  onSave={(v) => handleFieldUpdate('change_number', v)}
                />
              </div>
              <div>
                <EditableField
                  label="Release Version"
                  value={incident.release_version_id || ''}
                  type="select"
                  options={releaseVersions?.map((v) => ({ value: v.id, label: v.version })) || []}
                  onSave={(v) => handleFieldUpdate('release_version_id', v)}
                  disabled={isConverted}
                  renderValue={() => incident.release_version?.version || '-'}
                />
              </div>
            </div>
          </div>

          {/* Section 3: SLA Status */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">SLA Status</h2>
            
            {incident.sla ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SlaTimer 
                  label="Response SLA" 
                  dueAt={incident.sla.response_due_at} 
                  metAt={incident.sla.response_met_at}
                  breached={incident.sla.response_breached}
                />
                <SlaTimer 
                  label="Resolution SLA" 
                  dueAt={incident.sla.resolution_due_at} 
                  metAt={incident.sla.resolution_met_at}
                  breached={incident.sla.resolution_breached}
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No SLA record for this incident</p>
            )}

            {/* SLA Breach Indicators */}
            {incident.sla && (incident.sla.response_breached || incident.sla.resolution_breached) && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">SLA Breach Alert</span>
                </div>
                <p className="text-xs text-red-700 mt-1">
                  {incident.sla.response_breached && 'Response SLA breached. '}
                  {incident.sla.resolution_breached && 'Resolution SLA breached.'}
                </p>
              </div>
            )}
          </div>

          {/* Section 4: Activity & History Tabs */}
          <div className="bg-card border border-border rounded-lg p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="comments" className="text-xs">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Comments ({incident.comments?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="history" className="text-xs">
                  <History className="h-3 w-3 mr-1" />
                  History
                </TabsTrigger>
                <TabsTrigger value="sla_events" className="text-xs">
                  <Activity className="h-3 w-3 mr-1" />
                  Events
                </TabsTrigger>
                <TabsTrigger value="linked" className="text-xs">
                  <GitBranch className="h-3 w-3 mr-1" />
                  Linked Items
                </TabsTrigger>
              </TabsList>

              <TabsContent value="comments" className="space-y-3">
                {/* Add Comment - Optimized for high-volume usage */}
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment... (Enter to submit)"
                      className="text-sm pr-16"
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddComment()}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                      ⏎ Enter
                    </span>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || addComment.isPending}
                    className="bg-brand-primary text-white h-9"
                  >
                    {addComment.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Add'}
                  </Button>
                </div>

                {incident.comments && incident.comments.length > 0 ? (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {incident.comments.map((comment) => (
                      <div key={comment.id} className="flex gap-2 py-2 border-b border-border/30 last:border-0">
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold flex-shrink-0">
                          {comment.author?.avatar_initials || comment.author?.full_name?.charAt(0) || 'S'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-medium text-foreground truncate">
                              {comment.author?.full_name || 'System'}
                            </span>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {format(new Date(comment.created_at), 'MMM d, h:mm a')}
                            </span>
                            {comment.comment_type !== 'update' && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 capitalize">{comment.comment_type}</Badge>
                            )}
                          </div>
                          <div className="text-xs text-foreground leading-relaxed">{comment.content}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <MessageSquare className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No comments yet. Be the first to add one.</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history" className="max-h-64 overflow-y-auto">
                {incident.history && incident.history.length > 0 ? (
                  <div className="space-y-2">
                    {incident.history.map((event) => (
                      <div key={event.id} className="text-xs py-2 border-b border-border/50 last:border-0">
                        <div className="flex items-center gap-2">
                          <History className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium text-foreground">{event.field_name}</span>
                          <span className="text-muted-foreground">changed</span>
                        </div>
                        <div className="ml-5 text-muted-foreground">
                          <span className="line-through">{event.old_value || '(empty)'}</span>
                          {' → '}
                          <span className="text-foreground">{event.new_value || '(empty)'}</span>
                        </div>
                        <div className="ml-5 text-[10px] text-muted-foreground mt-0.5">
                          {format(new Date(event.changed_at), 'MMM d, h:mm a')}
                          {event.changer && ` by ${event.changer.full_name}`}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic py-4 text-center">No history yet</p>
                )}
              </TabsContent>

              <TabsContent value="sla_events" className="max-h-64 overflow-y-auto">
                <EventLogSection incident={incident} maxHeight="240px" />
              </TabsContent>

              <TabsContent value="linked">
                <LinkedWorkItemsPicker
                  linkedItems={linkedItems}
                  onLink={handleLinkWorkItem}
                  onUnlink={handleUnlinkWorkItem}
                  disabled={isConverted}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Attachments - Compact one-line list */}
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Attachments
              </h2>
              {incident.attachments && incident.attachments.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">{incident.attachments.length}</Badge>
              )}
            </div>
            {incident.attachments && incident.attachments.length > 0 ? (
              <div className="space-y-1">
                {incident.attachments.map((att) => (
                  <div key={att.id} className="flex items-center gap-2 py-1.5 hover:bg-muted/30 rounded px-2 -mx-2 cursor-pointer group">
                    <Paperclip className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-foreground flex-1 truncate group-hover:text-brand-primary">{att.file_name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {att.file_size >= 1024 * 1024 
                        ? `${(att.file_size / (1024 * 1024)).toFixed(1)}MB`
                        : `${(att.file_size / 1024).toFixed(1)}KB`
                      }
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No attachments</p>
            )}
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="overflow-y-auto p-4 space-y-4 bg-muted/20">
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

          {/* CAP Committee Governance Panel - Only for L3 */}
          {isL3 && incident.committee && (
            <CAPGovernanceSection
              incident={incident}
              committee={incident.committee}
              availableApprovers={MOCK_APPROVERS}
              isConverted={isConverted}
              onAddApprover={handleAddApprover}
              onVote={handleVote}
              onUpdateDecisionNote={handleUpdateDecisionNote}
            />
          )}

          {/* L3 Committee Prompt - When no committee yet */}
          {isL3 && !incident.committee && !isConverted && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">L3 Incident</span>
              </div>
              <p className="text-xs text-yellow-700 mb-3">
                This L3 incident requires CAP Committee approval before conversion to a work item.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowConvertDialog(true)}
                className="w-full h-8 text-xs border-yellow-300 text-yellow-800 hover:bg-yellow-100"
              >
                <ArrowRightCircle className="h-3.5 w-3.5 mr-1" />
                Initiate Conversion
              </Button>
            </div>
          )}

          {/* Dates Panel */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Dates</h2>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created:</span>
                <span className="text-foreground">{format(new Date(incident.created_at), 'MMM d, yyyy h:mm a')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated:</span>
                <span className="text-foreground">{format(new Date(incident.updated_at), 'MMM d, yyyy h:mm a')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Age:</span>
                <span className="text-foreground font-mono">{formatDistanceToNow(new Date(incident.created_at))}</span>
              </div>
              {incident.resolved_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Resolved:</span>
                  <span className="text-foreground">{format(new Date(incident.resolved_at), 'MMM d, yyyy h:mm a')}</span>
                </div>
              )}
              {incident.converted_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Converted:</span>
                  <span className="text-foreground">{format(new Date(incident.converted_at), 'MMM d, yyyy h:mm a')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Convert Dialog */}
      <ConversionDialog
        open={showConvertDialog}
        onOpenChange={setShowConvertDialog}
        incident={incident}
        onConvert={handleConvert}
      />
    </div>
  );
}
