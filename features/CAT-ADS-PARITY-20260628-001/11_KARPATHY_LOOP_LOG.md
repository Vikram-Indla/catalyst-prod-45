# Karpathy Loop Log — CAT-ADS-PARITY-20260628-001

**Protocol:** Hypothesis → Experiment → Measure → Decision → Log

Every discovery and implementation decision is documented here. Do not make decisions silently.

---

## Loop 1 — Campaign sequencing

**Hypothesis:** The 5 provided prompts (B, D, E, G, H) can execute sequentially (B → D → E → G → H) if prerequisite phases (A, C, F) are validated first.

**Experiment:**
- Review all 5 prompts for dependencies and gate definitions
- Map prerequisite relationships (A is gating B, D, E; C and F are gating G; A and C are gating H)
- Create Plan Lock with sequential phase order
- Identify gate metrics for each phase

**Measure:**
- Dependency map created: ✓
- Plan Lock created: ✓ (DRAFT v1)
- Gates defined: ✓ (6 gates, hard stops if not met)
- Two-hour slices identified: ✓ (5 × 2h execution plan)

**Decision:**
- CONFIRM: Sequential phase execution is viable. Proceed with discovery phase.
- PENDING: Validate prerequisites (Phase A, C, F) status before Phase B begins.

**Log entry:** 2026-06-28 — Sequencing confirmed; feature folder established; Plan Lock v1 drafted.

---

## Loop 2 — Canonical component selection

**Hypothesis:** GlobalPageHeader and CatalystFormField can be implemented as new canonical components to replace 10 existing duplicates (3 header variants, 142 orphaned label/input combos).

**Experiment:**
- Review existing Catalyst component patterns (from storybook MCP, canonical docs)
- Draft GlobalPageHeader and CatalystFormField API signatures
- Identify consumers of deprecated components (grep integration)
- Map migration path (which variant maps to which canonical state)

**Measure:**
- (PENDING) GlobalPageHeader API validation via Canonical Component Discovery agent
- (PENDING) CatalystFormField API validation via Canonical Component Discovery agent
- (PENDING) Consumer mapping (SidebarHeader → GlobalPageHeader variant="sidebar", etc.)

**Decision:**
- HYPOTHESIS PENDING: Awaiting discovery agent output. Do not code until APIs validated.

**Log entry:** 2026-06-28 — Awaiting Canonical Component Discovery agent output.

---

## Loop 3 — Gate thresholds validation

**Hypothesis:** The gate thresholds in Plan Lock (B: 15/15 checks, D: <80, E: <400, G: 0 duplicates, H: 0 violations) are achievable within 2-hour slices.

**Experiment:**
- Run baseline audits (npm run audit:colors, audit:typography, audit:spacing, audit:a11y)
- Capture current violation counts for each phase
- Estimate effort per file (typical fixes: 1–3 minutes per file)
- Calculate if 2-hour slice sufficient for expected file count

**Measure:**
- (PENDING) npm run audit:colors → baseline hex count
- (PENDING) npm run audit:typography → baseline typography violation count
- (PENDING) npm run audit:spacing → baseline spacing violation count
- (PENDING) npm run audit:a11y → baseline focus ring, interactive div, contrast counts

**Decision:**
- HYPOTHESIS PENDING: Awaiting baseline audit outputs. Once collected, will evaluate feasibility.

**Log entry:** 2026-06-28 — Baseline audits queued; thresholds will be validated in next session.

---

## Loop 4 — Regression risk assessment

**Hypothesis:** Phase 6 (Light Surface) changes will not introduce regressions in dark mode or other surfaces if tokens are applied uniformly.

**Experiment:**
- (PENDING) Run Phase 6 changes on isolated branch
- Capture dark mode screenshots before/after
- Run E2E suite to detect breakage
- Verify no color token collisions

**Measure:**
- (PENDING) E2E suite pass/fail
- (PENDING) Dark mode contrast remains ≥4.5:1
- (PENDING) No new WCAG failures introduced by Phase 6 changes

**Decision:**
- HYPOTHESIS PENDING: Will be validated during Phase 6 execution (Slice #1).

**Log entry:** 2026-06-28 — Regression checks planned for Phase 6 execution.

---

## Loop 5 — Discovery agent execution

**Hypothesis:** Parallel discovery agents (Canonical Component Discovery, Design Audit, Integration Architect, QA/Screenshot Validator) can complete baseline mapping within 2 hours and produce actionable outputs.

**Experiment:**
- Spawn 4 parallel discovery agents (ONCE Plan Lock approved)
- Agent inputs: prompts, canonical docs, storybook MCP queries
- Expected outputs: API signatures, audit baselines, consumer mappings, screenshot checklist

**Measure:**
- (PENDING) Agent completion status
- (PENDING) Output quality (actionable for implementation)
- (PENDING) Any blocker discoveries

**Decision:**
- HYPOTHESIS PENDING: Awaiting Plan Lock approval, then agents will spawn.

**Log entry:** 2026-06-28 — Discovery phase queued for approval + execution.

---

## Summary (so far)

| Loop | Status | Next |
|---|---|---|
| 1 — Sequencing | DECIDED ✓ | Validate prerequisites (A, C, F) |
| 2 — Canonical components | PENDING | Discovery agent output |
| 3 — Gate thresholds | PENDING | Baseline audits |
| 4 — Regression risk | PENDING | Phase 6 execution |
| 5 — Discovery agents | PENDING | Plan Lock approval |

---

## Decision log

- **2026-06-28:** Feature folder created. Plan Lock v1 drafted. Awaiting approval to spawn discovery agents.
