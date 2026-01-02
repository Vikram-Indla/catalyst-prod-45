/**
 * Activity Tabs Component
 * Comments, History, Work Log, SLA, and Test Management tabs for issue drawer
 */

import React, { useState } from 'react';
import { 
  MessageSquare, 
  Clock, 
  Timer, 
  Target,
  TestTube,
  Send,
  ArrowUp,
  ArrowDown,
  User,
  MoreHorizontal,
  Pencil,
  Trash2
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { IssueTestManagementTab } from './IssueTestManagementTab';

interface Comment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  createdAt: string;
  updatedAt?: string;
  isInternal?: boolean;
}

interface HistoryItem {
  id: string;
  field: string;
  fromValue: string | null;
  toValue: string | null;
  actorId: string;
  actorName: string;
  actorAvatar?: string;
  changedAt: string;
}

interface WorkLogEntry {
  id: string;
  timeSpent: string;
  description: string;
  authorId: string;
  authorName: string;
  loggedAt: string;
}

interface SLAStatus {
  name: string;
  status: 'ontrack' | 'breached' | 'paused';
  timeRemaining?: string;
  breachedAt?: string;
}

interface ActivityTabsProps {
  issueId: string;
  issueKey?: string;
  issueTitle?: string;
  issueType?: 'story' | 'feature' | 'defect' | 'epic';
  programId?: string;
  comments: Comment[];
  history: HistoryItem[];
  workLog: WorkLogEntry[];
  slaStatuses: SLAStatus[];
  onAddComment: (content: string, isInternal?: boolean) => void;
  onEditComment?: (commentId: string, content: string) => void;
  onDeleteComment?: (commentId: string) => void;
  onAddWorkLog?: (timeSpent: string, description: string) => void;
  onExecuteTestCase?: (caseId: string) => void;
}

