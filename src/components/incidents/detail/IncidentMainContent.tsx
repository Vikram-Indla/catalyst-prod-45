import { useState, useRef } from 'react';
import { 
  Paperclip, Clock, Upload, Link as LinkIcon, Download, Trash2, 
  History, Users, AlertTriangle, Check, X 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { CommentType } from '@/types/incident';

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
  user?: { full_name: string; avatar_initials?: string };
  role?: string;
  has_veto: boolean;
  vote?: { vote: string };
}

interface Committee {
  id: string;
  status: string;
  decision_note?: string;
  members?: CommitteeMember[];
  votes?: { member_id: string; vote: string }[];
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
  requiresCommittee: boolean;
  isConverted: boolean;
  onDescriptionChange: (description: string) => void;
  onPostComment: (content: string, type: CommentType) => void;
  onUploadFile: (file: File) => void;
  onDownloadFile: (storagePath: string, fileName: string) => void;
  onDeleteFile: (attachmentId: string, storagePath: string) => void;
  onVote: (vote: 'approved' | 'rejected', isVeto?: boolean) => void;
  isUploadPending: boolean;
  isCommentPending: boolean;
  isVotePending: boolean;
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
  requiresCommittee,
  isConverted,
  onDescriptionChange,
  onPostComment,
  onUploadFile,
  onDownloadFile,
  onDeleteFile,
  onVote,
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
    <main className="w-[70%] overflow-auto p-3 space-y-3 min-w-0">
      {/* 1. Description - High-density, inline edit */}
      <section className="border border-border rounded overflow-hidden">
        <div className="flex items-center justify-between px-2 py-1.5 border-b border-border bg-muted/30">
          <h2 className="font-medium text-[10px] uppercase tracking-wider text-muted-foreground">Description</h2>
          {isEditingDescription ? (
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px]" onClick={() => setIsEditingDescription(false)}>
                Cancel
              </Button>
              <Button size="sm" className="h-5 px-1.5 text-[10px]" onClick={handleSaveDescription}>Save</Button>
            </div>
          ) : (
            <Button 
              variant="ghost" 
              size="sm"
              className="h-5 px-1.5 text-[10px]"
              disabled={isConverted} 
              onClick={() => {
                setEditedDescription(description || '');
                setIsEditingDescription(true);
              }}
            >
              Edit
            </Button>
          )}
        </div>
        <div className="p-2">
          {isEditingDescription ? (
            <Textarea
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              className="min-h-[180px] resize-y text-xs leading-relaxed"
              placeholder="Describe the incident in detail..."
            />
          ) : (
            <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed min-h-[60px]">
              {description || 'No description provided.'}
            </p>
          )}
        </div>
      </section>

      {/* 2. Attachments - Upload + list */}
      <section className="border border-border rounded overflow-hidden">
        <div className="flex items-center justify-between px-2 py-1.5 border-b border-border bg-muted/30">
          <h2 className="font-medium text-[10px] uppercase tracking-wider text-muted-foreground">
            Attachments ({attachments.length})
          </h2>
          <Button 
            variant="ghost" 
            size="sm"
            className="h-5 px-1.5 text-[10px]"
            disabled={isConverted || isUploadPending}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-3 w-3 mr-1" />
            {isUploadPending ? 'Uploading...' : 'Upload'}
          </Button>
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
        </div>
        <div className="p-1.5">
          {attachments.length > 0 ? (
            <div className="space-y-0.5">
              {attachments.map(att => (
                <div key={att.id} className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-muted/50 group">
                  <Paperclip className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p 
                      className="text-[10px] font-medium truncate text-brand-primary hover:underline cursor-pointer"
                      onClick={() => onDownloadFile(att.storage_path, att.file_name)}
                    >
                      {att.file_name}
                    </p>
                  </div>
                  <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                    {(att.file_size / 1024).toFixed(0)} KB
                  </span>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0"
                      onClick={() => onDownloadFile(att.storage_path, att.file_name)}
                    >
                      <Download className="h-2.5 w-2.5 text-muted-foreground" />
                    </Button>
                    {!isConverted && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:text-destructive"
                        onClick={() => onDeleteFile(att.id, att.storage_path)}
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground px-1.5 py-1">No attachments</p>
          )}
        </div>
      </section>

      {/* 3. Linked Work Items - Read from backend links only */}
      <section className="border border-border rounded overflow-hidden">
        <div className="flex items-center justify-between px-2 py-1.5 border-b border-border bg-muted/30">
          <h2 className="font-medium text-[10px] uppercase tracking-wider text-muted-foreground">Linked Work Items</h2>
          <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px]" disabled={isConverted}>
            <LinkIcon className="h-3 w-3 mr-1" />
            Link
          </Button>
        </div>
        <div className="p-1.5">
          {convertedToId ? (
            <p className="text-[10px] px-1.5 py-1">
              Converted to <span className="font-medium">{convertedToType}</span>: 
              <span className="font-medium text-brand-primary ml-1">{convertedToId}</span>
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground px-1.5 py-1">No linked work items</p>
          )}
        </div>
      </section>

      {/* 4. Activity Tabs (exact order: Activity, SLA History, Approvals, Audit Log) */}
      <section className="border border-border rounded overflow-hidden flex-1 flex flex-col min-h-[280px]">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="w-full justify-start rounded-none border-b border-border bg-muted/30 px-1 h-7">
            <TabsTrigger value="activity" className="text-[10px] h-5 px-2">Activity</TabsTrigger>
            <TabsTrigger value="sla-history" className="text-[10px] h-5 px-2">SLA History</TabsTrigger>
            <TabsTrigger value="approvals" className="text-[10px] h-5 px-2">Approvals</TabsTrigger>
            <TabsTrigger value="audit-log" className="text-[10px] h-5 px-2">Audit Log</TabsTrigger>
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
                <p className="text-[10px] text-muted-foreground p-3">No activity yet.</p>
              )}
            </div>
          </TabsContent>

          {/* SLA History Tab - Read-only from sla_records */}
          <TabsContent value="sla-history" className="p-2">
            {sla ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
                  <span className="text-[10px]">Response Due</span>
                  <span className="text-[10px] font-medium">{new Date(sla.response_due_at).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
                  <span className="text-[10px]">Resolution Due</span>
                  <span className="text-[10px] font-medium">{new Date(sla.resolution_due_at).toLocaleString()}</span>
                </div>
                {sla.response_breached && (
                  <div className="flex items-center gap-2 p-2 bg-destructive/10 text-destructive rounded">
                    <AlertTriangle className="h-3 w-3" />
                    <span className="text-[10px]">Response SLA breached</span>
                  </div>
                )}
                {sla.resolution_breached && (
                  <div className="flex items-center gap-2 p-2 bg-destructive/10 text-destructive rounded">
                    <AlertTriangle className="h-3 w-3" />
                    <span className="text-[10px]">Resolution SLA breached</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground">No SLA configured for this severity.</p>
            )}
          </TabsContent>

          {/* Approvals Tab */}
          <TabsContent value="approvals" className="p-2">
            {committee ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
                  <span className="text-[10px] font-medium">Committee Status</span>
                  <Badge variant={
                    committee.status === 'approved' ? 'default' : 
                    committee.status === 'rejected' ? 'destructive' : 'secondary'
                  } className={cn('text-[9px]', committee.status === 'approved' ? 'bg-secondary-green' : '')}>
                    {committee.status.charAt(0).toUpperCase() + committee.status.slice(1)}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <h4 className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Members</h4>
                  {committee.members?.map(member => {
                    const vote = committee.votes?.find(v => v.member_id === member.id);
                    return (
                      <div key={member.id} className="flex items-center justify-between p-2 border border-border rounded">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-[8px] bg-brand-primary text-white">
                              {member.user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-[10px] font-medium">{member.user?.full_name || 'Unknown'}</p>
                            {member.has_veto && (
                              <span className="text-[9px] text-muted-foreground">Veto power</span>
                            )}
                          </div>
                        </div>
                        <div>
                          {vote ? (
                            <Badge variant={
                              vote.vote === 'approved' ? 'default' : 
                              vote.vote === 'rejected' || vote.vote === 'vetoed' ? 'destructive' : 'secondary'
                            } className={cn('text-[9px]', vote.vote === 'approved' ? 'bg-secondary-green' : '')}>
                              {vote.vote === 'vetoed' ? 'Vetoed' : vote.vote.charAt(0).toUpperCase() + vote.vote.slice(1)}
                            </Badge>
                          ) : (
                            <span className="text-[9px] text-muted-foreground">Pending</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {committee.status === 'pending' && (
                  <div className="flex gap-1 pt-1">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1 h-6 text-[10px]"
                      onClick={() => onVote('rejected')}
                      disabled={isVotePending}
                    >
                      <X className="h-3 w-3 mr-0.5" />
                      Reject
                    </Button>
                    <Button 
                      size="sm"
                      className="flex-1 h-6 text-[10px] bg-secondary-green hover:bg-secondary-green/90"
                      onClick={() => onVote('approved')}
                      disabled={isVotePending}
                    >
                      <Check className="h-3 w-3 mr-0.5" />
                      Approve
                    </Button>
                  </div>
                )}

                {committee.decision_note && (
                  <div className="p-2 bg-muted/30 rounded">
                    <p className="text-[9px] text-muted-foreground mb-0.5">Decision Note</p>
                    <p className="text-[10px]">{committee.decision_note}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <Users className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                <p className="text-[10px] text-muted-foreground">
                  {requiresCommittee 
                    ? 'Committee review not initiated'
                    : 'Committee approval not required'}
                </p>
              </div>
            )}
          </TabsContent>

          {/* Audit Log Tab */}
          <TabsContent value="audit-log" className="flex-1 overflow-auto p-0 m-0">
            <div className="divide-y divide-border">
              {history.map(h => (
                <div key={h.id} className="flex gap-2 p-2">
                  <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <History className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-[10px]">
                      <span className="font-medium">{h.field_name}</span> changed from{' '}
                      <span className="text-muted-foreground">{h.old_value || 'empty'}</span> to{' '}
                      <span className="font-medium">{h.new_value || 'empty'}</span>
                    </p>
                    <p className="text-[9px] text-muted-foreground">
                      {new Date(h.changed_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
              {history.length === 0 && (
                <p className="text-[10px] text-muted-foreground p-3">No history entries.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Comment Input */}
        <div className="border-t border-border p-2 bg-muted/30">
          <div className="flex gap-2">
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[8px] bg-brand-primary text-white">U</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1.5">
              <Textarea
                placeholder="Add a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="min-h-[60px] resize-none text-xs"
                disabled={isConverted}
              />
              <div className="flex items-center justify-between">
                <Select value={commentType} onValueChange={(v) => setCommentType(v as CommentType)}>
                  <SelectTrigger className="w-28 h-6 text-[10px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="update" className="text-[10px]">Update</SelectItem>
                    <SelectItem value="investigation" className="text-[10px]">Investigation</SelectItem>
                    <SelectItem value="mitigation" className="text-[10px]">Mitigation</SelectItem>
                    <SelectItem value="handover" className="text-[10px]">Handover</SelectItem>
                    <SelectItem value="decision" className="text-[10px]">Decision</SelectItem>
                    <SelectItem value="rca" className="text-[10px]">RCA</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  size="sm"
                  className="h-6 text-[10px]"
                  onClick={handlePostComment} 
                  disabled={!commentText.trim() || isCommentPending}
                >
                  Post
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

// Activity Item - Compact
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
    investigation: 'bg-blue-100 text-blue-800',
    mitigation: 'bg-green-100 text-green-800',
    handover: 'bg-purple-100 text-purple-800',
    decision: 'bg-yellow-100 text-yellow-800',
    rca: 'bg-orange-100 text-orange-800',
  };

  return (
    <div className={cn('flex gap-2 p-2', isPinned && 'bg-yellow-50/50')}>
      {comment.is_system ? (
        <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="h-3 w-3 text-muted-foreground" />
        </div>
      ) : (
        <Avatar className="h-5 w-5">
          <AvatarFallback className="text-[8px] bg-brand-primary text-white">
            {comment.author?.avatar_initials || comment.author_name?.split(' ').map(n => n[0]).join('') || 'U'}
          </AvatarFallback>
        </Avatar>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-medium">
            {comment.is_system ? 'System' : comment.author?.full_name || comment.author_name}
          </span>
          {isPinned && <span className="text-[10px]">📌</span>}
          {comment.comment_type !== 'update' && comment.comment_type !== 'system' && (
            <Badge variant="outline" className={cn('text-[8px] px-1 py-0 h-3', COMMENT_TYPE_COLORS[comment.comment_type])}>
              {comment.comment_type.charAt(0).toUpperCase() + comment.comment_type.slice(1)}
            </Badge>
          )}
          <span className="text-[9px] text-muted-foreground">
            {new Date(comment.created_at).toLocaleString()}
          </span>
        </div>
        <p className={cn('text-[10px] mt-0.5', comment.is_system && 'text-muted-foreground')}>
          {comment.content}
        </p>
      </div>
    </div>
  );
}
