# Hypothesis: test-hub / exp-002

**Title:** Test Hub Data Contract & Schema Truth Audit
**Date:** 2026-06-26
**Type:** research

> Research experiment — NO code changes allowed. Documentation only.

---

## Hypothesis

If we identify the authoritative Test Hub data contract before UI rebuilding, then future implementation experiments can avoid building on legacy `th_*` paths, dead RPCs, or inconsistent schema assumptions.

---

## Acceptance Criteria

Declared before starting. Not modified after starting.

- [ ] All Test Hub table families identified (tm_*, th_*, other)
- [ ] All RPC/function references mapped (dashboard, repository, cycle, traceability, reporting)
- [ ] All hooks cataloged: which query tm_* vs th_* vs RPC
- [ ] All broken data paths named with evidence (file:line)
- [ ] Canonical table family recommendation made with reasoning
- [ ] List of pages safe for UI audit vs pages blocked by data-contract issues
- [ ] gap-analysis.md updated with data contract findings
- [ ] experiment-roadmap.md updated with follow-up experiment sequence
- [ ] No `src/` files modified
- [ ] No DB queries run
- [ ] No migrations run

---

## Pre-Work Reuse Check

N/A — research experiment, no code changes.
