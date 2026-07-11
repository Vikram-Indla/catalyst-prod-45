# CAT-TESTHUB-REMEDIATION-20260711-001 — Decisions

> All explicit decisions made during this feature. Permanent record.
> Append — never delete.

---

## Decisions

### DEC-001 — Approval gate is absolute

Production Test Hub screens, schema, policies, storage rules, and workflows will
not be modified until Phases 1–5 are complete and Vikram explicitly approves the
approval packet.

### DEC-002 — Mobbin evidence cannot be substituted

The connected tool inventory contained no Mobbin MCP capability on 2026-07-11.
Market research and future-design selection are blocked until Mobbin is connected.
Web search, generic memory, and historical guesses will not be presented as Mobbin evidence.

### DEC-003 — Current-state discovery may continue read-only

Repository, existing evidence, automated tests, and read-only live-data probes may
continue while Mobbin is unavailable. This does not authorize design selection or implementation.

### DEC-004 — Mobbin gate cleared for planning evidence

Mobbin screen/flow tools became available in continuation session 005. Five
returned references were visually inspected and recorded with canonical links in
`docs/testhub-remediation/02-market-reference-library.md`. This clears the
market-reference blocker but does not authorize implementation.

### DEC-005 — Owner approval remains the authority boundary

The planning recommendation is repair-in-place, security/data foundations first,
and two-hour dependency-ordered slices. It remains advice until the owner answers
the approval packet and an exact slice is written into an approved Plan Lock.

### DEC-006 — Catalyst-native design authority

**Date:** 2026-07-11  
**Decision maker:** Vikram

Test Hub will not use Mobbin or any external product as design influence. All
screen, layout, interaction, component, and visual decisions must come from
existing Catalyst screens/components, Atlaskit primitives, and ADS tokens. The
Mobbin document is archived as non-governing research. The screen plan must be
put to Vikram before implementation.

### DEC-007 — Conservative shell-preservation design rejected

**Date:** 2026-07-11  
**Decision maker:** Vikram

The first Catalyst-native proposal was too bland and outdated. Reusing canonical
components does not mean preserving the existing page composition. The revised
direction must create a premium, modern workspace using Catalyst/Atlaskit/ADS
only, with stronger hierarchy, progressive disclosure, split workspaces,
contextual drawers, a focused runner, and a unified coverage intelligence
experience. Mobbin remains excluded.

### DEC-008 — Premium Catalyst-native direction approved

**Date:** 2026-07-11  
**Decision maker:** Vikram

Vikram approved the five owner choices in
`docs/testhub-remediation/09-premium-testhub-design-direction.md` with `go`.
The approved direction is the Test Operations Cockpit plus workspace-oriented
Repository, Plan Builder, Execution/Focus Runner, Coverage Intelligence, and
Governance experiences. The approval does not waive the exact-file Plan Lock,
two-hour slice, ADS-token, canonical-component, screenshot, or data-truth gates.
