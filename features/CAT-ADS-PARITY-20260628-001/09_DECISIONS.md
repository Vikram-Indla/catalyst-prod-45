# Decisions — CAT-ADS-PARITY-20260628-001

Permanent record. Do not re-litigate entries here without a new explicit decision.

---

## Decision 1 — 2026-06-28: Feature folder creation

### Question

Should we create a fresh Feature Work ID for the ADS Parity campaign, or continue an existing one?

### Context

Five prompts (PROMPT_B, D, E, G, H) provided for multi-phase ADS compliance work. Prerequisites (A, C, F) referenced but not provided. No prior Feature Work ID exists.

### Options considered

1. Create fresh Feature Work ID: `CAT-ADS-PARITY-20260628-001`
2. Reuse existing related campaign (`CAT-ADS-COMPLIANCE-20260627-001`)
3. Wait for prerequisites before creating ID

### Decision

Create fresh Feature Work ID: `CAT-ADS-PARITY-20260628-001`

### Rationale

- This campaign spans 5 phases (6, 8, 9, 11, 13) with distinct objectives
- Existing `CAT-ADS-COMPLIANCE-20260627-001` is likely earlier phases (A–F)
- Fresh ID ensures clear scope, auditable trail, and parallel-safe execution
- Feature folder structure enables proper handover between sessions

### Impact on Plan Lock

None — this decision enabled Plan Lock creation.

---

## Decision 2 — 2026-06-28: Sequential vs. parallel phase execution

### Question

Should the 5 phases (B, D, E, G, H) execute sequentially or in parallel?

### Context

Prompts show dependencies:
- B, D, E depend on A passing (hex count < 600)
- G depends on A, C, F completing
- H depends on A, C completing

Cannot parallelize across gate boundaries.

### Options considered

1. All 5 phases in parallel (violates gate dependencies)
2. Sequential: A → B → D → E → C/F → G → H (respects gates, serializes work)
3. Partial parallel: (B || D || E) in parallel after A gate, then G, then H (possible but complex)

### Decision

Sequential execution: A → B → D → E → (C/F validation) → G → H

### Rationale

- Respects hard gate dependencies (code in later phases depends on earlier gates passing)
- Simpler to track and roll back if a gate fails
- 2-hour slices fit cleanly into sequential order
- Matches "one slice = one gate = one validation" rhythm

### Impact on Plan Lock

Plan Lock section 3.1 defines sequential phase order with gates between each. No change needed.

---

## Decision 3 — 2026-06-28: Plan Lock approval requirement

### Question

Should implementation begin immediately, or should Plan Lock be reviewed/approved first?

### Context

CLAUDE.md: "Plan Lock before code. No exceptions."

Plan Lock v1 drafted but not yet reviewed by Vikram.

### Options considered

1. Proceed to implementation immediately (violates CLAUDE.md)
2. Wait for Plan Lock approval (CLAUDE.md compliant)
3. Begin discovery agents while awaiting Plan Lock approval (possible, discovery informs v2)

### Decision

Discovery agents begin in parallel with Plan Lock review. Implementation waits for Plan Lock approval.

### Rationale

- CLAUDE.md requires Plan Lock before code
- Discovery agents produce inputs for Plan Lock v2 (baseline audits, API validation)
- No code written; discovery is low-risk, high-value
- Approval cycle can happen in parallel

### Impact on Plan Lock

Plan Lock v1 will be reviewed and amended to Plan Lock v2 (with baseline audit outputs) before implementation begins.

---

## Decision 4 — 2026-06-28: Canonical component creation scope

### Question

Should we create 2 new canonical components (GlobalPageHeader, CatalystFormField) or use existing wrappers?

### Context

Prompts specify: 9 duplicates to eliminate (3 header variants, 7 breadcrumb variants, 142 orphaned label/input combos).

Options:
- Option A: Create GlobalPageHeader to replace 3 header variants
- Option B: Keep existing headers, create wrapper
- Option C: Extend existing CatalystHeader if available

### Decision

Create 2 new canonical components: GlobalPageHeader, CatalystFormField

### Rationale

