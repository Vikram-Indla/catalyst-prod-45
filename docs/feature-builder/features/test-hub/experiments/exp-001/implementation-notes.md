# Implementation Notes: test-hub / exp-001

**Title:** Feature intake and Catalyst pattern discovery
**Date:** 2026-06-26
**Type:** research

N/A — research experiment, no code changes.

---

## Changes Made

None. Read-only experiment.

## Reuse Decisions

| Need | Used | Alternative considered |
|---|---|---|
| Pattern discovery | `grep`, `find`, `Read` on src/ | None — read-only required |

## Deferred / Out of Scope

1. Page-by-page audit of each testhub page — deferred to exp-002
2. AIO PDF content extraction — deferred to exp-003
3. Gap analysis — deferred to exp-004
4. Target design — deferred to exp-005
5. Fix dual-schema dashboard RPCs — requires Gate 4 (schema change)
6. Fix `tm_get_requirement_test_cases()` dead table ref — requires Gate 4
7. Wire CATY AI to UI — requires Gate 7 (AI feature)
