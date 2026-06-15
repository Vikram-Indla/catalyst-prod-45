/**
 * ProductHubTimelinePage — /product-hub/:key/timeline
 *
 * Thin data adapter that mounts the canonical shared TimelineView. The full
 * UI shell lives in `src/components/shared/Timeline/` and is shared with
 * ProjectHubTimelinePage — same toolbar, sidebar, grid, bottom bar.
 *
 * Product-hub v1 differences from project-hub:
 *   - data source is `business_requests` (mapped to TimelineIssue via
 *     useProductHubTimeline)
 *   - flat structure (no parent_key tree) — `enableRowProgress=false`
 *   - end_date only — items render as diamond markers (handled by the view)
 *   - read-only timeline (no mutations wired) — drag, inline create, more-actions
 *     menu, "Create epic" row, and the empty-row + button all hide cleanly
 *   - work-item type filter lists product-relevant types (Feature / Business Gap
 *     / Integration / Business Request)
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { TimelineView, type TimelineIssue } from '@/components/shared/Timeline';
import { useProductHubTimeline } from '@/hooks/useProductHubTimeline';

const PRODUCT_WORK_ITEM_TYPES = ['Feature', 'Business Gap', 'Integration', 'Business Request'];

function resolveItemType(_issue: TimelineIssue): string {
  /* Every product-hub timeline row is a business_request — the CatalystDetailRouter
     needs the canonical itemType string for the BR detail view. */
  return 'business_request';
}

export default function ProductHubTimelinePage() {
  const { key: productCode } = useParams<{ key: string }>();
  const { data: items = [], isLoading, error } = useProductHubTimeline(productCode);

  return (
    <TimelineView
      items={items}
      isLoading={isLoading}
      error={error}
      chromeBand={<ProjectPageHeader projectKey={productCode} />}
      hubLabel={productCode ?? 'Products'}
      hubKey={`product-${productCode ?? ''}`}
      filterOptions={{
        workItemTypes: PRODUCT_WORK_ITEM_TYPES,
        enableSavedFilters: false,
      }}
      buildIssueDetailRoute={(issueKey) => `/product-hub/${productCode}/timeline/${issueKey}`}
      resolveItemType={resolveItemType}
      detailRouteOwnerKey={productCode ?? ''}
      enableRowProgress={false}
      enableInlineCreate={false}
      enableRowMenu={false}
      enableBarDrag={false}
      enableCreateEpicRow={false}
      enableEmptyRowAdd={false}
    />
  );
}
