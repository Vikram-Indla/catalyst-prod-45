# 00 — KICKOFF PROMPT (paste this, verbatim, as the first message to Claude Code)

> Before pasting: the four DECISION lines below are pre-filled with recommended
> defaults. Change them only if you disagree. Everything else pastes as-is.
> Prerequisite: this package's folder must already be committed to the repo at
> `docs/handover/workflows-admin/` (see README).

---

Read docs/handover/workflows-admin/01-HANDOVER.md in full before writing any code.
Open docs/handover/workflows-admin/02-workflows-admin-mockup-v3.html in the dev
browser — it is the exact visual and interaction specification for this build.
Replicate it; do not reinterpret it. Where the handover and the mockup conflict,
the mockup wins for visuals/interactions and the handover wins for data model,
naming, and pipeline.

DECISION-1: Fold the 5 Terminal statuses into the Done category (3-category model,
  Jira parity, 3-color StatusLozenge guardrail stays intact).
  [override to: "extend lozenge guardrail to 4 colors incl. Terminal red" if Vikram says so]
DECISION-2: Keep global rules (ph_workflow_transitions.from_status_id NULLABLE;
  every transition-validation query includes the OR from_status_id IS NULL branch).
SEED DATA: Use the consistency-checked arrays in the mockup's <script> block
  (STATUSES, WORKFLOWS, GLOBAL_RULES) as the migration seed.
  [override to: "probe live Jira per work item type via jira-compare PROBE lane
  against digital-transformation.atlassian.net first, then seed from probe output"]
MIGRATION PATH: <FILL: "Lovable migration pipeline" | "supabase db push">
  on branch <FILL: branch name>. Supabase project ref: nbygvcavxkiyqeqmsxbq.

BINDING CONSTRAINTS (no exceptions, no substitutions):
- Atlaskit components only, exactly per the component map in handover section 3.
- Colors: var(--ds-*) tokens only. The four category hexes live ONLY in
  src/constants/statusCategoryColors.ts. ads-validator must come back clean.
- Reuse the existing CatalystStatusLozenge from Storybook. Never fork it.
- @atlaskit/modal-dialog for all dialogs — never shadcn Dialog on this surface.
- @atlaskit/pragmatic-drag-and-drop for reorder — not @dnd-kit on this surface.
- Sentence case on every UI string. Banned vocabulary applies (no "Sprint",
  no FORGE terms on any surface string).
- Dark mode via tokens; at most ONE .dark override block in the entire surface,
  ideally zero (RCA S7 rule).
- HARD RULE: status names are unique across the entire registry, across ALL work
  item types — one name = one status, shared, never duplicated per type. Enforce
  at the DB unique index, at live inline modal validation (case-insensitive,
  excluding self, error copy per the mockup), and by resolving statuses by id
  (never by name string) in can_transition and all seeds.

EXECUTION ORDER (phase-gated; do not skip ahead):
  P1 migration (handover section 2 DDL + seed)
  P2 hooks (useWorkflowStatuses, useTypeWorkflow, useStatusConsumers + cache keys)
  P3 Section A — status registry table + mobile cards + search + view toggle
  P4 Edit Status modal (3 tabs, live uniqueness validation, flags)
  P5 Section B — per-type workflow EDITOR (tabs, meta strip, lanes, transition groups,
     global group, copy-workflow-from)
  P6 Section B — per-type workflow DIAGRAM (WorkflowDiagram.tsx + diagramLayout.ts:
     BFS-layer layout, draggable nodes, selectable/deletable arrows with floating
     toolbar + Delete key, add-transition click-source-then-destination, start dot,
     dashed "Any status · global" node, unreachable red-dot flag, zoom/pan/auto-layout;
     editor and diagram read the SAME query data)
  P7 consumer rewiring (Kanban, JiraTable, StatusLozenge, detail views,
     FilterDropdown, Bulk Change → useWorkflowStatuses / can_transition;
     remove hardcoded enums from workflowDefinitions.ts, keep as empty-DB fallback only)

PROOF PROTOCOL (a phase is NOT done without all three):
1. Side-by-side screenshot: your build vs the corresponding mockup region.
   List every visual or behavioral difference. Fix before proceeding.
2. The phase's behaviors from handover section 6 (items 1–19) pass as Playwright
   assertions. Write the assertions; do not just describe them.
3. No hardcoded color/font/shadow outside statusCategoryColors.ts (run ads-validator).
Never mark anything complete without the screenshot diff and passing assertions.
After P7: full regression sweep on /admin/workflows, then jira-compare parity pass
with the Jira statuses/workflow pages as reference; CRUD acceptance on a canonical
"Demo Status" is the final gate. File every defect as a JIRA bug on the BAU board.
Append lessons to CLAUDE.md as you hit them.

OUT OF SCOPE: Jira sync timestamps, bulk status migration, archiving UI
(schema column only), cross-project inheritance. The old 14×14 transition matrix
is deleted, not preserved.

Start with P1. Show me the migration SQL for approval before applying it.
