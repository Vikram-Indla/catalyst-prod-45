/**
 * InvestorJourneyBacklogPage — /product-hub/INV/backlog
 *
 * Renders the identical Project Hub BacklogPage UI, scoped to the
 * Investor Journey product team. Data comes from ph_issues filtered by
 * the five team assignee account IDs across all synced Jira projects.
 *
 * JQL equivalent (Jira-side):
 *   assignee IN (
 *     "557058:93d1c663-e044-429d-b230-0be303c91a83",
 *     "712020:551b810b-5bca-4eb9-8f8c-c4dc7305e177",
 *     "70121:cda609ff-0c5b-4c06-8b1c-1ef1634e55e4",
 *     "5be3fef965364b69de240fe8",
 *     "712020:e7978026-c881-4f7b-9014-73ca62c41b0a"
 *   ) AND project = "MIM Digital Transformation Demand"
 *
 * When MDT syncs, its issues appear automatically — no code change needed.
 * The "Implementation Project[Dropdown]" filter (customfield) is a follow-up
 * once the Jira field ID is confirmed from the schema.
 */

import { BacklogPage } from '@/modules/project-work-hub/pages/BacklogPage.atlaskit';

const INV_ASSIGNEE_IDS = [
  '557058:93d1c663-e044-429d-b230-0be303c91a83',
  '712020:551b810b-5bca-4eb9-8f8c-c4dc7305e177',
  '70121:cda609ff-0c5b-4c06-8b1c-1ef1634e55e4',
  '5be3fef965364b69de240fe8',
  '712020:e7978026-c881-4f7b-9014-73ca62c41b0a',
];

// INV product UUID from public.products (seeded in migration 20260516160000).
// Used as a stable cache-key stand-in; BacklogPage skips project_members
// query when assigneeIds override is active.
const INV_PRODUCT_ID = 'f579e465-17e9-4276-b82f-3b4eca2ef117';

export default function InvestorJourneyBacklogPage() {
  return (
    <BacklogPage
      projectId={INV_PRODUCT_ID}
      projectKey="INV"
      displayName="Investor Journey Product"
      baseUrl="/product-hub/INV"
      assigneeIds={INV_ASSIGNEE_IDS}
    />
  );
}
