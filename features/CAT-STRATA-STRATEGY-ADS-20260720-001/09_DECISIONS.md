# DECISIONS — CAT-STRATA-STRATEGY-ADS-20260720-001

## D1 — Lozenge casing (DI-02) — **OPEN / BLOCKING WP-H**
**Conflict (do not self-resolve):**
- **Design Intelligence contract** (audit basis, still standing): `SKILL.md:223,293-294,593,675` — status
  lozenges must use `data-cp-lozenge-jira-parity` + sentence case; ALL-CAPS lozenges banned.
- **Later repository directive** (reverses the above), exact quote + date — `src/index.css:7371-7375`:
  _"2026-06-09 Vikram directive — Atlaskit canonical 11/700/UPPERCASE/3px radius restored. Previous override
  (sentence-case 12/500) removed. The data-cp-lozenge-jira-parity wrapper was also dropped from
  src/components/ads/Lozenge.tsx so AkLozenge native styling renders everywhere. Reverses 2026-04-28 lesson."_
  Confirmed by `src/components/ads/Lozenge.tsx:59-64`.
- **Scope of the directive:** GLOBAL. Only dark-mode color-softening rules for the attribute remain
  (`index.css:7395-7417`); the light-mode sentence-case override is gone, so wrapping alone is inert.

**Options (pick one):**
- **(a)** Global uppercase stands as canonical → close DI-02 by updating the DI contract; **do not** change the page. *(No code; keeps global consistency.)*
- **(b) Scoped Strategy Room exception (recommended if sentence case is wanted here)** → implement WP-H:
  page-scoped `<style>` + parity wrapper on this page only; **no** global CSS or shared `Lozenge` change;
  sibling-invariance test required. Partially reintroduces removed behavior for one surface → needs your OK.
- **(c)** Reverse the 2026-06-09 directive globally → **out of scope** for this page-local feature; separate decision.

**Until ruled:** DI-02 stays OPEN; WP-H is not implemented. Selector #2 stays RED (reported, not substituted).

---

## D2 — DI-04 (dropdown trigger) is DEFERRED — **needs a separate authorization**
`StrataChipMenu` is shared (`components/shared.tsx:337-383`) → Cycle/Period on all 26 STRATA pages + KPI
Library/Portfolio/Execution. Per the page-local / zero-regression directive, it is **not** touched here.
**Decision needed (later, separate feature):** authorize a shared-component trigger remediation with
cross-page verification, or accept the current trigger. Selector #4 stays RED by design.

---

## D3 — DI-05 (count badge) is DEFERRED — **needs a separate authorization**
`StrataPanel` count is shared (`components/shared.tsx:1074-1081`) → ~30 pages / ~40 `count=` sites.
Not touched here. **Decision needed (later):** authorize a shared-component count-text change with sibling
verification, or accept the current pill. Selector #5 stays RED by design.

---

## D4 — DI-08 shared residual — **reported, not auto-expanded**
WP-D fixes page-local containment only. The hierarchy panel's own border + raised shadow is `StrataPanel`-owned
(shared). Per the directive we do **not** change it. If the containment criterion still fails at the panel,
that residual is a shared dependency requiring the same authorization as D3. Reported on Selector #8.

---

## DI-E1 — View-switcher URL state — **RESOLVED**
`viewMode` stays local component state (no URL param), identical to current behavior. Returning from Map
resets to Structure default (pre-existing behavior; no regression). URL persistence is a noted future option,
not adopted.

---

## D6 — Feature ID / branch — **RESOLVED**
ID `CAT-STRATA-STRATEGY-ADS-20260720-001`. Proposed branch `strata/strategy-ads-remediation` from
`51bb51bc4`. Feature directory created (docs only). **No product code changed; no branch created yet** —
branch + implementation pending explicit approval.
