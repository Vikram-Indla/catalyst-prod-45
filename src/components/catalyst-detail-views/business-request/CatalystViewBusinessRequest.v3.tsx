/**
 * CatalystViewBusinessRequestV3 — Business Request detail view.
 *
 * Structurally cloned from CatalystViewStory: same CatalystViewBase shell,
 * same leftContent/rightContent memo pattern, same CatalystViewBaseProps
 * contract (itemId = request key, e.g. "MDT-688").
 *
 * Data: useProductHubBusinessRequest (business_requests table) instead of
 * useCatalystIssue (ph_issues). Left rail uses BR-specific sections;
 * right rail uses BrSidebarDetails with the status pill in the header
 * (matching Story's "In Requirements ▾" + "Improve Story" header pattern).
 *
 * Replaces CatalystViewBusinessRequest.v2 on all mount sites:
 *   - CatalystDetailRouter (primary)
 *   - KanbanPage, CardsPage, RequestListingPage, ProductRoadmapPage
 */
import React, { useCallback, useMemo, useState } from 'react';
import { catalystToast } from '@/lib/catalystToast';
import { CatalystViewBase } from '../shared/CatalystViewBase';
import { useProductHubBusinessRequest } from './useProductHubBusinessRequest';
import { useDuplicateBusinessRequest } from '@/hooks/useBusinessRequests';
import {
  BrTitleSection,
  BrCenterDetails,
  BrDescriptionSection,
  BrAttachmentsSection,
  BrLinkedItemsSection,
  BrActivitySection,
} from './sections';
import { CatalystStatusPill } from '../shared/sections/CatalystStatusPill';
import { CatalystSidebarDetails } from '../shared/sections/CatalystSidebarDetails';
import { mapBrToIssueLike } from './sections/BrSidebarAdapter';
import { CatalystQuickActions } from '../shared/sections';
import { SubtasksPanel } from '@/modules/project-work-hub/components/SubtasksPanel';
import { ImproveIssueDropdown } from '../improve';
import { WatchersChip } from '../shared/WatchersChip';
import { ConfirmDeleteDialog } from '../shared/ConfirmDeleteDialog';
import { ConfirmCloneDialog } from '../shared/ConfirmCloneDialog';
import { BrMoveProductDialog } from './BrMoveProductDialog';
import { useGlobalSearchStore } from '@/store/globalSearchStore';
import { BUSINESS_REQUEST_SUBTASK_TYPES } from '../shared/parent-rules';
import type { CatalystViewBaseProps } from '../shared/types';
import { useBusinessRequestHealth } from '@/hooks/useBusinessRequestHealth';
import { ReplayOverlay } from '@/components/replay/ReplayOverlay';