export function ActivityTabs({
  issueId,
  issueKey,
  issueTitle,
  issueType,
  programId,
  comments,
  history,
  workLog,
  slaStatuses,
  onAddComment,
  onEditComment,
  onDeleteComment,
  onAddWorkLog,
  onExecuteTestCase,
}: ActivityTabsProps) {
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;
    onAddComment(newComment, isInternal);
    setNewComment('');
  };

  const sortedComments = [...comments].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });

  const sortedHistory = [...history].sort((a, b) => {
    const dateA = new Date(a.changedAt).getTime();
    const dateB = new Date(b.changedAt).getTime();
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });

  return (
    <Tabs defaultValue="comments" className="w-full">
      <div className="flex items-center justify-between mb-4">
        <TabsList className="h-9 bg-surface-2">
          <TabsTrigger value="comments" className="text-xs gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            Comments
            {comments.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                {comments.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            History
          </TabsTrigger>
          <TabsTrigger value="worklog" className="text-xs gap-1.5">
            <Timer className="h-3.5 w-3.5" />
            Work log
          </TabsTrigger>
          <TabsTrigger value="sla" className="text-xs gap-1.5">
            <Target className="h-3.5 w-3.5" />
            SLA
          </TabsTrigger>
          {programId && issueType && (
            <TabsTrigger value="tests" className="text-xs gap-1.5">
              <TestTube className="h-3.5 w-3.5" />
              Tests
            </TabsTrigger>
          )}
        </TabsList>

        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
        >
          {sortOrder === 'newest' ? (
            <>
              <ArrowDown className="h-3 w-3" /> Newest first
            </>
          ) : (
            <>
              <ArrowUp className="h-3 w-3" /> Oldest first
            </>
          )}
        </Button>
      </div>

      {/* Comments Tab */}
      <TabsContent value="comments" className="mt-0">
        {/* Comment Input */}
        <div className="mb-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-accent-primary text-white">ME</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="min-h-[80px] resize-none"
              />
              <div className="flex items-center justify-between mt-2">
                <label className="flex items-center gap-2 text-xs text-text-tertiary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                    className="rounded border-border-default"
                  />
                  Internal note
                </label>
                <Button 
                  size="sm" 
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim()}
                  className="gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  Send
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Comments List */}
        <div className="space-y-4">
          {sortedComments.length === 0 ? (
            <div className="text-center py-8 text-text-tertiary text-sm">
              No comments yet. Be the first to comment.
            </div>
          ) : (
            sortedComments.map((comment) => (
              <div 
                key={comment.id} 
                className={cn(
                  "flex gap-3 p-3 rounded-lg",
                  comment.isInternal && "bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800"
                )}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={comment.authorAvatar} />
                  <AvatarFallback className="text-xs">
                    {comment.authorName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-primary">
                        {comment.authorName}
                      </span>
                      {comment.isInternal && (
                        <Badge variant="outline" className="text-[10px] h-4 bg-yellow-100 text-yellow-800 border-yellow-300">
                          Internal
                        </Badge>
                      )}
                      <span className="text-xs text-text-tertiary">
                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                      </span>
                      {comment.updatedAt && (
                        <span className="text-xs text-text-quaternary">(edited)</span>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEditComment?.(comment.id, comment.content)}>
                          <Pencil className="mr-2 h-3.5 w-3.5" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => onDeleteComment?.(comment.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="text-sm text-text-secondary mt-1 whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </TabsContent>

      {/* History Tab */}
      <TabsContent value="history" className="mt-0">
        <div className="space-y-3">
          {sortedHistory.length === 0 ? (
            <div className="text-center py-8 text-text-tertiary text-sm">
              No history recorded yet.
            </div>
          ) : (
            sortedHistory.map((item) => (
              <div key={item.id} className="flex gap-3 p-3 bg-surface-2 rounded-lg">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={item.actorAvatar} />
                  <AvatarFallback className="text-[10px]">
                    {item.actorName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1 flex-wrap">
                    <span className="text-sm font-medium text-text-primary">
                      {item.actorName}
                    </span>
                    <span className="text-sm text-text-secondary">
                      changed
                    </span>
                    <span className="text-sm font-medium text-text-primary">
                      {item.field}
                    </span>
                    <span className="text-xs text-text-tertiary ml-auto">
                      {formatDistanceToNow(new Date(item.changedAt), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs">
                    {item.fromValue && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 rounded line-through">
                        {item.fromValue}
                      </span>
                    )}
                    <span className="text-text-quaternary">→</span>
                    {item.toValue && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 rounded">
                        {item.toValue}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </TabsContent>

      {/* Work Log Tab (Stub) */}
      <TabsContent value="worklog" className="mt-0">
        <div className="space-y-3">
          {workLog.length === 0 ? (
            <div className="text-center py-8">
              <Timer className="h-10 w-10 text-text-quaternary mx-auto mb-3" />
              <p className="text-text-tertiary text-sm">No work logged yet.</p>
              <Button variant="outline" size="sm" className="mt-3">
                Log work
              </Button>
            </div>
          ) : (
            workLog.map((entry) => (
              <div key={entry.id} className="flex gap-3 p-3 bg-surface-2 rounded-lg">
                <Timer className="h-5 w-5 text-text-tertiary flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-text-primary">
                      {entry.timeSpent}
                    </span>
                    <span className="text-xs text-text-tertiary">
                      {formatDistanceToNow(new Date(entry.loggedAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary mt-1">
                    {entry.description}
                  </p>
                  <p className="text-xs text-text-tertiary mt-1">
                    by {entry.authorName}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </TabsContent>

      {/* SLA Tab (Stub) */}
      <TabsContent value="sla" className="mt-0">
        <div className="space-y-3">
          {slaStatuses.length === 0 ? (
            <div className="text-center py-8">
              <Target className="h-10 w-10 text-text-quaternary mx-auto mb-3" />
              <p className="text-text-tertiary text-sm">No SLAs configured for this issue.</p>
            </div>
          ) : (
            slaStatuses.map((sla, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-surface-2 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    sla.status === 'ontrack' && "bg-green-500",
                    sla.status === 'breached' && "bg-red-500",
                    sla.status === 'paused' && "bg-yellow-500"
                  )} />
                  <span className="text-sm font-medium text-text-primary">{sla.name}</span>
                </div>
                <div className="text-right">
                  {sla.status === 'ontrack' && sla.timeRemaining && (
                    <span className="text-sm text-green-600">{sla.timeRemaining} remaining</span>
                  )}
                  {sla.status === 'breached' && sla.breachedAt && (
                    <span className="text-sm text-red-600">Breached {sla.breachedAt}</span>
                  )}
                  {sla.status === 'paused' && (
                    <Badge variant="secondary" className="text-xs">Paused</Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </TabsContent>

      {/* Tests Tab */}
      {programId && issueType && issueKey && issueTitle && (
        <TabsContent value="tests" className="mt-0">
          <IssueTestManagementTab
            issueId={issueId}
            issueKey={issueKey}
            issueTitle={issueTitle}
            issueType={issueType}
            programId={programId}
            onExecuteCase={onExecuteTestCase}
          />
        </TabsContent>
      )}
    </Tabs>
  );
}

export default ActivityTabs;
