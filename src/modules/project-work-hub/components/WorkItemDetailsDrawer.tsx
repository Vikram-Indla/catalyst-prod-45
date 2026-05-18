import React, { useState, useEffect, useCallback, Suspense, startTransition, lazy } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { WorkItem } from '../types';
import { WorkTypeIcon } from './WorkTypeIcon';
import { Avatar, Tooltip } from '@/components/ads';
const EpicDescriptionEditor = lazy(
  () => import('@/components/shared/rich-text/atlaskit/EpicDescriptionEditor'),
);
import EpicDescriptionRenderer from '@/components/shared/rich-text/atlaskit/EpicDescriptionRenderer';
import { isAdfEmpty } from '@/components/shared/rich-text/atlaskit/adfHelpers';
import { prefetchEpicEditor } from '@/lib/atlaskitPrefetch';
import { SubtasksPanel } from '@/modules/project-work-hub/components/SubtasksPanel';
import { LinkedWorkItemsSection } from '@/modules/project-work-hub/components/linked-work-items';
import {
  useCatalystIssue,
  useCatalystIssueMutations,
} from '@/components/catalyst-detail-views/shared/hooks';
import {
  CatalystActivitySection,
  CatalystKeyDetails,
  CatalystStatusPill,
} from '@/components/catalyst-detail-views/shared/sections';
import type { CatalystItemType } from '@/components/catalyst-detail-views/shared/types';

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
  const [isEditing, setIsEditing] = useState(false);
  const [editedSummary, setEditedSummary] = useState('');
  const [isDescriptionEditing, setIsDescriptionEditing] = useState(false);

  // jiraData — sync metadata only (sync status badge at the bottom)
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

  // Canonical data path — resolved once jiraData lands
  const issueKey = jiraData?.item_key ?? item?.jiraKey ?? null;
  const { data: issue } = useCatalystIssue(issueKey ?? '', isOpen && !!issueKey);
  const mutations = useCatalystIssueMutations(issueKey ?? '', onClose);

  // Derived values
  const displaySummary = issue?.summary ?? item?.summary ?? '';
  const canEdit = !!issueKey;
  const descSource = issue?.description_adf ?? item?.description ?? null;
  const descIsEmpty = isAdfEmpty(descSource);
  const projectKey = issue?.project_key ?? issueKey?.split('-')[0] ?? item?.key ?? '';
  const itemType = (item?.type?.toLowerCase() ?? 'story') as CatalystItemType;

  useEffect(() => {
    if (item) {
      setEditedSummary(issue?.summary ?? item.summary);
      setIsEditing(false);
      setIsDescriptionEditing(false);
    }
  }, [item?.id, issue?.summary]);

  if (!isOpen || !item) return null;

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(dateStr));
  };

  const handleSave = () => {
    if (!canEdit) return;
    mutations.updateField.mutate({ field: 'summary', value: editedSummary, oldValue: issue?.summary ?? '' });
    setIsEditing(false);
  };

  const handleArchive = () => {
    if (!canEdit) return;
    mutations.deleteIssue.mutate();
  };

  const handleDescriptionSave = useCallback((adfJson: string) => {
    mutations.updateField.mutate({ field: 'description_adf', value: adfJson, oldValue: '' });
    setIsDescriptionEditing(false);
  }, [mutations.updateField]);

  const handleDescriptionCancel = useCallback(() => {
    setIsDescriptionEditing(false);
  }, []);

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
            <h2 className="text-lg font-semibold text-foreground leading-snug">{displaySummary}</h2>
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
                    icon={mutations.updateField.isPending ? () => <Spinner size="small" /> : CheckMarkIcon}
                    label="Save"
                    onClick={handleSave}
                    isDisabled={mutations.updateField.isPending}
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
                  icon={mutations.deleteIssue.isPending ? () => <Spinner size="small" /> : ArchiveIcon}
                  label="Archive"
                  onClick={handleArchive}
                  isDisabled={mutations.deleteIssue.isPending}
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
              {/* Status — canonical CatalystStatusPill */}
              <div className="mb-4">
                <CatalystStatusPill
                  status={issue?.status ?? item.status}
                  statusCategory={issue?.status_category ?? item.statusCategory}
                  onStatusChange={canEdit ? (s) => mutations.updateStatus.mutate(s) : undefined}
                  issueType={issue?.issue_type ?? item.type}
                />
              </div>

              {/* Key Details — canonical (parent + priority) */}
              {issueKey && (
                <div className="mb-6">
                  <CatalystKeyDetails
                    issue={issue ?? null}
                    itemId={issueKey}
                    itemType={itemType}
                    projectKey={projectKey}
                  />
                </div>
              )}

              {/* Assignee & Reporter — read from ph_issues */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground uppercase mb-1">
                    Assignee
                  </label>
                  {(issue?.assignee_display_name ?? item.assigneeName) ? (
                    <div className="flex items-center gap-2">
                      <Avatar name={issue?.assignee_display_name ?? item.assigneeName ?? 'Assignee'} size="xsmall" />
                      <span className="text-sm text-foreground">{issue?.assignee_display_name ?? item.assigneeName}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Unassigned</span>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground uppercase mb-1">
                    Reporter
                  </label>
                  {(issue?.reporter_display_name ?? item.reporterName) ? (
                    <div className="flex items-center gap-2">
                      <Avatar name={issue?.reporter_display_name ?? item.reporterName ?? 'Reporter'} size="xsmall" />
                      <span className="text-sm text-foreground">{issue?.reporter_display_name ?? item.reporterName}</span>
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
                        initialContent={descSource}
                        onSave={handleDescriptionSave}
                        onCancel={handleDescriptionCancel}
                        workItemId={item.id}
                        placeholder="Add a description..."
                      />
                    </Suspense>
                  </div>
                ) : descIsEmpty ? (
                  <div
                    onClick={() => { if (canEdit) startTransition(() => setIsDescriptionEditing(true)); }}
                    style={{
                      fontSize: 14, color: 'var(--ds-text-subtlest, #97A0AF)',
                      fontStyle: 'normal',
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
                    onClick={() => { if (canEdit) startTransition(() => setIsDescriptionEditing(true)); }}
                    onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && canEdit) { e.preventDefault(); startTransition(() => setIsDescriptionEditing(true)); }}}
                    onMouseEnter={e => { if (canEdit) { e.currentTarget.style.background = 'var(--ds-surface-sunken, #F4F5F7)'; prefetchEpicEditor(); }}}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    style={{
                      borderRadius: 4, padding: '4px 0', cursor: canEdit ? 'text' : 'default',
                      transition: 'background 0.15s',
                    }}
                    title={canEdit ? 'Click to edit' : undefined}
                  >
                    <Suspense fallback={<Spinner size="small" />}>
                      <EpicDescriptionRenderer
                        content={item.description ?? null}
                        issueKey={jiraData?.item_key ?? item.jiraKey ?? item.key ?? undefined}
                      />
                    </Suspense>
                  </div>
                )}
              </div>

              {/* Development section permanently banned — CLAUDE.md 2026-05-06 */}
              {/* Automation section permanently banned — CLAUDE.md 2026-05-06 */}

              {/* Child issues — canonical SubtasksPanel (CRUD, inline create, Jira parity) */}
              {(() => {
                const issueKey = jiraData?.item_key ?? item.jiraKey ?? undefined;
                const projectKey = issueKey?.split('-')[0] ?? item.key ?? '';
                return issueKey ? (
                  <SubtasksPanel
                    storyKey={issueKey}
                    storyId={item.id}
                    projectKey={projectKey}
                    parentIssueType={item.type}
                    parentSummary={item.title}
                  />
                ) : null;
              })()}

              {/* Linked work items — canonical LinkedWorkItemsSection */}
              {(() => {
                const issueKey = jiraData?.item_key ?? item.jiraKey ?? undefined;
                const projectKey = issueKey?.split('-')[0] ?? item.key ?? '';
                return (
                  <LinkedWorkItemsSection
                    issueId={issueKey ?? item.id}
                    issueKey={issueKey ?? ''}
                    projectKey={projectKey}
                  />
                );
              })()}

              {/* Dates */}
              <div className="border-t border-border pt-4 mt-4">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Created: {formatDate(issue?.jira_created_at ?? item.createdAt)}</span>
                  <span>Updated: {formatDate(issue?.jira_updated_at ?? item.updatedAt)}</span>
                </div>
              </div>

              {/* Jira Sync Status */}
              {jiraData?.jira_key && (
                <div className="border-t border-[var(--bd-default,var(--cp-border, var(--cp-bg-sunken, #E2E8F0)))] dark:border-[var(--ds-surface-raised,#1A1A1A)] pt-4 mt-4">
                  <label className="block text-[11px] font-semibold text-[#6B7280] dark:text-[#9C8E7E] uppercase mb-3" style={{ fontWeight: 650 }}>
                    Jira Sync
                  </label>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[#6B7280] dark:text-[#9C8E7E]">Jira Issue</span>
                      <span
                        className="font-mono text-[12px] px-2 py-0.5 rounded bg-[var(--ds-surface-sunken,var(--cp-bg-sunken, #F1F5F9))] text-[#1E293B] dark:bg-[var(--ds-surface-raised,#1A1A1A)] dark:text-[#E2D5C3]"
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
                              'var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6)))',
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
                      <span className="text-[12px] text-[var(--cp-ink-2, var(--cp-ink-2, #334155))] dark:text-[#E2D5C3]">
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

          {/* Activity tab — canonical CatalystActivitySection */}
          <TabPanel>
            <div className="overflow-y-auto p-4 h-full">
              {issueKey ? (
                <CatalystActivitySection itemId={issueKey} isOpen={isOpen} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Activity is available once this item is synced with Jira.
                </p>
              )}
            </div>
          </TabPanel>
        </Tabs>
      </div>
    </div>
  );
};
