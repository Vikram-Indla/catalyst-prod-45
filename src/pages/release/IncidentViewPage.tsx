import { useState, useCallback } from 'react';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';
import DOMPurify from 'dompurify';
import { useParams, Link } from 'react-router-dom';
import { 
  Eye, FileText, Upload, Link2, Edit2, 
  CheckCircle, XCircle, AlertTriangle, Clock,
  UserPlus, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, Lozenge } from '@/components/ads';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
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
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { cn } from '@/lib/utils';
import { useIncident, useUpdateIncident } from '@/hooks/useIncidents';
import { useAvailableApprovers } from '@/hooks/useIncidentUserProfiles';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { ConversionDialog } from '@/components/incidents/ConversionDialog';
import { AddApproverDialog } from '@/components/incidents/AddApproverDialog';
import type { IncidentStatus, SeverityLevel, VoteStatus } from '@/types/incident';

// Status options
const STATUS_OPTIONS: { value: IncidentStatus; label: string }[] = [
  { value: 'open', label: 'New' },
  { value: 'triage', label: 'Triage' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'to_committee', label: 'To CAP Committee' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'converted', label: 'Converted' },
  { value: 'closed', label: 'Closed' },
];

const SEVERITIES: SeverityLevel[] = ['SEV1', 'SEV2', 'SEV3', 'SEV4'];

