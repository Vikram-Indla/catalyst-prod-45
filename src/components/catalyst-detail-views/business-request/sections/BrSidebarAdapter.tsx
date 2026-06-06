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
import React from 'react';
import type { BusinessRequest } from '@/types/business-request';

/**
 * Maps a BusinessRequest to the PhIssue shape expected by CatalystSidebarDetails.
 * Fields not present on BR map to null/undefined — the canonical component
 * handles missing fields gracefully.
 */
export function mapBrToIssueLike(br: BusinessRequest | null) {
  if (!br) return null;
  return {
    issue_key: br.request_key ?? br.id ?? '',
    summary: br.title ?? '',
    issue_type: 'Business Request',
    status: br.status ?? '',
    status_category: br.status_category ?? 'To Do',
    priority: br.urgency ?? br.priority ?? 'Medium',
    assignee_display_name: br.assignee_name ?? null,
    assignee_account_id: br.assignee_id ?? null,
    reporter_display_name: br.requestor_name ?? null,
    reporter_account_id: br.requestor_id ?? null,
    parent_key: null,
    parent_summary: null,
    labels: br.labels ?? [],
    severity: null,
    due_date: br.end_date ?? null,
    jira_created_at: br.created_at ?? null,
    jira_updated_at: br.updated_at ?? null,
    description_text: br.description ?? null,
    project_key: br.product_code ?? '',
  };
}
