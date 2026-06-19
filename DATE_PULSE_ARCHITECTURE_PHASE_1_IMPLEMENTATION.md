# Catalyst Date Pulse — Phase 1 Architecture & Implementation Spec
**Date:** 2026-06-19  
**Based on:** Phase 2A Foundation + Strategic Brief + Phase 0 Research + 5 Clarifications  
**Status:** DESIGN ONLY (no code changes yet)

---

## Executive Summary

Phase 1 expands the Date Pulse Engine from **18 rules (A-E)** to **39 rules (A-I)** and introduces **three read-only computed fields** that will be added to all work item types.

**Design decisions locked:**
- Epic has both explicit `target_date` AND inferred from children (take MAX for comparison)
- Release `release_date` is authoritative (ignore `planned_date` for violations)
- Post-release incidents = advisory severity only (not critical)
- Business Request links to single release only (no multi-release complexity)

---

## Part 1: All 39 Rules Mapped to Catalyst Data Model

### Category A: Missing Date Rules (3 rules)

| Rule ID | Name | Condition | Severity | Message | Implementation |
|---------|------|-----------|----------|---------|-----------------|
| **A1** | BR missing target date | `business_requests.target_date IS NULL` AND no `release_id` | Advisory | Business expectation date is missing. Set target_date or link a release. | Query: `br.target_date && br.release_id` |
| **A2** | Linked work missing dates | `ph_issues.due_date IS NULL` for any linked story/task/defect | Warning | Delivery item has no date signal. Set due_date or sprint. | Query: loop linked work, check `item.due_date && item.sprint_id` |
| **A3** | Release missing go-live date | `releases.release_date IS NULL` when BR links to release | Warning | Production expectation cannot be trusted. Set release_date. | Query: if `br.release_id`, check `release.release_date NOT NULL` |

**Implementation notes:**
- A1: Check both `target_date` and `release_id` — if neither exists, advisory
- A2: For each linked work item, check `due_date` OR `sprint_id` (sprint provides implicit deadline)
- A3: Only checks if BR is linked to release; advisory if release exists but date missing

---

### Category B: Date Conflict Rules (6 rules)

| Rule ID | Name | Condition | Severity | Message | Implementation |
|---------|------|-----------|----------|---------|-----------------|
| **B1** | Release after BR target date | `release.release_date > br.target_date` | Warning/Critical (gap-dependent) | Release is later than business expectation. Negotiate commitment. | Query: compare dates, flag if gap > 30 days → Critical |
| **B2** | Sprint after release | `sprint.end_date > release.release_date` | Critical | Work is planned after production date. Move to correct release. | Query: for each story, check `sprint.end_date > release.release_date` |
| **B3** | Story due after release | `ph_issues.due_date > release.release_date` (where story is in release) | Critical | Story cannot finish after release. Move to earlier sprint or defer. | Query: check `story.due_date > linked_release.release_date` |
| **B4** | Epic end after BR target date | `epic.target_date > br.target_date` | Warning | Epic timeline exceeds business target. Compress or extend BR date. | Query: compare `epic.target_date` (explicit or MAX from children) vs `br.target_date` |
| **B5** | Sub-task after story | `subtask.due_date > story.due_date` | Warning | Child work exceeds parent date. Adjust subtask or story timeline. | Query: for each subtask, check `subtask.due_date > parent_story.due_date` |
| **B6** | Defect due after release | `defect.due_date > release.release_date` (where defect is linked to BR in release) | Critical | Defect may remain open after production. Resolve before or mark post-release. | Query: check `defect.due_date > linked_release.release_date` |

**Implementation notes:**
- B1: Warning if gap ≤ 30 days, Critical if gap > 30 days (configurable)
- B2: Traverse story → sprint to get sprint.end_date (check `ph_issues.sprint_id`)
- B3: Only compare if story is in BR's release (trace: story → epic → br → release OR story directly linked to br)
- B4: Epic target_date = explicit field if exists, else MAX(child_due_dates)
- B5: Only relevant for sub-tasks (type check `issue_type = 'Sub-task'`)
- B6: Defects linked to BR in a release; compare to release.release_date

