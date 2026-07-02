# CAT-HEALTH-ENGINE-20260702-001 — Karpathy Loop Log

> Karpathy Loop for Catalyst means Hypothesis → Experiment → Measure → Keep/Discard → Log.
> Log every loop entry here before moving to the next experiment.
> See protocol: docs/ways-of-working/CATALYST_KARPATHY_LOOP.md

---

## Loop entries

### Format

```
## [LOOP-NNN] <Short description>

**Date:** YYYY-MM-DD
**Phase:** Discovery | Implementation | Validation
**Hypothesis:** [What you expected to be true]
**Experiment:** [Exact probe run]
**Evidence:** [What you found]
**Decision:** KEEP | DISCARD
**Reason:** [Why — 1-2 sentences]
**Next step:** [What to do with this result]
```

---

## [LOOP-001] Board Health has hardcoded/Tailwind color violations

**Date:** 2026-07-02
**Phase:** Discovery
**Hypothesis:** Screenshot shows yellow pills + black divider → source has hardcoded hex/rgb/Tailwind color classes (CLAUDE.md color-law violation).
**Experiment:** UI/UX Critic agent read `BoardInsightsPanel.tsx` + `AttentionItemCard.tsx` fully, grepped for hex/rgb/hsl/Tailwind-color patterns.
**Evidence:** Zero violations. Both files use only `var(--ds-*)` tokens. One narrower bug found: `var(--ds-text-warning)` (a text token) misused as a border color on High-risk-band cards.
**Decision:** DISCARD (original hypothesis)
**Reason:** The visual complaint is real but the cause is a token-resolution/misuse bug, not a color-law violation. Fixing "hardcoded colors" would have been fixing nothing.
**Next step:** Plan Lock scoped to the actual border-token fix instead.

## [LOOP-002] Card recommendation text is generic boilerplate

**Date:** 2026-07-02
**Phase:** Discovery
**Hypothesis:** "Resolve or escalate the blocker" repeats identically per card (from screenshot reading two cards with similar text).
**Experiment:** UI/UX Critic agent read `useBoardInsights.ts` lines 205-216.
**Evidence:** 6 distinct rule-specific messages, selected by signal precedence (flagged/at-risk, overdue, unassigned+high-priority, stale7d, due-soon, fallback).
**Decision:** DISCARD
**Reason:** Zero-assumption rule already satisfied — the two sampled cards in the screenshot happened to share the same fired rule (flagged/at-risk), giving a false impression of boilerplate.
**Next step:** No action needed in Phase 0.

## [LOOP-003] Sprint (Phase 3) can source start/end/capacity from ph_sprints

**Date:** 2026-07-02
**Phase:** Discovery
**Hypothesis:** `ph_sprints` table holds start_date/end_date/capacity/status, usable for the Sprint Health adapter later.
**Experiment:** Data/Safety Guard agent checked generated Supabase types + grepped migrations.
**Evidence:** `ph_sprints` does not exist. Sprint data available today is only `sprint_name` (text) on `ph_issues` — no real dates/capacity.
**Decision:** DISCARD (for now)
**Reason:** Phase 3's original design assumption is invalid; would need either a schema addition or a different data source before that phase can start.
**Next step:** Not blocking for Phase 0. Flag explicitly in the Phase 3 Plan Lock when that feature folder is created — don't silently reuse this assumption.

## [LOOP-004] Trigger for Board Health is already the magenta pulse icon

**Date:** 2026-07-02
**Phase:** Discovery
**Hypothesis:** Since Vikram wants the magenta pulse as the universal Health trigger, and one already exists in the codebase (`CatyPulseIcon`), Board Health probably already uses it.
**Experiment:** Canonical Screen Discovery agent read `BoardManagerPage.tsx` + `BoardRowActions` trigger logic.
**Evidence:** Current trigger is a plain `Activity` icon in a row-action menu. The magenta pulse icon exists but is only used by a separate, unrelated component (`CatyBoardInsight.tsx`, an AI board-digest feature, not this rule-based Board Health panel).
**Decision:** KEEP (as a real fix)
**Reason:** This is a genuine, actionable gap matching Vikram's explicit ask — swap the trigger icon to `CatyPulseIcon`, without touching or merging `CatyBoardInsight`.
**Next step:** Included in Phase 0 file-edit list (`BoardManagerPage.tsx` edit).
