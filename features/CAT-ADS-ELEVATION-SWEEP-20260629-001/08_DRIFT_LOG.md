# DRIFT LOG — CAT-ADS-ELEVATION-SWEEP-20260629-001

## 2026-06-29 — Live DOM diagnosis (Option 1) invalidated Plan Lock's Gap 2 scope

**Trigger:** Slice 1 prep found the "shadow-as-color" misuse is ~400 files, not ~7.
RED FLAG raised; Vikram chose Option 1 (diagnose first via live probe).

**Method:** Chrome MCP on localhost:8080 (dark + light), `getComputedStyle` probes.

**Findings:**
1. **Misuse is DEAD CODE, not a live bug.** `--fg-1`, `--cp-border-default`,
   `--cp-border-subtle` all compute to `#CECED912` (real low-alpha grey) — NOT the
   shadow-string, NOT the rgba fallback. The broken `var(--ds-shadow-*, …)`
   definitions in index.css are overridden downstream by valid color defs. App
   renders correct colors (body text rgb(199,209,219), button borders real). → The
   ~400-file mess is inert hygiene debt, NOT a regression. Quarantine to its own feature.
2. **High-traffic surfaces already token-compliant.** Create Story modal box-shadow
   = `rgba(3,4,5,0.36) 0 8px 12px, rgba(3,4,5,0.5) 0 0 1px` = `--ds-shadow-overlay`
   dark token, verbatim. Home + Hierarchy: zero raw navy shadows in rendered DOM.
3. **Raw-shadow debt (202 src sites) is largely off-screen / hover-only / dormant**
   modules + release/test surfaces — not the main chrome.

**Before/after demonstrated** (in-browser inline override, no file edit, reverted):
Create modal, light mode — legacy hardcoded `0 8px 24px rgba(9,30,66,0.16),
0 2px 4px …0.08` (heavy, 24px diffuse halo) vs `var(--ds-shadow-overlay)`
(`rgba(30,31,33,0.15) 0 8px 12px` + crisp 1px perimeter). Token = tighter, defined ring.

**Decision impact:**
- Gap 2 (shadow-as-color) → REMOVED from this feature → own remediation feature.
- This feature re-scopes to genuine elevation: Gap 1 (dedupe `!important` block) +
  Gap 3/4 (sweep 202 real `box-shadow` literals to tokens). Awaiting Vikram go.
