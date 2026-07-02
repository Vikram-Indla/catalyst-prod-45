# DECISIONS (permanent record — do not re-litigate)

1. **View Settings panel stays a floating dropdown, not a docked sidebar.** Jira's real
   implementation is a full-height docked sidebar (300×739px measured live) — deliberately
   not copied. Reason: a docked panel would shrink board column width every time it opens,
   for a settings panel typically open a few seconds. Decided 2026-07-02.

2. **Assignee "Automatic" option: dropped from parity target, not built.** Catalyst has no
   Jira-Components/component-lead data model to auto-assign from. Rendering an "Automatic"
   option with no real logic behind it would violate zero-assumption-rendering. If ever
   wanted, it's a genuinely new feature (e.g. round-robin auto-assign), not a parity fix —
   separate feature slice.

3. **Card/column width stays at current density (256/272px), not widened to Jira's
   345/370px.** Deliberate viewport-conservation choice already made before this feature —
   more columns visible per screen beats exact Jira parity here.

4. **Board title font (`ProjectPageHeader`, 18px/600) left alone**, not bumped to match
   Jira's 20px/653. That component is shared by every hub page app-wide — not touching it
   for a 2px/weight-53 difference on one page type.

5. **Swimlane row restructure (single `<button>` → Jira's row + separate clickable-key
   `<a>`) not done as a full DOM restructure.** Superseded in spirit: the epic key already
   got its own clickable target (Round 5 Slice B, #4) without the full architecture change.
   Revisit only if exact DOM parity becomes a real requirement.

6. **Priority swimlane icon "grey `currentColor` for every level" finding was a probe
   mismeasurement, not a real bug.** `PriorityIcon.tsx` wraps the canonical
   `src/components/shared/PriorityIcon.tsx`, which sets `stroke: color` from a real per-level
   `COLORS` map — already correct, already used on cards without complaint. Not fixed because
   there was nothing to fix; source-read overrode the live-probe claim.

7. **Migration history reconciliation: local repo is source of truth going forward.** Per
   explicit user directive 2026-07-02 — the 439 historical migrations predating last week's
   cleanup are treated as baseline-satisfied (marked "applied" without re-executing SQL), not
   replayed against the current, already-evolved schema. See `08_DRIFT_LOG.md`.
