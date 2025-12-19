import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Eye, EyeOff, Plus, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useIncident, useUpdateIncident, useAddComment } from '@/hooks/useIncidents';
import { useUploadIncidentAttachment, useDeleteIncidentAttachment, useDownloadIncidentAttachment } from '@/hooks/useIncidentAttachments';
import { useIsWatching, useWatcherCount, useToggleWatch } from '@/hooks/useIncidentWatchers';
import { IncidentMainContent } from '@/components/incidents/detail/IncidentMainContent';
import { IncidentContextRail } from '@/components/incidents/detail/IncidentContextRail';
import { supabase } from '@/integrations/supabase/client';
import type { IncidentStatus, CommentType } from '@/types/incident';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { canConvertIncident } from '@/utils/incidentLifecycle';

// Status pills configuration
const STATUS_CONFIG: Record<IncidentStatus, { label: string; className: string }> = {
  open: { label: 'New', className: 'bg-blue-100 text-blue-800' },
  triage: { label: 'Triage', className: 'bg-yellow-100 text-yellow-800' },
  to_committee: { label: 'To Committee', className: 'bg-purple-100 text-purple-800' },
  in_progress: { label: 'In Progress', className: 'bg-cyan-100 text-cyan-800' },
  resolved: { label: 'Resolved', className: 'bg-green-100 text-green-800' },
  converted: { label: 'Converted', className: 'bg-secondary-green/20 text-secondary-green' },
  closed: { label: 'Closed', className: 'bg-muted text-muted-foreground' },
};

