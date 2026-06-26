# Feature Intake: <feature-slug>

> Copy to: docs/feature-builder/features/<feature-slug>/feature-intake.md
> Fill before running any discovery experiments.

---

## Inputs

**Slug:** <feature-slug>
**Date:** YYYY-MM-DD
**Objective:** <!-- verbatim from init-feature.sh invocation -->
**Requestor:** _fill_
**Priority:** P0 | P1 | P2

---

## External Benchmarks to Research

<!-- Which product(s) define the quality bar for this feature? -->
<!-- List access method (PDF docs, live product, Confluence, screenshots) -->

| Benchmark | Access method | Why benchmarked |
|---|---|---|
| _fill_ | | |

Leave empty if this is a purely Catalyst-native capability.

---

## Known Constraints

<!-- What decisions are already made? What cannot change? -->

1. _fill_

---

## Related Catalyst Features/Modules

<!-- What existing Catalyst work is adjacent to this feature? -->
<!-- These may have patterns to reuse or avoid duplicating. -->

- _fill_

---

## Suspected Existing Implementations

<!-- What files or components might already exist for this feature? -->
<!-- These are suspects, not facts — confirm in catalyst-pattern-discovery.md -->

- _fill_

---

## Suspected DB Tables

<!-- What tables likely store data for this feature? -->
<!-- Confirm via supabase db query --linked in current-state-audit.md -->

- _fill_

---

## Intake Questions

Answer before proceeding to discovery:

1. What does "done" look like for a single user in 60 seconds?
2. Which Catalyst hubs does this touch (project, product, admin, testhub, releases)?
3. Is this a new module or an enhancement to an existing module?
4. Is external benchmark research required, or is this Catalyst-native?
5. Are there known blockers (missing DB tables, unapproved schema changes, etc.)?

---

## Intake Decision

- [ ] Proceed to discovery (exp-001)
- [ ] Blocked: _reason_
- [ ] Out of scope: _reason_
- [ ] Needs more information: _what is missing_
