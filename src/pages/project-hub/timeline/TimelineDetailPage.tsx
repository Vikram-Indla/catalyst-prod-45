/**
 * TimelineDetailPage — /project-hub/:key/timeline/:issueKey
 *
 * Thin wrapper around the canonical HubItemDetailPage. All resolution logic
 * (ph_issues → business_requests → catalyst_issues) and detail rendering
 * (CatalystDetailRouter, document title, back button) live in the shared
 * component, so this page only declares its hub's URL pattern.
 */
import { HubItemDetailPage } from '@/components/shared/HubItemDetailPage';

export default function TimelineDetailPage() {
  return (
    <HubItemDetailPage
      buildBackHref={(key) => `/project-hub/${key}/timeline`}
      buildItemHref={(key, issueKey) => `/project-hub/${key}/timeline/${issueKey}`}
      backLabel="Back to timeline"
    />
  );
}