const SEVERITY_CONFIG = {
  SEV1: { label: 'SEV1', className: 'bg-red-100 text-red-800 border-red-200' },
  SEV2: { label: 'SEV2', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  SEV3: { label: 'SEV3', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  SEV4: { label: 'SEV4', className: 'bg-blue-100 text-blue-800 border-blue-200' },
};

export default function IncidentRoomDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: incident, isLoading, error } = useIncident(id || '');
  const updateIncident = useUpdateIncident();
  const addComment = useAddComment();
  const uploadAttachment = useUploadIncidentAttachment();
  const deleteAttachment = useDeleteIncidentAttachment();
  const downloadAttachment = useDownloadIncidentAttachment();
  
  const { data: isWatching = false } = useIsWatching(id || '');
  const { data: watcherCount = 0 } = useWatcherCount(id || '');
  const toggleWatch = useToggleWatch(id || '');

  const queryClient = useQueryClient();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [convertType, setConvertType] = useState<'epic' | 'feature' | 'story'>('story');
  const [convertReason, setConvertReason] = useState('');

  const isConverted = incident?.status === 'converted';
  
  // Backend-driven conversion gating
  const conversionCheck = incident ? canConvertIncident(
    incident.status,
    incident.support_level,
    incident.committee?.status
  ) : { allowed: false, reason: 'Loading...' };
  const canConvert = conversionCheck.allowed;

  // Backend-driven vote gating
  const canVote = incident?.committee?.status === 'pending' && !isConverted;
  const voteDisabledReason = !canVote ? 'Voting is only available when committee status is pending' : undefined;

  // Handlers - all trigger backend operations
  const handleStatusChange = (status: IncidentStatus) => {
    if (!id) return;
    updateIncident.mutate({ id, data: { status } }, {
      onSuccess: () => toast.success('Status updated'),
      onError: () => toast.error('Failed to update status'),
    });
  };

  const handleFieldChange = (field: string, value: string) => {
    if (!id) return;
    updateIncident.mutate({ id, data: { [field]: value } }, {
      onSuccess: () => toast.success('Updated'),
      onError: () => toast.error('Failed to update'),
    });
  };

  const handlePostComment = (content: string, type: CommentType) => {
    if (!id || !content.trim()) return;
    addComment.mutate({ incident_id: id, content, comment_type: type }, {
      onSuccess: () => toast.success('Comment posted'),
      onError: () => toast.error('Failed to post comment'),
    });
  };

  const handleConvert = async () => {
    if (!id || !convertReason.trim()) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('convert-incident', {
        body: { incident_id: id, convert_to: convertType, reason: convertReason },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Incident converted to ${convertType}`);
      setConvertDialogOpen(false);
      setConvertReason('');
      queryClient.invalidateQueries({ queryKey: ['incident', id] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to convert incident');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVote = async (vote: 'approved' | 'rejected') => {
    if (!incident?.committee?.id) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('submit-vote', {
        body: { committee_id: incident.committee.id, vote },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(data.message || 'Vote submitted');
      queryClient.invalidateQueries({ queryKey: ['incident', id] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit vote');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignToMe = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && id) {
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
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <h2 className="text-base font-medium">Incident not found</h2>
        <Link to="/release/incident-room">
          <Button variant="outline" size="sm">Back to Incidents</Button>
        </Link>
      </div>
    );
  }

  const severityConfig = SEVERITY_CONFIG[incident.severity];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* ========== HEADER - Compact, single-row ========== */}
      <header className="flex-shrink-0 border-b border-border px-4 py-2">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
          <Link to="/release/incident-room" className="hover:text-foreground">RELEASE</Link>
          <span>/</span>
          <Link to="/release/incident-room" className="hover:text-foreground">Incidents</Link>
          <span>/</span>
          <span className="text-foreground font-medium">{incident.incident_key}</span>
        </nav>

        {/* Title + Pills + Actions */}
        <div className="flex items-center justify-between gap-3">
          {/* Left: Key + Summary */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <h1 className="text-sm font-semibold text-foreground whitespace-nowrap">
              <span className="text-brand-primary">{incident.incident_key}</span>
              <span className="mx-1.5 text-muted-foreground">—</span>
              <span className="truncate">{incident.title}</span>
            </h1>
          </div>

          {/* Center: Status Pills (exact order) */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Major Incident */}
            {incident.is_major_incident && (
              <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-5">Major</Badge>
            )}
            {/* Severity */}
            <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0 h-5 border', severityConfig.className)}>
              {severityConfig.label}
            </Badge>
            {/* Support Level */}
            {incident.support_level && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-5 bg-yellow-50 text-yellow-700 border-yellow-200">
                {incident.support_level}
              </Badge>
            )}
            {/* Committee Status */}
            {incident.committee && (
              <Badge 
                variant="outline" 
                className={cn(
                  'text-[9px] px-1.5 py-0 h-5',
                  incident.committee.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' :
                  incident.committee.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                  'bg-purple-50 text-purple-700 border-purple-200'
                )}
              >
                {incident.committee.status === 'pending' ? 'In Review' : 
                 incident.committee.status.charAt(0).toUpperCase() + incident.committee.status.slice(1)}
              </Badge>
            )}
          </div>

          {/* Right: Actions (Watch | Convert only) */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Button 
              variant={isWatching ? 'secondary' : 'ghost'} 
              size="sm"
              onClick={() => toggleWatch.mutate(isWatching)}
              disabled={toggleWatch.isPending}
              className="h-7 px-2 text-[10px]"
            >
              {isWatching ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
              {isWatching ? 'Unwatch' : 'Watch'}
              {watcherCount > 0 && <span className="ml-0.5 text-muted-foreground">({watcherCount})</span>}
            </Button>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Button 
                      size="sm"
                      onClick={() => setConvertDialogOpen(true)}
                      disabled={!canConvert || isSubmitting}
                      className="h-7 px-2 text-[10px] bg-brand-primary hover:bg-brand-primary-hover text-white"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Convert
                    </Button>
                  </div>
                </TooltipTrigger>
                {!canConvert && conversionCheck.reason && (
                  <TooltipContent side="bottom" className="text-xs">
                    {conversionCheck.reason}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </header>

      {/* ========== CONVERT DIALOG ========== */}
      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Convert Incident</DialogTitle>
          </DialogHeader>
          
          {incident.support_level === 'L3' && (
            <div className="flex gap-2 p-2 rounded bg-yellow-50 border border-yellow-200">
              <AlertTriangle className="h-3.5 w-3.5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-medium text-yellow-800">L3 Committee Approval Required</p>
                <p className="text-[9px] text-yellow-700">This incident requires CAP approval.</p>
              </div>
            </div>
          )}
          
          <div className="space-y-2 py-1">
            <div className="space-y-1">
              <Label className="text-[10px]">Convert to</Label>
              <Select value={convertType} onValueChange={(v: any) => setConvertType(v)}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="story" className="text-xs">Story</SelectItem>
                  <SelectItem value="feature" className="text-xs">Feature</SelectItem>
                  <SelectItem value="epic" className="text-xs">Epic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1">
              <Label className="text-[10px]">
                Justification <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={convertReason}
                onChange={(e) => setConvertReason(e.target.value)}
                placeholder="Why is this incident being converted?"
                className={cn('text-xs min-h-[60px]', !convertReason.trim() && 'border-destructive/50')}
              />
            </div>
            
            <div className="pt-1 border-t border-border">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wide mb-1">Preview</p>
              <div className="bg-muted/50 rounded p-1.5 text-[10px] space-y-0.5">
                <p><span className="text-muted-foreground">Type:</span> {convertType.charAt(0).toUpperCase() + convertType.slice(1)}</p>
                <p><span className="text-muted-foreground">Title:</span> {incident.title}</p>
                <p><span className="text-muted-foreground">From:</span> {incident.incident_key}</p>
              </div>
            </div>
          </div>
          
          <DialogFooter className="gap-1">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setConvertDialogOpen(false)}>Cancel</Button>
            <Button 
              size="sm"
              className="h-7 text-xs bg-brand-primary hover:bg-brand-primary-hover text-white"
              onClick={handleConvert} 
              disabled={isSubmitting || !convertReason.trim()}
            >
              {isSubmitting ? 'Converting...' : 'Convert'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========== MAIN CONTENT - 70/30 Two-Column Layout ========== */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT COLUMN - 70% */}
        <IncidentMainContent
          incidentId={id || ''}
          description={incident.description}
          attachments={incident.attachments || []}
          comments={incident.comments || []}
          history={incident.history || []}
          sla={incident.sla}
          committee={incident.committee}
          convertedToId={incident.converted_to_id}
          convertedToType={incident.converted_to_type}
          requiresCommittee={incident.requires_committee || false}
          isConverted={isConverted}
          onDescriptionChange={(desc) => handleFieldChange('description', desc)}
          onPostComment={handlePostComment}
          onUploadFile={(file) => uploadAttachment.mutate({ incidentId: id!, file })}
          onDownloadFile={(path, name) => downloadAttachment.mutate({ storagePath: path, fileName: name })}
          onDeleteFile={(attId, path) => deleteAttachment.mutate({ attachmentId: attId, incidentId: id!, storagePath: path })}
          onVote={handleVote}
          isUploadPending={uploadAttachment.isPending}
          isCommentPending={addComment.isPending}
          isVotePending={isSubmitting}
        />

        {/* RIGHT COLUMN - 30% */}
        <IncidentContextRail
          incidentId={id || ''}
          status={incident.status}
          severity={incident.severity}
          priority={incident.priority}
          impact={incident.impact}
          urgency={incident.urgency}
          supportLevel={incident.support_level}
          assignee={incident.assignee}
          sla={incident.sla}
          createdAt={incident.created_at}
          updatedAt={incident.updated_at}
          committee={incident.committee}
          requiresCommittee={incident.requires_committee || false}
          isConverted={isConverted}
          onStatusChange={handleStatusChange}
          onSeverityChange={(v) => handleFieldChange('severity', v)}
          onImpactChange={(v) => handleFieldChange('impact', v)}
          onUrgencyChange={(v) => handleFieldChange('urgency', v)}
          onAssignToMe={handleAssignToMe}
          onVote={handleVote}
          isSubmitting={isSubmitting}
          canVote={canVote}
          voteDisabledReason={voteDisabledReason}
        />
      </div>
    </div>
  );
}