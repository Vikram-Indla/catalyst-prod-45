import { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useIncident, useUpdateIncident, useAddComment, useReleaseVersions } from '@/hooks/useIncidents';
import { useUploadIncidentAttachment, useDeleteIncidentAttachment, useDownloadIncidentAttachment } from '@/hooks/useIncidentAttachments';
import { useIsWatching, useWatcherCount, useToggleWatch } from '@/hooks/useIncidentWatchers';
import { useAvailableApprovers } from '@/hooks/useIncidentUserProfiles';
import { useIncidentCommittee } from '@/hooks/useIncidentCommittee';
import { useProjects } from '@/hooks/useProjects';
import { useIncidentWorkItems, useUnlinkWorkItem } from '@/hooks/useIncidentWorkItems';
import { useIncidentTeams } from '@/hooks/useIncidentTeams';
import { IncidentStickyHeader } from '@/components/incidents/detail/IncidentStickyHeader';
import { IncidentWorkArea } from '@/components/incidents/detail/IncidentWorkArea';
import { IncidentContextRail } from '@/components/incidents/detail/IncidentContextRail';
import { LinkWorkItemModal } from '@/components/incidents/detail/LinkWorkItemModal';
import { ResolutionModal } from '@/components/incidents/detail/ResolutionModal';

import { supabase } from '@/integrations/supabase/client';
import type { IncidentStatus, CommentType } from '@/types/incident';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { canConvertIncident } from '@/utils/incidentLifecycle';

