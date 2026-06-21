/**
 * BrSidebarAdapter — maps BusinessRequest → CatalystSidebarDetails.
 *
 * CLAUDE.md mandate: "ADOPT CANONICAL COMPONENTS — DO NOT REIMPLEMENT"
 * This adapter feeds BR data into the canonical CatalystSidebarDetails
 * instead of maintaining BrSidebarDetails as a parallel reimplementation.
 *
 * BR-specific fields (Delivery Manager, Product Owner, Stakeholders,
 * Planned Release, Target Date) are passed as children (extraRows).
 */
import type { BusinessRequest } from '@/types/business-request';
import type { PhIssue } from '@/modules/project-work-hub/components/dialogs/story-detail-modules/types';

/**
 * Maps a BusinessRequest to the PhIssue shape expected by CatalystSidebarDetails.
 * Fields not present on BR map to null — the canonical component
 * handles missing fields gracefully.
 */
export function mapBrToIssueLike(br: BusinessRequest | null): PhIssue | null {
  if (!br) return null;
  return {
    id: br.id,
    issue_key: br.request_key,
    summary: br.title ?? '',
    issue_type: 'Business Request',
    status: br.process_step ?? '',
    /* Zero-assumption (CLAUDE.md 2026-06-11): never lie with a typed
       fallback. Canonical CatalystSidebarDetails derives category from
       status text via getStatusCategory() when this is null. */
    status_category: null,
    /* Zero-assumption: was `br.urgency ?? 'Medium'` — silently lied with
       Medium for every BR missing an urgency. Pass through as-is. */
    priority: br.urgency ?? null,
    assignee_display_name: null,
    assignee_account_id: null,
    reporter_display_name: null,
    reporter_account_id: null,
    parent_key: null,
    parent_summary: null,
    labels: null,
    description_adf: null,
    description_text: br.description ?? null,
    sprint_release: null,
    deleted_at: br.deleted_at ?? null,
    jira_created_at: br.created_at ?? null,
    jira_updated_at: br.updated_at ?? null,
    /* product_id is a UUID, NOT a project_key (e.g. 'MIM'). Was used as
       project_key fallback which is semantically wrong. Caller passes
       the real projectKey separately. */
    project_key: null,
  };
}
