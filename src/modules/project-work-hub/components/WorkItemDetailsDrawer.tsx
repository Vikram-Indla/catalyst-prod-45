import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import EditIcon from '@atlaskit/icon/core/edit';
import CheckMarkIcon from '@atlaskit/icon/core/check-mark';
import ArchiveIcon from '@atlaskit/icon/glyph/archive';
import Spinner from '@atlaskit/spinner';
import Button, { IconButton } from '@atlaskit/button/new';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import Textfield from '@atlaskit/textfield';
import Select from '@atlaskit/select';
import { WorkItem, PRIORITY_CONFIG } from '../types';
import { WorkTypeIcon } from './WorkTypeIcon';
import { PriorityIcon } from './PriorityIcon';
import { StatusLozenge } from './StatusLozenge';
import { Avatar, Tooltip } from '@/components/ads';
import { toast } from '@/components/ui/sonner';
import { mapToStoryStatus, mapToFeatureStatus } from '../utils/statusMapping';
import EpicDescriptionEditor from '@/components/shared/rich-text/atlaskit/EpicDescriptionEditor';
import EpicDescriptionRenderer from '@/components/shared/rich-text/atlaskit/EpicDescriptionRenderer';
import { isAdfEmpty } from '@/components/shared/rich-text/atlaskit/adfHelpers';
import { prefetchEpicEditor } from '@/lib/atlaskitPrefetch';

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
  const [editedStatus, setEditedStatus] = useState('');
  const [isDescriptionEditing, setIsDescriptionEditing] = useState(false);

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
      setEditedStatus(item.status);
      setIsEditing(false);
      setIsDescriptionEditing(false);
    }
  }, [item]);

  const updateItem = useMutation({
    mutationFn: async ({
      id,
      type,
      summary,
      description,
      status,
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

        const { error } = await supabase.from('stories').update(updateData).eq('id', id);
        if (error) throw error;
      } else if (type === 'FEATURE') {
        const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
        if (summary !== undefined) updateData.name = summary;
        if (description !== undefined) updateData.description = description;
        if (status !== undefined) updateData.status = mapToFeatureStatus(status);

        const { error } = await supabase.from('features').update(updateData).eq('id', id);
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
      setIsDescriptionEditing(false);
    },
    onError: (error: any) => {
      toast.error('Failed to update', { description: error.message });
    },
  });

  const archiveItem = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: 'FEATURE' | 'STORY' }) => {
      const now = new Date().toISOString();
      if (type === 'STORY') {
        const { error } = await supabase.from('stories').update({ deleted_at: now, updated_at: now }).eq('id', id);
        if (error) throw error;
      } else if (type === 'FEATURE') {
        const { error } = await supabase.from('features').update({ deleted_at: now, updated_at: now }).eq('id', id);
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
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(dateStr));
  };

  const handleSave = () => {
    if (item.type !== 'FEATURE' && item.type !== 'STORY') {
      toast.error('Editing not supported for this item type');
      return;
    }
    updateItem.mutate({ id: item.id, type: item.type as 'FEATURE' | 'STORY', summary: editedSummary });
  };

  const handleStatusChange = (newStatus: string) => {
    setEditedStatus(newStatus);
    if (item.type === 'FEATURE' || item.type === 'STORY') {
      updateItem.mutate({ id: item.id, type: item.type as 'FEATURE' | 'STORY', status: newStatus });
    }
  };

  const handleArchive = () => {
    if (item.type !== 'FEATURE' && item.type !== 'STORY') {
      toast.error('Archive not supported for this item type');
      return;
    }
    archiveItem.mutate({ id: item.id, type: item.type as 'FEATURE' | 'STORY' });
  };

  const handleDescriptionSave = useCallback((adfJson: string) => {
    if (!item || (item.type !== 'FEATURE' && item.type !== 'STORY')) return;
    updateItem.mutate({ id: item.id, type: item.type as 'FEATURE' | 'STORY', description: adfJson });
  }, [item, updateItem]);

  const handleDescriptionCancel = useCallback(() => {
    setIsDescriptionEditing(false);
  }, []);

  const statusOptions = item.type === 'FEATURE'
    ? ['funnel', 'analyzing', 'backlog', 'implementing', 'done']
    : ['todo', 'in_progress', 'done'];

  const statusSelectOptions = statusOptions.map(s => ({
    label: s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value: s,
  }));

  const canEdit = item.type === 'FEATURE' || item.type === 'STORY';
  const descIsEmpty = isAdfEmpty(item.description ?? null);

  return (
    <div className="fixed top-0 right-0 bottom-0 w-[480px] bg-background shadow-xl z-[1000] flex flex-col border-l border-border">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <WorkTypeIcon type={item.type} size="small" />
            <span className="text-sm text-muted-foreground font-medium">{item.key}</span>
          </div>
          {isEditing ? (
            <Textfield
              value={editedSummary}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditedSummary(e.target.value)}
              autoFocus
            />
          ) : (
            <h2 className="text-lg font-semibold text-foreground leading-snug">{item.summary}</h2>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {canEdit && (
            <>
              {isEditing ? (
                <Tooltip content="Save">
                  <IconButton
                    appearance="subtle"
                    spacing="compact"
                    icon={updateItem.isPending ? () => <Spinner size="small" /> : CheckMarkIcon}
                    label="Save"
                    onClick={handleSave}
                    isDisabled={updateItem.isPending}
                  />
                </Tooltip>
              ) : (
                <Tooltip content="Edit">
                  <IconButton
                    appearance="subtle"
                    spacing="compact"
                    icon={EditIcon}
                    label="Edit"
                    onClick={() => setIsEditing(true)}
                  />
                </Tooltip>
              )}
              <Tooltip content="Archive">
                <IconButton
                  appearance="subtle"
                  spacing="compact"
                  icon={archiveItem.isPending ? () => <Spinner size="small" /> : ArchiveIcon}
                  label="Archive"
                  onClick={handleArchive}
                  isDisabled={archiveItem.isPending}
                />
              </Tooltip>
            </>
          )}
          <Tooltip content="Close">
            <IconButton
              appearance="subtle"
              spacing="compact"
              icon={CrossIcon}
              label="Close"
              onClick={onClose}
            />
          </Tooltip>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Tabs id="work-item-drawer-tabs">
          <div className="px-4 pt-2 border-b border-border">
            <TabList>
              <Tab>Details</Tab>
              <Tab>Activity</Tab>
            </TabList>
          </div>

          {/* Details tab */}
          <TabPanel>
            <div className="overflow-y-auto p-4 h-full">
              {/* Status */}
              <div className="mb-6">
                <label className="block text-[11px] font-semibold text-muted-foreground uppercase mb-1">
                  Status
                </label>
                {canEdit ? (
                  <Select
                    options={statusSelectOptions}
                    value={statusSelectOptions.find(o => o.value === editedStatus) ?? null}
                    onChange={(opt) => opt && handleStatusChange(opt.value)}
                    menuPortalTarget={document.body}
                  />
                ) : (
                  <StatusLozenge status={item.status} statusCategory={item.statusCategory} />
                )}
              </div>

              {/* Key Details */}
              <div className="mb-6 p-3 bg-muted rounded-md border border-border">
                <h4 className="text-[11px] font-semibold text-muted-foreground uppercase mb-3">
                  Key Details
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground uppercase mb-1">
                      Parent
                    </label>
                    <span className="text-sm text-foreground">
                      {item.parentKey ? `${item.parentKey} — ${item.parentSummary ?? ''}` : 'None'}
                    </span>
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
                      <span className="text-sm text-foreground">{item.assigneeName || 'Assignee'}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Unassigned</span>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground uppercase mb-1">
                    Reporter
                  </label>
                  {item.reporterId ? (
                    <div className="flex items-center gap-2">
                      <Avatar name={item.reporterName || 'Reporter'} size="xsmall" />
                      <span className="text-sm text-foreground">{item.reporterName || 'Reporter'}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">None</span>
                  )}
                </div>
              </div>

              {/* Description — ADF click-to-edit */}
              <div className="mb-6">
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}
                >
                  <h2
                    style={{
                      margin: 0, padding: 0,
                      fontSize: 14, fontWeight: 500, lineHeight: '19px',
                      color: 'var(--ds-text-subtle, #505258)',
                      fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", sans-serif',
                    }}
                  >
                    Description
                  </h2>
                </div>

                {isDescriptionEditing && canEdit ? (
                  <div style={{ paddingLeft: 0 }}>
                    <Suspense fallback={<div style={{ padding: 12, color: 'var(--ds-text-subtlest)', fontSize: 13 }}><Spinner size="small" /></div>}>
                      <EpicDescriptionEditor
                        initialContent={item.description ?? null}
                        onSave={handleDescriptionSave}
                        onCancel={handleDescriptionCancel}
                        workItemId={item.id}
                        placeholder="Add a description..."
                      />
                    </Suspense>
                  </div>
                ) : descIsEmpty ? (
                  <div
                    onClick={() => { if (canEdit) setIsDescriptionEditing(true); }}
                    style={{
                      fontSize: 14, color: '#97A0AF', fontStyle: 'italic',
                      minHeight: 40, cursor: canEdit ? 'pointer' : 'default',
                      borderRadius: 4, padding: '8px 0',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { if (canEdit) { e.currentTarget.style.background = 'var(--ds-surface-sunken, #F4F5F7)'; prefetchEpicEditor(); }}}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    Add a description...
                  </div>
                ) : (
                  <div
                    role="button"
                    tabIndex={canEdit ? 0 : -1}
                    onClick={() => { if (canEdit) setIsDescriptionEditing(true); }}
                    onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && canEdit) { e.preventDefault(); setIsDescriptionEditing(true); }}}
                    onMouseEnter={e => { if (canEdit) { e.currentTarget.style.background = 'var(--ds-surface-sunken, #F4F5F7)'; prefetchEpicEditor(); }}}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    style={{
                      borderRadius: 4, padding: '4px 0', cursor: canEdit ? 'text' : 'default',
                      transition: 'background 0.15s',
                    }}
                    title={canEdit ? 'Click to edit' : undefined}
                  >
                    <Suspense fallback={<Spinner size="small" />}>
                      <EpicDescriptionRenderer content={item.description ?? null} />
                    </Suspense>
                  </div>
                )}
              </div>

              {/* Development */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                    Development
                  </span>
                  <span className="text-xs text-muted-foreground">(0)</span>
                </div>
                <p className="text-sm text-muted-foreground">No commits or pull requests linked</p>
              </div>

              {/* Automation */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                    Automation
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span>Rule executions</span>
                  </div>
                  <p className="text-xs mt-1">No rule executions</p>
                </div>
              </div>

              {/* Child items (Stories) */}
              {item.type === 'STORY' && (
                <>
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                        Subtasks ({item.subtaskCount || 0})
                      </label>
                      <Tooltip content="Coming soon">
                        <span>
                          <Button appearance="subtle" isDisabled>+ Add</Button>
                        </span>
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
                        <span>
                          <Button appearance="subtle" isDisabled>+ Log</Button>
                        </span>
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
                        <span>
                          <Button appearance="subtle" isDisabled>+ Log</Button>
                        </span>
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

              {/* Jira Sync Status */}
              {jiraData?.jira_key && (
                <div className="border-t border-[var(--bd-default,#E2E8F0)] dark:border-[var(--ds-surface-raised,#1A1A1A)] pt-4 mt-4">
                  <label className="block text-[11px] font-semibold text-[#6B7280] dark:text-[#9C8E7E] uppercase mb-3" style={{ fontWeight: 650 }}>
                    Jira Sync
                  </label>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[#6B7280] dark:text-[#9C8E7E]">Jira Issue</span>
                      <span
                        className="font-mono text-[12px] px-2 py-0.5 rounded bg-[var(--ds-surface-sunken,#F1F5F9)] text-[#1E293B] dark:bg-[var(--ds-surface-raised,#1A1A1A)] dark:text-[#E2D5C3]"
                        style={{ borderRadius: 4 }}
                      >
                        {jiraData.jira_key || jiraData.item_key || '—'}
                      </span>
                    </div>
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
                              'var(--ds-border, #DFE1E6)',
                            color:
                              jiraData.jira_sync_status === 'synced' || jiraData.jira_sync_status === 'pushed' ? '#006644' :
                              jiraData.jira_sync_status === 'queued' || jiraData.jira_sync_status === 'approval_pending' ? '#0747A6' :
                              'var(--ds-text, #253858)',
                          }}
                        >
                          {jiraData.jira_sync_status}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[#6B7280] dark:text-[#9C8E7E]">Last Synced</span>
                      <span className="text-[12px] text-[var(--ds-text-subtle,#334155)] dark:text-[#E2D5C3]">
                        {(jiraData.jira_pushed_at || jiraData.last_synced_at)
                          ? format(new Date(jiraData.jira_pushed_at || jiraData.last_synced_at!), 'MMM d, yyyy, hh:mm a')
                          : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabPanel>

          {/* Activity tab */}
          <TabPanel>
            <div className="overflow-y-auto p-4 h-full">
              <div className="mb-6">
                <label className="block text-[11px] font-semibold text-muted-foreground uppercase mb-2">
                  Add Comment
                </label>
                <Tooltip content="Coming soon">
                  <div
                    style={{
                      border: '1px solid var(--ds-border, #DFE1E6)',
                      borderRadius: 4,
                      padding: '8px 12px',
                      minHeight: 60,
                      color: 'var(--ds-text-subtlest, #97A0AF)',
                      fontSize: 13,
                      cursor: 'not-allowed',
                      background: 'var(--ds-surface-sunken, #F4F5F7)',
                    }}
                  >
                    Add a comment...
                  </div>
                </Tooltip>
                <div className="mt-2 text-right">
                  <Tooltip content="Coming soon">
                    <span>
                      <Button isDisabled>Comment</Button>
                    </span>
                  </Tooltip>
                </div>
              </div>

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
            </div>
          </TabPanel>
        </Tabs>
      </div>
    </div>
  );
};
