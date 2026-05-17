# RESUME — Product Dashboard v2 (paste in Claude Code on the other machine)

> **What this is:** a single self-contained block to paste into a fresh Claude Code session on any machine. Pulls together the locked decisions, gates, and next-action plan from the 2026-05-15 preflight without the SQL bloat. The full plan + SQL lives in `preflight-handover-2026-05-15-product-dashboard-v2.md` (same folder).

---

## How to use

1. On the other machine: `git pull origin main`
2. Open this file
3. Find the line `Group 1 SQL status:` in the block below — replace it with one of:
   - `applied successfully — verification returned 3 / 1 / 2 / 2`
   - `block N failed with: <paste error here>`
   - `not yet applied — please pause Group 2 until I confirm`
4. Copy the entire block between the `╔══` and `╚══` rules
5. Paste as your first message in a fresh Claude Code session inside the `catalyst-prod-45` repo

---

## The block (copy from ╔ to ╚)

```
╔════════════════════════════════════════════════════════════════════
  /preflight resume — Product Dashboard v2 rebuild
  Session origin: 2026-05-15 high-stake preflight (full 17-advisor council)
╚════════════════════════════════════════════════════════════════════

REQUIRED FIRST ACTIONS (do in this order; parallelise reads where you can)
─────────────────────────────────────────────────────────────────────
1. Read the full handover (plan + Group 1 SQL + all 8 groups · 34 rows):
   /Users/vikramindla/Documents/GitHub/catalyst-prod-45/.obsidian-vault/active/preflight-handover-2026-05-15-product-dashboard-v2.md

2. Read project gates (look for any new lessons since 2026-05-15):
   /Users/vikramindla/Documents/GitHub/catalyst-prod-45/CLAUDE.md

3. Confirm git state:
   git -C /Users/vikramindla/Documents/GitHub/catalyst-prod-45 status
   git -C /Users/vikramindla/Documents/GitHub/catalyst-prod-45 log --oneline -3

4. Confirm Group 1 SQL status (see CURRENT STATE below).


DECISIONS LOCKED — DO NOT RE-DELIBERATE
─────────────────────────────────────────────────────────────────────
• All 6 widgets configurable in v1 (each rebuild ships with its settings panel)
• Stage Drill-Down Drawer ships ALL 4 unique features:
    - inline AI summary per BR (one-click "why this is here")
    - BR → Epic → Story → Incident colour tree (children coloured by parent BR phase)
    - stage handoff SLA timeline (per-BR thin timeline through stages)
    - owner accountability footer (named-owner aging summary)
• AI Post-Mortem v1 = 5 sections (Lifecycle · Children · Incidents · Timeline · Where We Stand)
  · bulleted markdown · reuses ai-improve-story with new improve_type='br_postmortem'
• Skip HTML mockup — go straight to React on localhost:8080
• Multi-tenant productization rule: NO hardcoded names, role labels, or stage counts in any widget


PHASE 0.5 REGISTER — 8 P0 HALTS to resolve through the plan
─────────────────────────────────────────────────────────────────────
A1  hardcoded hex            → use token('color.…') from @atlaskit/tokens
A2  @atlaskit/popup bug      → createPortal pattern (CLAUDE.md 2026-05-08)
A3  type icons               → JiraIssueTypeIcon from @/lib/jira-issue-type-icons
A4  hand-rolled menus        → @atlaskit/dropdown-menu only
A6  react-select direct      → @atlaskit/select only
A8  custom font              → system stack only
A11 hardcoded stage count    → useDemandProcessSteps() data-driven
A12 hardcoded role labels    → useDashboardWorkloadRoles() from product_roles
A13 hardcoded user names     → profile data only
W3  RLS cascade              → already in Group 1 SQL (user_widget_settings)


NON-NEGOTIABLE GATES (per CLAUDE.md)
─────────────────────────────────────────────────────────────────────
• Port 8080 lock — never 8081, never any other port
• No preview_* tools — Chrome MCP only for visual verification
• TDD — failing test row precedes every implementation row
• ask-Vikram before any user-visible field/component add or remove
• SQL → Lovable manual paste only — never autonomous SQL execution
• ADS-only — @atlaskit/* components + @atlaskit/tokens for every colour
• Use git -C <path> ... never cd <path> && git ... (CLAUDE.md shell rule)


CURRENT STATE — replace this line before pasting
─────────────────────────────────────────────────────────────────────
Group 1 SQL status: <REPLACE BEFORE PASTING — see "How to use" above>


NEXT WORK — Group 2 (Hooks layer · 5 rows · 1 session)
─────────────────────────────────────────────────────────────────────
TDD: failing test first per row. Stop after each row for my "go" before next.

Files to create:

1. src/hooks/useWidgetSettings.ts
   TanStack Query. Reads user_widget_settings (per-user override) →
   falls back to dashboard_widget_defaults (tenant default).
   Returns merged config object.

2. src/hooks/useDashboardWorkloadRoles.ts
   Reads product_roles WHERE is_workload_relevant = true.
   Joined with user count per role.
   Replaces hardcoded "Delivery Managers" / "Product Owners" labels.

3. src/hooks/useBrCycleTime.ts
   Args: { startStep: string, endStep: string }
   Reads from business_request_stage_history (Phase 1 dependency from prior preflight — confirm exists).
   Returns { median, avg, p90, sample_size }.
   Used 3 ways:
     Business leg: startStep=funnel,                  endStep=ready_for_implementation
     IT leg:       startStep=ready_for_implementation, endStep=done
     Total:        startStep=funnel,                  endStep=done

4. src/hooks/useBrLandingStep.ts
   Reads demand_process_steps WHERE is_landing = true LIMIT 1.
   Returns the configured landing step (Done by default; admin can change).

5. Vitest spec for each hook (4 specs).


EXECUTION POLICY — for THIS conversation
─────────────────────────────────────────────────────────────────────
• Do NOT regenerate the plan, council, or Phase 2.5 evidence — locked in handover.
• Start with Group 2 row 1: failing test for useWidgetSettings.
• After each row: stop, show the diff, suggest commit message, await my "go".
• On "go": commit (specific files only, never -A), tell me the next row.
• Never push to origin without my explicit "push it" instruction.
• If any P0 halt re-emerges in implementation, halt and ask before working around it.

╔════════════════════════════════════════════════════════════════════
  END OF RESUME BLOCK
╚════════════════════════════════════════════════════════════════════
```

---

## What's in the full handover (for reference, not for pasting)

The full handover at `preflight-handover-2026-05-15-product-dashboard-v2.md` contains:
- Phase 0.5 — full Jira Architect register (28 patterns scanned)
- Council verdicts (3 panels × 17 advisors synthesized)
- Phase 2.5 — On-Site Evidence Report
- Phase 3 — full plan (8 groups · 34 rows)
- File-touched estimate (~12 new files + 4 SQL migrations)
- Lesson candidates (3 drafts awaiting CLAUDE.md approval)
- **Group 1 SQL — 4 production-ready blocks** for Lovable paste

The fresh Claude Code session reads that file in its first action (step 1 of REQUIRED FIRST ACTIONS), so you don't need to paste anything else.