export default function IncidentViewPage() {
  const { incidentId } = useParams<{ incidentId: string }>();
  const { data: incident, isLoading, error } = useIncident(incidentId || '');
  const updateIncident = useUpdateIncident();
  const { data: availableApprovers = [] } = useAvailableApprovers();
  
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [showAddApprover, setShowAddApprover] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');
  const [decisionNote, setDecisionNote] = useState('');
  const [activeTab, setActiveTab] = useState('activity');

  const isConverted = incident?.status === 'converted';
  const isL3 = incident?.support_level === 'L3';

  const handleFieldUpdate = useCallback(async (field: string, value: string | boolean) => {
    if (!incident?.id) return;
    try {
      await updateIncident.mutateAsync({ id: incident.id, data: { [field]: value } });
      toast.success('Saved');
    } catch {
      toast.error('Failed to update');
    }
  }, [incident?.id, updateIncident]);

  const handleConvert = useCallback(async (type: string, justification: string, sendToCommittee: boolean) => {
    if (!incident?.id) return;
    try {
      if (sendToCommittee) {
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
    } catch {
      toast.error('Failed to convert incident');
    }
  }, [incident?.id, updateIncident]);

  const handleSaveDescription = async () => {
    await handleFieldUpdate('description', editedDescription);
    setIsEditingDescription(false);
    toast.success('Description saved');
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !incident) {
    const errorMessage = error instanceof Error ? error.message : 'Incident not found';
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-destructive text-lg font-medium">{errorMessage}</p>
          <p className="text-sm text-muted-foreground mt-1">Unable to load incident data from the server</p>
          <Link to="/release/incidents" className="text-brand-primary hover:underline text-sm mt-2 inline-block">
            Back to Incidents
          </Link>
        </div>
      </div>
    );
  }

  // SLA - READ-ONLY from sla_records, no client-side calculations
  const slaRecord = incident.sla;
  const responseSla = slaRecord ? {
    met: !!slaRecord.response_met_at,
    breached: slaRecord.response_breached, // Backend-driven only
    detail: slaRecord.response_met_at 
      ? `Responded in ${formatDistanceToNow(new Date(slaRecord.response_due_at), { addSuffix: false })}`
      : slaRecord.response_due_at 
        ? `Target: ${Math.round((new Date(slaRecord.response_due_at).getTime() - new Date(incident.created_at).getTime()) / 60000)}m`
        : 'N/A'
  } : null;
  
  const resolutionSla = slaRecord ? {
    met: !!slaRecord.resolution_met_at,
    breached: slaRecord.resolution_breached, // Backend-driven only
    elapsed: Math.round((new Date().getTime() - new Date(incident.created_at).getTime()) / 60000),
    target: slaRecord.resolution_due_at 
      ? Math.round((new Date(slaRecord.resolution_due_at).getTime() - new Date(incident.created_at).getTime()) / 60000)
      : 0
  } : null;

  // Committee data
  const committee = incident.committee;
  const approvers = committee?.members || [];
  const approvedCount = approvers.filter(m => m.vote?.vote === 'approved').length;
  const totalApprovers = approvers.length;
  const hasVeto = approvers.some(m => m.vote?.vote === 'vetoed');
  const isCommitteeApproved = committee?.status === 'approved';
  const isCommitteePending = committee?.status === 'pending';

  // Activity & History mock data
  const activityItems = incident.comments?.map(c => ({
    id: c.id,
    user: c.author?.full_name || c.author_name || 'System',
    action: c.content,
    time: c.created_at,
    type: 'comment' as const
  })) || [];

  const auditItems = incident.history?.map(h => ({
    id: h.id,
    user: h.changer?.full_name || 'System',
    action: `${h.field_name} changed`,
    oldValue: h.old_value,
    newValue: h.new_value,
    time: h.changed_at
  })) || [];

  return (
    <div className="h-full flex flex-col bg-[#f5f7fa]">
      {/* Page Header */}
      <div className="bg-card border-b border-border px-6 py-4 flex-shrink-0">
        {/* Breadcrumbs */}
        <Breadcrumb className="mb-3">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/release" className="text-muted-foreground hover:text-foreground text-sm">Release</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/release/incidents" className="text-muted-foreground hover:text-foreground text-sm">Incidents</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-sm">{incident.incident_key}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Title Row */}
        <div className="flex items-start justify-between gap-4">
          <CatalystPageHeader title={`${incident.incident_key} — ${incident.title}`} />
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Eye className="h-4 w-4 mr-1.5" />
              Watch
            </Button>
            {isL3 && !isConverted && (
              <Button variant="outline" size="sm" onClick={() => setShowConvertDialog(true)}>
                <FileText className="h-4 w-4 mr-1.5" />
                Convert
              </Button>
            )}
          </div>
        </div>

        {/* Badge Chips Row */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {incident.is_major_incident && (
            <Lozenge appearance="removed">Major Incident</Lozenge>
          )}
          <Lozenge appearance={
            incident.severity === 'SEV1' ? 'removed' :
            incident.severity === 'SEV2' ? 'moved' :
            'default'
          }>
            {incident.severity}
          </Lozenge>
          {incident.delivery_stage && (
            <Lozenge appearance="default">
              {incident.delivery_stage === 'prod' ? 'Prod' : incident.delivery_stage}
            </Lozenge>
          )}
          {incident.support_level && (
            <Lozenge appearance="default">
              {incident.support_level}
            </Lozenge>
          )}
          <Lozenge appearance={
            incident.status === 'resolved' || incident.status === 'closed' ? 'success' :
            incident.status === 'triage' ? 'moved' :
            incident.status === 'in_progress' ? 'inprogress' :
            incident.status === 'open' ? 'inprogress' :
            'moved'
          }>
            {STATUS_OPTIONS.find(s => s.value === incident.status)?.label || incident.status}
          </Lozenge>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[1fr_340px]">
        {/* Left Column */}
        <main className="overflow-y-auto p-5 space-y-4">
          {/* Description Card */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-medium text-foreground">Description</span>
              {!isEditingDescription && !isConverted && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs text-muted-foreground"
                  onClick={() => {
                    setEditedDescription(incident.description || '');
                    setIsEditingDescription(true);
                  }}
                >
                  <Edit2 className="h-3.5 w-3.5 mr-1" />
                  Edit
                </Button>
              )}
            </div>
            <div className="p-4">
              {isEditingDescription ? (
                <div className="space-y-3">
                  <Textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    className="min-h-[120px] text-sm"
                    placeholder="Describe the incident in detail..."
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveDescription}>Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setIsEditingDescription(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-foreground leading-relaxed">
                  {incident.description ? (
                    <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(incident.description) }} />
                  ) : (
                    <p className="text-muted-foreground">No description provided.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Attachments Card */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-medium text-foreground">
                Attachments ({incident.attachments?.length || 0})
              </span>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">
                <Upload className="h-3.5 w-3.5 mr-1" />
                Upload
              </Button>
            </div>
            {incident.attachments && incident.attachments.length > 0 ? (
              <ul className="divide-y divide-border">
                {incident.attachments.map((att) => (
                  <li key={att.id} className="px-4 py-3 flex items-center gap-3 hover:bg-muted/30">
                    <div className="w-9 h-9 rounded bg-muted flex items-center justify-center">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <a href="#" className="text-sm font-medium text-brand-primary hover:underline truncate block">
                        {att.file_name}
                      </a>
                      <p className="text-xs text-muted-foreground">
                        {(att.file_size / 1024).toFixed(0)} KB · {att.uploader?.full_name || 'Unknown'} · {format(new Date(att.created_at), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No attachments
              </div>
            )}
          </div>

          {/* Linked Work Items Card */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-medium text-foreground">Linked Work Items</span>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">
                <Link2 className="h-3.5 w-3.5 mr-1" />
                Link Item
              </Button>
            </div>
            <div className="p-6 text-center text-sm text-muted-foreground">
              No linked work items
            </div>
          </div>

          {/* Tabs Section */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="border-b border-border">
                <TabsList className="h-auto p-0 bg-transparent rounded-none border-0">
                  <TabsTrigger
                    value="activity"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand-primary data-[state=active]:bg-transparent px-4 py-3 text-sm"
                  >
                    Activity <span className="ml-1.5"><Lozenge appearance="default">{activityItems.length}</Lozenge></span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="sla-history"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand-primary data-[state=active]:bg-transparent px-4 py-3 text-sm"
                  >
                    SLA History <span className="ml-1.5"><Lozenge appearance="default">3</Lozenge></span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="approvals"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand-primary data-[state=active]:bg-transparent px-4 py-3 text-sm"
                  >
                    Approvals <span className="ml-1.5"><Lozenge appearance="default">{approvers.length}</Lozenge></span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="audit-log"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand-primary data-[state=active]:bg-transparent px-4 py-3 text-sm"
                  >
                    Audit Log <span className="ml-1.5"><Lozenge appearance="default">{auditItems.length}</Lozenge></span>
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="activity" className="p-4 m-0">
                <Timeline items={activityItems.map(a => ({
                  id: a.id,
                  user: a.user,
                  text: a.action,
                  time: a.time,
                  type: 'default'
                }))} />
              </TabsContent>
              
              <TabsContent value="sla-history" className="p-4 m-0">
                <Timeline items={[
                  { id: '1', user: 'System', text: 'SLA clock started', time: incident.created_at, type: 'default' },
                  { id: '2', user: 'System', text: 'Response SLA met (4m / 15m target)', time: incident.created_at, type: 'success' },
                  { id: '3', user: 'System', text: 'Resolution SLA breached (60m target exceeded)', time: incident.created_at, type: 'danger' },
                ]} />
              </TabsContent>
              
              <TabsContent value="approvals" className="p-4 m-0">
                {approvers.length > 0 ? (
                  <Timeline items={approvers.map(a => ({
                    id: a.id,
                    user: a.user?.full_name || 'Unknown',
                    text: a.vote?.vote === 'approved' ? 'Approved' + (a.vote.comment ? `: ${a.vote.comment}` : '') 
                        : a.vote?.vote === 'rejected' ? 'Rejected' + (a.vote.comment ? `: ${a.vote.comment}` : '')
                        : 'Awaiting decision',
                    time: a.vote?.voted_at || '',
                    type: a.vote?.vote === 'approved' ? 'success' : a.vote?.vote === 'rejected' ? 'danger' : 'warning',
                    hasVeto: a.has_veto
                  }))} />
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No approvers added yet</p>
                )}
              </TabsContent>
              
              <TabsContent value="audit-log" className="p-4 m-0">
                <Timeline items={auditItems.map(a => ({
                  id: a.id,
                  user: a.user,
                  text: `${a.action}${a.oldValue ? ` from "${a.oldValue}"` : ''}${a.newValue ? ` to "${a.newValue}"` : ''}`,
                  time: a.time,
                  type: 'default'
                }))} />
              </TabsContent>
            </Tabs>
          </div>
        </main>

        {/* Right Sidebar */}
        <aside className="overflow-y-auto p-5 space-y-4 bg-[var(--ds-surface-sunken,var(--ds-surface-sunken, #fafbfc))] border-l border-border">
          {/* Status Card */}
          <div className="bg-card border border-border rounded-lg p-4">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Status</label>
            <Select value={incident.status} onValueChange={(v) => handleFieldUpdate('status', v)} disabled={isConverted}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* SLA Cards */}
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            {/* Response SLA */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase">Response SLA</span>
              {responseSla?.met ? (
                <Lozenge appearance="success">Met</Lozenge>
              ) : responseSla?.breached ? (
                <Lozenge appearance="removed">Breached</Lozenge>
              ) : (
                <Lozenge appearance="default">Pending</Lozenge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{responseSla?.detail || 'N/A'}</p>
            
            <div className="h-px bg-border my-2" />

            {/* Resolution SLA */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase">Resolution SLA</span>
              {resolutionSla?.met ? (
                <Lozenge appearance="success">Met</Lozenge>
              ) : resolutionSla?.breached ? (
                <Lozenge appearance="removed">Breached</Lozenge>
              ) : (
                <Lozenge appearance="default">Pending</Lozenge>
              )}
            </div>
            <p className={cn("text-xs", resolutionSla?.breached ? "text-red-600" : "text-muted-foreground")}>
              Target: {resolutionSla?.target}m · Elapsed: {resolutionSla?.elapsed}m
            </p>
          </div>

          {/* Severity & Priority */}
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Severity</label>
                <Select value={incident.severity} onValueChange={(v) => handleFieldUpdate('severity', v)} disabled={isConverted}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITIES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Priority</label>
                <div className="h-10 flex items-center">
                  <Lozenge appearance="default">
                    {incident.priority || 'P3'}
                  </Lozenge>
                </div>
              </div>
            </div>
          </div>

          {/* Assignee */}
          <div className="bg-card border border-border rounded-lg p-4">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Assignee</label>
            <div className="flex items-center gap-2">
              <Avatar name={incident.assignee?.full_name || 'Unassigned'} size="small" />
              <span className="text-sm font-medium text-foreground">
                {incident.assignee?.full_name || 'Unassigned'}
              </span>
            </div>
          </div>

          {/* Business Process */}
          <div className="bg-card border border-border rounded-lg p-4">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Business Process</label>
            <p className="text-sm text-foreground">Issuance of Industrial License</p>
          </div>

          {/* CAP Committee Widget */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-semibold text-foreground">CAP Committee</span>
              <Lozenge appearance={
                isCommitteeApproved ? 'success' :
                hasVeto ? 'removed' :
                'moved'
              }>
                {isCommitteeApproved ? 'Approved' : hasVeto ? 'Vetoed' : 'Pending'}
              </Lozenge>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Progress */}
              <div>
                <Progress 
                  value={totalApprovers > 0 ? (approvedCount / Math.max(totalApprovers, 2)) * 100 : 0} 
                  className={cn("h-1.5", hasVeto ? "[&>div]:bg-red-500" : "[&>div]:bg-green-500")}
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  {approvedCount} of {totalApprovers || 0} approvals · Majority required (2+)
                </p>
              </div>

              {/* Approvers List */}
              {approvers.length > 0 && (
                <ul className="space-y-2">
                  {approvers.map((member) => (
                    <li key={member.id} className="flex items-center gap-3">
                      <Avatar name={member.user?.full_name || 'Unknown'} size="small" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-foreground truncate">{member.user?.full_name}</span>
                          {member.has_veto && (
                            <Lozenge appearance="moved">VETO</Lozenge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">{member.role || 'Committee Member'}</span>
                      </div>
                      <VoteStatusIcon vote={member.vote?.vote || 'pending'} />
                    </li>
                  ))}
                </ul>
              )}

              {/* Add Approver */}
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-center text-muted-foreground"
                onClick={() => setShowAddApprover(true)}
              >
                <UserPlus className="h-4 w-4 mr-1.5" />
                Add Approver
              </Button>

              {/* Decision Note */}
              <Textarea
                value={decisionNote}
                onChange={(e) => setDecisionNote(e.target.value)}
                placeholder="Decision note (optional)"
                className="min-h-[60px] text-sm resize-none"
              />

              {/* Approve/Reject Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  Approve
                </Button>
                <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50">
                  Reject
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                A veto rejection blocks approval regardless of majority vote.
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* Dialogs */}
      <ConversionDialog
        open={showConvertDialog}
        onOpenChange={setShowConvertDialog}
        incident={incident}
        onConvert={handleConvert}
      />

      <AddApproverDialog
        open={showAddApprover}
        onOpenChange={setShowAddApprover}
        availableApprovers={availableApprovers}
        existingApproverIds={approvers.map(a => a.user_id)}
        onAdd={(userId, hasVeto, note) => {
          toast.success('Approver added');
          setShowAddApprover(false);
        }}
      />
    </div>
  );
}

// Timeline Component
function Timeline({ items }: { items: Array<{ id: string; user: string; text: string; time: string; type: 'default' | 'success' | 'danger' | 'warning'; hasVeto?: boolean }> }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">No items</p>;
  }

  return (
    <ul className="space-y-4">
      {items.map((item, idx) => (
        <li key={item.id || idx} className="flex gap-3">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
            item.type === 'success' ? 'bg-green-100' :
            item.type === 'danger' ? 'bg-red-100' :
            item.type === 'warning' ? 'bg-yellow-100' :
            'bg-muted'
          )}>
            <div className={cn(
              "w-2.5 h-2.5 rounded-full",
              item.type === 'success' ? 'bg-green-500' :
              item.type === 'danger' ? 'bg-red-500' :
              item.type === 'warning' ? 'bg-yellow-500' :
              'bg-muted-foreground'
            )} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-foreground">{item.user}</span>
              {item.hasVeto && (
                <Lozenge appearance="moved">VETO</Lozenge>
              )}
              <span className="text-xs text-muted-foreground">
                {item.time ? format(new Date(item.time), 'MMM d, h:mm a') : 'Pending'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{item.text}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

// Vote Status Icon
function VoteStatusIcon({ vote }: { vote: VoteStatus }) {
  switch (vote) {
    case 'approved':
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    case 'rejected':
      return <XCircle className="h-5 w-5 text-red-600" />;
    case 'vetoed':
      return <AlertTriangle className="h-5 w-5 text-orange-600" />;
    default:
      return <Clock className="h-5 w-5 text-muted-foreground" />;
  }
}
