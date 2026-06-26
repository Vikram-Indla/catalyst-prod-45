# Feature Program: <feature-slug>

> Copy to: docs/feature-builder/features/<feature-slug>/feature-program.md
> This is the Catalyst equivalent of Karpathy's program.md — the human intent file.
> It does not change often. It defines the goal and the constraints.

---

## Objective

<!-- Single sentence. What must be true when this feature is done? -->

---

## Constraints (Non-Negotiable)

<!-- What must not change, even if it would make implementation easier? -->
<!-- Example: "Must reuse JiraTable. Must not introduce new DB tables without approval." -->

1. Catalyst-native only — no new design language
2. ADS tokens only — no hardcoded colors
3. No new DB schema without human approval
4. No new edge functions without human approval
5. Staging-first — no direct prod changes
6. [add feature-specific constraints]

---

## Research Requirements

<!-- What must be known before any code is written? -->

- [ ] Catalyst pattern discovery complete
- [ ] Current state audit complete
- [ ] External benchmark research complete (if applicable: _name the benchmark_)
- [ ] Gap analysis complete
- [ ] Target Catalyst design approved

---

## Build Scope (Filled after research phase)

<!-- What slices will be built? -->

_To be defined after research experiments approve._

---

## Out of Scope (Defined before build starts)

<!-- What will NOT be built in this program run? -->

1. _fill_

---

## External Benchmarks

<!-- What product(s) serve as the quality bar for this feature? -->

- Primary: _fill_ (link or description)
- Secondary: _optional_

If none: state "no external benchmark" — this is a Catalyst-native capability.

---

## Success Criteria

<!-- How do we know this is done? -->
<!-- Must be verifiable, not subjective. -->

- [ ] _fill_
- [ ] _fill_

---

## Human Approval Required

- [ ] Phase 0 (research) complete → Vikram/Aiden approves target design
- [ ] Phase 1 (build) complete → Vikram/Aiden approves ship
- [ ] Any DB schema change → separate approval
- [ ] Any AI feature → separate approval

---

## Experiment Roadmap

See: experiment-roadmap.md