- **GlobalPageHeader**: Replaces 3 semantically similar headers (SidebarHeader, MessagePanelHeader, DraftsAndSentHeader). Canonical variant pattern is Catalyst-standard.
- **CatalystFormField**: Replaces 142 orphaned label/input pairs. Canonical form field is missing from Catalyst; addresses real coverage gap.
- Consolidation reduces maintenance surface from 3+7 duplicates to 2 canonicals
- New canonicals follow existing Catalyst patterns (variant props, token inheritance)

### Impact on Plan Lock

Plan Lock section 4.2 defines new canonical APIs (GlobalPageHeader, CatalystFormField). Canonical Component Discovery agent will validate APIs during discovery phase.

---

## Decision 5 — 2026-06-28: 2-hour slice execution model

### Question

Should we execute 5 phases as one large slice, or 2-hour sub-slices per phase?

### Context

CLAUDE.md: "Two-hour slice rule. No implementation slice exceeds 2 hours."

5 phases × estimated 2h each = 10h total. Can't be done in one session.

### Options considered

1. One 10-hour slice (violates 2-hour rule)
2. Five 2-hour slices, one phase per slice (respects rule, serializes)
3. Multiple mini-slices per phase (over-fragments work)

### Decision

Five 2-hour slices, one phase per slice: Slice 1=Phase 6, Slice 2=Phase 8, etc.

### Rationale

- Respects CLAUDE.md 2-hour rule
- One phase = one gate = one clear success/fail point
- Easier to roll back individual phases if gate fails
- Matches session/handover boundaries (one session = one slice)

### Impact on Plan Lock

Plan Lock section 7 defines execution slices. No change needed.

---

## Decision 6 — 2026-06-28: Phase 11 scope reduction (Option B)

### Question

How should Phase 11 (Canonical Migration) proceed given the design blocker: GlobalPageHeader (page-level header) cannot replace chat-panel headers (SidebarHeader has Unreads toggle, MessagePanelHeader requires tabs/menu anchoring, DraftsAndSentHeader has custom state)?

### Context

Integration Architect discovered during discovery phase that 3 of 7 target components (SidebarHeader, MessagePanelHeader, DraftsAndSentHeader) cannot be migrated to GlobalPageHeader without design expansion beyond 2-hour slice scope.

### Options considered

1. **Option A: Expand Phase 11 scope (4+ hours)**
   - Enhance GlobalPageHeader to support tabs, menu anchoring, Unreads button
   - Requires design review and iteration
   - Violates 2-hour slice rule

2. **Option B: Reduce Phase 11 scope (SELECTED)**
   - Delete only genuinely dead code: BacklogBreadcrumb (0 consumers), ChatShell (legacy v1)
   - Defer SidebarHeader, MessagePanelHeader, DraftsAndSentHeader migration
   - Defer GlobalPageHeader & CatalystFormField creation to follow-up feature (CAT-ADS-FOLLOWUP-CANONICALS)
   - ~30 minutes actual work (fits in 2-hour slice)

3. **Option C: Skip Phase 11 entirely**
   - Abandon canonical consolidation goal
   - Accept higher maintenance debt
   - Not recommended

### Decision

**Option B selected** — Reduce Phase 11 scope to cleanup only.

### Rationale

- Respects 2-hour slice rule (only 30m cleanup work)
- Unblocks 4 core phases (6, 8, 9, 13) — these proceed on schedule
- Canonicals get proper design review instead of rushed implementation
- Maintains code quality (don't force-fit incompatible components)
- Deferred canonicals are lower-risk, can be done in dedicated follow-up work

### Impact on Plan Lock

**Plan Lock v2 updated:**
- Phase 11 renamed "Cleanup (revised)" — delete BacklogBreadcrumb + ChatShell only
- Gate changed from "0 duplicates" to "E2E tests pass"
- Duration changed from 2h to ~30m
- Total campaign time: 10h → ~8.5h
- GlobalPageHeader & CatalystFormField deferred to CAT-ADS-FOLLOWUP-CANONICALS-YYYYMMDD-001

---

## Future decisions (placeholder)

Decisions 6+ will be logged here as they arise during execution.

Add new decisions using this template:

```markdown
## Decision N — YYYY-MM-DD: <title>

### Question
<what was decided>

### Context
<why it came up>

### Options considered
1. <option>
2. <option>

### Decision
<what was decided>

### Rationale
<why>

### Impact on Plan Lock
<none / amended / superseded>
```
