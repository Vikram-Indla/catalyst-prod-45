import React, { useState } from 'react';
import { X } from 'lucide-react';
import { WorkItem } from '../types';
import { WorkTypeIcon } from './WorkTypeIcon';
import { PriorityIcon } from './PriorityIcon';
import { StatusLozenge } from './StatusLozenge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';

interface WorkItemDetailsDrawerProps {
  item: WorkItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (item: WorkItem) => void;
}

export const WorkItemDetailsDrawer: React.FC<WorkItemDetailsDrawerProps> = ({
  item,
  isOpen,
  onClose,
  onUpdate,
}) => {
  const [comment, setComment] = useState('');

  if (!isOpen || !item) return null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  return (
    <div className="fixed top-0 right-0 bottom-0 w-[480px] bg-background shadow-xl z-[1000] flex flex-col border-l border-border">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <WorkTypeIcon type={item.type} size="small" />
            <span className="text-sm text-muted-foreground font-medium">
              {item.key}
            </span>
          </div>
          <h2 className="text-lg font-semibold text-foreground leading-snug">
            {item.summary}
          </h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 px-4 pt-2">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="flex-1 overflow-y-auto p-4">
          {/* Status & Priority */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground uppercase mb-1">
                Status
              </label>
              <StatusLozenge status={item.status} statusCategory={item.statusCategory} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground uppercase mb-1">
                Priority
              </label>
              <div className="flex items-center gap-1">
                <PriorityIcon priority={item.priority} />
                <span className="text-sm text-foreground">
                  {item.priority}
                </span>
              </div>
            </div>
          </div>

          {/* Assignee & Reporter */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground uppercase mb-1">
                Assignee
              </label>
              {item.assigneeId ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {(item.assigneeName?.[0] || 'A').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-foreground">
                    {item.assigneeName || 'Assignee'}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">
                  Unassigned
                </span>
              )}
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground uppercase mb-1">
                Reporter
              </label>
              {item.reporterId ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {(item.reporterName?.[0] || 'R').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-foreground">
                    {item.reporterName || 'Reporter'}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">
                  None
                </span>
              )}
            </div>
          </div>

          {/* Quarter & Release */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground uppercase mb-1">
                Quarter
              </label>
              <span className="text-sm text-foreground">
                {item.quarterId || 'None'}
              </span>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground uppercase mb-1">
                Release Version
              </label>
              <span className="text-sm text-foreground">
                {item.releaseVersionId || 'None'}
              </span>
            </div>
          </div>

          {/* Due Date */}
          <div className="mb-6">
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase mb-1">
              Due Date
            </label>
            <span className="text-sm text-foreground">
              {item.dueDate ? formatDate(item.dueDate) : 'None'}
            </span>
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase mb-2">
              Description
            </label>
            <p className="text-sm text-foreground leading-relaxed">
              {item.description || 'No description provided.'}
            </p>
          </div>

          {/* Child Items Section (for Stories) */}
          {item.type === 'STORY' && (
            <>
              {/* Subtasks */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                    Subtasks ({item.subtaskCount || 0})
                  </label>
                  <Button variant="ghost" size="sm">+ Add</Button>
                </div>
                {(item.subtaskCount || 0) === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No subtasks
                  </p>
                )}
              </div>

              {/* Defects */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                    Defects ({item.defectCount || 0})
                  </label>
                  <Button variant="ghost" size="sm">+ Log</Button>
                </div>
                {(item.defectCount || 0) === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No defects
                  </p>
                )}
              </div>

              {/* Incidents */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                    Incidents ({item.incidentCount || 0})
                  </label>
                  <Button variant="ghost" size="sm">+ Log</Button>
                </div>
                {(item.incidentCount || 0) === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No incidents
                  </p>
                )}
              </div>
            </>
          )}

          {/* Dates */}
          <div className="border-t border-border pt-4 mt-4">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Created: {formatDate(item.createdAt)}</span>
              <span>Updated: {formatDate(item.updatedAt)}</span>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="flex-1 overflow-y-auto p-4">
          {/* Add Comment */}
          <div className="mb-6">
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase mb-2">
              Add Comment
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment..."
              className="min-h-[60px]"
            />
            <div className="mt-2 text-right">
              <Button disabled={!comment.trim()}>
                Comment
              </Button>
            </div>
          </div>

          {/* Activity History */}
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase mb-3">
              History
            </label>
            
            {/* Mock Activity Items */}
            <div className="flex flex-col gap-4">
              <div className="flex gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">JD</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm text-foreground">
                    <strong>John Doe</strong> created this item
                  </p>
                  <span className="text-[11px] text-muted-foreground">
                    {formatDate(item.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
