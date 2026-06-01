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
import React, { useCallback, useMemo } from 'react';
import { catalystToast } from '@/lib/catalystToast';
import { containsArabic } from '@/lib/detectArabic';
import FileIcon from '@atlaskit/icon/glyph/document';
import { CatalystViewBase } from '../shared/CatalystViewBase';
import { useProductHubBusinessRequest } from './useProductHubBusinessRequest';
import { useDuplicateBusinessRequest } from '@/hooks/useBusinessRequests';
import {
  BrTitleSection,
  BrArabicTitleSection,
  BrCenterDetails,
  BrDescriptionSection,
  BrAttachmentsSection,
  BrLinkedItemsSection,
  BrSidebarDetails,
  BrStatusSection,
} from './sections';
import { CatalystQuickActions, CatalystActivitySection } from '../shared/sections';
import { SubtasksPanel } from '@/modules/project-work-hub/components/SubtasksPanel';
import { ImproveIssueDropdown } from '../improve';
import { WatchersChip } from '../shared/WatchersChip';
import { ConfirmDeleteDialog } from '../shared/ConfirmDeleteDialog';
import { ConfirmCloneDialog } from '../shared/ConfirmCloneDialog';
import { BrMoveProductDialog } from './BrMoveProductDialog';
import { useGlobalSearchStore } from '@/store/globalSearchStore';
import type { CatalystViewBaseProps } from '../shared/types';

export default function CatalystViewBusinessRequestV3({
  isOpen, onClose, itemId,
  projectKey,
  panelMode, fullPageMode, onTogglePanelMode, navigationItems, onNavigate,
}: CatalystViewBaseProps) {
  const { request, resolvedId, isLoading, updateField, deleteRequest } =
    useProductHubBusinessRequest({ requestKey: itemId });
  const duplicateMutation = useDuplicateBusinessRequest();
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [showCloneDialog, setShowCloneDialog] = React.useState(false);
  const [showMoveDialog, setShowMoveDialog] = React.useState(false);

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
  const titleIsArabic = containsArabic(request?.title ?? '');

  const leftContent = useMemo(
    () => (
      <>
        {/* Type badge — mirrors v1 BR-UNIQUE pattern */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px',
          background: 'var(--ds-background-information, #E9F2FE)', borderRadius: 4, marginBottom: 12,
          fontSize: 12, fontWeight: 600, color: 'var(--ds-link, #0052CC)',
        }}>
          <FileIcon size="small" primaryColor="var(--ds-link, #0052CC)" />
          Business Request
        </div>

        <BrTitleSection request={request} onUpdate={updateField} />
        {/* Only show Arabic title field when main title is NOT already Arabic */}
        {!titleIsArabic && <BrArabicTitleSection request={request} onUpdate={updateField} />}
        <CatalystQuickActions />
        <BrCenterDetails request={request} onUpdate={updateField} />
        <BrDescriptionSection request={request} onUpdate={updateField} />
        <BrAttachmentsSection request={request} />
        <BrLinkedItemsSection request={request} />
        {request?.request_key && resolvedId && (
          <SubtasksPanel
            storyKey={request.request_key}
            storyId={resolvedId}
            projectKey={request.project_key || 'MIM'}
            onSubtaskClick={(key) => openDetail({ id: key })}
            parentIssueType="Business Request"
            parentSummary={request.title ?? ''}
          />
        )}
        <CatalystActivitySection itemId={resolvedId ?? ''} isOpen={isOpen} />
      </>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [request, updateField, resolvedId, isOpen, openDetail, titleIsArabic],
  );

  // ── Right rail — status pill in header, matching Story's pattern ──────────
  const rightContent = useMemo(
    () => (
      <BrSidebarDetails
        request={request}
        onUpdate={updateField}
        statusPill={<BrStatusSection request={request} onUpdate={updateField} />}
        watchersChip={<WatchersChip issueKey={request?.request_key ?? null} />}
        improveDropdown={
          <ImproveIssueDropdown
            issue={brAsIssueLike}
            onApplyDescription={handleApplyDescription}
          />
        }
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [request, updateField, brAsIssueLike, handleApplyDescription],
  );

  return (
    <>
      <CatalystViewBase
        isOpen={isOpen}
        onClose={onClose}
        panelMode={panelMode}
        fullPageMode={fullPageMode}
        itemType="Business Request"
        itemKey={request?.request_key ?? null}
        projectKey={projectKey ?? request?.project_key ?? 'MIM'}
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
        currentItemId={resolvedId ?? undefined}
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
    </>
  );
}
