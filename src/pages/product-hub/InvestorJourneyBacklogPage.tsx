/**
 * InvestorJourneyBacklogPage — /product-hub/INV/backlog
 *
 * Renders the Business Request backlog for the Investor Journey product.
 * Delegates to RequestListingPage which:
 *  - reads `code = 'INV'` from useParams and scopes the header accordingly
 *  - queries ph_requests (Business Request work items)
 *  - opens CatalystViewBusinessRequestV2 as an in-page side panel on row click
 *
 * Data filter (ph_requests assignee scope) will be wired once MDT project
 * syncs and ph_requests gains a product_id FK. The JQL equivalent is:
 *   assignee IN (5 INV team account IDs) AND project = "MIM Digital Transformation Demand"
 */
import RequestListingPage from '@/pages/producthub/RequestListingPage';

export default function InvestorJourneyBacklogPage() {
  return <RequestListingPage />;
}