export default function IncidentRoomDetail() {
  const { incidentId } = useParams<{ incidentId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: incident, isLoading, error } = useIncident(incidentId || '');
  const updateIncident = useUpdateIncident();
  const addComment = useAddComment();
  const uploadAttachment = useUploadIncidentAttachment();
  const deleteAttachment = useDeleteIncidentAttachment();
  const downloadAttachment = useDownloadIncidentAttachment();
  
  const { data: isWatching = false } = useIsWatching(incidentId || '');
  const { data: watcherCount = 0 } = useWatcherCount(incidentId || '');
  const toggleWatch = useToggleWatch(incidentId || '');
  const { data: availableApprovers = [] } = useAvailableApprovers();
  const { data: committeeRecord = null } = useIncidentCommittee(incidentId || '');
  const { data: projects = [] } = useProjects();
  const { data: linkedWorkItems = [] } = useIncidentWorkItems(incidentId || '');
  const unlinkWorkItem = useUnlinkWorkItem();
  const { data: incidentTeams = [] } = useIncidentTeams();
  const { data: releaseVersions = [] } = useReleaseVersions();

  const queryClient = useQueryClient();
  const [railCollapsed, setRailCollapsed] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [committeeDialogOpen, setCommitteeDialogOpen] = useState(false);
  const [linkWorkItemOpen, setLinkWorkItemOpen] = useState(false);
  const [resolutionModalOpen, setResolutionModalOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<'resolved' | 'closed' | null>(null);
  const [convertType, setConvertType] = useState<'epic' | 'feature' | 'story'>('story');
  const [convertReason, setConvertReason] = useState('');

  const isConverted = incident?.status === 'converted';
  
  const conversionCheck = incident ? canConvertIncident(
    incident.status,
    incident.support_level,
    incident.committee?.status
  ) : { allowed: false, reason: 'Loading...' };
  const canConvert = conversionCheck.allowed;

  // Get project info
  const currentProject = projects.find(p => p.id === incident?.project_id);
  const projectName = currentProject?.name || null;

  // Get committee approver count
  const committeeApproverCount = incident?.committee?.members?.length || committeeRecord?.members?.length || 0;

  // Handlers
  const handleStatusChange = (status: IncidentStatus) => {
    if (!incidentId) return;
    
    // Validation: Cannot close if no project assigned
    if ((status === 'closed' || status === 'resolved') && !incident?.project_id) {
      toast.error('Cannot close incident: Please assign a project first');
      return;
    }
    
    // If resolving or closing, require resolution modal
    if (status === 'resolved' || status === 'closed') {
      setPendingStatus(status);
      setResolutionModalOpen(true);
      return;
    }
    
    updateIncident.mutate({ id: incidentId, data: { status } }, {
      onSuccess: () => toast.success('Status updated'),
      onError: () => toast.error('Failed to update status'),
    });
  };

  const handleResolutionSubmit = async (resolution: {
    resolution_summary: string;
    resolution_type: string;
    root_cause?: string;
  }) => {
    if (!incidentId || !pendingStatus) return;
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await updateIncident.mutateAsync({ 
        id: incidentId, 
        data: { 
          status: pendingStatus,
          resolution_summary: resolution.resolution_summary,
          resolution_type: resolution.resolution_type,
          root_cause: resolution.root_cause || null,
          ...(pendingStatus === 'resolved' && { resolved_at: new Date().toISOString() }),
          ...(pendingStatus === 'closed' && { closed_at: new Date().toISOString() }),
        } 
      });
      
      // Log to audit
      await supabase.from('incident_history').insert({
        incident_id: incidentId,
        field_name: 'resolution',
        old_value: null,
        new_value: `Incident ${pendingStatus} with resolution: ${resolution.resolution_type}`,
        changed_by: user?.id,
      });
      
      toast.success(`Incident ${pendingStatus}`);
      setResolutionModalOpen(false);
      setPendingStatus(null);
      queryClient.invalidateQueries({ queryKey: ['incident', incidentId] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to update');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlinkWorkItem = async (linkId: string, key: string, type: string) => {
    if (!incidentId) return;
    try {
      await unlinkWorkItem.mutateAsync({ incidentId, linkId, workItemKey: key, workItemType: type });
      toast.success('Work item unlinked');
    } catch (error: any) {
      toast.error('Failed to unlink');
    }
  };

  const handleFieldChange = async (field: string, value: string) => {
    if (!incidentId) return;
    
    const oldValue = incident ? (incident as any)[field] : null;
    
    updateIncident.mutate({ id: incidentId, data: { [field]: value } }, {
      onSuccess: async () => {
        toast.success('Updated');
        
        // Add audit log entry for important field changes
        if (['title', 'project_id', 'assignee_id'].includes(field)) {
          const { data: { user } } = await supabase.auth.getUser();
          await supabase.from('incident_history').insert({
            incident_id: incidentId,
            field_name: field,
            old_value: oldValue || null,
            new_value: value,
            changed_by: user?.id,
          });
          queryClient.invalidateQueries({ queryKey: ['incident', incidentId] });
        }
      },
      onError: () => toast.error('Failed to update'),
    });
  };

  const handlePostComment = (content: string, type: CommentType) => {
    if (!incidentId || !content.trim()) return;
    addComment.mutate({ incident_id: incidentId, content, comment_type: type }, {
      onSuccess: () => toast.success('Comment posted'),
      onError: () => toast.error('Failed to post comment'),
    });
  };

  const handleConvert = async () => {
    if (!incidentId || !convertReason.trim()) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('convert-incident', {
        body: { incident_id: incidentId, convert_to: convertType, reason: convertReason },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Incident converted to ${convertType}`);
      setConvertDialogOpen(false);
      setConvertReason('');
      queryClient.invalidateQueries({ queryKey: ['incident', incidentId] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to convert incident');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVote = async (vote: 'approved' | 'rejected', isVeto?: boolean, note?: string) => {
    if (!incident?.committee?.id && !committeeRecord?.id) return;
    const committeeId = (incident?.committee?.id || committeeRecord?.id) as string;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('submit-vote', {
        body: { committee_id: committeeId, vote, is_veto: isVeto, note },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(data.message || 'Vote submitted');
      queryClient.invalidateQueries({ queryKey: ['incident', incidentId] });
      queryClient.invalidateQueries({ queryKey: ['incident-committee', incidentId] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit vote');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCommittee = async () => {
    if (!incidentId) return;

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: newCommittee, error: createError } = await supabase
        .from('incident_committees')
        .insert({
          incident_id: incidentId,
          status: 'pending',
          required_approvals: 2,
          created_by: user?.id,
        })
        .select()
        .single();

      if (createError) throw createError;

      const { error: linkError } = await supabase
        .from('incidents')
        .update({ committee_id: newCommittee.id })
        .eq('id', incidentId);

      if (linkError) throw linkError;

      await supabase.from('incident_history').insert({
        incident_id: incidentId,
        field_name: 'committee',
        old_value: null,
        new_value: 'Committee created',
        changed_by: user?.id,
      });

      toast.success('Committee created');
      queryClient.invalidateQueries({ queryKey: ['incident', incidentId] });
      queryClient.invalidateQueries({ queryKey: ['incident-committee', incidentId] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to create committee');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddApprover = async (userId: string, hasVeto: boolean, note: string) => {
    if (!incidentId) return;
    setIsSubmitting(true);

    try {
      let committeeId = incident?.committee?.id || committeeRecord?.id;

      if (!committeeId) {
        await handleCreateCommittee();
        const { data: created } = await supabase
          .from('incident_committees')
          .select('id')
          .eq('incident_id', incidentId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        committeeId = created?.id;
      }

      if (!committeeId) throw new Error('Committee not available');

      const { data: { user } } = await supabase.auth.getUser();

      const { error: memberError } = await supabase
        .from('committee_members')
        .insert({
          committee_id: committeeId,
          user_id: userId,
          has_veto: hasVeto,
          role: note || null,
        });

      if (memberError) throw memberError;

      const { data: newMember } = await supabase
        .from('committee_members')
        .select('id')
        .eq('committee_id', committeeId)
        .eq('user_id', userId)
        .single();

      if (newMember) {
        await supabase.from('committee_votes').insert({
          committee_id: committeeId,
          member_id: newMember.id,
          vote: 'pending',
        });
      }

      await supabase.from('incident_history').insert({
        incident_id: incidentId,
        field_name: 'committee_member',
        old_value: null,
        new_value: `Approver added${hasVeto ? ' (veto power)' : ''}`,
        changed_by: user?.id,
      });

      toast.success('Approver added');
      queryClient.invalidateQueries({ queryKey: ['incident', incidentId] });
      queryClient.invalidateQueries({ queryKey: ['incident-committee', incidentId] });
    } catch (error: any) {
      console.error('Failed to add approver:', error);
      toast.error(error.message || 'Failed to add approver');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInitiateCommittee = async () => {
    if (!incidentId) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-to-committee', {
        body: { incident_id: incidentId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success('Committee review initiated');
      queryClient.invalidateQueries({ queryKey: ['incident', incidentId] });
      queryClient.invalidateQueries({ queryKey: ['incident-committee', incidentId] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to initiate committee');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignToMe = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && incidentId) {
      handleFieldChange('assignee_id', user.id);
    }
  };

  // Loading
  if (isLoading) {
    return (
      <div className="flex flex-col h-full p-4 gap-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-96" />
        <div className="flex gap-4 flex-1">
          <Skeleton className="w-[70%] h-96" />
          <Skeleton className="w-[30%] h-96" />
        </div>
      </div>
    );
  }

  // Error
  if (error || !incident) {
    const displayId = incidentId?.startsWith('INC-') ? incidentId : incidentId ? `ID ${incidentId.slice(0, 8)}...` : null;

    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <h2 className="text-base font-semibold text-foreground">
            Unable to Load Incident{displayId ? ` ${displayId}` : ''}
          </h2>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            The incident could not be found or there was an error loading it.
          </p>
        </div>
        
        <div className="flex items-center gap-2 mt-2">
          <Link to="/release/incidents">
            <Button variant="default" size="sm" className="h-8 text-sm">
              Back to Incident List
            </Button>
          </Link>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 text-sm"
            onClick={() => window.location.reload()}
          >
            Try Reload
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* ========== STICKY HEADER ========== */}
      <IncidentStickyHeader
        incidentKey={incident.incident_key}
        title={incident.title}
        status={incident.status}
        severity={incident.severity}
        priority={incident.priority}
        supportLevel={incident.support_level}
        assignee={incident.assignee}
        projectId={incident.project_id}
        projectName={projectName}
        createdAt={incident.created_at}
        updatedAt={incident.updated_at}
        lastUpdatedBy={null}
        committeeApproverCount={committeeApproverCount}
        isConverted={isConverted}
        isWatching={isWatching}
        watcherCount={watcherCount}
        canConvert={canConvert}
        conversionReason={conversionCheck.reason}
        availableProjects={projects}
        availableUsers={availableApprovers}
        onTitleChange={(title) => handleFieldChange('title', title)}
        onStatusChange={handleStatusChange}
        onSeverityChange={(v) => handleFieldChange('severity', v)}
        onAssigneeChange={(userId) => handleFieldChange('assignee_id', userId)}
        onProjectChange={(projectId) => handleFieldChange('project_id', projectId)}
        onToggleWatch={() => toggleWatch.mutate(isWatching)}
        onOpenCommittee={() => setCommitteeDialogOpen(true)}
        onOpenConvertDialog={() => setConvertDialogOpen(true)}
        isSubmitting={isSubmitting}
        isWatchPending={toggleWatch.isPending}
      />

      {/* ========== MAIN CONTENT - Two Column Layout ========== */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT COLUMN - Work Area */}
        <IncidentWorkArea
          incidentId={incidentId || ''}
          description={incident.description}
          attachments={incident.attachments || []}
          comments={incident.comments || []}
          history={incident.history || []}
          sla={incident.sla}
          committee={committeeRecord || incident.committee}
          convertedToId={incident.converted_to_id}
          convertedToType={incident.converted_to_type}
          isConverted={isConverted}
          status={incident.status}
          resolutionSummary={incident.resolution_summary || null}
          resolutionType={incident.resolution_type || null}
          rootCause={incident.root_cause || null}
          resolvedAt={incident.resolved_at || null}
          closedAt={incident.closed_at || null}
          onDescriptionChange={(desc) => handleFieldChange('description', desc)}
          onPostComment={handlePostComment}
          onUploadFile={(file) => uploadAttachment.mutate({ incidentId: incidentId!, file })}
          onDownloadFile={(path, name) => downloadAttachment.mutate({ storagePath: path, fileName: name })}
          onDeleteFile={(attId, path) => deleteAttachment.mutate({ attachmentId: attId, incidentId: incidentId!, storagePath: path })}
          onVote={handleVote}
          onAddApprover={handleAddApprover}
          onInitiateCommittee={handleInitiateCommittee}
          onCreateCommittee={handleCreateCommittee}
          onResolutionChange={(field, value) => handleFieldChange(field, value)}
          onOpenLinkWorkItem={() => setLinkWorkItemOpen(true)}
          availableApprovers={availableApprovers}
          isUploadPending={uploadAttachment.isPending}
          isCommentPending={addComment.isPending}
          isVotePending={isSubmitting}
        />

        {/* RIGHT COLUMN - Context Rail */}
        <IncidentContextRail
          incidentId={incidentId || ''}
          status={incident.status}
          severity={incident.severity}
          priority={incident.priority}
          impact={incident.impact}
          urgency={incident.urgency}
          supportLevel={incident.support_level}
          assignee={incident.assignee}
          assigneeWorkgroup={incident.assignee_workgroup}
          reporter={incident.reporter}
          reporterName={incident.reporter_name}
          deliveryStage={incident.delivery_stage}
          releaseVersion={incident.release_version}
          releaseVersionId={incident.release_version_id || null}
          businessProcess={incident.business_process}
          serviceComponent={incident.service_component}
          projectId={incident.project_id}
          teamId={(incident as any).team_id || null}
          sla={incident.sla}
          createdAt={incident.created_at}
          updatedAt={incident.updated_at}
          isConverted={isConverted}
          isCollapsed={railCollapsed}
          availableProjects={projects}
          availableTeams={incidentTeams}
          availableUsers={availableApprovers}
          availableReleaseVersions={releaseVersions as any}
          onStatusChange={handleStatusChange}
          onSeverityChange={(v) => handleFieldChange('severity', v)}
          onImpactChange={(v) => handleFieldChange('impact', v)}
          onUrgencyChange={(v) => handleFieldChange('urgency', v)}
          onDeliveryStageChange={(v) => handleFieldChange('delivery_stage', v)}
          onProjectChange={(projectId) => handleFieldChange('project_id', projectId)}
          onTeamChange={(teamId) => handleFieldChange('team_id', teamId)}
          onAssigneeChange={(userId) => handleFieldChange('assignee_id', userId)}
          onReleaseVersionChange={(versionId) => handleFieldChange('release_version_id', versionId)}
          onAssignToMe={handleAssignToMe}
          onToggleCollapse={() => setRailCollapsed(!railCollapsed)}
          isSubmitting={isSubmitting}
        />
      </div>

      {/* ========== CONVERT DIALOG ========== */}
      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent className="max-w-md p-0">
          <DialogHeader className="px-4 pt-4 pb-3 border-b border-border">
            <DialogTitle className="text-sm font-semibold">Convert Incident to Work Item</DialogTitle>
          </DialogHeader>
          
          <div className="p-4 space-y-4">
            {incident.support_level === 'L3' && (
              <div className="flex gap-2 p-2.5 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-300">Committee Approval Required</p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                    L3 incidents require CAP committee approval before conversion.
                  </p>
                </div>
              </div>
            )}
            
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Work Item Type</Label>
              <Select value={convertType} onValueChange={(v: any) => setConvertType(v)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="story" className="text-sm">Story</SelectItem>
                  <SelectItem value="feature" className="text-sm">Feature</SelectItem>
                  <SelectItem value="epic" className="text-sm">Epic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Justification <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                value={convertReason}
                onChange={(e) => setConvertReason(e.target.value)}
                placeholder="Provide business justification for converting this incident..."
                className={cn('text-sm min-h-[80px] resize-none', !convertReason.trim() && 'border-rose-200 focus-visible:ring-rose-200')}
              />
            </div>
            
            <div className="rounded border border-border bg-muted/30">
              <div className="px-3 py-1.5 border-b border-border bg-muted/50">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Preview</p>
              </div>
              <div className="p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium">{convertType.charAt(0).toUpperCase() + convertType.slice(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Title</span>
                  <span className="font-medium truncate max-w-[200px]">{incident.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Source</span>
                  <span className="font-mono text-primary">{incident.incident_key}</span>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter className="px-4 py-3 border-t border-border bg-muted/30">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setConvertDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              size="sm"
              className="h-8 text-xs"
              onClick={handleConvert} 
              disabled={isSubmitting || !convertReason.trim()}
            >
              {isSubmitting ? 'Converting...' : 'Convert Incident'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Work Item Modal */}
      <LinkWorkItemModal
        open={linkWorkItemOpen}
        onOpenChange={setLinkWorkItemOpen}
        incidentId={incidentId || ''}
        incidentKey={incident.incident_key}
      />

      {/* Resolution Modal */}
      <ResolutionModal
        open={resolutionModalOpen}
        onOpenChange={(open) => {
          setResolutionModalOpen(open);
          if (!open) setPendingStatus(null);
        }}
        incidentKey={incident.incident_key}
        targetStatus={pendingStatus || 'resolved'}
        onSubmit={handleResolutionSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
