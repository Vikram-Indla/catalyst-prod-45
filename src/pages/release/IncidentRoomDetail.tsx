import { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Plus, AlertTriangle, CheckCircle2, X, UserPlus, Play } from 'lucide-react';
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
import { IncidentTriageRail } from '@/components/incidents/detail/IncidentTriageRail';

import { supabase } from '@/integrations/supabase/client';
import type { IncidentStatus, CommentType } from '@/types/incident';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { canConvertIncident } from '@/utils/incidentLifecycle';
import { STATUS_CONFIG, SEVERITY_CONFIG } from '@/components/incidents/badges/IncidentBadges';

export default function IncidentRoomDetail() {
  // Route param is :incidentId (must match App.tsx route definition)
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

  const queryClient = useQueryClient();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [convertType, setConvertType] = useState<'epic' | 'feature' | 'story'>('story');
  const [convertReason, setConvertReason] = useState('');
  const [showCreatedBanner, setShowCreatedBanner] = useState(false);

  // Handle ?created=true query param for post-create banner
  useEffect(() => {
    if (searchParams.get('created') === 'true') {
      setShowCreatedBanner(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

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
    if (!incidentId) return;
    updateIncident.mutate({ id: incidentId, data: { status } }, {
      onSuccess: () => toast.success('Status updated'),
      onError: () => toast.error('Failed to update status'),
    });
  };

  const handleFieldChange = (field: string, value: string) => {
    if (!incidentId) return;
    updateIncident.mutate({ id: incidentId, data: { [field]: value } }, {
      onSuccess: () => toast.success('Updated'),
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
      queryClient.invalidateQueries({ queryKey: ['incident', incidentId] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit vote');
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

  // Error - clean, production-ready error state
  if (error || !incident) {
    // Try to determine incident key from URL or error context
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
            The incident could not be found or there was an error loading it. It may have been deleted or you may not have access.
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

  const severityConfig = SEVERITY_CONFIG[incident.severity];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* ========== HEADER - Enterprise JSM-style ========== */}
      <header className="flex-shrink-0 border-b border-border px-4 py-3">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
          <Link to="/release" className="hover:text-foreground transition-colors">Release</Link>
          <span className="text-muted-foreground/60">/</span>
          <Link to="/release/incidents" className="hover:text-foreground transition-colors">Incidents</Link>
          <span className="text-muted-foreground/60">/</span>
          <span className="text-foreground font-medium">{incident.incident_key}</span>
        </nav>

        {/* Title + Pills + Actions */}
        <div className="flex items-center justify-between gap-4">
          {/* Left: Key + Summary */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <h1 className="text-base font-semibold text-foreground truncate">
              <span className="text-primary">{incident.incident_key}</span>
              <span className="mx-2 text-muted-foreground/60">—</span>
              {incident.title}
            </h1>
          </div>

          {/* Center: Status Badges */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {incident.is_major_incident && (
              <Badge variant="outline" className="text-xs px-2 py-0.5 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800 font-medium">
                Major Incident
              </Badge>
            )}
            <Badge variant="outline" className={cn('text-xs px-2 py-0.5 border font-medium', severityConfig.className)}>
              {severityConfig.label}
            </Badge>
            {incident.support_level && (
              <span className="text-xs font-medium text-muted-foreground px-1.5">
                {incident.support_level}
              </span>
            )}
            {incident.committee && (
              <Badge 
                variant="outline" 
                className={cn(
                  'text-xs px-2 py-0.5 font-medium',
                  incident.committee.status === 'approved' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' :
                  incident.committee.status === 'rejected' ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800' :
                  'bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800'
                )}
              >
                {incident.committee.status === 'pending' ? 'In Review' : 
                 incident.committee.status.charAt(0).toUpperCase() + incident.committee.status.slice(1)}
              </Badge>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => toggleWatch.mutate(isWatching)}
              disabled={toggleWatch.isPending}
              className="h-8 px-3 text-sm"
            >
              {isWatching ? <EyeOff className="h-4 w-4 mr-1.5" /> : <Eye className="h-4 w-4 mr-1.5" />}
              {isWatching ? 'Unwatch' : 'Watch'}
              {watcherCount > 0 && <span className="ml-1 text-muted-foreground">({watcherCount})</span>}
            </Button>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Button 
                      size="sm"
                      onClick={() => setConvertDialogOpen(true)}
                      disabled={!canConvert || isSubmitting}
                      className="h-8 px-3 text-sm"
                    >
                      <Plus className="h-4 w-4 mr-1.5" />
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

      {/* ========== POST-CREATE SUCCESS BANNER ========== */}
      {showCreatedBanner && incident && (
        <div className="mx-4 mt-2 p-2.5 rounded-md border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300">
                {incident.incident_key} created
              </p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-5 px-1.5 text-[9px] bg-white dark:bg-background"
                  onClick={() => handleStatusChange('triage')}
                >
                  <Play className="h-2.5 w-2.5 mr-0.5" />
                  Triage
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-5 px-1.5 text-[9px] bg-white dark:bg-background"
                  onClick={() => {/* TODO: Open assign dialog */}}
                >
                  <UserPlus className="h-2.5 w-2.5 mr-0.5" />
                  Assign
                </Button>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={() => setShowCreatedBanner(false)}
          >
            <X className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
          </Button>
        </div>
      )}

      {/* ========== CONVERT DIALOG - Executive-grade ========== */}
      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent className="max-w-md p-0">
          <DialogHeader className="px-4 pt-4 pb-3 border-b border-border">
            <DialogTitle className="text-sm font-semibold">Convert Incident to Work Item</DialogTitle>
          </DialogHeader>
          
          <div className="p-4 space-y-4">
            {/* L3 Committee Gating Notice */}
            {incident.support_level === 'L3' && (
              <div className="flex gap-2 p-2.5 rounded bg-amber-50 border border-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-amber-800">Committee Approval Required</p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    L3 incidents require CAP committee approval before conversion.
                  </p>
                </div>
              </div>
            )}
            
            {/* 1. Work Item Type */}
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
            
            {/* 2. Justification */}
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
            
            {/* 3. Preview Summary */}
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
                  <span className="font-mono text-brand-primary">{incident.incident_key}</span>
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

      {/* ========== MAIN CONTENT - 70/30 Two-Column Layout ========== */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT COLUMN - 70% */}
        <IncidentMainContent
          incidentId={incidentId || ''}
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
          onResolutionChange={(field, value) => handleFieldChange(field, value)}
          isUploadPending={uploadAttachment.isPending}
          isCommentPending={addComment.isPending}
          isVotePending={isSubmitting}
        />

        {/* RIGHT COLUMN - Triage Rail */}
        <IncidentTriageRail
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
          businessProcess={incident.business_process}
          serviceComponent={incident.service_component}
          sla={incident.sla}
          createdAt={incident.created_at}
          updatedAt={incident.updated_at}
          isConverted={isConverted}
          onStatusChange={handleStatusChange}
          onSeverityChange={(v) => handleFieldChange('severity', v)}
          onImpactChange={(v) => handleFieldChange('impact', v)}
          onUrgencyChange={(v) => handleFieldChange('urgency', v)}
          onDeliveryStageChange={(v) => handleFieldChange('delivery_stage', v)}
          onAssignToMe={handleAssignToMe}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
}