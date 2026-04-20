import { useState, useRef } from 'react';
import { 
  FileText, Paperclip, Link as LinkIcon, MessageSquare,
  Upload, Download, Trash2, Clock, Users, History, 
  Plus, AlertTriangle, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Lozenge } from '@/components/ads';
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
  uploader?: { full_name: string };
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
  updated_at?: string;
}

interface HistoryItem {
  id: string;
  field_name: string;
  old_value?: string;
  new_value?: string;
  changed_at: string;
  changer?: { full_name: string };
}

interface SlaRecord {
  id: string;
  policy_name?: string;
  response_due_at: string;
  resolution_due_at: string;
  responded_at?: string;
  resolved_at?: string;
  response_breached: boolean;
  resolution_breached: boolean;
}

interface CommitteeMember {
  id: string;
  user?: { id: string; full_name: string; avatar_initials?: string };
  role?: string;
  has_veto: boolean;
  vote?: { vote: string; voted_at?: string; comment?: string };
}

interface Committee {
  id: string;
  status: string;
  decision_note?: string;
  required_approvals?: number;
  assignment_strategy?: 'manual' | 'round_robin';
  members?: CommitteeMember[];
}

interface IncidentWorkAreaProps {
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
  onOpenLinkWorkItem: () => void;
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
          <Lozenge appearance="inprogress">
            {count}
          </Lozenge>
        )}
      </div>
      {actions}
    </div>
  );
}

const COMMENT_TYPE_OPTIONS = [
  { value: 'update', label: 'Update' },
  { value: 'decision', label: 'Decision' },
  { value: 'action', label: 'Action' },
  { value: 'rca', label: 'RCA' },
];

