# Session 005 — W3a: notifications engine (DB layer)

**Date:** 2026-07-10 · **DB:** staging only · **Slice:** W3 split into 3a (DB, this) + 3b (admin section + bell/inbox, next)

## Delivered — migration `20260710150000_strata_notifications_engine.sql` (applied to staging, ledger 1:1)

- **strata_notification_rules** — admin-governed on/off per event type (envelope columns
  for parity; seeded 6 rules, all approved+enabled). RLS: read = approved users; no client
  write policy (toggled only via `strata_set_notification_rule`, admin-only, audit-logged).
- **strata_notifications** — per-user inbox; RLS restricts select/update to `user_id = auth.uid()`;
  no client INSERT (rows created only by the SECURITY DEFINER emit helper). Unread index.
- **strata_notify()** — emit helper: no-op when the event's rule is disabled/missing (fail-safe),
  and de-dups against an existing UNREAD row for the same user+event+entity.
- **Emission points**:
  - Triggers: `strata_decisions` (owner assign), `strata_actions` (owner assign + overdue-on-write),
    `strata_dependencies` (blocker open/stays-blocking), `strata_benefit_values` (validator on pending).
  - `strata_submit_record` augmented (verbatim + fan-out) → notifies all strategy_office holders on
    any of the 12 governed tables' draft→pending_approval, in one place.
- **Read RPCs**: `strata_mark_notification_read`, `strata_mark_all_notifications_read` (own rows only).

## Live proof (staging SQL — real events on the seeded Investor pillar)

| Event fired | Notification produced |
|---|---|
| benefit value → pending (validator own_b) | `benefit_validation_requested` · "Validate Realized value" · "AUM growth from digital investor acquisition" |
| blocker status blocked→at_risk (owner own_b) | `blocker_opened` · "Blocker: Regulator API access" |
| decision DEC-1100 owner → own_b | `decision_assigned` · "You own decision DEC-1100" |

- **Change-guard verified**: setting blocker status to its existing value produced NO notification
  (only genuine changes fire).
- **De-dup verified**: re-firing the blocker (real change) with an existing unread → still exactly
  **1** row for that user+event+entity.

## Scope note (for 08_DRIFT_LOG)

The Plan Lock said notification rules would be a fully governed table with the draft→approve
lifecycle. Chosen instead: envelope columns present (shape parity) but rules are operational
toggles driven by one admin-only RPC — not the 5-state lifecycle. Rationale: adding
strata_notification_rules to `strata_governed_tables()` would alter the generic submit/approve/
retire path shared by the other 12 sections (regression surface) for a simple on/off switch.
Audit-logged + admin-only preserves the governance intent. Logged as CLOSEOUT-DRIFT-001.

## Validation

- No TS/UI changed in this slice → tsc/vitest unaffected (surface + hooks land in W3b).
- DB proof above is the acceptance evidence for 3a.

## Next — W3b
Admin "Notifications" section (rules toggle, 13th governed section) + bell/unread badge +
inbox panel on the STRATA shell (canonical Atlaskit only) + domain methods + hooks. For
demoable screenshots, seed a couple of unread rows for the logged-in user (Vikram
6bbd0863-…) since triggers skip the actor.
