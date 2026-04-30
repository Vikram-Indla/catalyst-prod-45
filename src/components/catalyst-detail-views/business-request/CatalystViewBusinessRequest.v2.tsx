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
import {
  BrTitleSection,
  BrStatusSection,
  BrArabicTitleSection,
  BrScoringSection,
  BrAttachmentsSection,
  BrBrdUploadSection,
  BrLinkedItemsSection,
  BrSidebarDetails,
} from './sections';

export interface CatalystViewBusinessRequestV2Props {
  isOpen: boolean;
  onClose: () => void;
  /** business_requests.id (UUID). null = render loading skeleton. */
  requestId: string | null;
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
  panelMode,
  fullPageMode,
  onTogglePanelMode,
  navigationItems,
  onNavigate,
}: CatalystViewBusinessRequestV2Props) {
  const { request, isLoading, updateField, deleteRequest } =
    useProductHubBusinessRequest(requestId);

  // ── Header chrome handlers (wired more fully in cycle 2) ─────────────────
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

  const handleClone = useCallback(() => {
    // Cycle 2: wire to useDuplicateBusinessRequest.
    toast('Clone — wired in cycle 2');
  }, []);

  const handleArchive = useCallback(() => {
    // Cycle 2: archive is currently a soft-flag on the legacy panel. The
    // BR domain doesn't have an archive column (only deleted_at). Decide
    // whether to add `is_archived` to business_requests OR drop archive
    // entirely as a feature on the new view. Flagged for cycle-2 design.
    toast('Archive — wired in cycle 2');
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
      {/* Cycle 2 (real): Title + Status + Arabic title.
          Cycle 3: Description editor (lazy @atlaskit/editor-core) lands
          between BrStatusSection and BrArabicTitleSection. */}
      <BrTitleSection request={request} onUpdate={updateField} />
      <BrStatusSection request={request} onUpdate={updateField} />
      <BrArabicTitleSection request={request} onUpdate={updateField} />

      {/* Cycle 1 stubs — BrScoring / BrAttachments / BrBrdUpload / BrLinkedItems.
          Real implementations land in cycle 3. */}
      <BrBrdUploadSection request={request} onUpdate={updateField} />
      <BrAttachmentsSection request={request} />
      <BrScoringSection request={request} onUpdate={updateField} />
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
      currentItemId={requestId ?? undefined}
      onNavigate={onNavigate}
      leftContent={leftContent}
      rightContent={rightContent}
      isLoading={isLoading}
    />
  );
}