export function IncidentWorkArea({
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
  onOpenLinkWorkItem,
  availableApprovers,
  isUploadPending,
  isCommentPending,
  isVotePending,
}: IncidentWorkAreaProps) {
  const [activeTab, setActiveTab] = useState('comments');
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

  // Filter out system comments from regular comments
  const userComments = comments.filter(c => !c.is_system);

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
                    <p className="text-xs text-muted-foreground">
                      {att.uploader?.full_name || 'Unknown'} • {new Date(att.created_at).toLocaleDateString()}
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
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 px-2.5 text-xs" 
              disabled={isConverted}
              onClick={onOpenLinkWorkItem}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Link work item
            </Button>
          }
        />
        <div className="p-4">
          {convertedToId ? (
            <div className="flex items-center gap-2">
              <Lozenge appearance="default">
                Converted to {convertedToType}
              </Lozenge>
              <span className="font-medium text-primary text-sm">{convertedToId}</span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No linked work items</p>
          )}
        </div>
      </section>

      {/* ========== 4. ACTIVITY (Comments, SLA, Committee, Audit) ========== */}
      <section className="border border-border rounded-lg overflow-hidden bg-background flex-1 flex flex-col min-h-[400px]">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="w-full justify-start rounded-none border-b border-border bg-muted/30 px-2 h-10">
            <TabsTrigger value="comments" className="text-sm h-8 px-3 data-[state=active]:bg-background">
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
              Comments
              {userComments.length > 0 && (
                <span className="ml-1.5">
                  <Lozenge appearance="inprogress">
                    {userComments.length}
                  </Lozenge>
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="sla" className="text-sm h-8 px-3 data-[state=active]:bg-background">
              <Clock className="h-3.5 w-3.5 mr-1.5" />
              SLA
            </TabsTrigger>
            <TabsTrigger value="committee-log" className="text-sm h-8 px-3 data-[state=active]:bg-background">
              <Users className="h-3.5 w-3.5 mr-1.5" />
              Committee Log
            </TabsTrigger>
            <TabsTrigger value="audit-log" className="text-sm h-8 px-3 data-[state=active]:bg-background">
              <History className="h-3.5 w-3.5 mr-1.5" />
              Audit Log
              {history.length > 0 && (
                <span className="ml-1.5">
                  <Lozenge appearance="inprogress">
                    {history.length}
                  </Lozenge>
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Comments Tab */}
          <TabsContent value="comments" className="flex-1 overflow-auto p-0 m-0 flex flex-col">
            {/* Comment composer */}
            <div className="border-b border-border p-4 bg-muted/20">
              <div className="flex gap-3">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">U</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <Textarea
                    placeholder="Add an update for the team..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="min-h-[80px] resize-none text-sm"
                    disabled={isConverted}
                  />
                  <div className="flex items-center justify-between">
                    <Select value={commentType} onValueChange={(v) => setCommentType(v as CommentType)}>
                      <SelectTrigger className="w-32 h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COMMENT_TYPE_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value} className="text-sm">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      size="sm"
                      className="h-8 px-4 text-sm"
                      onClick={handlePostComment} 
                      disabled={!commentText.trim() || isCommentPending || isConverted}
                    >
                      Add comment
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Comments list */}
            <div className="divide-y divide-border flex-1 overflow-auto">
              {userComments.length > 0 ? (
                userComments.map(comment => (
                  <CommentItem key={comment.id} comment={comment} />
                ))
              ) : (
                <p className="text-sm text-muted-foreground p-4">
                  No comments yet. Add an update for the team.
                </p>
              )}
            </div>
          </TabsContent>

          {/* SLA Tab */}
          <TabsContent value="sla" className="flex-1 overflow-auto p-0 m-0">
            {sla ? (
              <div className="divide-y divide-border">
                {sla.policy_name && (
                  <div className="flex items-center justify-between px-3 py-1.5 bg-muted/30 text-xs">
                    <span className="text-muted-foreground">Policy:</span>
                    <span className="font-medium">{sla.policy_name}</span>
                  </div>
                )}
                {/* Response SLA - compact row */}
                <div className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-medium">Response</span>
                    <span className="text-[11px] text-muted-foreground truncate">
                      Due {new Date(sla.response_due_at).toLocaleString()}
                      {sla.responded_at && ` • Done ${new Date(sla.responded_at).toLocaleString()}`}
                    </span>
                  </div>
                  <Lozenge
                    appearance={
                      sla.response_breached
                        ? 'removed'
                        : sla.responded_at
                          ? 'success'
                          : 'moved'
                    }
                  >
                    {sla.response_breached ? 'Breached' : sla.responded_at ? 'Met' : 'On track'}
                  </Lozenge>
                </div>
                {/* Resolution SLA - compact row */}
                <div className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-medium">Resolution</span>
                    <span className="text-[11px] text-muted-foreground truncate">
                      Due {new Date(sla.resolution_due_at).toLocaleString()}
                      {sla.resolved_at && ` • Done ${new Date(sla.resolved_at).toLocaleString()}`}
                    </span>
                  </div>
                  <Lozenge
                    appearance={
                      sla.resolution_breached
                        ? 'removed'
                        : sla.resolved_at
                          ? 'success'
                          : 'moved'
                    }
                  >
                    {sla.resolution_breached ? 'Breached' : sla.resolved_at ? 'Met' : 'On track'}
                  </Lozenge>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground px-3 py-2">No SLA configured for this severity.</p>
            )}
          </TabsContent>

          {/* Committee Log Tab */}
          <TabsContent value="committee-log" className="flex-1 overflow-auto p-0 m-0">
            {committee ? (
              <div className="divide-y divide-border">
                {/* Summary row */}
                <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
                  <span className="text-xs">
                    {committee.members?.filter(m => m.vote?.vote === 'approved').length || 0}/{committee.required_approvals || 2} approvals
                  </span>
                  <Lozenge
                    appearance={
                      committee.status === 'approved'
                        ? 'success'
                        : committee.status === 'rejected'
                          ? 'removed'
                          : committee.status === 'pending'
                            ? 'moved'
                            : 'default'
                    }
                  >
                    {committee.status === 'pending' ? 'In Review' :
                     committee.status.charAt(0).toUpperCase() + committee.status.slice(1)}
                  </Lozenge>
                </div>
                {/* Approvers - compact rows */}
                {committee.members?.map(member => (
                  <div key={member.id} className="flex items-center gap-2 px-3 py-1.5">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[9px] bg-primary text-primary-foreground">
                        {member.user?.avatar_initials || member.user?.full_name?.slice(0, 2) || '??'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium truncate flex-1">
                      {member.user?.full_name || 'Unknown'}
                      {member.has_veto && <span className="ml-1 text-[10px] text-amber-600">(V)</span>}
                      {member.role && <span className="ml-1 text-[10px] text-muted-foreground">• {member.role}</span>}
                    </span>
                    <Lozenge
                      appearance={
                        member.vote?.vote === 'approved'
                          ? 'success'
                          : member.vote?.vote === 'rejected'
                            ? 'removed'
                            : member.vote?.vote === 'vetoed'
                              ? 'moved'
                              : 'default'
                      }
                    >
                      {member.vote?.vote === 'pending' ? 'Pending' :
                       member.vote?.vote ? member.vote.vote.charAt(0).toUpperCase() + member.vote.vote.slice(1) : 'Pending'}
                    </Lozenge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground px-3 py-2">No committee created.</p>
            )}
          </TabsContent>

          {/* Audit Log Tab */}
          <TabsContent value="audit-log" className="flex-1 overflow-auto p-0 m-0">
            {/* Banner */}
            <div className="px-3 py-1 bg-muted/50 border-b border-border text-[10px] text-muted-foreground">
              Immutable log. All changes recorded with actor & timestamp.
            </div>
            <div className="divide-y divide-border">
              {history.length > 0 ? (
                history.map(h => (
                  <div key={h.id} className="flex items-center gap-2 px-3 py-1.5">
                    <History className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="text-[11px] flex-1 min-w-0 truncate">
                      <span className="font-medium">{h.field_name}</span>
                      <span className="text-muted-foreground"> {h.old_value || '∅'} → </span>
                      <span className="font-medium">{h.new_value || '∅'}</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {h.changer?.full_name?.split(' ')[0] || 'Sys'} • {new Date(h.changed_at).toLocaleDateString()}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground px-3 py-2">No history.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </section>

      {/* ========== 6. RESOLUTION (Conditional) ========== */}
      {(status === 'resolved' || status === 'closed') && (
        <section className="border border-border rounded-lg overflow-hidden bg-background">
          <SectionHeader 
            title="Resolution" 
            icon={Check}
          />
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Resolution Summary <span className="text-destructive">*</span>
              </label>
              <Textarea
                value={resolutionSummary || ''}
                onChange={(e) => onResolutionChange('resolution_summary', e.target.value)}
                placeholder="Describe how the incident was resolved..."
                className="min-h-[100px] text-sm"
                disabled={isConverted || status === 'closed'}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Resolution Type
                </label>
                <Select 
                  value={resolutionType || ''} 
                  onValueChange={(v) => onResolutionChange('resolution_type', v)}
                  disabled={isConverted || status === 'closed'}
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
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Root Cause
                </label>
                <Textarea
                  value={rootCause || ''}
                  onChange={(e) => onResolutionChange('root_cause', e.target.value)}
                  placeholder="Document root cause..."
                  className="min-h-[50px] text-sm"
                  disabled={isConverted || status === 'closed'}
                />
              </div>
            </div>
            
            {closedAt && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <span className="text-xs text-muted-foreground">Closed at: </span>
                <span className="text-sm font-medium">{new Date(closedAt).toLocaleString()}</span>
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}

// Comment Item Component
function CommentItem({ comment }: { comment: Comment }) {
  const COMMENT_TYPE_APPEARANCE: Record<string, 'moved' | 'inprogress' | 'new'> = {
    decision: 'moved',
    action: 'inprogress',
    rca: 'new',
  };

  const isEdited = comment.updated_at && comment.updated_at !== comment.created_at;

  return (
    <div className="flex gap-3 p-4">
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarFallback className="text-xs bg-primary text-primary-foreground">
          {comment.author?.avatar_initials || comment.author_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">
            {comment.author?.full_name || comment.author_name || 'Unknown'}
          </span>
          {comment.comment_type !== 'update' && COMMENT_TYPE_APPEARANCE[comment.comment_type] && (
            <Lozenge appearance={COMMENT_TYPE_APPEARANCE[comment.comment_type]}>
              {comment.comment_type.charAt(0).toUpperCase() + comment.comment_type.slice(1)}
            </Lozenge>
          )}
          <span className="text-xs text-muted-foreground">
            {new Date(comment.created_at).toLocaleString()}
          </span>
          {isEdited && (
            <span className="text-xs text-muted-foreground italic">(Edited)</span>
          )}
        </div>
        <p className="text-sm mt-1 leading-relaxed whitespace-pre-wrap">
          {comment.content}
        </p>
      </div>
    </div>
  );
}
