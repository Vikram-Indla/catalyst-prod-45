/**
 * LinkedWorkItems — shared types.
 *
 * These mirror the persisted `ph_issue_links` rows and the enriched target
 * shape assembled in `hooks.ts`. Kept in a dedicated file so every sub-component
 * can type-check against the same canonical shape without re-importing the
 * legacy types barrel.
 */
import type { StatusCategory } from '../dialogs/story-detail-modules/types';

export type LinkedWorkItemTarget = {
  id?: string;
  issue_key: string;
  summary: string;
  issue_type: string;
  status: string;
  status_category: StatusCategory;
  assignee_account_id: string | null;
  assignee_display_name: string | null;
  assignee_avatar_url?: string | null;
  priority: string | null;
  jira_updated_at: string | null;
  project_key?: string | null;
  project_id?: string | null;
};

export type LinkedWorkItem = {
  id: string;
  link_type: string;
  created_at: string;
  source_id: string;
  target_id: string;
  target: LinkedWorkItemTarget;
};

export type LinkDirection = 'inward' | 'outward';

export type LinkTypeOption = {
  value: string;
  label: string;
};
