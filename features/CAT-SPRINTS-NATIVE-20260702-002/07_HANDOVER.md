# CAT-SPRINTS-NATIVE-20260702-002 — Handover

> State handover for next session.
> See template: docs/ways-of-working/CATALYST_CONTEXT_HANDOVER_TEMPLATE.md

## Feature Work ID
CAT-SPRINTS-NATIVE-20260702-002

## Status
ACTIVATED — discovery complete/in-flight, Plan Lock DRAFT pending. **No implementation yet.**

## Branch
main (no feature branch yet — create `feat/CAT-SPRINTS-NATIVE-20260702-002-s0-1` at first implementation slice)

## HEAD
6c81a2247 (feat(hover-card): integrate related links modal (G10)) — plus untracked: this feature folder, modified src/lib/atlaskit-icons.tsx (pre-existing, NOT ours — do not stage)

## Plan Lock status
DRAFT (03_PLAN_LOCK.md) — awaiting Vikram review. **Do not implement until APPROVED.**

## What is DONE (do not redo)
1. **Council session** — 5 advisors + Q1/Q4/Q5 challenges → 13_COUNCIL_VERDICT.md (verdict, data model, naming spec, status model, approval model, efficiency formula, migration order, slice plan).
2. **Live DB probes (staging = cyijbdeuehohvhnsywig via PostgREST + anon key from .env.local):** ph_jira_sprints HAS slug (uncodified) / NO deleted_at; 26 dead sprints (25 released, 1 archived); work_item_transitions=2,085 (1,278 with dwell, 0 native); work_item_changelogs=3,054 (0 sprint-field); catalyst_status_history=0; ph_release_sprints missing; ph_sprint_approvers exists empty. **RED FLAG: prod project (lmqwtldpfacrrlvdnmld, the MCP-connected one) has NO ph_jira_sprints at all — env schema drift.** RLS blocks anon on ph_issues → linkage counts still need service-role probe before S0.2 backfill.
3. **Jira DOM probe (12+ interactions, BAU versions page)** — structure/typography findings in 13_COUNCIL_VERDICT.md §Jira DOM probe. Vocabulary NOT imported (D-001: "Owner", never "Driver").
4. **Discovery agents:** A1 (components), A2 (screens/blast radius: 21 surface clusters), A3 (ADS critique), A7 (QA evidence plan: 20 functional probes) — reports in agents/. A4 (integration), A5 (ERD/safety), A6 (implementation file plan) — relaunched this session; check agents/ for A4/A5/A6 files; if missing, relaunch with the prompts in sessions/001_activate_feature.md §Agent prompts (or reconstruct from 13_COUNCIL_VERDICT.md tasks).
5. Karpathy loops LOOP-001…006 logged; decisions D-001…D-010 logged.

## Next exact action
1. Verify agents/A4_integration_architecture.md, A5_data_safety_erd.md, A6_implementation_plan.md exist; relaunch any missing.
2. Synthesize 03_PLAN_LOCK.md for **slice S0.1 only** (slug codification + deleted_at + useSprintBySlug fix + routes builder) from A4/A5/A6 — status DRAFT.
3. Fill 02_CANONICAL_DISCOVERY.md (from A1/A2), 05_UI_UX_REVIEW.md (wireframes + A3 fixes), 10_SCREENSHOT_CHECKLIST.md (from A7).
4. Present Plan Lock to Vikram/JK. **STOP.**

## Handover strategy between conversations (standing)
- Every session: `continue feature CAT-SPRINTS-NATIVE-20260702-002` → scaffolds sessions/NNN log → read 00, 01, 03, 07 (this file), 08, 09, 11, 12 + agents/*.md summaries.
- One slice per session max (2h box). Update 04_EXECUTION_LOG.md + this handover BEFORE ending any session that touched code.
- All agent output goes to agents/*.md files, never only chat — chat context is disposable, the folder is not.
- DB probes: use PostgREST + anon key from .env.local when the Supabase MCP is down/points at prod; note RLS blindness for ph_issues.
- Jira parity: /jira-compare only for structure/CSS/typography; D-001 terminology rule applies.

## Open risks
- **RED FLAG (env drift):** prod DB lacks ph_jira_sprints entirely; all migrations validated on staging only. Decision needed from Vikram on prod strategy before any deploy.
- Analytics gates (D-007) not yet passed: native transition writes do not exist (0 rows) — Phase 3 stays gated.
- useSprintBySlug queries nonexistent deleted_at TODAY (live bug) — S0.1 fixes it.
- SPRINT_CONFIG hand-concatenates URLs with UUID fallback (A2 finding) — violates slug contract; fix in S0.1.
- 21 blast-radius surface clusters (A2) — regression probes defined in A7 §3 must run after Phase 0 and Phase 2.
- Session usage limits killed 4 agent final-summaries once already (reports still landed) — prefer file-writing agents + compact summaries.

## Next prompt
`continue feature CAT-SPRINTS-NATIVE-20260702-002`
