/**
 * Ideation module types — CAT-IDEATION-REBUILD-20260709-001.
 *
 * Greenfield module over the idn_* schema (S1/S2 migrations). Zero legacy
 * carryover: nothing here may reference ph_ideas or the retired ideation
 * inventory. Phase 1 ships the skeleton only; row-shape types land with the
 * Phase 2 CRUD slices alongside their API layer.
 */

/** Workflow status keys seeded in ph_wf_* for entity_key 'ideation' (S3). */
export type IdeaStatusKey =
  | 'draft'
  | 'submitted'
  | 'screening'
  | 'evaluation'
  | 'approved'
  | 'declined'
  | 'parked'
  | 'merged'
  | 'converted'
  | 'delivered';

/** Vote importance levels per D3 (idn_votes.importance smallint 1–4). */
export type VoteImportance = 'critical' | 'important' | 'nice' | 'none';

/** Module key registered in admin_nav_modules / admin_role_module_permissions (S3). */
export const IDEATION_MODULE_KEY = 'ideation';

/** idn_ideas.idea_class (S1 enum). */
export type IdeaClass = 'problem' | 'opportunity' | 'improvement';

/** Row shape read from idn_ideas for the Inbox queue (Phase 2 S1). Only the
 *  columns the Inbox actually renders — full detail shape lands with the
 *  Detail page slice. */
export interface IdeaRow {
  id: string;
  idea_key: string;
  slug: string;
  title: string;
  problem_statement: unknown;
  idea_class: IdeaClass;
  workflow_status_key: IdeaStatusKey;
  created_at: string;
}

/** Row shape read from idn_ideas for the Detail page (Phase 2 S3). Superset
 *  of IdeaRow's columns plus the rail fields (product, submitter). */
export interface IdeaDetailRow {
  id: string;
  idea_key: string;
  slug: string;
  title: string;
  problem_statement: unknown;
  proposed_value: unknown;
  idea_class: IdeaClass;
  workflow_status_key: IdeaStatusKey;
  submitter_id: string;
  submitter_name: string | null;
  product_id: string | null;
  product_name: string | null;
  created_at: string;
}

/** Client-supplied columns for a new idn_ideas row (Phase 2 S2 create form).
 *  Everything else is trigger/default-owned: idea_key + slug (BEFORE INSERT
 *  triggers — never send, the guard is soft), submitter_id (auth.uid()
 *  default, pinned by RLS WITH CHECK), workflow_status_key ('draft' default —
 *  submit is a second, audited update per D13), origin_channel ('form'). */
export interface CreateIdeaInput {
  title: string;
  idea_class: IdeaClass;
  /** ADF jsonb — omit when empty (zero-assumption: no fabricated empty docs). */
  problem_statement?: unknown;
  proposed_value?: unknown;
  product_id?: string | null;
}

/** One idn_comments row, joined with the author's profile. */
export interface IdeaCommentRow {
  id: string;
  idea_id: string;
  user_id: string;
  author_name: string | null;
  content: unknown;
  parent_comment_id: string | null;
  created_at: string;
}

/** An idea plotted on the Portfolio field chart (Phase 2 S5) — only ideas
 *  with BOTH a value and effort score from the active model. Ideas missing
 *  either score are never given a fabricated midpoint; they go in the
 *  unscored tray instead (04 §C.7 "unscored ideas tray" state). */
export interface PortfolioPoint {
  id: string;
  idea_key: string;
  slug: string;
  title: string;
  idea_class: IdeaClass;
  workflow_status_key: IdeaStatusKey;
  value: number;
  effort: number;
}
