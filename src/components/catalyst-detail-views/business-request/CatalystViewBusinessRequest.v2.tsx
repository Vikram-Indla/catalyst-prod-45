/**
 * CatalystViewBusinessRequest v2 — canonical Product Hub Business Request
 * detail view, ADS-only, on the CatalystViewBase shell.
 *
 * jira-compare cycle 1 deliverable. Will replace (in later cycles):
 *   - src/components/producthub/timeline/RequestDetailPanel.tsx
 *   - src/modules/product-backlog/components/split-panel/RequestDetailPanel.tsx
 *   - src/components/business-requests/BusinessRequestDetailModal.tsx
 *   - src/components/catalyst-detail-views/business-request/CatalystViewBusinessRequest.tsx (v1)
 *
 * Migration plan:
 *   - Cycle 1 (this file + sibling stubs): shell + data hook + section
 *     stubs + tsc clean. Mount sites untouched.
 *   - Cycle 2: fill section stubs with real Atlaskit-only field rows for
 *     all 15 create-modal fields + Translate + BRD upload + Linked Items
 *     (Epic + Feature linkable) + Activity feed + Watchers + Permalink +
 *     Share + Clone + Archive + Delete.
 *   - Cycle 3: extend CatalystKeyDetails / CatalystSidebarDetails with
 *     BR-specific row support OR build BR-specific equivalents.
 *   - Cycles 4-6: swap each of the 14 legacy mount sites to this
 *     component, batched (PH-canonical → BR-domain → split-panel).
 *   - Cycle 7: tsc + live probe per surface (panel + full-page) + dark-
 *     mode contrast probe per CLAUDE.md.
 *   - Cycle 8: DEAD CODE sunset comments on the four legacy components
 *     above pointing at this file.
 *
 * Architecture: 100% ADS — every primitive @atlaskit/* or Catalyst's
 * Atlaskit-thin wrappers. No @/components/ui/* (shadcn), no lucide-react
 * (replace with @atlaskit/icon), no bespoke CSS chrome.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { catalystToast } from '@/lib/catalystToast';
import { CatalystViewBase } from '../shared/CatalystViewBase';
import { useProductHubBusinessRequest } from './useProductHubBusinessRequest';
import { useDuplicateBusinessRequest } from '@/hooks/useBusinessRequests';
import {
  BrTitleSection,
  BrStatusSection,
  BrKeyDetails,
  BrArabicTitleSection,
  BrDescriptionSection,
  BrScoringSection,
  BrAttachmentsSection,
  BrLinkedItemsSection,
  BrSidebarDetails,
} from './sections';
import { SubtasksPanel } from '@/modules/project-work-hub/components/SubtasksPanel';
import { CatalystActivitySection } from '../shared/sections';
import { ConfirmDeleteDialog } from '../shared/ConfirmDeleteDialog';
import { ConfirmCloneDialog } from '../shared/ConfirmCloneDialog';
import { useGlobalSearchStore } from '@/store/globalSearchStore';

export interface CatalystViewBusinessRequestV2Props {
  isOpen: boolean;
  onClose: () => void;
  /**
   * `business_requests.id` (UUID). Direct path. null = render loading
   * skeleton.
   */
  requestId?: string | null;
  /**
   * Display key (MIM-XXX). Used by Product Hub list/kanban/cards/roadmap
   * mount sites that render rows from `ph_requests` (a separate table
   * whose UUIDs do NOT match `business_requests.id`). The hook resolves
   * `requestKey` → `business_requests.id` on mount.
   */
  requestKey?: string | null;
  /** Panel mode (slide-in side panel — default for Product Hub drawers). */
  panelMode?: boolean;
  /** Full-page mode (fills viewport below top nav). */
  fullPageMode?: boolean;
  onTogglePanelMode?: () => void;
  /** Optional sibling navigation (Prev/Next chevrons in header). */
  navigationItems?: { id: string; summary: string; issue_key?: string }[];
  onNavigate?: (itemId: string) => void;
}

export default function CatalystViewBusinessRequestV2({
  isOpen,
  onClose,
  requestId,
  requestKey,
  panelMode,
  fullPageMode,
  onTogglePanelMode,
  navigationItems,
  onNavigate,
}: CatalystViewBusinessRequestV2Props) {
  const { request, resolvedId, isLoading, updateField, deleteRequest } =
    useProductHubBusinessRequest({ requestId, requestKey });
  const duplicateMutation = useDuplicateBusinessRequest();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCloneDialog, setShowCloneDialog] = useState(false);

  const openDetail = useGlobalSearchStore((s) => s.openDetail);

  // ── Header chrome handlers ────────────────────────────────────────────────
  const handlePermalink = useCallback(async () => {
    if (!request?.request_key) return;
    const url = new URL(window.location.href);
    url.searchParams.set('selectedRequest', request.request_key);
    try {
      await navigator.clipboard.writeText(url.toString());
      catalystToast.success('Permalink copied');
    } catch {
      catalystToast.error('Could not copy permalink');
    }
  }, [request?.request_key]);

  const handleCloneConfirm = useCallback(async () => {
    if (!resolvedId) return;
    try {
      const newReq = await duplicateMutation.mutateAsync(resolvedId);
      catalystToast.success(`Duplicated as ${newReq?.request_key ?? 'BR'}`);
      setShowCloneDialog(false);
    } catch {
      // Hook surfaces its own error toast via useToast — silent here.
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

  // Memoize leftContent / rightContent / moreMenuItems so that any local
  // state changes do NOT force CatalystViewBase to re-diff the heavy subtree.
  // ── Left rail content (single-scroll, project-hub canonical pattern) ─────
  const leftContent = useMemo(() => (
    <>
      <BrTitleSection request={request} onUpdate={updateField} />
      <BrStatusSection request={request} onUpdate={updateField} />
      <BrKeyDetails request={request} />
      <BrArabicTitleSection request={request} onUpdate={updateField} />
      <BrDescriptionSection request={request} onUpdate={updateField} />
      <BrScoringSection request={request} onUpdate={updateField} />
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [request, updateField, resolvedId, isOpen, openDetail]);

  // ── Right rail (sidebar — workflow + assignees + dates + scoring badges) ─
  const rightContent = useMemo(() => (
    <BrSidebarDetails request={request} onUpdate={updateField} />
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [request, updateField]);

  return (
    <>
      <CatalystViewBase
        isOpen={isOpen}
        onClose={onClose}
        panelMode={panelMode}
        fullPageMode={fullPageMode}
        itemType="Business Request"
        itemKey={request?.request_key ?? null}
        projectKey="MIM"
        projectName="Product Hub"
        onShare={handlePermalink}
        moreMenuItems={useMemo(() => [
          { label: 'Print', onClick: () => window.print() },
          { label: 'Clone', onClick: () => setShowCloneDialog(true) },
          { label: 'Delete request', onClick: () => setShowDeleteDialog(true), danger: true },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        ], [])}
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
    </>
  );
}