export default function CatalystViewBusinessRequestV3({
  isOpen, onClose, itemId,
  projectKey,
  panelMode, fullPageMode, onTogglePanelMode, navigationItems, onNavigate,
  hideSidebar,
}: CatalystViewBaseProps) {
  const { request, resolvedId, isLoading, updateField, deleteRequest } =
    useProductHubBusinessRequest({ requestKey: itemId });

  const { health } = useBusinessRequestHealth(itemId);

  const isNewlyCreated = !!(
    request &&
    request.status === 'New' &&
    !request.description
  );
  const isClosed = ['done', 'canceled'].includes(
    (request?.process_step ?? '').toLowerCase(),
  );
  const duplicateMutation = useDuplicateBusinessRequest();
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [showCloneDialog, setShowCloneDialog] = React.useState(false);
  const [showMoveDialog, setShowMoveDialog] = React.useState(false);
  const [showReplay, setShowReplay] = useState(false);

  const openDetail = useGlobalSearchStore((s) => s.openDetail);

  const brAsIssueLike = useMemo(
    () =>
      request
        ? {
            id: resolvedId ?? undefined,
            issue_key: request.request_key,
            issue_type: 'Business Request',
            summary: request.title,
            description_text:
              typeof request.description === 'string' ? request.description : null,
            acceptance_criteria: null,
            project_key: 'MIM',
            source: 'catalyst' as const,
          }
        : null,
    [request, resolvedId],
  );

  const handleApplyDescription = useCallback(
    async (newDesc: string) => {
      await updateField('description', newDesc);
    },
    [updateField],
  );

  const handleCloneConfirm = useCallback(async () => {
    if (!resolvedId) return;
    try {
      const newReq = await duplicateMutation.mutateAsync(resolvedId);
      catalystToast.success(`Duplicated as ${newReq?.request_key ?? 'BR'}`);
      setShowCloneDialog(false);
    } catch {
      /* hook surfaces its own error toast */
    }
  }, [resolvedId, duplicateMutation]);

  const handleDeleteConfirm = useCallback(async () => {
    try {
      await deleteRequest();
      catalystToast.success('Business Request deleted');
      setShowDeleteDialog(false);
      onClose();
    } catch {
      catalystToast.error('Delete failed');
    }
  }, [deleteRequest, onClose]);

  // ── Left rail (mirrors Story's leftContent slot) ──────────────────────────
  const leftContent = useMemo(
    () => (
      <>
        <BrTitleSection request={request} onUpdate={updateField} />
        <CatalystQuickActions />
        <BrCenterDetails request={request} onUpdate={updateField} productId={request?.product_id ?? null} />
        <BrDescriptionSection request={request} onUpdate={updateField} health={health} />
        {!isNewlyCreated && <BrAttachmentsSection request={request} />}
        {!isNewlyCreated && <BrLinkedItemsSection request={request} />}
        {!isNewlyCreated && request?.request_key && resolvedId && (
          <SubtasksPanel
            storyKey={request.request_key}
            storyId={resolvedId}
            /* Subtask keys follow the BR's own prefix (MDT-### shared
               sequence, Q3) — derive from request_key, not a hardcoded
               fallback. */
            projectKey={request.request_key?.split('-')[0] || 'MDT'}
            onSubtaskClick={(key) => openDetail({ id: key })}
            parentIssueType="Business Request"
            parentSummary={request.title ?? ''}
            /* Catalyst-native: BR subtasks persist to catalyst_issues, never
               ph_issues — they are not Jira-synced (2026-06-15). */
            parentSource="catalyst"
            /* Picker scoped to the 5 BR subtask categories only (Q1). */
            childTypeOverride={[...BUSINESS_REQUEST_SUBTASK_TYPES]}
          />
        )}
        <BrActivitySection requestId={resolvedId ?? ''} isOpen={isOpen} />
      </>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [request, updateField, resolvedId, isOpen, openDetail, isNewlyCreated],
  );

  // ── Right rail — status pill in header, matching Story's pattern ──────────
  const rightContent = useMemo(
    () => (
      <CatalystSidebarDetails
        issue={mapBrToIssueLike(request) as any}
        itemId={request?.request_key ?? ''}
        onStatusChange={(s) => updateField('status', s)}
        onClose={onClose}
        onDelete={() => {}}
        statusPill={
          <CatalystStatusPill
            status={request?.process_step ?? null}
            onStatusChange={(st) => updateField('process_step', st)}
            issueType="Business Request"
          />
        }
        watchersChip={<WatchersChip issueKey={request?.request_key ?? null} />}
        improveDropdown={
          isClosed ? undefined : (
            <>
              <ImproveIssueDropdown
                issue={brAsIssueLike}
                onApplyDescription={handleApplyDescription}
              />
              {request?.request_key && (
                <button
                  onClick={() => setShowReplay(true)}
                  title="Replay lifecycle"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 8px',
                    border: '1px solid var(--ds-border, #DFE1E6)',
                    borderRadius: 3,
                    background: 'var(--ds-surface, #FFFFFF)',
                    color: 'var(--ds-text-subtle, #42526E)',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily: 'var(--ds-font-family-body)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  ▶ Replay
                </button>
              )}
            </>
          )
        }
        hideDiscuss={isClosed}
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [request, updateField, brAsIssueLike, handleApplyDescription, health, isClosed],
  );

  return (
    <>
      <CatalystViewBase
        isOpen={isOpen}
        onClose={onClose}
        panelMode={panelMode}
        hideSidebar={hideSidebar}
        fullPageMode={fullPageMode}
        itemType="Business Request"
        itemKey={request?.request_key ?? null}
        projectKey={projectKey || request?.project_key || 'MIM'}
        projectName="Product Hub"
        moreMenuItems={useMemo(
          () => [
            { label: 'Print', onClick: () => window.print() },
            { label: 'Clone', onClick: () => setShowCloneDialog(true) },
            { label: 'Move to product…', onClick: () => setShowMoveDialog(true) },
            { label: 'Delete request', onClick: () => setShowDeleteDialog(true), danger: true },
          ],
          // eslint-disable-next-line react-hooks/exhaustive-deps
          [],
        )}
        onTogglePanelMode={onTogglePanelMode}
        navigationItems={navigationItems}
        /* MUST match navigationItems[i].id — which is `request_key` (e.g. "MDT-740"),
           NOT `resolvedId` (the business_requests UUID). Mirror project Story:
           `currentItemId={itemId}`. Previously this passed resolvedId, so
           findIndex returned -1 and the prev/next chevrons were disabled. */
        currentItemId={itemId}
        onNavigate={onNavigate}
        leftContent={leftContent}
        rightContent={rightContent}
        isLoading={isLoading}
      />
      <ConfirmCloneDialog
        isOpen={showCloneDialog}
        onClose={() => setShowCloneDialog(false)}
        issueKey={request?.request_key}
        issueSummary={request?.title}
        onConfirm={handleCloneConfirm}
      />
      <ConfirmDeleteDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        issueKey={request?.request_key}
        issueSummary={request?.title}
        typeLabel="request"
        onConfirm={handleDeleteConfirm}
      />
      {showMoveDialog && (
        <BrMoveProductDialog
          isOpen={showMoveDialog}
          onClose={() => setShowMoveDialog(false)}
          requestKey={request?.request_key}
          requestTitle={request?.title}
          currentProductId={request?.product_id ?? null}
          onUpdate={updateField}
          onMoved={onClose}
        />
      )}
      {showReplay && request?.request_key && (
        <ReplayOverlay
          rootKey={request.request_key}
          onClose={() => setShowReplay(false)}
        />
      )}
    </>
  );
}
