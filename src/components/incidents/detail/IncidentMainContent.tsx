import { useState, useRef } from 'react';
import { 
  Paperclip, Clock, Upload, Link as LinkIcon, Download, Trash2, 
  History, Users, AlertTriangle, Check, X, MessageSquare, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { CommitteeCard } from './CommitteeCard';
import type { CommentType, IncidentUserProfile } from '@/types/incident';

interface Attachment {
  id: string;
  file_name: string;
  file_size: number;
  storage_path: string;
  created_at: string;
}

interface Comment {
  id: string;
  author?: { full_name: string; avatar_initials?: string };
  author_name?: string;
  content: string;
  comment_type: string;
  is_system: boolean;
  is_pinned?: boolean;
  created_at: string;
}

interface HistoryItem {
  id: string;
  field_name: string;
  old_value?: string;
  new_value?: string;
  changed_at: string;
}

interface SlaRecord {
  response_due_at: string;
  resolution_due_at: string;
  response_breached: boolean;
  resolution_breached: boolean;
}

interface CommitteeMember {
  id: string;
  user?: { id: string; full_name: string; avatar_initials?: string };
  role?: string;
  has_veto: boolean;
  vote?: { vote: string };
}

interface Committee {
  id: string;
  status: string;
  decision_note?: string;
  required_approvals?: number;
  assignment_strategy?: 'manual' | 'round_robin';
  members?: CommitteeMember[];
}

interface IncidentMainContentProps {
  incidentId: string;
  description: string | null;
  attachments: Attachment[];
  comments: Comment[];
  history: HistoryItem[];
  sla: SlaRecord | null;
  committee: Committee | null;
  convertedToId: string | null;
  convertedToType: string | null;
  isConverted: boolean;
  // Resolution fields
  status: string;
  resolutionSummary: string | null;
  resolutionType: string | null;
  rootCause: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  // Handlers
  onDescriptionChange: (description: string) => void;
  onPostComment: (content: string, type: CommentType) => void;
  onUploadFile: (file: File) => void;
  onDownloadFile: (storagePath: string, fileName: string) => void;
  onDeleteFile: (attachmentId: string, storagePath: string) => void;
  onVote: (vote: 'approved' | 'rejected', isVeto?: boolean, note?: string) => void;
  onAddApprover: (userId: string, hasVeto: boolean, note: string) => void;
  onInitiateCommittee?: () => void;
  onCreateCommittee?: () => void;
  onResolutionChange: (field: string, value: string) => void;
  // Available approvers for Add Approver dialog
  availableApprovers: IncidentUserProfile[];
  isUploadPending: boolean;
  isCommentPending: boolean;
  isVotePending: boolean;
}

function SectionHeader({ 
  title, 
  count, 
  icon: Icon,
  actions 
}: { 
  title: string; 
  count?: number; 
  icon?: React.ElementType;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        <h2 className="font-medium text-sm text-foreground">{title}</h2>
        {count !== undefined && (
          <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
            {count}
          </Badge>
        )}
      </div>
      {actions}
    </div>
  );
}

export function IncidentMainContent({
  incidentId,
  description,
  attachments,
  comments,
  history,
  sla,
  committee,
  convertedToId,
  convertedToType,
  isConverted,
  status,
  resolutionSummary,
  resolutionType,
  rootCause,
  resolvedAt,
  closedAt,
  onDescriptionChange,
  onPostComment,
  onUploadFile,
  onDownloadFile,
  onDeleteFile,
  onVote,
  onAddApprover,
  onInitiateCommittee,
  onCreateCommittee,
  onResolutionChange,
  availableApprovers,
  isUploadPending,
  isCommentPending,
  isVotePending,
}: IncidentMainContentProps) {
  const [activeTab, setActiveTab] = useState('activity');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');
  const [commentText, setCommentText] = useState('');
  const [commentType, setCommentType] = useState<CommentType>('update');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveDescription = () => {
    onDescriptionChange(editedDescription);
    setIsEditingDescription(false);
  };

  const handlePostComment = () => {
    if (commentText.trim()) {
      onPostComment(commentText, commentType);
      setCommentText('');
    }
  };

  return (
    <main className="flex-1 overflow-auto p-4 space-y-4 min-w-0">
      {/* ========== 1. DESCRIPTION ========== */}
      <section className="border border-border rounded-lg overflow-hidden bg-background">
        <SectionHeader 
          title="Description" 
          icon={FileText}
          actions={
            isEditingDescription ? (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="h-7 px-2.5 text-xs" onClick={() => setIsEditingDescription(false)}>
                  Cancel
                </Button>
                <Button size="sm" className="h-7 px-3 text-xs" onClick={handleSaveDescription}>Save</Button>
              </div>
            ) : (
              <Button 
                variant="ghost" 
                size="sm"
                className="h-7 px-2.5 text-xs"
                disabled={isConverted} 
                onClick={() => {
                  setEditedDescription(description || '');
                  setIsEditingDescription(true);
                }}
              >
                Edit
              </Button>
            )
          }
        />
        <div className="p-4">
          {isEditingDescription ? (
            <Textarea
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              className="min-h-[160px] resize-y text-sm leading-relaxed"
              placeholder="Describe the incident in detail..."
            />
          ) : (
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed min-h-[60px]">
              {description || 'No description provided.'}
            </p>
          )}
        </div>
      </section>

      {/* ========== 2. ATTACHMENTS ========== */}
      <section className="border border-border rounded-lg overflow-hidden bg-background">
        <SectionHeader 
          title="Attachments" 
          icon={Paperclip}
          count={attachments.length}
          actions={
            <Button 
              variant="ghost" 
              size="sm"
              className="h-7 px-2.5 text-xs"
              disabled={isConverted || isUploadPending}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              {isUploadPending ? 'Uploading...' : 'Upload'}
            </Button>
          }
        />
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              onUploadFile(file);
              e.target.value = '';
            }
          }}
        />
        <div className="p-2">
          {attachments.length > 0 ? (
            <div className="space-y-1">
              {attachments.map(att => (
                <div key={att.id} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 group transition-colors">
                  <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p 
                      className="text-sm font-medium truncate text-primary hover:underline cursor-pointer"
                      onClick={() => onDownloadFile(att.storage_path, att.file_name)}
                    >
                      {att.file_name}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {(att.file_size / 1024).toFixed(0)} KB
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => onDownloadFile(att.storage_path, att.file_name)}
                    >
                      <Download className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    {!isConverted && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 hover:text-destructive"
                        onClick={() => onDeleteFile(att.id, att.storage_path)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground px-3 py-2">No attachments</p>
          )}
        </div>
      </section>

      {/* ========== 3. LINKED WORK ITEMS ========== */}
      <section className="border border-border rounded-lg overflow-hidden bg-background">
        <SectionHeader 
          title="Linked Work Items" 
          icon={LinkIcon}
          actions={
            <Button variant="ghost" size="sm" className="h-7 px-2.5 text-xs" disabled={isConverted}>
              <LinkIcon className="h-3.5 w-3.5 mr-1.5" />
              Link
            </Button>
          }
        />
        <div className="p-4">
          {convertedToId ? (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm">
                Converted to {convertedToType}
              </Badge>
              <span className="font-medium text-primary text-sm">{convertedToId}</span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No linked work items</p>
          )}
        </div>
      </section>

      {/* ========== 4. ACTIVITY TABS ========== */}
      <section className="border border-border rounded-lg overflow-hidden bg-background flex-1 flex flex-col min-h-[320px]">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="w-full justify-start rounded-none border-b border-border bg-muted/30 px-2 h-10">
            <TabsTrigger value="activity" className="text-sm h-8 px-3 data-[state=active]:bg-background">
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
              Activity
              {comments.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1 py-0 h-4">{comments.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="resolution" className="text-sm h-8 px-3 data-[state=active]:bg-background">
              <Check className="h-3.5 w-3.5 mr-1.5" />
              Resolution
            </TabsTrigger>
            <TabsTrigger value="sla-history" className="text-sm h-8 px-3 data-[state=active]:bg-background">
              <Clock className="h-3.5 w-3.5 mr-1.5" />
              SLA History
            </TabsTrigger>
            <TabsTrigger value="committee" className="text-sm h-8 px-3 data-[state=active]:bg-background">
              <Users className="h-3.5 w-3.5 mr-1.5" />
              Committee
              <Badge 
                variant="secondary" 
                className={cn(
                  "ml-1.5 text-[10px] px-1 py-0 h-4",
                  committee?.status === 'approved' && "bg-emerald-100 text-emerald-700",
                  committee?.status === 'rejected' && "bg-rose-100 text-rose-700",
                  (!committee || committee?.status === 'pending') && "bg-amber-100 text-amber-700"
                )}
              >
                {committee?.members?.length || 0}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="audit-log" className="text-sm h-8 px-3 data-[state=active]:bg-background">
              <History className="h-3.5 w-3.5 mr-1.5" />
              Audit Log
              {history.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1 py-0 h-4">{history.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Activity Tab */}
          <TabsContent value="activity" className="flex-1 overflow-auto p-0 m-0">
            <div className="divide-y divide-border">
              {comments.filter(c => c.is_pinned).map(comment => (
                <ActivityItem key={comment.id} comment={comment} isPinned />
              ))}
              {comments.filter(c => !c.is_pinned).map(comment => (
                <ActivityItem key={comment.id} comment={comment} />
              ))}
              {comments.length === 0 && (
                <p className="text-sm text-muted-foreground p-4">No activity yet.</p>
              )}
            </div>
          </TabsContent>

          {/* Resolution Tab */}
          <TabsContent value="resolution" className="p-4 space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Resolution Summary {(status === 'resolved' || status === 'closed') && <span className="text-destructive">*</span>}
                </label>
                <Textarea
                  value={resolutionSummary || ''}
                  onChange={(e) => onResolutionChange('resolution_summary', e.target.value)}
                  placeholder="Describe how the incident was resolved..."
                  className="min-h-[100px] text-sm"
                  disabled={isConverted}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Resolution Type</label>
                  <Select 
                    value={resolutionType || ''} 
                    onValueChange={(v) => onResolutionChange('resolution_type', v)}
                    disabled={isConverted}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fix">Permanent Fix</SelectItem>
                      <SelectItem value="workaround">Workaround</SelectItem>
                      <SelectItem value="rollback">Rollback</SelectItem>
                      <SelectItem value="config">Configuration Change</SelectItem>
                      <SelectItem value="duplicate">Duplicate</SelectItem>
                      <SelectItem value="wont_fix">Won't Fix</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Resolved At</label>
                  <div className="h-9 px-3 flex items-center bg-muted/50 rounded-md border border-border text-sm">
                    {resolvedAt ? new Date(resolvedAt).toLocaleString() : 'Not resolved'}
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Root Cause (optional)</label>
                <Textarea
                  value={rootCause || ''}
                  onChange={(e) => onResolutionChange('root_cause', e.target.value)}
                  placeholder="Document the root cause analysis..."
                  className="min-h-[80px] text-sm"
                  disabled={isConverted}
                />
              </div>
              
              {closedAt && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <span className="text-xs text-muted-foreground">Closed at: </span>
                  <span className="text-sm font-medium">{new Date(closedAt).toLocaleString()}</span>
                </div>
              )}
            </div>
          </TabsContent>

          {/* SLA History Tab */}
          <TabsContent value="sla-history" className="p-4">
            {sla ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm">Response Due</span>
                  <span className="text-sm font-medium">{new Date(sla.response_due_at).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm">Resolution Due</span>
                  <span className="text-sm font-medium">{new Date(sla.resolution_due_at).toLocaleString()}</span>
                </div>
                {sla.response_breached && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">Response SLA breached</span>
                  </div>
                )}
                {sla.resolution_breached && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">Resolution SLA breached</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No SLA configured for this severity.</p>
            )}
          </TabsContent>

          {/* Committee Tab - Always visible, every incident has committee */}
          <TabsContent value="committee" className="p-4">
            <CommitteeCard
              committee={committee}
              isConverted={isConverted}
              availableApprovers={availableApprovers}
              onVote={onVote}
              onAddApprover={onAddApprover}
              onInitiateCommittee={onInitiateCommittee}
              onCreateCommittee={onCreateCommittee}
              isVotePending={isVotePending}
            />
          </TabsContent>

          {/* Audit Log Tab */}
          <TabsContent value="audit-log" className="flex-1 overflow-auto p-0 m-0">
            <div className="divide-y divide-border">
              {history.map(h => (
                <div key={h.id} className="flex gap-3 p-4">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <History className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm">
                      <span className="font-medium">{h.field_name}</span> changed from{' '}
                      <span className="text-muted-foreground">{h.old_value || 'empty'}</span> to{' '}
                      <span className="font-medium">{h.new_value || 'empty'}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(h.changed_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
              {history.length === 0 && (
                <p className="text-sm text-muted-foreground p-4">No history entries.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Comment Input */}
        <div className="border-t border-border p-4 bg-muted/30">
          <div className="flex gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-primary text-primary-foreground">U</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <Textarea
                placeholder="Add a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="min-h-[80px] resize-none text-sm"
                disabled={isConverted}
              />
              <div className="flex items-center justify-between">
                <Select value={commentType} onValueChange={(v) => setCommentType(v as CommentType)}>
                  <SelectTrigger className="w-36 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="update" className="text-sm">Update</SelectItem>
                    <SelectItem value="investigation" className="text-sm">Investigation</SelectItem>
                    <SelectItem value="mitigation" className="text-sm">Mitigation</SelectItem>
                    <SelectItem value="handover" className="text-sm">Handover</SelectItem>
                    <SelectItem value="decision" className="text-sm">Decision</SelectItem>
                    <SelectItem value="rca" className="text-sm">RCA</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  size="sm"
                  className="h-8 px-4 text-sm"
                  onClick={handlePostComment} 
                  disabled={!commentText.trim() || isCommentPending}
                >
                  Post Comment
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

// Activity Item - Readable typography
function ActivityItem({ comment, isPinned }: { 
  comment: { 
    id: string; 
    author?: { full_name: string; avatar_initials?: string }; 
    author_name?: string; 
    content: string; 
    comment_type: string; 
    is_system: boolean; 
    created_at: string 
  }; 
  isPinned?: boolean 
}) {
  const COMMENT_TYPE_COLORS: Record<string, string> = {
    investigation: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
    mitigation: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    handover: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
    decision: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    rca: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  };

  return (
    <div className={cn('flex gap-3 p-4', isPinned && 'bg-amber-50/50 dark:bg-amber-900/10')}>
      {comment.is_system ? (
        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </div>
      ) : (
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs bg-primary text-primary-foreground">
            {comment.author?.avatar_initials || comment.author_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'}
          </AvatarFallback>
        </Avatar>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">
            {comment.is_system ? 'System' : comment.author?.full_name || comment.author_name}
          </span>
          {isPinned && <span className="text-sm">📌</span>}
          {comment.comment_type !== 'update' && comment.comment_type !== 'system' && (
            <Badge variant="outline" className={cn('text-xs px-1.5 py-0', COMMENT_TYPE_COLORS[comment.comment_type])}>
              {comment.comment_type.charAt(0).toUpperCase() + comment.comment_type.slice(1)}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {new Date(comment.created_at).toLocaleString()}
          </span>
        </div>
        <p className={cn('text-sm mt-1 leading-relaxed', comment.is_system && 'text-muted-foreground')}>
          {comment.content}
        </p>
      </div>
    </div>
  );
}
