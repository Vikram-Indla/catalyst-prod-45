/**
 * ProductTimelineDetailPage — /product-hub/:key/timeline/:issueKey
 *
 * Thin wrapper around the canonical HubItemDetailPage. Renders the same
 * full-page detail (real BR data via CatalystDetailRouter) as the product
 * backlog detail page — both use the shared resolver.
 */
import { HubItemDetailPage } from '@/components/shared/HubItemDetailPage';

export default function ProductTimelineDetailPage() {
  return (
    <HubItemDetailPage
      buildBackHref={(key) => `/product-hub/${key}/timeline`}
      buildItemHref={(key, issueKey) => `/product-hub/${key}/timeline/${issueKey}`}
      backLabel="Back to timeline"
    />
  );
}
