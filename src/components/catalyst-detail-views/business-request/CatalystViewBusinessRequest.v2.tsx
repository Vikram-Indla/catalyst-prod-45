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
import { useCallback } from 'react';
import { toast } from 'sonner';
import { CatalystViewBase } from '../shared/CatalystViewBase';
import { useProductHubBusinessRequest } from './useProductHubBusinessRequest';
import { useDuplicateBusinessRequest } from '@/hooks/useBusinessRequests';
import {
  BrTitleSection,
  BrStatusSection,
  BrArabicTitleSection,
  BrDescriptionSection,
  BrScoringSection,
  BrAttachmentsSection,
  BrLinkedItemsSection,
  BrSidebarDetails,
} from './sections';

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

  // ── Header chrome handlers ────────────────────────────────────────────────
  const handlePermalink = useCallback(async () => {
    if (!request?.request_key) return;
    const url = new URL(window.location.href);
    url.searchParams.set('selectedRequest', request.request_key);
    try {
      await navigator.clipboard.writeText(url.toString());
      toast.success('Permalink copied');
    } catch {
      toast.error('Could not copy permalink');
    }
  }, [request?.request_key]);

  const handleClone = useCallback(async () => {
    if (!resolvedId) return;
    try {
      const newReq = await duplicateMutation.mutateAsync(resolvedId);
      toast.success(`Duplicated as ${newReq?.request_key ?? 'BR'}`);
    } catch {
      // Hook surfaces its own error toast via useToast — silent here.
    }
  }, [resolvedId, duplicateMutation]);

  const handleArchive = useCallback(() => {
    // Cycle 4: `business_requests` has no `is_archived` column. Either
    // add one via migration OR drop archive entirely. Stub for now —
    // exposing the action keeps Jira-parity until the design call lands.
    toast('Archive — pending design call (no archive column on business_requests)');
  }, []);

  const handleDelete = useCallback(async () => {
    try {
      await deleteRequest();
      toast.success('Business Request deleted');
      onClose();
    } catch {
      toast.error('Delete failed');
    }
  }, [deleteRequest, onClose]);

  // ── Left rail content (single-scroll, project-hub canonical pattern) ─────
  const leftContent = (
    <>
      <BrTitleSection request={request} onUpdate={updateField} />
      <BrStatusSection request={request} onUpdate={updateField} />
      <BrArabicTitleSection request={request} onUpdate={updateField} />
      <BrDescriptionSection request={request} onUpdate={updateField} />
      <BrScoringSection request={request} onUpdate={updateField} />
      <BrAttachmentsSection request={request} />
      <BrLinkedItemsSection request={request} />
    </>
  );

  // ── Right rail (sidebar — workflow + assignees + dates + scoring badges) ─
  const rightContent = (
    <BrSidebarDetails request={request} onUpdate={updateField} />
  );

  return (
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
      moreMenuItems={[
        { label: 'Clone', onClick: handleClone },
        { label: 'Archive', onClick: handleArchive },
        { label: 'Delete', onClick: handleDelete, danger: true },
      ]}
      onTogglePanelMode={onTogglePanelMode}
      navigationItems={navigationItems}
      currentItemId={resolvedId ?? undefined}
      onNavigate={onNavigate}
      leftContent={leftContent}
      rightContent={rightContent}
      isLoading={isLoading}
    />
  );
}
