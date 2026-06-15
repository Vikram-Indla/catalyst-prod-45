/**
 * ProductBacklogDetailPage — /product-hub/:key/backlog/:issueKey
 *
 * Thin wrapper around the canonical HubItemDetailPage. All resolution logic
 * (ph_issues → business_requests → catalyst_issues) lives in the shared
 * component; this page only declares the product-backlog URL pattern.
 *
 * Note: file is still named InvestorJourneyDetailPage.tsx for git history;
 * the lazy import in FullAppRoutes (`ProductBacklogDetailPage`) is the
 * public name.
 */
import { HubItemDetailPage } from '@/components/shared/HubItemDetailPage';

export default function InvestorJourneyDetailPage() {
  return (
    <HubItemDetailPage
      buildBackHref={(key) => `/product-hub/${key}/backlog`}
      buildItemHref={(key, issueKey) => `/product-hub/${key}/backlog/${issueKey}`}
      backLabel="Back to backlog"
    />
  );
}
