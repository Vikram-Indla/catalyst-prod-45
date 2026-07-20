# CAT-STRATA-KPI-OPMODEL-20260720-001 — READ ME FIRST

**What:** Close the verified gap between STRATA's shipped strategic-measurement model and the 53-requirement operating model (KPI Registry, Strategic/Project KPIs, OKRs, KRs, objectives, contribution/aggregation, downstream reporting).

**Baseline:** `main` fast-forwarded to `origin/main` @ `09444187f` (lossless). Branch `strata/kpi-operating-model`. Two sibling worktrees (`strata/theme-measurement-method`, `strata/sc-defect-pack`) are OTHER sessions' — untouched.

**Read in order:** `02_GAP_MAP_LEDGER.md` (verified 53-row disposition) → `03_PLAN_LOCK.md` (approved slice plan + decisions) → `09_DECISIONS.md` → `sessions/`.

**Key truth:** the original prompt was written against a checkout 15 commits stale; most of the 53 already exist. The genuine gap is ONE architectural spine (KPI Assignment + Contribution Mapping + aggregation) + a classification layer + a few reconciliation conflicts. See ledger: **9 SATISFIED · 24 PARTIAL · 20 MISSING**.

**Approved decisions (2026-07-20):** D-1 additive bridge (no retroactive number movement); D-2 rows 007/008 BLOCKED-on-merge (excluded); D-3 build S0→S1→S2+S3.

**Hard constraints:** forward-only migrations only; no push/merge/deploy; no staging/prod writes; no local DB available (Docker down) so DB-execution proof is externally blocked — verify via TS guard tests + build + ADS gates.
