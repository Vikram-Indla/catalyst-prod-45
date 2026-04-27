/**
 * phIssueQueries — CANONICAL Supabase SELECT clauses for `ph_issues`.
 *
 * ─────────────────────────────────────────────────────────────────────
 * WHY THIS FILE EXISTS
 * ─────────────────────────────────────────────────────────────────────
 * Catalyst has 25+ surfaces that read from `ph_issues` (parent pickers,
 * detail panels, kanban cards, backlog rows, search, etc). Each one
 * historically inlined its own SELECT clause. On 2026-04-28 the
 * `useEpicBacklog` hook was discovered to include `comment_count` in its
 * SELECT — a column that does NOT exist on ph_issues. PostgREST returned
 * 400 with PG error 42703 'column does not exist'. React Query treated
 * `epics` as `[]`, so the Backlog hub's Parent picker rendered empty
 * options on every BAU row. The 400 was invisible in the UI; the only
 * way to spot it was to read the network response body.
 *
 * To prevent this from recurring, every read of ph_issues for picker /
 * row-rendering use cases should reference one of the constants in this
 * file. Adding a column to a SELECT requires checking against the
 * canonical schema (see `KNOWN_PH_ISSUES_COLUMNS` below) AND the
 * Supabase types (`src/integrations/supabase/types.ts`).
 *
 * Audit: .catalyst/audits/jira-compare/2026-04-28-bau-list-grouped-inline-edit-regression.md
 * Lesson: CLAUDE.md §21 + §13 FP-012 (Apr 28, 2026)
 *
 * ─────────────────────────────────────────────────────────────────────
 * COLUMNS THAT EXIST (verified against information_schema 2026-04-28)
 * ─────────────────────────────────────────────────────────────────────
 * Identity:        id (uuid), issue_key (text PK), source ('jira'|'catalyst')
 * Display:         summary, status, status_category, issue_type, priority
 * Hierarchy:       parent_key, parent_summary, hierarchy_level
 * Project:         project_key, project_name
 * People:          assignee_account_id, assignee_display_name, assignee_user_id,
 *                  reporter_account_id, reporter_display_name, reporter_user_id
 * Time:            jira_created_at, jira_updated_at, jira_removed_at,
 *                  due_date, baseline_date, effective_due_date,
 *                  first_synced_at, last_synced_at, synced_at,
 *                  pending_write_back_at
 * Soft-delete:     archived_at, archived_by, deleted_at
 * Body:            description_text, description_adf, acceptance_criteria
 * Json blobs:      comments, changelog, components, fix_versions, labels, raw_json
 * Workflow:        resolution, story_points, sprint_name, theme_id, sort_order, position
 * Misc:            is_flagged, flag_reason, type_icon_url, sync_hash, sync_status
 *
 * ─────────────────────────────────────────────────────────────────────
 * COLUMNS THAT DO NOT EXIST (writing them in a SELECT = silent 400)
 * ─────────────────────────────────────────────────────────────────────
 *   ❌ comment_count        ← the original bug. Use comments JSON length client-side.
 *   ❌ attachment_count     ← computed elsewhere; not on ph_issues.
 *   ❌ child_count          ← computed via parent_key lookup, not stored.
 *   ❌ children_count       ← same.
 *   ❌ link_count           ← lives on ph_issue_links (joined separately).
 *   ❌ worklog_count        ← lives on ph_worklogs (if it exists).
 *
 * If a derived count is required, fetch it via a JOIN/aggregation in a
 * separate query and merge client-side — NEVER add it to the SELECT here.
 *
 * ─────────────────────────────────────────────────────────────────────
 * USAGE
 * ─────────────────────────────────────────────────────────────────────
 *   import { PH_ISSUES_PICKER_SELECT, PH_ISSUES_BACKLOG_SELECT } from '@/modules/project-work-hub/lib/phIssueQueries';
 *
 *   const { data } = await supabase
 *     .from('ph_issues')
 *     .select(PH_ISSUES_PICKER_SELECT)
 *     .eq('project_key', projectKey)
 *     .eq('issue_type', 'Epic')
 *     .is('deleted_at', null);
 *
 * The constants are plain strings so PostgREST receives the exact column
 * list — no codegen, no runtime overhead.
 */

/**
 * Canonical SELECT for parent / epic / story pickers.
 *
 * Used by:
 *  - `AddParentPicker` (canonical detail-view picker, all variants)
 *  - `ParentPickerPanel` (kanban overflow menu)
 *  - `CatalystParentLinker` (Catalyst-native detail views)
 *  - `EditableFields` parent picker (StoryDetailModal)
 *  - `CreateStoryModal` parent loadOptions
 *  - any future picker that resolves a parent candidate row
 *
 * Includes the minimum columns to render a row in a popover list:
 * identity (id+issue_key), display (summary, issue_type), and
 * status (status_category for "in-progress" filtering).
 */
export const PH_ISSUES_PICKER_SELECT =
  'id, issue_key, summary, issue_type, status, status_category';

/**
 * Canonical SELECT for backlog tables (Epic / Story / Defect / Incident).
 *
 * Adds the fields needed to render a full row in the Backlog hub: people,
 * priority, parent linkage, dates, and sync source.
 *
 * Used by:
 *  - `useEpicBacklog`
 *  - `useStoryBacklog`
 *  - `useFeatureBacklog` (when wired)
 *  - any future backlog-row loader
 *
 * Notes:
 *  - `reporter_display_name` was added in Apr 2026 (L52 — Story panel needs it).
 *    Epic surfaces don't read it but it's harmless to over-select.
 *  - `comment_count` was REMOVED in Apr 28 2026 (P1 #1 fix) — it doesn't
 *    exist on ph_issues. See file header for the audit reference.
 */
export const PH_ISSUES_BACKLOG_SELECT =
  'issue_key, summary, status, status_category, assignee_display_name, ' +
  'reporter_display_name, due_date, priority, parent_key, parent_summary, ' +
  'issue_type, jira_created_at, jira_updated_at, source';

/**
 * SELECT for the small "resolve current parent" lookups (single-row reads
 * by issue_key). The display chip needs identity + label, nothing more.
 */
export const PH_ISSUES_PARENT_RESOLVE_SELECT =
  'id, issue_key, summary, issue_type, status, status_category';

/**
 * The columns that do NOT exist on ph_issues. Listed here so the constant
 * is grep-able from anywhere — if you find yourself wanting to SELECT one
 * of these, you've hit the same trap that caused the 2026-04-28 bug.
 *
 * (This list is for documentation only. It is not consumed by code.)
 */
export const PH_ISSUES_NON_EXISTENT_COLUMNS = [
  'comment_count',
  'attachment_count',
  'child_count',
  'children_count',
  'link_count',
  'worklog_count',
] as const;
