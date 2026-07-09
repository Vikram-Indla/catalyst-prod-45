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
