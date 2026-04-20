import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { X, Edit2, Save, Loader2, Archive } from 'lucide-react';
import { WorkItem, PRIORITY_CONFIG } from '../types';
import { WorkTypeIcon } from './WorkTypeIcon';
import { PriorityIcon } from './PriorityIcon';
import { StatusLozenge } from './StatusLozenge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, Tooltip } from '@/components/ads';
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

  // Fetch Jira sync fields for current work item
  const { data: jiraData } = useQuery({
    queryKey: ['work-item-jira-sync', item?.id],
    queryFn: async () => {
      if (!item?.id) return null;
      const { data } = await (supabase.from('ph_work_items') as any)
        .select('jira_key, jira_sync_status, jira_pushed_at, sync_source, item_key, last_synced_at')
        .eq('id', item.id)
        .maybeSingle();
      return data as { jira_key: string | null; jira_sync_status: string | null; jira_pushed_at: string | null; sync_source: string | null; item_key: string | null; last_synced_at: string | null } | null;
    },
    enabled: !!item?.id,
  });


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
                <Tooltip content="Edit">
                  <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </Tooltip>
              )}
              <Tooltip content="Archive">
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
              </Tooltip>
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
                  <Avatar name={item.assigneeName || 'Assignee'} size="xsmall" />
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
                  <Avatar name={item.reporterName || 'Reporter'} size="xsmall" />
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
                  <Tooltip content="Coming soon">
                    <Button variant="ghost" size="sm" disabled>+ Add</Button>
                  </Tooltip>
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
                  <Tooltip content="Coming soon">
                    <Button variant="ghost" size="sm" disabled>+ Log</Button>
                  </Tooltip>
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
                  <Tooltip content="Coming soon">
                    <Button variant="ghost" size="sm" disabled>+ Log</Button>
                  </Tooltip>
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

          {/* Jira Sync Status — show when jira_key exists OR sync_source is jira */}
          {jiraData?.jira_key && (
            <div className="border-t border-[var(--bd-default, #E2E8F0)] dark:border-[#1A1A1A] pt-4 mt-4">
              <label className="block text-[11px] font-semibold text-[#6B7280] dark:text-[#9C8E7E] uppercase mb-3" style={{ fontWeight: 650 }}>
                Jira Sync
              </label>
              <div className="space-y-2.5">
                {/* Row 1: Jira Key */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#6B7280] dark:text-[#9C8E7E]">Jira Issue</span>
                  <span
                    className="font-mono text-[12px] px-2 py-0.5 rounded bg-[#F1F5F9] text-[#1E293B] dark:bg-[#1A1A1A] dark:text-[#E2D5C3]"
                    style={{ borderRadius: 4 }}
                  >
                    {jiraData.jira_key || jiraData.item_key || '—'}
                  </span>
                </div>
                {/* Row 2: Sync Status */}
                {jiraData.jira_sync_status && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#6B7280] dark:text-[#9C8E7E]">Sync Status</span>
                    <span
                      className="inline-flex items-center justify-center uppercase text-[11px] font-bold px-2"
                      style={{
                        height: 20,
                        borderRadius: 4,
                        letterSpacing: '0.05em',
                        backgroundColor:
                          jiraData.jira_sync_status === 'synced' || jiraData.jira_sync_status === 'pushed' ? '#E3FCEF' :
                          jiraData.jira_sync_status === 'queued' || jiraData.jira_sync_status === 'approval_pending' ? '#DEEBFF' :
                          '#DFE1E6',
                        color:
                          jiraData.jira_sync_status === 'synced' || jiraData.jira_sync_status === 'pushed' ? '#006644' :
                          jiraData.jira_sync_status === 'queued' || jiraData.jira_sync_status === 'approval_pending' ? '#0747A6' :
                          '#253858',
                      }}
                    >
                      {jiraData.jira_sync_status}
                    </span>
                  </div>
                )}
                {/* Row 3: Last Synced */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#6B7280] dark:text-[#9C8E7E]">Last Synced</span>
                  <span className="text-[12px] text-[#334155] dark:text-[#E2D5C3]">
                    {(jiraData.jira_pushed_at || jiraData.last_synced_at)
                      ? format(new Date(jiraData.jira_pushed_at || jiraData.last_synced_at!), 'MMM d, yyyy, hh:mm a')
                      : '—'}
                  </span>
                </div>
              </div>
            </div>
          )}
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
              <Tooltip content="Coming soon">
                <span>
                  <Button disabled>Comment</Button>
                </span>
              </Tooltip>
            </div>
          </div>

          {/* Activity History */}
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase mb-3">
              History
            </label>
            <div className="flex flex-col gap-4">
              <div className="flex gap-2">
                <Avatar name="System" size="xsmall" />
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