---

### Category C: Scope Creep Rules (3 rules)

| Rule ID | Name | Condition | Severity | Message | Implementation |
|---------|------|-----------|----------|---------|-----------------|
| **C1** | New story added after BR targeted | Story linked after `br.target_date` was set AND story `created_at` > `br.target_date` | Warning | Scope added after date commitment. Assess impact or defer story. | Query: check `story.created_at > br.target_date` for each linked story |
| **C2** | Story added to later sprint | Story linked to BR with target_date, but story's sprint end_date > br.target_date | Warning | Scope addition breaks release expectation. Move to aligned sprint. | Query: check `story.sprint.end_date > br.target_date` |
| **C3** | Defect added near release | Defect `created_at` is within 7 days of `release.release_date` AND defect linked to BR in release | Warning | Late defect may affect release confidence. Assess criticality. | Query: check `ABS(defect.created_at - release.release_date) < 7 days` |

**Implementation notes:**
- C1: Track BR's `target_date_set_at` (when target date was explicitly set) vs story `created_at`
  - Alternative: Compare latest story `created_at` to BR `target_date` (simpler, assumes target_date didn't change)
  - Recommendation: Use BR `updated_at` as proxy for "when was target_date last changed"
- C2: Defect `created_at` within 7 days before OR after `release.release_date`
- C3: Threshold of 7 days is configurable; start with this value

---

### Category D: Status/State Rules (4 rules) — **EXPANDED FROM PHASE 2A**

| Rule ID | Name | Condition | Severity | Message | Implementation |
|---------|------|-----------|----------|---------|-----------------|
| **D1** | Start date after due date | `ph_issues.start_date > ph_issues.due_date` (if both exist) | Critical | Invalid date sequence. Fix timeline. | Query: check `start_date` column existence; if exists, compare |
| **D2** | Due date in past (overdue) | `ph_issues.due_date < TODAY()` AND `status NOT IN ('Done', 'Closed', 'Delivered')` | Critical | Work is overdue. Update status or reschedule. | Query: compare `due_date` to current date, filter by open statuses |
| **D3** | Closed item with future due date | `status IN ('Done', 'Closed')` AND `due_date > TODAY()` AND `due_date - completed_at > 30 days` | Advisory | Date may not reflect actual completion. Review date accuracy. | Query: check completion date vs original due_date; flag if gap significant |
| **D4** | Parent closed while child open | `parent.status IN ('Done', 'Closed')` AND `child.status NOT IN ('Done', 'Closed')` | Warning | Completion state conflicts with child work. Resolve child or reopen parent. | Query: traverse parent-child relationships, check status mismatches |

**Implementation notes:**
- D1: Check if `start_date` column exists in schema; if not, skip this rule
- D2: Use `CURRENT_DATE` for TODAY(); filter by open statuses from Jira work item status ontology
- D3: Calculate gap between `completed_at` (or `resolved_at`) and original `due_date`; flag if > 30 days
- D4: Recursively check parent-child pairs (parent_key relationships)

---

### Category E: Alignment & Ownership Rules (2 rules) — **EXPANDED FROM PHASE 2A**

| Rule ID | Name | Condition | Severity | Message | Implementation |
|---------|------|-----------|----------|---------|-----------------|
| **E1** | BR unassigned (no owner) | `business_requests.delivery_manager IS NULL` AND `product_owner IS NULL` | Warning | No accountable delivery owner. Assign Delivery Manager or Product Owner. | Query: check both fields are null |
| **E2** | Story assignee missing | `ph_issues.assignee IS NULL` (for story) AND `due_date IS NOT NULL` | Warning | Delivery item has date but no owner. Assign or clarify scope. | Query: check `assignee_id` or `assignee_name` fields; filter by story type |

**Implementation notes:**
- E1: Either `delivery_manager` OR `product_owner` must be set; flag if both null
- E2: Only relevant for work items with dates (due_date or sprint context)

---

### Category F: Release & Sprint Rules (6 NEW rules)

| Rule ID | Name | Condition | Severity | Message | Implementation |
|---------|------|-----------|----------|---------|-----------------|
| **F1** | Release has misaligned children | Any child item (story/defect/incident) has date AFTER `release.release_date` | Critical | Release contains impossible scope. Resolve or move items to later release. | Query: for each item in release, check if `item.due_date > release.release_date` |
| **F2** | Sprint contains future-release work | Sprint has stories from multiple different releases AND later release dates exist | Warning | Sprint scope mixes conflicting release expectations. Clarify release boundaries. | Query: group stories by sprint, check releases, flag if multi-release |
| **F3** | Story in sprint but no release path | Story linked to BR but BR has no release (`br.release_id IS NULL`) | Advisory | Delivery is active without production plan. Link to release or clarify scope. | Query: check `br.release_id` for each story's parent BR |
| **F4** | Release contains BRs with conflicting targets | Multiple BRs in one release have significantly different target_dates (gap > 30 days) | Warning | Release bundles different expectation dates. Align or split release. | Query: collect all BR target_dates in release, check variance |
| **F5** | Release has critical blockers | Critical defects or production incidents linked to BRs in release remain open | Critical | Release confidence is compromised. Resolve blockers before go-live. | Query: filter defects/incidents by severity/type, check status |
| **F6** | Post-release incident | Incident `created_at` is AFTER linked release `release_date` | Advisory only | Post-production impact added to BR history. Track as post-prod concern. | Query: check `incident.created_at > release.release_date` (per clarification: advisory, not critical) |

**Implementation notes:**
- F1: Traverse release → linked BRs → linked items, check dates
- F2: Group stories by sprint, extract unique releases, flag multi-release sprints
- F3: Check if BR has no release assigned
- F4: Collect all BR `target_date` values, calculate variance (std dev or max-min)
- F5: Filter by severity "Critical" or type "Production Incident"
- F6: Per Vikram clarification: post-release incidents are advisory only, not critical

---

### Category G: Timeline Integrity Rules (5 NEW rules)

| Rule ID | Name | Condition | Severity | Message | Implementation |
|---------|------|-----------|----------|---------|-----------------|
| **G1** | Start date after due date | `created_at > due_date` (treat created_at as implicit start) | Critical | Invalid date sequence. Fix timeline. | Query: compare creation time to due date |
| **G2** | Due date in past and not done | `due_date < TODAY()` AND `status NOT IN (done_statuses)` | Critical | Work is overdue. Update or reschedule. | Query: compare `due_date` to current date and status |
| **G3** | Closed item with future due date | `status = Done` AND `due_date > TODAY()` AND gap > 30 days | Advisory | Date may not reflect completion. Review accuracy. | Query: check completed items with future dates |
| **G4** | Parent closed while child open | Parent completed but child still open | Warning | State mismatch with children. Resolve child or reopen. | Query: recursive traversal of hierarchy |
| **G5** | Child starts before parent creation | Child `created_at` before parent `created_at` | Advisory | Date sequence may be incorrect. Review timeline. | Query: compare creation timestamps in hierarchy |

**Implementation notes:**
- G1-G5: Similar to D2-D4, but expanded scope
- This category may overlap with D; consider dedup in rule execution

---

### Category H: Data Quality & Gaming Prevention Rules (5 NEW rules)

| Rule ID | Name | Condition | Severity | Message | Implementation |
|---------|------|-----------|----------|---------|-----------------|
| **H1** | Date moved repeatedly | Same field changed 3+ times in 30 days WITHOUT comment/rationale | Warning | Repeated date movement needs explanation. Add rationale or freeze timeline. | Query: audit trail on date fields, count changes, check for comment |
| **H2** | Date pushed without comment | Date changed AND no comment added within 24 hours explaining change | Warning | Date changed without rationale. Add context for transparency. | Query: check `updated_at` vs last comment timestamp |
| **H3** | Release changed after targeted flag | Release changed AFTER `targeted_feature = True` was set | Warning | Non-negotiable scope moved. Notify stakeholders. | Query: compare `release_id` `updated_at` vs `targeted_feature` `updated_at` |
| **H4** | Due date extended after overdue | Date pushed AFTER breach (due_date < TODAY() at time of change) | Warning | Overdue item was re-dated. Review scope/priority. | Query: compare date change timestamp to previous due_date vs TODAY() at that time |
| **H5** | Item de-linked after violation | Work item removed from BR AFTER Date Pulse violation was detected | Advisory/Warning | De-linking requires rationale. Document reason. | Query: check item `unlinked_at` vs violation `detected_at` |

**Implementation notes:**
- H1-H5: Require audit trail (created_at, updated_at, comments, linked_at, unlinked_at)
- May not be fully implementable in Phase 1 if audit schema doesn't exist
- Recommendation: Phase 1 implements H1-H2 (basic), defer H3-H5 to Phase 7 (governance)

---

### Category I: De-link & Normalization Rules (5 NEW rules)

| Rule ID | Name | Condition | Severity | Message | Implementation |
|---------|------|-----------|----------|---------|-----------------|
| **I1** | Black-sheep item detected | One child item date is >60 days outside parent/release window | Warning | Consider de-linking or moving to future scope. Assess fit. | Query: calculate date variance across children, flag outliers |
| **I2** | Child belongs to future release | Story date fits in later release better than current BR's release | Warning | Move story to correct release or split scope. Clarify intent. | Query: check if `story.due_date` fits better in next release |
| **I3** | Non-delivery task causes false violation | Task type is NOT delivery (communication, training, change mgmt) yet flagged by B/C/D rules | Advisory | Mark as non-blocking or align readiness date separately. | Query: check task type/category, exclude non-delivery tasks from scope violations |
| **I4** | Incident linked for historical context | Incident linked AFTER release (post-prod) but flagged as blocking | Advisory | Keep linked as post-production signal; does not affect release confidence. | Query: per F6, post-release incidents are advisory only |
| **I5** | Deferred story remains linked | Story intentionally deferred but still linked to targeted BR | Warning | Defer, split, or de-link from current commitment. Clarify status. | Query: check story status (deferred/backlog) vs BR targeted_feature flag |

**Implementation notes:**
- I1-I5: Represent edge cases where violations are EXPECTED, not errors
- These rules modify severity or suppress violations for known-good scenarios
- Recommendation: Phase 1 implements logic to suppress violations for these cases; Phase 7 adds rationale tracking

---

## Part 2: Read-Only Computed Fields

### Field 1: `datePulseStatus`

**Type:** Enum  
**Values:** `Aligned | Missing Dates | At Risk | Misaligned | Critical Misalignment | Needs Review | Excluded / De-linked`

**Computation Logic:**

```
IF rule violations exist:
  IF any Critical violations → `Critical Misalignment`
  ELSE IF any Warning violations → `Misaligned`
  ELSE IF any Advisory violations → `At Risk`
ELSE IF required dates are missing → `Missing Dates`
ELSE IF explicitly de-linked or marked excluded → `Excluded / De-linked`
ELSE IF insufficient data to compute → `Needs Review`
ELSE → `Aligned`
```

**Applied to:** Business Request, Epic, Story, Task, Sub-task, Defect, Incident  
**Refreshed on:** Item change, linked item change, release/sprint change  
**Storage:** Column on each work item table OR computed on read (Phase 1 decision pending)

---

### Field 2: `datePulseSummary`

**Type:** String (text)  
**Content:** 1-2 sentence human-readable summary of the primary issue

**Examples:**

```
"Story due date is 31 Aug, but linked Business Request target date is 30 Jun. 
Alignment required with Assignee, Product Owner, and Release Manager."

"Release go-live is 30 Jul but two stories are due 30 Aug. 
Move stories to later release or compress timeline."

"No delivery date set. Link to release or set target date."

"All dates aligned. No misalignment detected."
```

**Generation Logic:**
1. Collect all violations for the item
2. Pick the TOP violation (highest severity)
3. Format as narrative: `<item> <condition>, <impact>. <suggested action>.`
4. Include actor names (Product Owner, Release Manager, Assignee) if known

**Applied to:** All work items (same as datePulseStatus)

---

### Field 3: `datePulseOwner`

**Type:** String (user ID or name)  
**Content:** The person primarily responsible for resolving the Date Pulse issue

**Resolution Logic (decision tree):**

```
IF violation involves BR target date conflict:
  → Business Request's Product Owner
ELSE IF violation involves Release misalignment:
  → Release's Release Manager (or Project Lead if RM not assigned)
ELSE IF violation involves Sprint misalignment:
  → Sprint's Scrum Master (or Project Manager if not assigned)
ELSE IF violation involves Story/Task due date:
  → Item's Assignee
ELSE IF violation involves Defect after release:
  → QA Lead or Defect Owner
ELSE IF violation involves Incident:
  → Incident Owner + Product Owner (co-owned)
ELSE IF violation involves Scope Creep (C rules):
  → Business Request's Product Owner
ELSE IF violation involves Ownership/Accountability (E rules):
  → BR's Product Owner (to fill in missing owners)
ELSE:
  → Unassigned (flag for review)
```

**Applied to:** All work items

---

## Part 3: Type Definitions (Additions to `date-pulse.ts`)

```typescript
// Computed field types
export interface DatePulseComputedFields {
  datePulseStatus: 
    | 'Aligned'
    | 'Missing Dates'
    | 'At Risk'
    | 'Misaligned'
    | 'Critical Misalignment'
    | 'Needs Review'
    | 'Excluded / De-linked';
  
  datePulseSummary: string; // 1-2 sentence narrative
  datePulseOwner: string | null; // user ID or name
  datePulseLastEvaluatedAt: Timestamp;
  datePulseViolations: DatePulseViolation[]; // existing
}

// Rule categories
export type RuleCategory = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I';

// Rule severity
export enum RuleSeverity {
  Advisory = 'advisory',
  Warning = 'warning',
  Critical = 'critical',
}

// Violation with rule category
export interface DatePulseViolation {
  ruleId: string; // 'A1', 'B2', 'F6', etc.
  ruleCategory: RuleCategory;
  ruleName: string;
  severity: RuleSeverity;
  message: string;
  affectedItems: string[]; // keys of items involved (parent, child, release, etc.)
  suggestedActions: string[];
  detectedAt: Timestamp;
}

// Work item with Date Pulse fields
export interface WorkItemWithDatePulse extends WorkItem {
  datePulse: DatePulseComputedFields;
}

export interface BusinessRequestWithDatePulse extends BusinessRequest {
  datePulse: DatePulseComputedFields;
}
```

---

## Part 4: Implementation Order (Phase 1 Roadmap)

### Phase 1a: Foundation (Week 1)
- [x] Phase 2A: 18 rules (A-E) ← already done
- [ ] Expand DatePulseEngine with rules F-I (21 new rules)
- [ ] Add computed field generators (Status, Summary, Owner)
- [ ] Update type definitions

### Phase 1b: Catalyst Mapping (Week 1-2)
- [ ] Map each rule to Catalyst data model (queries, field names, table joins)
- [ ] Handle edge cases (Epic explicit + inferred, post-prod incidents, deferred stories)
- [ ] Document data model assumptions for Phase 2+

### Phase 1c: Hook Expansion (Week 2)
- [ ] Expand `useBusinessRequestHealth` to accept work items (not just BR)
- [ ] Add 30s cache per item type
- [ ] Add owner resolution function
- [ ] Add computed field serialization

### Phase 1d: Test One Rule (Week 2)
- [ ] Implement B2 (Sprint after release) as smoke test
- [ ] Verify rule fires correctly on ProductBacklogPage
- [ ] No regression in Phase 2A rules

### Phase 1e: Documentation (Week 2)
- [ ] Map all 39 rules in code comments
- [ ] Document owner resolution logic
- [ ] Handoff to Phase 2

---

## Part 5: Edge Cases & Decision Points

### Edge Case 1: Epic has both explicit AND inferred target_date
**Decision:** Take MAX(explicit_target_date, MAX(child_due_dates))
**Rationale:** Conservative — flag if either the explicit date or any child is misaligned
**Implementation:** `epic.target_date = MAX(epic.target_date_column, MAX(child_due_dates))`

### Edge Case 2: Post-release incidents should NOT be critical
**Decision:** Downgrade F6 violations from Critical to Advisory
**Rationale:** Per Vikram clarification — post-prod incidents are expected, not delivery failures
**Implementation:** In rule F6, set severity = 'Advisory' (not Warning)

### Edge Case 3: BR → single release only (no multi-release)
**Decision:** Assume `br.release_id` is a scalar, not an array
**Rationale:** Simplifies comparisons; if multi-release needed later, refactor to array
**Implementation:** Treat `br.release_id` as FK to single release

### Edge Case 4: Category H rules require audit trail
**Decision:** Phase 1 implements H1-H2 (basic date movement detection); defer H3-H5 to Phase 7
**Rationale:** Requires `updated_at` timestamps + comment history; may not exist yet
**Implementation:** Use `updated_at` for H1-H2; mark H3-H5 as `TODO: Phase 7 (Governance)`

### Edge Case 5: Story may belong to release via multiple paths
**Decision:** Trace story → epic → br → release OR story → br → release directly
**Rationale:** Some stories may not be in Epic; need to handle both paths
**Implementation:** Check both paths in rule B3, B6

---

## Part 6: Phase 1 Success Criteria

- [ ] All 39 rules (A-I) defined in code comments with Catalyst-specific queries
- [ ] Three computed fields (Status, Summary, Owner) designed with pseudocode
- [ ] Edge cases documented (Epic dual dates, post-prod incidents, multi-path traces)
- [ ] Owner resolution logic pseudocoded
- [ ] Type definitions extended (RuleCategory, Rule 39-item registry, Violation with ruleId)
- [ ] B2 (Sprint after release) rule implemented as smoke test
- [ ] B2 rule verified on ProductBacklogPage (no regression)
- [ ] Phase 1 implementation plan committed (this document)
- [ ] Zero console errors on ProductBacklogPage

---

## Part 7: Known Limitations & Future Phases

### Phase 1 Does NOT Include
- ❌ Rules H3-H5 (require audit schema — Phase 7)
- ❌ Rules G1-G5 (may overlap with D; Phase 2+ decides consolidation)
- ❌ Computed fields persisted to database (Phase 2+ decision)
- ❌ Surfaces beyond ProductBacklogPage (Phase 2+)
- ❌ Dashboard widgets (Phase 4+)
- ❌ Date movement rationale tracking (Phase 7)

### Data Schema Assumptions (Phase 2+ must verify)
1. Epic has explicit `target_date` column in `ph_issues`
2. Release `release_date` is non-null when in use
3. Sprint data available via `ph_issues.sprint_id` FK
4. Story/defect can query their sprint via parent story if sub-task
5. Production Incident linked via FK to BR or incident table has date fields

---

## Phase 1 Commit Message (Draft)

```
feat(date-pulse): Phase 1 architecture — expand to 39 rules (A-I) + computed fields

Phase 1 Design Spec:
- 39 total rules across 9 categories (A-I)
  - Category F: 6 release/sprint rules (new)
  - Category G: 5 timeline integrity rules (new)
  - Category H: 5 data quality rules (new, H3-H5 deferred to Phase 7)
  - Category I: 5 de-link/normalization rules (new)
- Three read-only computed fields:
  - datePulseStatus (Aligned/Missing/At Risk/Misaligned/Critical/NeedsReview/Excluded)
  - datePulseSummary (human-readable narrative)
  - datePulseOwner (resolution responsibility)
- Edge cases locked per Vikram clarification:
  - Epic: MAX(explicit_target_date, MAX(child_due_dates))
  - Post-release incidents: advisory only (not critical)
  - BR → single release only
  - Rules H3-H5: deferred to Phase 7 (governance/audit)
- Implementation order: Foundation → Catalyst mapping → Hook expansion → Test B2 → Docs
- Smoke test: B2 rule (Sprint after release) on ProductBacklogPage

This is DESIGN ONLY. No code changes yet. Ready for review before Phase 1 implementation begins.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
```

---

**End of Phase 1 Architecture Specification**

Document created: DATE_PULSE_ARCHITECTURE_PHASE_1_IMPLEMENTATION.md  
Status: Ready for review and approval before Phase 1 code begins
