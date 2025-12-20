import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { X, Edit2, Save, Loader2, Archive } from 'lucide-react';
import { WorkItem, PRIORITY_CONFIG } from '../types';
import { WorkTypeIcon } from './WorkTypeIcon';
import { PriorityIcon } from './PriorityIcon';
import { StatusLozenge } from './StatusLozenge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { mapToStoryStatus, mapToFeatureStatus } from '../utils/statusMapping';

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
}) => {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editedSummary, setEditedSummary] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedStatus, setEditedStatus] = useState('');
  const [comment, setComment] = useState('');

  // Sync state when item changes
  useEffect(() => {
    if (item) {
      setEditedSummary(item.summary);
      setEditedDescription(item.description || '');
      setEditedStatus(item.status);
      setIsEditing(false);
    }
  }, [item]);

  // Update story/feature mutation
  const updateItem = useMutation({
    mutationFn: async ({ 
      id, 
      type, 
      summary, 
      description, 
      status 
    }: { 
      id: string; 
      type: 'FEATURE' | 'STORY'; 
      summary?: string; 
      description?: string;
      status?: string;
    }) => {
      if (type === 'STORY') {
        const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
        if (summary !== undefined) updateData.title = summary;
        if (description !== undefined) updateData.description = description;
        if (status !== undefined) updateData.status = mapToStoryStatus(status);

        const { error } = await supabase
          .from('stories')
          .update(updateData)
          .eq('id', id);

        if (error) throw error;
      } else if (type === 'FEATURE') {
        const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
        if (summary !== undefined) updateData.name = summary;
        if (description !== undefined) updateData.description = description;
        if (status !== undefined) updateData.status = mapToFeatureStatus(status);

        const { error } = await supabase
          .from('features')
          .update(updateData)
          .eq('id', id);

        if (error) throw error;
      }
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-items'] });
      queryClient.invalidateQueries({ queryKey: ['features'] });
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      toast.success('Item updated');
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast.error('Failed to update', { description: error.message });
    },
  });

  // Archive mutation
  const archiveItem = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: 'FEATURE' | 'STORY' }) => {
      const now = new Date().toISOString();
      if (type === 'STORY') {
        const { error } = await supabase
          .from('stories')
          .update({ deleted_at: now, updated_at: now })
          .eq('id', id);
        if (error) throw error;
      } else if (type === 'FEATURE') {
        const { error } = await supabase
          .from('features')
          .update({ deleted_at: now, updated_at: now })
          .eq('id', id);
        if (error) throw error;
      }
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-items'] });
      queryClient.invalidateQueries({ queryKey: ['archived-items'] });
      queryClient.invalidateQueries({ queryKey: ['features'] });
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      toast.success('Item archived');
      onClose();
    },
    onError: (error: any) => {
      toast.error('Failed to archive', { description: error.message });
    },
  });

  if (!isOpen || !item) return null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  const handleSave = () => {
    if (item.type !== 'FEATURE' && item.type !== 'STORY') {
      toast.error('Editing not supported for this item type');
      return;
    }
    
    updateItem.mutate({
      id: item.id,
      type: item.type as 'FEATURE' | 'STORY',
      summary: editedSummary,
      description: editedDescription,
      status: editedStatus,
    });
  };

  const handleStatusChange = (newStatus: string) => {
    setEditedStatus(newStatus);
    // Immediately save status change
    if (item.type === 'FEATURE' || item.type === 'STORY') {
      updateItem.mutate({
        id: item.id,
        type: item.type as 'FEATURE' | 'STORY',
        status: newStatus,
      });
    }
  };

  const handleArchive = () => {
    if (item.type !== 'FEATURE' && item.type !== 'STORY') {
      toast.error('Archive not supported for this item type');
      return;
    }
    archiveItem.mutate({ id: item.id, type: item.type as 'FEATURE' | 'STORY' });
  };

  const statusOptions = item.type === 'FEATURE' 
    ? ['funnel', 'analyzing', 'backlog', 'implementing', 'done']
    : ['todo', 'in_progress', 'done'];

  const canEdit = item.type === 'FEATURE' || item.type === 'STORY';

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
          {isEditing ? (
            <Input
              value={editedSummary}
              onChange={(e) => setEditedSummary(e.target.value)}
              className="text-lg font-semibold"
            />
          ) : (
            <h2 className="text-lg font-semibold text-foreground leading-snug">
              {item.summary}
            </h2>
          )}
        </div>
        <div className="flex items-center gap-1">
          {canEdit && (
            <>
              {isEditing ? (
                <Button 
                  variant="default" 
                  size="icon" 
                  onClick={handleSave}
                  disabled={updateItem.isPending}
                >
                  {updateItem.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                </Button>
              ) : (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={handleArchive}
                      disabled={archiveItem.isPending}
                    >
                      {archiveItem.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Archive className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Archive</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
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
              {canEdit ? (
                <Select value={editedStatus} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <StatusLozenge status={item.status} statusCategory={item.statusCategory} />
              )}
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground uppercase mb-1">
                Priority
              </label>
              <div className="flex items-center gap-1">
                <PriorityIcon priority={item.priority} />
                <span className="text-sm text-foreground">
                  {PRIORITY_CONFIG[item.priority]?.label || item.priority}
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

          {/* Description */}
          <div className="mb-6">
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase mb-2">
              Description
            </label>
            {isEditing ? (
              <Textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                placeholder="Add a description..."
                rows={4}
              />
            ) : (
              <p className="text-sm text-foreground leading-relaxed">
                {item.description || 'No description provided.'}
              </p>
            )}
          </div>

          {/* Child Items Section (for Stories) */}
          {item.type === 'STORY' && (
            <>
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                    Subtasks ({item.subtaskCount || 0})
                  </label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" disabled>+ Add</Button>
                      </TooltipTrigger>
                      <TooltipContent>Coming soon</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                {(item.subtaskCount || 0) === 0 && (
                  <p className="text-sm text-muted-foreground">No subtasks</p>
                )}
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                    Defects ({item.defectCount || 0})
                  </label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" disabled>+ Log</Button>
                      </TooltipTrigger>
                      <TooltipContent>Coming soon</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                {(item.defectCount || 0) === 0 && (
                  <p className="text-sm text-muted-foreground">No defects</p>
                )}
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                    Incidents ({item.incidentCount || 0})
                  </label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" disabled>+ Log</Button>
                      </TooltipTrigger>
                      <TooltipContent>Coming soon</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                {(item.incidentCount || 0) === 0 && (
                  <p className="text-sm text-muted-foreground">No incidents</p>
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
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button disabled>Comment</Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Coming soon</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* Activity History */}
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase mb-3">
              History
            </label>
            <div className="flex flex-col gap-4">
              <div className="flex gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">SY</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm text-foreground">
                    <strong>System</strong> created this item
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
