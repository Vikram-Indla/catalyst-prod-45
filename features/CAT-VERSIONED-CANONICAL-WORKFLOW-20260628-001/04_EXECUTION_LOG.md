# CAT-VERSIONED-CANONICAL-WORKFLOW-20260628-001 — Execution Log

> Running log of all actions, decisions, and changes made during implementation.
> Append entries — never delete.

---

## Log entries

### 2026-06-28 — P0 foundation APPLIED to staging
- Solved apply blocker: Supabase Management API (`/v1/projects/cyij/database/query`) + CLI access token (`~/.config/supabase/access-token`), non-default User-Agent (Cloudflare 1010). No DB password, no MCP (prod-scoped), no Docker. See [[staging-ddl-via-management-api]].
- Applied `20260628200000_ph_wf_foundation.sql` → 13 ph_wf_* tables (HTTP 201). Verified: 13 tables, RLS on all, counts 0, 3 fns, no existing object removed.
- Regenerated types from staging (+928 lines, 0 deletions). `tsc --noEmit` = 0 errors.

### 2026-06-28 — Phase 3A `/admin/workflows` versioning foundation
- New route `/admin/workflows/versions` (FullAppRoutes +lazy +route). New `WorkflowVersioningPage.tsx` (7 ADS tabs: Versions/Schemes/Assignments/Statuses/Transitions/Migration-preview/Audit) + `useWorkflowFoundation.ts` read hooks + safe create-draft action. "Versioned engine →" link added to classic header. Classic builder verified unbroken (screenshot).

### 2026-06-28 — Story vertical slice (seed + advisory engine)
- Seeded canonical Story workflow into ph_wf_* on staging: version v1 PUBLISHED (template Story SDLC), 18 statuses (correct todo/in_progress/done categories, ADS color tokens), 21 transitions (13 fwd / 3 back / 3 exception / 1 cancel / 1 reopen; 2 global = blocked/canceled), scheme "Default Canonical Scheme" (is_default) + entry story→v1 + BAU assignment. Resolver path BAU→scheme→story→v1 verified.
- Built `src/lib/workflow/canonical/runtime.ts`: resolveCanonicalVersion, availableTransitions, evaluateTransition (advisory role/guard skeleton), writeAdvisoryAudit (ph_wf_write_audit RPC), recordAdvisoryStatusChange.
- Wired advisory into `useCatalystIssueMutations.updateStatus` (Story-gated via issue_type→entity map; additive, non-blocking; logs would_block + tooltip basis). Existing write unchanged.
- Proved audit end-to-end: ph_wf_write_audit inserts; 2 rows (backlog→refinement allow/false; backlog→done deny/would_block=true). `tsc` 0 errors, color gate clean.

### 2026-06-28 — Story runtime completion (all surfaces)
- Seed `20260628230000_ph_wf_story_roles_guards.sql`: 24 transition roles + 13 guards for Story v1 (reproducible). Runtime `evaluateTransition` now loads + reports roles/guards into audit (advisory; not enforced).
- Flipped JiraTable Story status editor: `makeStatusEditCell` gained `getIssueType`; Story rows source options/labels from canonical (`useCanonicalIssueWorkflow`) + unmapped-legacy warning row; non-Story rows unchanged. BacklogPage passes `getIssueType: r=>r.issue_type`.
- Flipped Story backlog status filter: `STATUS_FILTER_OPTIONS` = canonical 18 ∪ legacy (canonical first).
- Flipped kanban: `useKanbanMutations.updateStatus` (project mode) derives Story category from config + writes advisory audit (source kanban_drag) + `KANBAN_BLOCKING_ENABLED=false` revert scaffold.
- Hook exposes `resolveStatusKey`/`labelForStatus`/`isCanonical`.
- LIVE UI evidence: created controlled test Story WF-TEST-9001 → pill move Backlog→Refinement via real UI → audit row would_block=false, role_decision=allow, allowed_roles=[product_owner], status_category='todo' (from config), source catalyst_status_pill. Both would_block cases in ph_wf_audit (false×2 pill, true×1 kanban_drag). Test story soft-deleted (ph_issues hard-delete guardrail respected; audit preserved).
- tsc 0, `npm run build` exit 0.

### Pre-existing blocker (NOT this slice)
- `npm run build` + Vite HMR overlay fail on missing `src/types/workhub.ts` (imported by `src/hooks/workhub/useAllWork.ts`) — known deprecation debt, not in this changeset; my code never imports workhub. Flagged as background task. tsc passes; lazy routes that don't import workhub run.
