import { useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Eye, Share2, MoreVertical, Users, Plus, 
  AlertTriangle, FileText, Paperclip, Clock, Check, X,
  Upload, Link as LinkIcon, MessageSquare, History, Download, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useIncident, useUpdateIncident, useAddComment, useReleaseVersions } from '@/hooks/useIncidents';
import { useUploadIncidentAttachment, useDeleteIncidentAttachment, useDownloadIncidentAttachment } from '@/hooks/useIncidentAttachments';
import { SlaStatusCard } from '@/components/incidents/SlaStatusCard';
import { supabase } from '@/integrations/supabase/client';
import type { IncidentStatus, SeverityLevel, CommentType, ImpactLevel, UrgencyLevel, DeliveryStage } from '@/types/incident';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const STATUS_CONFIG: Record<IncidentStatus, { label: string; className: string }> = {
  open: { label: 'Open', className: 'bg-blue-100 text-blue-800' },
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

export default function IncidentRoomDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: incident, isLoading, error } = useIncident(id || '');
  const { data: releaseVersions } = useReleaseVersions();
  const updateIncident = useUpdateIncident();
  const addComment = useAddComment();
  const uploadAttachment = useUploadIncidentAttachment();
  const deleteAttachment = useDeleteIncidentAttachment();
  const downloadAttachment = useDownloadIncidentAttachment();

  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [commentText, setCommentText] = useState('');
  const [commentType, setCommentType] = useState<CommentType>('update');
  const [activeTab, setActiveTab] = useState('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [convertType, setConvertType] = useState<'business_request' | 'epic' | 'feature' | 'story'>('business_request');
  const [convertReason, setConvertReason] = useState('');

  const isConverted = incident?.status === 'converted';
  const canConvert = incident?.status !== 'converted' && 
    (!incident?.requires_committee || incident?.committee?.status === 'approved');

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
      onSuccess: () => toast.success('Updated successfully'),
      onError: () => toast.error('Failed to update'),
    });
  };

  const handlePostComment = () => {
    if (!id || !commentText.trim()) return;
    addComment.mutate({ incident_id: id, content: commentText, comment_type: commentType }, {
      onSuccess: () => {
        setCommentText('');
        toast.success('Comment posted');
      },
      onError: () => toast.error('Failed to post comment'),
    });
  };

  const handleSendToCommittee = async () => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-to-committee', {
        body: { incident_id: id },
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast.success('Incident sent to committee for approval');
      queryClient.invalidateQueries({ queryKey: ['incident', id] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to send to committee');
      console.error('Send to committee error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConvert = async () => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('convert-incident', {
        body: { 
          incident_id: id, 
          convert_to: convertType,
          reason: convertReason || undefined,
        },
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast.success(`Incident converted to ${convertType}`);
      setConvertDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['incident', id] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to convert incident');
      console.error('Convert incident error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVote = async (vote: 'approved' | 'rejected', isVeto?: boolean) => {
    if (!incident?.committee?.id) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('submit-vote', {
        body: { 
          committee_id: incident.committee.id, 
          vote,
          is_veto: isVeto,
        },
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast.success(data.message || 'Vote submitted');
      queryClient.invalidateQueries({ queryKey: ['incident', id] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit vote');
      console.error('Submit vote error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full p-6">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-6 w-full max-w-2xl mb-2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-lg font-medium mb-2">Incident not found</h2>
        <Link to="/release/incident-room">
          <Button variant="outline">Back to Incident Room</Button>
        </Link>
      </div>
    );
  }

  const severityConfig = SEVERITY_CONFIG[incident.severity];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Page Header */}
      <div className="border-b border-border bg-background px-6 py-4">
        <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
          <Link to="/release/incident-room" className="hover:text-foreground">RELEASE</Link>
          <span>/</span>
          <Link to="/release/incident-room" className="hover:text-foreground">Incidents</Link>
          <span>/</span>
          <span className="text-foreground">{incident.incident_key}</span>
        </nav>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <span className="text-brand-gold">{incident.incident_key}</span>
              <span>—</span>
              <span>{incident.title}</span>
            </h1>
            <div className="flex items-center gap-2 mt-2">
              {incident.is_major_incident && (
                <Badge variant="destructive">Major Incident</Badge>
              )}
              <Badge variant="outline" className={cn('border', severityConfig.className)}>
                {incident.severity}
              </Badge>
              {incident.assignee_workgroup && (
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                  {incident.assignee_workgroup.name}
                </Badge>
              )}
              {incident.support_level && (
                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                  {incident.support_level}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4 mr-1" />
              Watch
            </Button>
            <Button variant="ghost" size="sm">
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleSendToCommittee}
              disabled={incident.status === 'to_committee' || isConverted || isSubmitting}
            >
              <Users className="h-4 w-4 mr-1" />
              Send to Committee
            </Button>
            <Button 
              size="sm"
              onClick={() => setConvertDialogOpen(true)}
              disabled={!canConvert || isSubmitting}
              className="bg-brand-gold hover:bg-brand-gold-hover text-white"
            >
              <Plus className="h-4 w-4 mr-1" />
              Convert
            </Button>
          </div>
        </div>
      </div>

      {/* Convert Dialog */}
      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert Incident</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Convert to</Label>
              <Select value={convertType} onValueChange={(v: any) => setConvertType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="business_request">Business Request</SelectItem>
                  <SelectItem value="epic">Epic</SelectItem>
                  <SelectItem value="feature">Feature</SelectItem>
                  <SelectItem value="story">Story</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Textarea
                value={convertReason}
                onChange={(e) => setConvertReason(e.target.value)}
                placeholder="Why is this incident being converted?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConvert} 
              disabled={isSubmitting}
              className="bg-brand-gold hover:bg-brand-gold-hover text-white"
            >
              {isSubmitting ? 'Converting...' : 'Convert'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Main Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Description Card */}
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
              <h2 className="font-medium">Description</h2>
              <Button variant="ghost" size="sm" disabled={isConverted}>Edit</Button>
            </div>
            <div className="p-4">
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {incident.description || 'No description provided.'}
              </p>
            </div>
          </div>

          {/* Attachments Card */}
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
              <h2 className="font-medium">Attachments ({incident.attachments?.length || 0})</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                disabled={isConverted || uploadAttachment.isPending}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-1" />
                {uploadAttachment.isPending ? 'Uploading...' : 'Upload'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && id) {
                    uploadAttachment.mutate({ incidentId: id, file });
                    e.target.value = '';
                  }
                }}
              />
            </div>
            <div className="p-4">
              {incident.attachments?.length ? (
                <div className="space-y-2">
                  {incident.attachments.map(att => (
                    <div key={att.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 group">
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p 
                          className="text-sm font-medium truncate text-brand-gold hover:underline cursor-pointer"
                          onClick={() => downloadAttachment.mutate({ 
                            storagePath: att.storage_path, 
                            fileName: att.file_name 
                          })}
                        >
                          {att.file_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(att.file_size / 1024).toFixed(1)} KB • {new Date(att.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => downloadAttachment.mutate({ 
                            storagePath: att.storage_path, 
                            fileName: att.file_name 
                          })}
                        >
                          <Download className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        {!isConverted && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 hover:text-destructive"
                            onClick={() => deleteAttachment.mutate({ 
                              attachmentId: att.id, 
                              incidentId: id!,
                              storagePath: att.storage_path 
                            })}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No attachments yet.</p>
              )}
            </div>
          </div>

          {/* Linked Work Items Card */}
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
              <h2 className="font-medium">Linked Work Items</h2>
              <Button variant="ghost" size="sm" disabled={!isConverted}>
                <LinkIcon className="h-4 w-4 mr-1" />
                Link
              </Button>
            </div>
            <div className="p-4">
              {incident.converted_to_id ? (
                <p className="text-sm">
                  Converted to {incident.converted_to_type}: {incident.converted_to_id}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No linked work items. This incident has not been converted.
                </p>
              )}
            </div>
          </div>

          {/* Activity Section */}
          <div className="border border-border rounded-lg overflow-hidden flex-1 flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="w-full justify-start rounded-none border-b border-border bg-muted/30 px-2 h-auto py-1">
                <TabsTrigger value="all" className="text-sm">All</TabsTrigger>
                <TabsTrigger value="comments" className="text-sm">
                  Comments ({incident.comments?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="history" className="text-sm">History</TabsTrigger>
                <TabsTrigger value="sla" className="text-sm">SLA History</TabsTrigger>
                <TabsTrigger value="approvals" className="text-sm">Approvals</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="flex-1 overflow-auto p-0 m-0">
                <div className="divide-y divide-border">
                  {/* Pinned items first */}
                  {incident.comments?.filter(c => c.is_pinned).map(comment => (
                    <ActivityItem key={comment.id} comment={comment} isPinned />
                  ))}
                  {/* Regular items */}
                  {incident.comments?.filter(c => !c.is_pinned).map(comment => (
                    <ActivityItem key={comment.id} comment={comment} />
                  ))}
                  {!incident.comments?.length && (
                    <p className="text-sm text-muted-foreground p-4">No activity yet.</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="comments" className="flex-1 overflow-auto p-0 m-0">
                <div className="divide-y divide-border">
                  {incident.comments?.map(comment => (
                    <ActivityItem key={comment.id} comment={comment} />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="history" className="flex-1 overflow-auto p-0 m-0">
                <div className="divide-y divide-border">
                  {incident.history?.map(h => (
                    <div key={h.id} className="flex gap-3 p-4">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <History className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm">
                          <span className="font-medium">{h.field_name}</span> changed from{' '}
                          <span className="text-muted-foreground">{h.old_value || 'empty'}</span> to{' '}
                          <span className="font-medium">{h.new_value}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(h.changed_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="sla" className="p-4">
                <p className="text-sm text-muted-foreground">SLA history coming soon.</p>
              </TabsContent>

              <TabsContent value="approvals" className="p-4">
                <p className="text-sm text-muted-foreground">Approvals coming soon.</p>
              </TabsContent>
            </Tabs>

            {/* Comment Input */}
            <div className="border-t border-border p-4 bg-muted/30">
              <div className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs bg-secondary-bronze text-white">VK</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <Textarea
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="min-h-[80px] resize-none"
                    disabled={isConverted}
                  />
                  <div className="flex items-center justify-between">
                    <Select value={commentType} onValueChange={(v) => setCommentType(v as CommentType)}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="update">Update</SelectItem>
                        <SelectItem value="investigation">Investigation</SelectItem>
                        <SelectItem value="mitigation">Mitigation</SelectItem>
                        <SelectItem value="handover">Handover</SelectItem>
                        <SelectItem value="decision">Decision</SelectItem>
                        <SelectItem value="rca">RCA</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      onClick={handlePostComment} 
                      disabled={!commentText.trim() || addComment.isPending}
                      className="bg-brand-gold hover:bg-brand-gold-hover text-white"
                    >
                      Post Comment
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Sidebar */}
        <aside className="w-80 border-l border-border overflow-auto bg-muted/20 p-4 space-y-4">
          {/* L3 Governance Banner */}
          {incident.requires_committee && incident.support_level === 'L3' && (
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

          {/* Status */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</label>
            <Select 
              value={incident.status} 
              onValueChange={handleStatusChange}
              disabled={isConverted}
            >
              <SelectTrigger className={cn('mt-1', STATUS_CONFIG[incident.status].className)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* SLA Widget */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">SLA Status</label>
            <SlaStatusCard slaRecord={incident.sla} createdAt={incident.created_at} />
          </div>

          {/* Release Version */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              Release Version <span className="text-destructive">*</span>
            </label>
            <Select 
              value={incident.release_version_id || ''} 
              onValueChange={(v) => handleFieldChange('release_version_id', v)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select version" />
              </SelectTrigger>
              <SelectContent>
                {releaseVersions?.map(v => (
                  <SelectItem key={v.id} value={v.id}>{v.version}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Delivery Stage */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Delivery Stage</label>
            <Select 
              value={incident.delivery_stage || ''} 
              onValueChange={(v) => handleFieldChange('delivery_stage', v)}
              disabled={isConverted}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stage">Stage</SelectItem>
                <SelectItem value="qa">QA</SelectItem>
                <SelectItem value="beta">Beta</SelectItem>
                <SelectItem value="prod">Prod</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Support Level */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Support Level</label>
            <div className="mt-1">
              {incident.support_level ? (
                <div>
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                    {incident.support_level}
                  </Badge>
                  {incident.support_level === 'L3' && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Auto-set to L3 because assignee belongs to Delivery workgroup.
                    </p>
                  )}
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Not set</span>
              )}
            </div>
          </div>

          {/* Severity */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Severity</label>
            <div className="mt-1">
              <Badge variant="outline" className={cn('border', severityConfig.className)}>
                {severityConfig.label}
              </Badge>
            </div>
          </div>

          {/* Impact */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Impact</label>
            <Select 
              value={incident.impact} 
              onValueChange={(v) => handleFieldChange('impact', v)}
              disabled={isConverted}
            >
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

          {/* Urgency */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Urgency</label>
            <Select 
              value={incident.urgency} 
              onValueChange={(v) => handleFieldChange('urgency', v)}
              disabled={isConverted}
            >
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

          {/* Priority */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Priority (derived)</label>
            <div className="mt-1">
              {incident.priority && (
                <Badge variant="outline" className={cn(
                  'border',
                  incident.priority === 'P1' ? 'bg-red-100 text-red-800 border-red-200' :
                  incident.priority === 'P2' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                  incident.priority === 'P3' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                  'bg-blue-100 text-blue-800 border-blue-200'
                )}>
                  {incident.priority} — {incident.priority === 'P1' ? 'Critical' : incident.priority === 'P2' ? 'High' : incident.priority === 'P3' ? 'Medium' : 'Low'}
                </Badge>
              )}
            </div>
          </div>

          {/* Assignee */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Assignee</label>
            <div className="mt-1 flex items-center gap-2">
              {incident.assignee ? (
                <>
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[10px] bg-secondary-bronze text-white">
                      {incident.assignee.avatar_initials || incident.assignee.full_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{incident.assignee.full_name}</span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">Unassigned</span>
              )}
              <Button variant="link" size="sm" className="text-xs text-brand-gold p-0 h-auto">
                Assign to me
              </Button>
            </div>
          </div>

          {/* Assignee Workgroup */}
          {incident.assignee_workgroup && (
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Assignee Workgroup</label>
              <div className="mt-1">
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                  {incident.assignee_workgroup.name}
                </Badge>
              </div>
            </div>
          )}

          {/* Reporter */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Reporter</label>
            <div className="mt-1 flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px] bg-muted">
                  {incident.reporter?.avatar_initials || incident.reporter_name?.split(' ').map(n => n[0]).join('') || 'SY'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">{incident.reporter?.full_name || incident.reporter_name || 'System'}</span>
            </div>
          </div>

          {/* Labels */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Labels</label>
            <div className="mt-1 flex flex-wrap gap-1">
              {incident.labels?.map(label => (
                <Badge key={label.id} variant="outline" className="text-xs">
                  {label.name}
                </Badge>
              ))}
              <Button variant="ghost" size="sm" className="text-xs h-6 px-2">
                + Add
              </Button>
            </div>
          </div>

          {/* Target Date */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Target Date</label>
            <div className="mt-1 text-sm text-muted-foreground">
              {incident.target_date ? new Date(incident.target_date).toLocaleDateString() : 'Not set'}
            </div>
          </div>

          {/* Created/Updated */}
          <div className="pt-4 border-t border-border space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Created</span>
              <span>{new Date(incident.created_at).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Updated</span>
              <span>{new Date(incident.updated_at).toLocaleString()}</span>
            </div>
          </div>

          {/* Committee Widget */}
          {incident.committee && (
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
                <h3 className="text-sm font-medium">Release Committee</h3>
                <Badge 
                  variant="outline" 
                  className={cn(
                    'text-[10px]',
                    incident.committee.status === 'approved' ? 'bg-green-100 text-green-800' :
                    incident.committee.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  )}
                >
                  {incident.committee.status.charAt(0).toUpperCase() + incident.committee.status.slice(1)}
                </Badge>
              </div>
              <div className="p-3 space-y-3">
                {/* Progress */}
                <div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-secondary-green rounded-full transition-all"
                      style={{ 
                        width: `${(incident.committee.members?.filter(m => m.vote?.vote === 'approved').length || 0) / (incident.committee.members?.length || 1) * 100}%` 
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {incident.committee.members?.filter(m => m.vote?.vote === 'approved').length || 0} of {incident.committee.required_approvals} approvals (majority required)
                  </p>
                </div>

                {/* Members */}
                <div className="space-y-2">
                  {incident.committee.members?.map(member => (
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

                {/* Vote Actions - only show if committee is pending */}
                {incident.committee.status === 'pending' && (
                  <div className="flex gap-2 pt-2">
                    <Button 
                      size="sm" 
                      className="flex-1 bg-secondary-green hover:bg-secondary-green/90 text-white"
                      onClick={() => handleVote('approved')}
                      disabled={isSubmitting}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Approve
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      className="flex-1"
                      onClick={() => handleVote('rejected')}
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
      </div>
    </div>
  );
}

// Activity Item Component
function ActivityItem({ comment, isPinned }: { comment: { id: string; author?: { full_name: string; avatar_initials?: string }; author_name?: string; content: string; comment_type: string; is_system: boolean; created_at: string }; isPinned?: boolean }) {
  const COMMENT_TYPE_COLORS: Record<string, string> = {
    investigation: 'bg-blue-100 text-blue-800',
    mitigation: 'bg-green-100 text-green-800',
    handover: 'bg-purple-100 text-purple-800',
    decision: 'bg-yellow-100 text-yellow-800',
    rca: 'bg-orange-100 text-orange-800',
  };

  return (
    <div className={cn('flex gap-3 p-4', isPinned && 'bg-yellow-50/50')}>
      {comment.is_system ? (
        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </div>
      ) : (
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs bg-secondary-bronze text-white">
            {comment.author?.avatar_initials || comment.author_name?.split(' ').map(n => n[0]).join('') || 'U'}
          </AvatarFallback>
        </Avatar>
      )}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {comment.is_system ? 'System' : comment.author?.full_name || comment.author_name}
          </span>
          {isPinned && <span className="text-secondary-bronze">📌</span>}
          {comment.comment_type !== 'update' && comment.comment_type !== 'system' && (
            <Badge variant="outline" className={cn('text-[10px]', COMMENT_TYPE_COLORS[comment.comment_type])}>
              {comment.comment_type.charAt(0).toUpperCase() + comment.comment_type.slice(1)}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {new Date(comment.created_at).toLocaleString()}
          </span>
        </div>
        <p className={cn('text-sm mt-1', comment.is_system && 'text-muted-foreground')}>
          {comment.content}
        </p>
      </div>
    </div>
  );
}
