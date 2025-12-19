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
  old_value: string | null;
  new_value: string;
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
    <div className="flex-1 overflow-auto p-6 space-y-6">
      {/* 1. Description */}
      <section className="border border-border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
          <h2 className="font-medium text-sm">Description</h2>
          {isEditingDescription ? (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsEditingDescription(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveDescription}>Save</Button>
            </div>
          ) : (
            <Button 
              variant="ghost" 
              size="sm" 
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
        <div className="p-4">
          {isEditingDescription ? (
            <Textarea
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              className="min-h-[120px] resize-y"
              placeholder="Describe the incident..."
            />
          ) : (
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {description || 'No description provided.'}
            </p>
          )}
        </div>
      </section>

      {/* 2. Attachments */}
      <section className="border border-border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
          <h2 className="font-medium text-sm">Attachments ({attachments.length})</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            disabled={isConverted || isUploadPending}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-1" />
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
        <div className="p-4">
          {attachments.length > 0 ? (
            <div className="space-y-2">
              {attachments.map(att => (
                <div key={att.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 group">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p 
                      className="text-sm font-medium truncate text-brand-primary hover:underline cursor-pointer"
                      onClick={() => onDownloadFile(att.storage_path, att.file_name)}
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
            <p className="text-sm text-muted-foreground">No attachments yet.</p>
          )}
        </div>
      </section>

      {/* 3. Linked Work Items */}
      <section className="border border-border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
          <h2 className="font-medium text-sm">Linked Work Items</h2>
          <Button variant="ghost" size="sm" disabled={!isConverted}>
            <LinkIcon className="h-4 w-4 mr-1" />
            Link
          </Button>
        </div>
        <div className="p-4">
          {convertedToId ? (
            <p className="text-sm">
              Converted to {convertedToType}: <span className="font-medium text-brand-primary">{convertedToId}</span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No linked work items. This incident has not been converted.
            </p>
          )}
        </div>
      </section>

      {/* 4. Activity Tabs */}
      <section className="border border-border rounded-lg overflow-hidden flex-1 flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="w-full justify-start rounded-none border-b border-border bg-muted/30 px-2 h-auto py-1">
            <TabsTrigger value="activity" className="text-sm">Activity</TabsTrigger>
            <TabsTrigger value="sla-history" className="text-sm">SLA History</TabsTrigger>
            <TabsTrigger value="approvals" className="text-sm">Approvals</TabsTrigger>
            <TabsTrigger value="audit-log" className="text-sm">Audit Log</TabsTrigger>
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
                    <span className="text-sm">Response SLA breached</span>
                  </div>
                )}
                {sla.resolution_breached && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">Resolution SLA breached</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No SLA configured for this severity.</p>
            )}
          </TabsContent>

          {/* Approvals Tab */}
          <TabsContent value="approvals" className="p-4">
            {committee ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm font-medium">Committee Status</span>
                  <Badge variant={
                    committee.status === 'approved' ? 'default' : 
                    committee.status === 'rejected' ? 'destructive' : 'secondary'
                  } className={committee.status === 'approved' ? 'bg-secondary-green' : ''}>
                    {committee.status.charAt(0).toUpperCase() + committee.status.slice(1)}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Committee Members</h4>
                  {committee.members?.map(member => {
                    const vote = committee.votes?.find(v => v.member_id === member.id);
                    return (
                      <div key={member.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs bg-brand-primary text-white">
                              {member.user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{member.user?.full_name || 'Unknown'}</p>
                            {member.has_veto && (
                              <span className="text-xs text-muted-foreground">Has veto power</span>
                            )}
                          </div>
                        </div>
                        <div>
                          {vote ? (
                            <Badge variant={
                              vote.vote === 'approved' ? 'default' : 
                              vote.vote === 'rejected' || vote.vote === 'vetoed' ? 'destructive' : 'secondary'
                            } className={vote.vote === 'approved' ? 'bg-secondary-green' : ''}>
                              {vote.vote === 'vetoed' ? 'Vetoed' : vote.vote.charAt(0).toUpperCase() + vote.vote.slice(1)}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Pending</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {committee.status === 'pending' && (
                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => onVote('rejected')}
                      disabled={isVotePending}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                    <Button 
                      className="flex-1 bg-secondary-green hover:bg-secondary-green/90"
                      onClick={() => onVote('approved')}
                      disabled={isVotePending}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                  </div>
                )}

                {committee.decision_note && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Decision Note</p>
                    <p className="text-sm">{committee.decision_note}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {requiresCommittee 
                    ? 'Committee review not yet initiated. Click "Send to Committee" to start.'
                    : 'This incident does not require committee approval.'}
                </p>
              </div>
            )}
          </TabsContent>

          {/* Audit Log Tab */}
          <TabsContent value="audit-log" className="flex-1 overflow-auto p-0 m-0">
            <div className="divide-y divide-border">
              {history.map(h => (
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
              <AvatarFallback className="text-xs bg-secondary-bronze text-white">U</AvatarFallback>
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
                  disabled={!commentText.trim() || isCommentPending}
                >
                  Post Comment
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// Activity Item Component
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
